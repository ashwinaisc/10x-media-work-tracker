import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {randomBytes,randomUUID,pbkdf2Sync,timingSafeEqual} from 'node:crypto';
import {supabaseClient} from './supabase-connection.mjs';
const output='outputs/employee-login-details.csv';
if(existsSync(output))throw Error('Login export already exists; refusing to reset accounts or overwrite passwords');
const source=readFileSync('outputs/employee-source-people.tsv','utf8').split(/\r?\n/).slice(1).map(line=>line.split('\t')).filter(r=>r[4]==='creator');
if(source.length!==11)throw Error('Expected exactly 11 employees');
const rows=source.map(r=>({id:randomUUID(),email:r[2].trim().toLowerCase(),name:r[3],role:'creator',job:r[5],employee_id:r[0].startsWith('member_mhs')?'MHS'+r[0].slice('member_mhs'.length):r[3]==='Ashwin'?'MHS-202':null,password:randomBytes(15).toString('base64url'),salt:randomBytes(16).toString('hex')}));
if(rows.some(r=>!r.employee_id))throw Error('Missing employee ID');
const client=supabaseClient();
try{
 await client.connect();await client.query('BEGIN');
 for(const r of rows){
  if((await client.query('SELECT id FROM people WHERE lower(email)=$1 OR employee_id=$2',[r.email,r.employee_id])).rowCount)throw Error('Employee already exists: '+r.name);
  await client.query('INSERT INTO people(id,user_id,email,name,role,job,employee_id,manager_id,active) VALUES($1,$1,$2,$3,$4,$5,$6,NULL,1)',[r.id,r.email,r.name,r.role,r.job,r.employee_id]);
  const hash=pbkdf2Sync(r.password,Buffer.from(r.salt,'hex'),100000,32,'sha256').toString('hex');
  await client.query('INSERT INTO local_credentials(person_id,salt,password_hash) VALUES($1,$2,$3)',[r.id,r.salt,hash]);
  const saved=(await client.query('SELECT password_hash FROM local_credentials WHERE person_id=$1',[r.id])).rows[0];
  if(!timingSafeEqual(Buffer.from(saved.password_hash,'hex'),Buffer.from(hash,'hex')))throw Error('Password verification failed');
 }
 const csv=v=>'"'+String(v).replaceAll('"','""')+'"';
 writeFileSync(output,[['Name','Employee ID','Email / Username','Password'],...rows.map(r=>[r.name,r.employee_id,r.email,r.password])].map(r=>r.map(csv).join(',')).join('\n'),{flag:'wx'});
 await client.query('COMMIT');
 console.log('Created and verified '+rows.length+' employee accounts. Passwords saved in local login export. Reporting team lead remains unassigned.');
}catch(e){await client.query('ROLLBACK').catch(()=>{});console.error(e.message);process.exitCode=1}finally{await client.end()}

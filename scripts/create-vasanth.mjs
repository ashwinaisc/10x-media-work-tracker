import {randomUUID,randomBytes,pbkdf2Sync} from 'node:crypto';
import {writeFileSync,existsSync} from 'node:fs';
import {supabaseClient} from './supabase-connection.mjs';
const output='outputs/vasanth-team-lead-login.txt',email='vasanthmhs@gmail.com';
const db=supabaseClient();
try{
 await db.connect();await db.query('BEGIN');
 const existing=(await db.query('SELECT id,role FROM people WHERE lower(email)=$1',[email])).rows;
 if(existing.length)throw Error('Account already exists; no password or role changed');
 if(existsSync(output))throw Error('Login export already exists; inspect before retrying');
 const id=randomUUID(),password=randomBytes(15).toString('base64url'),salt=randomBytes(16).toString('hex');
 const hash=pbkdf2Sync(password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex');
 await db.query('INSERT INTO people(id,user_id,email,name,role,job,employee_id,manager_id,active) VALUES($1,$1,$2,$3,$4,$5,$6,NULL,1)',[id,email,'Vasanth','manager','Team Lead','MHS025']);
 await db.query('INSERT INTO local_credentials(person_id,salt,password_hash) VALUES($1,$2,$3)',[id,salt,hash]);
 const others=(await db.query("SELECT id FROM goal_types WHERE name='Others' AND manager_id='workspace'")).rows;
 if(others.length===1)await db.query('INSERT INTO plans(id,member_id,type_id,month,target,hours_per_job) VALUES($1,$2,$3,$4,0,NULL)',[randomUUID(),id,others[0].id,'2026-10']);
 writeFileSync(output,`Vasanth — Team Lead\nApp: http://localhost:8787/\nEmail: ${email}\nPassword: ${password}\n`,{flag:'wx'});
 await db.query('COMMIT');
 const response=await fetch('http://127.0.0.1:8787/login',{method:'POST',body:new URLSearchParams({username:email,password,return_to:'/'}),redirect:'manual'});
 if(response.status!==303)throw Error('Account created, but login verification returned '+response.status);
 console.log('Created Vasanth as Team Lead; login verified (303). Password stored in local login file. No employees reassigned.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});console.error(e.message);process.exitCode=1}finally{await db.end()}

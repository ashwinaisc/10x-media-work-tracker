import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash,createHmac} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {supabaseClient} from './supabase-connection.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const configPath=path.join(root,'.wrangler/sheet-sync-config.json');
const statusPath=path.join(root,'.wrangler/sheet-sync-status.json');
const cachePath=path.join(root,'.wrangler/sheet-sync-acknowledgments.json');
const priorityPath=path.join(root,'.wrangler/sheet-sync-priority.json');
function interactiveSavePending(){try{return JSON.parse(readFileSync(priorityPath,'utf8')).until>Date.now()}catch{return false}}
let acknowledged={};try{acknowledged=JSON.parse(readFileSync(cachePath,'utf8'))}catch{}
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Sign an ASCII representation so Apps Script and Node hash identical bytes,
// including employee/task names containing Unicode punctuation or Tamil text.
export const signedJson=value=>JSON.stringify(value).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
export function memberFingerprint(base,person){
 const d=base.data,plans=d.plans.filter(p=>p.member_id===person.id),ids=new Set(plans.map(p=>p.id));
 return digest({month:base.month,person,types:d.goal_types,plans,tasks:d.daily_tasks.filter(t=>t.member_id===person.id),submissions:d.submissions.filter(s=>ids.has(s.plan_id)),special:d.special_tasks.filter(t=>t.member_id===person.id)});
}
const fields={people:'id,name,email,employee_id,role,manager_id,job,active',goal_types:'id,manager_id,name,unit',plans:'id,member_id,type_id,month,target,hours_per_job',daily_tasks:'id,member_id,work_date,original_work_date,title,category,quantity,due_date,priority,status,estimated_hours,actual_hours,notes,started_at,elapsed_seconds,submitted_at,version',submissions:'id,plan_id,daily_task_id,title,url,completed,quantity,status,feedback,version',special_tasks:'id,member_id,assigned_by,title,instructions,due_date,priority,status,output_url,feedback,version,created_at'};
// Tasks whose deletion was approved are kept for the EOD report but never reach the sheet.
const visible={daily_tasks:" WHERE status!='deleted'"};
export function snapshot(dbPath){const db=new DatabaseSync(dbPath,{readOnly:true});try{db.exec('BEGIN');const data=Object.fromEntries(Object.entries(fields).map(([table,columns])=>[table,db.prepare(`SELECT ${columns} FROM ${table}${visible[table]||''} ORDER BY id`).all()]));db.exec('COMMIT');return data}finally{db.close()}}
let stopping=false,lastHash='',lastSuccess=0;
async function currentSnapshot(dbPath){
 if(!existsSync(path.join(root,'.env.supabase')))return snapshot(dbPath);
 const client=supabaseClient();try{await client.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const data={};for(const [table,columns] of Object.entries(fields)){data[table]=(await client.query(`SELECT ${columns} FROM ${table}${visible[table]||''} ORDER BY id`)).rows}await client.query('COMMIT');return data}finally{await client.end()}
}
// Called by the authenticated local bridge immediately after a task save.
export async function syncMemberNow(memberId){
 writeFileSync(priorityPath,JSON.stringify({until:Date.now()+45000}));
 const config=JSON.parse(readFileSync(configPath,'utf8')),url=new URL(config.url);
 if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec'))throw Error('Invalid Sheets endpoint');
 const client=supabaseClient();let person,tasks;
 try{
  await client.connect();
  person=(await client.query("SELECT id,name,email,employee_id,role,manager_id,job,active FROM people WHERE id=$1 AND role!='admin'",[memberId])).rows[0];
  tasks=(await client.query(`SELECT ${fields.daily_tasks} FROM daily_tasks WHERE member_id=$1 AND status!='deleted' ORDER BY work_date,id`,[memberId])).rows;
 }finally{await client.end()}
 if(!person)throw Error('Unknown employee');
 const month=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}).slice(0,7);
 const payload=signedJson({schema:1,spreadsheetId:config.spreadsheetId,month,directTasks:true,person,tasks}),timestamp=Date.now();
 const signature=createHmac('sha256',config.secret).update(timestamp+'.'+payload).digest('hex');
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({timestamp,payload,signature}),signal:AbortSignal.timeout(35000)});
 if(!response.ok)throw Error('Sheets HTTP '+response.status);
 const result=await response.json();
 if(!result.ok||result.spreadsheetId!==config.spreadsheetId||result.hash!==createHash('sha256').update(payload).digest('hex'))throw Error(result.error||'Sheet acknowledgment failed');
 return {status:'synced',savedAt:new Date().toISOString()};
}
process.on('SIGINT',()=>{stopping=true});process.on('SIGTERM',()=>{stopping=true});
async function sync(){
 if(!existsSync(configPath))return;const config=JSON.parse(readFileSync(configPath,'utf8'));if(!config.url)return;
 const url=new URL(config.url);if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec'))throw Error('Invalid Sheets endpoint');
 const data=await currentSnapshot(path.resolve(root,config.database));const month=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}).slice(0,7);
 const base={schema:1,spreadsheetId:config.spreadsheetId,month,data},hash=createHash('sha256').update(JSON.stringify(base)).digest('hex');
 const destination=digest({url:config.url,spreadsheetId:config.spreadsheetId});
 if(acknowledged.destination!==destination)acknowledged={destination,members:{}};
 if(hash===lastHash&&Date.now()-lastSuccess<300000)return;
 const members=data.people.filter(p=>p.role!=='admin').sort((a,b)=>Number(data.daily_tasks.some(t=>t.member_id===b.id))-Number(data.daily_tasks.some(t=>t.member_id===a.id)));
 for(const person of [...members,null]){
  if(interactiveSavePending())return;
  const fingerprint=person?memberFingerprint(base,person):hash;
  if(person&&acknowledged.members?.[person.id]===fingerprint)continue;
  if(!person&&acknowledged.shared===fingerprint)continue;
  // A save made during a long Google request must take priority over the old sweep.
  const latest=await currentSnapshot(path.resolve(root,config.database));
  if(digest({...base,data:latest})!==hash)return;
  const payload=signedJson({...base,personId:person?.id||null}),timestamp=Date.now(),signature=createHmac('sha256',config.secret).update(timestamp+'.'+payload).digest('hex');
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({timestamp,payload,signature}),signal:AbortSignal.timeout(240000)});
  if(!response.ok)throw Error('Sheets HTTP '+response.status);const body=await response.text();let result;try{result=JSON.parse(body)}catch{throw Error('Google returned an HTML error page; sync will retry automatically')}
  if(!result.ok||result.spreadsheetId!==config.spreadsheetId||result.hash!==createHash('sha256').update(payload).digest('hex'))throw Error(result.error||'Sheet did not acknowledge the saved snapshot');
  console.log('[Sheets] Verified '+(person?person.name:'shared reports'));
  if(person){acknowledged.members??={};acknowledged.members[person.id]=fingerprint}else acknowledged.shared=fingerprint;
  writeFileSync(cachePath,JSON.stringify(acknowledged));
 }
 lastHash=hash;lastSuccess=Date.now();writeFileSync(statusPath,JSON.stringify({ok:true,savedAt:new Date(lastSuccess).toISOString(),hash,spreadsheetId:config.spreadsheetId}));console.log('[Sheets] Saved app data and reports.');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){do{try{await sync()}catch(e){writeFileSync(statusPath,JSON.stringify({ok:false,error:e.message,lastSuccess:lastSuccess?new Date(lastSuccess).toISOString():null}));console.error('[Sheets] Save failed; retrying:',e.message)}if(process.argv.includes('--once'))break;await new Promise(r=>setTimeout(r,5000))}while(!stopping)}

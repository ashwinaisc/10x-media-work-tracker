import {randomUUID} from 'node:crypto';
import {supabaseClient} from './supabase-connection.mjs';
const db=supabaseClient();
try{
 await db.connect();await db.query('BEGIN');
 const person=(await db.query('SELECT id FROM people WHERE employee_id=$1 AND active=1',['MHS-202'])).rows;
 if(person.length!==1)throw Error('Ashwin must resolve uniquely');
 let type=(await db.query('SELECT id,unit FROM goal_types WHERE manager_id=$1 AND name=$2',['workspace','Data & Technical Support'])).rows[0];
 if(!type){type={id:randomUUID(),unit:'jobs'};await db.query('INSERT INTO goal_types(id,manager_id,name,unit) VALUES($1,$2,$3,$4)',[type.id,'workspace','Data & Technical Support','jobs'])}
 if(type.unit!=='jobs')throw Error('Existing unit differs; no changes saved');
 await db.query('INSERT INTO plans(id,member_id,type_id,month,target,hours_per_job) VALUES($1,$2,$3,$4,0,32) ON CONFLICT(member_id,month,type_id) DO UPDATE SET target=0,hours_per_job=32',[randomUUID(),person[0].id,type.id,'2026-10']);
 await db.query('COMMIT');console.log('Ashwin: on-demand Data & Technical Support enabled for October; no target; 32 hours per project.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});console.error(e.message);process.exitCode=1}finally{await db.end()}

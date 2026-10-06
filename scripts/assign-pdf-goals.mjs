import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {supabaseClient} from './supabase-connection.mjs';
const draft=JSON.parse(readFileSync('outputs/employee-import-draft.json','utf8')),month='2026-10';
const ids={'Ashwin':'MHS-202','Muthu':'MHS299','Rahul Ravichandran':'MHS316','Sasil Vikram':'MHS386','Rahul B':'MHS382','Varadharaj':'MHS171','Kamesh':'MHS090','Rahul':'MHS250','Karthick':'MHS278','Micheal':'MHS281','Basha':'MHS392'};
const db=supabaseClient();
try{
 await db.connect();await db.query('BEGIN');
 const people=(await db.query('SELECT id,name,employee_id FROM people WHERE active=1 AND employee_id=ANY($1)',[Object.values(ids)])).rows;
 assert.equal(people.length,11);
 const types=(await db.query("SELECT id,name FROM goal_types WHERE manager_id='workspace' AND unit='jobs'")).rows;
 const before=(await db.query('SELECT * FROM plans WHERE month=$1 AND member_id=ANY($2)',[month,people.map(p=>p.id)])).rows;
 writeFileSync('outputs/pre-pdf-goals-'+Date.now()+'.json',JSON.stringify(before,null,2));
 const report=[];
 for(const employee of draft.employees){
  const person=people.find(p=>p.employee_id===ids[employee.pdf_name]);assert.ok(person);
  for(const [name,target] of Object.entries(employee.goals)){
   const matching=types.filter(t=>t.name===name);assert.equal(matching.length,1,'Goal type must resolve uniquely: '+name);const type=matching[0];
   await db.query('INSERT INTO plans(id,member_id,type_id,month,target,hours_per_job) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(member_id,month,type_id) DO UPDATE SET target=EXCLUDED.target,hours_per_job=EXCLUDED.hours_per_job',[randomUUID(),person.id,type.id,month,target,draft.hours_per_job[name]]);
   const saved=(await db.query('SELECT target,hours_per_job FROM plans WHERE member_id=$1 AND type_id=$2 AND month=$3',[person.id,type.id,month])).rows[0];assert.equal(saved.target,target);assert.equal(saved.hours_per_job,draft.hours_per_job[name]);
  }
  report.push({employee:person.name,employee_id:person.employee_id,month,goals:employee.goals,routine:employee.routine||null});
 }
 await db.query('COMMIT');writeFileSync('outputs/assigned-october-goals.json',JSON.stringify(report,null,2));console.log(JSON.stringify({employees:report.length,assignedGoals:report.reduce((n,e)=>n+Object.keys(e.goals).length,0),month,verified:true}));
}catch(e){await db.query('ROLLBACK').catch(()=>{});console.error(e.message);process.exitCode=1}finally{await db.end()}

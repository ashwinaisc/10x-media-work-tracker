import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {supabaseClient} from './supabase-connection.mjs';
const draft=JSON.parse(readFileSync('outputs/employee-import-draft.json','utf8')),month='2026-10';
const ids={'Ashwin':'MHS-202','Muthu':'MHS299','Rahul Ravichandran':'MHS316','Sasil Vikram':'MHS386','Rahul B':'MHS382','Varadharaj':'MHS171','Kamesh':'MHS090','Rahul':'MHS250','Karthick':'MHS278','Micheal':'MHS281','Basha':'MHS392'};
const db=supabaseClient();
try{
 await db.connect();await db.query('BEGIN');
 const people=(await db.query("SELECT id,name,employee_id,role FROM people WHERE active=1 AND role!='admin' ORDER BY name")).rows;
 const before=(await db.query('SELECT p.*,t.name,t.unit FROM plans p JOIN goal_types t ON t.id=p.type_id WHERE month=$1',[month])).rows;
 writeFileSync('outputs/pre-goal-audit-'+Date.now()+'.json',JSON.stringify(before,null,2));
 const findings=[],verified=[];
 for(const source of draft.employees){
  const person=people.find(p=>p.employee_id===ids[source.pdf_name]);assert.ok(person,'Missing person '+source.pdf_name);
  for(const [name,target] of Object.entries(source.goals)){
   const matches=before.filter(p=>p.member_id===person.id&&p.name===name);
   if(matches.length!==1||matches[0].target!==target||matches[0].hours_per_job!==draft.hours_per_job[name]||matches[0].unit!=='jobs')findings.push({employee:person.name,name,expectedTarget:target,expectedHours:draft.hours_per_job[name],actual:matches});
  }
  verified.push({employee:person.name,employee_id:person.employee_id,numericGoals:Object.keys(source.goals).length});
 }
 if(findings.length){writeFileSync('outputs/goal-audit-discrepancies.json',JSON.stringify(findings,null,2));throw Error('Numeric goal discrepancies found; see audit report before changing targets')}
 async function type(name){let matches=(await db.query('SELECT id,unit FROM goal_types WHERE manager_id=$1 AND name=$2',['workspace',name])).rows;assert.ok(matches.length<=1);if(!matches.length){const id=randomUUID();await db.query('INSERT INTO goal_types(id,manager_id,name,unit) VALUES($1,$2,$3,$4)',[id,'workspace',name,'jobs']);matches=[{id,unit:'jobs'}]}assert.equal(matches[0].unit,'jobs');return matches[0].id}
 async function assign(person,typeId,hours=null){await db.query('INSERT INTO plans(id,member_id,type_id,month,target,hours_per_job) VALUES($1,$2,$3,$4,0,$5) ON CONFLICT(member_id,month,type_id) DO NOTHING',[randomUUID(),person.id,typeId,month,hours])}
 const others=await type('Others');for(const person of people)await assign(person,others);
 const routine=await type('Schedule & Comment Delete'),addedRoutines=[];
 for(const id of ['MHS316','MHS392']){const person=people.find(p=>p.employee_id===id);if(!before.some(p=>p.member_id===person.id&&p.name==='Schedule & Comment Delete'))addedRoutines.push(person.name);await assign(person,routine)}
 const support=before.find(p=>p.member_id===people.find(p=>p.employee_id==='MHS-202').id&&p.name==='Data & Technical Support');assert.ok(support&&support.target===0&&support.hours_per_job===32);
 const saved=(await db.query('SELECT p.name,t.name AS goal,g.target,g.hours_per_job FROM plans g JOIN people p ON p.id=g.member_id JOIN goal_types t ON t.id=g.type_id WHERE g.month=$1 ORDER BY p.name,t.name',[month])).rows;
 assert.equal(saved.filter(r=>r.goal==='Others'&&people.some(p=>p.name===r.name)).length,people.length);
 await db.query('COMMIT');
 const report={month,verifiedEmployees:verified,numericGoalsVerified:verified.reduce((n,p)=>n+p.numericGoals,0),othersAssignedTo:people.map(p=>p.name),missingRoutinesAdded:addedRoutines,goals:saved};
 writeFileSync('outputs/october-goal-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){await db.query('ROLLBACK').catch(()=>{});console.error(e.message);process.exitCode=1}finally{await db.end()}

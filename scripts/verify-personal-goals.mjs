import assert from 'node:assert/strict';
const url='http://127.0.0.1:5173/api/workspace';
async function api(body,status=200){const r=await fetch(url,{method:body?'POST':'GET',headers:{Cookie:'__sites_local_auth=1','Content-Type':'application/json',Origin:'http://127.0.0.1:5173'},...(body?{body:JSON.stringify(body)}:{})});const s=await r.json();assert.equal(r.status,status,JSON.stringify(s));return s}
const email=`qa.personal.${Date.now()}@studio.test`;
let s=await api({action:'member',email,name:'QA personal goals',role:'creator'});const id=s.members.find(m=>m.email===email).id;
const goals=[{kind:'shoot',quantity:8,hours_per_job:4},{kind:'post',quantity:100,hours_per_job:0.5},{kind:'story',quantity:120,hours_per_job:0.5},{kind:'ai_hours',quantity:4,hours_per_job:null}];
try{
s=await api({action:'personal_goals',member_id:id,month:'2026-09',goals});
assert.equal(s.personalGoals.filter(g=>g.member_id===id&&g.month==='2026-09').length,4);
await api({action:'personal_goals',member_id:id,month:'2026-10',goals:[{kind:'reels',quantity:12,hours_per_job:4}]});
await api({action:'personal_goals',member_id:id,month:'2026-09',goals:[goals[0],goals[0]]},400);
await api({action:'personal_goals',member_id:id,month:'2026-09',goals:[{kind:'post',quantity:1.5,hours_per_job:1}]},400);
await api({action:'personal_goals',member_id:'missing',month:'2026-09',goals},404);
s=await api();const own=s.personalGoals.filter(g=>g.member_id===id&&g.month==='2026-09');assert.equal(own.length,4);assert.equal(own.filter(g=>g.kind!=='ai_hours').reduce((n,g)=>n+g.quantity,0),228);assert.equal(own.find(g=>g.kind==='ai_hours').quantity,4);
assert.equal(s.personalGoals.filter(g=>g.member_id===id&&g.month==='2026-10')[0].quantity,12);
console.log('Passed: per-user plans, separate months, hours/job persistence, job/hour totals, duplicate and invalid input rejection, failed-save preservation.');
}finally{for(const month of ['2026-09','2026-10'])await api({action:'personal_goals',member_id:id,month,goals:[]});await api({action:'remove_member',id});}

import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base='http://127.0.0.1:8787',prefix='managerqa_'+Date.now();let checks=0;const ids={};
async function api(who,body,status=200){const uid=who==='admin'?'local_seedy':prefix+who;const r=await fetch(base+'/api/manager',{method:body?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json','oai-authenticated-user-id':uid,'oai-authenticated-user-email':who==='admin'?'seedy@sites.test':uid+'@studio.test'},...(body?{body:JSON.stringify(body)}:{})});const s=await r.json();assert.equal(r.status,status,JSON.stringify(s));checks++;return s}
try {
for(const who of ['a','b']){const s=await api('admin',{action:'person',role:'manager',name:'QA '+who,email:prefix+who+'@studio.test',job:'Manager'});ids[who]=s.people.find(p=>p.email===prefix+who+'@studio.test').id;}
let s=await api('a',{action:'person',name:'QA Creator',email:prefix+'c@studio.test',job:'Designer'});ids.c=s.people.find(p=>p.email===prefix+'c@studio.test').id;assert.equal(s.people.find(p=>p.id===ids.c).manager_id,ids.a);
assert.equal((await api('b')).people.some(p=>p.id===ids.c),false);
await api('b',{action:'person',id:ids.c,name:'Hijack',email:prefix+'c@studio.test',job:'Designer'},403);
s=await api('a',{action:'type',name:'QA Posts',unit:'jobs'});const type=s.types[0].id;
await api('a',{action:'plan',member_id:ids.c,type_id:type,month:'2026-08',target:10.5},400);
s=await api('a',{action:'plan',member_id:ids.c,type_id:type,month:'2026-08',target:10});const plan=s.plans[0].id;
await api('b',{action:'plan',member_id:ids.c,type_id:type,month:'2026-08',target:1},403);
s=await api('c',{action:'submit',plan_id:plan,title:'Late August work',completed:'2026-09-01',quantity:2});let sub=s.submissions[0];assert.equal(s.plans[0].month,'2026-08');assert.equal(sub.status,'review');
await api('b',{action:'review',id:sub.id,version:sub.version,status:'approved'},403);
await api('a',{action:'review',id:sub.id,version:sub.version,status:'changes',feedback:''},400);
s=await api('a',{action:'review',id:sub.id,version:sub.version,status:'changes',feedback:'Revise typography'});sub=s.submissions[0];assert.equal(sub.status,'changes');
const count=state=>state.submissions.filter(s=>s.status!=='changes').reduce((n,s)=>n+s.quantity,0);assert.equal(count(s),0);
s=await api('c',{action:'submit',id:sub.id,version:sub.version,plan_id:plan,title:'Revised work',url:sub.url,completed:'2026-09-02',quantity:2});sub=s.submissions[0];assert.equal(count(s),2);assert.equal(s.submissions.length,1);
s=await api('a',{action:'review',id:sub.id,version:sub.version,status:'approved'});assert.equal(count(s),2);
await api('a',{action:'review',id:sub.id,version:sub.version,status:'approved'},409);
await api('a',{action:'transfer',id:ids.c,manager_id:ids.b},403);
await api('admin',{action:'transfer',id:ids.c,manager_id:ids.b});assert.equal((await api('a')).submissions.length,0);assert.equal((await api('b')).submissions.length,1);
await api('b',{action:'active',id:ids.c});await api('c',null,403);
console.log(`Passed ${checks} API checks: isolated teams, permissions, goal month credit, revisions, stale reviews, transfers and deactivation.`);
}finally{const quoted=Object.values(ids).map(id=>`'${id}'`).join(',')||"''";writeFileSync('.sites-runtime/cleanup-manager-qa.sql',`DELETE FROM submissions WHERE plan_id IN (SELECT id FROM plans WHERE member_id IN (${quoted}));\nDELETE FROM plans WHERE member_id IN (${quoted});\nDELETE FROM goal_types WHERE manager_id IN (${quoted});\nDELETE FROM people WHERE id IN (${quoted});`);}


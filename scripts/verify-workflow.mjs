// Local-only integration checks. Never run against a deployed URL.
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:8787';
const people={admin:['local_seedy','seedy@sites.test'],manager:['qa_manager','qa.manager@studio.test'],creator:['qa_creator','qa.creator@studio.test'],other:['qa_other','qa.other@studio.test'],scheduler:['qa_scheduler','qa.scheduler@studio.test']};
let checks=0;
async function request(role,body,status=200){const [id,email]=people[role]||[];const headers={'Content-Type':'application/json',Origin:origin};if(id){headers['oai-authenticated-user-id']=id;headers['oai-authenticated-user-email']=email}const r=await fetch(origin+'/api/workspace',{headers,method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));checks++;return data}
await request('anonymous',null,401);let state=await request('admin');
for(const role of ['manager','creator','other','scheduler']){await request('admin',{action:'member',name:'QA '+role,email:people[role][1],role:role==='other'?'creator':role});await request(role)}
const name='QA workflow '+Date.now();state=await request('admin',{action:'channel',name,folder:''});const channel=state.channels.find(c=>c.name===name);const creator=state.members.find(m=>m.email===people.creator[1]);
await request('creator',{action:'channel',name:'Not permitted',folder:''},403);
await request('manager',{action:'target',channel_id:channel.id,month:'2026-09',kind:'graphic',quantity:10},403);
await request('admin',{action:'target',channel_id:channel.id,month:'2026-09',kind:'graphic',quantity:10});
state=await request('manager',{action:'task',title:'QA deliverable',channel_id:channel.id,kind:'graphic',due:'2026-09-22',assignee:creator.id,notes:'Local integration test'});let task=state.tasks.find(t=>t.channel_id===channel.id);
assert.equal((await request('scheduler')).tasks.some(t=>t.id===task.id),false);checks++;
await request('other',{action:'start',id:task.id,version:task.version},403);
state=await request('creator',{action:'start',id:task.id,version:task.version});task=state.tasks.find(t=>t.id===task.id);
await request('creator',{action:'submit',id:task.id,version:task.version,drive_url:'javascript:alert(1)',completed:'2026-09-22'},400);
state=await request('creator',{action:'submit',id:task.id,version:task.version,drive_url:'https://drive.google.com/file/d/qa_local_test/view',completed:'2026-09-22'});task=state.tasks.find(t=>t.id===task.id);
await request('creator',{action:'approve',id:task.id,version:task.version},403);
state=await request('manager',{action:'changes',id:task.id,version:task.version,feedback:'Please revise the final frame.'});task=state.tasks.find(t=>t.id===task.id);assert.equal(task.status,'changes');checks++;
state=await request('creator',{action:'submit',id:task.id,version:task.version,drive_url:'https://drive.google.com/file/d/qa_local_test/view',completed:'2026-09-22'});task=state.tasks.find(t=>t.id===task.id);
await request('manager',{action:'approve',id:task.id,version:task.version-1},409);
state=await request('manager',{action:'approve',id:task.id,version:task.version});task=state.tasks.find(t=>t.id===task.id);
assert.equal((await request('scheduler')).tasks.some(t=>t.id===task.id),true);checks++;
state=await request('scheduler',{action:'schedule',id:task.id,version:task.version,scheduled:'2026-09-25'});task=state.tasks.find(t=>t.id===task.id);assert.equal(task.status,'scheduled');checks++;
await request('creator',{action:'submit',id:task.id,version:task.version,drive_url:task.drive_url,completed:'2026-09-22'},400);
assert.equal((await request('admin')).tasks.find(t=>t.id===task.id).scheduled,'2026-09-25');checks++;
console.log(`${checks} checks passed: authentication, all four roles, task assignment, Drive URL validation, review/revision/approval, conflict protection, persistence and scheduling.`);

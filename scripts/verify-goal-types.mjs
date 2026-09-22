import assert from 'node:assert/strict';
import {kinds,goalGroup,goalTotal} from '../lib/model.ts';
assert.equal(Object.keys(kinds).length,21);
assert.equal(goalGroup('vsl_ads'),'ads');assert.equal(goalGroup('reels'),'content');
assert.equal(goalGroup('longer'),'unclassified');assert.equal(goalGroup('longform'),'production');
assert.equal(goalTotal([{kind:'ai_hours',completed_hours:2.5},{kind:'ai_hours',completed_hours:1.25}]),3.75);
assert.equal(goalTotal([{kind:'reels'},{kind:'post'}]),2);
const origin='http://127.0.0.1:5173';
async function api(body,status=200){const r=await fetch(origin+'/api/workspace',{method:body?'POST':'GET',headers:{Cookie:'__sites_local_auth=1',Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data}
const name='QA goal taxonomy '+Date.now();let state=await api({action:'channel',name,folder:''});const channel=state.channels.find(c=>c.name===name);
const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
for(const kind of Object.keys(kinds)) await api({action:'target',channel_id:channel.id,month:today.slice(0,7),kind,quantity:4});
state=await api({action:'task',channel_id:channel.id,title:'QA hours',kind:'ai_hours',due:today,assignee:state.me.id,notes:''});let task=state.tasks.find(t=>t.channel_id===channel.id);
await api({action:'submit',id:task.id,version:task.version,drive_url:'',completed:today,completed_hours:0},400);
state=await api({action:'submit',id:task.id,version:task.version,drive_url:'',completed:today,completed_hours:2.5});task=state.tasks.find(t=>t.id===task.id);assert.equal(task.completed_hours,2.5);assert.equal(task.status,'review');
await api({action:'task',id:task.id,version:task.version,channel_id:channel.id,title:'QA hours',kind:'reels',due:today,assignee:state.me.id,notes:''},400);
await api({action:'target',channel_id:channel.id,month:today.slice(0,7),kind:'not_a_goal',quantity:4},400);
console.log(JSON.stringify({passed:true,goalTypes:21,hourSubmission:2.5,cleanupChannelId:channel.id}));

import assert from 'node:assert/strict';
const origin='http://127.0.0.1:8787', tag=Date.now();
async function api(role,body,status=200){const id=role==='admin'?'local_seedy':`qa_perm_${role}_${tag}`,email=role==='admin'?'seedy@sites.test':`${id}@studio.test`;const r=await fetch(origin+'/api/workspace',{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','oai-authenticated-user-id':id,'oai-authenticated-user-email':email},...(body?{body:JSON.stringify(body)}:{})});const s=await r.json();assert.equal(r.status,status,JSON.stringify(s));return s}
const ids=[];let owner;
try{for(const role of ['manager','creator','scheduler']){let s=await api('admin',{action:'member',email:`qa_perm_${role}_${tag}@studio.test`,name:'QA permission '+role,role});ids.push(s.members.find(m=>m.email===`qa_perm_${role}_${tag}@studio.test`).id);}
const s=await api('manager');owner=s.me.id;const body={action:'personal_goals',member_id:ids[1],month:'2026-09',goals:[{kind:'post',quantity:12,hours_per_job:0.5}]};
for(const role of ['admin','creator','scheduler']){await api(role,body,403);await api(role,{action:'target'},403)}
await api('manager',body);assert.equal((await api('creator')).personalGoals.find(g=>g.member_id===ids[1]).quantity,12);
await api('manager',{action:'target'},400);
console.log('Passed: manager saves monthly goals; admin, creator and scheduler blocked for personal and channel goals; creator can read assigned goals.');
}finally{if(owner)await api('manager',{action:'personal_goals',member_id:ids[1],month:'2026-09',goals:[]});for(const id of ids)await api('admin',{action:'remove_member',id});}

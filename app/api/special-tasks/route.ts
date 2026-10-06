import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/db/raw';
import type {Person} from '@/lib/manager';
export const dynamic='force-dynamic';
type Task={id:string;member_id:string;assigned_by:string;status:string;version:number};
class Problem extends Error{constructor(message:string,public status=400){super(message)}}
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function text(v:unknown,max:number){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Problem('Complete the required fields.');return v.trim()}
async function context(){const user=await getChatGPTUser();if(!user)throw new Problem('Sign in first.',401);const db=database();const me=await db.prepare('SELECT * FROM people WHERE user_id=? AND active=1').bind(user.userId).first<Person>();if(!me)throw new Problem('No workspace access.',403);return {db,me}}
function fail(e:unknown){if(e instanceof Problem)return json({error:e.message},e.status);if(e instanceof SyntaxError)return json({error:'Invalid request.'},400);console.error(e);return json({error:'Could not save or load special tasks.'},503)}
export async function GET(){try{const {db,me}=await context();const tasks=(await db.prepare(`SELECT s.*,p.name AS employee,a.name AS assigner FROM special_tasks s JOIN people p ON p.id=s.member_id JOIN people a ON a.id=s.assigned_by WHERE ${me.role==='admin'?'1=1':'s.member_id=? OR s.assigned_by=?'} ORDER BY s.created_at DESC,s.id`).bind(...(me.role==='admin'?[]:[me.id,me.id])).all()).results;return json({tasks})}catch(e){return fail(e)}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)throw new Problem('Origin not allowed.',403);
 const {db,me}=await context();const raw=await req.text();if(raw.length>12000)throw new Problem('Request too large.');const b=JSON.parse(raw);
 if(b.action==='assign'){
  if(!['admin','manager'].includes(me.role))throw new Problem('Only managers and team leads can assign tasks.',403);
  const person=await db.prepare('SELECT * FROM people WHERE id=? AND active=1').bind(text(b.member_id,100)).first<Person>();
  if(!person||!['creator','manager'].includes(person.role)||person.id===me.id||(me.role==='manager'&&(person.role!=='creator'||person.manager_id!==me.id)))throw new Problem('Choose an employee in your team.',403);
  const due=text(b.due_date,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(Date.parse(due))||new Date(due).toISOString().slice(0,10)!==due||due<new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}))throw new Problem('Choose today or a future deadline.');
  if(!['low','normal','high'].includes(b.priority))throw new Problem('Choose a valid priority.');
  const id=crypto.randomUUID();await db.prepare('INSERT INTO special_tasks(id,member_id,assigned_by,title,instructions,due_date,priority) VALUES(?,?,?,?,?,?,?)').bind(id,person.id,me.id,text(b.title,160),text(b.instructions,4000),due,b.priority).run();return json({ok:true,id});
 }
 const task=await db.prepare('SELECT * FROM special_tasks WHERE id=?').bind(text(b.id,100)).first<Task>();if(!task)throw new Problem('Task unavailable.',404);if(task.version!==b.version)throw new Problem('Task changed. Refresh and try again.',409);
 let status=task.status,url:string|null=null,feedback:string|null=null;
 if(b.action==='start'||b.action==='submit'){
  if(task.member_id!==me.id)throw new Problem('Only the assignee can update this work.',403);
  if(!['todo','progress','changes'].includes(task.status))throw new Problem('This task is awaiting review or already approved.');
  if(b.action==='start')status='progress';else{url=text(b.output_url,2000);let parsed:URL;try{parsed=new URL(url)}catch{throw new Problem('Enter a valid output link.')}if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Problem('Enter an HTTP or HTTPS output link.');status='review'}
 }else if(b.action==='approve'||b.action==='changes'){
  if(task.assigned_by!==me.id||!['admin','manager'].includes(me.role))throw new Problem('Only the assigner can review this work.',403);
  if(task.status!=='review')throw new Problem('This task is not awaiting review.');status=b.action==='approve'?'done':'changes';feedback=b.action==='changes'?text(b.feedback,2000):'';
 }else throw new Problem('Unknown action.');
 const result=await db.prepare('UPDATE special_tasks SET status=?,output_url=COALESCE(?,output_url),feedback=COALESCE(?,feedback),version=version+1 WHERE id=? AND version=?').bind(status,url,feedback,task.id,task.version).run();if(!result.meta.changes)throw new Problem('Task changed. Refresh and try again.',409);return json({ok:true});
 }catch(e){return fail(e)}}

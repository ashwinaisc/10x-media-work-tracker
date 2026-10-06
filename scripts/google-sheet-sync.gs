// Receiver is restricted in code to WORKBOOK_ID.
const WORKBOOK_ID='1gZb1h1FNvOXfWFkcQZfJUl4zzP2-HB6UaNcpQ6cndeA';
function doPost(e){
 const lock=LockService.getScriptLock();
 try{
  const b=JSON.parse(e.postData.contents),key=PropertiesService.getScriptProperties().getProperty('SYNC_KEY');
  if(!key)throw Error('Sync key is not configured');
  if(!Number.isFinite(b.timestamp))throw Error('Invalid request timestamp');
  if(Math.abs(Date.now()-b.timestamp)>300000)throw Error('Sync clock difference exceeds five minutes: '+Math.round((Date.now()-b.timestamp)/1000)+' seconds');
  const signature=hex_(Utilities.computeHmacSha256Signature(b.timestamp+'.'+b.payload,key));
  if(signature!==b.signature)throw Error('Sync signature mismatch');
  const p=JSON.parse(b.payload);if(p.schema!==1||p.spreadsheetId!==WORKBOOK_ID)throw Error('Wrong workbook');
  if(p.directTasks){
   if(!p.person||!p.person.id||!Array.isArray(p.tasks))throw Error('Invalid direct task update');
   const ss=SpreadsheetApp.openById(WORKBOOK_ID);saveDirectTasks_(ss,p.person,p.tasks,p.month);
   SpreadsheetApp.flush();return json_({ok:true,spreadsheetId:WORKBOOK_ID,hash:hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,b.payload))});
  }
  ['people','goal_types','plans','daily_tasks','submissions','special_tasks'].forEach(k=>{if(!Array.isArray(p.data[k]))throw Error('Invalid snapshot')});
  lock.waitLock(20000);
  const props=PropertiesService.getScriptProperties();
  if(b.timestamp<Number(props.getProperty('LAST_TIMESTAMP')||0))throw Error('Older snapshot refused');
  const ss=SpreadsheetApp.openById(WORKBOOK_ID);if(ss.getId()!==WORKBOOK_ID)throw Error('Wrong workbook');
  if(p.taskOnly&&p.personId)saveTaskTable_(ss,p.data,p.month,p.personId);
  else saveSnapshot_(ss,p.data,p.month,p.personId||null);
  const hash=hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,b.payload));
  props.setProperty('LAST_TIMESTAMP',String(b.timestamp));
  SpreadsheetApp.flush();return json_({ok:true,spreadsheetId:WORKBOOK_ID,hash});
 }catch(error){return json_({ok:false,error:String(error.message)})}finally{if(lock.hasLock())lock.releaseLock()}
}
function hex_(bytes){return bytes.map(b=>('0'+(b&255).toString(16)).slice(-2)).join('')}
function json_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON)}
function safe_(value){if(value==null)return '';return typeof value==='string'&&/^[=+@-]/.test(value)?"'"+value:value}
function sheet_(ss,name){return ss.getSheetByName(name)||ss.insertSheet(name)}
function table_(s,rows){s.getDataRange().breakApart().clearContent();if(!rows.length)return;if(s.getMaxRows()<rows.length)s.insertRowsAfter(s.getMaxRows(),rows.length-s.getMaxRows());if(s.getMaxColumns()<rows[0].length)s.insertColumnsAfter(s.getMaxColumns(),rows[0].length-s.getMaxColumns());s.getRange(1,1,rows.length,rows[0].length).setValues(rows.map(r=>r.map(safe_)));s.getRange(1,1,1,rows[0].length).setBackground('#17365d').setFontColor('white').setFontWeight('bold');s.setFrozenRows(1)}
function link_(url){return /^https?:\/\//i.test(url||'')?'=HYPERLINK("'+url.replace(/"/g,'""')+'","Open output")':''}
function saveDirectTasks_(ss,person,tasks,currentMonth){
 const s=ss.getSheets().find(x=>x.getDeveloperMetadata().some(m=>m.getKey()==='memberId'&&m.getValue()===person.id));
 if(!s)throw Error('Employee sheet is not ready; background setup will retry');
 const months=[...new Set([currentMonth,...tasks.map(t=>t.work_date.slice(0,7))])].sort().reverse();
 if(!updateTaskRows_(s,person,months,{daily_tasks:tasks}))throw Error('Employee month section is not ready; background setup will retry');
}
function saveTaskTable_(ss,d,month,personId){
 const person=d.people.find(p=>p.id===personId);if(!person)throw Error('Unknown employee');
 const s=ss.getSheets().find(x=>x.getDeveloperMetadata().some(m=>m.getKey()==='memberId'&&m.getValue()===personId));
 const months=[...new Set([month,...d.plans.filter(p=>p.member_id===personId).map(p=>p.month),...d.daily_tasks.filter(t=>t.member_id===personId).map(t=>t.work_date.slice(0,7))])].sort().reverse();
 if(!s||!updateTaskRows_(s,person,months,d))saveSnapshot_(ss,d,month,personId);
 const fields=['id','member_id','work_date','original_work_date','title','category','quantity','due_date','priority','status','estimated_hours','actual_hours','notes','started_at','elapsed_seconds','submitted_at','version'];
 table_(sheet_(ss,'Daily Tasks'),[fields,...d.daily_tasks.map(t=>fields.map(f=>t[f]))]);
 const people=Object.fromEntries(d.people.map(p=>[p.id,p]));
 table_(sheet_(ss,'Daily Tracker'),[['Date','Employee','Task Name','Category','Quantity','Due Date','Status','Estimated Hours','Actual Hours','Notes'],...d.daily_tasks.map(t=>[t.work_date,people[t.member_id]?.name||t.member_id,t.title,t.category,t.quantity,t.due_date,t.priority+' / '+t.status,t.estimated_hours,t.actual_hours,t.notes])]);
}
function saveSnapshot_(ss,d,currentMonth,personId){
 const syncProps=PropertiesService.getScriptProperties();
 function changed(key,value,write){const hash=hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(value)));if(syncProps.getProperty(key)===hash)return;write();SpreadsheetApp.flush();syncProps.setProperty(key,hash)}
 const rates={'Reels':4,'Ads':4,'Carousel':3,'Video Carousel':3,'Post':.5,'Story':.25,'Script Preparation':4,'Shoot':4,'Longform Video':8,'AI Job':8,'HC Ideation':4,'Trailer':6,'FFC':2,'TagMango Reels':4};
 const specs={People:['people',['id','name','email','employee_id','role','manager_id','job','active']], 'Monthly Goals':['plans',['id','member_id','type_id','month','target','hours_per_job']], 'Daily Tasks':['daily_tasks',['id','member_id','work_date','original_work_date','title','category','quantity','due_date','priority','status','estimated_hours','actual_hours','notes','started_at','elapsed_seconds','submitted_at','version']], Submissions:['submissions',['id','plan_id','daily_task_id','title','url','completed','quantity','status','feedback','version']], 'Special Tasks':['special_tasks',['id','member_id','assigned_by','title','instructions','due_date','priority','status','output_url','feedback','version','created_at']]};
 if(!personId){ Object.keys(specs).forEach(name=>{const [key,fields]=specs[name];changed('RAW_'+key,d[key],()=>table_(sheet_(ss,name),[fields,...d[key].map(o=>fields.map(k=>o[k]))]))});
 changed('RAW_types',d.goal_types,()=>table_(sheet_(ss,'Goal Types'),[['ID','Scope','Goal Type','Unit','Hours per Job'],...d.goal_types.map(t=>[t.id,t.manager_id,t.name,t.unit,rates[t.name]||''])]));
 }
 const people=Object.fromEntries(d.people.map(p=>[p.id,p])),types=Object.fromEntries(d.goal_types.map(t=>[t.id,t])),plans=Object.fromEntries(d.plans.map(p=>[p.id,p]));
 const work=d.submissions.filter(s=>s.status!=='changes'&&plans[s.plan_id]).map(s=>({...s,member_id:plans[s.plan_id].member_id,category:types[plans[s.plan_id].type_id]?.name||'',unit:types[plans[s.plan_id].type_id]?.unit||'jobs'}));
 if(!personId)changed('DAILY_TRACKER',{tasks:d.daily_tasks,people:d.people},()=>table_(sheet_(ss,'Daily Tracker'),[['Date','Employee','Task Name','Category','Quantity','Due Date','Status','Estimated Hours','Actual Hours','Notes'],...d.daily_tasks.map(t=>[t.work_date,people[t.member_id]?.name||t.member_id,t.title,t.category,t.quantity,t.due_date,t.priority+' / '+t.status,t.estimated_hours,t.actual_hours,t.notes])]));
 const sharedHash=hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify({currentMonth,people:d.people,plans:d.plans,types:d.goal_types,work})));
 if(!personId&&syncProps.getProperty('SHARED_REPORTS')===sharedHash)return;
 const index=[['Employee ID','Employee','Role','Sheet link']],summary=[['Employee','Month','Period','Goal Type','Target','Completed','Pending','Progress','Unit']];
 d.people.filter(p=>p.role!=='admin'&&(!personId||p.id===personId)).forEach(person=>{
  const tabName=(person.name.replace(/[\[\]:*?\/\\]/g,' ').slice(0,65)+' — '+person.id.slice(-6));
  let s=ss.getSheets().find(x=>x.getDeveloperMetadata().some(m=>m.getKey()==='memberId'&&m.getValue()===person.id));
  if(!s){s=ss.insertSheet(tabName);s.addDeveloperMetadata('memberId',person.id)}
  index.push([person.employee_id||person.id,person.name,person.role,ss.getUrl()+'#gid='+s.getSheetId()]);
  const months=[...new Set([currentMonth,...d.plans.filter(p=>p.member_id===person.id).map(p=>p.month),...d.daily_tasks.filter(t=>t.member_id===person.id).map(t=>t.work_date.slice(0,7)),...work.filter(w=>w.member_id===person.id).map(w=>w.completed.slice(0,7))])].sort().reverse();
  if(personId){
   const fingerprint=hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify({version:5,person,months,types,plans:d.plans.filter(p=>p.member_id===person.id),tasks:d.daily_tasks.filter(p=>p.member_id===person.id),work:work.filter(p=>p.member_id===person.id)})));
   const props=PropertiesService.getScriptProperties(),key='REPORT_'+person.id;
   const structure=hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify({version:5,person,months,types,plans:d.plans.filter(p=>p.member_id===person.id),work:work.filter(p=>p.member_id===person.id)})));
   if(props.getProperty(key)!==fingerprint){
    if(props.getProperty(key+'_structure')!==structure||!updateTaskRows_(s,person,months,d))renderEmployee_(ss,s,person,months,d,types,work,summary,currentMonth);
    SpreadsheetApp.flush();props.setProperty(key,fingerprint);props.setProperty(key+'_structure',structure);
   }
  }else{
   months.forEach(month=>{const last=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();[[1,15,.5,'First half'],[16,last,.5,'Second half'],[1,last,1,'Full month']].forEach(([lo,hi,factor,label])=>{d.plans.filter(p=>p.member_id===person.id&&p.month===month).forEach(p=>{const t=types[p.type_id];if(!t)return;const target=p.target*factor,done=work.filter(w=>w.plan_id===p.id&&w.status==='approved'&&w.completed.slice(0,7)===month&&Number(w.completed.slice(8,10))>=lo&&Number(w.completed.slice(8,10))<=hi).reduce((n,w)=>n+w.quantity,0);summary.push([person.name,month,label,t.name,target,done,Math.max(0,target-done),target?Math.round(done/target*100)+'%':'—',t.unit])})})});
  }

 });
 if(personId)return;
 table_(sheet_(ss,'Employee Sheets'),index);table_(sheet_(ss,'Goal Report'),summary);
 d.goal_types.forEach(t=>{const s=sheet_(ss,t.name.replace(/[\[\]:*?\/\\]/g,' ').slice(0,90));const manual={};if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,10).getValues().forEach(r=>{if(r[9])manual[r[9]]=r.slice(6,9)});const items=work.filter(w=>w.category===t.name).sort((a,b)=>b.completed.localeCompare(a.completed));table_(s,[['Date','Employee ID','Employee','Work / Task Name','Status','Output Link','Published / Unpublished','Published Work Link','Follower Count','Submission ID'],...items.map(w=>[w.completed,people[w.member_id]?.employee_id||w.member_id,people[w.member_id]?.name||'',w.title,w.status,w.url,...(manual[w.id]||['Unpublished','','']),w.id])]);s.getRange('G2:G1000').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Published','Unpublished'],true).build());s.hideColumns(10)});
 table_(sheet_(ss,'Settings'),[['Setting','Value'],['Tracker','10x Media Job Tracker'],['Last automatic save',new Date().toISOString()],['Data direction','App → Sheet'],['Current month',currentMonth],['Report policy','Only approved work counts as completed; each half uses 50% target']]);
 SpreadsheetApp.flush();syncProps.setProperty('SHARED_REPORTS',sharedHash);
}

// Change task cells in place; goal reports and older months keep their layout.
function updateTaskRows_(s,person,months,d){
 const cells=s.getRange(1,1,Math.max(1,s.getLastRow()),2).getDisplayValues(),labels=cells.map(r=>r[0]);
 const blocks=months.map(month=>{const name=Utilities.formatDate(new Date(month+'-01T12:00:00Z'),'Asia/Kolkata','MMMM yyyy').toUpperCase();return {month,start:labels.indexOf(person.name+' — '+name)+1,tasks:d.daily_tasks.filter(t=>t.member_id===person.id&&t.work_date.slice(0,7)===month)}});
 if(blocks.some(b=>!b.start))return false;
 for(let i=0;i<blocks.length;i++){const b=blocks[i],end=i+1<blocks.length?blocks[i+1].start-3:s.getMaxRows();if(b.start+5+b.tasks.length>end)return false}
 blocks.forEach(b=>{const first=b.start+5;let old=0;while(first-1+old<cells.length&&cells[first-1+old][1])old++;const n=Math.max(old,b.tasks.length,1);s.getRange(first,1,n,10).clearContent();if(b.tasks.length){s.getRange(first,1,1,10).copyTo(s.getRange(first,1,b.tasks.length,10),SpreadsheetApp.CopyPasteType.PASTE_FORMAT,false);s.getRange(first,1,b.tasks.length,10).setValues(b.tasks.map(x=>[x.work_date,x.title,x.category,x.quantity,x.due_date,x.priority,x.status,x.estimated_hours,x.actual_hours,x.notes].map(safe_)))}s.getRange(b.start+2,1).setValue('Total Tasks: '+b.tasks.length+'     |     Done: '+b.tasks.filter(x=>['ready','done'].includes(x.status)).length)});
 return true;
}

function referenceTemplate_(ss){
 let t=ss.getSheetByName('_Report Format');if(t)return t;
 const source=SpreadsheetApp.openById('13CPtuMrc9xltW-besAKVnSFTjR4qgwXzb2QbwjrD5ec').getSheetById(295803825);
 t=source.copyTo(ss).setName('_Report Format');t.getDataRange().clearContent().clearNote();t.hideSheet();return t;
}
function renderEmployee_(ss,s,person,months,d,types,work,summary,currentMonth){
 const t=referenceTemplate_(ss),paste=SpreadsheetApp.CopyPasteType.PASTE_FORMAT;
 s.getDataRange().breakApart().clearContent().clearFormat();s.getRange(1,1,s.getMaxRows(),1).shiftRowGroupDepth(-8);s.showRows(1,s.getMaxRows());
 if(s.getMaxColumns()<34)s.insertColumnsAfter(s.getMaxColumns(),34-s.getMaxColumns());for(let c=1;c<=18;c++)s.setColumnWidth(c,t.getColumnWidth(c));for(const base of [20,28]){for(let c=0;c<7;c++)s.setColumnWidth(base+c,t.getColumnWidth(12+c));s.setColumnWidth(base-1,t.getColumnWidth(11))}s.setFrozenRows(0);s.setFrozenColumns(0);
 let start=1;
 function ensure(end){if(s.getMaxRows()<end)s.insertRowsAfter(s.getMaxRows(),end-s.getMaxRows())}
 function fmt(sr,dr,col,count){ensure(dr);t.getRange(sr,col,1,count).copyTo(s.getRange(dr,col,1,count),paste,false);s.setRowHeight(dr,t.getRowHeight(sr))}
 let reportCol=12;function reportFmt(sr,dr,count){ensure(dr);t.getRange(sr,12,1,count).copyTo(s.getRange(dr,reportCol,1,count),paste,false);s.setRowHeight(dr,t.getRowHeight(sr))}function title(row,label,sr=1){reportFmt(sr,row,7);s.getRange(row,reportCol,1,7).merge().setValue(label)}
 const colors={'Ads':'#c9daf8','Reels':'#cfe2f3','Video Carousel':'#d0e0e3','Post':'#d9e2f3','Shoot':'#d9ead3','Longform Video':'#ead1dc','AI Job':'#e2efd9','FFC':'#fff2cc','Script Preparation':'#cfe2f3','HC Ideation':'#ead1dc','Trailer':'#f4cccc','TagMango Reels':'#fce5cd'};
 months.forEach(month=>{
  const first=start,ownPlans=d.plans.filter(p=>p.member_id===person.id&&p.month===month),tasks=d.daily_tasks.filter(x=>x.member_id===person.id&&x.work_date.slice(0,7)===month);
  const monthName=Utilities.formatDate(new Date(month+'-01T12:00:00Z'),'Asia/Kolkata','MMMM yyyy').toUpperCase(),last=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();
  ensure(first+Math.max(tasks.length+8,60));
  t.getRange('A1:J6').copyTo(s.getRange(first,1,6,10),paste,false);
  s.getRange(first,1,1,10).merge().setValue(person.name+' — '+monthName);s.setRowHeight(first,t.getRowHeight(1));
  s.getRange(first+1,1,1,10).merge().setValue('Daily tasks • Automatically saved from the app');
  s.getRange(first+2,1,1,10).merge().setValue('Total Tasks: '+tasks.length+'     |     Done: '+tasks.filter(x=>['ready','done'].includes(x.status)).length);
  s.getRange(first+3,1,1,10).merge().setValue('Yellow = In Progress   |   Green = Done   |   Pink = On Hold   |   White = To Do');
  s.getRange(first+4,1,1,10).setValues([['Date','Task Name','Category','Quantity','Due Date','Priority','Status','Est.Hrs','Act.Hrs','Notes']]);
  tasks.forEach((x,i)=>{const r=first+5+i;fmt(6,r,1,10);s.getRange(r,1,1,10).setValues([[x.work_date,x.title,x.category,x.quantity,x.due_date,x.priority,x.status,x.estimated_hours,x.actual_hours,x.notes].map(safe_)])});
  let r=first,reportEnd=first;
  [[1,15,.5,'First half'],[16,last,.5,'Second half'],[1,last,1,'Full month']].forEach(([lo,hi,factor,label],periodIndex)=>{reportCol=12+periodIndex*8;r=first;
   title(r,'GOALS · '+lo+'–'+hi+' '+monthName);r++;title(r,'Targets, completed work and output links',2);r+=2;
   reportFmt(4,r,7);s.getRange(r++,reportCol,1,7).setValues([['Goal type','Target','Completed','Pending','Progress','Unit','Outputs']]);
   const completed=work.filter(w=>w.member_id===person.id&&w.completed.slice(0,7)===month&&Number(w.completed.slice(8,10))>=lo&&Number(w.completed.slice(8,10))<=hi);
   let targetSum=0,doneSum=0,pendingSum=0;const goalLinks=[];
   ownPlans.forEach(p=>{const ty=types[p.type_id];if(!ty)return;const target=p.target*factor,done=completed.filter(w=>w.plan_id===p.id&&w.status==='approved').reduce((n,w)=>n+w.quantity,0),pending=Math.max(0,target-done);const sr=({'Carousel':5,'Schedule':6,'Story':7,'Others':8})[ty.name]||5;reportFmt(sr,r,7);if(colors[ty.name])s.getRange(r,reportCol,1,7).setBackground(colors[ty.name]);s.getRange(r,reportCol,1,7).setValues([[ty.name,target,done,pending,target?done/target:0,ty.unit,done?'':'No outputs']]);s.getRange(r,reportCol+4).setNumberFormat('0%');if(done)goalLinks.push(r);targetSum+=target;doneSum+=done;pendingSum+=pending;summary.push([person.name,month,label,ty.name,target,done,pending,target?Math.round(done/target*100)+'%':'—',ty.unit]);r++});
   reportFmt(9,r,7);s.getRange(r,reportCol,1,7).setValues([['TOTAL GOAL',targetSum,doneSum,pendingSum,targetSum?doneSum/targetSum:0,ownPlans.every(p=>types[p.type_id]?.unit==='jobs')?'jobs':'units','—']]);s.getRange(r,reportCol+4).setNumberFormat('0%');r+=3;
   // The template formats five columns; the review status column borrows the output link format.
   const statusFmt=row=>s.getRange(row,reportCol+4).copyTo(s.getRange(row,reportCol+5),paste,false);
   title(r++,'COMPLETED WORK & OUTPUT LINKS',12);reportFmt(13,r,5);statusFmt(r);s.getRange(r++,reportCol,1,6).setValues([['Date','Goal type','Work / Ad name','Quantity','Output link','Review status']]);
   goalLinks.forEach(gr=>s.getRange(gr,reportCol+6).setFormula('=HYPERLINK("#gid='+s.getSheetId()+'&range='+({12:'L',20:'T',28:'AB'})[reportCol]+r+'","View completed work")'));
   completed.forEach(w=>{reportFmt(14,r,5);statusFmt(r);s.getRange(r,reportCol,1,6).setValues([[w.completed,w.category,w.title,w.quantity,'',({review:'Awaiting review',approved:'Approved'})[w.status]||w.status].map(safe_)]);if(link_(w.url))s.getRange(r,reportCol+4).setFormula(link_(w.url));r++});
   if(!completed.length){reportFmt(14,r,5);statusFmt(r);r++}r+=3;reportEnd=Math.max(reportEnd,r);
  });
  const end=Math.max(reportEnd,first+tasks.length+7);ensure(end);if(month!==currentMonth){s.getRange(first+1,1,end-first-1,1).shiftRowGroupDepth(1);s.getRowGroup(first+1,1).collapse()}start=end+3;
 });
}

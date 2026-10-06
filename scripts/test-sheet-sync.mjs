import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {signedJson,memberFingerprint} from './sheet-sync.mjs';
const unicode={title:'Task — தமிழ் 🎥'};
assert.deepEqual(JSON.parse(signedJson(unicode)),unicode);
assert.match(signedJson(unicode),/^[\x00-\x7f]*$/);
const person={id:'a',name:'Ashwin'},base={month:'2026-10',data:{goal_types:[],plans:[],daily_tasks:[],submissions:[],special_tasks:[]}};
const initial=memberFingerprint(base,person);
base.data.daily_tasks.push({member_id:'b',title:'Another employee'});
assert.equal(memberFingerprint(base,person),initial);
base.data.daily_tasks.push({member_id:'a',title:'New task'});
assert.notEqual(memberFingerprint(base,person),initial);
const cells=Array.from({length:30},()=>Array(10).fill(''));
cells[0][0]='Ashwin — OCTOBER 2026';
cells[5][0]='06-Oct-26';cells[5][1]='Old task';
cells[6][0]='06-Oct-26';cells[6][1]='Removed task';
const sheet={getLastRow:()=>30,getMaxRows:()=>30,getRange(row,col,rows=1,cols=1){return {
 getDisplayValues:()=>cells.slice(row-1,row-1+rows).map(r=>r.slice(col-1,col-1+cols)),
 clearContent(){for(let r=row-1;r<row-1+rows;r++)for(let c=col-1;c<col-1+cols;c++)cells[r][c]='';return this},
 copyTo(){},setValues(values){values.forEach((r,i)=>r.forEach((v,j)=>cells[row-1+i][col-1+j]=v));return this},
 setValue(value){cells[row-1][col-1]=value;return this}
 }}};
const context={Utilities:{formatDate:()=> 'October 2026'},SpreadsheetApp:{CopyPasteType:{PASTE_FORMAT:'format'}}};
vm.createContext(context);vm.runInContext(readFileSync('scripts/google-sheet-sync.gs','utf8'),context);
const data={daily_tasks:[{member_id:'a',work_date:'2026-10-06',title:'New task',category:'Ads',quantity:1,status:'todo'}]};
assert.equal(context.updateTaskRows_(sheet,person,['2026-10'],data),true);
assert.equal(cells[5][1],'New task');assert.equal(cells[6][1],'');
assert.match(cells[2][0],/Total Tasks: 1/);
data.daily_tasks=[];context.updateTaskRows_(sheet,person,['2026-10'],data);
assert.equal(cells[5][1],'');assert.match(cells[2][0],/Total Tasks: 0/);
console.log('PASS: Unicode signatures, employee isolation, task replacement/deletion and counts.');

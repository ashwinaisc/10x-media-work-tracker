import http from 'node:http';
import {readFileSync} from 'node:fs';
import {timingSafeEqual} from 'node:crypto';
import {supabasePool} from './supabase-connection.mjs';
import {syncMemberNow} from './sheet-sync.mjs';
const pool=supabasePool();pool.on('error',()=>console.error('[Supabase] Idle connection closed; reconnecting on next request.'));
const config=JSON.parse(readFileSync('.wrangler/supabase-bridge.json','utf8'));
function postgresSql(input){let index=0;let sql=input.replace(/'(?:(?:'')|[^'])*'|\?/g,t=>t==='?'?'$'+(++index):t);if(/^INSERT OR IGNORE /i.test(sql))sql=sql.replace(/^INSERT OR IGNORE /i,'INSERT ')+' ON CONFLICT DO NOTHING';return sql}
const server=http.createServer(async(req,res)=>{
 const given=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+config.token);
 if(req.method!=='POST'||!['/','/sheet-sync'].includes(req.url)||given.length!==expected.length||!timingSafeEqual(given,expected)){res.writeHead(403).end();return}
 let client;
 try{
  let body='';for await(const chunk of req){body+=chunk;if(body.length>2000000)throw Error('Request too large')}
  if(req.url==='/sheet-sync'){
   const {memberId}=JSON.parse(body);if(typeof memberId!=='string'||memberId.length>100)throw Error('Invalid employee');
   let result;try{result=await syncMemberNow(memberId)}catch(error){console.error('[Sheets immediate]',error.message);result={status:'pending'}}
   res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(result));return;
  }
  const {statements,transaction}=JSON.parse(body);if(!Array.isArray(statements)||!statements.length||statements.length>500)throw Error('Invalid request');
  client=await pool.connect();if(transaction)await client.query('BEGIN');const results=[];
  for(const s of statements){const r=await client.query(postgresSql(s.sql),s.values);results.push({success:true,results:r.rows,meta:{changes:r.command==='SELECT'?0:r.rowCount||0}})}
  if(transaction)await client.query('COMMIT');res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(results));
 }catch(e){await client?.query('ROLLBACK').catch(()=>{});console.error('[Supabase]',e.code||'database operation failed');res.writeHead(503).end()}finally{client?.release()}
});
server.listen(8788,'127.0.0.1',()=>console.log('[Supabase] Private local connection ready.'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await pool.end();process.exit(0)}));

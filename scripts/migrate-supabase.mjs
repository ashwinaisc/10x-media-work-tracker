import {DatabaseSync,backup} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {supabaseClient} from './supabase-connection.mjs';
import assert from 'node:assert/strict';
const tables=['workspace','people','goal_types','plans','daily_tasks','submissions','special_tasks','local_credentials'];
const config=JSON.parse(readFileSync('.wrangler/sheet-sync-config.json','utf8'));
const db=new DatabaseSync(config.database,{readOnly:true});
const ident=s=>'"'+s.replaceAll('"','""')+'"';
const convert=s=>s.replaceAll('`','"').replace(/\breal\b/gi,'double precision').replace(/DEFAULT CURRENT_TIMESTAMP/gi,"DEFAULT (CURRENT_TIMESTAMP::text)");
const schema=tables.map(t=>convert(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(t).sql)+';\nALTER TABLE '+ident(t)+' ENABLE ROW LEVEL SECURITY;').join('\n');
const indexes=db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all().filter(x=>tables.some(t=>new RegExp('ON [`"]?'+t+'[`"]?\\s*\\(','i').test(x.sql))).map(x=>convert(x.sql)+';').join('\n');
mkdirSync('supabase',{recursive:true});
writeFileSync('supabase/schema.sql','CREATE SCHEMA studio_tracker;\nSET search_path TO studio_tracker;\nREVOKE ALL ON SCHEMA studio_tracker FROM PUBLIC, anon, authenticated;\n'+schema+'\n'+indexes+'\nREVOKE ALL ON ALL TABLES IN SCHEMA studio_tracker FROM PUBLIC, anon, authenticated;\n');
if(!process.argv.includes('--apply')){console.log('Prepared private Supabase schema. No data uploaded.');db.close();process.exit(0)}
mkdirSync('backups',{recursive:true});await backup(db,'backups/pre-supabase-'+Date.now()+'.sqlite');
const client=supabaseClient();
try{
 await client.connect();await client.query('BEGIN');
 const existing=await client.query("SELECT 1 FROM information_schema.schemata WHERE schema_name='studio_tracker'");
 if(existing.rowCount)throw Error('Tracker schema already exists; refusing to overwrite it');
 await client.query(readFileSync('supabase/schema.sql','utf8'));
 const counts={};
 for(const table of tables){const rows=db.prepare('SELECT * FROM '+ident(table)).all();for(const row of rows){const keys=Object.keys(row);await client.query('INSERT INTO '+ident(table)+' ('+keys.map(ident).join(',')+') VALUES ('+keys.map((_,i)=>'$'+(i+1)).join(',')+')',Object.values(row))}const saved=(await client.query('SELECT * FROM '+ident(table)+' ORDER BY '+ident(table==='workspace'?'id':table==='local_credentials'?'person_id':'id'))).rows;const original=db.prepare('SELECT * FROM '+ident(table)+' ORDER BY '+ident(table==='local_credentials'?'person_id':'id')).all();assert.deepEqual(JSON.parse(JSON.stringify(saved)),JSON.parse(JSON.stringify(original)));counts[table]=rows.length;}
 await client.query('COMMIT');console.log('Migrated and verified every field:',counts);
 writeFileSync('.wrangler/supabase-migration-status.json',JSON.stringify({verifiedAt:new Date().toISOString(),counts}));
}catch(e){await client.query('ROLLBACK').catch(()=>{});console.error(e.message);process.exitCode=1}finally{db.close();await client.end()}

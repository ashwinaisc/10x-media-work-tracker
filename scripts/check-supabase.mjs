import {supabaseClient} from './supabase-connection.mjs';
const client=supabaseClient();
try {await client.connect();const r=await client.query('SELECT current_database() AS database');console.log('Supabase connection verified:',r.rows[0].database)}
catch(e){console.error('Connection failed:',e.code||e.name,e.message);process.exitCode=1}
finally{await client.end()}

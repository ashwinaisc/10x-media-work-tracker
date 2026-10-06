import {readFileSync} from 'node:fs';
import pg from 'pg';
function connectionOptions(){
 const c=JSON.parse(readFileSync(new URL('../.wrangler/supabase-connection.json',import.meta.url),'utf8'));
 if(!c.password)throw Error('Database password is missing');
 return {host:c.host,port:c.port,database:c.database,user:c.user,password:c.password,ssl:{rejectUnauthorized:true,ca:readFileSync(new URL('../.wrangler/supabase-ca.crt',import.meta.url),'utf8')},connectionTimeoutMillis:15000,statement_timeout:30000,options:'-c search_path=studio_tracker'};
}
export function supabaseClient(){return new pg.Client(connectionOptions())}
export function supabasePool(){return new pg.Pool({...connectionOptions(),max:4,idleTimeoutMillis:30000})}

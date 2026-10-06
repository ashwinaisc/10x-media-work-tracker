import {env} from 'cloudflare:workers';
import {postgresDatabase} from './postgres';
export async function syncTaskSheet(memberId:string){
 const config=(env as unknown as Record<string,string>).SUPABASE_DATABASE_CONFIG;
 if(!config)return {status:'pending'};
 try{
  const options=JSON.parse(Buffer.from(config,'base64').toString('utf8'));
  const response=await fetch(new URL('/sheet-sync',options.url),{method:'POST',headers:{Authorization:'Bearer '+options.token,'Content-Type':'application/json'},body:JSON.stringify({memberId}),signal:AbortSignal.timeout(45000)});
  if(!response.ok)return {status:'pending'};
  return await response.json() as {status:'synced'|'pending';savedAt?:string};
 }catch{return {status:'pending'}}
}
interface Result<T=Record<string,unknown>>{results:T[];meta:{changes:number}}
interface Statement{bind(...values:unknown[]):Statement;all<T=Record<string,unknown>>():Promise<Result<T>>;first<T=Record<string,unknown>>(column?:string):Promise<T|null>;run():Promise<Result>}
interface Database{prepare(sql:string):Statement;batch(statements:Statement[]):Promise<Result[]>}
export function database():Database{
 const config=(env as unknown as Record<string,string>).SUPABASE_DATABASE_CONFIG;
 if(config)return postgresDatabase(config) as Database;
 if(!env.DB)throw new Error('Database unavailable');return env.DB;
}

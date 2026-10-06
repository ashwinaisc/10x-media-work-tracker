import {postgresDatabase} from './postgres';
function config(){return process.env.SUPABASE_DATABASE_URL||process.env.SUPABASE_DATABASE_CONFIG||''}
export async function syncTaskSheet(memberId:string){
 const value=process.env.SUPABASE_DATABASE_CONFIG||'';
 if(!value)return {status:'pending'};
 try{
  const options=JSON.parse(Buffer.from(value,'base64').toString('utf8'));
  const response=await fetch(new URL('/sheet-sync',options.url),{method:'POST',headers:{Authorization:'Bearer '+options.token,'Content-Type':'application/json'},body:JSON.stringify({memberId}),signal:AbortSignal.timeout(45000)});
  if(!response.ok)return {status:'pending'};
  return await response.json() as {status:'synced'|'pending';savedAt?:string};
 }catch{return {status:'pending'}}
}
interface Result<T=Record<string,unknown>>{results:T[];meta:{changes:number}}
interface Statement{bind(...values:unknown[]):Statement;all<T=Record<string,unknown>>():Promise<Result<T>>;first<T=Record<string,unknown>>(column?:string):Promise<T|null>;run():Promise<Result>}
interface Database{prepare(sql:string):Statement;batch(statements:Statement[]):Promise<Result[]>}
export function database():Database{
 const value=config();
 if(value)return postgresDatabase(value) as Database;
 throw new Error('Database unavailable. Set SUPABASE_DATABASE_CONFIG.');
}

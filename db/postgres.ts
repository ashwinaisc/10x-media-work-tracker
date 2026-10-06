
import pg from 'pg';
// Preserve the small D1 query interface used by the application while moving storage.
export function postgresDatabase(config: string) {
 if(config.startsWith('postgres://')||config.startsWith('postgresql://'))return directPostgres(config);
 const options=JSON.parse(Buffer.from(config,'base64').toString('utf8'));
 async function execute(statements:Statement[],transaction=false){
  const response=await fetch(options.url,{method:'POST',headers:{Authorization:'Bearer '+options.token,'Content-Type':'application/json'},body:JSON.stringify({statements:statements.map(s=>({sql:s.sql,values:s.values})),transaction}),signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error('Supabase database service unavailable');
  return await response.json() as {success:boolean;results:Record<string,unknown>[];meta:{changes:number}}[];
 }
 class Statement {
  constructor(public sql:string,public values:unknown[]=[]){}
  bind(...values:unknown[]){return new Statement(this.sql,values)}
  async all<T>(){return (await execute([this]))[0] as {success:boolean;results:T[];meta:{changes:number}}}
  async first<T>(column?:string){const rows=(await this.all<Record<string,unknown>>()).results;return (column?rows[0]?.[column]:rows[0]) as T|null??null}
  async run(){return (await execute([this]))[0]}
 }
 return {prepare:(sql:string)=>new Statement(sql),batch:(statements:Statement[])=>execute(statements,true)};
}

function directPostgres(connectionString:string){
 const databaseUrl=new URL(connectionString);
 databaseUrl.searchParams.set('options','-c search_path=studio_tracker,public');
 const pool=new pg.Pool({connectionString:databaseUrl.toString(),ssl:{rejectUnauthorized:false},max:3,idleTimeoutMillis:30000});
 const postgresSql=(sql:string)=>{let index=0;return sql.replace(/\?/g,()=>`$${++index}`)};
 class Statement{constructor(public sql:string,public values:unknown[]=[]){ }bind(...values:unknown[]){return new Statement(this.sql,values)}async all<T>(){const r=await pool.query(postgresSql(this.sql),this.values);return {success:true,results:r.rows as T[],meta:{changes:r.rowCount||0}}}async first<T>(){const r=await this.all<T>();return r.results[0]||null}async run(){const r=await pool.query(postgresSql(this.sql),this.values);return {success:true,results:[],meta:{changes:r.rowCount||0}}}}
 return {prepare:(sql:string)=>new Statement(sql),batch:async(statements:Statement[])=>{const client=await pool.connect();try{await client.query('BEGIN');const out=[];for(const s of statements){const r=await client.query(postgresSql(s.sql),s.values);out.push({success:true,results:r.rows,meta:{changes:r.rowCount||0}})}await client.query('COMMIT');return out}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}};
}

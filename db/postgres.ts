
// Preserve the small D1 query interface used by the application while moving storage.
export function postgresDatabase(config: string) {
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

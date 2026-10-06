import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const c=JSON.parse(readFileSync('.wrangler/supabase-connection.json','utf8'));
const config=existsSync('.wrangler/supabase-bridge.json')?JSON.parse(readFileSync('.wrangler/supabase-bridge.json','utf8')):{url:'http://127.0.0.1:8788/',token:randomBytes(32).toString('hex')};
writeFileSync('.wrangler/supabase-bridge.json',JSON.stringify(config));
// JSON string escaping is compatible with dotenv double-quoted values.
writeFileSync('.env.supabase','SUPABASE_DATABASE_CONFIG='+Buffer.from(JSON.stringify(config)).toString('base64')+'\n');
const prior=existsSync('.dev.vars')?readFileSync('.dev.vars','utf8'):'';
writeFileSync('.dev.vars',prior.split('\n').filter(line=>!line.startsWith('SUPABASE_DATABASE_CONFIG=')).join('\n')+'\n'+readFileSync('.env.supabase','utf8'));
console.log('Saved private local Supabase environment configuration.');

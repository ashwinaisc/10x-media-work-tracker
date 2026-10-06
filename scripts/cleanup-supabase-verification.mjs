import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync('.wrangler/sheet-sync-config.json','utf8'));
const db=new DatabaseSync(config.database);
const prefix='SUPABASE_VERIFICATION_';
const result=db.prepare('DELETE FROM goal_types WHERE substr(name,1,?)=?').run(prefix.length,prefix);
db.close();console.log('Removed temporary local verification rows:',result.changes);

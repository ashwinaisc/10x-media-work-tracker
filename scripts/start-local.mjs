import './sites-env.mjs';
import {spawn} from 'node:child_process';
import {existsSync,copyFileSync} from 'node:fs';
if(existsSync('.env.supabase'))copyFileSync('.env.supabase','dist/server/.dev.vars');
const bridge=existsSync('.env.supabase')?spawn(process.execPath,['scripts/supabase-bridge.mjs'],{stdio:'inherit',windowsHide:true}):null;
const server=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','0.0.0.0','--inspector-port','0'],{stdio:'inherit',windowsHide:true});
const sync=spawn(process.execPath,['scripts/sheet-sync.mjs'],{stdio:'inherit',windowsHide:true});
function stop(){sync.kill();server.kill();bridge?.kill()}
process.on('SIGINT',stop);process.on('SIGTERM',stop);server.on('exit',code=>{sync.kill();bridge?.kill();process.exitCode=code||0});

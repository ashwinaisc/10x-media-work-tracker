import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
// Development counterpart of start-local.mjs: Next dev server plus the private Supabase connection.
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const supabase=existsSync('.env.supabase');
const bridge=supabase?spawn(process.execPath,['scripts/supabase-bridge.mjs'],{stdio:'inherit',windowsHide:true}):null;
if(supabase)process.loadEnvFile('.env.supabase');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev',...process.argv.slice(2)],{stdio:'inherit',windowsHide:true});
// The bridge only saves task rows; this loop keeps the goal reports in the sheet current.
const sync=spawn(process.execPath,['scripts/sheet-sync.mjs'],{stdio:'inherit',windowsHide:true});
function stop(){sync.kill();server.kill();bridge?.kill()}
process.on('SIGINT',stop);process.on('SIGTERM',stop);server.on('exit',code=>{sync.kill();bridge?.kill();process.exitCode=code||0});

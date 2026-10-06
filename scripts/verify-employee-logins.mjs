import {readFileSync} from 'node:fs';
const rows=readFileSync('outputs/employee-login-details.csv','utf8').split('\n').slice(1).map(line=>line.match(/"((?:[^"]|"")*)"/g).map(v=>v.slice(1,-1).replaceAll('""','"')));
let passed=0;
for(const [name,,email,password] of rows){const r=await fetch('http://127.0.0.1:8787/login',{method:'POST',redirect:'manual',body:new URLSearchParams({username:email,password,return_to:'/'})});if(r.status!==303||!r.headers.get('set-cookie')?.includes('__studio_local_user='))throw Error('Login failed for '+name);passed++}
console.log('Verified successful sign-in for all '+passed+' new employee accounts.');

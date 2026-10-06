import {NextResponse} from 'next/server';
import {database} from '@/db/raw';
import {isLocalNetworkHost} from '@/lib/local-network';

const ADMIN_PASSWORD_HASH='e411d9da0f9be787e49c66a97bcb2a30372fa7c0527701ba68f00e89b1752956';
const safeReturn=(value:string|null)=>value?.startsWith('/')&&!value.startsWith('//')?value:'/';
async function hash(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function escape(value:string){return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function page(returnTo:string,error='',status=200){return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · Studio</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#10130f;color:#f2f4ed;font:16px system-ui}.card{width:min(390px,calc(100% - 40px));padding:34px;border:1px solid #3d4737;border-radius:22px;background:#1b2118;box-shadow:0 24px 70px #0008}small,.hint{color:#a9b5a3}.hint{font-size:14px;line-height:1.5}label{display:block;margin:20px 0 8px;font-weight:700}input{box-sizing:border-box;width:100%;padding:14px;border:1px solid #4a5741;border-radius:12px;background:#252d21;color:#fff;font:inherit}button{width:100%;margin-top:24px;padding:14px;border:0;border-radius:12px;background:#a5f46a;color:#111;font-weight:800;font-size:16px}.error{color:#ffaaa8;margin-top:16px}</style></head><body><main class="card"><small>STUDIO WORKSPACE</small><h1>Sign in</h1><p>Use the email your manager added to the team.</p>${error?`<p class="error" role="alert">${escape(error)}</p>`:''}<form method="post"><input type="hidden" name="return_to" value="${escape(returnTo)}"><label for="username">Email or admin username</label><input id="username" name="username" autocomplete="username" required autofocus><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required><button type="submit">Sign in</button></form><p class="hint">Team members use their assigned sign-in email. Administrators use their admin username.</p></main></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}
export async function GET(request:Request){const url=new URL(request.url);if(!isLocalNetworkHost(url.hostname))return new Response('Local sign-in is only available on the private office network.',{status:403});return page(safeReturn(url.searchParams.get('return_to')))}
export async function POST(request:Request){
 const url=new URL(request.url);if(!isLocalNetworkHost(url.hostname))return new Response('Local sign-in is only available on the private office network.',{status:403});
 const form=await request.formData(),returnTo=safeReturn(String(form.get('return_to')||'/')),username=String(form.get('username')||'').trim(),passwordHash=await hash(String(form.get('password')||''));
 try{
 let cookieValue='';
 if(username==='admin'&&passwordHash===ADMIN_PASSWORD_HASH)cookieValue='local-admin-session-v1';
 else {
  const person=await database().prepare('SELECT p.id,p.email,p.name,c.salt,c.password_hash FROM people p JOIN local_credentials c ON c.person_id=p.id WHERE lower(p.email)=lower(?) AND p.active=1').bind(username).first<{id:string;email:string;name:string;salt:string;password_hash:string}>();
  if(person){
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(form.get('password')||'')),'PBKDF2',false,['deriveBits']);
   const salt=Uint8Array.from(person.salt.match(/.{2}/g)!,s=>parseInt(s,16));
   const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256);
   const candidate=Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');
   if(candidate===person.password_hash){
    const bytes=new TextEncoder().encode(JSON.stringify({id:person.id,email:person.email,name:person.name}));
    cookieValue='local-user-v1:'+btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
   }
  }
 }

 if(!cookieValue)return page(returnTo,'Incorrect email, username, or password.');
 const response=NextResponse.redirect(new URL(returnTo,url.origin),303);response.cookies.set('__studio_local_user',cookieValue,{httpOnly:true,sameSite:'strict',secure:url.protocol==='https:',path:'/',maxAge:60*60*8});return response;
 }catch{return page(returnTo,'The database is temporarily unreachable. Your account has not changed. Check the internet connection and try again.',503)}
}

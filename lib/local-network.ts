export function isLocalNetworkHost(hostname:string){
 const host=hostname.toLowerCase().replace(/^\[|\]$/g,'');
 if(host==='localhost'||host==='127.0.0.1'||host==='::1')return true;
 if(/^10(?:\.\d{1,3}){3}$/.test(host)||/^192\.168(?:\.\d{1,3}){2}$/.test(host))return true;
 const match=host.match(/^172\.(\d{1,3})(?:\.\d{1,3}){2}$/);
 return !!match&&Number(match[1])>=16&&Number(match[1])<=31;
}

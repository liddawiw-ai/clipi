const enc = new TextEncoder();
function encode(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export async function piLogin(request,env,json) {
  if(request.method !== 'POST') return json({error:'Method not allowed'},405);
  const token = /^Bearer ([^\s]{1,4096})$/.exec(request.headers.get('Authorization') || '')?.[1];
  if(!token) return json({error:'Missing Pi authorization'},401);
  if(!env.PI_FIREBASE_SIGNER_EMAIL || !env.PI_FIREBASE_SIGNER_KEY) return json({error:'لم يكتمل إعداد تسجيل الدخول على الخادم'},503);
  try {
    const res = await fetch('https://api.minepi.com/v2/me',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});
    if(!res.ok) return json({error:'تعذر التحقق من حساب Pi'},res.status===401||res.status===403?401:502);
    const {uid,username}=await res.json();
    if(typeof uid!=='string'||!uid.length||uid.length>110) return json({error:'Invalid Pi identity'},502);
    const iat=Math.floor(Date.now()/1000);
    const body={iss:env.PI_FIREBASE_SIGNER_EMAIL,sub:env.PI_FIREBASE_SIGNER_EMAIL,aud:'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',iat,exp:iat+300,uid:'pi:'+uid};
    const data=[{alg:'RS256',typ:'JWT'},body].map(x=>encode(enc.encode(JSON.stringify(x)))).join('.');
    const pem=env.PI_FIREBASE_SIGNER_KEY.replaceAll('\\n','\n').replace(/-----[^-]+-----|\s/g,'');
    const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
    const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(data));
    return json({token:data+'.'+encode(new Uint8Array(signature)),username:typeof username==='string'?username.slice(0,35):''});
  } catch {return json({error:'تعذر إكمال تسجيل الدخول بحساب Pi'},503);}
}

import {linkStore,linkedEmail,linkedPi,recentPasswordAccount,registeredPair,recordLink} from './pi-account-link.mjs';

const enc=new TextEncoder();
function encode(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
async function signClaims(env,body) {
  const data=[{alg:'RS256',typ:'JWT'},body].map(x=>encode(enc.encode(JSON.stringify(x)))).join('.');
  const pem=env.PI_FIREBASE_SIGNER_KEY.replaceAll('\\n','\n').replace(/-----[^-]+-----|\s/g,'');
  const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(data));
  return data+'.'+encode(new Uint8Array(signature));
}
function loginToken(env,uid) {
  const iat=Math.floor(Date.now()/1000);
  return signClaims(env,{iss:env.PI_FIREBASE_SIGNER_EMAIL,sub:env.PI_FIREBASE_SIGNER_EMAIL,
    aud:'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',iat,exp:iat+300,uid});
}

export async function googleAccess(env,scope){
  const iat=Math.floor(Date.now()/1000);
  const assertion=await signClaims(env,{iss:env.PI_FIREBASE_SIGNER_EMAIL,scope,
    aud:'https://oauth2.googleapis.com/token',iat,exp:iat+300});
  const grant=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(8000),
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
  if(!grant.ok)return null;
  const access=(await grant.json()).access_token;
  return typeof access==='string'&&access?access:null;
}

// A Firebase custom token can create a missing account. Check that the linked password identity still exists before issuing one.
async function emailAccountExists(env,emailUid) {
  const access=await googleAccess(env,'https://www.googleapis.com/auth/identitytoolkit');
  if(!access)return false;
  const result=await fetch('https://identitytoolkit.googleapis.com/v1/projects/clipi-f67c0/accounts:lookup',{method:'POST',
    headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({localId:[emailUid]}),signal:AbortSignal.timeout(8000)});
  if(!result.ok)return false;
  return (await result.json()).users?.some(user=>user.localId===emailUid&&user.email&&!user.disabled&&user.providerUserInfo?.some(p=>p.providerId==='password'))===true;
}
export async function piLogin(request,env,json,apiKey) {
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const path=new URL(request.url).pathname;
  const linking=path==='/auth/pi/link-preview'||path==='/auth/pi/link-confirm';
  const token=/^Bearer ([^\s]{1,4096})$/.exec(request.headers.get('Authorization')||'')?.[1];
  if(!token)return json({error:'Missing Pi authorization'},401);
  if(!env.PI_FIREBASE_SIGNER_EMAIL||!env.PI_FIREBASE_SIGNER_KEY)return json({error:'لم يكتمل إعداد تسجيل الدخول على الخادم'},503);
  try{
    const res=await fetch('https://api.minepi.com/v2/me',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});
    if(!res.ok)return json({error:'تعذّر التحقق من حساب Pi'},res.status===401||res.status===403?401:502);
    const {uid,username}=await res.json();
    if(typeof uid!=='string'||!uid.length||uid.length>110)return json({error:'Invalid Pi identity'},502);
    const piUid='pi:'+uid;
    const db=await linkStore(env);
    let emailUid=await linkedEmail(db,piUid);
    if(linking){
      if(!db || request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return json({error:'طلب ربط غير صالح'},400);
      const input=await request.json();
      if(input?.piUid!==piUid)return json({error:'حساب Pi المفتوح مختلف عن حساب التطبيق.'},409);
      const target=await recentPasswordAccount(input.emailToken,apiKey);
      if(!target)return json({error:'أعد تأكيد البريد وكلمة المرور داخل كليبي.'},401);
      const numbers=await registeredPair(db,piUid,target);
      if(!numbers)return json({error:'الربط متاح لحسابَي المالك المسجّلين فقط. تحقّق من حساب البريد.'},403);
      const reverse=await linkedPi(db,target);
      if((emailUid&&emailUid!==target)||(reverse&&reverse!==piUid))return json({error:'أحد الحسابين مرتبط بحساب آخر.'},409);
      if(path.endsWith('preview'))return json({...numbers,linked:emailUid===target});
      if(input.confirmNumber!==numbers.emailNumber)return json({error:'أعد مراجعة رقم حساب البريد.'},409);
      if(!await recordLink(db,piUid,target))return json({error:'تعذّر تثبيت الربط. أعد فتح الإعدادات.'},409);
      emailUid=target;
    }
    let destination=path==='/auth/pi/original'?piUid:(emailUid||piUid);
    let needsEmail=false;
    if(!linking&&destination!==piUid&&!await emailAccountExists(env,emailUid).catch(()=>false)){
      destination=piUid;
      needsEmail=true;
    }
    return json({token:await loginToken(env,destination),linked:Boolean(emailUid),needsEmail,original:destination===piUid,
      username:destination===piUid&&typeof username==='string'?username.slice(0,35):''});
  }catch{return json({error:'تعذّر التحقق من تسجيل الدخول حاليًا. حاول مجددًا.'},503);}
}

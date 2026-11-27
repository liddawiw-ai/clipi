import {payoutTestReward} from './pi-test-payout.mjs';
import {walletMatches} from './pi-test-wallet.mjs';
const host='clipi-pi-testnet.liddawiw.workers.dev';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const allowed=(request,env)=>new URL(request.url).hostname===host&&env.PI_GIFTS_TESTNET==='1'&&env.PI_GIFTS_NETWORK!=='mainnet';
const page='<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Clipi Testnet</title><style>body{font:18px system-ui;background:#f6f3fb;color:#342047;padding:24px}main{max-width:440px;margin:40px auto;background:white;padding:24px;border-radius:24px;box-shadow:0 8px 24px #ded6ea}button{width:100%;padding:14px;border:0;border-radius:14px;background:#63339b;color:white;font:inherit}button:disabled{opacity:.5}</style><main><h1>مكافأة كليبي التجريبية</h1><h2>1 Test-π</h2><p>اختبار فقط. لا يتضمن أموالاً حقيقية.</p><button id="claim">استلام المكافأة التجريبية</button><p id="status" role="status"></p></main><script src="https://sdk.minepi.com/pi-sdk.js"></script><script>const b=document.getElementById("claim"),s=document.getElementById("status");b.onclick=async()=>{b.disabled=true;try{if(!window.Pi)throw Error("افتح التطبيق في بيئة Pi Testnet");Pi.init({version:"2.0",sandbox:false});const a=await Pi.authenticate(["username","payments","wallet_address"],()=>{});const r=await fetch("/test-reward",{method:"POST",headers:{Authorization:"Bearer "+a.accessToken}});const d=await r.json();s.textContent=d.message||"تعذر تقديم الطلب";}catch(e){s.textContent="تعذر الاتصال بخدمة الاختبار. حاول مجدداً."}finally{b.disabled=false}}</script></html>';
export async function testReward(request,env){
 if(!allowed(request,env))return reply({error:'Not found'},404);
 if(request.method==='GET')return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const token=/^Bearer ([^\s]{1,4096})$/.exec(request.headers.get('Authorization')||'')?.[1];
 if(!token)return reply({message:'سجّل الدخول بحساب Pi'},401);
 if(!env.PI_NETWORK_API_KEY||!env.PI_GIFTS_DB||!env.PI_TEST_WALLET_ADDRESS||!env.PI_WALLET_PRIVATE_SEED)return reply({message:'إعدادات الاختبار غير مكتملة'},503);
 try{
  if(!await walletMatches(env.PI_WALLET_PRIVATE_SEED.trim(),env.PI_TEST_WALLET_ADDRESS.trim()))return reply({message:'محفظة الاختبار غير مطابقة'},503);
  const r=await fetch('https://api.minepi.com/v2/me',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
  if(!r.ok)return reply({message:'تعذر التحقق من حساب Pi'},401);
  const me=await r.json();if(typeof me.uid!=='string'||!me.uid||me.uid.length>128)return reply({message:'حساب غير صالح'},401);
  const db=env.PI_GIFTS_DB;
  await db.prepare('CREATE TABLE IF NOT EXISTS test_reward_requests(uid TEXT PRIMARY KEY,created INTEGER NOT NULL,state TEXT NOT NULL DEFAULT \'pending\')').run();
  await db.prepare("INSERT OR IGNORE INTO test_reward_requests(uid,created,state) SELECT ?,?,'pending' WHERE (SELECT COUNT(*) FROM test_reward_requests)<5").bind(me.uid,Date.now()).run();
  const row=await db.prepare('SELECT state FROM test_reward_requests WHERE uid=?').bind(me.uid).first();
  if(!row)return reply({message:'اكتملت قائمة طلبات الاختبار الخمسة'},409);
  return reply(await payoutTestReward(env,me.uid));
 }catch{return reply({message:'تعذر إكمال التحويل التجريبي. لم يتم تأكيد الصرف؛ أعد المحاولة للتحقق من نفس المعاملة.'},503)}
}

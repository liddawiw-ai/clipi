import {roomStore} from './room-controls.mjs';
const multipliers=[1,2,5,10,20,50,100];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const cannot=(message,status=409)=>Object.assign(new Error(message),{status});
export const orderSchema="CREATE TABLE IF NOT EXISTS native_checkout(id TEXT PRIMARY KEY, uid TEXT NOT NULL, method TEXT NOT NULL, dollars INTEGER NOT NULL, diamonds INTEGER NOT NULL, amount TEXT NOT NULL, expires INTEGER NOT NULL, payment TEXT UNIQUE, payer TEXT, UNIQUE(uid,id))";
async function store(env){
  const q=await roomStore(env.PI_GIFTS_DB);
  await q(orderSchema).run();
  await q('CREATE TABLE IF NOT EXISTS native_store_account(id TEXT PRIMARY KEY,uid TEXT UNIQUE NOT NULL)').run();
  return q;
}
async function remote(url,options={}){
  const r=await fetch(url,{...options,signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw cannot('تعذّر الاتصال بمزوّد الدفع. يمكنك إعادة المحاولة.',503);
  return r.json();
}
export function quotePi(dollars,ticker,now){
  const rate=ticker?.usd,stamp=ticker?.last_updated_at*1000;
  if(!Number.isFinite(rate)||rate<=0||!Number.isFinite(stamp)||now-stamp>300000||stamp>now+30000)
    throw cannot('سعر PI غير متاح حاليًا. أعد طلب السعر.',503);
  const amount=(dollars/rate).toFixed(7);
  if(!Number.isFinite(Number(amount))||Number(amount)<=0)throw cannot('سعر PI غير صالح.',503);
  return amount;
}
function stripe(env,path,options={}){
  return remote('https://api.stripe.com/v1/'+path,{...options,headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,...options.headers}});
}
async function credit(q,o,payment,txid){
  await q('INSERT INTO diamond_purchase(payment,uid,diamonds,txid) VALUES(?,?,?,?) ON CONFLICT(payment) DO NOTHING','native:'+o.method+':'+payment,o.uid,o.diamonds,txid).run();
}
async function reverse(q,payment,diamonds){
 await q('INSERT INTO native_purchase_reversal(payment,diamonds) VALUES(?,?) ON CONFLICT(payment) DO UPDATE SET diamonds=MAX(diamonds,excluded.diamonds)',payment,diamonds).run();
}
async function settleCard(q,env,o){
  const s=await stripe(env,'checkout/sessions/'+encodeURIComponent(o.payment));
  if(s.id!==o.payment||s.client_reference_id!==o.id||s.currency!=='usd'||s.amount_total!==o.dollars*100||s.payment_status!=='paid'||!s.payment_intent||!s.livemode)return false;
  await credit(q,o,s.id,'stripe:'+s.payment_intent);
  return true;
}
export async function accountCheckout(env,uid,input,origin){
 try{
  if(env.PI_GIFTS_NETWORK!=='mainnet')return json({error:'الدفع متاح على الشبكة الرئيسية فقط'},503);
  const q=await store(env);
  if(input.op==='externalStoreAccount'){
   const app={PLAY_STORE:env.RC_ANDROID_APP_ID,APP_STORE:env.RC_APPLE_APP_ID}[input.store];
   if(!app||!env.RC_WEBHOOK_SECRET)return json({error:'لم يُفعّل ربط المتجر بعد'},503);
   await q('INSERT OR IGNORE INTO native_store_account(id,uid) VALUES(?,?)',crypto.randomUUID(),uid).run();
   return json(await q('SELECT id FROM native_store_account WHERE uid=?',uid).first());
  }
  if(input.op==='externalOrders'){
    const rows=(await q("SELECT o.* FROM native_checkout o LEFT JOIN diamond_purchase d ON d.payment='native:'||o.method||':'||o.payment WHERE o.uid=? AND d.payment IS NULL AND o.method='card' AND o.payment IS NOT NULL AND o.expires>? ORDER BY o.rowid DESC LIMIT 8",uid,Date.now()-86400000).all()).results;
    for(const row of rows)await settleCard(q,env,row);
    return json({ok:true});
  }
  const {method,dollars,id}=input;
  if(!['pi','card'].includes(method)||!multipliers.includes(dollars)||!uuid.test(id))return json({error:'باقة غير صالحة'},400);
  if(method==='card'&&(!env.STRIPE_SECRET_KEY||!env.STRIPE_WEBHOOK_SECRET))return json({error:'الدفع بالبطاقة وGoogle Pay غير متاح حاليًا'},503);
  if(method==='pi'&&!env.PI_NETWORK_API_KEY)return json({error:'الدفع بعملة PI غير متاح'},503);
  const now=Date.now();
  let order=await q('SELECT * FROM native_checkout WHERE id=?',id).first();
  if(!order){
   const price=method==='pi'?await remote('https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd&include_last_updated_at=true',{headers:env.COINGECKO_DEMO_KEY?{'x-cg-demo-api-key':env.COINGECKO_DEMO_KEY}:{}}):null;
   const amount=method==='pi'?quotePi(dollars,price['pi-network'],now):String(dollars);
   await q('INSERT OR IGNORE INTO native_checkout(id,uid,method,dollars,diamonds,amount,expires) VALUES(?,?,?,?,?,?,?)',id,uid,method,dollars,dollars*(method==='pi'?1200:1000),amount,now+(method==='pi'?300000:1800000)).run();
   order=await q('SELECT * FROM native_checkout WHERE id=?',id).first();
  }
  if(order.uid!==uid||order.method!==method||order.dollars!==dollars||order.expires<=now)return json({error:'انتهى عرض السعر. اطلب عرضًا جديدًا.'},409);
  if(method==='pi')return json({url:origin+'/external-checkout#'+id,amount:order.amount,expires:order.expires,diamonds:order.diamonds});
  const params=new URLSearchParams({mode:'payment','payment_method_types[0]':'card',client_reference_id:id,'payment_intent_data[metadata][clipi_order]':id,
   'line_items[0][price_data][currency]':'usd','line_items[0][price_data][product_data][name]':'Clipi · '+order.diamonds+' diamonds',
   'line_items[0][price_data][unit_amount]':String(dollars*100),'line_items[0][quantity]':'1',
   success_url:origin+'/external-checkout?return=1',cancel_url:origin+'/external-checkout?cancel=1'});
  const session=await stripe(env,'checkout/sessions',{method:'POST',headers:{'Idempotency-Key':'clipi-'+id},body:params});
  if(!session.livemode||!session.url?.startsWith('https://checkout.stripe.com/'))throw cannot('لم يُفعّل حساب الدفع الحقيقي',503);
  await q('UPDATE native_checkout SET payment=? WHERE id=?',session.id,id).run();
  return json({url:session.url,amount:order.amount,diamonds:order.diamonds,expires:order.expires});
 }catch(e){return json({error:e.status?e.message:'تعذّر إنشاء طلب الشراء'},e.status||503)}
}
export async function externalPayment(request,env){
 try{
  if(env.PI_GIFTS_NETWORK!=='mainnet'||request.method!=='POST')return json({},404);
  const path=new URL(request.url).pathname;
  if(path==='/external-checkout/store-webhook'){
   const header=request.headers.get('Authorization')||'',secret=env.RC_WEBHOOK_SECRET;
   if(!secret||header.length!==secret.length+7||!header.startsWith('Bearer '))return json({},401);
   let mismatch=0;
   for(let i=0;i<secret.length;i++)mismatch|=header.charCodeAt(i+7)^secret.charCodeAt(i);
   if(mismatch)return json({},401);
   const e=(await request.json()).event;
   if(!e||e.environment!=='PRODUCTION'||!['NON_RENEWING_PURCHASE','CANCELLATION'].includes(e.type))return json({ok:true});
   const expected={PLAY_STORE:env.RC_ANDROID_APP_ID,APP_STORE:env.RC_APPLE_APP_ID}[e.store];
   if(!expected||e.app_id!==expected)return json({},403);
   const diamonds=Number(/^clipi_diamonds_(\d+)$/.exec(e.product_id)?.[1]);
   if(!multipliers.includes(diamonds/1000))return json({ok:true});
   if(typeof e.transaction_id!=='string'||!e.transaction_id||e.transaction_id.length>250)return json({},400);
   const q=await store(env);
   const account=await q('SELECT uid FROM native_store_account WHERE id=?',e.app_user_id).first();
   if(!account)return json({},409);
   const id='store:'+e.store+':'+e.transaction_id;
   if(e.type==='CANCELLATION')await reverse(q,id,diamonds);
   else await q('INSERT INTO diamond_purchase(payment,uid,diamonds,txid) VALUES(?,?,?,?) ON CONFLICT(payment) DO NOTHING',id,account.uid,diamonds,id).run();
   return json({ok:true});
  }
  if(path==='/external-checkout/webhook'){
   if(!env.STRIPE_WEBHOOK_SECRET||!env.STRIPE_SECRET_KEY)return json({},503);
   const raw=await request.text(),sig=(request.headers.get('Stripe-Signature')||'').split(',');
   const t=sig.find(v=>v.startsWith('t='))?.slice(2);
   if(!/^\d+$/.test(t||'')||Math.abs(Date.now()/1000-Number(t))>300)return json({},400);
   const enc=new TextEncoder(),key=await crypto.subtle.importKey('raw',enc.encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
   const signed=enc.encode(t+'.'+raw);
   let ok=false;
   for(const item of sig.filter(v=>/^v1=[a-f0-9]{64}$/.test(v))){
    if(await crypto.subtle.verify('HMAC',key,Uint8Array.from(item.slice(3).match(/../g),s=>parseInt(s,16)),signed)){ok=true;break}
   }
   if(!ok)return json({},400);
   const event=JSON.parse(raw);
   if(event.type==='charge.refunded'&&event.livemode){
    const c=event.data.object,orderId=c.metadata?.clipi_order;
    if(!orderId)return json({ok:true});
    const q=await store(env),o=await q("SELECT * FROM native_checkout WHERE id=? AND method='card'",orderId).first();
    if(!o?.payment)return json({},503);
    const session=await stripe(env,'checkout/sessions/'+encodeURIComponent(o.payment));
    if(session.payment_intent!==c.payment_intent||c.currency!=='usd'||c.amount!==o.dollars*100||!Number.isSafeInteger(c.amount_refunded)||c.amount_refunded<0||c.amount_refunded>c.amount)return json({},409);
    await reverse(q,'native:card:'+o.payment,Math.round(o.diamonds*c.amount_refunded/c.amount));
    return json({ok:true});
   }
   if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)||!event.livemode)return json({ok:true});
   const q=await store(env),s=event.data.object,o=await q("SELECT * FROM native_checkout WHERE id=? AND method='card'",s.client_reference_id).first();
   if(!o)return json({ok:true});
   if(!o.payment)return json({},503);
   if(o.payment!==s.id)return json({},409);
   await settleCard(q,env,o);return json({ok:true});
  }
  const input=await request.json(),{id,paymentId,token}=input;
  if(!uuid.test(id))return json({},400);
  const q=await store(env),o=await q("SELECT * FROM native_checkout WHERE id=? AND method='pi'",id).first();
  if(!o)return json({},404);
  if(path==='/external-checkout/quote'){
   const account=await q('SELECT number FROM selected_number WHERE uid=? UNION ALL SELECT number FROM public_numbers WHERE uid=? AND cost=0 LIMIT 1',o.uid,o.uid).first();
   return json({diamonds:o.diamonds,amount:o.amount,dollars:o.dollars,account:account?.number,expires:o.expires});
  }
  const action=path.split('/').pop();
  if(!['approve','complete'].includes(action)||!env.PI_NETWORK_API_KEY||typeof token!=='string'||token.length>4096||!/^[\w-]{1,128}$/.test(paymentId||''))return json({},400);
  const pi=(p,auth,opts={})=>remote('https://api.minepi.com/v2/'+p,{...opts,headers:{Authorization:auth,'Content-Type':'application/json'}});
  const auth='Key '+env.PI_NETWORK_API_KEY,pp='payments/'+paymentId;
  const [who,p]=await Promise.all([pi('me','Bearer '+token),pi(pp,auth)]);
  if(!who.uid||p.identifier!==paymentId||p.user_uid!==who.uid||p.metadata?.kind!=='native_diamonds'||p.metadata?.order!==id||p.direction!=='user_to_app'||p.network!=='Pi Network'||Number(p.amount)!==Number(o.amount)||p.status?.cancelled||p.status?.user_cancelled)return json({},403);
  if(action==='approve'){
   if(o.expires<=Date.now()&&!p.status?.developer_approved)return json({error:'انتهت صلاحية السعر'},409);
   const locked=await q("UPDATE native_checkout SET payment=?,payer=? WHERE id=? AND (payment IS NULL OR (payment=? AND payer=?))",paymentId,who.uid,id,paymentId,who.uid).run();
   if(!locked.meta.changes)return json({},409);
   if(!p.status?.developer_approved)await pi(pp+'/approve',auth,{method:'POST',body:'{}'});
   return json({ok:true});
  }
  if(o.payment!==paymentId||o.payer!==who.uid||!p.status?.developer_approved)return json({},409);
  const txid=input.txid||p.transaction?.txid;
  if(!/^[a-f0-9]{64}$/i.test(txid||''))return json({},400);
  const done=p.status.developer_completed?p:await pi(pp+'/complete',auth,{method:'POST',body:JSON.stringify({txid})});
  if(!done.status?.transaction_verified||!done.status?.developer_completed||done.transaction?.txid!==txid)return json({},409);
  await credit(q,o,paymentId,txid);
  return json({ok:true,diamonds:o.diamonds});
 }catch(e){return json({error:e.status?e.message:'تعذّر تأكيد الدفعة. أعد المحاولة.'},e.status||503)}
}

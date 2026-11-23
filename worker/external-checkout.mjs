import {roomStore} from './room-controls.mjs';
const multipliers=[1,2,5,10,20,50,100];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const cannot=(message,status=409)=>Object.assign(new Error(message),{status});
export const orderSchema="CREATE TABLE IF NOT EXISTS native_checkout(id TEXT PRIMARY KEY, uid TEXT NOT NULL, method TEXT NOT NULL, dollars INTEGER NOT NULL, diamonds INTEGER NOT NULL, amount TEXT NOT NULL, expires INTEGER NOT NULL, payment TEXT UNIQUE, payer TEXT, UNIQUE(uid,id))";
async function store(env){
  const q=await roomStore(env.PI_GIFTS_DB);
  await q(orderSchema).run();
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
async function credit(q,o,payment,txid){
  await q('INSERT INTO diamond_purchase(payment,uid,diamonds,txid) VALUES(?,?,?,?) ON CONFLICT(payment) DO NOTHING','native:'+o.method+':'+payment,o.uid,o.diamonds,txid).run();
}
function piRequest(env,path,options={},authorization='Key '+env.PI_NETWORK_API_KEY){
  return remote('https://api.minepi.com/v2/'+path,{...options,headers:{Authorization:authorization,'Content-Type':'application/json'}});
}
function matchesPiOrder(payment,order,paymentId,payer){
  return !!payer && payment?.identifier===paymentId && payment.user_uid===payer &&
    payment.metadata?.kind==='native_diamonds' && payment.metadata.order===order.id &&
    payment.direction==='user_to_app' && payment.network==='Pi Network' &&
    Number(payment.amount)===Number(order.amount) && !payment.status?.cancelled && !payment.status?.user_cancelled;
}
async function settlePi(q,env,order,payment,txid){
  if(!matchesPiOrder(payment,order,order.payment,order.payer)||!payment.status?.developer_approved||
      !/^[a-f0-9]{64}$/i.test(txid||'')||(payment.transaction?.txid&&payment.transaction.txid!==txid))return false;
  const confirmed=payment.status.developer_completed?payment:await piRequest(env,'payments/'+order.payment+'/complete',{
    method:'POST',body:JSON.stringify({txid})
  });
  if(!matchesPiOrder(confirmed,order,order.payment,order.payer)||!confirmed.status?.developer_completed||
      !confirmed.status.transaction_verified||confirmed.transaction?.txid!==txid)return false;
  await credit(q,order,order.payment,txid);
  return true;
}
export async function accountCheckout(env,uid,input,origin){
 try{
  if(env.PI_GIFTS_NETWORK!=='mainnet')return json({error:'الدفع متاح على الشبكة الرئيسية فقط'},503);
  const q=await store(env);
  if(input.op==='externalOrders'){
    const pending="SELECT o.* FROM native_checkout o LEFT JOIN diamond_purchase d ON d.payment='native:'||o.method||':'||o.payment WHERE o.uid=? AND d.payment IS NULL AND o.payment IS NOT NULL";
    if(env.PI_NETWORK_API_KEY){
      const piOrders=(await q(pending+" AND o.method='pi' AND o.payer IS NOT NULL ORDER BY (o.id=?) DESC,o.rowid DESC LIMIT 8",uid,uuid.test(input.order||'')?input.order:'').all()).results;
      for(const order of piOrders){
        try{
          const payment=await piRequest(env,'payments/'+order.payment);
          if(payment.transaction?.txid)await settlePi(q,env,order,payment,payment.transaction.txid);
        }catch{ /* A later wallet refresh can retry this order independently. */ }
      }
    }
    return json({ok:true});
  }
  const {method,dollars,id}=input;
  if(input.op!=='externalCreate'||method!=='pi'||!multipliers.includes(dollars)||!uuid.test(id))return json({error:'باقة غير صالحة'},400);
  if(!env.PI_NETWORK_API_KEY)return json({error:'الدفع بعملة PI غير متاح'},503);
  const now=Date.now();
  let order=await q('SELECT * FROM native_checkout WHERE id=?',id).first();
  if(!order){
   const price=await remote('https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd&include_last_updated_at=true',{headers:env.COINGECKO_DEMO_KEY?{'x-cg-demo-api-key':env.COINGECKO_DEMO_KEY}:{}});
   const amount=quotePi(dollars,price['pi-network'],now);
   await q('INSERT OR IGNORE INTO native_checkout(id,uid,method,dollars,diamonds,amount,expires) VALUES(?,?,?,?,?,?,?)',id,uid,method,dollars,dollars*1200,amount,now+300000).run();
   order=await q('SELECT * FROM native_checkout WHERE id=?',id).first();
  }
  if(order.uid!==uid||order.method!==method||order.dollars!==dollars||order.expires<=now)return json({error:'انتهى عرض السعر. اطلب عرضًا جديدًا.'},409);
  return json({url:origin+'/external-checkout#'+id,amount:order.amount,expires:order.expires,diamonds:order.diamonds});
 }catch(e){return json({error:e.status?e.message:'تعذّر إنشاء طلب الشراء'},e.status||503)}
}
export async function externalPayment(request,env){
 try{
  if(env.PI_GIFTS_NETWORK!=='mainnet'||request.method!=='POST')return json({},404);
  const path=new URL(request.url).pathname;
  const input=await request.json(),{id,paymentId,token}=input;
  if(!uuid.test(id))return json({},400);
  const q=await store(env),o=await q("SELECT * FROM native_checkout WHERE id=? AND method='pi'",id).first();
  if(!o)return json({},404);
  if(path==='/external-checkout/quote'){
   const account=await q('SELECT number FROM selected_number WHERE uid=? UNION ALL SELECT number FROM public_numbers WHERE uid=? AND cost=0 LIMIT 1',o.uid,o.uid).first();
   const paid=o.payment&&await q('SELECT 1 AS done FROM diamond_purchase WHERE payment=? AND uid=?','native:pi:'+o.payment,o.uid).first();
   return json({diamonds:o.diamonds,amount:o.amount,dollars:o.dollars,account:account?.number,expires:o.expires,state:paid?'paid':o.payment?'pending':'open'});
  }
  const action=path.split('/').pop();
  if(!['approve','complete'].includes(action)||!env.PI_NETWORK_API_KEY||typeof token!=='string'||token.length>4096||!/^[\w-]{1,128}$/.test(paymentId||''))return json({},400);
  const pp='payments/'+paymentId;
  const [who,p]=await Promise.all([piRequest(env,'me',{},'Bearer '+token),piRequest(env,pp)]);
  if(!matchesPiOrder(p,o,paymentId,who.uid))return json({},403);
  if(action==='approve'){
   if(o.expires<=Date.now()&&!p.status?.developer_approved)return json({error:'انتهت صلاحية السعر'},409);
   const locked=await q("UPDATE native_checkout SET payment=?,payer=? WHERE id=? AND (payment IS NULL OR (payment=? AND payer=?))",paymentId,who.uid,id,paymentId,who.uid).run();
   if(!locked.meta.changes)return json({},409);
   if(!p.status?.developer_approved)await piRequest(env,pp+'/approve',{method:'POST',body:'{}'});
   return json({ok:true});
  }
  if(o.payment!==paymentId||o.payer!==who.uid||!p.status?.developer_approved)return json({},409);
  const txid=input.txid||p.transaction?.txid;
  if(!/^[a-f0-9]{64}$/i.test(txid||''))return json({},400);
  if(!await settlePi(q,env,o,p,txid))return json({},409);
  return json({ok:true,diamonds:o.diamonds});
 }catch(e){return json({error:e.status?e.message:'تعذّر تأكيد الدفعة. أعد المحاولة.'},e.status||503)}
}

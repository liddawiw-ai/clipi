'use strict';
const {HttpsError}=require('firebase-functions/v2/https');
const {randomUUID}=require('node:crypto');
const supported=new Set(['ach','international_bank','wallet','paypal','venmo','cash_app']);
const MIN=2000,INTERVAL=15*86400000;
const countryValid=code=>typeof code==='string'&&/^[A-Z]{2}$/.test(code);
const api='https://api.tremendous.com/api/v2';
async function provider(path,body){
 const key=process.env.TREMENDOUS_API_KEY;
 if(!key)throw new HttpsError('failed-precondition','لم تُفعّل خدمة التحويل بعد.');
 const r=await fetch(api+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
 if(r.status===404&&!body)return null;
 if(!r.ok){
  const error=new HttpsError('unavailable','تعذّر تأكيد حالة التحويل لدى المزود. يمكنك التحقق من الطلب نفسه.');
  error.providerStatus=r.status;throw error;
 }
 return r.json();
}
async function methods(country){
 if(!countryValid(country))throw new HttpsError('invalid-argument','اختر الدولة');
 const data=await provider('/products?currency=USD&country='+country);
 if(!Array.isArray(data?.products))throw new HttpsError('unavailable','تعذر تحميل طرق السحب');
 return data.products.filter(p=>supported.has(p.category)&&p.countries?.some(c=>c.abbr===country)&&p.currency_codes?.includes('USD')).map(p=>({
  id:p.id,name:p.name,type:['ach','international_bank'].includes(p.category)?'bank':'wallet',
  bands:(p.skus||[]).filter(s=>s.currency_code==='USD').map(s=>({min:s.min,max:s.max}))
 }));
}
function eligible(method,points){
 return Number.isSafeInteger(points)&&points>=MIN&&method?.bands?.some(b=>points>=Math.round(b.min*100)&&points<=Math.round(b.max*100));
}
async function execute({db,uid,input,checkWalletPin,validatePin}){
 const ref=db.collection('earningsWallets').doc(uid);
 if(!validatePin(input.pin))throw new HttpsError('invalid-argument','أدخل الرقم السري للمحفظة');
 await checkWalletPin(ref,input.pin);
 const existing=(await ref.get()).data()||{};
 const orders=ref.collection('withdrawals');
 if(input.receipt){
  if(!existing.lastWithdrawal)return {state:'empty'};
  const record=(await orders.doc(existing.lastWithdrawal).get()).data();
  return {state:record?.state||'pending',url:record?.link||null};
 }
 let id=existing.activeWithdrawal;
 if(!id){
  const product=(await methods(input.country)).find(p=>p.id===input.product);
  if(!eligible(product,input.points))throw new HttpsError('invalid-argument','المبلغ خارج حدود طريقة السحب المختارة');
  const proposed=randomUUID();
  id=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref),w=snap.data()||{};
   if(w.activeWithdrawal)return w.activeWithdrawal;
   if(!Number.isSafeInteger(w.availablePoints)||w.availablePoints<input.points||
      (w.lastPayoutRequestAt?.toMillis?.()||0)+INTERVAL>Date.now())throw new HttpsError('failed-precondition','تحقّق من الرصيد المتاح وموعد السحب التالي.');
   tx.create(orders.doc(proposed),{country:input.country,product:product.id,points:input.points,state:'pending',createdAt:new Date()});
   tx.update(ref,{availablePoints:w.availablePoints-input.points,activeWithdrawal:proposed});
   return proposed;
  });
 }
 const orderRef=orders.doc(id),order=(await orderRef.get()).data();
 if(order.state!=='pending')return {state:order.state,url:order.link||null};
 let response=await provider('/orders/'+id);
 if(!response){
  try{
   response=await provider('/orders',{external_id:id,payment:{funding_source_id:'BALANCE'},reward:{
    products:[order.product],value:{denomination:order.points/100,currency_code:'USD'},delivery:{method:'LINK'},recipient:{name:'Clipi member'}}});
  }catch(e){
   if(![400,402,422].includes(e.providerStatus))throw e;
   response=await provider('/orders/'+id);
   if(!response)response={order:{id:null,external_id:id,status:'FAILED'}};
  }
 }
 const result=response?.order;
 if(!result||result.external_id!==id)throw new HttpsError('unavailable','الطلب محفوظ. أعد التحقق من حالته.');
 const canceled=['CANCELED','FAILED'].includes(result.status);
 if(!canceled&&result.status!=='EXECUTED')return {state:'pending'};
 const reward=result.rewards?.[0];let link=reward?.delivery?.link;
 if(!canceled&&!link&&reward?.id)link=(await provider('/rewards/'+encodeURIComponent(reward.id)+'/generate_link',{}))?.reward?.link;
 if(!canceled&&(!link||!/^https:\/\/(?:[a-z0-9-]+\.)*tremendous\.com\//i.test(link)))return {state:'pending'};
 const state=canceled?'canceled':'issued';
 await db.runTransaction(async tx=>{
  const w=(await tx.get(ref)).data(),o=(await tx.get(orderRef)).data();
  if(w.activeWithdrawal!==id||o.state!=='pending')return;
  tx.update(orderRef,{state,providerId:result.id,link:canceled?null:link,updatedAt:new Date()});
  const update={activeWithdrawal:null,lastWithdrawal:id};
  if(canceled)update.availablePoints=w.availablePoints+order.points;
  else update.lastPayoutRequestAt=new Date();
  tx.update(ref,update);
 });
 return {state,url:canceled?null:link};
}
module.exports={methods,eligible,execute};

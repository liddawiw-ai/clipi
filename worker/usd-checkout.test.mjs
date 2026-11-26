import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {accountCheckout,externalPayment} from './external-checkout.mjs';

test('direct Android USD orders require live credentials and confirmed server amounts, including retries and refunds',async()=>{
 const sql=new DatabaseSync(':memory:');
 const db={prepare(query){return {query,bind(...args){const s=sql.prepare(query);return {run:()=>({meta:s.run(...args)}),first:()=>s.get(...args),all:()=>({results:s.all(...args)})}}}},batch:async rows=>rows.map(r=>sql.exec(r.query))};
 const env={PI_GIFTS_NETWORK:'mainnet',PI_GIFTS_DB:db},origin='https://example.test',id=crypto.randomUUID();
 const input={op:'externalCreate',method:'card',id,dollars:2},order=(uid='buyer')=>accountCheckout(env,uid,input,origin);
 assert.equal((await order()).status,503);
 Object.assign(env,{STRIPE_SECRET_KEY:'sk_live_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture'});
 const session={id:'cs_live_fixture',livemode:true,client_reference_id:id,metadata:{order:id},status:'open',mode:'payment',currency:'usd',amount_total:200,url:'https://checkout.stripe.com/c/pay/fixture',payment_intent:'pi_fixture'};
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  if(options.method==='POST'){
   assert.equal(options.body.get('line_items[0][price_data][unit_amount]'),'200');
   assert.equal(options.body.get('client_reference_id'),id);
  }
  return Response.json(session);
 };
 async function event(type,obj,sign=true){
  const text=JSON.stringify({type,livemode:true,data:{object:obj}}),time=Math.floor(Date.now()/1000);
  const {createHmac}=await import('node:crypto');
  const sig=createHmac('sha256',sign?env.STRIPE_WEBHOOK_SECRET:'wrong').update(time+'.'+text).digest('hex');
  return externalPayment(new Request(origin+'/external-checkout/stripe-webhook',{method:'POST',body:text,headers:{'Stripe-Signature':'t='+time+',v1='+sig}}),env);
 }
 try{
  assert.deepEqual(await (await order()).json(),{url:session.url});
  assert.equal((await order('other')).status,409);
  const balance=()=>sql.prepare('SELECT COALESCE(SUM(diamonds),0) AS n FROM diamond_purchase').get().n;
  assert.equal(balance(),0);
  Object.assign(session,{status:'complete',payment_status:'paid'});
  assert.equal((await event('checkout.session.completed',session,false)).status,400);
  assert.equal((await event('checkout.session.completed',{...session,amount_total:100})).status,409);
  assert.equal(balance(),0);
  assert.equal((await event('checkout.session.completed',session)).status,200);
  assert.equal((await event('checkout.session.completed',session)).status,200);
  await accountCheckout(env,'buyer',{op:'externalOrders'},origin);
  assert.equal(balance(),2000);
  const charge={livemode:true,currency:'usd',amount:200,amount_refunded:100,metadata:{order:id},payment_intent:'pi_fixture'};
  assert.equal((await event('charge.refunded',charge)).status,200);
  assert.equal(sql.prepare('SELECT diamonds FROM native_purchase_reversal').get().diamonds,1000);
 }finally{globalThis.fetch=original;sql.close();}
});

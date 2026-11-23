import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {roomStore} from './room-controls.mjs';
import {readWallet} from './diamond-wallet.mjs';
import {accountCheckout,externalPayment,quotePi} from './external-checkout.mjs';

test('external Pi orders recover verified transactions once for the initiating native account',async()=>{
 const sql=new DatabaseSync(':memory:');
 const db={prepare(query){return {query,bind(...args){const s=sql.prepare(query);return {run:()=>({meta:s.run(...args)}),first:()=>s.get(...args),all:()=>({results:s.all(...args)})}}}},batch:async rows=>rows.map(r=>sql.exec(r.query))};
 const env={PI_GIFTS_DB:db,PI_GIFTS_NETWORK:'mainnet',PI_NETWORK_API_KEY:'fixture'};
 const q=await roomStore(db),origin='https://example.test',uid='native-account',id=crypto.randomUUID(),paymentId='test-pi',txid='c'.repeat(64);
 const old=globalThis.fetch;
 let piApproved=false,piCompleted=false,piSubmitted=false,piCancelled=false,amount=20;
 let priceMode='normal';
 const piDto=()=>({identifier:paymentId,metadata:{kind:'native_diamonds',order:id},direction:'user_to_app',network:'Pi Network',user_uid:'payer',amount,
  status:{developer_approved:piApproved,developer_completed:piCompleted,transaction_verified:piCompleted&&piSubmitted,user_cancelled:piCancelled},transaction:piSubmitted?{txid}:null});
 globalThis.fetch=async(url,opt={})=>{
  if(url.includes('coingecko')&&priceMode!=='normal')return new Response('',{status:429});
  if(url.includes('api.kraken.com'))return Response.json({error:[],result:{PIUSD:[['0.04','10',priceMode==='kraken'?Date.now()/1000:1]]}});
  if(url.includes('api.coinpaprika.com'))return Response.json({id:'pi2-pi-network',symbol:'PI',quotes:{USD:{price:.08}},last_updated:priceMode==='paprika'?new Date().toISOString():new Date(0).toISOString()});
  if(url.includes('coingecko'))return Response.json({'pi-network':{usd:.05,last_updated_at:Math.floor(Date.now()/1000)}});
  if(url.endsWith('/me'))return Response.json({uid:opt.headers.Authorization==='Bearer payer'?'payer':'other'});
  if(url.endsWith('/approve'))piApproved=true;
  if(url.endsWith('/complete')){if(!piSubmitted)return Response.json({},409);piCompleted=true}
  if(url.includes('api.minepi'))return Response.json(piDto());
  throw Error('unexpected upstream');
 };
 const buy=(id,method,dollars=1,who=uid)=>accountCheckout(env,who,{op:'externalCreate',method,dollars,id},origin);
 const pay=(op,token='payer')=>externalPayment(new Request(origin+'/external-checkout/'+op,{method:'POST',body:JSON.stringify({id,token,paymentId,txid})}),env);
 const sync=(who=uid)=>accountCheckout(env,who,{op:'externalOrders',order:id},origin);
 const state=async()=>(await (await pay('quote')).json()).state;
 try{
  assert.equal((await buy(id,'pi',3)).status,400);
  const quote=await (await buy(id,'pi')).json();
  assert.equal(quote.diamonds,1200);assert.equal(Number(quote.amount),20);
  assert.equal(await state(),'open');
  assert.equal((await buy(id,'pi',1,'another-user')).status,409);
  assert.equal((await pay('approve','other')).status,403);
  assert.equal((await pay('complete')).status,409);
  assert.equal((await pay('approve')).status,200);
  assert.equal((await readWallet(q,uid)).diamonds,0);
  assert.equal(await state(),'pending');
  await sync();
  assert.equal((await readWallet(q,uid)).diamonds,0);
  piSubmitted=true;
  await sync('another-user');
  assert.equal((await readWallet(q,uid)).diamonds,0);
  piCancelled=true;
  await sync();assert.equal((await readWallet(q,uid)).diamonds,0);
  piCancelled=false;amount=30;
  await sync();assert.equal((await readWallet(q,uid)).diamonds,0);
  amount=20;
  await q('UPDATE native_checkout SET expires=0 WHERE id=?',id).run();
  await Promise.all([sync(),sync()]);
  assert.equal(await state(),'paid');
  assert.equal((await readWallet(q,uid)).diamonds,1200);
  assert.equal((await pay('complete')).status,200);
  assert.equal((await pay('complete')).status,200);
  assert.equal((await readWallet(q,uid)).diamonds,1200);
  assert.equal((await readWallet(q,'pi:payer')).diamonds,0);
  const configured={...env,RC_ANDROID_APP_ID:'play-app',RC_WEBHOOK_SECRET:'unit-test'};
  const account=await (await accountCheckout(configured,uid,{op:'externalStoreAccount',store:'PLAY_STORE'},origin)).json();
  assert.match(account.id,/^[a-f0-9-]{36}$/);
  const storeEvent=(type,environment='PRODUCTION',secret='unit-test')=>externalPayment(new Request(origin+'/external-checkout/store-webhook',
   {method:'POST',headers:{Authorization:'Bearer '+secret},body:JSON.stringify({event:{app_id:'play-app',store:'PLAY_STORE',app_user_id:account.id,
   type,environment,transaction_id:'gp-order',product_id:'clipi_diamonds_2000'}})}),configured);
  assert.equal((await storeEvent('NON_RENEWING_PURCHASE','PRODUCTION','wrong')).status,401);
  await storeEvent('NON_RENEWING_PURCHASE','SANDBOX');assert.equal((await readWallet(q,uid)).diamonds,1200);
  await storeEvent('NON_RENEWING_PURCHASE');await storeEvent('NON_RENEWING_PURCHASE');assert.equal((await readWallet(q,uid)).diamonds,3200);
  await storeEvent('CANCELLATION');await storeEvent('CANCELLATION');assert.equal((await readWallet(q,uid)).diamonds,1200);
  for(const [source,expectedAmount] of [['kraken',25],['paprika',12.5]]){
   priceMode=source;const fallback=await buy(crypto.randomUUID(),'pi');assert.equal(fallback.status,200);assert.equal(Number((await fallback.json()).amount),expectedAmount);
  }
  priceMode='stale';assert.equal((await buy(crypto.randomUUID(),'pi')).status,503);
  assert.throws(()=>quotePi(1,{usd:.05,last_updated_at:1},Date.now()));
 }finally{globalThis.fetch=old;sql.close()}
});

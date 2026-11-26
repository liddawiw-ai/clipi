import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {roomStore,roomControls} from './room-controls.mjs';
import {walletSchema,readWallet} from './diamond-wallet.mjs';
import {shortAccount} from './short-videos.mjs';
import {account} from './identity.mjs';
import {piBrowserFunds} from './worker.mjs';

test('Pi session policy also applies to linked accounts and cached browser clients',()=>{
  const req=headers=>new Request('https://clipi.example/account-number',{headers});
  assert.equal(piBrowserFunds(req({}),'pi:walid'),true);
  assert.equal(piBrowserFunds(req({}),'linked-email',{firebase:{sign_in_provider:'custom'}}),true);
  assert.equal(piBrowserFunds(req({Origin:'https://clipi.example'}),'linked-email'),true);
  assert.equal(piBrowserFunds(req({'X-Clipi-Client':'pi-browser'}),'linked-email'),true);
  assert.equal(piBrowserFunds(req({}),'linked-email',{firebase:{sign_in_provider:'password'}}),false);
});

test('historic funds, confirmed Pi top-ups and gifts stay consistent across both platforms',async t=>{
  const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
  const db={prepare(query){return {query,bind(...args){return {
    first:()=>sql.prepare(query).get(...args),all:()=>({results:sql.prepare(query).all(...args)}),
    run:()=>({meta:sql.prepare(query).run(...args)})};}}},batch(statements){return statements.map(s=>s.all?s.all():sql.exec(s.query))}};
  const buyer='linked',host='host',clip=crypto.randomUUID(),room='live';
  const purchase=(payment,amount,tx)=>sql.prepare('INSERT OR IGNORE INTO diamond_purchase VALUES(?,?,?,?)').run(payment,buyer,amount,tx);
  sql.exec(walletSchema.slice(0,walletSchema.findIndex(s=>s.includes('CREATE TABLE IF NOT EXISTS pi_gift_funds'))).join(';'));
  purchase('historic-pi',30,'a'.repeat(64));
  purchase('store:PLAY_STORE:historical',100,'store:PLAY_STORE:historical');
  sql.prepare('INSERT INTO paid_room_gift VALUES(?,?,?,?,?,?,0)').run(buyer,'old',room,host,'old',50);
  const q=await roomStore(db),json=(body,status=200)=>({body,status});
  const balance=async(piOnly=true)=>(await readWallet(q,buyer,undefined,piOnly)).diamonds;
  assert.equal(await balance(),0);assert.equal(await balance(false),80);
  const env={PI_GIFTS_DB:db,LIVEKIT_API_SECRET:'fixture'};
  const visits={[buyer]:crypto.randomUUID(),[host]:crypto.randomUUID()};
  const roomAction=(user,op,fields={},piOnly=true)=>roomControls({env,user,ownerUid:host,host:user===host,room,type:'audio',path:'/room-control',json,piOnly,
    input:{op,name:user,session:visits[user],...fields}});
  await roomAction(host,'join');await roomAction(buyer,'join');
  const sendRoom=(nonce,piOnly=true)=>roomAction(buyer,'paidGift',{recipient:host,gift:'وردة حمراء',cost:10,nonce},piOnly);
  const clipGift=nonce=>shortAccount(q,buyer,{op:'shortGift',gift:'وردة حمراء',clip,nonce},json,true,true);
  await q('INSERT INTO short_clip VALUES(?,?,?,?)',clip,host,'Clip','saved').run();
  const failedNonce=crypto.randomUUID();
  assert.equal((await sendRoom(failedNonce)).status,409);
  assert.equal((await clipGift(crypto.randomUUID())).status,409);
  assert.equal((await account(q,buyer,{op:'buy',number:'1234567'},1000,json,undefined,true)).status,403);
  const tx='b'.repeat(64);purchase('native:pi:order',20,tx);purchase('native:pi:order',20,tx);
  assert.equal(await balance(),20);
  assert.deepEqual((await shortAccount(q,buyer,{op:'shortGiftBalance',clip},json,true,true)).body,{clip,diamonds:20});
  sql.prepare('INSERT INTO diamond_purchase VALUES(?,?,?,?)').run('host-pi',host,10,'f'.repeat(64));
  const selfGift={recipient:host,gift:'وردة حمراء',cost:10,nonce:crypto.randomUUID()};
  assert.equal((await roomAction(host,'giftRecipient',{recipient:host})).body.senderDiamonds,10);
  for(let i=0;i<2;i++)assert.equal((await roomAction(host,'paidGift',selfGift)).body.receipt.recipient,host);
  assert.equal((await roomAction(host,'paidGift',{...selfGift,nonce:crypto.randomUUID()})).status,409);
  assert.equal((await roomAction(buyer,'giftRecipient',{recipient:host})).body.senderDiamonds,20);
  assert.equal((await sendRoom(failedNonce)).status,200);assert.equal((await sendRoom(failedNonce)).status,200);
  const same=crypto.randomUUID();await Promise.all([clipGift(same),clipGift(same)]);
  assert.equal(await balance(),0);
  assert.equal((await clipGift(crypto.randomUUID())).status,409);
  purchase('web-pi',10,'c'.repeat(64));
  assert.equal((await sendRoom(crypto.randomUUID(),false)).status,200);
  assert.equal(await balance(),0);assert.equal(await balance(false),80);
  sql.exec('INSERT OR IGNORE INTO pi_funds_migration(version) VALUES(1)');
  assert.deepEqual((await readWallet(q,buyer,undefined,true)).purchases.map(p=>p.payment),['web-pi','native:pi:order','historic-pi']);
  assert.equal((await readWallet(q,host)).receivedDiamonds,80);
  purchase('last-pi',20,'d'.repeat(64));
  sql.prepare('INSERT INTO native_purchase_reversal VALUES(?,?)').run('store:PLAY_STORE:historical',100);
  assert.equal(await balance(),0);
});

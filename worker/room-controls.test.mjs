import {piGifts} from './pi-gifts.mjs';
import {readWallet} from './diamond-wallet.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {account,price} from './identity.mjs';
import {roomStore,roomControls} from './room-controls.mjs';

test('audio seating, moderation, PIN, chat and visit expiry', async t=>{
  const sql=new DatabaseSync(':memory:');
  // Exercise the same SQL and parameter binding as D1, including its change count.
  const db={prepare(query){return {bind(...args){return {
    run:()=>({meta:sql.prepare(query).run(...args)}),
    all:()=>({results:sql.prepare(query).all(...args)}),
    first:()=>sql.prepare(query).get(...args)
  }},query}},batch(statements){return Promise.resolve(statements.map(statement=>statement.all?statement.all():sql.exec(statement.query)))}};
  const visits=new Map(), kicks=[];
  const call=async(user,op,extra={},path='/room-control',room='test',ownerUid='host')=>{
    if(!visits.has(user))visits.set(user,crypto.randomUUID());
    const result=await roomControls({env:{PI_GIFTS_DB:db,LIVEKIT_API_SECRET:'fixture',CLIPI_OWNER_UID:'host'},room,user,ownerUid,host:user===ownerUid,type:'audio',path,
      input:{name:user,op,session:visits.get(user),...extra},json:(body,status=200)=>({status,...body}),disconnect:async uid=>kicks.push(uid)});
    return result;
  };
  await t.test('moves preserve occupancy, microphone permissions and gifts including the main mic',async()=>{
    const room='moving-mics',host='owner',guest='speaker',other='listener';
    const act=(uid,op,args={},path='/room-control')=>call(uid,op,args,path,room,host);
    const seat=(state,uid)=>state.people.find(p=>p.uid===uid).seat;
    const publisher=async uid=>(await act(uid,'token',{},'/token')).publisher;
    await act(host,'join');
    await act(guest,'join');
    await act(other,'join');
    assert.equal((await act(guest,'move',{slot:0})).status,409);
    assert.equal(seat(await act(host,'move',{slot:3}),host),3);
    assert.equal(seat(await act(guest,'move',{slot:0}),guest),9);
    assert.equal((await act(host,'move',{slot:0})).status,409);
    assert.equal(seat(await act(host,'poll'),host),3);
    assert.equal(await publisher(guest),true);
    assert.equal((await act(other,'giftRecipient',{recipient:guest})).recipient.uid,guest);
    const [one,two]=await Promise.all([act(guest,'move',{slot:8}),act(other,'move',{slot:8})]);
    assert.deepEqual([one.status,two.status].sort(),[200,409]);
    const current=await act(host,'poll');
    assert.equal(current.people.filter(p=>p.seat===8).length,1);
    const target=current.people.find(p=>p.seat===8).uid;
    await act(host,'mute',{uid:target});
    assert.equal(seat(await act(target,'move',{slot:2}),target),2);
    assert.equal(await publisher(target),false);
    await act(host,'unmute',{uid:target});
    assert.equal(await publisher(target),true);
    assert.equal((await act(target,'eject',{uid:host})).status,403);
    await act(host,'slot',{slot:8,locked:true});
    assert.equal((await act(host,'move',{slot:8})).status,409);
    assert.equal((await act(target,'move',{slot:8})).status,409);
    assert.equal(seat(await act(target,'poll'),target),2);
    await act(host,'demote',{uid:target});
    assert.equal((await act(other===target?guest:other,'giftRecipient',{recipient:target})).status,409);
    await act(host,'settings',{locked:true});
    assert.equal(seat(await act(host,'poll'),host),3);
    assert.equal((await act(guest,'move',{slot:1})).status,409);
    await act(guest,'request');
    assert.equal(seat(await act(host,'approve',{uid:guest,slot:0}),guest),9);
    await act(host,'stepDown');
    assert.equal(await publisher(host),false);
    assert.equal((await act(other,'giftRecipient',{recipient:host})).status,409);
    await act(host,'settings',{locked:false});
    visits.delete(host);
    assert.equal(seat(await act(host,'join'),host),-1);
    assert.equal(seat(await act(guest,'poll'),guest),9);
    assert.equal((await act(host,'move',{slot:0})).status,409);
    await act(host,'slot',{slot:0,locked:true});
    assert.equal(await publisher(guest),false);
    assert.equal((await act(host,'move',{slot:0})).status,409);
    await act(host,'slot',{slot:0,locked:false});
    assert.equal(seat(await act(host,'move',{slot:0}),host),9);
    await act(host,'slot',{slot:0,locked:true});
    assert.equal(await publisher(host),false);
  });
  kicks.length=0;
  assert.equal((await call('ghost-guest','join')).status,404);
  await call('host','join');
  for(const theme of ['palace','upload','default']){
    const image=theme==='upload'?'data:image/jpeg;base64,/9j/AAAA':null;
    const selected=await call('host','settings',{theme,image});
    const id='restored-'+theme;
    const restored=await call('host','join',{},'/room-control',id);
    assert.equal(restored.theme,selected.theme);
    assert.equal(sql.prepare('SELECT image FROM room_theme WHERE room=?').get(id).image,image);
    assert.equal((await call('another','join',{},'/room-control','another-room','another')).theme,'default');
  }
  for(let slot=1;slot<=8;slot++){
    const uid='speaker-'+slot;
    await call(uid,'join');
    const state=await call(uid,'request',{slot});
    assert.equal(state.people.find(p=>p.uid===uid).seat,slot);
    await call('host','mute',{uid});
    assert.equal((await call(uid,'token',{},'/token')).publisher,false);
    await call('host','unmute',{uid});
    assert.equal((await call(uid,'token',{},'/token')).publisher,true);
    await call('host','demote',{uid});
    assert.equal((await call(uid,'poll')).people.find(p=>p.uid===uid).seat,0);
    await call(uid,'request',{slot});
    assert.ok((await call('host','slot',{slot,locked:true})).lockedSlots.includes(slot));
    assert.equal((await call(uid,'request',{slot})).people.find(p=>p.uid===uid).seat,0);
    await call('host','slot',{slot,locked:false});
    await call(uid,'request',{slot});
    await call('host','eject',{uid});
    assert.equal((await call(uid,'poll')).status,403);
  }
  const audience=await call('temporary','join');
  assert.equal(audience.people.find(p=>p.uid==='temporary').seat,0);
  const temporary=await call('temporary','request',{slot:3});
  const temporarySlot=temporary.people.find(p=>p.uid==='temporary').seat;
  assert.equal((await call('temporary','slot',{slot:temporarySlot,locked:true})).status,403);
  const locked=await call('host','slot',{slot:temporarySlot,locked:true,uid:'temporary'});
  assert.deepEqual(locked.lockedSlots,[temporarySlot]);
  assert.equal(locked.people.find(p=>p.uid==='temporary').seat,0);
  await call('other','join');
  const other=await call('other','request',{slot:temporarySlot});
  assert.equal(other.people.find(p=>p.uid==='other').waiting,1);
  assert.notEqual(other.people.find(p=>p.uid==='other').seat,temporarySlot);
  await call('host','eject',{uid:'other'});
  assert.equal((await call('other','poll')).status,403);
  assert.equal((await call('other','join')).status,200);
  await call('host','ban',{uid:'other'});
  assert.equal((await call('other','join')).status,403);
  await call('host','slot',{slot:temporarySlot,locked:false});
  await call('temporary','leave');
  kicks.length=0;
  await call('first','join',{frame:true,ride:true});
  const data=await call('first','request',{slot:1});
  assert.equal(data.supportBalance,0);
  const gift={recipient:'host',cost:10,gift:'وردة حمراء',nonce:crypto.randomUUID()};
  for(const op of ['supportGift','catalogGift'])assert.equal((await call('first',op,gift)).status,409);
  assert.equal(sql.prepare('SELECT count(*) AS n FROM paid_room_gift').get().n,0);
  assert.equal(data.chatRevision,0);
  assert.equal((await call('first','message',{text:' '})).status,400);
  const note=await call('first','message',{text:'test note'});
  assert.equal(note.chatRevision,1);
  assert.equal((await call('host','poll')).chatRevision,1);
  await call('host','deleteMessage',{id:note.chat.at(-1).id});
  assert.equal(data.people.find(p=>p.uid==='first').seat,1);
  assert.equal((await call('first','token',{},'/token')).publisher,true);
  assert.equal((await call('first','settings',{locked:true})).status,403);
  const secured=await call('host','settings',{locked:true,pin:'0123'});
  assert.equal(secured.locked,true);
  assert.equal(secured.protected,true);
  assert.equal(secured.people.find(p=>p.uid==='first').seat,0);
  assert.equal((await call('first','token',{},'/token')).publisher,false);
  assert.deepEqual(kicks,['first']);
  kicks.length=0;
  assert.equal((await call('guest','token',{session:undefined},'/token')).status,403);
  assert.equal((await call('guest','join')).pinRequired,true);
  assert.equal((await call('guest','join',{pin:'0124'})).status,403);
  assert.equal((await call('guest','token',{},'/token')).status,403);
  assert.equal((await call('guest','join',{pin:'0123'})).people.find(p=>p.uid==='guest').seat,0);
  assert.equal((await call('guest','poll',{session:crypto.randomUUID()})).status,403);
  const queued=await call('guest','request',{slot:8});
  assert.equal(queued.people.find(p=>p.uid==='guest').seat,0);
  assert.equal(queued.people.find(p=>p.uid==='guest').waiting,1);
  assert.equal((await call('guest','token',{},'/token')).publisher,false);
  await call('host','approve',{uid:'guest'});
  assert.equal((await call('guest','token',{},'/token')).publisher,true);
  await call('host','settings',{locked:true});
  assert.equal((await call('guest','token',{},'/token')).publisher,true);
  await call('host','mute',{uid:'guest'});
  assert.equal((await call('guest','token',{},'/token')).publisher,false);
  await call('host','unmute',{uid:'guest'});
  await call('host','demote',{uid:'guest'});
  assert.equal((await call('guest','token',{},'/token')).publisher,false);
  assert.equal((await call('guest','message',{text:'مرحبا'})).chat[0].text,'مرحبا');
  await call('host','kick',{uid:'guest'});
  assert.deepEqual(kicks,['guest','guest','guest']);
  assert.equal((await call('guest','join',{pin:'0123'})).status,403);
  await call('returning','join',{pin:'0123'});
  await call('returning','leave');
  visits.delete('returning');
  assert.equal((await call('returning','join')).pinRequired,true);
  assert.equal((await call('returning','join',{pin:'0123'})).status,200);
  for(let i=0;i<6;i++){
    await call('returning','leave');
    assert.equal((await call('returning','join',{pin:'0123'})).status,200);
  }
  for(let i=0;i<5;i++)assert.equal((await call('wrong-code','join',{pin:'0000'})).status,403);
  assert.equal((await call('wrong-code','join',{pin:'0000'})).status,429);
  assert.equal((await call('host','settings',{locked:false,pin:''})).locked,false);
  await call('first','request',{slot:1});
  const picked=await call('returning','request',{slot:8});
  assert.equal(picked.people.find(p=>p.uid==='returning').seat,8);
  await call('returning','leave');
  for(let i=0;i<12;i++){
    await call('u'+i,'join');
    await call('u'+i,'request',{slot:2+i%7});
  }
  const full=await call('host','poll');
  assert.equal(full.people.filter(p=>p.seat).length,8);
  await call('first','leave');
  await call('u11','request');
  assert.equal((await call('u11','token',{},'/token')).publisher,false);
  await call('host','approve',{uid:'u11'});
  assert.equal((await call('u11','token',{},'/token')).publisher,true);
  sql.prepare('UPDATE room_member SET seen=0 WHERE uid=?').run('u11');
  assert.equal((await call('u11','token',{},'/token')).status,403);
  const q=await roomStore(db);
  const buyer='pi:buyer';
  await call(buyer,'join');
  // A real payment is never submitted by this fixture.
  const txid='a'.repeat(64), id='test-pack';
  const dto={identifier:id,user_uid:'buyer',direction:'user_to_app',network:'Pi Network',amount:50,metadata:{kind:'diamond_pack',diamonds:500,uid:buyer},status:{developer_approved:true,developer_completed:true,transaction_verified:true},transaction:{txid}};
  const originalFetch=globalThis.fetch;
  try{
    let currentBuyer='buyer';
    globalThis.fetch=async url=>Response.json(url.endsWith('/me')?{uid:currentBuyer}:dto);
    const complete=(action='complete')=>piGifts(new Request('https://example.test/pi-gifts/'+action,{method:'POST',body:JSON.stringify({kind:'diamond_pack',paymentId:id,accessToken:'mock',txid:action==='complete'?txid:undefined})}),{PI_GIFTS_NETWORK:'mainnet',PI_NETWORK_API_KEY:'mock',PI_GIFTS_DB:db},(body,status=200)=>({status,...body}));
    currentBuyer='someone-else';
    assert.equal((await complete('approve')).status,403);
    assert.equal((await readWallet(q,'pi:someone-else')).diamonds,0);
    currentBuyer='buyer';
    const direct=await piGifts(new Request('https://example.test/pi-gifts/approve',{method:'POST',body:JSON.stringify({paymentId:id})}),{PI_GIFTS_NETWORK:'mainnet',PI_NETWORK_API_KEY:'mock',PI_GIFTS_DB:db},(body,status=200)=>({status,...body}));
    assert.equal(direct.status,409);
    dto.amount=1;assert.equal((await complete()).status,403);
    dto.amount=50;
    assert.equal((await complete('approve')).approved,true);
    assert.equal((await readWallet(q,buyer)).pending.length,1);
    dto.transaction={};
    assert.equal((await complete('restore')).status,409);
    dto.transaction={txid};
    assert.equal((await complete('restore')).completed,true);
    assert.equal((await complete('restore')).completed,true);
    assert.equal((await readWallet(q,buyer)).pending.length,0);
    assert.equal((await readWallet(q,buyer)).purchases.length,1);
    assert.equal((await complete()).completed,true);
  }finally{globalThis.fetch=originalFetch}
  assert.equal((await readWallet(q,buyer)).diamonds,500);
  const support={gift:'خاتم',cost:500,nonce:crypto.randomUUID()};
  assert.equal((await call(buyer,'paidGift',support)).status,200);
  assert.equal((await call(buyer,'paidGift',support)).status,200);
  assert.equal((await readWallet(q,buyer)).diamonds,0);
  const hostWallet=await readWallet(q,'host');
  assert.equal(hostWallet.rewardPi,0);
  assert.equal(hostWallet.progress,500);
  sql.prepare("INSERT INTO paid_room_gift VALUES('older','old','oldroom','host','old',500,5)").run();
  sql.prepare("INSERT INTO paid_room_gift VALUES('other','next','otherroom','host','new',19500,0)").run();
  const cumulative=await readWallet(q,'host');
  assert.equal(cumulative.rewardPi,10);
  assert.equal(cumulative.progress,0);
  assert.equal(cumulative.earningsUnits/20,0.25);
  assert.equal(hostWallet.history.length,1);
  const second='pi:second-buyer';
  await call(second,'join');
  sql.prepare('INSERT INTO diamond_purchase VALUES(?,?,?,?)').run('second-pack',second,1000,'second-tx');
  assert.equal((await call(second,'paidGift',{gift:'وردة حمراء',cost:10,nonce:crypto.randomUUID()})).status,200);
  assert.equal((await readWallet(q,second,'host')).diamonds,990);
  assert.equal((await readWallet(q,second,'host')).ownerBox,undefined);
  await call('u0','join',{avatar:'🦊'});
  const revisionBeforeGift=(await call(second,'poll')).chatRevision;
  const target=await call(second,'giftRecipient',{recipient:'u0'});
  assert.equal(target.recipient.avatar,'🦊');
  assert.equal(target.senderDiamonds,990);
  const routed={gift:'وردة حمراء',cost:10,recipient:'u0',nonce:crypto.randomUUID()};
  const credited=await call(second,'paidGift',routed);
  assert.equal(credited.status,200);
  assert.equal((await call(second,'poll')).chatRevision,revisionBeforeGift);
  assert.deepEqual(credited.receipt,{nonce:routed.nonce,recipient:routed.recipient,gift:routed.gift,diamonds:routed.cost});
  assert.deepEqual((await call(second,'paidGift',routed)).receipt,credited.receipt);
  assert.equal((await call(second,'paidGift',{...routed,recipient:'host'})).status,409);
  assert.equal((await readWallet(q,second)).diamonds,980);
  assert.equal((await readWallet(q,'u0')).progress,10);
  await call('host','demote',{uid:'u0'});
  assert.equal((await call(second,'paidGift',{...routed,nonce:crypto.randomUUID()})).status,409);
  const ownerWallet=await readWallet(q,'host','host');
  assert.equal(ownerWallet.progress,10);
  assert.equal(ownerWallet.receivedDiamonds,20510);
  assert.equal(ownerWallet.ownerBox.sold,1500);
  assert.equal((await readWallet(q,buyer)).diamonds,0);
  assert.equal((await call(buyer,'paidGift',{...support,nonce:crypto.randomUUID()})).status,409);
  const giftRoom=(uid,op,extra={})=>call(uid,op,extra,'/room-control','nine-gifts','gift-host');
  const photo='data:image/jpeg;base64,/9j/AAAA';
  await giftRoom('gift-host','join',{avatar:photo});
  await giftRoom(second,'join');
  for(let seat=0;seat<=8;seat++){
    const recipient=seat?'gift-seat-'+seat:'gift-host';
    if(seat){
      await giftRoom(recipient,'join',{avatar:photo});
      await giftRoom(recipient,'request',{slot:seat});
    }
    assert.equal((await giftRoom(second,'giftRecipient',{recipient})).recipient.avatar,photo);
    const transaction={recipient,gift:'وردة حمراء',cost:10,nonce:crypto.randomUUID()};
    const sent=await giftRoom(second,'paidGift',transaction);
    assert.equal(sent.receipt.recipient,recipient);
    assert.deepEqual((await giftRoom(second,'paidGift',transaction)).receipt,sent.receipt);
    assert.equal((await readWallet(q,recipient)).progress,10);
  }
  assert.equal((await readWallet(q,second)).diamonds,890);
  assert.equal((await readWallet(q,'host')).receivedDiamonds,ownerWallet.receivedDiamonds);
  const numbers=(uid,op,number)=>account(q,uid,{op,number},100,(data,status=200)=>({...data,status}));
  const standard=await numbers('buyer','read');
  assert.match(standard.number,/^[1-9]\d{6}$/);
  assert.equal((await numbers('buyer','read')).number,standard.number);
  assert.equal((await numbers('buyer','buy','777')).status,409);
  const purchased=await numbers('buyer','buy','1122334');
  assert.equal(purchased.number,'1122334');
  assert.equal(purchased.balance,100-price('1122334'));
  assert.equal((await numbers('buyer','buy','1122334')).balance,purchased.balance);
  assert.equal((await numbers('second','buy','1122334')).status,409);
  assert.equal((await numbers('buyer','equip',standard.number)).number,standard.number);
  assert.equal((await call('first','settings',{theme:'palace'})).status,403);
  assert.equal((await call('host','settings',{theme:'palace'})).theme,'palace');
  assert.equal((await call('u1','poll')).theme,'palace');

  await t.test('a verified pack funds gifts at face value across reward milestones',async()=>{
    const uid='pi:pack-buyer',recipient='gift-seat-8';
    const txid='b'.repeat(64),paymentId='target-test-pack';
    const payment={
      identifier:paymentId,user_uid:'pack-buyer',direction:'user_to_app',network:'Pi Network',amount:16,
      metadata:{kind:'diamond_pack',uid,diamonds:16000,rate:1000},transaction:{txid},
      status:{developer_approved:true,developer_completed:true,transaction_verified:true}
    };
    const fetchBeforePack=globalThis.fetch;
    try{
      globalThis.fetch=async url=>Response.json(url.endsWith('/me')?{uid:'pack-buyer'}:payment);
      const complete=()=>piGifts(new Request('https://example.test/pi-gifts/complete',{method:'POST',
        body:JSON.stringify({kind:'diamond_pack',paymentId,txid,accessToken:'fixture'})}),
        {PI_GIFTS_NETWORK:'mainnet',PI_NETWORK_API_KEY:'fixture',PI_GIFTS_DB:db},(body,status=200)=>({status,...body}));
      assert.equal((await complete()).completed,true);
      assert.equal((await complete()).completed,true);
    }finally{globalThis.fetch=fetchBeforePack}
    assert.equal((await giftRoom(uid,'join')).supportBalance,16000);
    const before=await readWallet(q,recipient);
    assert.equal(before.receivedDiamonds,10);
    for(const [gift,cost,remaining,total,progress] of [
      ['مروحية الماس',9990,6010,10000,0],['خاتم',500,5510,10500,500]
    ]){
      const payload={recipient,gift,cost,nonce:crypto.randomUUID()};
      const result=await giftRoom(uid,'paidGift',payload);
      assert.equal(result.receipt.diamonds,cost);
      assert.equal(result.senderDiamonds,remaining);
      assert.deepEqual(await giftRoom(uid,'paidGift',payload),result);
      assert.equal((await numbers(uid,'read')).purchasedDiamonds,remaining);
      assert.equal((await giftRoom(uid,'giftRecipient',{recipient})).senderDiamonds,remaining);
      assert.equal((await readWallet(q,uid)).diamonds,remaining);
      const credited=await readWallet(q,recipient);
      assert.equal(credited.receivedDiamonds,total);
      assert.equal(credited.progress,progress);
      assert.equal(credited.rewardPi,5);
      assert.equal(credited.diamonds,before.diamonds);
    }
    assert.equal((await readWallet(q,'gift-host')).receivedDiamonds,10);
    assert.equal((await readWallet(q,second)).diamonds,890);
  });
});

test('current and previous Pi pack receipts',async()=>{
  const {packs,validPack}=await import('./diamond-wallet.mjs');
  for(const diamonds of packs)assert.equal(validPack({rate:1000,diamonds},diamonds/1000,false),true);
  assert.equal(validPack({diamonds:1000},100,false),false);
  assert.equal(validPack({diamonds:1000},100,true),true);
  assert.equal(validPack({rate:1000,diamonds:100000},1,true),false);
});

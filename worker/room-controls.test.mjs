import {piGifts} from './pi-gifts.mjs';
import {readWallet} from './diamond-wallet.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {account,price} from './identity.mjs';
import {roomStore,roomControls} from './room-controls.mjs';

test('audio seating, moderation, PIN, chat and visit expiry', async()=>{
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
  assert.equal(data.supportBalance,100);
  assert.equal((await call('host','poll')).supportBalance,100000100);
  const gift={recipient:'host',cost:100,nonce:crypto.randomUUID()};
  assert.equal((await call('first','supportGift',gift)).supportBalance,0);
  assert.equal((await call('first','supportGift',gift)).supportBalance,0);
  assert.equal((await call('first','supportGift',{...gift,nonce:crypto.randomUUID()})).status,409);
  assert.equal((await call('host','poll')).supportBalance,100000100);
  assert.equal(sql.prepare('SELECT count(*) AS n FROM support_gift').get().n,1);
  const rose={recipient:'first',cost:10,gift:'وردة حمراء',nonce:crypto.randomUUID()};
  assert.equal((await call('host','catalogGift',{...rose,cost:1})).status,400);
  const preview=await call('host','catalogGift',{...rose,recipient:'host'});
  assert.equal(preview.preview,true);
  assert.equal(sql.prepare('SELECT count(*) AS n FROM diamond_gift').get().n,0);
  assert.equal((await call('host','poll')).supportBalance,100000100);
  const sent=await call('host','catalogGift',rose);
  assert.match(sent.chat.at(-1).text,/وردة حمراء/);
  assert.equal(sent.supportBalance,100000090);
  assert.equal((await call('host','catalogGift',rose)).supportBalance,sent.supportBalance);
  assert.equal((await call('first','catalogGift',{...rose,recipient:'host'})).status,409);
  await call('host','deleteMessage',{id:sent.chat.at(-1).id});
  await call('host','deleteMessage',{id:1});
  assert.equal(data.people.find(p=>p.uid==='first').seat,1);
  assert.equal((await call('first','token',{},'/token')).publisher,true);
  assert.equal((await call('first','settings',{locked:true})).status,403);
  await call('host','settings',{locked:true,pin:'0123'});
  assert.equal((await call('guest','join')).pinRequired,true);
  assert.equal((await call('guest','join',{pin:'0124'})).status,403);
  assert.equal((await call('guest','token',{},'/token')).status,403);
  assert.equal((await call('guest','join',{pin:'0123'})).people.find(p=>p.uid==='guest').seat,0);
  assert.equal((await call('guest','poll',{session:crypto.randomUUID()})).status,403);
  await call('guest','request'); await call('host','approve',{uid:'guest'});
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
  await call('host','settings',{locked:false,pin:''});
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
  const ownerWallet=await readWallet(q,'host','host');
  assert.equal(ownerWallet.progress,10);
  assert.equal(ownerWallet.receivedDiamonds,20510);
  assert.equal(ownerWallet.ownerBox.sold,1500);
  assert.equal((await readWallet(q,buyer)).diamonds,0);
  assert.equal((await call(buyer,'paidGift',{...support,nonce:crypto.randomUUID()})).status,409);
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

});

test('current and previous Pi pack receipts',async()=>{
  const {packs,validPack}=await import('./diamond-wallet.mjs');
  for(const diamonds of packs)assert.equal(validPack({rate:1000,diamonds},diamonds/1000,false),true);
  assert.equal(validPack({diamonds:1000},100,false),false);
  assert.equal(validPack({diamonds:1000},100,true),true);
  assert.equal(validPack({rate:1000,diamonds:100000},1,true),false);
});

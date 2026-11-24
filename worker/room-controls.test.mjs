import {invitationInbox} from './broadcast-access.mjs';
import {reserveBroadcast} from './room-history.mjs';
import {supportCase} from './support-case.mjs';
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
  const call=async(user,op,extra={},path='/room-control',room='test',ownerUid='host',type='audio')=>{
    if(!visits.has(user))visits.set(user,crypto.randomUUID());
    const result=await roomControls({env:{PI_GIFTS_DB:db,LIVEKIT_API_SECRET:'fixture',CLIPI_OWNER_UID:'host'},room,user,ownerUid,host:user===ownerUid,type,path,
      input:{name:user,op,session:visits.get(user),...extra},json:(body,status=200)=>({status,...body}),disconnect:async uid=>kicks.push(uid)});
    return result;
  };
  for(const type of ['audio','video']){
    await t.test(type+' room admins manage the room, while host and unrelated rooms stay protected',async t=>{
      const q=await roomStore(db),room='role-'+type,owner='role-owner',admin='room-manager',guest='role-listener';
      sql.exec('SAVEPOINT room_roles');t.after(()=>sql.exec('ROLLBACK TO room_roles; RELEASE room_roles'));
      const act=(uid,op,extra={},id=room)=>call(uid,op,extra,'/room-control',id,owner,type);
      for(const uid of [owner,admin,guest])await act(uid,'join');
      for(const [a,b] of [[owner,admin],[admin,owner],[admin,guest],[guest,admin]])await q('INSERT OR IGNORE INTO short_follow VALUES(?,?)',a,b).run();
      assert.equal((await act(guest,'setRoomAdmin',{uid:guest,enabled:true})).status,403);
      assert.equal((await act(owner,'setRoomAdmin',{uid:guest,enabled:true})).status,403);
      assert.equal((await act(owner,'setRoomAdmin',{uid:admin,enabled:true})).ok,true);
      assert.deepEqual((await act(owner,'roomAdmins')).admins.map(v=>v.uid),[admin]);
      assert.equal((await act(admin,'settings',{words:['filter'],slow:5,pin:'1234',theme:'dunes'})).theme,'dunes');
      assert.deepEqual((await act(admin,'poll')).words,['filter']);
      assert.equal((await act(guest,'poll')).words,undefined);
      assert.equal((await act(admin,'inviteFriends',{uids:[guest]})).sent,1);
      assert.equal((await act(admin,'setRoomAdmin',{uid:owner,enabled:false})).status,400);
      const post=(await act(owner,'message',{text:'filter'})).chat.at(-1);
      assert.equal((await act(admin,'deleteMessage',{id:post.id})).status,403);
      assert.equal((await act(admin,'pinMessage',{id:post.id})).status,403);
      const other=(await act(guest,'message',{text:'ordinary comment'})).chat.at(-1);
      assert.equal((await act(admin,'pinMessage',{id:other.id})).pinned.id,other.id);
      assert.equal((await act(admin,'deleteMessage',{id:other.id})).chat.some(v=>v.id===other.id),false);
      for(const op of ['mute','kick','eject','demote','ban'])assert.equal((await act(admin,op,{uid:owner})).status,403);
      if(type==='audio'){
        for(const slot of [0,4]){
          if(slot)await act(owner,'move',{slot});
          assert.equal((await act(admin,'slot',{slot,locked:true})).status,403);
          assert.equal((await act(owner,'poll')).lockedSlots.includes(slot),false);
        }
        assert.equal((await act(admin,'slot',{slot:2,locked:true})).lockedSlots.includes(2),true);
        assert.equal((await act(admin,'settings',{micFree:false,locked:true})).micFree,false);
        assert.equal((await act(owner,'poll')).people.find(row=>row.uid===owner).seat,4);
      }
      const unrelated=room+'-other';await act(owner,'join',{},unrelated);await act(admin,'join',{},unrelated);
      assert.equal((await act(admin,'settings',{slow:0},unrelated)).status,403);
      await act(owner,'setRoomAdmin',{uid:admin,enabled:false});
      assert.equal((await act(admin,'settings',{slow:0})).status,403);
    });
  }
  await t.test('reopening a broadcast keeps its ledger, donors and mic permissions independent of new rooms',async t=>{
    const q=await roomStore(db);
    sql.exec('SAVEPOINT room_history');
    t.after(()=>sql.exec('ROLLBACK TO room_history; RELEASE room_history'));
    const root='original-room',separate='another-room',owner='walid';
    const act=(room,uid,op,input={})=>call(uid,op,input,'/room-control',room,owner);
    const total=async room=>(await act(room,owner,'hostCard',{roomTotal:true})).roomTotal;
    const gift=sql.prepare('INSERT OR IGNORE INTO paid_room_gift VALUES(?,?,?,?,?,?,0)');
    await act(root,owner,'join');
    await act(root,'alice','join',{name:'Alice'});
    await act(root,'bob','join',{name:'Bob'});
    await act(root,owner,'settings',{pin:'2468',locked:true});
    assert.equal(await total(root),0);
    gift.run('alice','g1',root,owner,'rose',650);
    gift.run('bob','g2',root,'alice','rose',100);
    await act(root,'alice','leave');await act(root,'bob','leave');
    assert.equal(await total(root),750);
    await act(root,owner,'leave');
    const next=await reserveBroadcast(q,root,owner);
    assert.equal(await reserveBroadcast(q,root,owner),next);
    await act(next,owner,'join');
    assert.equal(await total(next),750);
    assert.equal((await act(next,'bob','join')).status,403);
    assert.equal((await act(next,'bob','join',{pin:'2468',name:'Bob'})).locked,true);
    gift.run('bob','g3',next,owner,'rose',50);
    gift.run('bob','g3',next,owner,'rose',50);
    assert.equal(await total(next),800);
    assert.deepEqual((await act(next,owner,'hostCard',{supporters:true})).supporters.people.map(p=>p.name),['Alice','Bob']);
    const third=await reserveBroadcast(q,next,owner);
    await act(third,owner,'join');
    assert.equal(await total(third),800);
    await act(separate,owner,'join');
    assert.equal(await total(separate),0);
    assert.deepEqual((await act(separate,owner,'hostCard',{supporters:true})).supporters.people,[]);
    for(let i=0;i<45;i++)gift.run('donor'+String(i).padStart(2,'0'),'x',third,owner,'rose',10);
    const page=async after=>(await act(third,owner,'hostCard',{supporters:true,after})).supporters;
    const first=await page(''),second=await page(first.next);
    assert.equal(first.people.length,40);
    assert.equal(second.next,null);
    assert.equal(new Set([...first.people,...second.people].map(p=>p.uid)).size,47);
    assert.equal((await act(third,'stranger','hostCard',{supporters:true})).status,403);
  });
  await t.test('host cards separate room totals from lifetime received and sent diamonds',async t=>{
    await roomStore(db);
    sql.exec('SAVEPOINT host_card');
    t.after(()=>sql.exec('ROLLBACK TO host_card; RELEASE host_card'));
    const owner='card-owner',viewer='card-guest',room='card-audio';
    const action=(uid,op,extra={})=>call(uid,op,extra,'/room-control',room,owner);
    await action(owner,'join',{avatar:'🌸'});
    assert.equal((await action(viewer,'hostCard',{details:true})).status,403);
    await action(viewer,'join');
    assert.deepEqual(await action(viewer,'hostCard',{includeAvatar:true}),{status:200,avatar:'🌸'});
    const read=async()=>({...((await action(viewer,'hostCard',{details:true,ownerUid:viewer})).totals)});
    assert.deepEqual(await read(),{room:0,received:0,sent:0});
    const paid=sql.prepare('INSERT OR IGNORE INTO paid_room_gift VALUES(?,?,?,?,?,?,0)');
    paid.run(viewer,'a',room,owner,'gift',950);
    paid.run(viewer,'a',room,owner,'gift',950);
    paid.run('donor','a',room,viewer,'gift',1500);
    paid.run(owner,'b',room,viewer,'gift',350);
    paid.run(owner,'c','card-video',viewer,'gift',2000);
    paid.run(owner,'d','short/clip','','gift',500);
    paid.run('donor','b','card-video',owner,'gift',50);
    // Restored duplicate receipts retain the current ledger value.
    const old=sql.prepare('INSERT INTO diamond_gift VALUES(?,?,?,?,?,?)');
    old.run(viewer,'a',room,owner,'gift',950);
    old.run('legacy','e',room,owner,'gift',100);
    const support=sql.prepare('INSERT INTO support_gift VALUES(?,?,?,?,?)');
    support.run('legacy','e',room,owner,100);
    support.run('legacy','f',room,owner,50);
    assert.deepEqual(await read(),{room:2950,received:1150,sent:2350});
    await action(owner,'stepDown');
    assert.deepEqual(await read(),{room:2950,received:1150,sent:2350});
    assert.equal((await action(viewer,'hostCard',{session:crypto.randomUUID(),details:true})).status,403);
  });
  await t.test('room chat settings, word filtering and pinned deletion persist across sessions',async()=>{
    const room='audit-room',owner='audit-host',viewer='audit-viewer';
    const action=(uid,op,extra={})=>call(uid,op,extra,'/room-control',room,owner);
    await action(owner,'join');await action(viewer,'join');
    assert.equal((await action(viewer,'settings',{slow:5})).status,403);
    await action(owner,'settings',{slow:15,words:['blocked']});
    const state=await action(viewer,'poll');
    assert.equal(state.slow,15);
    assert.equal(state.words,undefined);
    assert.equal((await action(viewer,'message',{text:'BLOCKED phrase'})).status,422);
    const twins=await Promise.all(['hello','again'].map(text=>action(viewer,'message',{text})));
    assert.deepEqual(twins.map(r=>r.status).sort(),[200,429]);
    const first=twins.find(r=>r.status===200).chat[0];
    assert.equal((await action(viewer,'pinMessage',{id:first.id})).status,403);
    await action(owner,'pinMessage',{id:first.id});
    assert.equal((await action(viewer,'poll')).pinned.id,first.id);
    await action(viewer,'deleteMessage',{id:first.id});
    await action(owner,'message',{text:'welcome'});
    assert.equal((await action(owner,'poll')).pinned,null);
    assert.equal((await action(owner,'poll')).chatRevision,2);
    await action(owner,'settings',{slow:0,words:[]});
    assert.equal((await action(viewer,'message',{text:'blocked'})).status,200);
  });
  await t.test('support cases are scoped, retryable and visible to the operator',async()=>{
    const q=await roomStore(db);
    const run=(uid,input)=>supportCase(q,uid,'operator',input,(body,status=200)=>({...body,status}));
    const req={op:'caseCreate',kind:'purchase',detail:'Unexpected amount',subject:'receipt-123',id:crypto.randomUUID()};
    const r=await run('requester',req);
    assert.equal(r.id,req.id);
    assert.equal((await run('requester',req)).id,r.id);
    assert.equal((await run('other',{op:'caseList'})).cases.length,0);
    assert.equal((await run('other',{op:'caseQueue'})).status,403);
    assert.equal((await run('other',{op:'caseReviewed',id:r.id})).status,403);
    assert.equal((await run('operator',{op:'caseQueue'})).cases[0].subject,'receipt-123');
    await run('operator',{op:'caseReviewed',id:r.id});
    assert.equal((await run('requester',{op:'caseList'})).cases[0].state,'reviewed');
    const deletion={...req,id:crypto.randomUUID(),kind:'deletion'};
    const [a,b]=await Promise.all([run('requester',deletion),run('requester',{...deletion,id:crypto.randomUUID()})]);
    assert.equal(a.id,b.id);
    await run('operator',{op:'caseReviewed',id:a.id});
    assert.equal((await run('requester',{op:'caseList'})).deletion,a.id);
  });
  for(const type of ['audio','video']){
    await t.test(type+' gifts go to the chosen listener or default host exactly once',async t=>{
      sql.exec('SAVEPOINT gift_recipient');
      t.after(()=>sql.exec('ROLLBACK TO gift_recipient; RELEASE gift_recipient'));
      const host=type+'-gifter-host',sender=type+'-sender',listener=type+'-audience';
      const room=type+'-gift-room',q=await roomStore(db);
      const act=(uid,op,extra={})=>call(uid,op,extra,'/room-control',room,host,type);
      const gift={gift:'وردة حمراء',cost:10,nonce:crypto.randomUUID()};
      await act(host,'join');
      await act(sender,'join');
      await act(listener,'join',{avatar:'🌱'});
      await q('INSERT INTO diamond_purchase VALUES(?,?,?,?)',room,sender,100,room).run();
      assert.equal((await act(sender,'giftRecipient',{recipient:listener})).recipient.avatar,'🌱');
      assert.equal((await act(sender,'paidGift',gift)).receipt.recipient,host);
      const chosen={...gift,nonce:crypto.randomUUID(),recipient:listener};
      const [one,two]=await Promise.all([act(sender,'paidGift',chosen),act(sender,'paidGift',chosen)]);
      assert.equal(one.receipt.recipient,listener);
      assert.deepEqual(two.receipt,one.receipt);
      assert.equal((await readWallet(q,listener)).progress,10);
      assert.equal((await readWallet(q,host)).progress,10);
      assert.equal((await act(host,'hostCard',{roomTotal:true})).roomTotal,20);
      await act(listener,'leave');
      assert.equal((await act(sender,'paidGift',{...chosen,nonce:crypto.randomUUID()})).status,409);
      assert.equal((await act(sender,'giftRecipient',{recipient:listener})).status,409);
      assert.equal((await act(sender,'paidGift',{...gift,recipient:sender})).status,400);
      assert.equal((await readWallet(q,sender)).diamonds,80);
    });
  }
  await t.test('microphone permission follows the chosen seat and only app staff moderates the host',async t=>{
    const q=await roomStore(db),room='mic-permission',owner='mic-owner';
    sql.exec('SAVEPOINT micAccess');t.after(()=>sql.exec('ROLLBACK TO micAccess; RELEASE micAccess'));
    const act=(uid,op,extra={})=>call(uid,op,extra,'/room-control',room,owner);
    await q('INSERT INTO room_admin VALUES(?,?)',room,'mod').run();
    await q('INSERT INTO clipi_app_admin VALUES(?)','staff').run();
    for(const uid of [owner,'mod','staff','guest','host'])await act(uid,'join');
    assert.equal((await act('guest','poll')).micFree,true);
    assert.equal((await act('mod','poll')).roomAdmin,true);
    assert.equal((await act('mod','poll')).appStaff,false);
    assert.equal((await act('staff','poll')).appStaff,true);
    assert.equal((await act('guest','settings',{micFree:false})).status,403);
    assert.equal((await act(owner,'settings',{micFree:false})).micFree,false);
    assert.equal((await act('guest','move',{slot:2})).status,409);
    assert.equal((await call('unjoined','token',{session:null},'/token',room,owner)).status,403);
    assert.equal((await act('guest','request',{slot:2})).people.find(p=>p.uid==='guest').seat,0);
    assert.equal((await act('guest','settings',{roomAdmin:true,micFree:true})).status,403);
    let data=await act('guest','request',{slot:2,permissionOnly:true});
    assert.equal(data.people.find(p=>p.uid==='guest').seat,0);
    assert.equal((await act('guest','approve',{uid:'guest'})).status,403);
    data=await act('mod','approve',{uid:'guest'});
    assert.equal(data.people.find(p=>p.uid==='guest').seat,2);
    await act('guest','stepDown');
    await act('guest','request',{slot:6,permissionOnly:true});await act('mod','reject',{uid:'guest'});
    assert.equal((await act('mod','approve',{uid:'guest'})).status,409);
    await act(owner,'move',{slot:4});
    for(const op of ['eject','kick','demote','mute'])assert.equal((await act('mod',op,{uid:owner})).status,403);
    assert.equal((await act('staff','mute',{uid:owner})).people.find(p=>p.uid===owner).muted,1);
    await act('host','unmute',{uid:owner});
    assert.equal((await act('host','demote',{uid:owner})).people.find(p=>p.uid===owner).seat,-1);
    await act(owner,'settings',{micFree:true});
    assert.equal((await act('guest','move',{slot:3})).people.find(p=>p.uid==='guest').seat,3);
    assert.equal((await act('staff','eject',{uid:owner})).status,200);
    assert.equal((await act(owner,'poll')).status,403);
  });
  for(const type of ['audio','video']){
    await t.test(type+' invitations use mutual friends, opt-in and a private recipient inbox',async t=>{
      const q=await roomStore(db),owner='invitations-host',room=type+'-invitations';
      sql.exec('SAVEPOINT invitations');t.after(()=>sql.exec('ROLLBACK TO invitations; RELEASE invitations'));
      const follow=(a,b)=>q('INSERT OR IGNORE INTO short_follow VALUES(?,?)',a,b).run();
      function friend(uid){follow(uid,owner);follow(owner,uid)}
      friend('a-friend');friend('b-friend');follow('follower',owner);
      const act=(uid,op,extra={},id=room)=>call(uid,op,extra,'/room-control',id,owner,type);
      const inbox=async uid=>(await invitationInbox(q,uid,{op:'roomInviteInbox'},x=>x)).invitations;
      await act(owner,'join');await act('follower','join',{inviteFriends:true});
      assert.equal((await inbox('a-friend')).length,0);
      assert.equal((await act('follower','inviteFriends',{all:true})).status,403);
      assert.equal((await act('follower','inviteAtStart')).status,403);
      assert.deepEqual((await act(owner,'inviteChoices')).friends.map(p=>p.uid),['a-friend','b-friend']);
      assert.deepEqual((await act(owner,'inviteFriends',{uids:['a-friend','follower']})).invited,['a-friend']);
      assert.equal((await inbox('b-friend')).length,0);
      assert.equal((await inbox('follower')).length,0);
      assert.equal((await inbox('a-friend'))[0].room,room);
      await invitationInbox(q,'a-friend',{op:'dismissRoomInvite',room},x=>x);
      assert.equal((await inbox('a-friend')).length,0);
      await act(owner,'join',{},room+'-new');
      assert.equal((await inbox('b-friend')).length,0);
      await act(owner,'inviteAtStart',{},room+'-new');
      assert.equal((await inbox('a-friend'))[0].room,room+'-new');
      assert.equal((await inbox('b-friend'))[0].room,room+'-new');
      friend('new-friend');await act(owner,'inviteAtStart',{},room+'-new');
      assert.equal((await inbox('new-friend')).length,0);
      assert.equal((await inbox('follower')).length,0);
      await act(owner,'leave',{},room+'-new');
      assert.equal((await inbox('b-friend')).length,0);
    });
  }
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
    assert.equal((await act(other===target?guest:other,'giftRecipient',{recipient:target})).recipient.uid,target);
    await act(host,'settings',{locked:true});
    assert.equal(seat(await act(host,'poll'),host),3);
    assert.equal((await act(guest,'move',{slot:1})).status,409);
    await act(guest,'request');
    assert.equal(seat(await act(host,'approve',{uid:guest,slot:0}),guest),9);
    await act(host,'stepDown');
    assert.equal(await publisher(host),false);
    assert.equal((await act(other,'giftRecipient',{recipient:host})).recipient.uid,host);
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
  const giftAudience=await call('host','poll');
  assert.equal(giftAudience.giftEvents.filter(e=>e.sender===second&&e.nonce===routed.nonce&&e.gift===routed.gift).length,1);
  assert.equal((await call('host','message',{text:'🎁 وردة زرقاء · 30 💎'})).giftEvents.length,giftAudience.giftEvents.length);
  assert.equal((await call(second,'paidGift',{...routed,recipient:'host'})).status,409);
  assert.equal((await readWallet(q,second)).diamonds,980);
  assert.equal((await readWallet(q,'u0')).progress,10);
  await call('host','demote',{uid:'u0'});
  await call('u0','leave');
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

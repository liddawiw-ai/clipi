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
  }},query}},batch(statements){for(const {query} of statements)sql.exec(query);return Promise.resolve()}};
  const visits=new Map(), kicks=[];
  const call=async(user,op,extra={},path='/room-control')=>{
    if(!visits.has(user))visits.set(user,crypto.randomUUID());
    const result=await roomControls({env:{PI_GIFTS_DB:db,LIVEKIT_API_SECRET:'fixture',CLIPI_OWNER_UID:'host'},room:'test',user,host:user==='host',type:'audio',path,
      input:{name:user,op,session:visits.get(user),...extra},json:(body,status=200)=>({status,...body}),disconnect:async uid=>kicks.push(uid)});
    return result;
  };
  await call('host','join');
  const data=await call('first','join',{frame:true,ride:true});
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
  for(let i=0;i<12;i++)await call('u'+i,'join');
  const full=await call('host','poll');
  assert.equal(full.people.filter(p=>p.seat).length,8);
  await call('first','leave');
  await call('u11','request');
  assert.equal((await call('u11','token',{},'/token')).publisher,true);
  sql.prepare('UPDATE room_member SET seen=0 WHERE uid=?').run('u11');
  assert.equal((await call('u11','token',{},'/token')).status,403);
  const q=await roomStore(db);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {roomControls} from './room-controls.mjs';
import {equippedEntrance,incomingEntries} from '../pi-web/entranceStyles.mjs';

test('entrance selection, self entry, host re-entry and repeated polls',async()=>{
  const sql=new DatabaseSync(':memory:');
  const db={prepare(query){return {query,bind(...args){return {
    run:()=>({meta:sql.prepare(query).run(...args)}),all:()=>({results:sql.prepare(query).all(...args)}),first:()=>sql.prepare(query).get(...args)
  };}};},batch(statements){return statements.map(s=>s.query?sql.exec(s.query):s.run());}};
  const room='one'; const sessions=new Map();
  function call(user,op,extra={}){
    if(!sessions.has(user))sessions.set(user,crypto.randomUUID());
    return roomControls({env:{PI_GIFTS_DB:db},input:{op,name:user,session:sessions.get(user),...extra},room,user,host:user==='host',ownerUid:'host',type:'audio',path:'/room-control',json:(data,status=200)=>({status,...data})});
  }
  const host=await call('host','join',{ride:equippedEntrance({ride:'🏎️ دخول سيارة فاخرة'})});
  let guests=incomingEntries(null,host.people,'host');
  assert.deepEqual(guests.arrivals.map(p=>[p.uid,p.ride]),[['host',1]]);
  const rider=await call('guest','join',{ride:equippedEntrance({ride:'دخول بسيارة'})});
  assert.deepEqual(incomingEntries(null,rider.people,'guest').arrivals.map(p=>[p.uid,p.ride]),[['guest',2]]);
  const now=await call('host','poll');guests=incomingEntries(guests.known,now.people,'host');
  assert.deepEqual(guests.arrivals.map(p=>[p.uid,p.ride]),[['guest',2]]);
  assert.deepEqual(incomingEntries(guests.known,(await call('host','poll')).people,'host').arrivals,[]);
  const guestView=guests.known;
  await call('host','leave');sessions.delete('host');
  const hostBack=await call('host','join',{ride:equippedEntrance({ride:'دخول رياضي',entryStyle:4})});
  assert.deepEqual(incomingEntries(guestView,hostBack.people,'guest').arrivals.map(p=>[p.uid,p.ride]),[['host',4]]);
  assert.deepEqual(incomingEntries(incomingEntries(null,hostBack.people,'host').known,(await call('host','join',{ride:4})).people,'host').arrivals,[]);
  for(const id of [3,4])assert.equal(equippedEntrance({ride:'دخول رياضي',entryStyle:id}),id);
  assert.equal(equippedEntrance({ride:'دخول بصاروخ'}),6);assert.equal(equippedEntrance({ride:'',entryStyle:3}),0);
  for (const retired of [5,7]) assert.equal((await call('retired'+retired,'join',{ride:retired})).people.find(p=>p.uid==='retired'+retired).ride,0);
  assert.equal((await call('legacy','join',{ride:true})).people.find(p=>p.uid==='legacy').ride,1);
  assert.equal((await call('plain','join',{ride:false})).people.find(p=>p.uid==='plain').ride,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {roomStore} from './room-controls.mjs';
import {agencyAccount} from './agencies.mjs';

test('agency directory, tenant permissions, monthly split snapshots and non-cash video gifts',async()=>{
  const sql=new DatabaseSync(':memory:');
  const db={prepare(query){return {query,bind(...args){const statement=sql.prepare(query);return {
    run:()=>({meta:statement.run(...args)}),all:()=>({results:statement.all(...args)}),first:()=>statement.get(...args)
  };}};},batch(statements){for(const {query} of statements)sql.exec(query);}};
  const q=await roomStore(db),owner='test-owner';
  const call=(uid,op,params={})=>agencyAccount(q,uid,owner,{op,...params},(body,status=200)=>({...body,status}));
  const members=['host','agent','unrelated'];
  for(const [i,uid] of members.entries())await q('INSERT INTO public_numbers VALUES(?,?,0)',String(9000001+i),uid).run();
  assert.equal((await call('public','agencyList')).agencies.length,0);
  assert.equal((await call('public','agencyCreate',{name:'A'})).status,403);
  const {id}=await call(owner,'agencyCreate',{name:'A',agentNumber:'9000002'});
  assert.ok(id>0);
  assert.equal((await call(owner,'agencyCreate',{name:'A'})).status,409);
  assert.equal((await call('unrelated','agencyMemberAdd',{id,number:'9000001'})).status,403);
  for(let i=0;i<2;i++)assert.equal((await call('agent','agencyMemberAdd',{id,number:'9000001'})).status,200);
  assert.equal((await call('public','agencyList')).agencies[0].members,1);
  const other=await call(owner,'agencyCreate',{name:'B'});
  assert.equal((await call(owner,'agencyMemberAdd',{id:other.id,number:'9000001'})).status,409);
  const gift=(nonce,room,host)=>q('INSERT OR IGNORE INTO paid_room_gift VALUES(?,?,?,?,?,?,0)','buyer',nonce,room,host,'rose',2000).run();
  await gift('first','room','host');await gift('first','room','host');
  await gift('video','short/palace','');
  const old=await call(owner,'agencyDetail',{id});
  assert.deepEqual(old.totals,{diamonds:2000,host:55,agent:10,platform:35});
  assert.equal((await call('unrelated','agencyDetail',{id})).totals,null);
  assert.equal((await call('host','agencyDetail',{id})).roster,undefined);
  assert.deepEqual((await call('host','agencyDetail',{id})).totals,{diamonds:2000,host:55});
  assert.equal((await call('agent','agencyEdit',{id,host_pct:40})).status,403);
  assert.equal((await call(owner,'agencyEdit',{id,host_pct:85,agent_pct:25})).status,400);
  assert.equal((await call(owner,'agencyEdit',{id,host_pct:60,agent_pct:20,area:'عمّان'})).status,200);
  await gift('second','room','host');
  const revised=await call('agent','agencyDetail',{id});
  assert.deepEqual(revised.totals,{diamonds:4000,host:115,agent:30,platform:55});
  assert.equal(revised.agency.area,'عمّان');
  assert.equal((await call(owner,'agencyDetail',{id,month:'2001-01'})).totals.diamonds,0);
  assert.equal((await call(owner,'agencyDetail',{id,month:'2026-13'})).status,400);
  await call('agent','agencyMemberRemove',{id,number:'9000001'});await gift('third','room','host');
  assert.equal((await call(owner,'agencyDetail',{id})).totals.diamonds,4000);
  assert.equal((await call('host','agencyDetail',{id})).totals.host,115);
  sql.close();
});

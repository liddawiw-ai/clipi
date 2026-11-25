import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {roomStore} from './room-controls.mjs';
import {agencyAccount} from './agencies.mjs';

test('only an owner decision creates an agency and grants its applicant management',async t=>{
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  const q=await roomStore({prepare(query){return {query,bind(...values){
    const stmt=db.prepare(query);
    return {first:()=>stmt.get(...values),all:()=>({results:stmt.all(...values)}),run:()=>({meta:stmt.run(...values)})};
  }}},batch(statements){for(const {query} of statements)db.exec(query)}});
  const call=(uid,op,body={})=>agencyAccount(q,uid,'owner',{op,...body},(data,status=200)=>({data,status}));
  const list=async uid=>(await call(uid,'agencyList')).data;
  const application={name:'Amman',requestKey:'host1-unique-request-key'};
  const decide=(uid,requestId,decision)=>call(uid,'agencyDecide',{requestId,decision});
  await q('INSERT INTO public_numbers VALUES(?,?,0)','9040001','host1').run();
  await q('INSERT INTO clipi_app_admin(uid) VALUES(?)','admin').run();
  await q('INSERT INTO clipi_app_owner(uid) VALUES(?)','registered-owner').run();
  assert.equal((await list('host1')).canRequest,true);
  assert.equal((await call('host1','agencyCreate',{name:'Amman'})).status,403);
  const first=await call('host1','agencyApply',application);
  const id=first.data.id;
  assert.ok(id);
  assert.equal((await call('host1','agencyApply',application)).data.id,id);
  assert.equal((await call('host1','agencyApply',{...application,requestKey:'second-button-press-key'})).status,409);
  assert.equal((await list('host1')).myRequest.status,'pending');
  assert.equal((await list('other')).myRequest,null);
  assert.deepEqual((await list('owner')).agencies,[]);
  assert.equal((await list('registered-owner')).pendingRequests[0].number,'9040001');
  for(const uid of ['host1','admin','other']){
    assert.equal((await list(uid)).pendingRequests,undefined);
    for(const decision of ['approved','rejected'])assert.equal((await decide(uid,id,decision)).status,403);
  }
  assert.equal((await decide('owner',id,'rejected')).status,200);
  assert.equal((await list('host1')).myRequest.status,'rejected');
  assert.deepEqual((await list('owner')).agencies,[]);
  const again=await call('host1','agencyApply',{...application,requestKey:'another-application-key'});
  const next=again.data.id;
  assert.notEqual(next,id);
  await Promise.all([decide('registered-owner',next,'approved'),decide('owner',next,'approved')]);
  const host=await list('host1');
  assert.equal(host.myRequest.status,'approved');
  assert.equal(host.agencies.length,1);
  assert.equal(host.myRequest.agency_id,host.agencies[0].id);
  assert.equal((await call('host1','agencyDetail',{id:host.agencies[0].id})).data.canManage,true);
  assert.equal((await call('other','agencyDetail',{id:host.agencies[0].id})).data.canManage,false);
  assert.equal((await decide('owner',next,'rejected')).status,409);
  assert.equal((await call('host1','agencyApply',{...application,requestKey:'another-application-key'})).data.id,next);
  const concurrent=await call('other','agencyApply',{name:'North',requestKey:'unique-conflicting-name'});
  await call('owner','agencyCreate',{name:'North'});
  assert.equal((await decide('owner',concurrent.data.id,'approved')).status,409);
  assert.equal((await list('other')).myRequest.status,'pending');
  assert.equal((await decide('owner',concurrent.data.id,'rejected')).status,200);
});

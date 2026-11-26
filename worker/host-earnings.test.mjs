import assert from 'node:assert/strict';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {roomStore} from './room-controls.mjs';
import {hostEarnings, fundedSnapshot, requestWithdrawalReview} from './host-earnings.mjs';
import {supportCase} from './support-case.mjs';

test('receiving choices, statement points and private help replies follow the signed-in account',async t=>{
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  const q=await roomStore({prepare(query){return {query,bind(...args){
    const stmt=db.prepare(query);
    return {first:()=>stmt.get(...args),all:()=>({results:stmt.all(...args)}),run:()=>({meta:stmt.run(...args)})};
  }}},batch(statements){statements.forEach(s=>db.exec(s.query))}});
  const json=(body,status=200)=>({body,status});
  const wallet=(uid,input,identity={})=>hostEarnings(q,uid,input,json,{},identity);
  await q("INSERT INTO clipi_agency_statement VALUES('sender','gift',1,'host','2026-11',2000,110,20,70)").run();
  const pref={country:'JO',product:'wallet-1',label:'Mobile wallet'};
  const saved=await wallet('host',{op:'saveReceivingMethod',...pref});
  assert.equal(saved.body.statementPoints,55);
  assert.deepEqual({...saved.body.method},pref);
  assert.equal(saved.body.funded,null);
  assert.equal((await wallet('visitor',{op:'hostEarnings',uid:'host'})).body.method,null);
  assert.equal((await wallet('host',{op:'linkReceivingContact',email:'fake@example.invalid'})).status,409);
  assert.equal((await wallet('host',{op:'linkReceivingContact'},{phoneNumber:'+962790000000'})).body.contact,'••••0000');
  const help=(uid,input)=>supportCase(q,uid,'owner',input,json);
  const id=crypto.randomUUID();
  assert.equal((await help('host',{op:'caseCreate',kind:'help',id,subject:'admin-room',detail:'How do I upload?'})).status,200);
  assert.equal((await help('visitor',{op:'caseReply',id,body:'hi'})).status,403);
  await q("INSERT INTO clipi_app_admin(uid) VALUES('admin')").run();
  assert.equal((await help('admin',{op:'caseQueue'})).body.cases[0].id,id);
  for(let i=0;i<2;i++)assert.equal((await help('admin',{op:'caseReply',id,body:'Open the upload panel.'})).status,200);
  assert.equal((await help('host',{op:'caseList'})).body.cases[0].reply,'Open the upload panel.');
  assert.equal((await help('visitor',{op:'caseList'})).body.cases.length,0);
  const funded={availablePoints:2550};
  assert.equal(await requestWithdrawalReview(q,'host',3500,funded,'verified contact'),false);
  for(let i=0;i<2;i++)assert.equal(await requestWithdrawalReview(q,'host',2250,funded,'verified contact'),true);
  assert.equal((await help('admin',{op:'caseQueue'})).body.cases.length,0);
  const review=(await help('owner',{op:'caseQueue'})).body.cases[0];
  assert.equal(review.kind,'withdrawal-review');
  assert.equal((await help('admin',{op:'caseReply',id:review.id,body:'x'})).status,409);
  assert.equal((await help('owner',{op:'caseReply',id:review.id,body:'Under review'})).status,200);
  assert.equal((await wallet('host',{op:'hostEarnings'})).body.review.reply,'Under review');
  assert.equal((await wallet('visitor',{op:'hostEarnings'})).body.review,null);
  assert.equal(await requestWithdrawalReview(q,'other-host',2250,funded,'verified contact',true),true);
  assert.equal((await wallet('other-host',{op:'hostEarnings'})).body.review.detail,'2250 نقطة · verified contact');

});
test('read the funded wallet and current withdrawal with a per-account field mask',async t=>{
  t.mock.method(globalThis,'fetch',async url=>{
    const requested=new URL(url);
    assert.ok(requested.searchParams.has('mask.fieldPaths'));
    assert.match(requested.pathname,/earningsWallets\/host(?:\/withdrawals\/one)?$/);
    return Response.json({fields:requested.pathname.endsWith('/one')?{state:{stringValue:'pending'},points:{integerValue:'2000'}}:
      {availablePoints:{integerValue:'350'},activeWithdrawal:{stringValue:'one'}}});
  });
  assert.deepEqual(await fundedSnapshot({},'host','test'),{availablePoints:350,nextEligibleAt:null,withdrawal:{id:'one',points:2000,state:'pending'}});
});

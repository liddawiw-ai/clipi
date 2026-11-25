import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {roomStore,roomControls} from './room-controls.mjs';
import {shortAccount,deleteShort} from './short-videos.mjs';
import {supportCase} from './support-case.mjs';
import {liveProgram,tagRoom} from './live-program.mjs';

test('account reports, shield, captions, scheduled live and deletion isolation',async t=>{
  const sql=new DatabaseSync(':memory:');
  const db={prepare(query){return {query,bind(...args){const st=sql.prepare(query);return {
    run:()=>({meta:st.run(...args)}),first:()=>st.get(...args),all:()=>({results:st.all(...args)})}}}},
    batch(items){return items.map(i=>i.all?i.all():sql.exec(i.query))}};
  const q=await roomStore(db),json=(body,status=200)=>({...body,status});
  const owner='demo-host',guest='demo-viewer',peer='unrelated';
  const run=(uid,input)=>supportCase(q,uid,owner,input,json);
  const shorts=(uid,input)=>shortAccount(q,uid,input,json,true);
  const pi=(uid,input)=>liveProgram(q,uid,input,json);
  const call=(user,op,extra={})=>roomControls({env:{PI_GIFTS_DB:db,LIVEKIT_API_SECRET:'test-secret'},input:{op,session:session[user],...extra},room:'demo-room',user,host:user===owner,ownerUid:owner,type:'audio',path:'/room-control',json,disconnect:async()=>{},mediaToken:async()=>''});
  const session=Object.fromEntries([owner,guest].map(u=>[u,crypto.randomUUID()]));
  const created=await shorts(owner,{op:'shortPrepare',title:'demo',cues:[{at:0,text:'hello'},{at:6,text:'second'}]});
  assert.ok(created.id);const clip=created.id;
  await q('UPDATE short_clip SET object_key=? WHERE id=?','demo.mp4',clip).run();
  await t.test('timed captions round trip and invalid timings fail',async()=>{
    assert.equal((await shorts(guest,{op:'shortState',clip})).cues[1].text,'second');
    assert.equal((await shorts(owner,{op:'shortPrepare',cues:[{at:-2,text:'no'}]})).status,400);
  });
  await t.test('the real comment is attached even if the reporter spoofs its text',async()=>{
    await q('INSERT INTO short_comment VALUES(?,?,?,?)',clip,peer,'n','original comment').run();
    const commentId=q('SELECT rowid AS id FROM short_comment').first().id;
    const req={op:'caseCreate',id:crypto.randomUUID(),kind:'comment',subject:clip,commentId,detail:'reason',body:'spoof'};
    assert.equal((await run(guest,req)).id,req.id);
    const ticket=(await run(owner,{op:'caseQueue'})).cases.find(x=>x.id===req.id);
    assert.equal(JSON.parse(ticket.subject).body,'original comment');
    assert.equal((await run(guest,{...req,commentId:999})).status,409);
    assert.equal((await run(guest,{...req,id:crypto.randomUUID(),subject:'wrong'})).status,404);
    assert.equal((await run(guest,req)).id,req.id);
  });
  await t.test('one switch enforces slow mode, restores custom settings and denies listeners',async()=>{
    await call(owner,'join');await call(guest,'join');
    assert.equal((await call(guest,'settings',{shield:true})).status,403);
    await call(owner,'settings',{slow:5,words:['testword']});
    let state=await call(owner,'settings',{shield:true});assert.equal(state.slow,10);assert.equal(state.shield,true);
    assert.equal((await call(guest,'message',{text:'send your password now'})).status,422);
    assert.equal((await call(guest,'message',{text:'testword'})).status,422);
    await call(guest,'message',{text:'hello'});assert.equal((await call(guest,'message',{text:'hello again'})).status,429);
    state=await call(owner,'settings',{shield:false});assert.equal(state.slow,5);assert.deepEqual(state.words,['testword']);
  });
  await t.test('only a subscribed viewer is notified when the scheduled host actually goes live',async()=>{
    const post={op:'eventCreate',name:'Session',type:'audio',topic:'games',language:'ar',starts:Date.now()+600000};
    const e=await pi(owner,post);assert.ok(e.id);assert.equal((await pi(owner,post)).status,409);
    await pi(guest,{op:'eventRemind',event:e.id,enabled:true});assert.equal((await pi(guest,{op:'eventList'})).alerts.length,0);
    await tagRoom(q,owner,'demo-room',{topic:'games',language:'ar',event:e.id},json);
    assert.equal((await pi(guest,{op:'eventList'})).alerts[0].room,'demo-room');assert.equal((await pi(peer,{op:'eventList'})).alerts.length,0);
    await pi(guest,{op:'eventSeen',event:e.id});assert.equal((await pi(guest,{op:'eventList'})).alerts.length,0);
  });
  await t.test('a deletion request from a throwaway account is idempotent; the request alone does not erase its content',async()=>{
    const req={op:'caseCreate',id:crypto.randomUUID(),kind:'deletion'};
    assert.equal((await run(owner,req)).id,req.id);assert.equal((await run(owner,{...req,id:crypto.randomUUID()})).id,req.id);
    assert.ok((await shorts(guest,{op:'shortLookup',clip})).clip);
    assert.equal((await run(peer,{op:'caseList'})).deletion,null);
  });
  sql.close();
});

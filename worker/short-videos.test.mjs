import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {roomStore} from './room-controls.mjs';
import {readWallet} from './diamond-wallet.mjs';
import {shortAccount,receiveShort,serveShort,deleteShort} from './short-videos.mjs';

test('video uploads, playback ranges, likes, comments and non-cash gifts',async()=>{
  const sql=new DatabaseSync(':memory:');
  const db={prepare(query){return {query,bind(...args){return {
    run:()=>({meta:sql.prepare(query).run(...args)}),all:()=>({results:sql.prepare(query).all(...args)}),first:()=>sql.prepare(query).get(...args)
  };}};},batch(statements){for(const {query} of statements)sql.exec(query);}};
  const q=await roomStore(db),json=(body,status=200)=>({status,...body});
  const api=(uid,op,extras,configured=true)=>shortAccount(q,uid,{op,...extras},json,configured);
  assert.equal((await api('owner','shortPrepare',{},false)).status,503);
  const {id}=await api('owner','shortPrepare',{title:'مقطعي'});
  assert.equal((await api('other','shortList',{})).clips.length,0);
  const bytes=Uint8Array.from([0,0,0,16,102,116,121,112,105,115,111,109,0,0,0,0]);
  const objects=new Map(),bucket={
    put:async(k,v)=>objects.set(k,v),delete:async k=>objects.delete(k),head:async k=>({size:objects.get(k).length}),
    get:async(k,{range}={})=>({body:range?objects.get(k).slice(range.offset,range.offset+range.length):objects.get(k)})
  };
  const upload=(uid,data=bytes)=>receiveShort(new Request('https://test.local/',{method:'PUT',headers:{'Content-Length':String(data.length)},body:data}),bucket,q,uid,id,json);
  assert.equal((await upload('other')).status,404);
  assert.equal((await upload('owner',new Uint8Array(16))).status,415);
  assert.equal((await upload('owner')).id,id);
  await upload('owner');assert.equal(objects.size,1);
  assert.equal((await api('other','shortList',{})).clips[0].id,id);
  const range=await serveShort(new Request('https://test.local/',{headers:{Range:'bytes=4-7'}}),bucket,q,id,json);
  assert.equal(range.status,206);assert.equal(await range.text(),'ftyp');
  const invalid=await serveShort(new Request('https://test.local/',{headers:{Range:'bytes=200-'}}),bucket,q,id,json);
  assert.equal(invalid.status,416);
  const clip={clip:id};
  for(let n=0;n<3;n++)assert.equal((await api('viewer','shortLike',{...clip,liked:true})).likes,1);
  assert.deepEqual(await api('viewer','shortLike',{...clip,liked:true,likeOnly:true}),{status:200,likes:1,liked:true});
  const state=await api('viewer2','shortState',clip);
  assert.equal(state.likes,1);assert.equal(state.liked,false);assert.equal(state.commentCount,0);assert.equal(state.owner,'owner');
  assert.equal((await api('viewer','shortLike',{...clip,liked:false})).likes,0);
  const comment={...clip,nonce:crypto.randomUUID(),body:'أهلًا'};
  for(let n=0;n<2;n++)assert.equal((await api('viewer','shortComment',comment)).comments.length,1);
  const root=(await api('viewer','shortComments',clip)).comments[0].id;
  const reply={...clip,body:'رد',nonce:crypto.randomUUID(),parent:root,profile:{name:'وليد',avatar:'و'}};
  for(let i=0;i<2;i++){
    const posted=await api('author','shortComment',reply);
    assert.equal(posted.count,2);assert.equal(posted.comments[0].name,'وليد');assert.ok(posted.comments[0].created);
  }
  assert.equal((await api('viewer','shortComments',clip)).comments[0].replyCount,1);
  const heart={...clip,commentId:root,liked:true};
  for(let i=0;i<2;i++)assert.equal((await api('owner','shortCommentLike',heart)).likes,1);
  assert.equal((await api('viewer','shortComments',clip)).comments[0].creatorLiked,1);
  assert.equal((await api('viewer','shortCommentLike',{...heart,clip:'dunes'})).status,404);
  assert.equal((await api('viewer','shortComment',{...reply,clip:'dunes'})).status,404);
  await api('viewer','shortFollow',{...clip,following:true});
  assert.equal((await api('viewer','shortState',clip)).following,true);
  assert.equal((await api('other','shortState',clip)).following,false);
  const asset={...clip,body:'',media:'heart',nonce:crypto.randomUUID()};
  assert.equal((await api('viewer','shortComment',asset)).comments[0].media,'heart');
  assert.equal((await api('viewer','shortComment',{...asset,media:'invalid'})).status,400);
  await q('INSERT INTO diamond_purchase(payment,uid,diamonds,txid) VALUES(?,?,?,?)','p','viewer',30,'tx').run();
  const gift={...clip,nonce:crypto.randomUUID(),gift:'وردة حمراء'};
  for(let n=0;n<2;n++)assert.equal((await api('viewer','shortGift',gift)).status,200);
  assert.equal((await readWallet(q,'viewer')).diamonds,20);
  const owner=await readWallet(q,'owner');assert.equal(owner.earningsUnits,0);assert.equal(owner.collected,0);assert.equal(owner.rewardPi,0);
  assert.equal((await api('viewer','shortGift',{...gift,nonce:crypto.randomUUID(),gift:'قلب'})).status,409);
  assert.equal((await readWallet(q,'viewer')).diamonds,20);
  const remove=(uid,target,storage=bucket)=>deleteShort(q,uid,target,json,storage);
  assert.equal((await remove('viewer',id)).status,403);
  assert.equal((await remove('owner','palace')).status,403);
  assert.equal((await remove('owner',id,{delete:async()=>{throw Error('storage offline');}})).status,503);
  assert.equal((await api('owner','shortLookup',clip)).clip.owner,'owner');
  assert.equal((await serveShort(new Request('https://test.local/'),bucket,q,id,json)).headers.get('cache-control'),'private, no-store');
  assert.equal((await remove('owner',id)).deleted,true);
  assert.equal((await remove('owner',id)).deleted,true);
  assert.equal(objects.size,0);
  assert.equal((await serveShort(new Request('https://test.local/'),bucket,q,id,json)).status,404);
  assert.equal((await api('owner','shortLookup',clip)).clip,null);
  assert.equal((await api('viewer','shortList',{})).clips.length,0);
  assert.equal((await api('viewer','shortState',clip)).status,404);
  for(const table of ['short_comment','short_comment_meta','short_comment_heart','short_like']){
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0);
  }
  assert.equal((await readWallet(q,'viewer')).diamonds,20);
});

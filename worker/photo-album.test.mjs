import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {ClipiVideo} from './video-storage.mjs';
import {shortAccount,receiveShort,serveShort,deleteShort} from './short-videos.mjs';
import {roomStore} from './room-controls.mjs';

test('photo posts publish together, keep per-slide text, retry safely and delete with their media',async t=>{
  const catalog=new DatabaseSync(':memory:'),media=new DatabaseSync(':memory:');
  t.after(()=>{catalog.close();media.close();});
  const q=await roomStore({prepare(sql){return {sql,bind(...args){const s=catalog.prepare(sql);return {
    first:()=>s.get(...args),all:()=>({results:s.all(...args)}),run:()=>({meta:s.run(...args)})};}}},batch(stmts){stmts.forEach(s=>catalog.exec(s.sql));}});
  const object=new ClipiVideo({storage:{sql:{exec(sql,...args){
    const rows=media.prepare(sql).all(...args.map(v=>v instanceof ArrayBuffer?new Uint8Array(v):v));
    return Object.assign(rows,{toArray:()=>rows,one:()=>rows[0]});}},
    transactionSync(fn){media.exec('BEGIN');try{const r=fn();media.exec('COMMIT');return r;}catch(e){media.exec('ROLLBACK');throw e;}}
  }});
  const json=(v,status=200)=>Response.json(v,{status});
  const act=(op,extra={})=>shortAccount(q,'author',{op,includePhotos:true,...extra},json,true);
  assert.equal((await act('shortPrepare',{photos:[]})).status,400);
  const {id}=await (await act('shortPrepare',{photos:['الأولى','الثانية'],title:'رحلة'})).json();
  const videos={getByName(key){assert.equal(key,'album/'+id);return {fetch:(url,init)=>object.fetch(new Request(url,{...init,duplex:'half'}))};}};
  const url='https://local/shorts/media/'+id;
  const jpeg=readFileSync(new URL('../pi-web/assets/shorts/palace.jpg',import.meta.url)).toString('base64');
  const upload=(photos,uid='author')=>receiveShort(new Request(url,{method:'PUT',body:JSON.stringify(photos)}),null,q,uid,id,json,videos);
  assert.equal((await upload([jpeg])).status,415);
  assert.equal((await upload([jpeg,jpeg],'other')).status,404);
  assert.equal((await (await act('shortList')).json()).clips.length,0);
  for(let i=0;i<2;i++)assert.equal((await upload([jpeg,jpeg])).status,200);
  assert.equal((await (await act('shortList')).json()).clips[0].photoCount,2);
  assert.equal((await (await act('shortList',{includePhotos:false})).json()).clips.length,0);
  for(const op of ['shortLookup','shortRandom'])assert.equal((await (await act(op,{clip:id})).json()).clip.photoCount,2);
  assert.equal((await (await act('shortProfileList')).json()).clips[0].photoCount,2);
  assert.deepEqual((await (await act('shortState',{clip:id})).json()).photos,['الأولى','الثانية']);
  const slide=i=>serveShort(new Request(url+'?photo='+i),null,q,id,json,videos);
  const second=await slide(1);assert.equal(second.headers.get('Content-Type'),'image/jpeg');assert.equal(Buffer.from(await second.arrayBuffer()).toString('base64'),jpeg);
  assert.equal((await slide(2)).status,404);
  assert.equal((await deleteShort(q,'other',id,json,null,videos)).status,403);
  assert.equal((await deleteShort(q,'author',id,json,null,videos)).status,200);
  assert.equal((await slide(0)).status,404);
  assert.equal((await upload([jpeg,jpeg])).status,404);
  const video=await (await act('shortPrepare',{overlay:'طول الفيديو',cues:[{at:0,text:'لقطة'}]})).json();
  await q("UPDATE short_clip SET object_key='video.mp4' WHERE id=?",video.id).run();
  const state=await(await act('shortState',{clip:video.id})).json();
  assert.equal(state.overlay,'طول الفيديو');assert.equal(state.cues[0].text,'لقطة');
});

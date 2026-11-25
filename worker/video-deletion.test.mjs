import test from 'node:test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {ClipiVideo} from './video-storage.mjs';
import {deleteShort,receiveShort,serveShort,shortSchema} from './short-videos.mjs';

test('deleting a cloud clip is owner-only and a late upload cannot restore its bytes',async()=>{
  const catalog=new DatabaseSync(':memory:'),media=new DatabaseSync(':memory:');
  for(const sql of shortSchema) catalog.exec(sql);
  function q(sql,...args){
    const statement=catalog.prepare(sql);
    return {first:()=>statement.get(...args),run:()=>({meta:statement.run(...args)})};
  }
  const object=new ClipiVideo({storage:{
    sql:{exec(sql,...args){
      const rows=media.prepare(sql).all(...args.map(v=>v instanceof ArrayBuffer?new Uint8Array(v):v));
      return Object.assign(rows,{toArray:()=>rows,one:()=>rows[0]});
    }},
    transactionSync(fn){
      media.exec('BEGIN');
      try{const result=fn();media.exec('COMMIT');return result;}
      catch(error){media.exec('ROLLBACK');throw error;}
    }
  }});
  const id=crypto.randomUUID(),key='cloud/'+id;
  const videos={getByName(name){assert.equal(name,key);return {fetch:(url,init)=>object.fetch(new Request(url,{...init,duplex:'half'}))};}};
  const json=(data,status=200)=>Response.json(data,{status});
  const url='https://example.test/shorts/media/'+id;
  const file=await readFile(new URL('./fixtures/short-180s.mp4',import.meta.url));
  q('INSERT INTO short_clip(id,owner,title) VALUES(?,?,?)',id,'author','Video').run();
  const response=await receiveShort(new Request(url,{method:'PUT',body:file}),null,q,'author',id,json,videos);
  assert.equal(response.status,200);
  assert.equal((await deleteShort(q,'viewer',id,json,null,videos)).status,403);
  assert.equal((await serveShort(new Request(url),null,q,id,json,videos)).status,200);
  assert.equal((await deleteShort(q,'author',id,json,null,videos)).status,200);
  assert.equal((await deleteShort(q,'author',id,json,null,videos)).status,200);
  assert.equal(media.prepare('SELECT count(*) AS n FROM parts').get().n,0);
  assert.equal((await object.fetch(new Request(url,{method:'PUT',body:file}))).status,404);
  assert.equal((await serveShort(new Request(url),null,q,id,json,videos)).status,404);
});

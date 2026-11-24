import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {deleteShort, shortAccount, shortSchema} from './short-videos.mjs';

test('author galleries include all published clips, paginate past 30, and keep deletion private to the author', async ()=>{
  const db=new DatabaseSync(':memory:');
  try {
    for(const sql of shortSchema) db.exec(sql);
    const q=(sql,...args)=>{
      const statement=db.prepare(sql);
      return {first:()=>statement.get(...args),all:()=>({results:statement.all(...args)}),run:()=>({meta:statement.run(...args)})};
    };
    const json=(body,status=200)=>({body,status});
    const gallery=(viewer,fields={})=>shortAccount(q,viewer,{op:'shortProfileList',...fields},json,true);
    const add=db.prepare('INSERT INTO short_clip(id,owner,title,object_key) VALUES(?,?,?,?)');
    const ids=Array.from({length:33},()=>crypto.randomUUID());
    ids.forEach((id,i)=>add.run(id,'author','clip '+i,'shorts/'+id));
    add.run(crypto.randomUUID(),'author','draft',null);
    add.run(crypto.randomUUID(),'someone-else','other','shorts/other');
    const own=(await gallery('author')).body;
    assert.equal(own.canDelete,true);
    assert.deepEqual(own.clips.map(c=>c.id),ids.slice(3).reverse());
    const visitor=(await gallery('visitor',{owner:'author',before:own.nextCursor})).body;
    assert.equal(visitor.canDelete,false);
    assert.deepEqual(visitor.clips.map(c=>c.id),ids.slice(0,3).reverse());
    assert.equal(visitor.nextCursor,null);
    for(const [viewer,permitted] of [['author',true],['visitor',false]]){
      const list=await shortAccount(q,viewer,{op:'shortList'},json,true);
      const lookup=await shortAccount(q,viewer,{op:'shortLookup',clip:ids[32]},json,true);
      assert.equal(list.body.clips.find(c=>c.id===ids[32]).canDelete,permitted);
      assert.equal(lookup.body.clip.canDelete,permitted);
    }
    assert.equal((await deleteShort(q,'visitor',ids[32],json,{},null)).status,403);
    const bucket={delete:async key=>assert.equal(key,'shorts/'+ids[32])};
    assert.equal((await deleteShort(q,'author',ids[32],json,bucket,null)).status,200);
    assert.equal((await gallery('visitor',{owner:'author'})).body.clips.some(c=>c.id===ids[32]),false);
    assert.deepEqual((await gallery('no-clips')).body.clips,[]);
    assert.equal((await gallery('author',{before:-1})).status,400);
  } finally { db.close(); }
});

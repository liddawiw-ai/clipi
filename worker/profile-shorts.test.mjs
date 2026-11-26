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
    const random=async(viewer,exclude)=>(await shortAccount(q,viewer,{op:'shortRandom',exclude},json,true)).body.clip;
    add.run(crypto.randomUUID(),'author','draft',null);
    assert.equal(await random('visitor',''),null);
    add.run(ids[0],'author','clip 0','shorts/'+ids[0]);
    assert.equal(await random('visitor',ids[0]),null);
    assert.deepEqual(await random('visitor',''),{id:ids[0],owner:'author',title:'clip 0',canDelete:false});
    add.run(ids[1],'author','clip 1','shorts/'+ids[1]);
    assert.deepEqual(await random('author',ids[0]),{id:ids[1],owner:'author',title:'clip 1',canDelete:true});
    for(let i=2;i<ids.length;i++)add.run(ids[i],'author','clip '+i,'shorts/'+ids[i]);
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

test('profile totals and the video follow button share account relationships', async ()=>{
  const db=new DatabaseSync(':memory:');
  try {
    for(const sql of shortSchema)db.exec(sql);
    db.exec('CREATE TABLE public_numbers(number TEXT PRIMARY KEY,uid TEXT,cost INTEGER); CREATE TABLE selected_number(uid TEXT PRIMARY KEY,number TEXT)');
    const q=(sql,...args)=>{
      const stmt=db.prepare(sql);
      return {first:()=>stmt.get(...args),run:()=>stmt.run(...args)};
    };
    const api=(viewer,op,fields={})=>shortAccount(q,viewer,{op,...fields},(body,status=200)=>({body,status}),true);
    const id=crypto.randomUUID();
    q('INSERT INTO short_clip(id,owner,title,object_key) VALUES(?,?,?,?)',id,'walid','Test','videos/'+id).run();
    q('INSERT INTO public_numbers VALUES(?,?,0)','1000001','walid').run();
    q('INSERT INTO public_numbers VALUES(?,?,0)','1000002','rania').run();
    q('INSERT INTO selected_number VALUES(?,?)','walid','99999').run();
    const snapshot=async(viewer,owner)=>{
      const {body}=await api(viewer,'shortProfileSocial',{owner});
      return [body.friends,body.followers,body.followingCount,body.following,body.number];
    };
    assert.deepEqual(await snapshot('rania','walid'),[0,0,0,false,'99999']);
    await api('rania','shortFollow',{clip:id,following:true});
    assert.deepEqual(await snapshot('rania','walid'),[0,1,0,true,'99999']);
    for(let i=0;i<2;i++)await api('walid','shortProfileFollow',{owner:'rania',following:true});
    assert.deepEqual(await snapshot('walid','rania'),[1,1,1,true,'1000002']);
    assert.deepEqual(await snapshot('rania','walid'),[1,1,1,true,'99999']);
    assert.deepEqual(await snapshot('outsider','walid'),[1,1,1,false,'99999']);
    await api('rania','shortProfileFollow',{owner:'walid',following:false});
    assert.equal((await api('rania','shortState',{clip:id})).body.following,false);
    assert.deepEqual(await snapshot('rania','walid'),[0,0,1,false,'99999']);
    assert.deepEqual(await snapshot('rania','rania'),[0,1,0,false,'1000002']);
    assert.equal((await api('walid','shortProfileFollow',{owner:'walid',following:true})).status,400);
    assert.equal((await api('walid','shortProfileFollow',{owner:'unknown',following:true})).status,404);
    assert.equal((await api('walid','shortProfileFollow',{owner:'rania',following:'true'})).status,400);
  } finally {db.close();}
});

test('friend requests require the recipient, preserve follows, and yield private inboxes and paginated profiles',async()=>{
  const db=new DatabaseSync(':memory:');
  try{
    for(const sql of shortSchema)db.exec(sql);
    db.exec('CREATE TABLE public_numbers(number TEXT PRIMARY KEY,uid TEXT,cost INTEGER); CREATE TABLE selected_number(uid TEXT PRIMARY KEY,number TEXT)');
    const q=(sql,...args)=>{
      const stmt=db.prepare(sql);
      return {first:()=>stmt.get(...args),run:()=>stmt.run(...args),all:()=>({results:stmt.all(...args)})};
    };
    const api=(uid,op,fields)=>shortAccount(q,uid,{op,...fields},(body,status=200)=>({body,status}),true);
    const change=(uid,owner,action)=>api(uid,'shortFriend',{owner,action,profile:{name:uid.toUpperCase()}});
    const people=(uid,owner,kind,after)=>api(uid,'shortProfilePeople',{owner,kind,after});
    for(const [n,uid] of ['aya','walid','third'].entries())q('INSERT INTO public_numbers VALUES(?,?,0)',String(1111111+n),uid).run();
    await change('aya','walid','request');await change('aya','walid','request');
    assert.equal((await change('walid','aya','request')).body.friendship,'incoming');
    assert.equal((await change('aya','walid','accept')).body.friendship,'outgoing');
    assert.equal((await people('third','walid','requests')).status,403);
    assert.equal((await people('third','walid',['requests'])).status,400);
    assert.deepEqual((await people('walid','walid','requests')).body.people.map(p=>[p.uid,p.name]),[['aya','AYA']]);
    assert.equal((await change('walid','aya','decline')).body.friendship,'none');
    await change('aya','walid','request');await change('aya','walid','cancel');
    assert.equal((await people('walid','walid','requests')).body.people.length,0);
    await change('aya','walid','request');
    const accepted=(await change('walid','aya','accept')).body;
    assert.deepEqual([accepted.friends,accepted.followers,accepted.followingCount],[1,0,0]);
    assert.equal((await change('walid','aya','accept')).body.friends,1);
    assert.deepEqual((await people('third','aya','friends')).body.people.map(p=>p.uid),['walid']);
    assert.equal((await people('walid','walid','requests')).body.people.length,0);
    q('INSERT INTO short_follow VALUES(?,?)','aya','walid').run();
    q('INSERT INTO short_follow VALUES(?,?)','walid','aya').run();
    assert.equal((await people('aya','walid','friends')).body.people.length,1);
    assert.equal((await change('aya','aya','request')).status,400);
    assert.equal((await change('aya','missing','request')).status,404);
    for(let i=0;i<32;i++)q('INSERT INTO short_follow VALUES(?,?)','f'+String(i).padStart(2,'0'),'walid').run();
    const first=(await people('aya','walid','followers')).body,rest=(await people('aya','walid','followers',first.next)).body;
    assert.equal(first.people.length,30);assert.equal(rest.next,null);
    assert.equal(new Set([...first.people,...rest.people].map(p=>p.uid)).size,33);
    assert.deepEqual((await people('aya','walid','followingCount')).body.people.map(p=>p.uid),['aya']);
    assert.equal((await people('aya','walid','bad')).status,400);
  }finally{db.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {roomStore} from './room-controls.mjs';
import {shortAccount} from './short-videos.mjs';
import {manageAppAdmin} from './app-admins.mjs';
import {agencyAccount} from './agencies.mjs';

test('search, hidden recommendations, private history and creator insights use published clips and the signed-in account',async ()=>{
  const db=new DatabaseSync(':memory:');
  try{
    const q=await roomStore({prepare(sql){return {sql,bind(...args){const stmt=db.prepare(sql);return {
      all:()=>({results:stmt.all(...args)}),first:()=>stmt.get(...args),run:()=>({meta:stmt.run(...args)})};}}},batch(stmts){for(const s of stmts)db.exec(s.sql);}});
    const json=(body,status=200)=>({body,status});
    const short=(uid,op,input={})=>shortAccount(q,uid,{op,...input},json,true);
    const clip=crypto.randomUUID(),other=crypto.randomUUID(),draft=crypto.randomUUID(),viewer='viewer',owner='uploader';
    for(const [id,title,key] of [[clip,'مطر عمّان','one'],[other,'رحلة إلى عمّان','two'],[draft,'draft',null]])await q('INSERT INTO short_clip VALUES(?,?,?,?)',id,owner,title,key).run();
    await q("INSERT INTO public_numbers VALUES('1234567',?,0)",owner).run();
    await short(owner,'shortIndexProfile',{name:'وليد'});
    for(const query of ['ولي','١٢٣٤٥٦٧'])assert.deepEqual((await short(viewer,'shortSearch',{kind:'accounts',query})).body.items.map(p=>p.uid),[owner]);
    assert.equal((await short(viewer,'shortSearch',{kind:'videos',query:'عمّان'})).body.items.length,2);
    assert.equal((await short(viewer,'shortSearch',{kind:'videos',query:'draft'})).body.items.length,0);
    await q("INSERT INTO room_public_number(room) VALUES('live-room')").run();
    assert.equal((await short(viewer,'shortSearchRoomId',{number:'1000001'})).body.room,'live-room');
    await short(viewer,'shortHide',{clip});
    assert.equal((await short(viewer,'shortRandom',{exclude:other})).body.clip,null);
    assert.deepEqual((await short(viewer,'shortList')).body.clips.map(c=>c.id),[other]);
    assert.equal((await short('another','shortRandom',{exclude:other})).body.clip.id,clip);
    const visit=crypto.randomUUID();
    for(const finished of [false,true,false,true])await short(viewer,'shortWatch',{clip,visit,finished});
    for(const uid of [owner,'another',viewer])await short(uid,'shortWatch',{clip,visit:crypto.randomUUID(),finished:false});
    assert.deepEqual({...((await short(owner,'shortInsights',{clip})).body)},{views:3,viewers:2,completed:1});
    assert.equal((await short(viewer,'shortInsights',{clip})).status,403);
    assert.deepEqual((await short('stranger','shortHistory',{viewer})).body.items,[]);
    assert.deepEqual((await short(viewer,'shortHistory')).body.items.map(c=>c.id),[clip]);
    await q('DELETE FROM short_clip WHERE id=?',clip).run();
    assert.deepEqual((await short(viewer,'shortHistory')).body.items,[]);

    const admin=(uid,op,input={})=>manageAppAdmin(q,uid,'root',{op,...input},json);
    const setting={number:'1234567',targetUid:owner,enabled:true};
    await admin('root','setAppAdmin',setting);await admin('root','setAppAdmin',setting);
    await admin('root','setAppAdmin',{...setting,enabled:false});
    for(const [applicant,status] of [['guest','approved'],['later','rejected']]){
      const agency=(user,op,rest)=>agencyAccount(q,user,'root',{op,...rest},json);
      const {body}=await agency(applicant,'agencyApply',{name:applicant,requestKey:crypto.randomUUID()});
      await agency('root','agencyDecide',{requestId:body.id,decision:status});
      await agency('root','agencyDecide',{requestId:body.id,decision:status});
    }
    const log=(await admin('root','adminDecisionLog')).body.items;
    assert.deepEqual(log.map(x=>x.kind),['rejected','approved','revoke','grant']);
    assert.ok(log.every(x=>x.actorName==='root'&&x.stamp>0));assert.equal(log[1].subject,'guest');
    assert.equal((await admin(viewer,'adminDecisionLog',{owner:true})).status,403);
  }finally{db.close();}
});

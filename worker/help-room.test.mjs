import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.mjs';

test('official help room accepts the first authenticated visitor after a day empty', async t=>{
  const sql=new DatabaseSync(':memory:');
  const db={prepare(query){return {query,bind(...args){const stmt=sql.prepare(query);return {
    first:()=>stmt.get(...args),all:()=>({results:stmt.all(...args)}),run:()=>({meta:stmt.run(...args)})
  }}}},batch(items){return items.map(s=>s.all?s.all():sql.exec(s.query))}};
  t.after(()=>sql.close());
  const project='test-project',id='clipi-admin-help';
  const env={PI_GIFTS_NETWORK:'mainnet',PI_GIFTS_DB:db,FIREBASE_PROJECT_ID:project,
    LIVEKIT_API_KEY:'test',LIVEKIT_API_SECRET:'test',LIVEKIT_URL:'wss://example.test',CLIPI_OWNER_UID:'team-owner'};
  t.mock.method(globalThis,'fetch',async(url,req)=>{
    assert(new URL(url).pathname.endsWith('accounts:lookup'));
    const token=JSON.parse(req.body).idToken;
    const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));
    return claims.sub==='unverified'?Response.json({}, {status:400}):Response.json({users:[{localId:claims.sub}]});
  });
  const sessions=new Map();
  async function post(uid,op,data={},path='/room-control'){
    if(!sessions.has(uid))sessions.set(uid,crypto.randomUUID());
    const payload=Buffer.from(JSON.stringify({aud:project,iss:'https://securetoken.google.com/'+project,sub:uid})).toString('base64url');
    const req=new Request('https://app.test'+path,{method:'POST',headers:{Authorization:'Bearer t.'+payload+'.t'},
      body:JSON.stringify({roomId:id,name:uid,session:sessions.get(uid),op,...data})});
    return worker.fetch(req,env);
  }
  async function directory(){
    const result=await worker.fetch(new Request('https://app.test/active-rooms'),env);
    return (await result.json()).supportRoom;
  }
  assert.equal((await directory()).id,id);
  const save=image=>({room:id,image});
  const jpeg='data:image/jpeg;base64,/9j/2Q==';
  const coverPath=revision=>'https://app.test/room-covers/'+id+'/'+revision+'.jpg';
  assert.equal((await post('first','roomCover',save(jpeg),'/account-number')).status,403);
  assert.equal((await post('team-owner','roomCover',save('broken'),'/account-number')).status,400);
  const saved=await (await post('team-owner','roomCover',save(jpeg),'/account-number')).json();
  assert.ok(saved.cover);
  assert.equal((await directory()).cover,saved.cover);
  assert.equal((await worker.fetch(new Request(coverPath(saved.cover)),env)).status,200);
  sql.prepare('INSERT INTO clipi_app_admin(uid) VALUES(?)').run('staff');
  const replaced=await (await post('staff','roomCover',save(jpeg),'/account-number')).json();
  assert.ok(replaced.cover);
  assert.notEqual(replaced.cover,saved.cover);
  assert.equal((await directory()).cover,replaced.cover);
  assert.equal((await post('first','roomCover',save(null),'/account-number')).status,403);
  assert.equal((await post('staff','roomCover',save(null),'/account-number')).status,200);
  assert.equal((await directory()).cover,null);
  assert.equal((await worker.fetch(new Request(coverPath(replaced.cover)),env)).status,404);
  assert.equal((await post('unverified','join')).status,401);
  const first=await (await post('first','join')).json();
  assert.deepEqual(first.people.map(p=>p.uid),['first']);
  assert.equal(first.appStaff,false);assert(first.media.token);
  assert.equal((await post('first','settings',{locked:true})).status,403);
  assert.equal((await post('first','leave')).status,200);
  assert.equal(sql.prepare('SELECT count(*) AS n FROM room_member WHERE room=?').get(id).n,0);
  const later=Date.now()+25*3600000;t.mock.method(Date,'now',()=>later);
  assert.equal((await directory()).name,'غرفة أدمن كليبي');
  const next=await (await post('second','join')).json();assert.deepEqual(next.people.map(p=>p.uid),['second']);
  await post('team-owner','join');
  assert.equal((await post('team-owner','settings',{slow:5})).status,200);
  assert.equal((await post('team-owner','settings',{pin:'1234'})).status,403);
  assert.equal((await post('team-owner','close',{},'/close-room')).status,403);
  await post('team-owner','leave');
  assert.deepEqual((await (await post('second','poll')).json()).people.map(p=>p.uid),['second']);
});

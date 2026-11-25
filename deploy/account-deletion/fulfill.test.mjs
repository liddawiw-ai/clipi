import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {roomStore} from '../../worker/room-controls.mjs';
import {supportCase} from '../../worker/support-case.mjs';
import {operatorErasure,piAccountUid} from '../../worker/account-erasure.mjs';
import {fulfill} from './fulfill.mjs';

test('a confirmed request clears both stores and Auth, resumes after failure and isolates another owner',async t=>{
  assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:\d+$/);
  assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST||'',/^127\.0\.0\.1:\d+$/);
  const project='demo-clipi-erasure',app=initializeApp({projectId:project},crypto.randomUUID());
  const db=getFirestore(app),auth=getAuth(app),sql=new DatabaseSync(':memory:');
  t.after(async()=>{sql.close();await db.terminate();await deleteApp(app)});
  function prepare(query,args=[]){
    const statement=sql.prepare(query);
    return {bind:(...v)=>prepare(query,v),run:()=>({meta:statement.run(...args)}),first:()=>statement.get(...args),all:()=>({results:statement.all(...args)})};
  }
  const d1={prepare:query=>({bind:(...v)=>prepare(query,v),run:()=>sql.exec(query),query}),
    batch(items){sql.exec('BEGIN');try{for(const x of items)x.query?sql.exec(x.query):x.run();sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}}};
  const me='pi:'+crypto.randomUUID(),other=crypto.randomUUID(),ticket=crypto.randomUUID(),secret=crypto.randomUUID();
  const q=await roomStore(d1), clip=crypto.randomUUID(), sibling=crypto.randomUUID(), room=crypto.randomUUID();
  const media=new Set(['fixture.mp4','keep.mp4']);let retry=true;
  const env={PI_GIFTS_DB:d1,PI_GIFTS_NETWORK:'mainnet',FIREBASE_PROJECT_ID:project,CLIPI_ERASURE_KEY:secret,
    SHORT_VIDEOS:{delete(key){if(retry){retry=false;throw Error('test storage outage')}media.delete(key)}}};
  const call=(action,fields={},key=secret)=>operatorErasure(new Request('http://localhost/internal/account-deletion',{
    method:'POST',headers:{Authorization:'Bearer '+key},body:JSON.stringify({project,ticket,action,...fields})}),env,roomStore,(body,status=200)=>Response.json(body,{status}));
  async function request(action,fields){
    const r=await call(action,fields);if(!r.ok)throw Error('failed '+action+' '+r.status);return r.json();
  }
  await supportCase(q,me,'other-owner',{op:'caseCreate',kind:'deletion',id:ticket},x=>x);
  await Promise.all([me,other].map(async uid=>{
    await auth.createUser({uid});await db.doc('users/'+uid).set({displayName:uid});
  }));
  await db.doc('rooms/'+room).set({ownerUid:me,status:'open',name:'My room'});
  await db.doc('rooms/'+room+'/messages/a').set({userUid:me,text:'delete'});
  await db.doc('rooms/'+room+'/messages/b').set({userUid:other,text:'keep'});
  await db.doc('users/'+other+'/blocked/'+me).set({createdAt:1});
  await db.doc('users/'+me+'/blocked/'+other).set({createdAt:1});
  for(const [id,uid,file] of [[clip,me,'fixture.mp4'],[sibling,other,'keep.mp4']]){
    q('INSERT INTO short_clip VALUES(?,?,?,?)',id,uid,'video',file).run();
    q('INSERT INTO short_comment VALUES(?,?,?,?)',sibling,uid,crypto.randomUUID(),'comment').run();
  }
  q('INSERT INTO room_host(room,uid) VALUES(?,?)',room,me).run();
  for(const uid of [me,other]) q('INSERT INTO room_chat(room,uid,name,text) VALUES(?,?,?,?)',room,uid,'name','comment').run();
  q('INSERT INTO room_cover VALUES(?,?,?)',room,crypto.randomUUID(),'photo').run();
  assert.equal((await call('start',{},'wrong')).status,404);
  assert.equal((await call('start',{ticket:crypto.randomUUID()})).status,404);
  let clock=Date.now();
  const run=()=>fulfill({db,auth,request,ticket,now:()=>clock});
  const waiting=await run();
  assert.equal(waiting.state,'waiting');assert.equal((await auth.getUser(me)).disabled,true);
  assert.equal((await call('finish')).status,409);
  clock=waiting.resumeAt+1;
  await assert.rejects(run,/failed content 503/);
  assert.equal(q('SELECT state FROM support_case WHERE id=?',ticket).first().state,'open');
  assert.equal((await run()).state,'completed');
  assert.equal((await run()).state,'completed');
  await assert.rejects(auth.getUser(me),e=>e.code==='auth/user-not-found');
  assert.equal((await auth.getUser(other)).disabled,false);
  assert.equal((await db.doc('users/'+me).get()).exists,false);
  assert.equal((await db.doc('users/'+other).get()).exists,true);
  assert.equal((await db.doc('users/'+other+'/blocked/'+me).get()).exists,false);
  assert.equal((await db.doc('rooms/'+room+'/messages/a').get()).exists,false);
  assert.equal((await db.doc('rooms/'+room+'/messages/b').get()).get('text'),'keep');
  assert.equal((await db.doc('rooms/'+room).get()).get('status'),'closed');
  assert.equal(q('SELECT 1 FROM room_cover WHERE root=?',room).first(),undefined);
  assert.equal(q('SELECT 1 FROM short_clip WHERE owner=?',me).first(),undefined);
  assert.equal(q('SELECT 1 FROM short_comment WHERE uid=?',me).first(),undefined);
  assert.equal(q('SELECT COUNT(*) AS n FROM short_clip WHERE owner=?',other).first().n,1);
  assert.equal(q('SELECT COUNT(*) AS n FROM short_comment WHERE uid=?',other).first().n,1);
  assert.equal(q('SELECT COUNT(*) AS n FROM room_chat WHERE uid=?',me).first().n,0);
  assert.equal(q('SELECT COUNT(*) AS n FROM room_chat WHERE uid=?',other).first().n,1);
  assert.deepEqual([...media],['keep.mp4']);assert.notEqual(await piAccountUid(d1,me),me);
});

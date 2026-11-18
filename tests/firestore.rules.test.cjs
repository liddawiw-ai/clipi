'use strict';
const {test, before, after, beforeEach}=require('node:test');
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc,updateDoc,deleteDoc,serverTimestamp}=require('firebase/firestore');

let env,alice,bob,anon;
const db=(ctx)=>ctx.firestore();
const profile=(uid)=>({displayName:uid,avatar:'👤',updatedAt:serverTimestamp()});
const room=(ownerUid='alice')=>({name:'غرفة تجريبية',type:'audio',ownerUid,ownerName:ownerUid,createdAt:serverTimestamp(),status:'open'});
const message=(uid)=>({text:'رسالة اختبار',userUid:uid,userName:uid,createdAt:serverTimestamp()});
const report=(uid='bob')=>({roomId:'room1',reportedUid:'alice',messageId:'msg1',reporterUid:uid,reason:'رسالة مسيئة',createdAt:serverTimestamp(),status:'new'});

before(async()=>{
  if(!process.env.FIRESTORE_EMULATOR_HOST)throw new Error('Run via npm run test:firestore:emulator — the live Firebase project is never used');
  env=await initializeTestEnvironment({
    projectId:'demo-clipi-rules',
    firestore:{rules:fs.readFileSync('firestore.rules','utf8')}
  });
  alice=env.authenticatedContext('alice');bob=env.authenticatedContext('bob');
  anon=env.unauthenticatedContext();
});
beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context=>{
    await setDoc(doc(db(context),'rooms/room1'),room());
    await setDoc(doc(db(context),'rooms/room1/messages/msg1'),message('alice'));
    await setDoc(doc(db(context),'users/alice'),profile('alice'));
    await setDoc(doc(db(context),'users/bob'),profile('bob'));
  });
});
after(async()=>{if(env)await env.cleanup()});

test('anonymous cannot read rooms or profiles',async()=>{
  await assertFails(getDoc(doc(db(anon),'rooms/room1')));
  await assertFails(getDoc(doc(db(anon),'users/alice')));
});
test('signed-in users can read open room, but only their profile',async()=>{
  await assertSucceeds(getDoc(doc(db(bob),'rooms/room1')));
  await assertSucceeds(getDoc(doc(db(alice),'users/alice')));
  await assertFails(getDoc(doc(db(bob),'users/alice')));
});
test('users can create their own limited profile, not impersonate or add admin flags',async()=>{
  await assertSucceeds(setDoc(doc(db(alice),'users/alice'),profile('alice')));
  await assertFails(setDoc(doc(db(alice),'users/alice2'),profile('alice2')));
  await assertFails(setDoc(doc(db(alice),'users/bob'),profile('bob')));
  await assertFails(updateDoc(doc(db(alice),'users/alice'),{isAdmin:true}));
});
test('own profile updates allowed, other account modification denied',async()=>{
  await assertSucceeds(updateDoc(doc(db(alice),'users/alice'),{displayName:'علي'}));
  await assertFails(updateDoc(doc(db(bob),'users/alice'),{displayName:'مخترق'}));
  await assertFails(updateDoc(doc(db(alice),'users/alice'),{isAdmin:true}));
});
test('room creation restricted to authenticated owner with valid fields',async()=>{
  await assertSucceeds(setDoc(doc(db(alice),'rooms/fresh'),room('alice')));
  await assertFails(setDoc(doc(db(bob),'rooms/hijack'),room('alice')));
  await assertFails(setDoc(doc(db(anon),'rooms/anon'),room('alice')));
  await assertFails(setDoc(doc(db(alice),'rooms/bad'),{...room('alice'),isVerified:true}));
});
test('owner can close room; others cannot or reopen it',async()=>{
  await assertFails(updateDoc(doc(db(bob),'rooms/room1'),{status:'closed'}));
  await assertSucceeds(updateDoc(doc(db(alice),'rooms/room1'),{status:'closed'}));
  await assertFails(updateDoc(doc(db(alice),'rooms/room1'),{status:'open'}));
  await assertFails(deleteDoc(doc(db(alice),'rooms/room1')));
});
test('messages require authenticated author and valid text',async()=>{
  await assertSucceeds(setDoc(doc(db(bob),'rooms/room1/messages/msg2'),message('bob')));
  await assertFails(setDoc(doc(db(bob),'rooms/room1/messages/forgery'),message('alice')));
  await assertFails(setDoc(doc(db(anon),'rooms/room1/messages/anon'),message('alice')));
  await assertFails(setDoc(doc(db(bob),'rooms/room1/messages/empty'),{...message('bob'),text:''}));
  await assertFails(setDoc(doc(db(bob),'rooms/room1/messages/long'),{...message('bob'),text:'x'.repeat(501)}));
});
test('closed rooms reject new chat but allow reading existing chat',async()=>{
  await assertSucceeds(updateDoc(doc(db(alice),'rooms/room1'),{status:'closed'}));
  await assertFails(setDoc(doc(db(bob),'rooms/room1/messages/late'),message('bob')));
  await assertSucceeds(getDoc(doc(db(bob),'rooms/room1/messages/msg1')));
});
test('author and host can delete messages; other users cannot change existing messages',async()=>{
  await assertFails(deleteDoc(doc(db(bob),'rooms/room1/messages/msg1')));
  await assertFails(updateDoc(doc(db(alice),'rooms/room1/messages/msg1'),{text:'altered'}));
  await assertSucceeds(deleteDoc(doc(db(alice),'rooms/room1/messages/msg1')));
  await assertSucceeds(setDoc(doc(db(bob),'rooms/room1/messages/msg2'),message('bob')));
  await assertSucceeds(deleteDoc(doc(db(alice),'rooms/room1/messages/msg2')));
});
test('block list belongs to account owner only',async()=>{
  await assertSucceeds(setDoc(doc(db(alice),'users/alice/blocked/bob'),{createdAt:serverTimestamp()}));
  await assertFails(getDoc(doc(db(bob),'users/alice/blocked/bob')));
  await assertFails(deleteDoc(doc(db(bob),'users/alice/blocked/bob')));
  await assertFails(setDoc(doc(db(alice),'users/alice/blocked/alice'),{createdAt:serverTimestamp()}));
  await assertFails(setDoc(doc(db(alice),'users/alice/blocked/eve'),{createdAt:serverTimestamp(),admin:true}));
});
test('reports are write-only and reporter cannot impersonate another user',async()=>{
  await assertSucceeds(setDoc(doc(db(bob),'reports/good'),report('bob')));
  await assertFails(setDoc(doc(db(bob),'reports/fake'),report('alice')));
  await assertFails(setDoc(doc(db(bob),'reports/badid'),{...report('bob'),messageId:42}));
  await assertFails(getDoc(doc(db(bob),'reports/good')));
  await assertFails(updateDoc(doc(db(bob),'reports/good'),{status:'resolved'}));
});
test('unknown collections are denied by default',async()=>{
  await assertFails(setDoc(doc(db(alice),'admin/settings'),{owner:'alice'}));
  await assertFails(getDoc(doc(db(alice),'admin/settings')));
});

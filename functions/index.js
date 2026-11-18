'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
initializeApp();
const db=getFirestore();
const requireUser=request=>{
 if(!request.auth?.uid)throw new HttpsError('unauthenticated','Sign in first');
 return request.auth.uid;
};
const recentLogin=request=>{
 const t=Number(request.auth?.token?.auth_time||0);
 if(!t||Date.now()/1000-t>300)throw new HttpsError('failed-precondition','Please sign in again before deleting your account');
};
async function deleteQuery(query){
 while(true){
  const snap=await query.limit(200).get();
  if(snap.empty)return;
  const batch=db.batch();
  snap.docs.forEach(doc=>batch.delete(doc.ref));
  await batch.commit();
 }
}
async function redactReports(field,uid){
 // Keep safety evidence, but remove the user's identifying UID.
 while(true){
  const snap=await db.collection('reports').where(field,'==',uid).limit(100).get();
  if(snap.empty)return;
  const batch=db.batch();
  snap.docs.forEach(doc=>batch.update(doc.ref,{[field]:FieldValue.delete(),redactedAt:FieldValue.serverTimestamp()}));
  await batch.commit();
 }
}
exports.deleteMyAccount=onCall({enforceAppCheck:true,maxInstances:5,timeoutSeconds:540},async request=>{
 const uid=requireUser(request);recentLogin(request);
 // Delete authored messages across all rooms before removing the auth identity.
 await deleteQuery(db.collectionGroup('messages').where('userUid','==',uid));
 const owned=await db.collection('rooms').where('ownerUid','==',uid).get();
 for(const room of owned.docs){
  await room.ref.update({ownerUid:FieldValue.delete(),ownerName:'حساب محذوف',status:'closed'});
 }
 await redactReports('reporterUid',uid);
 await redactReports('reportedUid',uid);
 // Firestore delete() alone leaves subcollections behind.
 await db.recursiveDelete(db.collection('users').doc(uid));
 await getAuth().deleteUser(uid);
 return {ok:true};
});
exports.reviewReport=onCall({enforceAppCheck:true,maxInstances:5},async request=>{
 const uid=requireUser(request);
 const admin=await getAuth().getUser(uid);
 if(admin.customClaims?.moderator!==true)throw new HttpsError('permission-denied','Moderator access required');
 const {reportId,status}=request.data||{};
 if(typeof reportId!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(reportId)||!['reviewing','resolved','dismissed'].includes(status))
  throw new HttpsError('invalid-argument','Invalid report or status');
 const ref=db.collection('reports').doc(reportId);
 const snap=await ref.get();
 if(!snap.exists)throw new HttpsError('not-found','Report not found');
 await ref.update({status,reviewedBy:uid,reviewedAt:FieldValue.serverTimestamp()});
 return {ok:true};
});

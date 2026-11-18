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
// Server-authoritative occupancy; audio media requires a separate RTC provider.
exports.joinAudioSeat=onCall({enforceAppCheck:true,maxInstances:10},async request=>{
 const uid=requireUser(request);
 const {roomId,seat}=request.data||{};
 if(typeof roomId!=='string'||!/^[A-Za-z0-9]{1,128}$/.test(roomId)||!Number.isInteger(seat)||seat<1||seat>8)
  throw new HttpsError('invalid-argument','Invalid room or seat');
 const roomRef=db.collection('rooms').doc(roomId);
 const seatRef=roomRef.collection('audioSeats').doc(String(seat));
 await db.runTransaction(async tx=>{
  const room=await tx.get(roomRef);
  const existing=await tx.get(seatRef);
  if(!room.exists||room.get('status')!=='open'||room.get('type')!=='audio')
   throw new HttpsError('failed-precondition','Audio room is not open');
  if(seat===1&&room.get('ownerUid')!==uid)
   throw new HttpsError('permission-denied','Seat one belongs to the host');
  if(existing.exists&&existing.get('uid')!==uid)
   throw new HttpsError('already-exists','Seat occupied');
  tx.set(seatRef,{uid,joinedAt:FieldValue.serverTimestamp()},{merge:true});
 });
 return {ok:true,seat};
});
exports.leaveAudioSeat=onCall({enforceAppCheck:true,maxInstances:10},async request=>{
 const uid=requireUser(request);
 const {roomId,seat}=request.data||{};
 if(typeof roomId!=='string'||!/^[A-Za-z0-9]{1,128}$/.test(roomId)||!Number.isInteger(seat)||seat<1||seat>8)
  throw new HttpsError('invalid-argument','Invalid room or seat');
 const ref=db.collection('rooms').doc(roomId).collection('audioSeats').doc(String(seat));
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists)return;
  if(snap.get('uid')!==uid)throw new HttpsError('permission-denied','Not your seat');
  tx.delete(ref);
 });
 return {ok:true};
});
// Video guest signaling only: no RTC media or token is issued here.
exports.requestVideoGuest=onCall({enforceAppCheck:true,maxInstances:10},async request=>{
 const uid=requireUser(request);
 const {roomId}=request.data||{};
 if(typeof roomId!=='string'||!/^[A-Za-z0-9]{1,128}$/.test(roomId))
  throw new HttpsError('invalid-argument','Invalid room');
 const ref=db.collection('rooms').doc(roomId);
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists||snap.get('type')!=='video'||snap.get('status')!=='open')
   throw new HttpsError('failed-precondition','Video room unavailable');
  if(snap.get('ownerUid')===uid)throw new HttpsError('failed-precondition','Host cannot request guest seat');
  if(snap.get('guestUid'))throw new HttpsError('resource-exhausted','Guest seat occupied');
  const pending=snap.get('guestRequestUid');
  if(pending&&pending!==uid)throw new HttpsError('resource-exhausted','A guest request is pending');
  tx.update(ref,{guestRequestUid:uid,guestRequestAt:FieldValue.serverTimestamp()});
 });
 return {ok:true};
});
exports.respondVideoGuest=onCall({enforceAppCheck:true,maxInstances:10},async request=>{
 const uid=requireUser(request);
 const {roomId,accept}=request.data||{};
 if(typeof roomId!=='string'||!/^[A-Za-z0-9]{1,128}$/.test(roomId)||typeof accept!=='boolean')
  throw new HttpsError('invalid-argument','Invalid request');
 const ref=db.collection('rooms').doc(roomId);
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists||snap.get('ownerUid')!==uid||snap.get('type')!=='video'||snap.get('status')!=='open')
   throw new HttpsError('permission-denied','Only active host may respond');
  const guestUid=snap.get('guestRequestUid');
  if(!guestUid)throw new HttpsError('failed-precondition','No pending guest request');
  if(accept&&snap.get('guestUid'))throw new HttpsError('resource-exhausted','Guest seat occupied');
  tx.update(ref,{guestRequestUid:FieldValue.delete(),guestRequestAt:FieldValue.delete(),
   ...(accept?{guestUid,guestJoinedAt:FieldValue.serverTimestamp()}:{})});
 });
 return {ok:true};
});
exports.leaveVideoGuest=onCall({enforceAppCheck:true,maxInstances:10},async request=>{
 const uid=requireUser(request);
 const {roomId}=request.data||{};
 if(typeof roomId!=='string'||!/^[A-Za-z0-9]{1,128}$/.test(roomId))
  throw new HttpsError('invalid-argument','Invalid room');
 const ref=db.collection('rooms').doc(roomId);
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists)throw new HttpsError('not-found','Room not found');
  if(snap.get('guestUid')!==uid&&snap.get('ownerUid')!==uid)
   throw new HttpsError('permission-denied','Only guest or host may end guest session');
  tx.update(ref,{guestUid:FieldValue.delete(),guestJoinedAt:FieldValue.delete()});
 });
 return {ok:true};
});
// Stage 12: virtual-only gift ledger. No client minting, purchases or cash-outs.
const GIFT_PRICES=Object.freeze({rose:10,heart:50,cake:100,bear:300,ring:500,car:1000,rocket:2500,crown:5000,castle:10000,dragon:25000});
exports.sendVirtualGift=onCall({enforceAppCheck:true,maxInstances:10},async request=>{
 const senderUid=requireUser(request);
 const {roomId,giftId,requestId}=request.data||{};
 if(typeof roomId!=='string'||!/^[A-Za-z0-9]{1,128}$/.test(roomId)||
    typeof requestId!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(requestId)||
    !Object.prototype.hasOwnProperty.call(GIFT_PRICES,giftId))
  throw new HttpsError('invalid-argument','Invalid gift request');
 const price=GIFT_PRICES[giftId];
 const roomRef=db.collection('rooms').doc(roomId);
 const senderRef=db.collection('virtualWallets').doc(senderUid);
 const receiptRef=senderRef.collection('giftReceipts').doc(requestId);
 let outcome;
 await db.runTransaction(async tx=>{
  const [room,sender,receipt]=await Promise.all([tx.get(roomRef),tx.get(senderRef),tx.get(receiptRef)]);
  if(receipt.exists){
   if(receipt.get('roomId')!==roomId||receipt.get('giftId')!==giftId)
    throw new HttpsError('already-exists','Request ID reused with different gift');
   outcome={ok:true,duplicate:true,price};return;
  }
  if(!room.exists||room.get('status')!=='open')
   throw new HttpsError('failed-precondition','Room is not open');
  const hostUid=room.get('ownerUid');
  if(typeof hostUid!=='string'||!hostUid||hostUid===senderUid)
   throw new HttpsError('failed-precondition','Invalid gift recipient');
  const balance=sender.get('balance');
  if(!Number.isSafeInteger(balance)||balance<price)
   throw new HttpsError('failed-precondition','Insufficient funded virtual balance');
  const hostRef=db.collection('virtualWallets').doc(hostUid);
  const host=await tx.get(hostRef);
  const hostBalance=host.exists?host.get('balance'):0;
  if(!Number.isSafeInteger(hostBalance)||hostBalance<0||hostBalance>Number.MAX_SAFE_INTEGER-price)
   throw new HttpsError('failed-precondition','Recipient balance unavailable');
  tx.update(senderRef,{balance:balance-price,updatedAt:FieldValue.serverTimestamp()});
  tx.set(hostRef,{balance:hostBalance+price,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  tx.create(receiptRef,{roomId,giftId,price,recipientUid:hostUid,createdAt:FieldValue.serverTimestamp()});
  outcome={ok:true,duplicate:false,price};
 });
 return outcome;
});
// Stage 13 safety gate: money movement is OFF until provider, compliance and store approval.
const REAL_PAYMENTS_ENABLED=false;
const REAL_PAYOUTS_ENABLED=false;
exports.getFinancialAvailability=onCall({enforceAppCheck:true,maxInstances:5},async request=>{
 requireUser(request);
 return {
  purchasesEnabled:REAL_PAYMENTS_ENABLED,
  payoutsEnabled:REAL_PAYOUTS_ENABLED,
  withdrawableBalanceMinor:0,
  currency:'USD',
  reason:'Payments and cash withdrawals are not activated. Virtual gifts have no cash value.'
 };
});
exports.requestCashPayout=onCall({enforceAppCheck:true,maxInstances:5},async request=>{
 requireUser(request);
 // Never accept client-side balances, bank account details or payment destinations.
 if(!REAL_PAYOUTS_ENABLED)
  throw new HttpsError('failed-precondition','Cash payouts are not available');
 throw new HttpsError('unimplemented','A licensed payout provider and compliance workflow are required');
});
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
async function requireModerator(request){
 const uid=requireUser(request);
 const admin=await getAuth().getUser(uid);
 if(admin.customClaims?.moderator!==true)throw new HttpsError('permission-denied','Moderator access required');
 return uid;
}
exports.listReports=onCall({enforceAppCheck:true,maxInstances:5},async request=>{
 await requireModerator(request);
 const status=request.data?.status||'new';
 if(!['new','reviewing','resolved','dismissed'].includes(status))
  throw new HttpsError('invalid-argument','Invalid report status');
 const limit=Math.min(50,Math.max(1,Number(request.data?.limit)||20));
 if(!Number.isInteger(limit))throw new HttpsError('invalid-argument','Invalid page size');
 // Bound result size. Avoid exposing reports through public Firestore rules.
 const snapshot=await db.collection('reports').where('status','==',status).limit(limit).get();
 return {reports:snapshot.docs.map(doc=>({
  id:doc.id,roomId:doc.get('roomId')||null,messageId:doc.get('messageId')||null,
  reportedUid:doc.get('reportedUid')||null,reporterUid:doc.get('reporterUid')||null,
  reason:doc.get('reason')||'',status:doc.get('status')||'new',
  createdAt:doc.get('createdAt')?.toDate?.().toISOString?.()||null
 }))};
});
exports.reviewReport=onCall({enforceAppCheck:true,maxInstances:5},async request=>{
 const uid=await requireModerator(request);
 const {reportId,status}=request.data||{};
 if(typeof reportId!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(reportId)||!['reviewing','resolved','dismissed'].includes(status))
  throw new HttpsError('invalid-argument','Invalid report or status');
 const ref=db.collection('reports').doc(reportId);
 const snap=await ref.get();
 if(!snap.exists)throw new HttpsError('not-found','Report not found');
 await ref.update({status,reviewedBy:uid,reviewedAt:FieldValue.serverTimestamp()});
 return {ok:true};
});

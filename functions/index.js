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
 if(!t||Date.now()/1000-t>300)throw new HttpsError('failed-precondition','Please sign in again before this sensitive operation');
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
// Gift accounting policy: 2,000 eligible paid diamonds = 100 support points.
// Points are denominated in hundredths of a USD reference unit, not a cash balance.
// Distribution: host 55%, agent 10%, platform 35%. Actual cash settlement remains OFF.
const SUPPORT_POLICY=Object.freeze({diamondsPerHundredPoints:2000,hostPercent:55,agentPercent:10,platformPercent:35,pointsPerUsd:100,minConversionPoints:2000,diamondsPerConversionUsd:1100});
exports.getSupportPolicy=onCall({enforceAppCheck:true,maxInstances:5},async request=>{
 requireUser(request);
 return {...SUPPORT_POLICY,ownerPromotionalDiamonds:100000000,
  promotionalDiamondsGeneratePoints:false,payoutsEnabled:false};
});
// Preview a points redemption without trusting any client-supplied balance.
// The authoritative earnings ledger and settlement provider are not live yet.
exports.quoteSupportPointRedemption=onCall({enforceAppCheck:true,maxInstances:5},async request=>{
 requireUser(request);
 const {points,method}=request.data||{};
 if(!Number.isSafeInteger(points)||points<0||!['cash','diamonds'].includes(method))
  throw new HttpsError('invalid-argument','Invalid redemption quote');
 const eligible=points>=SUPPORT_POLICY.minConversionPoints;
 const usdMinor=eligible?points:0; // 100 points = USD 1; each point is one cent.
 const diamonds=eligible&&method==='diamonds'
  ?Math.floor(usdMinor*SUPPORT_POLICY.diamondsPerConversionUsd/100):0;
 return {eligible,minimumPoints:SUPPORT_POLICY.minConversionPoints,
  method,points,usdMinor,diamonds,executable:false,
  reason:eligible?'Quote only; verified earnings ledger and redemption are not active':'Below the 2,000-point minimum'};
});
exports.redeemSupportPoints=onCall({enforceAppCheck:true,maxInstances:5},async request=>{
 requireUser(request);
 throw new HttpsError('failed-precondition','Point redemption is disabled until a verified earnings ledger, settlement and compliant payouts are deployed');
});
// One-time 100 million promotional diamonds for an account explicitly marked owner
// through Firebase Auth custom claims. Never trust an owner flag from the client.
exports.claimOwnerPromotionalDiamonds=onCall({enforceAppCheck:true,maxInstances:5},async request=>{
 const uid=requireUser(request);
 const identity=await getAuth().getUser(uid);
 if(identity.customClaims?.clipiOwner!==true)
  throw new HttpsError('permission-denied','Verified owner role required');
 const walletRef=db.collection('virtualWallets').doc(uid);
 let balance;
 await db.runTransaction(async tx=>{
  const wallet=await tx.get(walletRef);
  if(wallet.get('ownerPromoGranted')===true){
   balance=wallet.get('promotionalBalance')||0;return;
  }
  // Do not grant if the wallet already carries an unverified legacy promotion.
  if(wallet.exists&&wallet.get('promotionalBalance')!==undefined)
   throw new HttpsError('failed-precondition','Promotional balance requires review');
  balance=100000000;
  tx.set(walletRef,{promotionalBalance:balance,ownerPromoGranted:true,
   updatedAt:FieldValue.serverTimestamp()},{merge:true});
 });
 return {ok:true,promotionalBalance:balance};
});
// Each authenticated account can claim its 100 welcome diamonds once.
// Welcome diamonds are real in-app gift credits but have zero cash/point value.
exports.claimWelcomeDiamonds=onCall({enforceAppCheck:true,maxInstances:10},async request=>{
 const uid=requireUser(request);
 const walletRef=db.collection('virtualWallets').doc(uid);
 let balance;
 await db.runTransaction(async tx=>{
  const wallet=await tx.get(walletRef);
  if(wallet.get('welcomeGranted')===true){
   balance=wallet.get('welcomeBalance')||0;return;
  }
  if(wallet.exists&&wallet.get('welcomeBalance')!==undefined)
   throw new HttpsError('failed-precondition','Existing welcome balance needs review');
  balance=100;
  tx.set(walletRef,{welcomeBalance:balance,welcomeGranted:true,
   updatedAt:FieldValue.serverTimestamp()},{merge:true});
 });
 return {ok:true,welcomeBalance:balance};
});
// Stage 12: virtual-only gift ledger. No client minting, purchases or cash-outs.
const GIFT_PRICES=Object.freeze({rose:10,heart:50,cake:100,bear:300,ring:500,car:1000,rocket:2500,crown:5000,castle:10000,dragon:25000});
exports.sendVirtualGift=onCall({enforceAppCheck:true,maxInstances:10},async request=>{
 const senderUid=requireUser(request);
 const {roomId,giftId,requestId,source='paid'}=request.data||{};
 if(!['paid','ownerPromo','welcome'].includes(source))throw new HttpsError('invalid-argument','Invalid balance source');
 if(source==='ownerPromo'){
  const identity=await getAuth().getUser(senderUid);
  if(identity.customClaims?.clipiOwner!==true)throw new HttpsError('permission-denied','Verified owner required');
 }
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
   if(receipt.get('roomId')!==roomId||receipt.get('giftId')!==giftId||receipt.get('source')!==source)
    throw new HttpsError('already-exists','Request ID reused with different gift');
   outcome={ok:true,duplicate:true,price};return;
  }
  if(!room.exists||room.get('status')!=='open')
   throw new HttpsError('failed-precondition','Room is not open');
  const hostUid=room.get('ownerUid');
  if(typeof hostUid!=='string'||!hostUid||hostUid===senderUid)
   throw new HttpsError('failed-precondition','Invalid gift recipient');
  const balance=sender.get(source==='ownerPromo'?'promotionalBalance':source==='welcome'?'welcomeBalance':'balance');
  if(!Number.isSafeInteger(balance)||balance<price)
   throw new HttpsError('failed-precondition','Insufficient funded virtual balance');
  if(source==='ownerPromo'||source==='welcome'){
   tx.update(senderRef,{[source==='ownerPromo'?'promotionalBalance':'welcomeBalance']:balance-price,updatedAt:FieldValue.serverTimestamp()});
   tx.create(receiptRef,{roomId,giftId,price,source,recipientUid:hostUid,
    eligibleSupportPoints:0,cashValueMinor:0,createdAt:FieldValue.serverTimestamp()});
   outcome={ok:true,duplicate:false,price,eligibleSupportPoints:0};return;
  }
  const hostRef=db.collection('virtualWallets').doc(hostUid);
  const host=await tx.get(hostRef);
  const hostBalance=host.exists?host.get('balance'):0;
  if(!Number.isSafeInteger(hostBalance)||hostBalance<0||hostBalance>Number.MAX_SAFE_INTEGER-price)
   throw new HttpsError('failed-precondition','Recipient balance unavailable');
  tx.update(senderRef,{balance:balance-price,updatedAt:FieldValue.serverTimestamp()});
  tx.set(hostRef,{balance:hostBalance+price,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  tx.create(receiptRef,{roomId,giftId,price,source,recipientUid:hostUid,createdAt:FieldValue.serverTimestamp()});
  outcome={ok:true,duplicate:false,price};
 });
 return outcome;
});
// Earnings wallets: separate from diamonds. No cash can be paid from this draft.
const {randomBytes,scryptSync,timingSafeEqual}=require('node:crypto');
const POINTS_MIN=2000,WITHDRAW_INTERVAL_MS=15*24*60*60*1000;
const roleFor=async uid=>{
 const identity=await getAuth().getUser(uid);
 return identity.customClaims?.clipiOwner===true?'owner':
  identity.customClaims?.clipiAgent===true?'agent':'host';
};
const validatePin=pin=>typeof pin==='string'&&/^\d{6}$/.test(pin);
const hashPin=(pin,salt)=>scryptSync(pin,salt,64).toString('hex');
const verifyPin=(pin,salt,stored)=>{
 if(typeof salt!=='string'||!/^[0-9a-f]{32}$/.test(salt)||typeof stored!=='string'||!/^[0-9a-f]{128}$/.test(stored))return false;
 const actual=Buffer.from(hashPin(pin,salt),'hex'),expected=Buffer.from(stored,'hex');
 return timingSafeEqual(actual,expected);
};
// Persist failed PIN attempts so a client cannot brute-force the wallet by restarting.
const PIN_MAX_FAILURES=5,PIN_LOCK_MS=15*60*1000;
async function checkWalletPin(ref,pin){
 let verified=false,locked=false;
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref),d=snap.data()||{};
  const now=Date.now(),until=d.pinLockedUntil?.toMillis?.()||0;
  if(until>now){locked=true;return;}
  if(!d.pinHash||!validatePin(pin)){return;}
  verified=verifyPin(pin,d.pinSalt,d.pinHash);
  if(verified){
   tx.set(ref,{pinFailedAttempts:0,pinLockedUntil:FieldValue.delete()},{merge:true});
  }else{
   const count=(Number.isInteger(d.pinFailedAttempts)?Math.max(0,d.pinFailedAttempts):0)+1;
   tx.set(ref,{pinFailedAttempts:count,pinLockedUntil:count>=PIN_MAX_FAILURES?
    new Date(now+PIN_LOCK_MS):FieldValue.delete()},{merge:true});
  }
 });
 if(locked)throw new HttpsError('resource-exhausted','Wallet PIN temporarily locked; try again in 15 minutes');
 if(!verified)throw new HttpsError('permission-denied','Wallet PIN incorrect');
}

exports.getEarningsWallet=onCall({enforceAppCheck:true,maxInstances:10},async request=>{
 const uid=requireUser(request),role=await roleFor(uid);
 const doc=await db.collection('earningsWallets').doc(uid).get();
 const data=doc.data()||{};
 // Unfunded balances are never inferred from gift totals or local diamonds.
 const available=Number.isSafeInteger(data.availablePoints)&&data.availablePoints>=0?data.availablePoints:0;
 const pending=Number.isSafeInteger(data.pendingPoints)&&data.pendingPoints>=0?data.pendingPoints:0;
 const last=data.lastPayoutRequestAt?.toMillis?.()||0;
 const nextEligibleAt=last?new Date(last+WITHDRAW_INTERVAL_MS).toISOString():null;
 const waitMs=Math.max(0,last+WITHDRAW_INTERVAL_MS-Date.now());
 return {role,availablePoints:available,pendingPoints:pending,
  availableUsdMinor:available,pendingUsdMinor:pending,
  minimumPoints:POINTS_MIN,remainingPoints:Math.max(0,POINTS_MIN-available),
  pinConfigured:typeof data.pinHash==='string',nextEligibleAt,
  canRequest:available>=POINTS_MIN&&waitMs===0,
  payoutProcessingBusinessDays:5,payoutsEnabled:false};
});
exports.setEarningsWalletPin=onCall({enforceAppCheck:true,maxInstances:5},async request=>{
 const uid=requireUser(request),{pin,currentPin}=request.data||{};
 if(!validatePin(pin))throw new HttpsError('invalid-argument','PIN must contain exactly 6 digits');
 const ref=db.collection('earningsWallets').doc(uid),snap=await ref.get(),data=snap.data()||{};
 if(data.pinHash){
  await checkWalletPin(ref,currentPin);
 }else recentLogin(request);
 const salt=randomBytes(16).toString('hex'),pinHash=hashPin(pin,salt);
 // Initial PIN set must not silently replace another concurrent PIN.
 await db.runTransaction(async tx=>{
  const current=await tx.get(ref);
  if((current.get('pinHash')||null)!==(data.pinHash||null))
   throw new HttpsError('aborted','Wallet PIN changed; retry');
  tx.set(ref,{pinSalt:salt,pinHash,pinUpdatedAt:FieldValue.serverTimestamp()},{merge:true});
 });
 return {ok:true};
});
exports.previewEarningsWithdrawal=onCall({enforceAppCheck:true,maxInstances:5},async request=>{
 const uid=requireUser(request),{pin,method}=request.data||{};
 if(!['cash','diamonds'].includes(method)||!validatePin(pin))
  throw new HttpsError('invalid-argument','Invalid method or wallet PIN');
 const doc=await db.collection('earningsWallets').doc(uid).get(),d=doc.data()||{};
 await checkWalletPin(db.collection('earningsWallets').doc(uid),pin);
 const points=Number.isSafeInteger(d.availablePoints)&&d.availablePoints>=0?d.availablePoints:0;
 const last=d.lastPayoutRequestAt?.toMillis?.()||0;
 const eligible=points>=POINTS_MIN&&Date.now()-last>=WITHDRAW_INTERVAL_MS;
 return {eligible,points,remainingPoints:Math.max(0,POINTS_MIN-points),
  usdMinor:eligible?points:0,diamonds:eligible&&method==='diamonds'&&points<=Math.floor(Number.MAX_SAFE_INTEGER/11)?points*11:0,
  method,processingBusinessDays:5,executable:false,
  reason:'Preview only; no verified financial ledger or payout provider deployed'};
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
// Stage 14: never run monetary or withdrawable Greedy Star rounds on this backend.
exports.getGreedyStarAvailability=onCall({enforceAppCheck:true,maxInstances:5},async request=>{
 requireUser(request);
 return {realMoneyEnabled:false,paidStakesEnabled:false,withdrawablePrizesEnabled:false,
  reason:'Greedy Star is a development-only simulation; no paid wagers or cash prizes.'};
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
 // Remove promotional gift receipts and balances; do not silently destroy unsettled financial records.
 await db.recursiveDelete(db.collection('virtualWallets').doc(uid));
 const earningsRef=db.collection('earningsWallets').doc(uid);
 const earnings=await earningsRef.get();
 if(earnings.exists){
  const d=earnings.data()||{};
  if((d.availablePoints||0)===0&&(d.pendingPoints||0)===0&&!d.lastPayoutRequestAt){
   await earningsRef.delete();
  }else{
   await earningsRef.update({pinHash:FieldValue.delete(),pinSalt:FieldValue.delete(),
    pinFailedAttempts:FieldValue.delete(),pinLockedUntil:FieldValue.delete(),
    accountDeletedAt:FieldValue.serverTimestamp()});
  }
 }
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

'use strict';
// Firebase Functions v2 callable; secret is injected only on the server.
// LiveKit project URL and API key are configuration, API secret is Secret Manager.
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {getFirestore}=require('firebase-admin/firestore');
const {AccessToken}=require('livekit-server-sdk');

const LIVEKIT_API_SECRET=defineSecret('LIVEKIT_API_SECRET');

const issueVoiceToken=onCall({
  enforceAppCheck:true,
  secrets:[LIVEKIT_API_SECRET],
  maxInstances:10
},async request=>{
  const uid=request.auth?.uid;
  if(!uid)throw new HttpsError('unauthenticated','Sign in first');
  const roomId=request.data?.roomId;
  if(typeof roomId!=='string'||!/^[A-Za-z0-9]{1,128}$/.test(roomId))
    throw new HttpsError('invalid-argument','Invalid room ID');

  const db=getFirestore();
  const roomRef=db.collection('rooms').doc(roomId);
  const room=await roomRef.get();
  if(!room.exists||room.get('status')!=='open'||room.get('type')!=='audio')
    throw new HttpsError('failed-precondition','Audio room unavailable');

  const url=process.env.LIVEKIT_URL;
  const apiKey=process.env.LIVEKIT_API_KEY;
  const secret=LIVEKIT_API_SECRET.value();
  if(!url||!/^wss:\/\/[a-zA-Z0-9.-]+$/.test(url)||!apiKey||!secret)
    throw new HttpsError('unavailable','LiveKit server not configured');

  // Grant publishing only when the server's Firestore seat lease is owned by UID.
  // Other participants may listen but cannot broadcast.
  const seats=await roomRef.collection('audioSeats').get();
  const ownsSeat=seats.docs.some(d=>d.get('uid')===uid&&
    Number(d.id)>=1&&Number(d.id)<=8);

  const token=new AccessToken(apiKey,secret,{identity:uid,ttl:'15m'});
  token.addGrant({
    roomJoin:true,
    room:roomId,
    canSubscribe:true,
    canPublish:ownsSeat,
    canPublishSources:ownsSeat?['microphone']:[],
    canPublishData:false
  });
  return {url,token:await token.toJwt(),canPublish:ownsSeat};
});

module.exports={issueVoiceToken};

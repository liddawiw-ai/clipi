// Firebase Functions v1 endpoint. Import and export issueVoiceToken
// from your deployed functions index.js.
// Server dependencies: firebase-functions, firebase-admin, livekit-server-sdk.
const functions=require('firebase-functions');
const admin=require('firebase-admin');
const {AccessToken}=require('livekit-server-sdk');

if(!admin.apps.length)admin.initializeApp();

exports.issueVoiceToken=functions.https.onCall(async(data,context)=>{
  if(!context.auth?.uid){
    throw new functions.https.HttpsError('unauthenticated','Sign in first');
  }
  const roomId=data?.roomId;
  if(typeof roomId!=='string'||roomId.length<1||roomId.length>128||
    !/^[a-zA-Z0-9_-]+$/.test(roomId)){
    throw new functions.https.HttpsError('invalid-argument','Invalid room ID');
  }
  const doc=await admin.firestore().collection('rooms').doc(roomId).get();
  if(!doc.exists||doc.data()?.status!=='open'){
    throw new functions.https.HttpsError('failed-precondition','Room is not open');
  }
  const url=process.env.LIVEKIT_URL;
  const key=process.env.LIVEKIT_API_KEY;
  const secret=process.env.LIVEKIT_API_SECRET;
  if(!url||!key||!secret){
    throw new functions.https.HttpsError('unavailable','Voice provider not configured');
  }
  // Initial phase: listen-only. Seat ownership and mic grants must be
  // server-authorized before enabling publish for a participant.
  const token=new AccessToken(key,secret,{
    identity:context.auth.uid,
    ttl:'15m'
  });
  token.addGrant({
    roomJoin:true,
    room:roomId,
    canSubscribe:true,
    canPublish:false,
    canPublishData:false
  });
  return {url,token:await token.toJwt()};
});

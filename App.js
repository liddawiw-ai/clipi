import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,ScrollView,StyleSheet,Alert,Animated,Keyboard,KeyboardAvoidingView,Platform,StatusBar,Dimensions,Share} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {LoginManager,AccessToken,AuthenticationToken} from 'react-native-fbsdk-next';
import * as Crypto from 'expo-crypto';
import {registerRootComponent} from 'expo';
import {AudioSession,LiveKitRoom,VideoTrack,isTrackReference,registerGlobals,useConnectionState,useLocalParticipant,useParticipants,useTracks} from '@livekit/react-native';
import {ConnectionState,Track} from 'livekit-client';

registerGlobals();
const MEDIA_ENDPOINT=process.env.EXPO_PUBLIC_CLIPI_MEDIA_URL?.trim().replace(/\/+$/,'')||'';
const MEDIA_CONFIGURED=/^https:\/\//i.test(MEDIA_ENDPOINT);

const {width:WIDTH,height:HEIGHT}=Dimensions.get('window');
const PINK='#f43b80',GOLD='#ffe39a',BLUE='#0758b7';
const WELCOME=1000,OWNER_DEMO=5000000;
const REAL_PURCHASES_ENABLED=false,REAL_PAYOUTS_ENABLED=false;
// Hide financial/game/gift simulations in release builds. They remain available for development testing.
const SHOW_UNRELEASED_DEMOS=__DEV__;
const db=firestore();
// ضع Web OAuth Client ID من Firebase/Google Cloud بعد تفعيل Google.
const GOOGLE_WEB_CLIENT_ID=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID||'';
const FACEBOOK_CONFIGURED=Boolean(process.env.FACEBOOK_APP_ID&&process.env.FACEBOOK_CLIENT_TOKEN);
const GIFTS=[['🌹','وردة',10,'rose'],['💖','قلب',50,'heart'],['🎂','كيكة',100,'cake'],['🧸','دبدوب',300,'bear'],['💍','خاتم',500,'ring'],['🏎️','سيارة فاخرة',1000,'car'],['🚀','صاروخ',2500,'rocket'],['👑','تاج ملكي',5000,'crown'],['🏰','قصر',10000,'castle'],['🐉','تنين ذهبي',25000,'dragon']];
const GOODS=[['🖼️','إطار فضي',250,'frame'],['💜','إطار بنفسجي',1200,'frame'],['👑','إطار أسطوري',5000,'frame'],['🚙','دخول بسيارة',1500,'ride'],['🏎️','دخول رياضي',4000,'ride'],['🚀','دخول بصاروخ',9000,'ride']];
const FOOD=[['🥕','جزر',5],['🦐','جمبري',10],['🥦','بروكلي',5],['🥩','لحم',15],['🥬','خضار',5],['🍗','دجاج',25],['🌽','ذرة',5],['🐟','سمك',45]];
const COUNTRIES=[['🇯🇴 الأردن','+962'],['🇸🇦 السعودية','+966'],['🇦🇪 الإمارات','+971'],['🇵🇸 فلسطين','+970'],['🇪🇬 مصر','+20'],['🇱🇧 لبنان','+961'],['🇸🇾 سوريا','+963'],['🇮🇶 العراق','+964']];
const AVATARS=['👤','😎','👩','👨','🧑','👸','🤴','🦁','🐼','🦊','🌸','⭐'];
const PACKS=[1000,2000,5000,10000,20000,50000];

// قنوات استقبال الأرباح المعروضة للمستخدم؛ لا توجد تحويلات حقيقية مفعلة.
// القوائم إرشادية ويمكن تحديثها من الخادم عند إتاحة مزود دفع.
const PAYOUT_COUNTRIES=[
  ['JO','الأردن','JOD'],['EG','مصر','EGP'],
  ['IQ','العراق','IQD'],['SA','السعودية','SAR'],
  ['AE','الإمارات','AED'],['PS','فلسطين','ILS'],
  ['LB','لبنان','USD'],['OTHER','دولة أخرى','USD']
];
const PAYOUT_WALLETS={
  JO:[
    'Zain Cash الأردن','Orange Money الأردن','UWallet الأردن',
    'Dinarak','Alawneh Pay','GateToPay Wallet',
    'MEPS National Wallet','Mad Pay'
  ],
  EG:[
    'Vodafone Cash','Orange Cash','e& money / Etisalat Cash',
    'WE Pay','الأهلي فون كاش','BM Wallet - بنك مصر',
    'QNB Wallet','CIB Smart Wallet','ALEXBANK Wallet',
    'محفظة بنك مصري أخرى'
  ],
  IQ:['ZainCash العراق','محفظة عراقية أخرى'],
  SA:['stc pay / STC Bank','محفظة سعودية أخرى'],
  AE:['e& money','محفظة إماراتية أخرى'],
  PS:['محفظة فلسطينية محلية'],
  LB:['محفظة لبنانية محلية'],
  OTHER:['محفظة أخرى - اكتب اسمها']
};

const fmt=x=>Number(x||0).toLocaleString('en-US');

function Btn({title,onPress,color=PINK,disabled=false}){return <TouchableOpacity disabled={disabled} onPress={onPress} style={[S.btn,{backgroundColor:disabled?'#666':color}]}><Text style={S.white}>{title}</Text></TouchableOpacity>}
function Small({title,onPress,color='#295098'}){return <TouchableOpacity onPress={onPress} style={[S.small,{backgroundColor:color}]}><Text style={S.white}>{title}</Text></TouchableOpacity>}

function GiftFX({gift,onDone}){
  const progress=useRef(new Animated.Value(0)).current;
  const kind=gift[3];
  useEffect(()=>{
    progress.setValue(0);
    const duration=kind==='dragon'?6300:kind==='rose'?4600:kind==='rocket'?4200:3300;
    const animation=Animated.timing(progress,{toValue:1,duration,useNativeDriver:true});
    animation.start(({finished})=>{if(finished)onDone()});
    return ()=>animation.stop();
  },[gift]);
  const move=(inputRange,outputRange)=>progress.interpolate({inputRange,outputRange});
  const opacity=move([0,.08,.87,1],[0,1,1,0]);
  const scale=move([0,.42,.8,1],[.2,1.2,1,1.15]);
  const glow=move([0,.2,.5,.8,1],[0,1,.2,1,0]);
  let shape;
  if(kind==='rose') shape=<View style={S.fxCenter}>
    <Animated.Text style={[S.fxIcon,{opacity:move([0,.3,.65,1],[1,1,0,0]),transform:[{scale}]}]}>🌷</Animated.Text>
    <Animated.Text style={[S.fxIcon,{position:'absolute',opacity:move([0,.3,.65,1],[0,0,1,1]),transform:[{scale:move([0,1],[.2,1.7])}]}]}>🌹</Animated.Text>
  </View>;
  else if(kind==='rocket') shape=<Animated.View style={[S.fxCenter,{transform:[{translateY:move([0,1],[HEIGHT*.7,-HEIGHT*.95])}]}]}><Text style={S.fxIcon}>🚀</Text><Text style={S.fxFire}>🔥</Text></Animated.View>;
  else if(kind==='car') shape=<Animated.View style={[S.fxCenter,{transform:[{translateX:move([0,.35,.7,1],[-WIDTH,0,0,WIDTH])}]}]}><Text style={S.fxIcon}>🏎️</Text></Animated.View>;
  else if(kind==='crown') shape=<Animated.View style={[S.fxCenter,{transform:[{translateY:move([0,.6,1],[-HEIGHT*.45,0,0])},{scale}]}]}><Text style={S.fxIcon}>👑</Text></Animated.View>;
  else if(kind==='dragon') shape=<>
    <Animated.View style={[S.fxCenter,{transform:[{translateX:move([0,.22,.48,.72,1],[-WIDTH,WIDTH*.3,WIDTH*.4,-WIDTH*.3,0])},{translateY:move([0,.22,.48,.72,1],[HEIGHT*.2,-HEIGHT*.2,HEIGHT*.1,HEIGHT*.15,-20])},{rotate:move([0,.25,.5,.75,1],['-25deg','30deg','155deg','320deg','360deg'])},{scale}]}]}>
      <Text style={[S.fxIcon,{fontSize:170,textShadowColor:GOLD,textShadowRadius:22}]}>🐉</Text><Text style={S.fxSpark}>✦ ✨ ✦</Text>
    </Animated.View>
    <Animated.Text style={[S.fxFire,{position:'absolute',top:'45%',opacity:move([0,.73,.84,.95,1],[0,0,1,1,0]),transform:[{scale:move([0,.8,1],[.3,1,2.1])}]}]}>🔥🔥🔥</Animated.Text>
  </>;
  else shape=<Animated.View style={[S.fxCenter,{transform:[{scale},{rotate:kind==='ring'?move([0,1],['0deg','360deg']):'0deg'}]}]}><Text style={S.fxIcon}>{gift[0]}</Text></Animated.View>;
  return <Animated.View pointerEvents="none" style={[S.fxOverlay,{opacity}]}>{shape}<Animated.Text style={[S.fxSpark,{opacity:glow}]}>✧ ✨ ✧</Animated.Text></Animated.View>;
}

async function mediaRequest(path,body,signal){
  if(!MEDIA_CONFIGURED)throw new Error('عنوان خدمة البث غير مضبوط');
  const user=auth().currentUser;
  if(!user)throw new Error('انتهت جلسة الدخول');
  const idToken=await user.getIdToken();
  const response=await fetch(MEDIA_ENDPOINT+path,{
    method:'POST',signal,
    headers:{Authorization:'Bearer '+idToken,'Content-Type':'application/json'},
    body:JSON.stringify(body),
  });
  if(!response.ok)throw new Error('تعذر الاتصال بخدمة البث ('+response.status+')');
  return response.json();
}

function RoomMedia({room,userId,canPublish,audio,blocked,guests}){
  const [credentials,setCredentials]=useState(null);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!MEDIA_CONFIGURED)return;
    const start=AudioSession.startAudioSession();
    void start.catch(()=>setError('تعذر بدء جلسة الصوت'));
    return()=>{void start.catch(()=>{}).then(()=>AudioSession.stopAudioSession()).catch(()=>{});};
  },[]);
  useEffect(()=>{
    if(!MEDIA_CONFIGURED)return;
    const controller=new AbortController();
    let active=true;
    const timeout=setTimeout(()=>controller.abort(),12000);
    (async()=>{
      if(auth().currentUser?.uid!==userId)throw new Error('انتهت جلسة الدخول');
      const result=await mediaRequest('/token',{roomId:room.id},controller.signal);
      if(typeof result.token!=='string'||!/^wss:\/\//i.test(result.serverUrl))throw new Error('إعدادات البث غير صالحة');
      if(active)setCredentials({...result,canPublish});
    })().catch(e=>{
      if(active)setError(e.name==='AbortError'?'انتهت مهلة الاتصال بالبث':e.message);
    }).finally(()=>clearTimeout(timeout));
    return()=>{
      active=false;
      controller.abort();
      clearTimeout(timeout);
    };
  },[room.id,userId,attempt,canPublish]);
  useEffect(()=>{setError('');},[canPublish]);

  if(!MEDIA_CONFIGURED)return <Text style={mediaStyles.status}>عنوان خدمة البث غير مضبوط</Text>;
  if(error)return <View style={mediaStyles.notice}><Text style={mediaStyles.status}>{error}</Text><Small title="إعادة الاتصال" onPress={()=>{setCredentials(null);setError('');setAttempt(v=>v+1)}}/></View>;
  if(!credentials||credentials.canPublish!==canPublish)return <Text style={mediaStyles.status}>جاري الاتصال بالبث…</Text>;
  return <LiveKitRoom serverUrl={credentials.serverUrl} token={credentials.token} connect audio={false} video={false}
    onError={()=>setError('تعذر الاتصال بالبث')}
    onDisconnected={()=>setError('انقطع اتصال البث')}>
    <ConnectedMedia room={room} canPublish={canPublish} audio={audio} blocked={blocked} guests={guests}/>
  </LiveKitRoom>;
}

function ConnectedMedia({room,canPublish,audio,blocked,guests}){
  const state=useConnectionState();
  const {localParticipant,isMicrophoneEnabled,isCameraEnabled}=useLocalParticipant();
  const tracks=useTracks([Track.Source.Camera],{onlySubscribed:true});
  const participants=useParticipants();
  const guestCamera=tracks.find(track=>Object.prototype.hasOwnProperty.call(guests,track.participant.identity)&&!blocked.includes(track.participant.identity)&&isTrackReference(track));
  const seats=[[room.ownerUid,room.ownerName||'المضيف'],...Object.entries(guests)];

  const camera=tracks.find(track=>track.participant.identity===room.ownerUid&&isTrackReference(track));
  const [busy,setBusy]=useState(false);
  const pending=useRef(false);
  async function toggle(source){
    if(state!==ConnectionState.Connected||pending.current)return;
    pending.current=true;
    setBusy(true);
    try{
      if(source==='camera')await localParticipant.setCameraEnabled(!isCameraEnabled);
      else await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }catch{
      Alert.alert('تعذر تشغيل الوسائط','تحقق من أذونات الكاميرا والميكروفون.');
    }finally{
      pending.current=false;
      setBusy(false);
    }
  }
  return <>
    {!audio&&camera&&!blocked.includes(room.ownerUid)&&<VideoTrack trackRef={camera} style={StyleSheet.absoluteFillObject}/>}
    {!audio&&guestCamera&&<View pointerEvents="none" style={mediaStyles.guest}><VideoTrack trackRef={guestCamera} style={StyleSheet.absoluteFillObject}/></View>}
    {state!==ConnectionState.Connected?<Text style={mediaStyles.status}>جاري الاتصال بالبث…</Text>:
      audio?<><Text style={S.seatHeading}>✦ المقاعد الملكية ✦</Text>
        <View style={S.seatGrid}>{Array.from({length:8},(_,i)=>{
          const [uid,label]=seats[i]||[];
          const person=participants.find(participant=>participant.identity===uid);
          return <View key={i} style={S.seatItem}>
          <View style={S.throne}><Text style={S.throneCrown}>♛</Text><Text style={{fontSize:27}}>{person?.isMicrophoneEnabled?'🎙️':'💺'}</Text></View>
          <Text numberOfLines={1} style={S.tiny}>{label||`مقعد ${i+1}`}</Text>
        </View>})}</View></>:
        !camera&&<Text style={mediaStyles.status}>كاميرا المضيف مغلقة</Text>}
    {canPublish&&state===ConnectionState.Connected&&!busy&&<View style={mediaStyles.controls}>
      <Small title={isMicrophoneEnabled?'كتم الميكروفون':'تشغيل الميكروفون'} onPress={()=>toggle('microphone')}/>
      {!audio&&<Small title={isCameraEnabled?'إغلاق الكاميرا':'تشغيل الكاميرا'} onPress={()=>toggle('camera')}/>}
    </View>}
  </>;
}

const mediaStyles=StyleSheet.create({
  status:{textAlign:'center',color:'white',padding:10,backgroundColor:'#142338'},
  notice:{alignItems:'center'},
  requests:{maxHeight:110,backgroundColor:"#142338"},
  guest:{position:'absolute',right:12,bottom:185,width:116,height:150,zIndex:2,overflow:'hidden',borderRadius:12,borderWidth:2,borderColor:GOLD},
  controls:{flexDirection:'row',justifyContent:'center',gap:8,padding:8},
});

function Room({room,userId,username,avatar,diamonds,onSendGift,onExit}){
  const audio=room.type==='audio';
  const isHost=room.ownerUid===userId;
  const [chat,setChat]=useState([]),[message,setMessage]=useState(''),[sending,setSending]=useState(false);
  const [giftOpen,setGiftOpen]=useState(false),[fx,setFx]=useState(null),[fxId,setFxId]=useState(0),[keyboardOn,setKeyboardOn]=useState(false);
  const roomRef=db.collection('rooms').doc(room.id);
  const requestsRef=roomRef.collection('stageRequests');
  const [guests,setGuests]=useState({});
  const [requests,setRequests]=useState([]);
  const [requested,setRequested]=useState(false);
  const [stageBusy,setStageBusy]=useState(false);
  const [stagePanelVisible,setStagePanelVisible]=useState(false);
  const stageLock=useRef(false);
  const isGuest=Object.prototype.hasOwnProperty.call(guests,userId);
  const chatRef=useRef(null);
  const [blocked,setBlocked]=useState([]);
  useEffect(()=>{
    if(!room?.id||!userId)return;
    const roomUnsub=db.collection('rooms').doc(room.id).onSnapshot(d=>{
      if(!d.exists||d.data()?.status==='closed'){
        Alert.alert('تم إغلاق الغرفة','أغلق المضيف الغرفة، لا يمكن إرسال رسائل جديدة.');
        onExit();
      }else{setGuests(d.data()?.stageGuests||{});}
    },e=>console.warn('Room status:',e.message));
    const un1=db.collection('rooms').doc(room.id).collection('messages').orderBy('createdAt','asc').limitToLast(100).onSnapshot(snapshot=>{
      setChat(snapshot.docs.map(d=>({id:d.id,...d.data()})));
    },e=>Alert.alert('المحادثة',e.message));
    const un2=db.collection('users').doc(userId).collection('blocked').onSnapshot(snapshot=>setBlocked(snapshot.docs.map(d=>d.id)),e=>console.warn('Blocked list:',e.message));
    const onStageError=e=>console.warn('Stage requests:',e.message);
    const stageUnsub=isHost
      ?requestsRef.orderBy('createdAt').limit(30).onSnapshot(snapshot=>setRequests(snapshot.docs.map(d=>({uid:d.id,...d.data()}))),onStageError)
      :requestsRef.doc(userId).onSnapshot(snapshot=>setRequested(snapshot.exists),onStageError);
    return()=>{roomUnsub();un1();un2();stageUnsub()};
  },[room?.id,userId]);
  async function stageAction(action,uid=userId){
    if(stageLock.current)return;
    stageLock.current=true;
    setStageBusy(true);
    try{
      const requestRef=requestsRef.doc(uid);
      if(action==='request'){
        await requestRef.set({name:username.slice(0,35)||'مستخدم',createdAt:firestore.FieldValue.serverTimestamp()});
      }else if(action==='approve'){
        await db.runTransaction(async tx=>{
          const live=await tx.get(roomRef);
          const request=await tx.get(requestRef);
          if(live.data()?.status!=='open'||!request.exists)throw new Error('الطلب لم يعد متاحًا');
          const members=live.data().stageGuests||{};
          if(Object.keys(members).length>=(audio?7:1))throw new Error('كل المقاعد المتاحة ممتلئة');
          tx.update(roomRef,{stageGuests:{...members,[uid]:request.data().name}});
          tx.delete(requestRef);
        });
      }else if(action==='remove'){
        await db.runTransaction(async tx=>{
          const live=await tx.get(roomRef);
          const members={...live.data()?.stageGuests};
          delete members[uid];
          tx.update(roomRef,{stageGuests:members});
        });
        if(MEDIA_CONFIGURED)await mediaRequest('/remove-guest',{roomId:room.id,uid});
      }else{
        await requestRef.delete();
      }
    }catch(e){Alert.alert('إدارة المقاعد',e.message);}
    finally{stageLock.current=false;setStageBusy(false);}
  }
  function stagePanel(){
    if(!isHost)return isGuest?null:<Small title={requested?'إلغاء الطلب':audio?'طلب مقعد':'طلب الانضمام كضيف'} onPress={()=>stageAction(requested?'cancel':'request')}/>;
    return <Small title={`المقاعد (${Object.keys(guests).length}) · الطلبات (${requests.length})`} onPress={()=>setStagePanelVisible(v=>!v)}/>;
  }
  async function moderateMessage(m){
    if(!m?.id||!userId)return;
    const ownMessage=m.userUid===userId;
    const options=[];
    if(ownMessage||isHost)options.push({text:'حذف الرسالة',style:'destructive',onPress:()=>Alert.alert('حذف الرسالة','هل تريد حذف هذه الرسالة للجميع؟',[
      {text:'إلغاء',style:'cancel'},
      {text:'حذف',style:'destructive',onPress:async()=>{
        try{await db.collection('rooms').doc(room.id).collection('messages').doc(m.id).delete()}
        catch(e){Alert.alert('تعذر حذف الرسالة',e.message)}
      }}])});
    if(m.userUid&&!ownMessage){
      options.push({text:'إبلاغ',onPress:async()=>{
        try{await db.collection('reports').add({roomId:room.id,reportedUid:m.userUid,messageId:m.id,reporterUid:userId,reason:'رسالة مسيئة',createdAt:firestore.FieldValue.serverTimestamp(),status:'new'});Alert.alert('تم إرسال البلاغ')}
        catch(e){Alert.alert('تعذر الإبلاغ',e.message)}
      }});
      options.push({text:'حظر المستخدم',onPress:async()=>{
        try{await db.collection('users').doc(userId).collection('blocked').doc(m.userUid).set({createdAt:firestore.FieldValue.serverTimestamp()});Alert.alert('تم الحظر')}
        catch(e){Alert.alert('تعذر الحظر',e.message)}
      }});
    }
    if(!options.length)return;
    Alert.alert('إدارة الرسالة',m.userName||'مستخدم',[...options,{text:'إلغاء',style:'cancel'}]);
  }
  useEffect(()=>{
    const s=Keyboard.addListener('keyboardDidShow',()=>setKeyboardOn(true));
    const h=Keyboard.addListener('keyboardDidHide',()=>setKeyboardOn(false));
    return ()=>{s.remove();h.remove()};
  },[]);
  async function sendMessage(){
    const text=message.trim().slice(0,500);
    if(!text||!userId||!room?.id||sending)return;
    setSending(true);
    try{
      await db.collection('rooms').doc(room.id).collection('messages').add({
        text,userUid:userId,userName:username.slice(0,35)||'مستخدم',
        createdAt:firestore.FieldValue.serverTimestamp()
      });
      setMessage('');
      setTimeout(()=>chatRef.current?.scrollToEnd?.({animated:true}),40);
    }catch(e){Alert.alert('تعذر إرسال الرسالة',e.message)}
    finally{setSending(false)}
  }
  function send(gift){
    if(!SHOW_UNRELEASED_DEMOS)return Alert.alert('غير مفعّل','سيتم إطلاق الهدايا بعد ربط خدمة الألماس الآمنة');
    if(diamonds<gift[2])return Alert.alert('رصيد غير كافٍ');
    if(!onSendGift(gift,room))return;
    setGiftOpen(false);setFxId(v=>v+1);setFx(gift);
  }
  return <KeyboardAvoidingView style={[S.room,{backgroundColor:audio?BLUE:'#071324'}]} behavior={Platform.OS==='ios'?'padding':undefined}>
    <StatusBar barStyle="light-content"/>
    {audio&&<View pointerEvents="none" style={S.audioBackdrop}><View style={S.blueGlow}/><Text style={S.bgCrown}>♛</Text></View>}
    {!audio&&<View style={[StyleSheet.absoluteFillObject,{paddingTop:110}]}><RoomMedia room={room} userId={userId} canPublish={isHost||isGuest} audio={audio} blocked={blocked} guests={guests}/></View>}
    <View style={S.liveHeader}><Small title="✕" onPress={onExit}/><View style={{flex:1,alignItems:'center'}}><Text style={S.title}>{room.name}</Text><Text style={S.tiny}>{audio?'🎙 غرفة صوتية':'📹 بث فيديو'} · #{room.id}</Text></View></View>
    {audio&&<RoomMedia room={room} userId={userId} canPublish={isHost||isGuest} audio={audio} blocked={blocked} guests={guests}/>}
    <View pointerEvents="none" style={{flex:1}}/>
    {!keyboardOn&&!stageBusy&&stagePanel()}
    {isHost&&stagePanelVisible&&!keyboardOn&&<ScrollView style={mediaStyles.requests} keyboardShouldPersistTaps="handled">
      {Object.entries(guests).map(([uid,label])=><Small key={uid} title={'إنزال '+label} onPress={()=>stageAction('remove',uid)}/>)}
      {requests.filter(item=>!blocked.includes(item.uid)).map(item=><View key={item.uid} style={S.row}>
        <Small title={'قبول '+item.name} onPress={()=>stageAction('approve',item.uid)}/>
        <Small title="رفض" onPress={()=>stageAction('reject',item.uid)}/>
      </View>)}
    </ScrollView>}
    {!keyboardOn&&<View style={S.actions}><Text style={S.tiny}>{isHost?'👑 أنت مضيف الغرفة':'👤 أنت مشاهد'} · {audio?'غرفة صوتية':'بث فيديو'}</Text></View>}
    {!keyboardOn&&<ScrollView ref={chatRef} style={S.chat} contentContainerStyle={{padding:7}}><Text style={S.tiny}>اضغط مطولًا للإبلاغ أو الحظر أو حذف رسالتك. يستطيع المضيف حذف رسائل الغرفة.</Text>{chat.filter(m=>!blocked.includes(m.userUid)).map(m=><TouchableOpacity key={m.id} onLongPress={()=>moderateMessage(m)} style={S.bubble}><Text style={S.white}><Text style={{color:GOLD}}>{m.userName||'مستخدم'}: </Text>{m.text}</Text></TouchableOpacity>)}</ScrollView>}
    {SHOW_UNRELEASED_DEMOS&&giftOpen&&!keyboardOn&&<View style={S.giftDrawer}><View style={S.drawerHeader}><Text style={S.gold}>🎁 مكتبة الهدايا</Text><Text style={S.gold}>💎 {fmt(diamonds)}</Text><TouchableOpacity onPress={()=>setGiftOpen(false)}><Text style={S.white}>✕</Text></TouchableOpacity></View><ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={S.giftGrid}>{GIFTS.map((g,i)=><TouchableOpacity key={i} style={S.giftTile} onPress={()=>send(g)}><Text style={{fontSize:22}}>{g[0]}</Text><Text numberOfLines={1} style={S.giftName}>{g[1]}</Text><Text style={S.giftCost}>💎 {g[2]}</Text></TouchableOpacity>)}</ScrollView></View>}
    <View style={S.composer}>{SHOW_UNRELEASED_DEMOS&&<TouchableOpacity style={S.composerGift} onPress={()=>{Keyboard.dismiss();setGiftOpen(v=>!v)}}><Text style={{fontSize:23}}>🎁</Text></TouchableOpacity>}<TextInput style={S.messageInput} value={message} onChangeText={setMessage} placeholder="اكتب تعليقًا..." placeholderTextColor="#bbd0ea" onFocus={()=>setGiftOpen(false)} returnKeyType="send" onSubmitEditing={sendMessage}/><TouchableOpacity style={[S.sendButton,sending&&{opacity:.5}]} disabled={sending||!message.trim()} onPress={sendMessage}><Text style={S.white}>➤</Text></TouchableOpacity></View>
    {fx&&<GiftFX key={fxId} gift={fx} onDone={()=>setFx(null)}/>}
  </KeyboardAvoidingView>;
}

export default function App(){
  const [page,setPage]=useState('loading');
  const [user,setUser]=useState(null);
  const [name,setName]=useState(''),[phone,setPhone]=useState(''),[country,setCountry]=useState(0),[countriesOpen,setCountriesOpen]=useState(false),[accepted,setAccepted]=useState(false);
  const [confirmation,setConfirmation]=useState(null),[smsCode,setSmsCode]=useState(''),[busy,setBusy]=useState(false),[authError,setAuthError]=useState('');
  const [avatar,setAvatar]=useState('👤');
  // جميع هذه الأرصدة عرض محلي فقط، لا تُمنح فعليًا لكل حساب على Firebase.
  const [wallet,setWallet]=useState({welcome:WELCOME,purchased:0,owner:0});
  const walletRef=useRef({welcome:WELCOME,purchased:0,owner:0});
  const [ownerDemo,setOwnerDemo]=useState(false),[ownerGranted,setOwnerGranted]=useState(false);
  const [inventory,setInventory]=useState(['👑 إطار ملكي','🏎️ سيارة فاخرة']);
  const [equipped,setEquipped]=useState({frame:'👑 إطار ملكي',ride:'🏎️ سيارة فاخرة'});
  const [spent,setSpent]=useState(0),[received,setReceived]=useState(0),[supportLog,setSupportLog]=useState([]);
  const [payoutCountry,setPayoutCountry]=useState('JO');
  const [payoutOtherCountry,setPayoutOtherCountry]=useState('');
  const [payoutMethod,setPayoutMethod]=useState('wallet');
  const [payoutProvider,setPayoutProvider]=useState('Zain Cash الأردن');
  const [payoutOtherProvider,setPayoutOtherProvider]=useState('');
  const [payoutHolder,setPayoutHolder]=useState('');
  const [payoutAccount,setPayoutAccount]=useState('');
  const [payoutBankName,setPayoutBankName]=useState('');
  const [payoutSwift,setPayoutSwift]=useState('');
  const [payoutAmount,setPayoutAmount]=useState('');
  const [payoutDrafts,setPayoutDrafts]=useState([]);

  const [blockedUsers,setBlockedUsers]=useState([]),[roomSearch,setRoomSearch]=useState(''),[roomError,setRoomError]=useState('');
  const [rooms,setRooms]=useState([]),[roomName,setRoomName]=useState('غرفتي'),[roomType,setRoomType]=useState('video'),[roomPass,setRoomPass]=useState(''),[activeRoom,setActiveRoom]=useState(null),[pendingRoom,setPendingRoom]=useState(null),[joinPass,setJoinPass]=useState('');
  const [paymentMethod,setPaymentMethod]=useState('usd'),[piRate,setPiRate]=useState('');
  const [bets,setBets]=useState({}),[betAmount,setBetAmount]=useState(10),[seconds,setSeconds]=useState(30),[phase,setPhase]=useState('betting'),[lit,setLit]=useState(-1),[gameResult,setGameResult]=useState(null),[history,setHistory]=useState([]);
  const betsRef=useRef({}),phaseRef=useRef('betting'),pageRef=useRef('loading'),timerRef=useRef(null);
  const total=wallet.welcome+wallet.purchased+(ownerDemo?wallet.owner:0);
  const available=wallet.welcome+wallet.purchased+(ownerDemo?wallet.owner:0);
  const go=p=>{if(!SHOW_UNRELEASED_DEMOS&&['wallet','earnings','payout','store','gifts','games','game'].includes(p))return;pageRef.current=p;setPage(p)};
  const payoutCountryInfo=PAYOUT_COUNTRIES.find(c=>c[0]===payoutCountry)||PAYOUT_COUNTRIES[0];
  const payoutOptions=PAYOUT_WALLETS[payoutCountry]||PAYOUT_WALLETS.OTHER;
  function choosePayoutCountry(code){
    setPayoutCountry(code);
    setPayoutProvider((PAYOUT_WALLETS[code]||PAYOUT_WALLETS.OTHER)[0]);
    setPayoutAccount('');setPayoutBankName('');setPayoutSwift('');
  }
  function createPayoutDraft(){
    // متعمد: لا يرسل بيانات بنكية لخادم ولا يسحب أموالًا.
    const amount=Number(payoutAmount.replace(',','.'));
    const provider=payoutProvider.includes('أخرى')||payoutProvider.includes('أخرى -')
      ?payoutOtherProvider.trim():payoutProvider;
    if(payoutCountry==='OTHER'&&!payoutOtherCountry.trim()){Alert.alert('الدولة','اكتب اسم الدولة');return;}
    if(!payoutHolder.trim()||payoutHolder.trim().length<3){
      Alert.alert('اسم المستفيد','أدخل الاسم الحقيقي للمستفيد');return;
    }
    if(!Number.isFinite(amount)||amount<=0){
      Alert.alert('المبلغ','أدخل مبلغًا موجبًا بالدولار للمعاينة');return;
    }
    if(payoutMethod==='wallet'&&(!provider||payoutAccount.replace(/\D/g,'').length<7)){
      Alert.alert('بيانات المحفظة','اختر المحفظة وأدخل رقم هاتف صحيحًا');return;
    }
    if(payoutMethod==='bank'&&(!payoutBankName.trim()||payoutAccount.trim().length<8)){
      Alert.alert('بيانات البنك','أدخل اسم البنك ورقم الحساب/IBAN');return;
    }
    // حفظ مسودة محلية فقط. لا نخزن أرقام حسابات كاملة في سجل المسودات.
    const masked=payoutAccount.length>4
      ?'••••'+payoutAccount.slice(-4):'••••';
    setPayoutDrafts(v=>[{
      id:String(Date.now()),country:payoutCountry==='OTHER'?payoutOtherCountry.trim():payoutCountryInfo[1],
      method:payoutMethod,provider:payoutMethod==='bank'?payoutBankName:provider,
      amount,masked,status:'مسودة فقط - غير مرسلة'
    },...v].slice(0,12));
    setPayoutAccount('');setPayoutSwift('');
    Alert.alert('مسودة فقط','تم تجهيز معاينة طلب السحب، ولم يتم إرسال طلب أو تحويل أي مبلغ. الرصيد القابل للسحب حاليًا صفر.');
  }

  const setBalance=w=>{walletRef.current=w;setWallet(w)};

  useEffect(()=>{
    if(!GOOGLE_WEB_CLIENT_ID)return;
    GoogleSignin.configure({webClientId:GOOGLE_WEB_CLIENT_ID});
  },[]);
  useEffect(()=>{
    const unsub=auth().onAuthStateChanged(async u=>{
      setUser(u);
      setRooms([]);setActiveRoom(null);setConfirmation(null);
      if(u){
        try{
          const doc=await firestore().collection('users').doc(u.uid).get();
          if(doc.exists){const d=doc.data()||{};setName(d.displayName||u.displayName||'مستخدم');setAvatar(d.avatar||'👤')}
          else if(u.displayName)setName(u.displayName);
        }catch(e){console.warn('Profile load failed',e.message)}
        go('home');
      }else{setConfirmation(null);go('login')}
    });
    return unsub;
  },[]);
  useEffect(()=>{
    if(!user?.uid)return;
    const unsub=db.collection('rooms').orderBy('createdAt','desc').limit(50).onSnapshot(snapshot=>{
      setRooms(snapshot.docs.map(d=>({id:d.id,...d.data()})));setRoomError('');
    },e=>setRoomError('تعذر تحميل الغرف: '+e.message));
    return unsub;
  },[user?.uid]);
  useEffect(()=>{
    if(!user?.uid){setBlockedUsers([]);return;}
    const unsub=db.collection('users').doc(user.uid).collection('blocked').onSnapshot(
      snapshot=>setBlockedUsers(snapshot.docs.map(doc=>doc.id)),
      error=>console.warn('Blocked users:',error.message)
    );
    return unsub;
  },[user?.uid]);
  async function unblockUser(uid){
    if(!user?.uid||!uid)return;
    try{
      await db.collection('users').doc(user.uid).collection('blocked').doc(uid).delete();
      Alert.alert('تم','أزلنا هذا الحساب من قائمة الحظر لديك');
    }catch(error){Alert.alert('تعذر إلغاء الحظر',error.message)}
  }
  async function deleteAccount(){
    Alert.alert('حذف الحساب','سيُحذف ملف حسابك وتسجيل الدخول. قد تبقى الرسائل والبلاغات التي يجب إدارتها وفق سياسة الاحتفاظ. تحتاج هذه النسخة إلى خدمة حذف شاملة قبل النشر العام.',[
      {text:'إلغاء',style:'cancel'},
      {text:'حذف',style:'destructive',onPress:async()=>{
        try{await db.collection('users').doc(user.uid).delete();await auth().currentUser.delete();setUser(null);go('login')}
        catch(e){Alert.alert('تعذر حذف الحساب','أعد تسجيل الدخول ثم حاول مجددًا. '+e.message)}
      }}
    ]);
  }
  async function saveProfile(u,label){
    if(!u?.uid)throw new Error('يرجى تسجيل الدخول أولًا');
    const displayName=(label||u.displayName||'مستخدم').trim().slice(0,35);
    if(!displayName)throw new Error('اسم المستخدم مطلوب');
    await firestore().collection('users').doc(u.uid).set({
      displayName,avatar,updatedAt:firestore.FieldValue.serverTimestamp()
    },{merge:true});
    setName(displayName);
  }
  async function phoneLogin(){
    if(!accepted)return Alert.alert('الشروط','وافق على الشروط أولاً');
    if(!name.trim())return Alert.alert('الاسم','أدخل اسم المستخدم');
    const local=phone.replace(/\D/g,'').replace(/^0+/,'');
    if(local.length<7)return Alert.alert('الهاتف','أدخل رقم هاتف صحيح');
    setBusy(true);setAuthError('');
    try{const c=await auth().signInWithPhoneNumber(COUNTRIES[country][1]+local);setConfirmation(c);setSmsCode('');go('verify')}
    catch(e){setAuthError(e.message||'تعذر إرسال الرمز');Alert.alert('تعذر إرسال SMS',e.message||'راجع إعداد Firebase')}
    finally{setBusy(false)}
  }
  async function verifySms(){
    if(!confirmation||smsCode.trim().length!==6)return Alert.alert('رمز SMS','أدخل ستة أرقام');
    setBusy(true);
    try{const credential=await confirmation.confirm(smsCode.trim());await saveProfile(credential.user,name.trim());setUser(credential.user);go('home')}
    catch(e){Alert.alert('فشل التحقق',e.message||'الرمز غير صالح')}
    finally{setBusy(false)}
  }
  async function googleLogin(){
    if(!accepted)return Alert.alert('الشروط','وافق على الشروط أولاً');
    if(!GOOGLE_WEB_CLIENT_ID)return Alert.alert('إعداد Google','أضف EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID في بيئة EAS، وفعّل Google في Firebase');
    setBusy(true);
    try{
      if(Platform.OS==='android')await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
      const result=await GoogleSignin.signIn();
      const token=result.data?.idToken||result.idToken;
      if(!token)throw new Error('Google لم يرجع ID Token');
      const credential=auth.GoogleAuthProvider.credential(token);
      const signed=await auth().signInWithCredential(credential);
      await saveProfile(signed.user,signed.user.displayName||name.trim());
      setUser(signed.user);go('home');
    }catch(e){if(e.code!=='SIGN_IN_CANCELLED'&&e.code!=='12501')Alert.alert('فشل تسجيل Google',e.message)}finally{setBusy(false)}
  }
  async function facebookLogin(){
    if(!accepted)return Alert.alert('الشروط','وافق على الشروط أولاً');
    setBusy(true);
    try{
      let credential;
      if(Platform.OS==='ios'){
        const rawNonce=Crypto.randomUUID();
        const hashedNonce=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,rawNonce);
        const response=await LoginManager.logInWithPermissions(['public_profile','email'],'limited',hashedNonce);
        if(response.isCancelled)return;
        const token=await AuthenticationToken.getAuthenticationTokenIOS();
        if(!token?.authenticationToken)throw new Error('Facebook Limited Login لم يرجع رمزًا');
        credential=auth.FacebookAuthProvider.credential(token.authenticationToken,rawNonce);
      }else{
        const response=await LoginManager.logInWithPermissions(['public_profile','email']);
        if(response.isCancelled)return;
        const token=await AccessToken.getCurrentAccessToken();
        if(!token?.accessToken)throw new Error('Facebook لم يرجع Access Token');
        credential=auth.FacebookAuthProvider.credential(token.accessToken);
      }
      const signed=await auth().signInWithCredential(credential);
      await saveProfile(signed.user,signed.user.displayName||name.trim());
      setUser(signed.user);go('home');
    }catch(e){Alert.alert('فشل تسجيل Facebook',e.message||'راجع Facebook App ID وإعداد Firebase')}
    finally{setBusy(false)}
  }
  async function logout(){
    try{await auth().signOut();try{await GoogleSignin.signOut()}catch(_e){}try{LoginManager.logOut()}catch(_e){}setOwnerDemo(false);setOwnerGranted(false);setBalance({welcome:WELCOME,purchased:0,owner:0});setPayoutDrafts([]);setSupportLog([]);setReceived(0);setSpent(0);go('login')}
    catch(e){Alert.alert('تعذر الخروج',e.message)}
  }
  function toggleOwnerDemo(){
    if(!__DEV__){Alert.alert('غير متاح','معاينة المالك متاحة في وضع التطوير فقط');return;}
    if(!ownerGranted){setBalance({...walletRef.current,owner:OWNER_DEMO});setOwnerGranted(true)}
    setOwnerDemo(v=>!v);
  }
  function spend(cost){
    const old=walletRef.current;const next={...old};let remain=cost;
    if(next.welcome+next.purchased+(ownerDemo?next.owner:0)<cost)return null;
    if(ownerDemo){const n=Math.min(remain,next.owner);next.owner-=n;remain-=n}
    const n=Math.min(remain,next.welcome);next.welcome-=n;remain-=n;
    const m=Math.min(remain,next.purchased);next.purchased-=m;remain-=m;
    if(remain!==0)return null;
    setBalance(next);
    return {owner:old.owner-next.owner,welcome:old.welcome-next.welcome,purchased:old.purchased-next.purchased};
  }
  function sendGift(g,room){
    const source=spend(g[2]);if(!source)return false;
    setSpent(v=>v+g[2]);setReceived(v=>v+g[2]);
    setSupportLog(v=>[{id:String(Date.now())+Math.random(),gift:g[1],value:g[2],host:room.host,source},...v].slice(0,50));
    return true;
  }
  async function createRoom(){
    if(!user?.uid)return Alert.alert('الحساب','سجّل الدخول أولًا');
    const label=roomName.trim().slice(0,55);
    if(!label)return Alert.alert('اسم الغرفة','أدخل الاسم');
    if(roomPass.trim())return Alert.alert('الغرف المقفلة','كلمة المرور غير متاحة في نسخة الاختبار؛ لا نحفظ كلمات مرور الغرف كنص مكشوف. اترك الحقل فارغًا.');
    setBusy(true);
    try{
      const host=(name||user.displayName||'مستخدم').slice(0,35);
      const data={name:label,type:roomType,ownerUid:user.uid,ownerName:host,createdAt:firestore.FieldValue.serverTimestamp(),status:'open'};
      const doc=await db.collection('rooms').add(data);
      setActiveRoom({id:doc.id,...data,host,owner:user.uid});go('room');
    }catch(e){Alert.alert('تعذر إنشاء الغرفة',e.message)}finally{setBusy(false)}
  }
  function enterRoom(room){
    if(room.status==='closed')return Alert.alert('غرفة مغلقة','هذه الغرفة مغلقة الآن');
    setActiveRoom({...room,host:room.ownerName||room.host||'مضيف',owner:room.ownerUid||room.owner});go('room');
  }
  async function endLiveRoom(roomId){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{await mediaRequest('/close-room',{roomId},controller.signal);}
    catch{Alert.alert('الغرفة مغلقة','تعذر إنهاء جلسة البث على الخادم.',[
      {text:'إغلاق',style:'cancel'},
      {text:'إعادة المحاولة',onPress:()=>endLiveRoom(roomId)},
    ]);}
    finally{clearTimeout(timeout);}
  }
  function closeMyRoom(room){
    if(!user?.uid||room.ownerUid!==user.uid)return;
    Alert.alert('إغلاق الغرفة','سيُمنع إرسال رسائل جديدة إلى الغرفة بعد إغلاقها، وتبقى الرسائل السابقة محفوظة للإشراف. هل توافق؟',[
      {text:'إلغاء',style:'cancel'},
      {text:'إغلاق',style:'destructive',onPress:async()=>{
        try{
          await db.collection('rooms').doc(room.id).update({status:'closed'});
          if(activeRoom?.id===room.id){setActiveRoom(null);go('rooms');}
          if(MEDIA_CONFIGURED)await endLiveRoom(room.id);
        }
        catch(e){Alert.alert('تعذر الإغلاق',e.message)}
      }}]);
  }
  function buyGood(g){if(inventory.includes(g[1]))return Alert.alert('مملوكة');if(!spend(g[2]))return Alert.alert('رصيد غير كافٍ');setInventory(v=>[...v,g[1]])}
  function purchase(pack){
    const usd=pack/1000;
    if(paymentMethod==='usd')Alert.alert('معاينة شراء',`${fmt(pack)} ماسة بسعر $${usd}. الدفع الحقيقي غير مربوط.`);
    else{const rate=Number(piRate);if(!Number.isFinite(rate)||rate<=0)return Alert.alert('سعر Pi','أدخل سعر Pi الحالي بالدولار');Alert.alert('معاينة Pi',`${fmt(pack*1.2)} ماسة مقابل ${(usd/rate).toFixed(6)} Pi. لا يتم تحصيل أي دفع.`)}
  }
  function resetGame(){clearTimeout(timerRef.current);betsRef.current={};setBets({});setSeconds(30);setLit(-1);setGameResult(null);phaseRef.current='betting';setPhase('betting')}
  function placeBet(i){
    if(phaseRef.current!=='betting')return;
    if(!betsRef.current[i]&&Object.keys(betsRef.current).length>=6)return Alert.alert('الحد الأقصى ست خانات');
    if(!spend(betAmount))return Alert.alert('رصيد غير كافٍ');
    const b={...betsRef.current,[i]:(betsRef.current[i]||0)+betAmount};betsRef.current=b;setBets(b);
  }
  function spin(){
    if(phaseRef.current!=='betting')return;
    phaseRef.current='spinning';setPhase('spinning');
    const placed={...betsRef.current},winner=Math.floor(Math.random()*8),steps=40+winner;let i=0;
    const tick=()=>{
      if(pageRef.current!=='game')return;
      if(i>=steps){
        const prize=(placed[winner]||0)*FOOD[winner][2];
        setBalance({...walletRef.current,welcome:walletRef.current.welcome+prize});
        setLit(winner);setGameResult({item:FOOD[winner],prize});setHistory(v=>[{item:FOOD[winner],prize},...v].slice(0,10));
        phaseRef.current='result';setPhase('result');timerRef.current=setTimeout(()=>{if(pageRef.current==='game')resetGame()},3200);return;
      }
      setLit(i%8);i++;timerRef.current=setTimeout(tick,i>35?220:i>25?130:70);
    };tick();
  }
  useEffect(()=>{if(page!=='game'||phase!=='betting')return;const t=setInterval(()=>setSeconds(v=>Math.max(0,v-1)),1000);return()=>clearInterval(t)},[page,phase]);
  useEffect(()=>{if(page==='game'&&phase==='betting'&&seconds===0)spin()},[page,phase,seconds]);
  useEffect(()=>()=>clearTimeout(timerRef.current),[]);
  function leaveGame(){
    if(phaseRef.current==='spinning')return Alert.alert('انتظر انتهاء الجولة');
    if(phaseRef.current==='betting')setBalance({...walletRef.current,welcome:walletRef.current.welcome+Object.values(betsRef.current).reduce((a,b)=>a+b,0)});
    resetGame();go('games');
  }
  function header(title,back=()=>go('home')){return <View style={S.header}><TouchableOpacity onPress={back}><Text style={S.white}>❮ رجوع</Text></TouchableOpacity><Text style={S.headerTitle}>{title}</Text><TouchableOpacity disabled={!SHOW_UNRELEASED_DEMOS} onPress={()=>go('wallet')}><Text style={S.gold}>{SHOW_UNRELEASED_DEMOS?'💎 '+fmt(total):'Clipi'}</Text></TouchableOpacity></View>}
  function nav(){const destinations=SHOW_UNRELEASED_DEMOS?[['🏠','home'],['🎮','games'],['🎁','gifts'],['💎','wallet'],['👤','profile']]:[['🏠','home'],['🚪','rooms'],['👤','profile']];return <View style={S.nav}>{destinations.map(([icon,p])=><TouchableOpacity key={p} onPress={()=>go(p)}><Text style={{fontSize:24}}>{icon}</Text></TouchableOpacity>)}</View>}
  function layout(title,children,back){return <View style={S.page}><StatusBar barStyle="light-content"/>{header(title,back)}<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={S.content}>{children}</ScrollView>{nav()}</View>}
  const myProfile=<View style={S.card}><Text style={{fontSize:54}}>{avatar}</Text><Text style={S.title}>{name||user?.displayName||'مستخدم'} {ownerDemo?'👑':''}</Text><Text style={S.gold}>ID: {user?.uid?.slice(0,12)}</Text>{SHOW_UNRELEASED_DEMOS&&<Text style={S.big}>💎 {fmt(total)}</Text>}<Text style={S.white}>{equipped.frame}</Text><Text style={S.white}>{equipped.ride}</Text>{SHOW_UNRELEASED_DEMOS&&<Text style={S.muted}>دعم تجريبي تم إرساله: {fmt(spent)} ماسة</Text>}</View>;

  if(page==='loading')return <View style={[S.page,{justifyContent:'center',alignItems:'center'}]}><Text style={S.title}>Clipi · تحميل الحساب...</Text></View>;
  if(page==='login'||page==='verify'||page==='terms')return <View style={S.page}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={S.content}>
    <Text style={S.logo}>Clipi</Text>
    {page==='terms'?<><Text style={S.white}>الماس والأرباح في هذه النسخة تجريبية. لا يوجد دفع أو سحب مالي. المحتوى والبث بين الأجهزة يحتاجان خدمة مخصصة. يجب نشر سياسة خصوصية وشروط قانونية قبل الإطلاق.</Text><Btn title="أوافق" onPress={()=>{setAccepted(true);go('login')}}/><Btn title="رجوع" color="#49306b" onPress={()=>go('login')}/></>:
    page==='verify'?<><Text style={S.label}>رمز التحقق SMS</Text><TextInput style={S.input} value={smsCode} onChangeText={setSmsCode} keyboardType="number-pad" maxLength={6} placeholder="ستة أرقام"/><Btn title={busy?'جارٍ التحقق...':'تأكيد الرمز'} disabled={busy} onPress={verifySms}/><Btn title="تغيير رقم الهاتف" color="#49306b" onPress={()=>go('login')}/></>:
    <><Text style={S.muted}>تسجيل الدخول الحقيقي عبر Firebase</Text><Text style={S.label}>الاسم</Text><TextInput style={S.input} value={name} onChangeText={setName} placeholder="اسم المستخدم"/><Text style={S.label}>الدولة</Text><Btn title={COUNTRIES[country].join(' ')} color="#49306b" onPress={()=>setCountriesOpen(v=>!v)}/>{countriesOpen&&COUNTRIES.map((c,i)=><Btn key={i} title={c.join(' ')} color="#382050" onPress={()=>{setCountry(i);setCountriesOpen(false)}}/>)}<Text style={S.label}>الهاتف</Text><TextInput style={S.input} value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" keyboardType="phone-pad"/><Btn title={accepted?'☑ أوافق على الشروط':'☐ أوافق على الشروط'} color="#49306b" onPress={()=>setAccepted(v=>!v)}/><Btn title="قراءة الشروط" color="#49306b" onPress={()=>go('terms')}/><Btn title={busy?'جارٍ العمل...':'📱 تسجيل بالهاتف (SMS)'} disabled={busy} onPress={phoneLogin}/><Btn title={GOOGLE_WEB_CLIENT_ID?"🌐 متابعة باستخدام Google":"🌐 Google · يحتاج إعدادًا"} color="#4285f4" disabled={busy||!GOOGLE_WEB_CLIENT_ID} onPress={googleLogin}/><Btn title={FACEBOOK_CONFIGURED?"📘 متابعة باستخدام Facebook":"📘 Facebook · يحتاج إعدادًا"} color="#1877f2" disabled={busy||!FACEBOOK_CONFIGURED} onPress={facebookLogin}/><Text style={S.muted}>Google وFacebook يحتاجان إعداد OAuth وبيانات المطور قبل تشغيلهما. الغرف مشتركة، لكن نقل الصوت والفيديو غير مفعّل.</Text>{authError?<Text style={{color:'#ffa6a6'}}>{authError}</Text>:null}</>}
  </ScrollView></View>;
  if(page==='home')return layout('Clipi',<><View style={S.banner}><Text style={S.title}>أهلًا {name||'بك'} 👋</Text><Text style={S.white}>غرف ومحادثات مشتركة · تصميم غرفة صوت وفيديو (دون بث مباشر)</Text></View>{myProfile}{SHOW_UNRELEASED_DEMOS&&<View style={S.panel}><Text style={S.title}>🎉 مكافأة الترحيب التجريبية</Text><Text style={S.white}>💎 1,000 ماسة · 👑 إطار ملكي · 🏎️ سيارة فاخرة</Text></View>}<Btn title="📹 إنشاء غرفة صوتية أو فيديو" onPress={()=>go('create')}/><Btn title="🚪 استعراض الغرف" color="#7040a7" onPress={()=>go('rooms')}/>{SHOW_UNRELEASED_DEMOS&&<><Btn title="💎 شراء الماسات (تجريبي)" color="#7040a7" onPress={()=>go('wallet')}/><Btn title="🛍 المتجر (تجريبي)" color="#7040a7" onPress={()=>go('store')}/><Btn title="💰 أرباح المضيف (تجريبي)" color="#7040a7" onPress={()=>go('earnings')}/><Btn title="🎮 Greedy Star (تجريبي)" color="#7040a7" onPress={()=>go('games')}/></>}<Btn title="📤 مشاركة Clipi" color="#7040a7" onPress={()=>Share.share({message:'Clipi'})}/></>);
  if(page==='create')return layout('إنشاء غرفة',<><Text style={S.label}>اسم الغرفة</Text><TextInput style={S.input} value={roomName} onChangeText={setRoomName}/><Text style={S.label}>نوع الغرفة</Text><View style={S.row}><Btn title="📹 فيديو" color={roomType==='video'?PINK:'#49306b'} onPress={()=>setRoomType('video')}/><Btn title="🎙 صوت" color={roomType==='audio'?PINK:'#49306b'} onPress={()=>setRoomType('audio')}/></View><Text style={S.label}>كلمة مرور (غير متاحة في الإصدار الحالي)</Text><TextInput style={S.input} value={roomPass} onChangeText={setRoomPass} secureTextEntry placeholder="اختيارية"/><Btn title="فتح الغرفة" onPress={createRoom}/></>);
  if(page==='rooms')return layout('الغرف',<><Btn title="➕ إنشاء غرفة" onPress={()=>go('create')}/><TextInput style={S.input} value={roomSearch} onChangeText={setRoomSearch} placeholder="ابحث عن غرفة..."/><Text style={S.muted}>يمكنك إخفاء غرف المستخدمين المحظورين وإلغاء الحظر من ملفك الشخصي.</Text>{roomError?<Text style={{color:'#ffa6a6'}}>{roomError}</Text>:null}{rooms.filter(r=>r.status==='open'&&!blockedUsers.includes(r.ownerUid)&&r.name?.toLowerCase().includes(roomSearch.trim().toLowerCase())).length===0?<Text style={S.muted}>لا توجد غرف مطابقة</Text>:rooms.filter(r=>r.status==='open'&&!blockedUsers.includes(r.ownerUid)&&r.name?.toLowerCase().includes(roomSearch.trim().toLowerCase())).map(r=><View key={r.id} style={S.panel}><TouchableOpacity onPress={()=>enterRoom(r)}><Text style={S.title}>{r.type==='video'?'📹':'🎙'} {r.name}</Text><Text style={S.gold}>#{r.id.slice(0,9)} 🌐 · دردشة مباشرة</Text></TouchableOpacity>{r.ownerUid===user?.uid&&<Btn title="إغلاق غرفتي" color="#96334f" onPress={()=>closeMyRoom(r)}/>}</View>)}</>);
  if(page==='password')return layout('غرفة مقفلة',<><TextInput style={S.input} value={joinPass} onChangeText={setJoinPass} secureTextEntry placeholder="كلمة مرور الغرفة"/><Btn title="دخول" onPress={()=>{if(joinPass!==pendingRoom?.pass)return Alert.alert('كلمة المرور غير صحيحة');setActiveRoom(pendingRoom);go('room')}}/></>,()=>go('rooms'));
  if(page==='room')return <Room key={activeRoom?.id||'room'} room={activeRoom} userId={user?.uid} username={name||'مستخدم'} avatar={avatar} diamonds={available} onSendGift={sendGift} onExit={()=>{setActiveRoom(null);go('rooms')}}/>;
  if(page==='wallet')return layout('محفظة Clipi',<><View style={S.card}><Text style={S.title}>💎 الرصيد التجريبي</Text><Text style={S.big}>{fmt(total)}</Text><Text style={S.white}>هدية الترحيب: {fmt(wallet.welcome)}</Text><Text style={S.white}>المشتَرى: {fmt(wallet.purchased)}</Text>{ownerDemo&&<Text style={S.gold}>معاينة المالك: {fmt(wallet.owner)}</Text>}</View><Text style={S.title}>طريقة الشراء</Text><View style={S.row}><Btn title="💵 دولار" color={paymentMethod==='usd'?PINK:'#49306b'} onPress={()=>setPaymentMethod('usd')}/><Btn title="🪙 Pi" color={paymentMethod==='pi'?PINK:'#49306b'} onPress={()=>setPaymentMethod('pi')}/></View>{paymentMethod==='pi'&&<><Text style={S.label}>سعر Pi بالدولار (يدوي للمعاينة)</Text><TextInput style={S.input} keyboardType="decimal-pad" value={piRate} onChangeText={setPiRate} placeholder="مثال: 0.50"/></>}{PACKS.map(pack=><View key={pack} style={S.shop}><View style={{flex:1}}><Text style={S.gold}>💎 {fmt(paymentMethod==='pi'?pack*1.2:pack)}</Text><Text style={S.white}>{paymentMethod==='usd'?`$${pack/1000}`:Number(piRate)>0?`${((pack/1000)/Number(piRate)).toFixed(6)} Pi`:'أدخل سعر Pi'}</Text></View><Small title="شراء" color={PINK} onPress={()=>purchase(pack)}/></View>)}<Text style={S.muted}>هذه الباقات معاينة للأسعار فقط. الربط بمتجر Apple / Google ومعالجة Pi يحتاجان إعدادات دفع فعلية.</Text></>);
  if(page==='earnings')return layout('أرباح المضيف',<>
    <View style={S.card}>
      <Text style={S.title}>🎁 الدعم التجريبي: {fmt(received)} 💎</Text>
      <Text style={S.big}>💰 القابل للسحب: $0.00</Text>
      <Text style={S.muted}>رصيد الهدايا لا يساوي أرباحًا ممولة. لن يكتمل السحب إلا بعد ربط خادم مالي، والتحقق من الهوية، ومزود تحويل معتمد.</Text>
      <Btn title="🌍 اختيار قناة السحب" onPress={()=>go('payout')}/>
    </View>
    <Text style={S.title}>سجل الدعم داخل المعاينة</Text>
    {supportLog.map(x=><View key={x.id} style={S.panel}>
      <Text style={S.white}>{x.gift} — {fmt(x.value)} 💎</Text>
      <Text style={S.muted}>المضيف: {x.host} · المصدر: {x.source.owner?'رصيد مالك':x.source.welcome?'ترحيبي':'مدفوع'}</Text>
    </View>)}
  </>);

  if(page==='payout')return layout('قنوات سحب الأرباح',<>
    <View style={S.panel}>
      <Text style={S.gold}>التحويل المالي غير مفعّل</Text>
      <Text style={S.muted}>هذه شاشة اختيار وتجهيز طلب، لا تتم عبرها أي مدفوعات أو إيداعات. يجب التحقق من اعتماد المزود في دولة المستفيد أولًا.</Text>
      <Text style={S.white}>الرصيد القابل للسحب: $0.00</Text>
    </View>
    <Text style={S.label}>الدولة / البلد</Text>
    <View style={S.choiceWrap}>
      {PAYOUT_COUNTRIES.map(c=><TouchableOpacity key={c[0]} onPress={()=>choosePayoutCountry(c[0])} style={[S.choice,payoutCountry===c[0]&&S.choiceActive]}>
        <Text style={S.white}>{c[1]}</Text>
      </TouchableOpacity>)}
    </View>
    {payoutCountry==='OTHER'&&<TextInput style={S.input} placeholder="اسم الدولة" value={payoutOtherCountry} onChangeText={setPayoutOtherCountry}/>}
    <Text style={S.muted}>البلد المختار: {payoutCountryInfo[1]} · العملة المرجعية: {payoutCountryInfo[2]} (دون احتساب صرف فعلي)</Text>
    <Text style={S.label}>طريقة الاستلام</Text>
    <View style={S.row}>
      <Btn title="📱 محفظة هاتف" color={payoutMethod==='wallet'?PINK:'#49306b'} onPress={()=>setPayoutMethod('wallet')}/>
      <Btn title="🏦 بنك / IBAN" color={payoutMethod==='bank'?PINK:'#49306b'} onPress={()=>setPayoutMethod('bank')}/>
    </View>
    {payoutMethod==='wallet'?<>
      <Text style={S.label}>المحفظة</Text>
      <View style={S.choiceWrap}>{payoutOptions.map(option=><TouchableOpacity key={option} onPress={()=>setPayoutProvider(option)} style={[S.choice,payoutProvider===option&&S.choiceActive]}>
        <Text style={S.white}>{option}</Text>
      </TouchableOpacity>)}</View>
      {(payoutProvider.includes('أخرى')||payoutProvider.includes('أخرى -'))&&<TextInput style={S.input} placeholder="اسم المحفظة الأخرى" value={payoutOtherProvider} onChangeText={setPayoutOtherProvider}/>}
      <Text style={S.label}>رقم الهاتف المرتبط بالمحفظة (مع رمز الدولة)</Text>
      <TextInput style={S.input} value={payoutAccount} onChangeText={setPayoutAccount} keyboardType="phone-pad" placeholder="مثال: +9627..."/>
    </>:<>
      <Text style={S.label}>اسم البنك (أي بنك في الدولة المختارة)</Text>
      <TextInput style={S.input} value={payoutBankName} onChangeText={setPayoutBankName} placeholder="أدخل اسم البنك كما هو رسميًا"/>
      <Text style={S.label}>رقم الحساب / IBAN</Text>
      <TextInput style={S.input} value={payoutAccount} onChangeText={setPayoutAccount} autoCapitalize="characters" placeholder="IBAN أو رقم الحساب"/>
      <Text style={S.label}>SWIFT / BIC (اختياري في المعاينة)</Text>
      <TextInput style={S.input} value={payoutSwift} onChangeText={setPayoutSwift} autoCapitalize="characters" placeholder="رمز البنك"/>
    </>}
    <Text style={S.label}>الاسم القانوني للمستفيد</Text>
    <TextInput style={S.input} value={payoutHolder} onChangeText={setPayoutHolder} placeholder="كما هو مسجل بالمحفظة أو البنك"/>
    <Text style={S.label}>المبلغ المطلوب بالدولار (تجريبي)</Text>
    <TextInput style={S.input} keyboardType="decimal-pad" value={payoutAmount} onChangeText={setPayoutAmount} placeholder="0.00"/>
    <Btn title="حفظ مسودة طلب السحب فقط" onPress={createPayoutDraft}/>
    <Text style={S.muted}>لا تتاح الموافقة أو التحويل حتى يكون لديك رصيد مستحق تم تأكيده من الخادم، مع التحقق من الهوية والبلد والأهلية ورسوم التحويل.</Text>
    {payoutDrafts.length>0&&<Text style={S.title}>مسودات الطلبات في هذه الجلسة</Text>}
    {payoutDrafts.map(d=><View key={d.id} style={S.panel}>
      <Text style={S.white}>{d.country} · {d.provider} · ${d.amount.toFixed(2)}</Text>
      <Text style={S.muted}>{d.masked} · {d.status}</Text>
    </View>)}
  </>,()=>go('earnings'));

  if(page==='store')return layout('المتجر',<><View style={S.panel}><Text style={S.gold}>هدايا الترحيب: 👑 إطار ملكي · 🏎️ سيارة فاخرة</Text></View>{GOODS.map((g,i)=><View key={i} style={S.shop}><Text style={{fontSize:25}}>{g[0]}</Text><View style={{flex:1}}><Text style={S.white}>{g[1]}</Text><Text style={S.gold}>{g[2]} 💎</Text></View>{inventory.includes(g[1])?<Small title={equipped[g[3]]===g[1]?'إزالة':'تفعيل'} onPress={()=>setEquipped(v=>({...v,[g[3]]:v[g[3]]===g[1]?'':g[1]}))}/>:<Small title="شراء" color={PINK} onPress={()=>buyGood(g)}/>}</View>)}</>);
  if(page==='gifts')return layout('الهدايا',<><Text style={S.muted}>الهدايا تُرسل من داخل غرفة صوت أو فيديو</Text><View style={S.giftGrid}>{GIFTS.map((g,i)=><View key={i} style={S.giftTile}><Text style={{fontSize:22}}>{g[0]}</Text><Text style={S.giftName}>{g[1]}</Text><Text style={S.giftCost}>{g[2]} 💎</Text></View>)}</View><Btn title="استعراض الغرف" onPress={()=>go('rooms')}/></>);
  if(page==='profile')return layout('الملف الشخصي',<>{myProfile}<Text style={S.label}>الاسم</Text><TextInput style={S.input} value={name} onChangeText={setName}/><Text style={S.label}>الصورة الرمزية</Text><View style={S.giftGrid}>{AVATARS.map(a=><TouchableOpacity key={a} style={S.avatarChoice} onPress={()=>setAvatar(a)}><Text style={{fontSize:29}}>{a}</Text></TouchableOpacity>)}</View><Btn title="حفظ الاسم على Firebase" onPress={async()=>{try{await saveProfile(user,name.trim());Alert.alert('تم الحفظ')}catch(e){Alert.alert('خطأ',e.message)}}}/>{__DEV__&&<View style={S.panel}><Text style={S.title}>👑 معاينة المالك فقط</Text><Text style={S.muted}>زر غير محمي ويجب إزالته قبل النشر. لا يجوز منح رصيد مالي من التطبيق.</Text><Btn title={ownerDemo?'إيقاف معاينة المالك':'تفعيل 5,000,000 تجريبية'} color="#946e2c" onPress={toggleOwnerDemo}/></View>}<View style={S.panel}><Text style={S.title}>🚫 الحسابات المحظورة ({blockedUsers.length})</Text>{blockedUsers.length===0?<Text style={S.muted}>لا توجد حسابات محظورة</Text>:blockedUsers.map(uid=><View key={uid} style={{marginBottom:9}}><Text style={S.muted}>المستخدم: {uid.slice(0,14)}...</Text><Btn title="إلغاء الحظر" color="#7040a7" onPress={()=>unblockUser(uid)}/></View>)}</View><Text style={S.muted}>حذف الحساب في هذه النسخة غير شامل للمحادثات والبلاغات القديمة، ويجب تشغيل خدمة حذف بيانات كاملة قبل إطلاق التطبيق للعامة.</Text><Btn title="حذف حسابي" color="#96334f" onPress={deleteAccount}/><Btn title="تسجيل الخروج" color="#555" onPress={logout}/></>);
  if(page==='games')return layout('الألعاب',<View style={S.card}><Text style={S.title}>🎰 Greedy Star</Text><Text style={S.muted}>الماسات والنتائج هنا تجريبية</Text><Btn title="العب الآن" onPress={()=>{resetGame();go('game')}}/></View>);
  if(page==='game')return <View style={S.gamePage}>{header('Greedy Star',leaveGame)}<ScrollView contentContainerStyle={S.content}><Text style={[S.title,{textAlign:'center'}]}>⭐ GREEDY STAR ⭐</Text><Text style={[S.gold,{textAlign:'center'}]}>{phase==='betting'?`وقت الرهان: ${seconds}`:phase==='spinning'?'العجلة تدور...':'النتيجة'}</Text><View style={S.wheel}>{FOOD.map((f,i)=>{const angle=(i*45-90)*Math.PI/180;return <TouchableOpacity key={i} disabled={phase!=='betting'} onPress={()=>placeBet(i)} style={[S.slot,{left:112+Math.cos(angle)*99,top:112+Math.sin(angle)*99},lit===i&&S.slotLit]}><Text style={{fontSize:23}}>{f[0]}</Text><Text style={S.slotLabel}>{f[1]}</Text><Text style={S.slotLabel}>×{f[2]}</Text>{bets[i]?<Text style={S.slotLabel}>{bets[i]}💎</Text>:null}</TouchableOpacity>})}<View style={S.wheelMiddle}><Text style={{fontSize:26}}>⭐</Text><Text style={S.white}>{phase==='betting'?seconds:'WIN'}</Text></View></View>{gameResult&&<View style={S.card}><Text style={S.title}>{gameResult.item[0]} {gameResult.item[1]}</Text><Text style={S.gold}>الربح: {fmt(gameResult.prize)} 💎 تجريبي</Text></View>}<Text style={S.title}>قيمة الرهان</Text><View style={S.row}>{[10,100,500,1000,10000].map(n=><Small key={n} title={String(n)} color={betAmount===n?PINK:'#754322'} onPress={()=>setBetAmount(n)}/>)}</View><Text style={S.gold}>مجموع الرهانات: {fmt(Object.values(bets).reduce((a,b)=>a+b,0))} 💎</Text><Btn title={phase==='betting'?'ابدأ الجولة':'انتظر النتيجة'} disabled={phase!=='betting'} color="#138551" onPress={spin}/><Text style={S.muted}>للترفيه فقط؛ النتائج ليست أموالًا قابلة للسحب.</Text>{history.map((h,i)=><Text key={i} style={S.white}>{h.item[0]} {h.item[1]} — {h.prize} 💎</Text>)}</ScrollView></View>;
  return <View style={S.page}><Btn title="الرئيسية" onPress={()=>go('home')}/></View>;
}

const S=StyleSheet.create({
  choiceWrap:{flexDirection:'row',flexWrap:'wrap',marginVertical:5},choice:{paddingHorizontal:10,paddingVertical:10,borderRadius:12,backgroundColor:'#32245b',margin:3,borderWidth:1,borderColor:'#4e4770'},choiceActive:{backgroundColor:'#7c2866',borderColor:GOLD},
  page:{flex:1,backgroundColor:'#170b2c'},gamePage:{flex:1,backgroundColor:'#7d391d'},content:{padding:16,paddingBottom:40},white:{color:'white',fontWeight:'700'},gold:{color:GOLD,fontWeight:'900'},muted:{color:'#c5bdd3',marginVertical:8,lineHeight:19},title:{color:'white',fontSize:19,fontWeight:'900',marginVertical:10},label:{color:'white',fontWeight:'800',marginTop:13,marginBottom:6},logo:{color:'white',fontSize:52,fontWeight:'900',textAlign:'center',marginTop:46},big:{color:GOLD,fontSize:28,fontWeight:'900',marginVertical:9},input:{backgroundColor:'white',color:'#111',padding:13,borderRadius:12,marginVertical:5},btn:{padding:13,borderRadius:12,alignItems:'center',marginVertical:6,minWidth:82},small:{paddingVertical:8,paddingHorizontal:10,borderRadius:10,marginHorizontal:3,alignItems:'center',justifyContent:'center'},header:{paddingTop:48,paddingBottom:15,paddingHorizontal:12,backgroundColor:'#2c104b',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},headerTitle:{color:'white',fontWeight:'900',fontSize:17},nav:{backgroundColor:'#260d45',flexDirection:'row',justifyContent:'space-around',paddingVertical:15},banner:{backgroundColor:PINK,padding:19,borderRadius:16,marginBottom:12},card:{backgroundColor:'#321752',padding:18,borderRadius:16,alignItems:'center',marginVertical:9},panel:{backgroundColor:'#302051',padding:14,borderRadius:13,marginVertical:9},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',flexWrap:'wrap'},shop:{backgroundColor:'#302051',padding:12,borderRadius:12,marginBottom:8,flexDirection:'row',alignItems:'center'},avatarChoice:{backgroundColor:'#321752',padding:10,margin:5,borderRadius:10},room:{flex:1},audioBackdrop:{...StyleSheet.absoluteFillObject,overflow:'hidden'},blueGlow:{position:'absolute',top:-150,left:-180,width:500,height:500,borderRadius:250,backgroundColor:'#2088ef',opacity:.63},bgCrown:{position:'absolute',top:'35%',alignSelf:'center',fontSize:155,color:'white',opacity:.08},videoBlank:{...StyleSheet.absoluteFillObject,backgroundColor:'#142246',alignItems:'center',justifyContent:'center',padding:20},liveHeader:{paddingTop:49,paddingBottom:9,paddingHorizontal:11,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(0,17,48,.65)'},tiny:{color:'#d2e1fa',fontSize:10,textAlign:'center',fontWeight:'600'},liveTag:{backgroundColor:PINK,borderRadius:17,padding:9},avatars:{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:8,backgroundColor:'rgba(0,18,47,.35)'},guestAvatar:{width:59,height:58,borderRadius:13,borderWidth:1,borderColor:GOLD,backgroundColor:'rgba(4,27,70,.85)',marginRight:8,alignItems:'center',justifyContent:'center'},videoControls:{flexDirection:'row',justifyContent:'center',marginTop:8},pip:{position:'absolute',bottom:205,right:12,width:142,borderRadius:13,borderWidth:2,borderColor:GOLD,backgroundColor:'#24375d',padding:5,alignItems:'center',zIndex:8},pipPreview:{height:112,width:'100%',backgroundColor:'#364d77',borderRadius:8,alignItems:'center',justifyContent:'center'},callPanel:{position:'absolute',top:175,left:12,right:12,backgroundColor:'#11264b',borderWidth:1,borderColor:GOLD,padding:15,borderRadius:15,alignItems:'center',zIndex:20},seatHeading:{color:GOLD,fontSize:18,fontWeight:'900',textAlign:'center',marginTop:20,marginBottom:18},seatGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',paddingHorizontal:12},seatItem:{width:'24%',alignItems:'center',marginBottom:20},throne:{width:66,height:69,borderWidth:2,borderColor:GOLD,borderRadius:20,backgroundColor:'#0a398a',alignItems:'center',justifyContent:'center'},throneCrown:{position:'absolute',top:-19,fontSize:25,color:GOLD},seatRequest:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',backgroundColor:'#16396c',padding:8,marginHorizontal:12,marginBottom:5,borderRadius:12},actions:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:9,marginBottom:5},chat:{maxHeight:125,minHeight:45,marginHorizontal:9,marginBottom:5},bubble:{backgroundColor:'rgba(0,20,56,.82)',borderRadius:10,padding:8,alignSelf:'flex-start',marginTop:4},composer:{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingTop:8,paddingBottom:Platform.OS==='ios'?20:10,backgroundColor:'rgba(0,18,51,.94)'},composerGift:{width:43,height:43,borderRadius:22,backgroundColor:'#235398',alignItems:'center',justifyContent:'center',marginRight:7},messageInput:{flex:1,height:43,borderRadius:22,backgroundColor:'#1b3d78',color:'white',paddingHorizontal:14,textAlign:'right'},sendButton:{width:43,height:43,borderRadius:22,backgroundColor:PINK,justifyContent:'center',alignItems:'center',marginLeft:7},giftDrawer:{position:'absolute',bottom:Platform.OS==='ios'?78:63,left:8,right:8,height:260,padding:9,borderRadius:18,borderWidth:1,borderColor:'#578ad7',backgroundColor:'#0d265c',zIndex:25,elevation:15},drawerHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:9},giftGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',paddingBottom:10},giftTile:{width:'19%',height:72,marginBottom:7,borderRadius:9,backgroundColor:'#21498d',alignItems:'center',justifyContent:'center',padding:2},giftName:{color:'white',fontSize:9,fontWeight:'800',textAlign:'center'},giftCost:{color:GOLD,fontSize:9},fxOverlay:{...StyleSheet.absoluteFillObject,zIndex:100,elevation:100,alignItems:'center',justifyContent:'center'},fxCenter:{alignItems:'center',justifyContent:'center'},fxIcon:{fontSize:112,textAlign:'center'},fxSpark:{color:GOLD,fontSize:28,textAlign:'center',textShadowColor:'#fff5bb',textShadowRadius:10},fxFire:{fontSize:75,textAlign:'center'},wheel:{width:296,height:296,borderRadius:148,borderWidth:8,borderColor:GOLD,backgroundColor:'#b16a29',alignSelf:'center',marginVertical:24,position:'relative'},slot:{position:'absolute',width:64,height:64,borderRadius:32,backgroundColor:'#ffc970',borderWidth:2,borderColor:'white',alignItems:'center',justifyContent:'center'},slotLit:{backgroundColor:'#78ed8e',borderColor:'#00f74e',borderWidth:4},slotLabel:{fontSize:10,color:'#51240c',fontWeight:'900'},wheelMiddle:{position:'absolute',left:99,top:99,width:82,height:82,borderRadius:41,backgroundColor:'#079e52',borderWidth:4,borderColor:GOLD,alignItems:'center',justifyContent:'center'}
});

registerRootComponent(App);

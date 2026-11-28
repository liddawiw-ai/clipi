import {uiError,ui as appText,interfaceLocale,isRTL,subscribeInterface,interfaceRevision,configureInterface} from './interface-language.mjs';
import {useStartInvites,broadcastWords,CircleChoice,RoomAdmins,FriendPicker,InviteInbox,MicFreedom} from './BroadcastFriends';
import RoomHostCard,{useRoomHost} from './RoomHostCard';
import {BroadcastName,PreviousRooms,openPreviousBroadcast} from './BroadcastRooms';
import {accountLabels} from './AccountLabels';
import ProfileGames from './ProfileGames';
import TrialWallet from './TrialWallet';
import AgencyScreen from './AgencyScreen';
import {RoomEntrance,useRoomEntrances} from './RoomEntrance';
import {ShortVideoHome,ShortUpload} from './ShortVideoHome';
import ProfileShorts from './ProfileShorts';
import GiftMark from './GiftMark';
import {theme} from './ClipiTheme';
import MicFace from './MicFace';
import GoldFrame from './GoldFrame';
import {HelpCenter} from './HelpCenter';
import {brandIcon} from './clipi-brand.mjs';
import {LoginCover,RoomStudio,BalanceCard} from './ClipiSurfaces';
import ClipiCollection from './ClipiCollection';
import GiftFX from './GiftEffect';
import {DiamondWallet} from './DiamondWallet';
import {GiftRecipients, RoomAction, RoomGiftSheet, RoomOption} from './RoomControls';
import {PolicySheet,PolicyModal} from './PolicySheet';
import {RoomTermsNotice} from './RoomTermsNotice';
import {normalizeRoomNumber,AccountPhoto, AccountHub, ClipiDock, HubRows, HubScreen, RoomDiscovery} from './ClipiHub';
import {ui, setInterfaceLanguage} from './interface-language.mjs';
import {LanguageDropdown} from './LanguagePicker';
import {languages, readLocale, saveLocale} from './languages.mjs';
import {choosePhoto} from './photo';
import {Image} from 'react-native';
import {useRoomSession} from './useRoomSession';
import {copyRoomInvitation,roomInvitationId,roomInvitationUrl,shareRoomInvitation} from './room-invitations.mjs';
import React,{useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {View,Text,TextInput,TouchableOpacity,ScrollView,StyleSheet,Animated,Keyboard,KeyboardAvoidingView,Platform,StatusBar,useWindowDimensions,Easing,Share,Modal} from 'react-native';
import LinkPiAccount from './LinkPiAccount';
import {auth,firestore,piLogin,Alert} from './services';
import EarningsWalletScreen from './EarningsWalletScreen';
import * as runtime from './media';
const GOOGLE_WEB_CLIENT_ID='',FACEBOOK_CONFIGURED=false;
function loadRoomMediaRuntime(){return runtime}
const helpRoom=Object.freeze({id:'clipi-admin-help',type:'audio',status:'open',ownerUid:'',name:'غرفة أدمن كليبي',ownerName:'غرفة المساعدة الرسمية'});
const MEDIA_ENDPOINT=location.origin, MEDIA_CONFIGURED=true;
configureInterface(MEDIA_ENDPOINT,readLocale(()=>window.localStorage)||'en',null,accountLabels);
const PINK=theme.peach,GOLD=theme.gold;
const WELCOME=0;
// Purchases and payouts remain disabled in this build.
const REAL_PURCHASES_ENABLED=false,REAL_PAYOUTS_ENABLED=false;
// Hide financial/game/gift simulations in release builds. They remain available for development testing.
const SHOW_UNRELEASED_DEMOS=__DEV__;
// Initialize Firestore only when an authenticated feature needs it.
// ضع Web OAuth Client ID من Firebase/Google Cloud بعد تفعيل Google.
const GIFTS=[["🌹","وردة حمراء",10,"rose","رومانسي"],["💙","وردة زرقاء",30,"rose","رومانسي"],["💖","قلب",50,"heart","رومانسي"],["🫶","قلب الأصابع",100,"heart","رومانسي"],["💋","قبلة",150,"kiss","رومانسي"],["💞","أحبك",200,"heart","رومانسي"],["💘","قفل الحب",80,"heart","رومانسي"],["👏","تصفيق",5,"clap","تفاعل"],["🍭","مصاص",100,"candy","تفاعل"],["🧊","برودة الصيف",105,"ice","تفاعل"],["🔥","نسر ناري",120,"phoenix","تفاعل"],["🎂","كيكة",100,"cake","تفاعل"],["🍰","كعكة ماكرون",150,"cake","تفاعل"],["🧸","دبدوب",300,"bear","تفاعل"],["🎁","صندوق الكنز",100,"treasure","تفاعل"],["💰","حقيبة ذهبية",500,"gold","تفاعل"],["🪄","صولجان",2000,"magic","فاخر"],["👑","تاج الجواهر",60,"crown","فاخر"],["👑","تاج ملكي",5000,"crown","فاخر"],["👑","التاج الأعلى",5000,"crown","فاخر"],["💍","خاتم",500,"ring","فاخر"],["🧚","مرافقة مدى الحياة",190000,"fairy","فاخر"],["🏰","قصر",10000,"castle","فاخر"],["🗼","صاروخ أعلى",10000,"rocket","فاخر"],["🛸","مركبة فضائية",3000,"spaceship","مركبات"],["🚁","مروحية الماس",9990,"helicopter","مركبات"],["✈️","الطائرات الماسية",19990,"plane","مركبات"],["🚀","هدية الصاروخ",100,"rocket","مركبات"],["🚀","صاروخ",2500,"rocket","مركبات"],["🏎️","سيارة سباق ذهبية",1000,"car","مركبات"],["🚙","سيارة لينكولن بيضاء",7000,"car","مركبات"],["🚘","رولز رويس الماسية",19990,"car","مركبات"],["🏎️","سيارة فاخرة",1000,"car","مركبات"],["🐉","تنين ذهبي",25000,"dragon","أسطوري"],["🦅","نسر",120,"phoenix","أسطوري"],["🤖","روبوت خارق",1000,"robot","أسطوري"],["🐈‍⬛","قطة تحت النجوم",500,"cat","أسطوري"],["🦆","بطة ساحرة",300,"duck","أسطوري"],["🐹","Capybara",1000,"animal","أسطوري"],["🎊","Happy",3000,"party","تفاعل"],["🎉","حفلة البخت",50000,"party","فاخر"],["🌸","أزهار الكرز",200,"flower","رومانسي"],["🌺","زهرة بيضاء",200,"flower","رومانسي"],["🍓","عصير فواكه",100,"fruit","تفاعل"],["🌵","نرقص سويا",300,"dance","تفاعل"],["🔫","مسدس الماء",1700,"water","تفاعل"],["💸","طابع الأموال",1350,"money","فاخر"],["🪙","نيزك",10,"meteor","تفاعل"],["🧑‍🚀","مسافر الفضاء",2000,"space","مركبات"],["🐑","غنم",2000,"animal","أسطوري"],["🏳️","علم",50,"flag","تفاعل"],["🍽️","طاولة الوجبات",50,"dinner","تفاعل"],["🎀","حزمة حمراء",100,"bundle","تفاعل"],["🧁","Pistachio",20,"candy","تفاعل"],["💐","باقة ورد",500,"flower","رومانسي"],["🧴","عطر",50,"perfume","رومانسي"],["🎸","سيجارة",50,"smoke","تفاعل"],["🪅","علم الوطن",50,"flag","تفاعل"],["🦋","فراشة لامعة",500,"butterfly","أسطوري"],["💎","نيرز",10,"gem","تفاعل"]];
// Decorative luck previews only: no paid stakes, prizes, points, wallet changes or cash value.
const GOODS=[['👑','👑 إطار فاخر',0,'frame'],['🏎️','🏎️ دخول سيارة فاخرة',0,'ride'],['🖼️','إطار فضي',250,'frame'],['💜','إطار بنفسجي',1200,'frame'],['👑','إطار أسطوري',5000,'frame'],['🚙','دخول بسيارة',1500,'ride'],['🏎️','دخول رياضي',4000,'ride'],['🚀','دخول بصاروخ',9000,'ride']];
const COUNTRIES=[['🇯🇴 الأردن','+962'],['🇸🇦 السعودية','+966'],['🇦🇪 الإمارات','+971'],['🇵🇸 فلسطين','+970'],['🇪🇬 مصر','+20'],['🇱🇧 لبنان','+961'],['🇸🇾 سوريا','+963'],['🇮🇶 العراق','+964']];
const AVATARS=['👤','😎','👩','👨','🧑','👸','🤴','🦁','🐼','🦊','🌸','⭐'];
// Pricing preview: USD 1 = 1,000 diamonds; PI USD-equivalent 1 = 1,200 diamonds.
// PI market quote is entered manually and is NOT a live price feed.
const DIAMONDS_PER_USD=1000,DIAMONDS_PER_PI_USD=1200;
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

const fmt=x=>Number(x||0).toLocaleString(interfaceLocale());

function normalizeRoomPin(value){
  return value.replace(/[٠-٩]/g,digit=>String(digit.charCodeAt(0)-0x660))
    .replace(/[۰-۹]/g,digit=>String(digit.charCodeAt(0)-0x6f0)).replace(/[^0-9]/g,'').slice(0,4);
}

const ORANGE=theme.mint;
function Btn({title,onPress,color=ORANGE,disabled=false}){
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[S.btn,{backgroundColor:disabled?theme.line:color},color===ORANGE&&S.compact]}>
    <Text style={[S.white,color===ORANGE&&!disabled&&S.orangeInk]}>{title}</Text>
  </TouchableOpacity>;
}
function Small({title,onPress,color=ORANGE,plain=false}){
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[S.small,S.compact,{backgroundColor:plain?'transparent':color}]}>
    <Text style={[S.white,color===ORANGE&&S.orangeInk]}>{title}</Text>
  </TouchableOpacity>;
}
function WindowControl({label,icon,onPress,style}){
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[S.roomMenuTrigger,style]}>
    <Text style={S.roomControlGlyph}>{icon}</Text>
  </TouchableOpacity>;
}




const AUDIO_GUEST_SEATS=8;

async function mediaRequest(path,body,signal){
  if(!MEDIA_CONFIGURED)throw new Error(ui("عنوان خدمة البث غير مضبوط"));
  const user=auth().currentUser;
  if(!user)throw new Error(ui("انتهت جلسة الدخول"));
  const idToken=await user.getIdToken();
  const response=await fetch(MEDIA_ENDPOINT+path,{
    method:'POST',signal,
    headers:{Authorization:'Bearer '+idToken,'Content-Type':'application/json'},
    body:JSON.stringify(body),
  });
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(ui(data.error)||ui("تعذر الاتصال بخدمة البث (")+response.status+')')}
  return response.json();
}

function supportRequest(op,fields={}){
  return mediaRequest('/account-number',{...fields,op});
}
function audioSlot(person,ownerUid){
  if(!person)return null;
  if(person.seat===9||(person.uid===ownerUid&&person.seat===0))return 0;
  return person.seat>0&&person.seat<=8?person.seat:null;
}

function RoomMedia(props){
  return <RoomMediaSession {...props} runtime={loadRoomMediaRuntime()}/>;
}

function RoomMediaSession({room,userId,canPublish,guestMedia,audio,blocked,guests,runtime,session,onSeat,lockedSlots,allMicsLocked,people,initialMedia,speakerMuted,onMediaControls}){
  const {AudioSession,LiveKitRoom}=runtime;
  const [credentials,setCredentials]=useState(()=>initialMedia?.canPublish===canPublish?initialMedia:null);
  const firstToken=useRef(credentials);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!MEDIA_CONFIGURED)return;
    const start=Promise.resolve().then(()=>AudioSession.startAudioSession());
    void start.catch(()=>setError(ui("تعذر بدء جلسة الصوت")));
    return()=>{void start.catch(()=>{}).then(()=>AudioSession.stopAudioSession()).catch(()=>{});};
  },[]);
  useEffect(()=>{
    if(!MEDIA_CONFIGURED)return;
    if(firstToken.current&&attempt===0){firstToken.current=null;return}
    const controller=new AbortController();
    let active=true;
    const timeout=setTimeout(()=>controller.abort(),12000);
    (async()=>{
      if(auth().currentUser?.uid!==userId)throw new Error(ui("انتهت جلسة الدخول"));
      const result=await mediaRequest('/token',{roomId:room.id,session},controller.signal);
      if(typeof result.token!=='string'||!/^wss:\/\//i.test(result.serverUrl))throw new Error(ui("إعدادات البث غير صالحة"));
      if(active)setCredentials({...result,canPublish});
    })().catch(e=>{
      if(active)setError(e.name==='AbortError'?ui("انتهت مهلة الاتصال بالبث"):e.message);
    }).finally(()=>clearTimeout(timeout));
    return()=>{
      active=false;
      controller.abort();
      clearTimeout(timeout);
    };
  },[room.id,userId,attempt,canPublish]);
  useEffect(()=>{setError('');},[canPublish]);

  if(!MEDIA_CONFIGURED)return <Text style={[mediaStyles.status,!audio&&mediaStyles.videoStatus]}>{ui("عنوان خدمة البث غير مضبوط")}</Text>;
  if(error)return <View style={mediaStyles.notice}><Text style={[mediaStyles.status,!audio&&mediaStyles.videoStatus]}>{appText(error)}</Text><Small title={ui("إعادة الاتصال")} onPress={()=>{setCredentials(null);setError('');setAttempt(v=>v+1)}}/></View>;
  if(!credentials||credentials.canPublish!==canPublish)return null;
  return <LiveKitRoom serverUrl={credentials.serverUrl} token={credentials.token} connect audio={false} video={false} speakerMuted={speakerMuted}
    onError={()=>setError(ui("تعذر الاتصال بالبث"))}
    onDisconnected={()=>setError(ui("انقطع اتصال البث"))}>
    <ConnectedMedia onMediaControls={onMediaControls} runtime={runtime} room={room} guestMedia={guestMedia} canPublish={canPublish} audio={audio} blocked={blocked} guests={guests} people={people} lockedSlots={lockedSlots} allMicsLocked={allMicsLocked} onSeat={onSeat}/>
  </LiveKitRoom>;
}

function ConnectedMedia({onMediaControls,room,canPublish,guestMedia,audio,blocked,guests,runtime,session,onSeat,lockedSlots,allMicsLocked,people}){
  const {VideoTrack,isTrackReference,useConnectionState,useLocalParticipant,useParticipants,useTracks,ConnectionState,Track}=runtime;
  const state=useConnectionState();
  const {localParticipant,isMicrophoneEnabled,isCameraEnabled}=useLocalParticipant();
  const micAllowed=!people.find(p=>p.uid===localParticipant?.identity)?.muted;
  const tracks=useTracks([Track.Source.Camera],{onlySubscribed:true});
  const participants=useParticipants();
  useEffect(()=>{
    for(const person of participants){
      if(person!==localParticipant&&typeof person.setVolume==='function'){
        const volume=blocked.includes(person.identity)?0:1;
        person.setVolume(volume);
        person.setVolume(volume,Track.Source.ScreenShareAudio);
      }
    }
  },[participants,localParticipant,blocked,Track]);
  const guestCamera=tracks.find(track=>Object.prototype.hasOwnProperty.call(guests,track.participant.identity)&&!blocked.includes(track.participant.identity)&&isTrackReference(track));
  const seatRefs=useRef([]);
  const seats=new Map();
  for(const person of people){
    const slot=audioSlot(person,room.ownerUid);
    if(slot!==null)seats.set(slot,person);
  }
  const camera=tracks.find(track=>track.participant.identity===room.ownerUid&&isTrackReference(track));
  const [busy,setBusy]=useState(false);
  const pending=useRef(false);
  const started=useRef(false);
  useEffect(()=>{
    if(!canPublish||state!==ConnectionState.Connected||started.current)return;
    started.current=true;
    pending.current=true;
    setBusy(true);
    let active=true;
    (async()=>{
      let failed=false;
      try{if(micAllowed&&(!guestMedia||guestMedia.mic))await localParticipant.setMicrophoneEnabled(true);}
      catch{failed=true;}
      if(active&&!audio&&(!guestMedia||guestMedia.camera)){
        try{await localParticipant.setCameraEnabled(true);}
        catch{failed=true;}
      }
      if(active&&failed)Alert.alert(ui("تعذر تشغيل الوسائط"),ui("تحقق من أذونات الميكروفون والكاميرا."));
    })().finally(()=>{
      pending.current=false;
      setBusy(false);
    });
    return()=>{active=false;};
  },[canPublish,state,audio,localParticipant,guestMedia]);
  async function toggle(source, enabled){
    if(state!==ConnectionState.Connected||pending.current||(source!=='camera'&&!micAllowed))return;
    pending.current=true;
    setBusy(true);
    try{
      if(source==='camera')await localParticipant.setCameraEnabled(!isCameraEnabled);
      else await localParticipant.setMicrophoneEnabled(enabled??!isMicrophoneEnabled);
    }catch{
      Alert.alert(ui("تعذر تشغيل الوسائط"),ui("تحقق من أذونات الكاميرا والميكروفون."));
    }finally{
      pending.current=false;
      setBusy(false);
    }
  }
  const facing=useRef('user');
  async function switchCamera(){
    if(pending.current||!canPublish||!isCameraEnabled)return;
    const track=localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if(!track?.restartTrack)return Alert.alert(ui('تعذّر تبديل الكاميرا'));
    pending.current=true;setBusy(true);
    try{
      const current=track.mediaStreamTrack?.getSettings?.().facingMode||facing.current;
      const next=current==='user'?'environment':'user';
      await track.restartTrack({facingMode:{exact:next}});
      facing.current=next;
    }catch{Alert.alert(ui('تعذّر تبديل الكاميرا'))}
    finally{pending.current=false;setBusy(false)}
  }
  const canControl=canPublish&&state===ConnectionState.Connected;
  // Both the header and the settings menu control the same live participant.
  const actions=useRef(null);
  actions.current={mic:()=>toggle('microphone'),camera:()=>toggle('camera'),flip:switchCamera};
  useEffect(()=>{
    if(!canControl)return;
    onMediaControls({micOn:isMicrophoneEnabled,cameraOn:isCameraEnabled,busy,
      mic:()=>actions.current.mic(),camera:()=>actions.current.camera(),flip:()=>actions.current.flip()});
    return ()=>onMediaControls(null);
  },[onMediaControls,canControl,isMicrophoneEnabled,isCameraEnabled,busy]);
  function renderMic(slot){
    const person=seats.get(slot);
    const main=slot===0;
    const locked=lockedSlots.includes(slot)||allMicsLocked;
    const micName=main?ui('المايك الرئيسي'):ui('المايك')+' '+slot;
    const live=participants.find(p=>p.identity===person?.uid);
    const press=showMenu=>onSeat({slot,person,anchor:seatRefs.current[slot],micName,showMenu,
      toggleMic:()=>toggle('microphone'),micOn:isMicrophoneEnabled});
    return <TouchableOpacity key={slot} ref={node=>{seatRefs.current[slot]=node}}
      testID={'room-mic-'+slot} accessibilityRole="button" accessibilityLabel={micName+(person?' · '+person.name:'')}
      style={main?S.hostSeat:S.seatItem} onPress={()=>press(false)} onLongPress={()=>press(true)}>
      <MicFace main={main} person={person} host={!!person&&person.uid===room.ownerUid}
        locked={locked} speaking={!!live?.isMicrophoneEnabled&&!person?.muted}/>
      <Text numberOfLines={1} style={[main?S.hostSeatName:S.tiny,S.micCaption]}>{person?.name||(main?micName:slot)}</Text>
    </TouchableOpacity>;
  }
  return <>
    {!audio&&camera&&!blocked.includes(room.ownerUid)&&<VideoTrack trackRef={camera} style={StyleSheet.absoluteFillObject}/>}
    {!audio&&guestCamera&&<View pointerEvents="none" style={mediaStyles.guest}><VideoTrack trackRef={guestCamera} style={StyleSheet.absoluteFillObject}/></View>}
    {audio?<>{renderMic(0)}
        <View style={S.seatGrid}>{Array.from({length:AUDIO_GUEST_SEATS},(_,i)=>renderMic(i+1))}</View></>:
        state===ConnectionState.Connected&&!camera&&<Text style={[mediaStyles.status,!audio&&mediaStyles.videoStatus]}>{ui("كاميرا المضيف مغلقة")}</Text>}
  </>;
}

const mediaStyles=StyleSheet.create({
  status:{textAlign:'center',color:theme.ink,padding:10},
  videoStatus:{marginTop:140,color:'#FFF',textShadowColor:'#10241D',textShadowOffset:{width:0,height:1},textShadowRadius:3},
  notice:{alignItems:'center'},
  requests:{maxHeight:110,backgroundColor:theme.paper},
  guest:{position:'absolute',right:12,bottom:185,width:116,height:150,zIndex:2,overflow:'hidden',borderRadius:12,borderWidth:2,borderColor:GOLD},
});

function Room({room,helpCoverImage,onHelpCoverChange,inviteFriends,locale,onHostProfile,userId,username,avatar,equipped,diamonds,onExit,onMinimize,onWallet,minimized}){
  const [chatVisible,setChatVisible]=useState(true);
  const audio=room.type==='audio';
  const officialHelp=room.id===helpRoom.id;
  const [publicRoomNumber,setPublicRoomNumber]=useState(null);
  useEffect(()=>{
    const controller=new AbortController();
    setPublicRoomNumber(null);
    mediaRequest('/account-number',{op:'roomNumber',room:room.id},controller.signal)
      .then(({number})=>{if(!controller.signal.aborted)setPublicRoomNumber(number)})
      .catch(()=>{if(!controller.signal.aborted)setPublicRoomNumber('')});
    return ()=>controller.abort();
  },[room.id,userId]);

  const isHost=!officialHelp&&room.ownerUid===userId;
  const [message,setMessage]=useState(''),[sending,setSending]=useState(false);
  const [pin,setPin]=useState('');
  const [roomActionPending,setRoomActionPending]=useState(false);
  const updatingCover=useRef(false);
  async function editRoomCover(remove=false){
    if(!canEditCover||updatingCover.current)return;
    updatingCover.current=true;setRoomActionPending(true);
    try{
      const image=remove?null:await choosePhoto(720);
      if(!remove&&!image)return;
      const {cover}=await mediaRequest('/account-number',{op:'roomCover',room:room.id,image});
      if(officialHelp)onHelpCoverChange(cover);
      setRoomMenu(null);
    }catch(error){Alert.alert(appText('تعذّر حفظ غلاف البث'),uiError(error))}
    finally{updatingCover.current=false;setRoomActionPending(false)}
  }
  const roomActionLock=useRef(false);
  const [roomMenu,setRoomMenu]=useState(null);
  const [shareOpen,setShareOpen]=useState(false),[shareStatus,setShareStatus]=useState('');
  const shareInput=useRef(null);
  const inviteUrl=roomInvitationUrl(location.origin,room.id);
  const [closingRoom,setClosingRoom]=useState(false);
  const [speakerMuted,setSpeakerMuted]=useState(false);
  const [mediaControls,setMediaControls]=useState(null);
  const [giftNotice,setGiftNotice]=useState('');
  const [giftIssue,setGiftIssue]=useState('');
  const paidNonce=useRef(null),giftSending=useRef(false);
  const [giftTarget,setGiftTarget]=useState(null);
  const [giftOpen,setGiftOpen]=useState(false),[keyboardOn,setKeyboardOn]=useState(false);
  const roomRef=firestore().collection('rooms').doc(room.id);
  const [legacyChat,setLegacyChat]=useState([]);
  const [policyOrigin,setPolicyOrigin]=useState(null);
  function openRoomPolicy(page){
    setPolicyOrigin(roomMenu==='settings'?'settings':null);
    setRoomMenu(page);
  }
  const [stagePanelVisible,setStagePanelVisible]=useState(false),[blocked,setBlocked]=useState([]);
  const chatRef=useRef(null),sendingRef=useRef(false),roomClosedRef=useRef(false),exitHandledRef=useRef(false),closingByHostRef=useRef(false);
  function exitRoomOnce(){if(!exitHandledRef.current){exitHandledRef.current=true;onExit()}}
  const [effects,setEffects]=useState([]);
  const eventCursor=useRef(null);
  const played=useRef(new Set());
  function showGift(eventKey,gift){
    if(!gift||played.current.has(eventKey))return;
    played.current.add(eventKey);
    if(played.current.size>256)played.current.delete(played.current.values().next().value);
    if(!minimized)setEffects(queue=>[...queue,{key:eventKey,gift}]);
  }
  const fx=effects[0];
  function finishGift(){setEffects(queue=>queue.slice(1))}
  const entrance=useRoomEntrances(minimized,blocked);
  const membership=useRoomSession(room.id,isHost?(room.ownerName||username):username,equipped,entrance.add,reason=>{Alert.alert(ui("الغرفة"),uiError(reason));exitRoomOnce()},avatar);
  useEffect(()=>{
    const events=membership.state?.giftEvents;
    if(!Array.isArray(events))return;
    const previous=eventCursor.current;
    for(const event of events){
      if(previous!==null&&event.id>previous){
        showGift(event.sender+'|'+event.nonce,GIFTS.find(gift=>gift[1]===event.gift));
      }
    }
    eventCursor.current=Math.max(previous??0,...events.map(event=>event.id));
  },[membership.state]);
  useEffect(()=>{if(minimized)setEffects([])},[minimized]);
  const paidBalance=membership.supportBalance;
  const lastGiftId=membership.state?.giftEvents?.slice(-1)[0]?.id;
  const hostSummary=useRoomHost(membership.act,!officialHelp&&!!membership.state&&!minimized,lastGiftId);
  const hostPhoto=isHost?avatar:hostSummary.avatar;
  const displayHostName=room.ownerName||room.host||hostSummary.profileName||'';
  const people=(membership.state?.people||[]).map(person=>person.uid===room.ownerUid?{...person,avatar:hostPhoto}:person);
  const guests=Object.fromEntries(people.filter(p=>p.uid!==room.ownerUid&&p.seat>0).map(p=>[p.uid,p.name]));
  const self=people.find(p=>p.uid===userId);
  const onStage=audio?audioSlot(self,room.ownerUid)!==null:!!self?.seat;
  const isGuest=Boolean(self?.seat&&!self?.muted);
  const videoCanPublish=isHost?(self?.seat??0)>=0:isGuest;
  const audioCanPublish=onStage&&!self?.muted;
  useStartInvites(!!(inviteFriends&&isHost&&(mediaControls?.micOn||mediaControls?.cameraOn)),membership.act);
  const micFree=membership.state?.micFree!==false;
  const canApprove=isHost||membership.state?.roomAdmin||membership.state?.appStaff;
  const canEditCover=isHost||(officialHelp&&membership.state?.appStaff);
  const canModerate=uid=>uid===room.ownerUid?!!membership.state?.appStaff:canApprove;
  const broadcast=broadcastWords(locale);
  const requests=people.filter(p=>p.waiting&&!blocked.includes(p.uid));
  const requested=self?.waiting;
  const act=(op,extra)=>membership.act(op,extra).catch(e=>Alert.alert(ui("الغرفة"),uiError(e)));
  const [seatMenu,setSeatMenu]=useState(null);
  const roomSurface=useRef(null);
  const menuRequest=useRef(0);
  const seatMovePending=useRef(false);
  const menuPerson=seatMenu&&people.find(p=>audioSlot(p,room.ownerUid)===seatMenu.slot);
  const menuLocked=!!seatMenu&&!!membership.state?.lockedSlots?.includes(seatMenu.slot);
  useEffect(()=>{
    if(seatMenu&&menuPerson?.uid!==seatMenu.uid)setSeatMenu(null);
  },[seatMenu,menuPerson?.uid]);
  async function updateRoomSettings(settings, close=false){
    if(roomActionLock.current)return;
    roomActionLock.current=true;
    setRoomActionPending(true);
    try{
      await membership.act('settings',settings);
      if(close){setPin('');closeRoomMenu()}
    }catch(error){Alert.alert(ui("الغرفة"),uiError(error))}
    finally{roomActionLock.current=false;setRoomActionPending(false)}
  }
  function openGifts(uid){
    if(giftSending.current)return;
    Keyboard.dismiss();
    setGiftIssue('');
    setGiftNotice('');
    setGiftTarget(uid&&(uid!==userId||isHost)?uid:null);
    setGiftOpen(true);
  }
  const giftPeople=people.filter(person=>!blocked.includes(person.uid))
    .map(person=>person.uid===userId?{...person,avatar}:person)
    .sort((a,b)=>Number(b.uid===room.ownerUid)-Number(a.uid===room.ownerUid));
  const defaultRecipient=room.ownerUid;
  const recipientUid=giftTarget||defaultRecipient;
  const selectedPerson=giftPeople.find(person=>person.uid===recipientUid);
  const recipientReady=giftOpen&&!minimized&&!!selectedPerson&&(recipientUid!==userId||isHost);
  useEffect(()=>{
    if(!giftNotice)return;
    const timer=setTimeout(()=>setGiftNotice(''),6500);
    return ()=>clearTimeout(timer);
  },[giftNotice]);
  async function sendRoomGift(gift){
    if(giftSending.current)return;
    if(roomClosedRef.current){setGiftIssue(ui("الغرفة مغلقة"));return}
    if(!recipientReady){
      setGiftIssue(ui("المستلم غير متاح"));
      return;
    }
    setGiftIssue('');
    const key=JSON.stringify([room.id,recipientUid,gift[1]]);
    if(paidNonce.current?.key!==key)paidNonce.current={key,nonce:crypto.randomUUID()};
    const nonce=paidNonce.current.nonce;
    giftSending.current=true;
    try{
      const receipt=await membership.act('paidGift',{recipient:recipientUid,nonce,gift:gift[1],cost:gift[2]});
      if(receipt?.nonce!==nonce||receipt.recipient!==recipientUid||receipt.diamonds!==gift[2]||receipt.gift!==gift[1]){
        throw Error(ui("تعذّر تأكيد الهدية. أعد المحاولة."));
      }
      paidNonce.current=null;
      setGiftOpen(false);
      setGiftNotice(ui("أُضيفت الهدية إلى هدف")+' '+selectedPerson.name+' · '+fmt(receipt.diamonds)+' 💎');
      showGift(userId+'|'+nonce,gift);
    }catch(error){
      setGiftIssue(error.message==='Purchased diamonds insufficient or host offline'
        ?ui("الرصيد غير كافٍ أو المستلم غادر الغرفة"):error.message);
    }finally{giftSending.current=false}
  }
  async function moveToMic(slot){
    if(seatMovePending.current)return;
    seatMovePending.current=true;
    try{await act('move',{slot})}finally{seatMovePending.current=false}
  }
  function onSeat({slot,person,anchor,micName,showMenu,toggleMic,micOn}){
    const request=++menuRequest.current;
    const locked=membership.state?.lockedSlots?.includes(slot)||(!canApprove&&membership.state?.locked);
    if(!person&&!locked&&!showMenu&&(canApprove||micFree)){void moveToMic(slot);return}
    // Measure the seat and the overlay in the same coordinate system on native and web.
    anchor?.measureInWindow((x,y,width,height)=>{
      roomSurface.current?.measureInWindow((rx,ry,rw,rh)=>{
        if(request!==menuRequest.current||!width||!rw)return;
        const center=x-rx+width/2;
        const top=y-ry+height+2;
        const menuWidth=Math.min(156,rw-8);
        const left=Math.max(4,Math.min(rw-menuWidth-4,center-menuWidth/2));
        setSeatMenu({slot,uid:person?.uid,micName,toggleMic,micOn,left,top,width:menuWidth,
          maxHeight:Math.max(1,rh-top-4),tip:center-left});
      });
    });
  }
  function micOptions(){
    const {slot,uid}=seatMenu;
    const options=[];
    if(!uid&&!menuLocked&&(canApprove||(micFree&&!membership.state.locked))){
      options.push({text:ui('صعود'),onPress:()=>moveToMic(slot)});
    }else if(!uid&&!menuLocked&&!onStage&&!isHost){
      options.push({text:requested?ui('إلغاء الطلب'):broadcast.ask,onPress:()=>act(requested?'cancel':'request',{slot,permissionOnly:true})});
    }
    if(uid===userId){
      options.push({text:seatMenu.micOn?ui('كتم'):ui('تشغيل المايك'),disabled:!!self?.muted,onPress:seatMenu.toggleMic},
        {text:ui('إنزال'),onPress:()=>act('stepDown')});
    }else if(uid&&uid!==userId&&canModerate(uid)){
      options.push({text:menuPerson?.muted?ui('إلغاء الكتم'):ui('كتم'),onPress:()=>act(menuPerson?.muted?'unmute':'mute',{uid})},
        {text:ui('إنزال'),onPress:()=>act('demote',{uid})},
        {text:ui('طرد'),onPress:()=>act('eject',{uid})});
    }
    options.push({text:ui('إرسال هدية'),onPress:()=>openGifts(uid===userId&&!isHost?null:uid)});
    if(canApprove){
      if(!uid&&!menuLocked){
        for(const person of requests)options.push({text:ui('صعود')+' · '+person.name,key:person.uid,
          onPress:()=>act('approve',{uid:person.uid,slot})});
      }
      if(!uid||uid!==room.ownerUid||isHost||membership.state.appStaff)options.push({text:menuLocked?ui('فتح المايك'):ui('قفل المايك'),onPress:()=>act('slot',{slot,locked:!menuLocked})});
    }
    if(uid&&uid!==userId){
      options.push({text:ui('إبلاغ عن مشارك'),onPress:()=>startReport('participant',JSON.stringify([room.id,uid]))});
      if(!blocked.includes(uid))options.push({text:ui('حظر المستخدم'),onPress:()=>blockUser(uid)});
    }
    return options;
  }
  useEffect(()=>{
    const unsub=officialHelp?()=>{}:roomRef.onSnapshot(d=>{
      roomClosedRef.current=!d.exists||d.data()?.status==='closed';
      if(roomClosedRef.current)exitRoomOnce();
    });
    const blockedSub=firestore().collection('users').doc(userId).collection('blocked').onSnapshot(s=>setBlocked(s.docs.map(d=>d.id)));
    return()=>{unsub();blockedSub()};
  },[room.id,userId]);
  const admitted=Boolean(membership.state);
  useEffect(()=>{
    if(!admitted||officialHelp)return;
    return roomRef.collection('messages').orderBy('createdAt','asc').limitToLast(100).onSnapshot(snapshot=>{
      setLegacyChat(snapshot.docs.map(d=>({...d.data(),id:d.id,legacy:true})));
    },()=>{});
  },[room.id,admitted]);
  const [guestMedia,setGuestMedia]=useState({mic:false,camera:false});
  function stagePanel(){
    if(!isHost)return onStage?null:<Small title={requested?ui('إلغاء الطلب'):ui('طلب مقعد')} onPress={()=>{
      if(requested){void act('cancel');return}
      Alert.alert(ui('طلب مقعد'),ui('اختر ما تريد تشغيله عند قبول طلبك.'),[
        {text:ui('إلغاء'),style:'cancel'},
        {text:ui('صوت فقط'),onPress:()=>{setGuestMedia({mic:true,camera:false});void act('request')}},
        {text:ui('صوت وكاميرا'),onPress:()=>{setGuestMedia({mic:true,camera:true});void act('request')}}
      ]);
    }}/>;

    return null;
  }
  const [filterDraft,setFilterDraft]=useState('');
  const [messageMenu,setMessageMenu]=useState(null);
  const [report,setReport]=useState(null);
  const [helpText,setHelpText]=useState('');
  const submittingReport=useRef(false);
  function startReport(kind,subject){
    setHelpText('');
    setSeatMenu(null);setMessageMenu(null);setRoomMenu(null);
    setReport({kind,subject,id:crypto.randomUUID()});
  }
  async function sendReport(reason){
    if(!report||submittingReport.current)return;
    submittingReport.current=true;
    try{
      const result=await supportRequest('caseCreate',{...report,detail:reason});
      setReport(null);Alert.alert(ui(report.kind==='help'?'تم إرسال طلب المساعدة':'تم إرسال البلاغ'),ui('رقم الطلب')+' · '+result.id);
    }catch(error){Alert.alert(ui('تعذر الإبلاغ'),uiError(error))}
    finally{submittingReport.current=false}
  }
  async function blockUser(uid){
    try{
      await firestore().collection('users').doc(userId).collection('blocked').doc(uid).set({createdAt:firestore.FieldValue.serverTimestamp()});
      Alert.alert(ui('تم الحظر'));
    }catch(error){Alert.alert(ui('تعذر الحظر'),uiError(error))}
  }
  function moderateMessage(m){
    if(!m?.id||!userId)return;
    const own=m.userUid===userId;
    const options=[];
    if(canApprove&&!m.legacy&&(m.userUid!==room.ownerUid||isHost||membership.state.appStaff)){
      const pinned=membership.state?.pinned?.id===m.id;
      options.push({text:pinned?ui('إلغاء التثبيت'):ui('تثبيت الرسالة'),onPress:()=>act('pinMessage',{id:pinned?null:m.id})});
    }
    if(own||isHost||(!m.legacy&&canModerate(m.userUid)))options.push({text:ui('حذف الرسالة'),onPress:()=>Alert.alert(ui('حذف الرسالة'),ui('هل تريد حذف هذه الرسالة للجميع؟'),[
      {text:ui('إلغاء'),style:'cancel'},{text:ui('حذف'),style:'destructive',onPress:async()=>{
        try{if(m.legacy)await roomRef.collection('messages').doc(m.id).delete();else await membership.act('deleteMessage',{id:m.id})}
        catch(e){Alert.alert(ui('تعذر حذف الرسالة'),uiError(e))}
      }}])});
    if(m.userUid&&!own){
      options.push({text:ui('إبلاغ'),onPress:()=>startReport('message',JSON.stringify([room.id,m.userUid,String(m.id)]))});
      options.push({text:ui('حظر المستخدم'),onPress:()=>blockUser(m.userUid)});
    }
    if(options.length)setMessageMenu({title:m.userName,options});
  }
  useEffect(()=>{
    const s=Keyboard.addListener('keyboardDidShow',()=>setKeyboardOn(true));
    const h=Keyboard.addListener('keyboardDidHide',()=>setKeyboardOn(false));
    return ()=>{s.remove();h.remove()};
  },[]);
  async function sendMessage(){
    const text=message.trim();
    if(!text||!userId||!room?.id||sendingRef.current)return;
    if(roomClosedRef.current)return Alert.alert(ui("الغرفة مغلقة"),ui("لا يمكن إرسال رسائل بعد إغلاق الغرفة"));
    if(text.length>500)return Alert.alert(ui("الرسالة طويلة"),ui("الحد الأقصى 500 حرف"));
    sendingRef.current=true;
    setSending(true);
    try{
      await membership.act('message',{text});
      // Do not erase edits typed while the network request was in flight.
      setMessage(current=>current.trim()===text?'':current);
      setTimeout(()=>chatRef.current?.scrollToEnd?.({animated:true}),40);
    }catch(e){Alert.alert(ui("تعذر إرسال الرسالة"),uiError(e))}
    finally{sendingRef.current=false;setSending(false)}
  }
  async function closeHostedRoom(){
    if(!isHost||!room?.id||closingRoom)return;
    setClosingRoom(true);
    closingByHostRef.current=true;
    try{
      await firestore().collection('rooms').doc(room.id).update({status:'closed'});
          if(MEDIA_CONFIGURED)void mediaRequest('/close-room',{roomId:room.id,session:membership.session}).catch(()=>Alert.alert(ui("تعذر إنهاء بث الغرفة على الخادم")));
      setRoomMenu(null);
      exitRoomOnce();
    }catch(e){closingByHostRef.current=false;Alert.alert(ui("تعذر إغلاق الغرفة"),uiError(e))}
    finally{setClosingRoom(false)}
  }
  function confirmCloseHostedRoom(){
    if(!isHost)return;
    Alert.alert(ui("إغلاق الغرفة للجميع"),ui("سيتم إغلاق الغرفة ولن يتمكن المشاركون من إرسال رسائل جديدة."),[
      {text:ui("إلغاء"),style:'cancel'},
      {text:ui("إغلاق الغرفة"),style:'destructive',onPress:closeHostedRoom}
    ]);
  }
  function closeRoomMenu(){
    Keyboard.dismiss();
    setPin('');
    setRoomMenu(null);
  }
  function goBackFromRoomMenu(){
    if(roomMenu==='terms'||roomMenu==='privacy')setRoomMenu(policyOrigin);
    else if(roomMenu==='cover'||roomMenu==='themes'||roomMenu==='filter'||roomMenu==='people'||roomMenu==='friends'||roomMenu==='admins')setRoomMenu('settings');
    else closeRoomMenu();
  }
  const roomSettings=<Modal visible={roomMenu!==null&&!minimized} transparent animationType="fade" onRequestClose={goBackFromRoomMenu}>
    {roomMenu==='terms'||roomMenu==='privacy'
      ?<PolicySheet key={roomMenu} page={roomMenu} endpoint={MEDIA_ENDPOINT} onClose={goBackFromRoomMenu}/>
      :<View style={S.roomMenuOverlay}>
      <TouchableOpacity accessible={false} style={StyleSheet.absoluteFillObject} onPress={closeRoomMenu}/>
      <KeyboardAvoidingView style={S.roomMenuPanel} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={S.hostSettingsHeading}>
          <Text style={S.title}>{roomMenu==='cover'?appText('غلاف البث'):roomMenu==='admins'?appText('أدمن الغرفة'):roomMenu==='friends'?broadcast.invite:roomMenu==='filter'?ui('الكلمات المحظورة'):roomMenu==='people'?ui('المشاركون'):roomMenu==='themes'?ui("ثيمات الغرفة"):ui("إعدادات الغرفة")}</Text>
          <WindowControl icon={['themes','filter','people','friends','admins'].includes(roomMenu)?'‹':'×'} label={['themes','filter','people','friends','admins'].includes(roomMenu)?ui("رجوع"):ui("إغلاق")} onPress={goBackFromRoomMenu}/>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={S.roomMenuItems}>
          {roomMenu==='admins'&&canApprove?<RoomAdmins act={membership.act}/>:roomMenu==='friends'&&canApprove?<FriendPicker act={membership.act} locale={locale}/>:roomMenu==='cover'&&canEditCover?<>
            <RoomOption title={appText('اختيار غلاف البث')} disabled={roomActionPending} onPress={()=>editRoomCover()}/>
            <RoomOption title={appText('إزالة الغلاف')} disabled={roomActionPending} onPress={()=>editRoomCover(true)}/>
          </>:roomMenu==='filter'&&canApprove?<>
            <TextInput style={[S.input,{width:'100%'}]} multiline maxLength={820} value={filterDraft} onChangeText={setFilterDraft}
              accessibilityLabel={ui('الكلمات المحظورة')} placeholder={ui('اكتب كل كلمة في سطر')}/>
            <RoomOption title={ui('حفظ')} disabled={roomActionPending} onPress={()=>updateRoomSettings({words:filterDraft.split(/[,،\n]/).map(v=>v.trim()).filter(Boolean)},true)}/>
          </>:roomMenu==='people'?<>
            {people.map(p=><View key={p.uid} style={{width:'100%',paddingVertical:6}}>
              <Text style={S.white}>{p.name}{p.uid===room.ownerUid?' 👑':''}</Text>
              {p.uid!==userId&&<View style={S.row}><Small plain title={ui('إبلاغ')} onPress={()=>startReport('participant',JSON.stringify([room.id,p.uid]))}/>
                {canModerate(p.uid)&&<><Small plain title={p.muted?ui('إلغاء الكتم'):ui('كتم')} onPress={()=>act(p.muted?'unmute':'mute',{uid:p.uid})}/>
                  {(p.uid===room.ownerUid?p.seat>=0:p.seat>0)&&<Small plain title={ui('إنزال')} onPress={()=>act('demote',{uid:p.uid})}/>}
                  <Small plain title={ui('طرد')} onPress={()=>act('eject',{uid:p.uid})}/></>}
                {!blocked.includes(p.uid)&&<Small plain title={ui('حظر المستخدم')} onPress={()=>blockUser(p.uid)}/>}</View>}
            </View>)}
          </>:roomMenu==='themes'&&canApprove?<>
            {[['default',ui("الأصلي")],['palace',ui("القصر الملكي")],['aurora',ui("الشفق القطبي")],['dunes',ui("كثبان القمر")]].map(([theme,label])=>
              <RoomOption key={theme} title={(membership.state?.theme===theme?'✓ ':'')+label} onPress={()=>act('settings',{theme})}/>)}
            <RoomOption title={ui("اختيار خلفية من الاستوديو")} onPress={async()=>{
              try{const image=await choosePhoto(1000);if(image)await membership.act('settings',{theme:'upload',image})}
              catch(e){Alert.alert(ui("ثيم الغرفة"),uiError(e))}
            }}/>
          </>:<>
            <RoomOption title={ui("مشاركة الغرفة")} onPress={()=>{
              closeRoomMenu();
              setShareStatus('');
              setShareOpen(true);
            }}/>
            <RoomOption title={ui("شروط الخدمة")} onPress={()=>openRoomPolicy('terms')}/>
            <RoomOption title={ui("سياسة الخصوصية")} onPress={()=>openRoomPolicy('privacy')}/>
            <RoomOption title={ui('المشاركون')+' · '+people.length} onPress={()=>setRoomMenu('people')}/>
            {!isHost&&<RoomOption title={ui('إبلاغ عن البث')} onPress={()=>startReport('room',JSON.stringify([room.id,room.ownerUid]))}/>}
            {!officialHelp&&!isHost&&!blocked.includes(room.ownerUid)&&<RoomOption title={ui('حظر المضيف')} onPress={()=>{closeRoomMenu();void blockUser(room.ownerUid)}}/>}
            {mediaControls&&<RoomOption title={mediaControls.micOn?ui("كتم الميكروفون"):ui("تشغيل الميكروفون")} disabled={mediaControls.busy||!!self?.muted} onPress={mediaControls.mic}/>}
            <RoomOption title={speakerMuted?ui("تشغيل سماعة الغرفة"):ui("كتم سماعة الغرفة")} onPress={()=>setSpeakerMuted(value=>!value)}/>
            <RoomOption title={chatVisible?ui("إخفاء الدردشة"):ui("إظهار الدردشة")} onPress={()=>{setChatVisible(v=>!v);closeRoomMenu()}}/>
            <RoomOption title={ui("تصغير الغرفة")} onPress={()=>{closeRoomMenu();onMinimize()}}/>
            {canApprove&&(audio||requests.length>0)&&<RoomOption title={(stagePanelVisible?ui("إخفاء طلبات المقاعد"):ui("طلبات المقاعد"))+' ('+requests.length+')'} onPress={()=>{closeRoomMenu();setStagePanelVisible(v=>!v)}}/>}
            {canApprove&&<RoomOption title={appText(membership.state?.shield?'إيقاف وضع الحماية':'تفعيل وضع الحماية')} disabled={roomActionPending}
              onPress={()=>updateRoomSettings({shield:!membership.state?.shield})}/>}
            {canApprove&&<>
              {!officialHelp&&<RoomOption title={appText('تعيين أدمن')} onPress={()=>setRoomMenu('admins')}/>}
              {canEditCover&&<RoomOption title={appText('تغيير غلاف البث')} onPress={()=>setRoomMenu('cover')}/>}
              <RoomOption title={broadcast.invite} onPress={()=>setRoomMenu('friends')}/>
              {audio&&<MicFreedom label={broadcast.free} value={micFree} disabled={roomActionPending} onChange={value=>updateRoomSettings({micFree:value})}/>}
              <RoomOption title={ui('الكلمات المحظورة')} onPress={()=>{setFilterDraft((membership.state.words||[]).join('\n'));setRoomMenu('filter')}}/>
              <RoomOption title={ui('مهلة الدردشة')+' · '+(membership.state?.slow||0)+' '+ui('ثانية')}
                disabled={roomActionPending} onPress={()=>{const times=[0,5,15,30];const i=times.indexOf(membership.state?.slow||0);void updateRoomSettings({slow:times[(i+1)%times.length]})}}/>
              {!officialHelp&&<RoomOption title={ui("ثيمات الغرفة")} onPress={()=>{Keyboard.dismiss();setPin('');setRoomMenu('themes')}}/>}
              <RoomOption title={membership.state?.locked?ui("🔓 فتح المايكات"):ui("🔒 قفل المايكات")} disabled={roomActionPending} onPress={()=>updateRoomSettings({locked:!membership.state.locked})}/>
              {!officialHelp&&<><TextInput style={[S.input,{width:'100%'}]} value={pin} secureTextEntry keyboardType="number-pad" maxLength={4} placeholder={ui("رقم سري من أربع خانات")} onChangeText={value=>setPin(normalizeRoomPin(value))}/>
              <RoomOption title={ui("حفظ رمز الغرفة")} disabled={roomActionPending} onPress={()=>{
                if(!/^[0-9]{4}$/.test(pin))return Alert.alert(ui("أدخل أربعة أرقام"));
                void updateRoomSettings({pin},true)
              }}/>
              {membership.state?.protected&&<RoomOption title={ui("إلغاء قفل الغرفة")} disabled={roomActionPending} onPress={()=>updateRoomSettings({pin:''},true)}/>}</>}
              {isHost&&<RoomOption title={ui("إغلاق الغرفة للجميع")} onPress={()=>{closeRoomMenu();confirmCloseHostedRoom()}}/>}
            </>}
          </>}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>}
  </Modal>;
  const shareSheet=<Modal visible={shareOpen} transparent animationType="slide" onRequestClose={()=>setShareOpen(false)}>
    <View style={S.hostSettingsShade}><View style={S.hostSettingsPanel}>
      <Text style={S.title}>{ui("مشاركة الغرفة")}</Text>
      <Text style={S.muted}>{ui(room.type==='video'?'معرّف البث':'معرّف الغرفة')}</Text>
      <Text selectable style={S.muted}>{publicRoomNumber===null?appText('جارٍ تحميل الرقم…'):publicRoomNumber||appText('الرقم غير متاح حاليًا')}</Text>
      <TextInput ref={shareInput} accessibilityLabel={ui("رابط دعوة الغرفة")} value={inviteUrl}
        editable={false} selectTextOnFocus style={[S.input,{textAlign:'left',writingDirection:'ltr'}]}/>
      {!!shareStatus&&<Text accessibilityLiveRegion="polite" style={S.muted}>{shareStatus}</Text>}
      <View style={S.row}>
        <Small title={ui("نسخ الرابط")} onPress={async()=>{
          const copied=await copyRoomInvitation(navigator,document,shareInput.current,inviteUrl);
          setShareStatus(copied?ui("تم نسخ رابط الغرفة."):ui("اضغط مطوّلًا على الرابط أعلاه واختر «نسخ»."));
        }}/>
        {typeof navigator.share==='function'&&<Small title={ui("إرسال الرابط")} onPress={async()=>{
          const result=await shareRoomInvitation(navigator,{title:room.name,url:inviteUrl});
          setShareStatus(result==='unavailable'?ui("انسخ الرابط وأرسله من تطبيق المحادثة."):'');
        }}/>}
        <WindowControl icon="×" label={ui("إغلاق")} onPress={()=>setShareOpen(false)}/>
      </View>
    </View></View>
  </Modal>;
  const selectedTheme=membership.state?.theme;
  const roomTheme=selectedTheme&&selectedTheme!=='default'?selectedTheme:null;
  const headerOnImage=!audio||!!roomTheme;
  if(!membership.state){
    const validPin=/^[0-9]{4}$/.test(pin);
    const submitPin=()=>{if(validPin&&!membership.joining)void membership.join(pin)};
    return <View style={[S.page,{justifyContent:'center',padding:24}]}>
      <Text style={S.title}>{room.name}</Text>
      {membership.pinRequired&&<>
        <Text style={S.gold}>🔒 {ui("أدخل رمز الغرفة")}</Text>
        <TextInput autoFocus accessibilityLabel={ui("رمز الغرفة")} style={S.input} value={pin} maxLength={4}
          inputMode="numeric" secureTextEntry onChangeText={value=>setPin(normalizeRoomPin(value))}
          onSubmitEditing={submitPin} placeholder={ui("رمز الغرفة")}/>
      </>}
      {!!membership.error&&<Text accessibilityLiveRegion="polite" style={S.white}>{membership.error}</Text>}
      {membership.pinRequired?<Btn title={ui("دخول")} disabled={!validPin||membership.joining} onPress={submitPin}/>:
        membership.error&&<Btn title={ui("دخول")} disabled={membership.joining} onPress={()=>membership.join()}/>}
      <Small title={ui("رجوع")} onPress={isHost?closeHostedRoom:exitRoomOnce}/>
    </View>;
  }
  return <KeyboardAvoidingView style={[S.room,{backgroundColor:audio?theme.canvas:theme.ink}]} behavior={Platform.OS==='ios'?'padding':undefined}>
    <StatusBar barStyle="dark-content"/>
    {audio&&(!roomTheme||officialHelp)&&<GoldFrame stage tone="audioRoom"/>}
    {officialHelp&&<Image accessible={false} pointerEvents="none" source={helpCoverImage} resizeMode="contain" style={{position:'absolute',width:'72%',height:'45%',left:'14%',top:'33%'}}/>}
    {roomTheme&&!officialHelp&&<Image pointerEvents="none" resizeMode="cover" style={[StyleSheet.absoluteFillObject,{width:'100%',height:'100%'}]} source={{uri:MEDIA_ENDPOINT+'/themes/'+(['palace','aurora','dunes'].includes(roomTheme)?roomTheme+'.jpg':encodeURIComponent(room.id)+'/'+roomTheme)}}/>}
    {!audio&&<View style={StyleSheet.absoluteFillObject}><RoomMedia onMediaControls={setMediaControls} room={room} userId={userId} canPublish={videoCanPublish} guestMedia={isHost?null:guestMedia} audio={audio} blocked={blocked} guests={guests} initialMedia={membership.state.media} key={String(videoCanPublish)+String(!!self?.muted)} session={membership.session} people={people} lockedSlots={membership.state?.lockedSlots||[]} allMicsLocked={membership.state.locked} onSeat={onSeat} speakerMuted={speakerMuted}/></View>}
    <Modal visible={!!(report||messageMenu)&&!minimized} transparent animationType="fade"
      onRequestClose={()=>{setReport(null);setMessageMenu(null)}}>
      <View style={S.roomMenuOverlay}><View style={S.roomMenuPanel}>
        <Text accessibilityRole="header" style={S.title}>{report?ui(report.kind==='help'?'اترك طلب مساعدة':'سبب البلاغ'):messageMenu?.title}</Text>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={S.roomMenuItems}>
          {report?.kind==='help'?<>
            <TextInput style={S.input} multiline maxLength={400} accessibilityLabel={ui('تفاصيل المشكلة')} placeholder={ui('تفاصيل المشكلة')} value={helpText} onChangeText={setHelpText}/>
            <RoomOption title={ui('إرسال الطلب')} disabled={!helpText.trim()} onPress={()=>helpText.trim()&&sendReport(helpText.trim())}/>
          </>:report?['إساءة أو تهديد','احتيال أو انتحال','انتهاك الخصوصية','سلامة طفل','محتوى غير مناسب'].map(reason=>
            <RoomOption key={reason} title={ui(reason)} onPress={()=>sendReport(reason)}/>)
            :messageMenu?.options.map(option=><RoomOption key={option.text} title={option.text} onPress={()=>{setMessageMenu(null);option.onPress()}}/>)}
          <RoomOption title={ui('إلغاء')} onPress={()=>{setReport(null);setMessageMenu(null)}}/>
        </ScrollView>
      </View></View>
    </Modal>
    {roomSettings}
    {shareSheet}
    <View collapsable={false} testID="room-mic-stage">
    <View style={S.roomTop} testID="room-header">
      <View style={S.roomHeaderMain}>
        {officialHelp&&!minimized&&<Small plain title={ui('اترك طلب مساعدة')} onPress={()=>startReport('help',room.id)}/>}
        <View style={[S.roomTopRow,{direction:isRTL()?'rtl':'ltr'}]}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={isHost?appText('إغلاق البث'):appText('مغادرة الغرفة')} style={S.roomMenuTrigger} onPress={isHost?closeHostedRoom:exitRoomOnce}><Text style={[S.roomControlGlyph,headerOnImage&&S.onVideo]}>✕</Text></TouchableOpacity>
          <View style={S.roomIdentity}>
            {!!room.name&&room.name.trim()!==displayHostName.trim()&&<Text style={[S.roomName,headerOnImage&&S.onVideo]} numberOfLines={1}>{room.name}</Text>}
            <Text style={[S.roomType,headerOnImage&&S.onVideo]}>{audio?ui("🎙 غرفة صوتية"):ui("📹 بث فيديو")}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={ui("تصغير الغرفة")} style={S.roomMenuTrigger} onPress={onMinimize}><Text style={[S.roomControlGlyph,headerOnImage&&S.onVideo]}>−</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={ui("إعدادات الغرفة")}
            accessibilityState={{expanded:roomMenu!==null}} style={S.roomMenuTrigger}
            onPress={()=>{Keyboard.dismiss();setRoomMenu('settings')}}>
            <Text style={[S.roomControlGlyph,S.roomMenuDots,headerOnImage&&S.onVideo]}>⋮</Text>
          </TouchableOpacity>
        </View>
        {!minimized&&!audio&&mediaControls&&<View style={S.cameraActions}>
          {mediaControls.cameraOn&&<TouchableOpacity accessibilityRole="button" accessibilityLabel={ui("تبديل الكاميرا")} disabled={mediaControls.busy}
            style={S.roomMenuTrigger} onPress={mediaControls.flip}><Text style={[S.roomControlGlyph,S.onVideo]}>⟲</Text></TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={mediaControls.cameraOn?ui("إغلاق الكاميرا"):ui("تشغيل الكاميرا")} disabled={mediaControls.busy}
            style={S.roomMenuTrigger} onPress={mediaControls.camera}><Text style={[S.roomControlGlyph,S.onVideo]}>{mediaControls.cameraOn?'📹':'📷'}</Text></TouchableOpacity>
        </View>}
      </View>
      {!minimized&&officialHelp&&<Image accessible accessibilityLabel={appText(helpRoom.name)} source={helpCoverImage} resizeMode="contain" style={{width:46,height:46,borderRadius:12}}/>}
      {!minimized&&!officialHelp&&<RoomHostCard textStyle={headerOnImage&&S.onVideo} hostName={displayHostName} portrait={hostPhoto} total={hostSummary.roomTotal}
          locale={locale} act={membership.act} lastGiftId={lastGiftId}
          onProfile={()=>onHostProfile(room.ownerUid,hostSummary.profileName||room.ownerName||room.host,hostPhoto)}/>}
    </View>
    {audio&&<RoomMedia onMediaControls={setMediaControls} room={room} userId={userId} canPublish={audioCanPublish} audio={audio} blocked={blocked} guests={guests} initialMedia={membership.state.media} key={String(audioCanPublish)} session={membership.session} people={people} lockedSlots={membership.state?.lockedSlots||[]} allMicsLocked={membership.state.locked} onSeat={onSeat} speakerMuted={speakerMuted}/>}
    </View>
    <View pointerEvents="none" style={{flex:1}}/>

    {canApprove&&stagePanelVisible&&!keyboardOn&&<ScrollView style={mediaStyles.requests}>
      {!requests.length&&<Text style={S.white}>{ui("لا توجد طلبات مايك")}</Text>}
      {requests.map(item=><View key={item.uid} style={S.seatRequest}>
        <Text numberOfLines={1} style={S.white}>{item.name}</Text>
        <Small title={ui("قبول")} onPress={()=>act('approve',{uid:item.uid})}/>
        <Small title={ui("رفض")} onPress={()=>act('reject',{uid:item.uid})}/>
      </View>)}
    </ScrollView>}
    {!keyboardOn&&!isHost&&<Text style={[S.tiny,!audio&&S.videoTag]}>{ui('👤 أنت مشاهد')}</Text>}
    {chatVisible&&membership.state.pinned&&!blocked.includes(membership.state.pinned.userUid)&&
      <TouchableOpacity accessibilityRole="button" onPress={()=>moderateMessage(membership.state.pinned)} style={S.bubble}>
        <Text style={S.gold} numberOfLines={2}>{ui('رسالة مثبّتة')} · {membership.state.pinned.text}</Text>
      </TouchableOpacity>}
    {chatVisible&&membership.state.slow>0&&<Text style={S.tiny}>{ui('مهلة الدردشة')} · {membership.state.slow} {ui('ثانية')}</Text>}
    {chatVisible&&!keyboardOn&&<ScrollView ref={chatRef} style={S.chat} contentContainerStyle={{padding:7}}><Text style={S.tiny}>{ui("اضغط مطولًا للإبلاغ أو الحظر أو حذف رسالتك، ويستطيع المضيف حذف رسائل الغرفة.")}</Text>{[...legacyChat,...(membership.state?.chat||[])].filter(m=>!blocked.includes(m.userUid)).map(m=><TouchableOpacity key={m.id} onLongPress={()=>moderateMessage(m)} style={S.bubble}><Text style={S.white}><Text style={{color:GOLD}}>{m.userName||ui("مستخدم")}: </Text>{m.text}</Text></TouchableOpacity>)}</ScrollView>}
    <RoomGiftSheet recipientPicker={<GiftRecipients people={giftPeople} target={recipientUid} userId={userId} allowSelf={isHost}
        act={membership.act} onSelect={openGifts}/>} visible={giftOpen&&!minimized} recipientReady={recipientReady}
      gifts={GIFTS} allLabel="الكل" translate={ui}
      copy={{title:ui("صندوق الهدايا"),close:ui("إغلاق"),balance:ui("الماس المشترى"),wallet:ui("المحفظة"),send:ui("إرسال")}}
      recipient={selectedPerson?.name||ui("اختر مستلمًا للهدية")}
      balance={paidBalance}
      onWallet={()=>{setGiftOpen(false);onWallet()}}
      onClose={()=>setGiftOpen(false)} onSend={sendRoomGift}>
      {!!giftTarget&&!selectedPerson&&<Text accessibilityLiveRegion="polite" style={S.white}>{ui("المستلم غير متاح")}</Text>}
      {!!giftIssue&&<Text accessibilityLiveRegion="polite" style={S.white}>{giftIssue}</Text>}
    </RoomGiftSheet>
    {!!giftNotice&&<Text accessibilityLiveRegion="polite" style={S.gold}>{giftNotice}</Text>}
    <RoomTermsNotice onRead={openRoomPolicy} obscured={keyboardOn||minimized}/>
    <View style={[S.roomBottom,!audio&&S.videoChrome]}>
      {!audio&&!keyboardOn&&<View style={S.roomSeatAction}>{stagePanel()}</View>}
      <View style={S.roomDock}>
        <View style={S.roomComment}>
          <TextInput style={S.messageInput} value={message} maxLength={500} onChangeText={setMessage}
            accessibilityLabel={ui("تعليق الغرفة")} placeholder={ui("اكتب تعليقًا...")} placeholderTextColor={theme.secondary}
            onFocus={()=>setGiftOpen(false)} returnKeyType="send" onSubmitEditing={sendMessage}/>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={ui("إرسال التعليق")}
            style={[S.sendButton,(sending||!message.trim())&&{opacity:.5}]}
            disabled={sending||!message.trim()} onPress={sendMessage}><Text style={S.white}>➤</Text></TouchableOpacity>
          {audio&&!isHost&&!onStage&&<TouchableOpacity accessibilityRole="button" accessibilityLabel={requested?appText('إلغاء طلب المايك'):appText('طلب مايك')} accessibilityState={{selected:!!requested}} style={S.joinButton} onPress={()=>act(requested?'cancel':'request')}><Text style={[S.white,requested&&{color:GOLD}]}>{requested?appText('إلغاء الطلب'):appText('طلب مايك')}</Text></TouchableOpacity>}

        </View>
        {!keyboardOn&&<>
          <RoomAction icon="▦" label={ui("إعدادات الغرفة")} onPress={()=>setRoomMenu('settings')}/>
  
          <RoomAction icon="▤" label={chatVisible?ui("إخفاء الدردشة"):ui("إظهار الدردشة")} active={chatVisible}
            onPress={()=>setChatVisible(value=>!value)}/>
        </>}
        <RoomAction icon="🎁" label={ui("صندوق الهدايا")} active={giftOpen} onPress={()=>openGifts(null)}/>
      </View>
    </View>
    {fx&&<div className="room-gift-effect" aria-hidden="true"><GiftFX key={fx.key} gift={fx.gift} muted={speakerMuted||minimized} onDone={finishGift}/></div>}
    {entrance.current&&!minimized&&<RoomEntrance key={entrance.current.uid+'/'+(entrance.current.entranceId||entrance.current.joined)}
      person={entrance.current} host={entrance.current.uid===room.ownerUid} muted={speakerMuted}
      onDone={entrance.finish}/>}
    <View ref={roomSurface} collapsable={false} pointerEvents={seatMenu?'auto':'none'}
      style={[StyleSheet.absoluteFillObject,{direction:'ltr',zIndex:100,elevation:16}]}
      onLayout={()=>{menuRequest.current++;setSeatMenu(null)}}>
      {seatMenu&&menuPerson?.uid===seatMenu.uid&&<>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={ui('إغلاق قائمة المايك')}
          style={StyleSheet.absoluteFillObject} onPress={()=>setSeatMenu(null)}/>
        <View accessibilityViewIsModal testID="room-mic-menu" style={[S.micPopover,
          {start:seatMenu.left,top:seatMenu.top,width:seatMenu.width,maxHeight:seatMenu.maxHeight}]}>
          <View pointerEvents="none" style={{position:'absolute',top:-3,start:seatMenu.tip-3,width:6,height:6,
            backgroundColor:GOLD,transform:[{rotate:'45deg'}]}}/>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text numberOfLines={1} style={S.micPopoverTitle}>{seatMenu.micName}{menuPerson?' · '+menuPerson.name:''}</Text>
            {micOptions().map(option=><TouchableOpacity key={option.key||option.text} accessibilityRole="button"
              disabled={option.disabled} style={[S.micPopoverAction,option.disabled&&{opacity:.45}]}
              onPress={()=>{setSeatMenu(null);option.onPress()}}><Text style={S.white}>{option.text}</Text></TouchableOpacity>)}
          </ScrollView>
        </View>
      </>}
    </View>
  </KeyboardAvoidingView>;
}

const programTopics={social:'دردشة',games:'ألعاب',music:'موسيقى',help:'مساعدة',other:'أخرى'};
function ProgramButton({label,onPress,selected=false,disabled=false}){
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress}
    style={{paddingHorizontal:9,paddingVertical:8,minHeight:44,justifyContent:'center'}}><Text style={{color:theme.ink,fontWeight:selected?'800':'500'}}>{selected?'✓ ':''}{label}</Text></TouchableOpacity>;
}
function ProgramOptions({value,choose,all}){
  const [expanded,setExpanded]=useState(false);
  const [languagesOpen,setLanguagesOpen]=useState(false);
  const languages=Object.keys(accountLabels);
  const label=code=>accountLabels[code]?.languageName||code;
  const fields={flexDirection:'row',flexWrap:'wrap',alignItems:'center'};
  return <View>
    <ProgramButton label={appText(all?'فلترة الغرف':'لغة البث وموضوعه')} selected={expanded} onPress={()=>setExpanded(!expanded)}/>
    {expanded&&<View>
      <ProgramButton label={appText('اللغة')+' · '+(value.language?label(value.language):appText('الكل'))} onPress={()=>setLanguagesOpen(!languagesOpen)}/>
      {languagesOpen&&<View style={fields}>{(all?['',...languages]:languages).map(code=><ProgramButton key={code} label={code?label(code):appText('الكل')} selected={value.language===code} onPress={()=>{choose({...value,language:code});setLanguagesOpen(false)}}/>)}</View>}
      <View style={fields}>{(all?['',...Object.keys(programTopics)]:Object.keys(programTopics)).map(key=><ProgramButton key={key} label={appText(programTopics[key]||'الكل')} selected={value.topic===key} onPress={()=>choose({...value,topic:key})}/>)}</View>
    </View>}
  </View>;
}
function EventEditor({tags,request,onCreated,locale}){
  const [open,setOpen]=useState(false),[name,setName]=useState(''),[date,setDate]=useState(''),[time,setTime]=useState('20:00'),[type,setType]=useState('audio'),[error,setError]=useState('');
  const lock=useRef(false);
  function show(){
    const now=new Date();now.setDate(now.getDate()+1);
    setDate([now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'));setError('');setOpen(!open);
  }
  async function save(){
    if(lock.current)return;
    const stamp=new Date(date+'T'+time+':00');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)||!Number.isFinite(stamp.getTime())||stamp.getDate()!==Number(date.slice(-2))||!name.trim()){setError(appText('تحقّق من الموعد والعنوان'));return}
    lock.current=true;
    try{await request('/account-number',{op:'eventCreate',...tags,name,starts:stamp.getTime(),type});setOpen(false);setName('');onCreated()}
    catch(e){setError(uiError(e))}finally{lock.current=false}
  }
  const input={borderWidth:1,borderColor:theme.line,borderRadius:10,padding:8,color:theme.ink};
  return <View><ProgramButton label={appText('جدولة بث')} selected={open} onPress={show}/>
    {open&&<View style={{gap:6}}><TextInput accessibilityLabel={appText('اسم الغرفة')} placeholder={appText('اسم الغرفة')} style={input} value={name} maxLength={55} onChangeText={setName}/>
      <Text>{appText('التاريخ والوقت المحلي')}</Text>
      <TextInput accessibilityLabel={appText('التاريخ')} style={input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD"/>
      <TextInput accessibilityLabel={appText('الوقت')} style={input} value={time} onChangeText={setTime} placeholder="HH:mm"/>
      <View style={{flexDirection:'row'}}>{['audio','video'].map(t=><ProgramButton key={t} label={appText(t==='audio'?'غرفة صوتية':'بث فيديو')} selected={t===type} onPress={()=>setType(t)}/>)}</View>
      <ProgramButton label={appText('حفظ')} onPress={save}/>{!!error&&<Text accessibilityLiveRegion="polite">{error}</Text>}</View>}
  </View>;
}
function UpcomingRooms({events,uid,locale,onRemind,onStart,onCancel}){
  if(!events.length)return null;
  return <View><Text style={{fontWeight:'700',color:theme.ink}}>{appText('البث القادم')}</Text>
    {events.map(e=><View key={e.id} style={{paddingVertical:7,borderBottomWidth:1,borderColor:theme.line}}>
      <Text style={{color:theme.ink}}>{e.name}</Text><Text>{new Date(e.starts).toLocaleString(locale)}</Text>
      {e.owner===uid?<View style={{flexDirection:'row'}}><ProgramButton label={appText('بدء البث')} onPress={()=>onStart(e)}/><ProgramButton label={appText('إلغاء الموعد')} onPress={()=>onCancel(e)}/></View>:
      <ProgramButton label={appText(e.interested?'إلغاء التذكير':'ذكّرني')} selected={!!e.interested} onPress={()=>onRemind(e)}/>}
    </View>)}</View>;
}

export default function App(){
  const [locale,setLocale]=useState(()=>readLocale(()=>window.localStorage)||'en');
  const words=languages[locale]||languages.en;
  const menu=accountLabels[locale]||accountLabels.en;
  useSyncExternalStore(subscribeInterface,interfaceRevision,interfaceRevision);
  function pickLocale(code){
    saveLocale(()=>window.localStorage,code);
    setInterfaceLanguage(code);
    setLocale(code);setAuthError('');
  }

  const previousPage=useRef('home');
  const [mini,setMini]=useState(false);
  const [page,setPage]=useState('loading');
  const [shortAuthor,setShortAuthor]=useState(null);
  const [roomProfileUid,setRoomProfileUid]=useState(null);
  const [inviteAll,setInviteAll]=useState(false),[inviteRoomId,setInviteRoomId]=useState(null);
  const [broadcastName,setBroadcastName]=useState('');
  const [followRevision,setFollowRevision]=useState(0);
  const [reportComment,setReportComment]=useState(null);
  const [initialShort,setInitialShort]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('short'));
  const [user,setUser]=useState(null);
  const [identity,setIdentity]=useState(null),[numberError,setNumberError]=useState('');
  async function numbers(op='read',number){
    const who=auth().currentUser;
    if(!who)return;
    const token=await who.getIdToken();
    const res=await fetch(MEDIA_ENDPOINT+'/account-number',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({op,number})});
    const data=await res.json();
    if(!res.ok)throw Error(ui(data.error)||ui("تعذر فتح متجر الأرقام"));
    if(auth().currentUser?.uid===who.uid){setIdentity({...data,uid:who.uid});setNumberError('')}
  }
  useEffect(()=>{if(user?.uid)numbers().catch(e=>setNumberError(uiError(e)));else setIdentity(null)},[user?.uid,page]);
  const numberAction=(op,n)=>numbers(op,n).catch(e=>Alert.alert(ui("أرقام كليبي"),uiError(e)));

  const [name,setName]=useState(''),[phone,setPhone]=useState(''),[country,setCountry]=useState(0),[countriesOpen,setCountriesOpen]=useState(false),[accepted,setAccepted]=useState(false);
  const [confirmation,setConfirmation]=useState(null),[smsCode,setSmsCode]=useState(''),[busy,setBusy]=useState(false),[authError,setAuthError]=useState('');
  const [avatar,setAvatar]=useState('👤');
  const [policy,setPolicy]=useState(null);
  const pickingPhoto=useRef(false);
  const selectedEmoji=useRef(null);
  async function pickAccountPhoto(){
    const account=auth().currentUser;
    if(!account||pickingPhoto.current)return;
    pickingPhoto.current=true;
    try{
      const photo=await choosePhoto(420);
      if(!photo||auth().currentUser?.uid!==account.uid)return;
      const db=firestore();
      const profile=db.collection('users').doc(account.uid);
      await db.runTransaction(async transaction=>{
        const current=await transaction.get(profile);
        const update={avatar:photo,updatedAt:firestore.FieldValue.serverTimestamp()};
        if(!current.exists)update.displayName=(account.displayName||name||ui("مستخدم")).trim().slice(0,35)||ui("مستخدم");
        transaction.set(profile,update,{merge:true});
      });
      if(auth().currentUser?.uid===account.uid){selectedEmoji.current=null;setAvatar(photo)}
    }catch(error){
      if(auth().currentUser?.uid===account.uid)Alert.alert(ui("الصورة"),uiError(error));
    }finally{pickingPhoto.current=false}
  }
  const profileSetupRef=useRef(false);
  const currentSessionUidRef=useRef(undefined);
  // جميع هذه الأرصدة عرض محلي فقط، لا تُمنح فعليًا لكل حساب على Firebase.
  const [wallet,setWallet]=useState({welcome:WELCOME,purchased:0,owner:0});
  const walletRef=useRef({welcome:WELCOME,purchased:0,owner:0});
  const ownerDemo=false;
  const [inventory,setInventory]=useState(["👑 إطار فاخر","🏎️ دخول سيارة فاخرة"]);
  const [equipped,setEquipped]=useState({frame:'👑 إطار فاخر',ride:'🏎️ دخول سيارة فاخرة'});
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
  const creatingRoom=useRef(false);
  const [discoveryFilter,setDiscoveryFilter]=useState('all');
  useEffect(()=>setInviteAll(false),[page,discoveryFilter]);
  const [draftCover,setDraftCover]=useState(null);
  const coverPicker=useRef(false);
  async function chooseDraftCover(){
    if(coverPicker.current)return;
    const uid=auth().currentUser?.uid;coverPicker.current=true;
    try{const photo=await choosePhoto(720);if(photo&&uid&&auth().currentUser?.uid===uid)setDraftCover(photo)}
    catch(error){Alert.alert(appText('غلاف البث'),uiError(error))}finally{coverPicker.current=false}
  }
  async function assignDraftCover(id){
    if(!draftCover)return;
    await mediaRequest('/account-number',{op:'roomCover',room:id,image:draftCover});
    setDraftCover(null);
  }
  const [tags,setTags]=useState({language:'',topic:'social'}),[searchTags,setSearchTags]=useState({language:'',topic:''});
  const [events,setEvents]=useState([]),[eventRevision,setEventRevision]=useState(0);
  const announced=useRef(new Set()),eventBusy=useRef(false);
  const myTags={...tags,language:tags.language||locale};
  useEffect(()=>{
    if(!user?.uid){setEvents([]);announced.current.clear();return}
    let active=true,loading=false;
    async function refresh(){
      if(loading)return;loading=true;
      try{
        const out=await mediaRequest('/account-number',{op:'eventList'});
        if(!active)return;
        setEvents(out.events||[]);
        for(const e of out.alerts||[]){
          if(announced.current.has(e.id))continue;
          announced.current.add(e.id);
          Alert.alert(appText('بدأ البث'),e.name,[
            {text:appText('إغلاق'),onPress:()=>mediaRequest('/account-number',{op:'eventSeen',event:e.id}).catch(()=>{})},
            {text:appText('دخول'),onPress:async()=>{
              try{
                if(auth().currentUser?.uid!==user.uid)return;
                const snap=await firestore().collection('rooms').doc(e.room).get();
                if(!snap.exists||snap.data()?.status!=='open'){Alert.alert(appText('انتهى البث'));return}
                if(auth().currentUser?.uid!==user.uid)return;
                if(activeRoomRef.current?.ownerUid===user.uid&&activeRoomRef.current.id!==e.room){Alert.alert(appText('أنهِ بثك الحالي قبل الانضمام إلى غرفة أخرى.'));return}
                enterRoom({...snap.data(),id:e.room});await mediaRequest('/account-number',{op:'eventSeen',event:e.id});
              }catch(err){Alert.alert(appText('تعذر الاتصال'),uiError(err))}
            }}]);break;
        }
      }catch{}finally{loading=false}
    }
    refresh();const timer=setInterval(refresh,20000);return()=>{active=false;clearInterval(timer)};
  },[user?.uid,eventRevision]);
  async function changeEvent(op,e,enabled){
    if(eventBusy.current)return;eventBusy.current=true;
    try{await mediaRequest('/account-number',{op,event:e.id,enabled});setEventRevision(v=>v+1)}
    catch(err){Alert.alert(appText('تعذر الاتصال'),uiError(err))}finally{eventBusy.current=false}
  }
  const [helpCover,setHelpCover]=useState(null);
  const helpCoverImage=helpCover?{uri:MEDIA_ENDPOINT+'/room-covers/'+helpRoom.id+'/'+helpCover+'.jpg'}:brandIcon;
  const [rooms,setRooms]=useState([]),[roomName,setRoomName]=useState('غرفتي'),[roomType,setRoomType]=useState('video'),[activeRoom,setActiveRoom]=useState(null);
  const activeRoomRef=useRef(null);activeRoomRef.current=activeRoom;
  const [paymentMethod,setPaymentMethod]=useState('usd'),[piRate,setPiRate]=useState('');
  const pageRef=useRef('loading');
  const total=wallet.welcome+wallet.purchased+(ownerDemo?wallet.owner:0);
  const available=wallet.welcome+wallet.purchased+(ownerDemo?wallet.owner:0);
  const go=p=>{if(!SHOW_UNRELEASED_DEMOS&&['earnings','payout','gifts','linkPiAccount'].includes(p))return;pageRef.current=p;setPage(p)};
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
    if(payoutCountry==='OTHER'&&!payoutOtherCountry.trim()){Alert.alert(appText('الدولة'),appText('اكتب اسم الدولة'));return;}
    if(!payoutHolder.trim()||payoutHolder.trim().length<3){
      Alert.alert(appText('اسم المستفيد'),appText('أدخل الاسم الحقيقي للمستفيد'));return;
    }
    if(!Number.isFinite(amount)||amount<=0){
      Alert.alert(appText('المبلغ'),appText('أدخل مبلغًا موجبًا بالدولار للمعاينة'));return;
    }
    if(payoutMethod==='wallet'&&(!provider||payoutAccount.replace(/\D/g,'').length<7)){
      Alert.alert(appText('بيانات المحفظة'),appText('اختر المحفظة وأدخل رقم هاتف صحيحًا'));return;
    }
    if(payoutMethod==='bank'&&(!payoutBankName.trim()||payoutAccount.trim().length<8)){
      Alert.alert(appText('بيانات البنك'),appText('أدخل اسم البنك ورقم الحساب/IBAN'));return;
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
    Alert.alert(appText('مسودة فقط'),appText('تم تجهيز معاينة طلب السحب، ولم يتم إرسال طلب أو تحويل أي مبلغ. الرصيد القابل للسحب حاليًا صفر.'));
  }

  const setBalance=w=>{walletRef.current=w;setWallet(w)};

  useEffect(()=>{
    if(!GOOGLE_WEB_CLIENT_ID)return;
    try{GoogleSignin.configure({webClientId:GOOGLE_WEB_CLIENT_ID});}
    catch(error){console.warn('Google sign-in initialization failed',error);}
  },[]);
  useEffect(()=>{
    let active=true;
    let unsub;
    try{unsub=auth().onAuthStateChanged(async u=>{
      if(!active)return;
      if(u){
        // A Pi login uses a custom token, even when it opens an existing linked email UID.
        let provider;
        try{provider=(await u.getIdTokenResult()).signInProvider;}
        catch(error){console.warn('Could not restore the Pi session',error.code);}
        if(!active||auth().currentUser?.uid!==u.uid)return;
        if(provider!=='custom'){await auth().signOut();return;}
      }
      // Local demo data must never leak between Firebase accounts on the same device.
      if(currentSessionUidRef.current!==u?.uid){
        currentSessionUidRef.current=u?.uid;
        selectedEmoji.current=null;setAvatar('👤');
        setBalance({welcome:WELCOME,purchased:0,owner:0});

        setInventory(["👑 إطار فاخر","🏎️ دخول سيارة فاخرة"]);
        setEquipped({frame:'👑 إطار فاخر',ride:'🏎️ دخول سيارة فاخرة'});
        setSpent(0);setReceived(0);setSupportLog([]);
        setPayoutDrafts([]);setPayoutAccount('');setPayoutHolder('');
        setPayoutBankName('');setPayoutSwift('');setPayoutAmount('');
      }
      setUser(u);
      setDraftCover(null);setRooms([]);setActiveRoom(null);setBroadcastName('');setInviteAll(false);setInviteRoomId(null);setRoomProfileUid(null);
      if(u){
        // Account creation or SMS confirmation owns profile creation and navigation until it finishes.
        if(profileSetupRef.current)return;
        try{
          const doc=await firestore().collection('users').doc(u.uid).get();
          if(!active||auth().currentUser?.uid!==u.uid)return;
          if(doc.exists){
            const d=doc.data()||{};
            setName(d.displayName||u.displayName||ui("مستخدم"));
            setAvatar(d.avatar||'👤');
          }else if(u.displayName)setName(u.displayName);
        }catch(e){console.warn('Profile load failed',e.message)}
        await openRoomInvitation(u,()=>active);
      }else{
        setConfirmation(null);setSmsCode('');setAvatar('👤');setBlockedUsers([]);
        setName('');setRoomError('');
        go('login');
      }
    });}catch(error){
      console.warn('Firebase authentication initialization failed',error);
      setAuthError(ui("تعذر بدء تسجيل الدخول. أغلق التطبيق وحاول مجددًا."));
      go('login');
    }
    return ()=>{active=false;unsub?.()};
  },[]);
  useEffect(()=>{
    if(!user?.uid)return;
    setRooms([]);setRoomError('');
    let candidates=[],live=new Set(),liveTags={},mounted=true,pending=false;
    const display=()=>setRooms(candidates.filter(r=>r.id!==helpRoom.id&&r.status==='open'&&live.has(r.id)).map(r=>({...r,...liveTags[r.id],coverUrl:liveTags[r.id]?.cover?MEDIA_ENDPOINT+'/room-covers/'+encodeURIComponent(r.id)+'/'+liveTags[r.id].cover+'.jpg':null})));
    async function refresh(){
      if(pending)return;
      pending=true;
      try{
        const response=await fetch(MEDIA_ENDPOINT+'/active-rooms');
        if(!response.ok)throw Error(appText('تعذر التحقق من الغرف المفتوحة'));
        const data=await response.json();
        if(mounted){
          live=new Set(data.rooms);liveTags=data.tags||{};
          setHelpCover(data.supportRoom?.cover??null);
          display();setRoomError('');
        }
      }catch(e){if(mounted){live.clear();display();setRoomError(uiError(e))}}
      finally{pending=false}
    }
    void refresh();
    const interval=setInterval(refresh,10000);
    const unsub=firestore().collection('rooms').orderBy('createdAt','desc').limit(50).onSnapshot(snapshot=>{
      candidates=snapshot.docs.map(d=>({id:d.id,...d.data()}));display();
    },e=>{setRooms([]);setRoomError(ui("تعذر تحميل الغرف: ")+uiError(e))});
    return ()=>{mounted=false;clearInterval(interval);unsub()};
  },[user?.uid]);
  useEffect(()=>{
    if(!user?.uid){setBlockedUsers([]);return;}
    const unsub=firestore().collection('users').doc(user.uid).collection('blocked').onSnapshot(
      snapshot=>setBlockedUsers(snapshot.docs.map(doc=>doc.id)),
      error=>console.warn('Blocked users:',error.message)
    );
    return unsub;
  },[user?.uid]);
  async function unblockUser(uid){
    if(!user?.uid||!uid)return;
    try{
      await firestore().collection('users').doc(user.uid).collection('blocked').doc(uid).delete();
      Alert.alert(ui("تم"),ui("أزلنا هذا الحساب من قائمة الحظر لديك"));
    }catch(error){Alert.alert(ui("تعذر إلغاء الحظر"),uiError(error))}
  }
  function deleteAccount(){go('deleteAccount')}
  async function saveProfile(u,label,editing=false){
    if(!u?.uid)throw new Error(ui("يرجى تسجيل الدخول أولًا"));
    if(!editing&&(await firestore().collection('users').doc(u.uid).get()).exists)return;
    const displayName=(label||u.displayName||ui("مستخدم")).trim();
    if(!displayName||displayName.length>35)throw new Error(ui("اسم المستخدم يجب أن يكون بين 1 و35 حرفًا"));
    const update={displayName,updatedAt:firestore.FieldValue.serverTimestamp()};
    if(!editing||selectedEmoji.current)update.avatar=selectedEmoji.current||avatar;
    await firestore().collection('users').doc(u.uid).set(update,{merge:true});
    if(auth().currentUser?.uid===u.uid)setName(displayName);
  }
  function phoneAuthMessage(e){
    if(/billing[-_ ]not/i.test(`${e?.code||''} ${e?.message||''}`)){
      return appText('رموز SMS غير متاحة حاليًا لأن الفوترة غير مفعّلة لدى مزوّد تسجيل الدخول.');
    }
    switch(e?.code){
      case 'auth/invalid-phone-number': return appText('رقم الهاتف غير صحيح. تحقق من رمز الدولة والرقم.');
      case 'auth/too-many-requests': return appText('محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.');
      case 'auth/quota-exceeded': return appText('تم تجاوز حد رسائل التحقق. حاول لاحقًا.');
      case 'auth/invalid-verification-code': return appText('رمز التحقق غير صحيح.');
      case 'auth/code-expired': return appText('انتهت صلاحية الرمز. اطلب رمزًا جديدًا.');
      case 'auth/network-request-failed': return appText('تعذر الاتصال بالشبكة. تحقق من الإنترنت.');
      default: return e?.message||'حدث خطأ في التحقق. حاول مرة أخرى.';
    }
  }
  async function phoneLogin(){
    if(busy)return;
    if(!accepted)return Alert.alert(appText('الشروط'),appText('وافق على الشروط أولاً'));
    if(!name.trim()||name.trim().length>35)return Alert.alert(ui("الاسم"),appText('أدخل اسمًا من 1 إلى 35 حرفًا'));
    const local=phone.replace(/\D/g,'').replace(/^0+/,'');
    if(local.length<7||local.length>15)return Alert.alert(appText('الهاتف'),appText('أدخل رقم هاتف صحيح من 7 إلى 15 رقمًا'));
    Keyboard.dismiss();
    setBusy(true);setAuthError('');
    try{const c=await auth().signInWithPhoneNumber(COUNTRIES[country][1]+local);setConfirmation(c);setSmsCode('');go('verify')}
    catch(e){const message=phoneAuthMessage(e);setAuthError(message);Alert.alert(appText('تعذر إرسال SMS'),uiError(message))}
    finally{setBusy(false)}
  }
  async function verifySms(){
    if(busy)return;
    if(!confirmation||!/^\d{6}$/.test(smsCode.trim()))return Alert.alert(appText('رمز SMS'),appText('أدخل ستة أرقام'));
    profileSetupRef.current=true;
    setBusy(true);setAuthError('');
    try{
      const credential=await confirmation.confirm(smsCode.trim());
      // A valid SMS code must not be reported as invalid if Firestore is unavailable.
      try{await saveProfile(credential.user,name.trim())}
      catch(e){console.warn('Profile save failed:',e.message);Alert.alert(appText('تعذر حفظ الملف الشخصي'),appText('تم تسجيل الدخول بنجاح، لكن تعذر حفظ الاسم مؤقتًا. يمكنك المحاولة لاحقًا.'));}
      setUser(credential.user);setConfirmation(null);
      await openRoomInvitation(credential.user);
    }
    catch(e){const message=phoneAuthMessage(e);setAuthError(message);Alert.alert(appText('فشل التحقق'),uiError(message))}
    finally{profileSetupRef.current=false;setBusy(false)}
  }
  async function googleLogin(){
    if(busy)return;
    if(!accepted)return Alert.alert(appText('الشروط'),appText('وافق على الشروط أولاً'));
    if(!GOOGLE_WEB_CLIENT_ID)return Alert.alert(appText('إعداد Google'),appText('أضف EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID في بيئة EAS، وفعّل Google في Firebase'));
    setBusy(true);setAuthError('');
    try{
      if(Platform.OS==='android')await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
      const result=await GoogleSignin.signIn();
      if(result.type==='cancelled')return;
      const token=result.data?.idToken||result.idToken;
      if(!token)throw new Error(appText('Google لم يرجع ID Token'));
      const credential=auth.GoogleAuthProvider.credential(token);
      const signed=await auth().signInWithCredential(credential);
      try{await saveProfile(signed.user,signed.user.displayName||name.trim())}
      catch(profileError){console.warn('Google profile sync:',profileError.message)}
      setUser(signed.user);await openRoomInvitation(signed.user);
    }catch(e){if(e?.code!=='SIGN_IN_CANCELLED'&&e?.code!=='12501'){
      const detail=e?.code==='10'?'تعذر التحقق من إعدادات Google لهذا الإصدار.':e?.message||'تعذر تسجيل الدخول باستخدام Google.';setAuthError(uiError(detail));Alert.alert(appText('فشل تسجيل Google'),uiError(detail))
    }}finally{setBusy(false)}
  }
  async function facebookLogin(){
    if(busy)return;
    if(!accepted)return Alert.alert(appText('الشروط'),appText('وافق على الشروط أولاً'));
    if(!FACEBOOK_CONFIGURED)return Alert.alert(appText('إعداد Facebook'),appText('أكمل EXPO_PUBLIC_FACEBOOK_APP_ID وEXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN وإعداد مزود Facebook في Firebase قبل تسجيل الدخول'));
    setBusy(true);setAuthError('');
    try{
      const {LoginManager,AccessToken,AuthenticationToken}=({});
      let credential;
      if(Platform.OS==='ios'){
        const rawNonce=Crypto.randomUUID();
        const hashedNonce=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,rawNonce);
        const response=await LoginManager.logInWithPermissions(['public_profile','email'],'limited',hashedNonce);
        if(response.isCancelled)return;
        const token=await AuthenticationToken.getAuthenticationTokenIOS();
        if(!token?.authenticationToken)throw new Error(appText('Facebook Limited Login لم يرجع رمزًا'));
        credential=auth.FacebookAuthProvider.credential(token.authenticationToken,rawNonce);
      }else{
        const response=await LoginManager.logInWithPermissions(['public_profile','email']);
        if(response.isCancelled)return;
        const token=await AccessToken.getCurrentAccessToken();
        if(!token?.accessToken)throw new Error(appText('Facebook لم يرجع Access Token'));
        credential=auth.FacebookAuthProvider.credential(token.accessToken);
      }
      const signed=await auth().signInWithCredential(credential);
      try{await saveProfile(signed.user,signed.user.displayName||name.trim())}
      catch(profileError){console.warn('Facebook profile sync:',profileError.message)}
      setUser(signed.user);await openRoomInvitation(signed.user);
    }catch(e){if(e?.code!=='SIGN_IN_CANCELLED'&&e?.code!=='12501'){
      const detail=e?.message||'راجع Facebook App ID وإعداد Firebase';setAuthError(uiError(detail));Alert.alert(appText('فشل تسجيل Facebook'),uiError(detail))
    }}
    finally{setBusy(false)}
  }
  async function logout(){
    try{await auth().signOut();if(FACEBOOK_CONFIGURED){try{({}).LoginManager.logOut()}catch(_e){}}setBalance({welcome:WELCOME,purchased:0,owner:0});setPayoutDrafts([]);setSupportLog([]);setReceived(0);setSpent(0);go('login')}
    catch(e){Alert.alert(ui("تعذر الخروج"),uiError(e))}
  }

  function spend(cost){
    if(!Number.isSafeInteger(cost)||cost<=0)return null;
    const old=walletRef.current;const next={...old};let remain=cost;
    if(![next.welcome,next.purchased,next.owner].every(n=>Number.isSafeInteger(n)&&n>=0))return null;
    if(next.welcome+next.purchased+(ownerDemo?next.owner:0)<cost)return null;
    if(ownerDemo){const n=Math.min(remain,next.owner);next.owner-=n;remain-=n}
    const n=Math.min(remain,next.welcome);next.welcome-=n;remain-=n;
    const m=Math.min(remain,next.purchased);next.purchased-=m;remain-=m;
    if(remain!==0)return null;
    setBalance(next);
    return {owner:old.owner-next.owner,welcome:old.welcome-next.welcome,purchased:old.purchased-next.purchased};
  }

  async function createRoom(kind,title,previous=null,event=null){
    if(creatingRoom.current)return;
    if(!user?.uid)return Alert.alert(ui("الحساب"),ui("سجّل الدخول أولًا"));
    const host=broadcastName.trim().slice(0,35);
    if(!host&&!event)return Alert.alert(menu.broadcasterName);
    const label=title.trim().slice(0,55);
    if(!label)return Alert.alert(ui("اسم الغرفة"),ui("أدخل الاسم"));
    creatingRoom.current=true;setBusy(true);
    try{
      if(previous){
        const room=await openPreviousBroadcast(firestore(),mediaRequest,previous,user.uid,host,firestore.FieldValue.serverTimestamp());
        try{await assignDraftCover(room.id)}catch(error){Alert.alert(appText('تعذّر حفظ غلاف البث'),uiError(error))}
        setInviteRoomId(inviteAll?room.id:null);setInviteAll(false);setBroadcastName('');enterRoom(room);return;
      }
      const data={name:label,type:kind,ownerUid:user.uid,ownerName:host||name||user.displayName||'Clipi',createdAt:firestore.FieldValue.serverTimestamp(),status:'open'};
      const doc=await firestore().collection('rooms').add(data);
      try{await assignDraftCover(doc.id)}catch(error){Alert.alert(appText('تعذّر حفظ غلاف البث'),uiError(error))}
      try{await mediaRequest('/account-number',{op:'roomTag',room:doc.id,...(event?{language:event.language,topic:event.topic}:myTags),event:event?.id});setEventRevision(v=>v+1)}
      catch(error){Alert.alert(appText('تعذر الاتصال'),uiError(error))}

      setInviteRoomId(inviteAll?doc.id:null);setInviteAll(false);setBroadcastName('');enterRoom({id:doc.id,...data,host,owner:user.uid});
    }catch(e){Alert.alert(ui("تعذر إنشاء الغرفة"),uiError(e))}finally{creatingRoom.current=false;setBusy(false)}
  }
  useEffect(()=>{
    if(!user?.uid)return;
    let revision=0;
    function openChangedInvitation(){
      const attempt=++revision;
      const account=auth().currentUser;
      if(account?.uid===user.uid&&roomInvitationId(location)){
        void openRoomInvitation(account,()=>attempt===revision);
      }
    }
    window.addEventListener('hashchange',openChangedInvitation);
    return ()=>{
      revision++;
      window.removeEventListener('hashchange',openChangedInvitation);
    };
  },[user?.uid]);
  async function openRoomInvitation(account,isMounted=()=>true){
    const isCurrent=()=>isMounted()&&auth().currentUser?.uid===account.uid;
    if(!isCurrent())return;
    if(location.pathname==='/delete-account'){go('deleteAccount');return}
    const target=new URL(location.href);
    if(target.searchParams.get('open')==='account'){
      target.searchParams.delete('open');
      window.history.replaceState(window.history.state,'',target);
      go('profile');return;
    }
    const id=roomInvitationId(location);
    const isCurrentInvite=()=>isCurrent()&&roomInvitationId(location)===id;
    if(id===helpRoom.id){enterRoom(helpRoom);return;}
    if(id){
      try{
        let target=id;
        let room=(await firestore().collection('rooms').doc(target).get()).data();
        if(room?.status!=='open'){
          const current=await mediaRequest('/room-control',{op:'currentBroadcast',roomId:id});
          if(current.session){target=current.session;room=(await firestore().collection('rooms').doc(target).get()).data()}
        }
        if(!isCurrentInvite())return;
        if(room?.status==='open'){
          enterRoom({...room,id:target});
          return;
        }
      }catch(error){
        console.warn('Room invitation could not be loaded:',error.code||error.message);
      }
      if(isCurrentInvite()){
        setActiveRoom(null);
        setMini(false);
        setDiscoveryFilter('audio');
        go('rooms');
        Alert.alert(ui('تعذر فتح الغرفة'),ui('قد تكون الغرفة مغلقة أو الرابط غير متاح الآن.'));
      }
      return;
    }
    if(isCurrent())go(['linkPiAccount','profile'].includes(pageRef.current)?'profile':'home');
  }
  function openHostProfile(uid,hostName,photo){
    setRoomProfileUid(uid);setMini(true);
    if(uid===user.uid){go('profile');return}
    setShortAuthor({uid,name:hostName,avatar:photo});go('shortAuthor');
  }
  async function enterRoomById(){
    const number=normalizeRoomNumber(roomSearch);
    if(!/^\d{7,15}$/.test(number))return;
    const uid=user.uid;
    try{
      const {room:id}=await mediaRequest('/account-number',{op:'findRoomNumber',number});
      const room=id===helpRoom.id?helpRoom:(await firestore().collection('rooms').doc(id).get()).data();
      if(auth().currentUser?.uid!==uid||pageRef.current!=='rooms')return;
      if(room?.status==='open'&&!blockedUsers.includes(room.ownerUid)){
        enterRoom({...room,id});
        return;
      }
      Alert.alert(appText('معرّف الغرفة'),appText('الغرفة أو البث غير متاح الآن.'));
    }catch(error){
      if(auth().currentUser?.uid===uid&&pageRef.current==='rooms'){
        Alert.alert(appText('تعذر البحث عن الغرفة'),uiError(error));
      }
    }
  }
  function enterRoom(room){
    setRoomProfileUid(null);
    if(room.status==='closed')return Alert.alert(ui("غرفة مغلقة"),ui("هذه الغرفة مغلقة الآن"));
    previousPage.current=['room','loading','login'].includes(pageRef.current)?'home':pageRef.current;setMini(false);
    setActiveRoom({...room,host:room.ownerName||room.host||'مضيف',owner:room.ownerUid||room.owner});go(previousPage.current);
  }
  function closeMyRoom(room){
    if(!user?.uid||room.ownerUid!==user.uid)return;
    Alert.alert(ui("إغلاق الغرفة"),ui("سيُمنع إرسال رسائل جديدة إلى الغرفة بعد إغلاقها، وتبقى الرسائل السابقة محفوظة للإشراف. هل توافق؟"),[
      {text:ui("إلغاء"),style:'cancel'},
      {text:ui("إغلاق"),style:'destructive',onPress:async()=>{
        try{await firestore().collection('rooms').doc(room.id).update({status:'closed'});
          if(MEDIA_CONFIGURED)void mediaRequest('/close-room',{roomId:room.id,session:crypto.randomUUID()}).catch(()=>Alert.alert(ui("تعذر إنهاء بث الغرفة على الخادم")));if(activeRoom?.id===room.id){setActiveRoom(null);go('rooms')}}
        catch(e){Alert.alert(ui("تعذر الإغلاق"),uiError(e))}
      }}]);
  }
  function buyGood(g){if(inventory.includes(g[1]))return Alert.alert(ui("مملوكة"));if(!spend(g[2]))return Alert.alert(ui("رصيد غير كافٍ"));setInventory(v=>[...v,g[1]])}
  function purchase(pack){
    const usd=pack/DIAMONDS_PER_USD;
    if(paymentMethod==='usd')Alert.alert(ui("معاينة شراء"),fmt(pack)+ui(' ماسة بسعر $')+usd+ui('. الدفع الحقيقي غير مربوط.'));
    else{const rate=Number(piRate);if(!Number.isFinite(rate)||rate<=0)return Alert.alert(ui("سعر PI"),ui("أدخل سعر PI الحالي بالدولار"));Alert.alert(ui("معاينة PI"),fmt(Math.round(usd*DIAMONDS_PER_PI_USD))+ui(' ماسة مقابل ')+(usd/rate).toFixed(6)+ui(' PI وفق السعر المدخل. يتغير سعر PI من حين إلى آخر، ولا يتم تحصيل أي دفع.'))}
  }
  function header(title,back=()=>go('home')){return <View style={S.header}><TouchableOpacity onPress={back}><Text style={S.white}>{ui("❮ رجوع")}</Text></TouchableOpacity><Text style={S.headerTitle}>{title}</Text>{page!=='wallet'&&page!=='earningsWallet'&&<TouchableOpacity onPress={()=>go('wallet')}><Text style={S.gold}>{SHOW_UNRELEASED_DEMOS?'💎 '+fmt(total):'💎 '+ui('المحفظة')}</Text></TouchableOpacity>}</View>}
  function nav(){
    const items=[
      {id:'home',icon:'⌂',label:ui('الرئيسية')},
      {id:'rooms',icon:'◫',label:ui('الغرف')},
      {id:'create',icon:'+',label:ui('رفع فيديو')},
      {id:'store',icon:'◇',label:ui('المتجر')},
      {id:'profile',icon:'◎',label:ui('حسابي')}
    ];
    const current=page==='profileEdit'||page==='accountSettings'||page==='earningsWallet'?'profile':page;
    return <ClipiDock items={items} page={current} onNavigate={destination=>{
      if(destination==='home'||destination==='rooms'){setDiscoveryFilter('all');setRoomSearch('')}
      go(destination==='create'?'uploadShort':destination);
    }}/>;
  }
  function layout(title,children,back){return <View style={S.page}><StatusBar barStyle="dark-content"/>{header(title,back)}<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={S.content}>{children}</ScrollView>{nav()}</View>}
  const visibleNumber=identity?.uid===user?.uid?identity:null;
  const onFollowChange=()=>setFollowRevision(n=>n+1);
  const socialProfile=owner=>({request:mediaRequest,locale,fromRoom:!!activeRoom&&mini&&roomProfileUid===owner,owner,viewer:user?.uid,followRevision,onFollowChange});
  const shortPlayerProps={translate:appText,liveRooms:rooms.filter(r=>!blockedUsers.includes(r.ownerUid)),onVisitLive:async room=>{
    const uid=user?.uid;
    if(!uid)return;
    if(activeRoom?.id===room.id){setMini(false);return}
    if(activeRoom?.ownerUid===uid){Alert.alert(appText('أنهِ بثك الحالي قبل الانضمام إلى غرفة أخرى.'));return}
    try{
      const snap=await firestore().collection('rooms').doc(room.id).get();
      if(auth().currentUser?.uid!==uid)return;
      if(!snap.exists||snap.data()?.status!=='open'){Alert.alert(appText('انتهى البث'));return}
      enterRoom({...snap.data(),id:room.id});
    }catch(e){Alert.alert(appText('تعذر الاتصال'),uiError(e))}
  },
    followRevision,onFollowChange,followLabels:menu,
    viewer:{uid:user?.uid,name:name||user?.displayName||'مستخدم كليبي',avatar},
    playable:!activeRoom,gifts:GIFTS,onWallet:()=>go('wallet'),onShop:()=>go('wallet'),
    onReport:(id,comment=null)=>{setReportComment(comment);setInitialShort(id);go('reportShort');}
  };
  const myProfile=<View style={S.card}><AccountPhoto avatar={avatar} onPress={pickAccountPhoto} label={ui("اختيار صورة من الاستوديو")}/><Text style={S.title}>{name||user?.displayName||ui("مستخدم")} {ownerDemo?'👑':''}</Text><Text style={S.gold}>{appText('معرّف الحساب')}: {visibleNumber?.number||'…'}</Text>{SHOW_UNRELEASED_DEMOS&&<Text style={S.big}>💎 {fmt(total)}</Text>}<Text style={S.white}>{ui(equipped.frame)}</Text><Text style={S.white}>{ui(equipped.ride)}</Text>{SHOW_UNRELEASED_DEMOS&&<Text style={S.muted}>{appText("دعم تجريبي تم إرساله: ")}{fmt(spent)}{ui(" ماسة")}</Text>}</View>;

  function policyLinks(privacy,terms){return <View style={S.row}>
    <Small title={privacy} onPress={()=>setPolicy('privacy')}/>
    <Small title={terms} onPress={()=>setPolicy('terms')}/>
  </View>}
  function signInFrame(children){
    return <div className="clipi-pearl-login" lang={locale} dir={appText(words.direction)} style={{flex:1,display:'flex',flexDirection:'column',overflow:'auto'}}>
      <style>{`
        .clipi-pearl-login {background:radial-gradient(ellipse at 15% 8%,#ffffff 0%,transparent 48%),radial-gradient(ellipse at 92% 70%,#d6f0e9 0%,transparent 52%),linear-gradient(145deg,#fff,#edf4f5 40%,#fff 64%,#e7f6f0);font-family:system-ui,sans-serif}
        .clipi-pearl-login .clipi-pearl-cover {border-radius:30px;overflow:hidden;box-shadow:0 10px 28px #47796e25,0 0 0 2px #fff,inset 0 0 15px #fff;position:relative}
        .clipi-pearl-cover::after {content:'';position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:linear-gradient(135deg,#ffffff80 0%,transparent 38%,#ffffff25 70%,transparent);box-shadow:inset 0 2px 5px #fff}
        .clipi-pearl-login .clipi-pearl-card {background:linear-gradient(150deg,#fff 8%,#f7fafb 42%,#fff 64%,#edf6f3 92%)!important;border:1px solid #fff;box-shadow:0 12px 32px #417d6f25,0 0 0 1px #d5e5df,inset 0 0 0 3px #ffffff99}
        .clipi-pearl-card [role=button]:not([role=checkbox]) {box-shadow:0 4px 10px #276e6026,inset 0 2px 3px #ffffff8c;border-radius:18px}
        .clipi-pearl-card .clipi-language-trigger {border:1px solid #b3dbd2}
      `}</style>
      <View style={{flexGrow:1,flexShrink:0,justifyContent:'center',backgroundColor:'transparent',padding:22}}><div className="clipi-pearl-cover"><LoginCover image={brandIcon}/></div><View style={{backgroundColor:'transparent',marginTop:14}}><div className="clipi-pearl-card" style={{display:'flex',flexDirection:'column',padding:18,borderRadius:30,gap:5}}>
        {location.pathname==='/delete-account'&&<Text style={S.white}>{ui('سجّل الدخول لطلب حذف حسابك وبياناته.')} · Liddawiw@gmail.com</Text>}
        <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:accepted}} onPress={()=>setAccepted(value=>!value)}>
          <Text style={S.white}>{accepted?'☑':'☐'} {ui('أوافق على شروط الخدمة وقواعد المجتمع')}</Text></TouchableOpacity>
        {children}
        {!!authError&&<Text accessibilityLiveRegion="polite" style={S.white}>{uiError(authError,words.error)}</Text>}
        <LanguageDropdown selected={locale} onPick={pickLocale} label={appText(words.change)}/>
        {policyLinks(words.privacy,words.terms)}</div></View>
      </View>
    </div>;
  }
  function renderPage(){
  if(page==='earningsWallet')return <EarningsWalletScreen key={user.uid} request={supportRequest} onBack={()=>go('wallet')}/>;
  if(page==='loading')return <View style={[S.page,{justifyContent:'center',alignItems:'center'}]}><Text style={S.title}>Clipi · {appText(words.wait)}</Text></View>;
  if(!user||page==='login')return signInFrame(<>
    <Text style={S.title}>{appText(words.intro)}</Text>
    <Btn color="#11685b" title={busy?words.wait:words.pi} disabled={busy||(!accepted&&location.pathname!=='/delete-account')} onPress={async()=>{
      setBusy(true);setAuthError('');
      try{await piLogin()}catch(error){setAuthError(uiError(error))}finally{setBusy(false)}
    }}/>
  </>);
  if(page==='home')return <ShortVideoHome roomLabels={menu} onAuthor={(uid,authorName,clip,own,authorAvatar)=>{
    setInitialShort(clip);
    if(own || uid===user.uid){go('profile');return;}
    setRoomProfileUid(null);setShortAuthor({uid,name:authorName,avatar:authorAvatar});go('shortAuthor');
  }} {...shortPlayerProps} translate={ui} key={user?.uid} dock={nav()} initialId={initialShort} request={mediaRequest} endpoint={MEDIA_ENDPOINT}
    onOpenLive={id=>{if(id)setInitialShort(id);go('liveOptions');}}/>;
  if(page==='liveOptions'){
    function openRooms(kind){
      setDiscoveryFilter(kind);setRoomSearch('');go('rooms');
    }
    return <HubScreen title={menu.startBroadcast} action={{label:menu.back,onPress:()=>go('home')}} dock={nav()}>
      <HubRows items={[
        {label:menu.voiceRooms,onPress:()=>openRooms('audio')},
        {label:menu.liveBroadcast,onPress:()=>openRooms('video')}
      ]}/>
    </HubScreen>;
  }
  if(page==='reportShort')return <HelpCenter key={user.uid+'report'+initialShort} request={supportRequest} newId={()=>crypto.randomUUID()} initialKind={reportComment?'comment':'video'} reportedComment={reportComment} initialSubject={reportComment?initialShort:MEDIA_ENDPOINT+'/#short='+initialShort} onBack={()=>go('home')}/>;
  if(page==='uploadShort')return <ShortUpload viewer={{uid:user?.uid,name:name||user?.displayName||'مستخدم كليبي',avatar}} key={user?.uid} endpoint={MEDIA_ENDPOINT} request={mediaRequest} getToken={()=>auth().currentUser.getIdToken()}
    onClose={()=>go('home')} onDone={id=>{setInitialShort(id);go('home');}}/>;
  const hostField=<View>
    <TouchableOpacity disabled={busy} accessibilityRole="button" accessibilityLabel={appText('غلاف البث')} onPress={chooseDraftCover} style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:10}}>
      {!!draftCover&&<Image accessible={false} source={{uri:draftCover}} style={{width:76,height:47,borderRadius:8}} resizeMode="cover"/>}
      <Text style={{color:theme.ink,fontWeight:'700'}}>{appText(draftCover?'تغيير غلاف البث':'اختيار غلاف البث')}</Text>
    </TouchableOpacity>
    {!!draftCover&&<ProgramButton disabled={busy} label={appText('إزالة الغلاف')} onPress={()=>setDraftCover(null)}/>}
    <ProgramOptions value={myTags} choose={setTags}/><EventEditor tags={myTags} request={mediaRequest} locale={locale} onCreated={()=>setEventRevision(v=>v+1)}/><BroadcastName label={menu.broadcasterName} value={broadcastName} onChange={setBroadcastName} disabled={busy}/>
    <CircleChoice label={broadcastWords(locale).friends} checked={inviteAll} disabled={busy} onPress={()=>setInviteAll(value=>!value)}/></View>;
  if(page==='previousRooms')return <HubScreen title={menu.previousRooms} action={{label:menu.back,onPress:()=>go('rooms')}} dock={nav()}>
    <PreviousRooms db={firestore()} uid={user.uid} request={mediaRequest} hostField={hostField} menu={menu} locale={locale} busy={busy}
      onResume={room=>createRoom(room.type,room.name,room)}/>
  </HubScreen>;
  if(page==='rooms'){
    const query=roomSearch.trim().toLowerCase();
    const visibleRooms=rooms.filter(r=>(!searchTags.language||searchTags.language===r.language)&&(!searchTags.topic||searchTags.topic===r.topic)&&r.status==='open'&&!blockedUsers.includes(r.ownerUid)
      &&(discoveryFilter==='all'||(r.type==='video'?'video':'audio')===discoveryFilter)
      &&(!query||r.name?.toLowerCase().includes(query)||r.id.toLowerCase().includes(query)));
    const copy={
      all:menu.roomAll,voiceRooms:menu.voiceRooms,voice:ui('غرفة صوتية'),live:menu.liveBroadcast,
      create:discoveryFilter==='video'?menu.startBroadcast:menu.createRoom,
      createNote:discoveryFilter==='all'?menu.roomStudioNote:null,search:ui('ابحث بالاسم أو معرّف الغرفة'),
      empty:ui('لا توجد غرف مطابقة'),close:ui('إغلاق غرفتي'),untitled:ui('الغرفة'),
      welcome:ui('🎁 هدية ترحيبية'),welcomeNote:ui('👑 إطار ملكي فاخر · 🏎️ سيارة فاخرة')
    };
    return <HubScreen title={ui('الغرف')} dock={nav()}>
      <RoomDiscovery extraDiscovery={<View><ProgramOptions all value={searchTags} choose={setSearchTags}/>
        <UpcomingRooms uid={user.uid} locale={locale} events={events.filter(e=>!blockedUsers.includes(e.owner)&&(discoveryFilter==='all'||e.type===discoveryFilter)&&(!searchTags.language||e.language===searchTags.language)&&(!searchTags.topic||e.topic===searchTags.topic)&&(!query||e.name.toLowerCase().includes(query)))}
          onRemind={e=>changeEvent('eventRemind',e,!e.interested)} onCancel={e=>changeEvent('eventCancel',e)} onStart={e=>createRoom(e.type,e.name,null,e)}/></View>} helpRoom={helpRoom} helpImage={helpCoverImage} hostField={discoveryFilter==='all'?null:hostField} copy={copy} userId={user?.uid} rooms={visibleRooms} error={roomError}
        filter={discoveryFilter} onFilter={setDiscoveryFilter} search={roomSearch} onSearch={setRoomSearch} onSearchById={enterRoomById}
        busy={busy} onCreate={()=>{
          if(discoveryFilter==='all'){go('create');return;}
          createRoom(discoveryFilter,broadcastName);
        }} onEnter={enterRoom} onClose={closeMyRoom}/>
      <HubRows items={[{label:menu.previousRooms,onPress:()=>go('previousRooms')}]}/>
    </HubScreen>;
  }
  if(page==='create')return <RoomStudio hostField={hostField} name={roomName} setName={setRoomName} kind={roomType} setKind={setRoomType} onStart={()=>createRoom(roomType,roomName)} onClose={()=>go('home')} busy={busy} copy={{close:ui("رجوع"),title:ui("إنشاء غرفة"),name:ui("اسم الغرفة"),mode:ui("نوع الغرفة"),audio:ui("🎙 صوت"),video:ui("📹 فيديو"),start:ui("فتح الغرفة"),note:ui("الغرفة عامة للمستخدمين المسجلين.")}}/>;
  if(!SHOW_UNRELEASED_DEMOS&&['wallet','earningsWallet'].includes(page))return <HubScreen title={ui('المحفظة')} action={{label:ui('رجوع'),onPress:()=>go('profile')}} dock={nav()}><DiamondWallet key={user.uid} uid={user.uid} onEarnings={()=>go('earningsWallet')} onHelp={()=>go('help')}/></HubScreen>;
  if(page==='wallet')return layout(ui("محفظة Clipi"),<><View style={S.card}><Text style={S.title}>{ui("💎 الرصيد التجريبي")}</Text><Text style={S.big}>{fmt(total)}</Text><Text style={S.white}>{ui("هدية الترحيب: ")}{fmt(wallet.welcome)}</Text><Text style={S.white}>{ui("المشتَرى: ")}{fmt(wallet.purchased)}</Text>{ownerDemo&&<Text style={S.gold}>{ui("معاينة المالك: ")}{fmt(wallet.owner)}</Text>}</View><Text style={S.title}>{ui("طريقة الشراء")}</Text><View style={S.row}><Btn title={ui("💵 دولار")} color={paymentMethod==='usd'?PINK:theme.sea} onPress={()=>setPaymentMethod('usd')}/><Btn title="🪙 PI" color={paymentMethod==='pi'?PINK:theme.sea} onPress={()=>setPaymentMethod('pi')}/></View>{paymentMethod==='pi'&&<><Text style={S.label}>{ui("سعر PI بالدولار (يدوي للمعاينة)")}</Text><TextInput style={S.input} keyboardType="decimal-pad" value={piRate} onChangeText={setPiRate} placeholder={ui("مثال: 0.50")}/></>}{PACKS.map(pack=><View key={pack} style={S.shop}><View style={{flex:1}}><Text style={S.gold}>💎 {fmt(paymentMethod==='pi'?Math.round((pack/DIAMONDS_PER_USD)*DIAMONDS_PER_PI_USD):pack)}</Text><Text style={S.white}>{paymentMethod==='usd'?`${(pack/DIAMONDS_PER_USD).toFixed(2)}`:Number(piRate)>0?`${((pack/DIAMONDS_PER_USD)/Number(piRate)).toFixed(6)} PI`:ui("أدخل سعر PI")}</Text></View><Small title={ui("شراء")} color={PINK} onPress={()=>purchase(pack)}/></View>)}<Text style={S.muted}>{ui("الأسعار المرجعية: 1 دولار = 1,000 ماسة، وما يعادل 1 دولار من PI = 1,200 ماسة. يتغير سعر PI صعودًا وهبوطًا من حين إلى آخر؛ أدخل سعر PI الحالي بالدولار للمعاينة، ولا يُحدَّث السعر تلقائيًا. زر شراء للمعاينة فقط ولا يتم خصم أي أموال. الربط بمتجر Apple / Google ومعالجة PI يحتاجان إعدادات دفع فعلية.")}</Text></>);
  if(page==='earnings')return layout(appText('أرباح المضيف'),<><Btn title={appText("💼 فتح محفظة النقاط")} onPress={()=>go('earningsWallet')}/>
    <View style={S.card}>
      <Text style={S.title}>{appText("🎁 الدعم التجريبي: ")}{fmt(received)} 💎</Text>
      <Text style={S.big}>{appText("💰 القابل للسحب: $0.00")}</Text>
      <Text style={S.muted}>{appText("رصيد الهدايا لا يساوي أرباحًا ممولة. لن يكتمل السحب إلا بعد ربط خادم مالي، والتحقق من الهوية، ومزود تحويل معتمد.")}</Text>
      <Btn title={appText("🌍 اختيار قناة السحب")} onPress={()=>go('payout')}/>
    </View>
    <Text style={S.title}>{appText("سجل الدعم داخل المعاينة")}</Text>
    {supportLog.map(x=><View key={x.id} style={S.panel}>
      <Text style={S.white}>{x.gift} — {fmt(x.value)} 💎</Text>
      <Text style={S.muted}>{appText("المضيف: ")}{x.host}{appText(" · المصدر: ")}{x.source.owner?appText('رصيد مالك'):x.source.welcome?appText('ترحيبي'):appText('مدفوع')}</Text>
    </View>)}
  </>);

  if(page==='payout')return layout(appText('قنوات سحب الأرباح'),<>
    <View style={S.panel}>
      <Text style={S.gold}>{appText("التحويل المالي غير مفعّل")}</Text>
      <Text style={S.muted}>{appText("هذه شاشة اختيار وتجهيز طلب، لا تتم عبرها أي مدفوعات أو إيداعات. يجب التحقق من اعتماد المزود في دولة المستفيد أولًا.")}</Text>
      <Text style={S.white}>{appText("الرصيد القابل للسحب: $0.00")}</Text>
    </View>
    <Text style={S.label}>{appText("الدولة / البلد")}</Text>
    <View style={S.choiceWrap}>
      {PAYOUT_COUNTRIES.map(c=><TouchableOpacity key={c[0]} onPress={()=>choosePayoutCountry(c[0])} style={[S.choice,payoutCountry===c[0]&&S.choiceActive]}>
        <Text style={S.white}>{appText(c[1])}</Text>
      </TouchableOpacity>)}
    </View>
    {payoutCountry==='OTHER'&&<TextInput style={S.input} placeholder={appText("اسم الدولة")} value={payoutOtherCountry} onChangeText={setPayoutOtherCountry}/>}
    <Text style={S.muted}>{appText("البلد المختار: ")}{appText(payoutCountryInfo[1])}{appText(" · العملة المرجعية: ")}{payoutCountryInfo[2]}{appText(" (دون احتساب صرف فعلي)")}</Text>
    <Text style={S.label}>{appText("طريقة الاستلام")}</Text>
    <View style={S.row}>
      <Btn title={appText("📱 محفظة هاتف")} color={payoutMethod==='wallet'?PINK:theme.sea} onPress={()=>setPayoutMethod('wallet')}/>
      <Btn title={appText("🏦 بنك / IBAN")} color={payoutMethod==='bank'?PINK:theme.sea} onPress={()=>setPayoutMethod('bank')}/>
    </View>
    {payoutMethod==='wallet'?<>
      <Text style={S.label}>{appText("المحفظة")}</Text>
      <View style={S.choiceWrap}>{payoutOptions.map(option=><TouchableOpacity key={option} onPress={()=>setPayoutProvider(option)} style={[S.choice,payoutProvider===option&&S.choiceActive]}>
        <Text style={S.white}>{appText(option)}</Text>
      </TouchableOpacity>)}</View>
      {(payoutProvider.includes('أخرى')||payoutProvider.includes('أخرى -'))&&<TextInput style={S.input} placeholder={appText("اسم المحفظة الأخرى")} value={payoutOtherProvider} onChangeText={setPayoutOtherProvider}/>}
      <Text style={S.label}>{appText("رقم الهاتف المرتبط بالمحفظة (مع رمز الدولة)")}</Text>
      <TextInput style={S.input} value={payoutAccount} onChangeText={setPayoutAccount} keyboardType="phone-pad" placeholder={appText("مثال: +9627...")}/>
    </>:<>
      <Text style={S.label}>{appText("اسم البنك (أي بنك في الدولة المختارة)")}</Text>
      <TextInput style={S.input} value={payoutBankName} onChangeText={setPayoutBankName} placeholder={appText("أدخل اسم البنك كما هو رسميًا")}/>
      <Text style={S.label}>{appText("رقم الحساب / IBAN")}</Text>
      <TextInput style={S.input} value={payoutAccount} onChangeText={setPayoutAccount} autoCapitalize="characters" placeholder={appText("IBAN أو رقم الحساب")}/>
      <Text style={S.label}>{appText("SWIFT / BIC (اختياري في المعاينة)")}</Text>
      <TextInput style={S.input} value={payoutSwift} onChangeText={setPayoutSwift} autoCapitalize="characters" placeholder={appText("رمز البنك")}/>
    </>}
    <Text style={S.label}>{appText("الاسم القانوني للمستفيد")}</Text>
    <TextInput style={S.input} value={payoutHolder} onChangeText={setPayoutHolder} placeholder={appText("كما هو مسجل بالمحفظة أو البنك")}/>
    <Text style={S.label}>{appText("المبلغ المطلوب بالدولار (تجريبي)")}</Text>
    <TextInput style={S.input} keyboardType="decimal-pad" value={payoutAmount} onChangeText={setPayoutAmount} placeholder="0.00"/>
    <Btn title={appText("حفظ مسودة طلب السحب فقط")} onPress={createPayoutDraft}/>
    <Text style={S.muted}>{appText("لا تتاح الموافقة أو التحويل حتى يكون لديك رصيد مستحق تم تأكيده من الخادم، مع التحقق من الهوية والبلد والأهلية ورسوم التحويل.")}</Text>
    {payoutDrafts.length>0&&<Text style={S.title}>{appText("مسودات الطلبات في هذه الجلسة")}</Text>}
    {payoutDrafts.map(d=><View key={d.id} style={S.panel}>
      <Text style={S.white}>{d.country} · {d.provider} · ${d.amount.toFixed(2)}</Text>
      <Text style={S.muted}>{d.masked} · {d.status}</Text>
    </View>)}
  </>,()=>go('earnings'));

  if(page==='store')return <HubScreen title={ui("المتجر")} action={{label:ui("رجوع"),onPress:()=>go('profile')}} dock={nav()}>
    <ClipiCollection copy={{store:ui("المتجر"),frame:ui("إطارات"),ride:ui("مؤثرات الدخول"),numbers:ui("أرقام مميزة"),owned:ui("مقتنياتي"),buy:ui("شراء"),equip:ui("تفعيل"),remove:ui("إزالة"),retry:ui("إعادة تحميل الأرقام"),translate:ui}}
      goods={GOODS} identity={visibleNumber} inventory={inventory} equipped={equipped} error={numberError}
      onEntranceStyle={entryStyle=>setEquipped(v=>({...v,entryStyle}))} onNumber={numberAction} onBuy={buyGood} onEquip={g=>setEquipped(v=>({...v,...(g[3]==='ride'?{entryStyle:0}:{}),[g[3]]:v[g[3]]===g[1]?'':g[1]}))}/>
  </HubScreen>;
  if(page==='gifts')return layout(ui("الهدايا"),<><Text style={S.muted}>{ui("الهدايا تُرسل من داخل غرفة صوت أو فيديو")}</Text><View style={S.giftGrid}>{GIFTS.map((g,i)=><View key={i} style={S.giftTile}><GiftMark gift={g} size={22}/><Text style={S.giftName}>{ui(g[1])}</Text><Text style={S.giftCost}>{g[2]} 💎</Text></View>)}</View><Btn title={ui("استعراض الغرف")} onPress={()=>go('rooms')}/></>);
  if(page==='shortAuthor' && shortAuthor)return <HubScreen title={shortAuthor.name} action={{label:ui('رجوع'),onPress:()=>roomProfileUid&&activeRoom?setMini(false):go('home')}} dock={nav()}>
    <AccountHub socialProfile={socialProfile(shortAuthor.uid)} name={shortAuthor.name} avatar={shortAuthor.avatar} copy={menu} photoLabel={shortAuthor.name}/>
    <ProfileShorts playerProps={shortPlayerProps} key={user.uid+'|'+shortAuthor.uid} request={mediaRequest} endpoint={MEDIA_ENDPOINT} authorUid={shortAuthor.uid} translate={ui}/>
  </HubScreen>;
  if(page==='profileGames')return <HubScreen title={menu.games} action={{label:menu.back,onPress:()=>go('profile')}} dock={nav()}><ProfileGames key={user.uid} uid={user.uid} name={name||user.displayName} request={mediaRequest}/></HubScreen>;
  if(page==='agencies')return <HubScreen title={menu.agencies} action={{label:menu.back,onPress:()=>go('profile')}} dock={nav()}><AgencyScreen key={user.uid} request={mediaRequest}/></HubScreen>;
  if(page==='profile')return <HubScreen title={menu.account}
    action={{label:menu.settings,onPress:()=>go('accountSettings')}} dock={nav()}>
    <AccountHub onPhoto={pickAccountPhoto} photoLabel={ui("اختيار صورة من الاستوديو")} name={name||user?.displayName||ui('مستخدم')} avatar={avatar} number={visibleNumber?.number}
      socialProfile={socialProfile(user.uid)} copy={menu}
      compactShortcuts
      shortcuts={[
        {icon:'♧',label:menu.agencies,onPress:()=>go('agencies')},
        {icon:'◇',label:menu.wallet,onPress:()=>go('wallet')},
        {icon:'#',label:menu.shop,onPress:()=>go('store')},
        {icon:'♫',label:menu.rooms,onPress:()=>go('rooms')},
        {icon:'✦',label:menu.host,onPress:()=>go('hostCenter')},
        {icon:'🎮',label:menu.games,onPress:()=>go('profileGames')},
      ]}>
      <ProfileShorts playerProps={shortPlayerProps} key={user.uid} request={mediaRequest} endpoint={MEDIA_ENDPOINT} translate={ui}/>
    </AccountHub>
  </HubScreen>;
  if(page==='hostCenter')return <HubScreen title={menu.host} action={{label:menu.back,onPress:()=>go('profile')}} dock={nav()}>
    <AccountHub onPhoto={pickAccountPhoto} photoLabel={ui("اختيار صورة من الاستوديو")} name={name||user?.displayName||ui("مستخدم")} avatar={avatar} number={visibleNumber?.number}
      balance={rooms.filter(r=>r.status==='open'&&r.ownerUid===user?.uid).length} copy={{balance:ui("غرفي المفتوحة"),photo:ui("الصورة الشخصية")}} unit="♫"
      shortcuts={[{icon:'＋',label:ui("إنشاء غرفة"),onPress:()=>go('create')},{icon:'◇',label:ui("المحفظة"),onPress:()=>go('wallet')}]}
      settings={[{label:ui("استعراض الغرف"),onPress:()=>go('rooms')},{label:ui("الإعدادات"),onPress:()=>go('accountSettings')}]}/>
  </HubScreen>;
  if(page==='help'||page==='deleteAccount')return <HelpCenter key={user.uid+page} request={supportRequest}
    newId={()=>crypto.randomUUID()} lang={locale} initialKind={page==='deleteAccount'?'deletion':null} onBack={()=>go('accountSettings')}/>;
  if(page==='linkPiAccount')return <HubScreen title={ui('ربط حساب Pi بحساب البريد')} action={{label:ui('رجوع'),onPress:()=>go('accountSettings')}} dock={nav()}>
    <LinkPiAccount key={user.uid} uid={user.uid} linked={visibleNumber?.piLoginLink==='linked'} onDone={confirmed=>{go('profile');if(confirmed)Alert.alert(ui('تم ربط الحسابين'));}}/>
  </HubScreen>;
  if(page==='accountSettings'){
    return <HubScreen title={menu.settings} action={{label:menu.back,onPress:()=>go('profile')}} dock={nav()}>
      <LanguageDropdown selected={locale} onPick={pickLocale} label={menu.changeLanguage}/>
      <HubRows items={[
        {label:menu.edit,onPress:()=>go('profileEdit')},

        {label:ui('صندوق الوارد والدعم'),onPress:()=>go('help')},
        {label:ui('طلب حذف الحساب'),destructive:true,onPress:deleteAccount},
        {label:ui('سياسة الخصوصية'),onPress:()=>setPolicy('privacy')},
        {label:ui('شروط الخدمة'),onPress:()=>setPolicy('terms')},
        {label:ui('مشاركة Clipi'),onPress:()=>Share.share({message:location.origin+'/'}).catch(()=>Alert.alert(ui('تعذرت المشاركة')))},
        ...(SHOW_UNRELEASED_DEMOS?[
          {label:ui('الألعاب'),onPress:()=>go('profileGames')},
          {label:ui('الهدايا'),onPress:()=>go('gifts')},
          {label:ui('أرباح المضيف'),onPress:()=>go('earnings')}
        ]:[]),
        {label:ui('تسجيل الخروج'),destructive:true,onPress:logout},
      ]}/>
    </HubScreen>;
  }
  if(page==='profileEdit')return layout(menu.edit,<>{myProfile}<Text style={S.label}>{ui("الاسم")}</Text><TextInput style={S.input} value={name} onChangeText={setName}/><Text style={S.label}>{ui("الصورة الرمزية")}</Text><View style={S.giftGrid}>{AVATARS.map(a=><TouchableOpacity key={a} style={S.avatarChoice} onPress={()=>{if(!pickingPhoto.current){selectedEmoji.current=a;setAvatar(a)}}}><Text style={{fontSize:29}}>{a}</Text></TouchableOpacity>)}</View><Btn title={ui("حفظ الاسم والصورة")} onPress={async()=>{try{if(!name.trim())throw Error(ui("أدخل الاسم"));await saveProfile(user,name.trim(),true);Alert.alert(ui("تم الحفظ"))}catch(e){Alert.alert(ui("خطأ"),uiError(e))}}}/><View style={S.panel}><Text style={S.title}>{ui("🚫 الحسابات المحظورة (")}{blockedUsers.length})</Text>{blockedUsers.length===0?<Text style={S.muted}>{ui("لا توجد حسابات محظورة")}</Text>:blockedUsers.map(uid=><View key={uid} style={{marginBottom:9}}><Text style={S.muted}>{ui("المستخدم: ")}{uid.slice(0,14)}...</Text><Btn title={ui("إلغاء الحظر")} color={theme.sea} onPress={()=>unblockUser(uid)}/></View>)}</View><Text style={S.muted}>{ui("حذف الحساب في هذه النسخة غير شامل للمحادثات والبلاغات القديمة، ويجب تشغيل خدمة حذف بيانات كاملة قبل إطلاق التطبيق للعامة.")}</Text><Btn title={ui("حذف حسابي")} color={theme.peach} onPress={deleteAccount}/><Btn title={ui("تسجيل الخروج")} color={theme.secondary} onPress={logout}/></>,()=>go('accountSettings'));
  if(page==='games'||page==='game')return <HubScreen title={menu.games} action={{label:menu.back,onPress:()=>go('profile')}} dock={nav()}><ProfileGames key={user.uid} uid={user.uid} name={name||user.displayName} request={mediaRequest}/></HubScreen>;
  return <View style={S.page}><Btn title={ui("الرئيسية")} onPress={()=>go('home')}/></View>;
  }
  return <View style={{flex:1}}>
    <div key={page} data-clipi-page={page} inert={Boolean(activeRoom&&!mini)} aria-hidden={Boolean(activeRoom&&!mini)} style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',overflow:'hidden',isolation:'isolate',zIndex:0,visibility:activeRoom&&!mini?'hidden':'visible',pointerEvents:activeRoom&&!mini?'none':'auto',backgroundColor:theme.canvas}}>
      {renderPage()}
    </div>
    <PolicyModal page={policy} endpoint={MEDIA_ENDPOINT} onClose={()=>setPolicy(null)}/>
    {activeRoom&&user&&<View style={mini?{position:'absolute',width:1,height:1,overflow:'hidden',opacity:0,pointerEvents:'none'}:[StyleSheet.absoluteFillObject,{zIndex:10,backgroundColor:theme.canvas,overflow:'hidden'}]}><Room key={activeRoom.id} helpCoverImage={helpCoverImage} onHelpCoverChange={setHelpCover} inviteFriends={inviteRoomId===activeRoom.id} room={activeRoom} onHostProfile={openHostProfile} locale={locale} userId={user.uid} username={name||'مستخدم'} avatar={avatar} equipped={equipped} diamonds={available} onWallet={()=>{setMini(true);go("wallet")}} minimized={mini} onMinimize={()=>setMini(true)} onExit={()=>{setActiveRoom(null);setMini(false)}}/></View>}
    {user?.uid&&<InviteInbox key={user.uid} roomId={activeRoom?.id} locale={locale} blocked={blockedUsers} request={mediaRequest} onJoin={async id=>{
      if(activeRoom?.ownerUid===user.uid)throw Error(locale==='ar'?appText('أنهِ بثك الحالي قبل الانضمام إلى غرفة أخرى.'):appText('End your current broadcast before joining another room.'));
      if(id===helpRoom.id){enterRoom(helpRoom);return;}
      const doc=await firestore().collection('rooms').doc(id).get();
      if(auth().currentUser?.uid!==user.uid)throw Error(menu.retry);
      if(!doc.exists||doc.data()?.status!=='open')throw Error(ui('انتهى البث'));
      enterRoom({...doc.data(),id});
    }}/>}
    {mini&&activeRoom&&<WindowControl label={ui("تكبير الغرفة")} icon="⤢" style={{position:"absolute",right:12,bottom:72}} onPress={()=>setMini(false)}/>}
  </View>;
}

const S=StyleSheet.create({
  roomGameLayer:{position:'absolute',left:0,right:0,bottom:0,zIndex:30,elevation:10,overflow:'hidden'},
  roomGamesPicker:{position:'absolute',left:0,right:0,bottom:0,zIndex:30,elevation:10,paddingTop:6,backgroundColor:'#FFAB65',borderColor:'#FFAB65'},
  gameThumbnail:{width:40,height:40,borderRadius:20},
  gameChoice:{alignSelf:'flex-start',alignItems:'center',gap:6,padding:4,marginVertical:8},
  gameCover:{width:100,height:100,borderRadius:14},gameCaption:{fontSize:15,fontWeight:'700',color:'#402510',textAlign:'center'},
  gameOverlay:{flex:1,justifyContent:'flex-end',backgroundColor:theme.scrim},
  gameSheet:{backgroundColor:theme.paper,borderTopLeftRadius:26,borderTopRightRadius:26,borderWidth:1,borderColor:theme.line,paddingHorizontal:12,paddingBottom:Platform.OS==='ios'?22:8},
  sheetHandle:{alignSelf:'center',width:34,height:4,borderRadius:3,backgroundColor:theme.paper,marginVertical:5},
  gameBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  gameHeading:{flex:1,alignItems:'center'},gameTitle:{color:theme.ink,fontSize:17,fontWeight:'900'},
  gameMeta:{color:theme.secondary,fontSize:12,textAlign:'center'},gameBalance:{color:theme.ink,fontWeight:'900',fontSize:13},
  gameScroller:{flex:1},gameWheelContent:{alignItems:'center',paddingVertical:4},
  gameFood:{fontSize:19},gameClock:{fontSize:21,color:theme.ink,fontWeight:'900'},
  gamePointer:{position:'absolute',width:20,textAlign:'center',color:theme.ink,fontSize:19,fontWeight:'900'},
  gameHistory:{color:theme.ink,fontSize:11,marginVertical:1},gameFooter:{gap:5,paddingTop:4,borderTopWidth:1,borderTopColor:theme.line},
  gameAmounts:{flexDirection:'row',gap:5},gameAmount:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:theme.canvas,height:34,paddingHorizontal:3},
  gameAmountSelected:{backgroundColor:theme.mint,borderWidth:1,borderColor:theme.accent},gameAmountText:{color:theme.ink,fontSize:13,fontWeight:'800'},
  hostSeat:{alignSelf:'stretch',width:'100%',alignItems:'center',paddingVertical:5},

  micCaption:{color:'#123747',backgroundColor:'#F4FDFF',borderRadius:6,overflow:'hidden',paddingHorizontal:4},
  hostSeatName:{fontWeight:'900',color:theme.ink,marginTop:2,fontSize:15},
  videoTag:{backgroundColor:theme.glass,paddingHorizontal:6,borderRadius:8},
  videoChrome:{backgroundColor:theme.glass},
  roomTop:{direction:'ltr',flexDirection:'row',alignItems:'flex-start',gap:4,paddingHorizontal:8,paddingTop:'env(safe-area-inset-top, 0px)',paddingBottom:3,backgroundColor:'transparent'},
  onVideo:{color:'#FFF',textShadowColor:'#10241D',textShadowOffset:{width:0,height:1},textShadowRadius:3},
  roomHeaderMain:{flex:1,minWidth:0},
  cameraActions:{flexDirection:'row',alignItems:'center',gap:6},
  roomTopRow:{flexDirection:'row',alignItems:'flex-start',gap:2},roomIdentity:{flex:1,alignItems:'center',paddingHorizontal:3},roomName:{fontSize:19,fontWeight:'900',color:theme.ink},roomType:{color:theme.secondary,fontSize:11},
  compact:{alignSelf:"center",maxWidth:"100%",paddingVertical:8,paddingHorizontal:13,borderRadius:12},
  orangeInk:{color:theme.ink,textAlign:"center"},
  roomMenuTrigger:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'transparent'},
  roomControlGlyph:{fontSize:23,color:theme.ink,fontWeight:'800',},
  roomMenuDots:{color:theme.ink,fontSize:30,fontWeight:'700'},
  roomMenuOverlay:{flex:1,alignItems:'flex-end',paddingHorizontal:10,paddingTop:12,backgroundColor:theme.scrim},
  roomMenuPanel:{width:'92%',maxWidth:360,maxHeight:'88%',backgroundColor:theme.glass,padding:18,borderRadius:22,borderWidth:1,borderColor:theme.line},
  roomMenuItems:{flexDirection:'column',flexWrap:'nowrap',justifyContent:'flex-start',gap:0,paddingBottom:8,alignItems:'stretch'},
  roomBottom:{backgroundColor:theme.glass,paddingHorizontal:7,paddingTop:6,paddingBottom:Platform.OS==='ios'?16:9,borderTopLeftRadius:16,borderTopRightRadius:16},
  micPopover:{position:'absolute',width:156,padding:6,borderWidth:1,borderColor:theme.line,borderRadius:16,backgroundColor:theme.glass,elevation:3},
  micPopoverTitle:{color:theme.accent,textAlign:'center',fontSize:13,padding:6,fontWeight:'800'},
  micPopoverAction:{minHeight:40,justifyContent:'center',alignItems:'center',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:theme.line,backgroundColor:'transparent'},
  joinButton:{minWidth:40,height:38,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:theme.line,borderRadius:18,marginLeft:4,backgroundColor:theme.paper},
  roomDock:{flexDirection:'row',alignItems:'center',gap:4,paddingBottom:2},
  roomComment:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',paddingEnd:3},
  roomSeatAction:{alignSelf:'flex-end',marginBottom:5},
  roomGiftNotice:{fontSize:11,color:theme.ink,marginTop:6},

  homeHero:{backgroundColor:theme.paper,borderWidth:1,borderColor:theme.line,borderRadius:23,padding:20,alignItems:'flex-end',marginBottom:10},
  homeBrand:{color:theme.ink,fontSize:13,fontWeight:'900',letterSpacing:2},homeTitle:{fontSize:27,color:theme.ink,fontWeight:'900',marginVertical:5},homeSubtitle:{color:theme.secondary,fontSize:14},
  navItem:{minWidth:64,minHeight:46,justifyContent:'center',alignItems:'center',borderRadius:13,paddingHorizontal:8},navActive:{backgroundColor:theme.mint},
  navIcon:{fontSize:20},navLabel:{fontSize:11,color:theme.secondary,fontWeight:'700'},

  starPage:{flex:1,backgroundColor:theme.canvas},starTopBar:{backgroundColor:theme.paper,paddingTop:Platform.OS==='ios'?45:12,paddingBottom:9,paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},starRules:{color:theme.ink,fontWeight:'900',fontSize:12,backgroundColor:theme.paper,padding:6,borderRadius:14},starBrand:{backgroundColor:theme.mint,borderRadius:7,borderWidth:2,borderColor:theme.line,paddingHorizontal:9,paddingVertical:5},starBrandText:{color:theme.ink,fontWeight:'900',fontSize:19},starRound:{color:theme.ink,fontSize:10,fontWeight:'800'},starScroll:{paddingHorizontal:10,paddingBottom:32,alignItems:'stretch'},starWheel:{width:326,height:326,alignSelf:'center',marginTop:7,marginBottom:3,position:'relative'},starWheelRing:{position:'absolute',width:244,height:244,left:41,top:41,borderRadius:122,borderWidth:15,borderColor:theme.brass,backgroundColor:theme.mint,shadowColor:theme.secondary,shadowOpacity:0.14,shadowRadius:10,elevation:7},starFood:{position:'absolute',width:78,height:78,borderRadius:39,backgroundColor:theme.paper,borderWidth:4,borderColor:theme.line,alignItems:'center',justifyContent:'center',elevation:4},starFoodLit:{backgroundColor:theme.peach,borderColor:theme.gold,borderWidth:5},starFoodEmoji:{fontSize:28},starFoodLabel:{color:theme.secondary,fontWeight:'900',fontSize:10},starStake:{color:theme.ink,fontSize:9,fontWeight:'900'},starCenter:{position:'absolute',top:114,left:114,width:98,height:98,borderRadius:49,backgroundColor:theme.sea,borderWidth:7,borderColor:theme.line,alignItems:'center',justifyContent:'center',elevation:9},starCenterTop:{fontSize:11,color:theme.ink,fontWeight:'900'},starCenterTime:{fontSize:29,color:theme.ink,fontWeight:'900'},starBanner:{backgroundColor:theme.mint,borderWidth:3,borderColor:theme.line,borderRadius:7,padding:7,marginTop:3},starBannerText:{color:theme.ink,fontWeight:'900',textAlign:'center',fontSize:13},starBetTray:{flexDirection:'row',justifyContent:'space-between',backgroundColor:theme.sea,padding:6,borderRadius:12,marginTop:7,borderWidth:3,borderColor:theme.line},starBetChip:{backgroundColor:theme.mint,borderRadius:8,paddingVertical:10,paddingHorizontal:4,minWidth:'18%',alignItems:'center',borderWidth:2,borderColor:theme.line},starBetActive:{backgroundColor:theme.mint,borderColor:theme.line},starBetText:{fontSize:11,fontWeight:'900',color:theme.ink},starInfoRow:{flexDirection:'row',gap:5,marginTop:9},starInfoPill:{flex:1,backgroundColor:theme.mint,borderRadius:24,borderWidth:2,borderColor:theme.line,alignItems:'center',justifyContent:'center',paddingVertical:7},starInfoText:{fontSize:10,color:theme.ink,fontWeight:'800'},starInfoValue:{fontSize:14,color:theme.ink,fontWeight:'900'},starBottomStrip:{flexDirection:'row',justifyContent:'space-around',marginTop:10,marginBottom:8,backgroundColor:theme.sea,borderRadius:16,paddingVertical:7},starMiniFood:{width:30,height:30,borderRadius:15,backgroundColor:theme.paper,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:theme.line},starDisclaimer:{color:theme.ink,fontSize:11,textAlign:'center',marginTop:8,fontWeight:'700'},

  choiceWrap:{flexDirection:'row',flexWrap:'wrap',marginVertical:5},choice:{paddingHorizontal:10,paddingVertical:10,borderRadius:12,backgroundColor:theme.paper,margin:3,borderWidth:1,borderColor:theme.line},choiceActive:{backgroundColor:theme.mint,borderColor:GOLD},
  page:{flex:1,backgroundColor:theme.canvas},gamePage:{flex:1,backgroundColor:theme.canvas},content:{padding:16,paddingBottom:40},white:{color:theme.ink,fontWeight:'700'},gold:{color:GOLD,fontWeight:'900'},muted:{color:theme.secondary,marginVertical:8,lineHeight:19},title:{color:theme.ink,fontSize:19,fontWeight:'900',marginVertical:10},label:{color:theme.secondary,fontWeight:'800',marginTop:13,marginBottom:6},logo:{color:theme.ink,fontSize:52,fontWeight:'900',textAlign:'center',marginTop:46},big:{color:GOLD,fontSize:28,fontWeight:'900',marginVertical:9},input:{backgroundColor:theme.paper,color:theme.ink,padding:13,borderRadius:12,marginVertical:5,borderColor:theme.line,borderWidth:1},btn:{padding:13,borderRadius:12,alignItems:'center',marginVertical:6,minWidth:82},small:{paddingVertical:8,paddingHorizontal:10,borderRadius:10,marginHorizontal:3,alignItems:'center',justifyContent:'center'},header:{paddingTop:48,paddingBottom:15,paddingHorizontal:12,backgroundColor:theme.paper,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomColor:theme.line,borderBottomWidth:1},headerTitle:{color:theme.ink,fontWeight:'900',fontSize:19},nav:{backgroundColor:theme.paper,flexDirection:'row',justifyContent:'space-around',paddingVertical:15},banner:{backgroundColor:PINK,padding:19,borderRadius:16,marginBottom:12},card:{backgroundColor:theme.paper,padding:18,borderRadius:16,alignItems:'center',marginVertical:9,borderColor:theme.line,borderWidth:1},panel:{backgroundColor:theme.paper,padding:14,borderRadius:13,marginVertical:9,borderColor:theme.line,borderWidth:1},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',flexWrap:'wrap'},shop:{backgroundColor:theme.paper,padding:12,borderRadius:12,marginBottom:8,flexDirection:'row',alignItems:'center'},avatarChoice:{backgroundColor:theme.paper,padding:10,margin:5,borderRadius:10},hostSettingsShade:{flex:1,backgroundColor:theme.scrim,justifyContent:'flex-end'},hostSettingsPanel:{backgroundColor:theme.paper,padding:18,paddingBottom:34,borderTopLeftRadius:24,borderTopRightRadius:24},hostSettingsHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12,borderBottomColor:theme.line,borderBottomWidth:1,paddingBottom:5},room:{flex:1,minWidth:0,overflow:'hidden'},miniRoom:{flex:1,backgroundColor:theme.paper,justifyContent:'center',padding:25,gap:18},videoBlank:{...StyleSheet.absoluteFillObject,backgroundColor:theme.paper,alignItems:'center',justifyContent:'center',padding:20},liveHeader:{paddingTop:49,paddingBottom:9,paddingHorizontal:11,flexDirection:'row',alignItems:'center',backgroundColor:theme.paper},tiny:{color:theme.secondary,fontSize:10,textAlign:'center',fontWeight:'600'},liveTag:{backgroundColor:PINK,borderRadius:17,padding:9},avatars:{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:8,backgroundColor:theme.paper},guestAvatar:{width:59,height:58,borderRadius:13,borderWidth:1,borderColor:GOLD,backgroundColor:theme.paper,marginRight:8,alignItems:'center',justifyContent:'center'},videoControls:{flexDirection:'row',justifyContent:'center',marginTop:8},pip:{position:'absolute',bottom:205,right:12,width:142,borderRadius:13,borderWidth:2,borderColor:GOLD,backgroundColor:theme.paper,padding:5,alignItems:'center',zIndex:8},pipPreview:{height:112,width:'100%',backgroundColor:theme.paper,borderRadius:8,alignItems:'center',justifyContent:'center'},callPanel:{position:'absolute',top:175,left:12,right:12,backgroundColor:theme.paper,borderWidth:1,borderColor:GOLD,padding:15,borderRadius:15,alignItems:'center',zIndex:20},seatHeading:{color:GOLD,fontSize:18,fontWeight:'900',textAlign:'center',marginTop:20,marginBottom:18},seatGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',paddingHorizontal:12},seatItem:{width:'24%',alignItems:'center',marginBottom:10},throneCrown:{position:'absolute',top:-19,fontSize:25,color:GOLD},seatGem:{position:'absolute',bottom:-10,fontSize:14,color:theme.ink},seatRequest:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',backgroundColor:theme.paper,padding:8,marginHorizontal:12,marginBottom:5,borderRadius:12},actions:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:9,marginBottom:5},chat:{maxHeight:125,minHeight:45,marginHorizontal:9,marginBottom:5,borderRadius:10},bubble:{backgroundColor:theme.glass,borderRadius:10,padding:8,alignSelf:'flex-start',marginTop:4},composer:{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingTop:8,paddingBottom:Platform.OS==='ios'?20:10,backgroundColor:theme.paper},composerGift:{width:43,height:43,borderRadius:22,backgroundColor:theme.sea,alignItems:'center',justifyContent:'center',marginRight:7},messageInput:{flex:1,minWidth:0,height:42,borderRadius:16,backgroundColor:theme.paper,color:theme.ink,paddingHorizontal:14,textAlign:'right',borderWidth:1,borderColor:theme.line},sendButton:{width:34,height:39,borderRadius:12,backgroundColor:theme.mint,justifyContent:'center',alignItems:'center',marginLeft:7},giftDrawer:{position:'absolute',bottom:Platform.OS==='ios'?78:63,left:8,right:8,height:260,padding:9,borderRadius:18,borderWidth:1,borderColor:theme.line,backgroundColor:theme.sea,zIndex:25,elevation:15},drawerHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:9},giftGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',paddingBottom:10},giftTile:{width:'19%',height:72,marginBottom:7,borderRadius:9,backgroundColor:theme.sea,alignItems:'center',justifyContent:'center',padding:2},giftName:{color:theme.ink,fontSize:9,fontWeight:'800',textAlign:'center'},giftCost:{color:GOLD,fontSize:9},fxOverlay:{...StyleSheet.absoluteFillObject,zIndex:100,elevation:100,alignItems:'center',justifyContent:'center'},fxCenter:{alignItems:'center',justifyContent:'center'},fxIcon:{fontSize:112,textAlign:'center'},fxSpark:{color:GOLD,fontSize:28,textAlign:'center',textShadowColor:'#fff5bb',textShadowRadius:10},fxFire:{fontSize:75,textAlign:'center'},wheel:{width:296,height:296,borderRadius:148,borderWidth:8,borderColor:GOLD,backgroundColor:theme.sea,alignSelf:'center',marginVertical:24,position:'relative'},slot:{position:'absolute',width:64,height:64,borderRadius:32,backgroundColor:theme.sea,borderWidth:2,borderColor:theme.line,alignItems:'center',justifyContent:'center'},slotLit:{backgroundColor:theme.sea,borderColor:theme.line,borderWidth:4},slotLabel:{fontSize:10,color:theme.secondary,fontWeight:'900'},wheelMiddle:{position:'absolute',left:99,top:99,width:82,height:82,borderRadius:41,backgroundColor:theme.sea,borderWidth:4,borderColor:GOLD,alignItems:'center',justifyContent:'center'}
});

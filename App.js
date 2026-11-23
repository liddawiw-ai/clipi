import {LoginCover,RoomStudio,BalanceCard} from './ClipiSurfaces';
import ClipiCollection from './ClipiCollection';
import {RoomAction, RoomGiftSheet, RoomOption} from './RoomControls';
import {PolicySheet,PolicyModal} from './PolicySheet';
import {RoomTermsNotice} from './RoomTermsNotice';
import {AccountPhoto, AccountHub, ClipiDock, HubRows, HubScreen, RoomDiscovery} from './ClipiHub';
import {choosePhoto} from './photo';
import {Image} from 'react-native';
import {useRoomSession} from './useRoomSession';
import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,ScrollView,StyleSheet,Alert,Animated,Keyboard,KeyboardAvoidingView,Platform,StatusBar,Dimensions,useWindowDimensions,Easing,Share,Modal,InteractionManager,Linking} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import DiamondShop from './DiamondShop';
import EarningsWalletScreen from './EarningsWalletScreen';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
// Load the native media stack only when a room needs it.
let roomMediaRuntime;
function loadRoomMediaRuntime(){
  if(!roomMediaRuntime){
    const livekit=require('@livekit/react-native');
    livekit.registerGlobals();
    const {ConnectionState,Track}=require('livekit-client');
    roomMediaRuntime={...livekit,ConnectionState,Track};
  }
  return roomMediaRuntime;
}

const MEDIA_ENDPOINT=process.env.EXPO_PUBLIC_CLIPI_MEDIA_URL?.trim().replace(/\/+$/,'')||'https://clipi-mainnet.liddawiw.workers.dev';
const MEDIA_CONFIGURED=/^https:\/\//i.test(MEDIA_ENDPOINT);

const {width:WIDTH,height:HEIGHT}=Dimensions.get('window');
const PINK='#f43b80',GOLD='#ffe39a';
const WELCOME=100,OWNER_DEMO=100000000;
// Hide financial/game/gift simulations in release builds. They remain available for development testing.
const SHOW_UNRELEASED_DEMOS=__DEV__;
// Initialize Firestore only when an authenticated feature needs it.
// ضع Web OAuth Client ID من Firebase/Google Cloud بعد تفعيل Google.
const GOOGLE_WEB_CLIENT_ID=Constants.expoConfig?.extra?.googleWebClientId||'';
// Expo only embeds EXPO_PUBLIC_* variables into the JavaScript bundle.
// Facebook client tokens are mobile SDK configuration, not app secrets.
const FACEBOOK_CONFIGURED=Boolean(process.env.EXPO_PUBLIC_FACEBOOK_APP_ID&&process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN);
const GIFTS=[["🌹","وردة حمراء",10,"rose","رومانسي"],["💙","وردة زرقاء",30,"rose","رومانسي"],["💖","قلب",50,"heart","رومانسي"],["🫶","قلب الأصابع",100,"heart","رومانسي"],["💋","قبلة",150,"kiss","رومانسي"],["💞","أحبك",200,"heart","رومانسي"],["💘","قفل الحب",80,"heart","رومانسي"],["👏","تصفيق",5,"clap","تفاعل"],["🍭","مصاص",100,"candy","تفاعل"],["🧊","برودة الصيف",105,"ice","تفاعل"],["🔥","نسر ناري",120,"phoenix","تفاعل"],["🎂","كيكة",100,"cake","تفاعل"],["🍰","كعكة ماكرون",150,"cake","تفاعل"],["🧸","دبدوب",300,"bear","تفاعل"],["🎁","صندوق الكنز",100,"treasure","تفاعل"],["💰","حقيبة ذهبية",500,"gold","تفاعل"],["🪄","صولجان",2000,"magic","فاخر"],["👑","تاج الجواهر",60,"crown","فاخر"],["👑","تاج ملكي",5000,"crown","فاخر"],["👑","التاج الأعلى",5000,"crown","فاخر"],["💍","خاتم",500,"ring","فاخر"],["🧚","مرافقة مدى الحياة",190000,"fairy","فاخر"],["🏰","قصر",10000,"castle","فاخر"],["🗼","صاروخ أعلى",10000,"rocket","فاخر"],["🛸","مركبة فضائية",3000,"spaceship","مركبات"],["🚁","مروحية الماس",9990,"helicopter","مركبات"],["✈️","الطائرات الماسية",19990,"plane","مركبات"],["🚀","هدية الصاروخ",100,"rocket","مركبات"],["🚀","صاروخ",2500,"rocket","مركبات"],["🏎️","سيارة سباق ذهبية",1000,"car","مركبات"],["🚙","سيارة لينكولن بيضاء",7000,"car","مركبات"],["🚘","رولز رويس الماسية",19990,"car","مركبات"],["🏎️","سيارة فاخرة",1000,"car","مركبات"],["🐉","تنين ذهبي",25000,"dragon","أسطوري"],["🦅","نسر",120,"phoenix","أسطوري"],["🤖","روبوت خارق",1000,"robot","أسطوري"],["🐈‍⬛","قطة تحت النجوم",500,"cat","أسطوري"],["🦆","بطة ساحرة",300,"duck","أسطوري"],["🐹","Capybara",1000,"animal","أسطوري"],["🎊","Happy",3000,"party","تفاعل"],["🎉","حفلة البخت",50000,"party","فاخر"],["🌸","أزهار الكرز",200,"flower","رومانسي"],["🌺","زهرة بيضاء",200,"flower","رومانسي"],["🍓","عصير فواكه",100,"fruit","تفاعل"],["🌵","نرقص سويا",300,"dance","تفاعل"],["🔫","مسدس الماء",1700,"water","تفاعل"],["💸","طابع الأموال",1350,"money","فاخر"],["🪙","نيزك",10,"meteor","تفاعل"],["🧑‍🚀","مسافر الفضاء",2000,"space","مركبات"],["🐑","غنم",2000,"animal","أسطوري"],["🏳️","علم",50,"flag","تفاعل"],["🍽️","طاولة الوجبات",50,"dinner","تفاعل"],["🎀","حزمة حمراء",100,"bundle","تفاعل"],["🧁","Pistachio",20,"candy","تفاعل"],["💐","باقة ورد",500,"flower","رومانسي"],["🧴","عطر",50,"perfume","رومانسي"],["🎸","سيجارة",50,"smoke","تفاعل"],["🪅","علم الوطن",50,"flag","تفاعل"],["🦋","فراشة لامعة",500,"butterfly","أسطوري"],["💎","نيرز",10,"gem","تفاعل"]];
// Decorative luck previews only: no paid stakes, prizes, points, wallet changes or cash value.
const GOODS=[['👑','👑 إطار فاخر',0,'frame'],['🏎️','🏎️ دخول سيارة فاخرة',0,'ride'],['🖼️','إطار فضي',250,'frame'],['💜','إطار بنفسجي',1200,'frame'],['👑','إطار أسطوري',5000,'frame'],['🚙','دخول بسيارة',1500,'ride'],['🏎️','دخول رياضي',4000,'ride'],['🚀','دخول بصاروخ',9000,'ride']];
const FOOD=[['🥕','جزر',5],['🦐','جمبري',10],['🥦','بروكلي',5],['🥩','لحم',15],['🥬','خضار',5],['🍗','دجاج',25],['🌽','ذرة',5],['🐟','سمك',45]];
const COUNTRIES=[['🇯🇴 الأردن','+962'],['🇸🇦 السعودية','+966'],['🇦🇪 الإمارات','+971'],['🇵🇸 فلسطين','+970'],['🇪🇬 مصر','+20'],['🇱🇧 لبنان','+961'],['🇸🇾 سوريا','+963'],['🇮🇶 العراق','+964']];
const AVATARS=['👤','😎','👩','👨','🧑','👸','🤴','🦁','🐼','🦊','🌸','⭐'];
// Pricing preview: USD 1 = 1,000 diamonds; Pi USD-equivalent 1 = 1,200 diamonds.
// Pi market quote is entered manually and is NOT a live price feed.

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
  IQ:['ZainCash العراق','FastPay','محفظة عراقية أخرى'],
  SA:['STC Bank','barq','محفظة سعودية أخرى'],
  AE:['e& money','محفظة إماراتية أخرى'],
  PS:['محفظة فلسطينية محلية'],
  LB:['محفظة لبنانية محلية'],
  OTHER:['محفظة أخرى - اكتب اسمها']
};

const fmt=x=>Number(x||0).toLocaleString('en-US');

function normalizeRoomPin(value){
  return value.replace(/[٠-٩]/g,digit=>String(digit.charCodeAt(0)-0x660))
    .replace(/[۰-۹]/g,digit=>String(digit.charCodeAt(0)-0x6f0)).replace(/[^0-9]/g,'').slice(0,4);
}

const ORANGE='#ffad69';
function Btn({title,onPress,color=ORANGE,disabled=false}){
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[S.btn,{backgroundColor:disabled?'#524951':color},color===ORANGE&&S.compact]}>
    <Text style={[S.white,color===ORANGE&&!disabled&&S.orangeInk]}>{title}</Text>
  </TouchableOpacity>;
}
function Small({title,onPress,color=ORANGE}){
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[S.small,S.compact,{backgroundColor:color}]}>
    <Text style={[S.white,color===ORANGE&&S.orangeInk]}>{title}</Text>
  </TouchableOpacity>;
}
function WindowControl({label,icon,onPress,style}){
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[S.roomMenuTrigger,style]}>
    <Text style={S.roomControlGlyph}>{icon}</Text>
  </TouchableOpacity>;
}

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
  else if(['plane','helicopter','spaceship','space'].includes(kind))shape=<Animated.View style={[S.fxCenter,{transform:[{translateX:move([0,.3,.65,1],[-WIDTH,WIDTH*.18,0,WIDTH*1.4])},{translateY:move([0,.3,.7,1],[HEIGHT*.5,0,-HEIGHT*.2,-HEIGHT*.65])},{rotate:move([0,.5,1],['-18deg','5deg','-22deg'])},{scale}]}]}>
    <Text style={[S.fxIcon,{fontSize:160,textShadowColor:'#56d6ff',textShadowRadius:30}]}>{gift[0]}</Text><Text style={S.fxFire}>✦ ✧ ✦</Text></Animated.View>;
  else if(['phoenix','butterfly','fairy','animal','cat','duck','robot'].includes(kind))shape=<Animated.View style={[S.fxCenter,{transform:[{translateY:move([0,.3,.7,1],[HEIGHT*.4,0,-60,-HEIGHT*.2])},{rotate:move([0,.5,1],['-12deg','12deg','-12deg'])},{scale}]}]}>
    <Text style={[S.fxIcon,{fontSize:155,textShadowColor:'#ffa954',textShadowRadius:30}]}>{gift[0]}</Text><Text style={[S.fxSpark,{fontSize:45}]}>✨ ✨ ✨</Text></Animated.View>;
  else if(['kiss','flower','heart','perfume'].includes(kind))shape=<View style={S.fxCenter}>
    <Animated.Text style={[S.fxIcon,{fontSize:155,transform:[{scale:move([0,.4,.8,1],[.1,1.7,1.3,2])}],opacity:move([0,.2,.8,1],[0,1,1,0])}]}>{gift[0]}</Animated.Text>
    <Animated.Text style={[S.fxSpark,{fontSize:60,opacity:glow,transform:[{translateY:move([0,1],[120,-230])}]}]}>💕 🌸 ✨</Animated.Text></View>;
  else if(['treasure','gold','money','gem','bundle'].includes(kind))shape=<Animated.View style={[S.fxCenter,{transform:[{scale},{rotate:move([0,.45,1],['-15deg','12deg','0deg'])}]}]}>
    <Text style={[S.fxIcon,{fontSize:160,textShadowColor:'#ffe25e',textShadowRadius:40}]}>{gift[0]}</Text><Text style={[S.fxSpark,{fontSize:46}]}>💎 ✨ 💰 ✨ 💎</Text></Animated.View>;
  else if(['ice','water','meteor','magic','party','dance','clap','flag','dinner','fruit','candy','smoke'].includes(kind))shape=<Animated.View style={[S.fxCenter,{transform:[{scale},{rotate:move([0,.4,.8,1],['-25deg','20deg','-15deg','0deg'])}]}]}>
    <Text style={[S.fxIcon,{fontSize:160,textShadowColor:'#f9aaff',textShadowRadius:32}]}>{gift[0]}</Text><Text style={[S.fxSpark,{fontSize:44}]}>✦ ✨ ✦ ✨ ✦</Text></Animated.View>;
  else shape=<Animated.View style={[S.fxCenter,{transform:[{scale},{rotate:kind==='ring'?move([0,1],['0deg','360deg']):'0deg'}]}]}><Text style={S.fxIcon}>{gift[0]}</Text></Animated.View>;
  // All existing gifts use a full-screen animated light stage; no new peacock gift.
  const beams=Array.from({length:12},(_,i)=><Animated.View key={i} style={{
    position:'absolute',width:5,height:HEIGHT*.72,borderRadius:9,
    backgroundColor:i%3===0?'#fbe6aa':i%3===1?'#50e7ee':'#f77ddd',
    opacity:move([0,.15,.7,1],[0,.55,.4,0]),
    transform:[{rotate:(i*30)+'deg'},{translateY:move([0,1],[HEIGHT*.55,-HEIGHT*.2])}]
  }}/>);
  return <Animated.View pointerEvents="none" style={[S.fxOverlay,{opacity}]}>
    <Animated.View style={{...StyleSheet.absoluteFillObject,backgroundColor:'#140c3e',
      opacity:move([0,.12,.6,1],[0,.34,.25,0])}}/>
    <Animated.View style={[S.fxCenter,{position:'absolute',width:WIDTH*1.5,height:WIDTH*1.5,
      borderRadius:WIDTH,borderWidth:9,borderColor:'#49e7fa',
      opacity:move([0,.2,.7,1],[0,.75,.7,0]),
      transform:[{scale:move([0,.2,.7,1],[.1,.6,1.6,2.1])}]}]}/>
    {beams}
    {shape}
    <Animated.Text style={[S.fxSpark,{position:'absolute',bottom:'21%',fontSize:35,
      opacity:glow,transform:[{scale:move([0,.5,1],[.4,1.7,2.1])}]}]}>✦ ✨ ✦ ✧ ✦</Animated.Text>
    <Animated.Text style={{position:'absolute',bottom:'12%',color:'#fff1c5',
      fontSize:25,fontWeight:'900',textShadowColor:'#fa61e6',textShadowRadius:18,
      opacity:move([0,.2,.82,1],[0,1,1,0])}}>{gift[1]}</Animated.Text>
  </Animated.View>;
}


/* Global visual preview: UTC clock drives identical rounds in every room.
   No server bets, balances, or cash rewards. Production requires authoritative backend. */
const GLOBAL_BET_MS=30000;
const GLOBAL_SPIN_MS=6000;
const GLOBAL_ROUND_MS=GLOBAL_BET_MS+GLOBAL_SPIN_MS+4000;
const AUDIO_GUEST_SEATS=8;
function globalRoundAt(now){
  const round=Math.floor(now/GLOBAL_ROUND_MS);
  const elapsed=now%GLOBAL_ROUND_MS;
  // Deterministic display result shared across devices with synchronized clocks.
  let hash=(Math.imul(round,1664525)+1013904223)>>>0;
  hash^=hash>>>16;
  const phase=elapsed<GLOBAL_BET_MS?'betting':elapsed<GLOBAL_BET_MS+GLOBAL_SPIN_MS?'spinning':'result';
  const deadline=phase==='betting'?GLOBAL_BET_MS:phase==='spinning'?GLOBAL_BET_MS+GLOBAL_SPIN_MS:GLOBAL_ROUND_MS;
  return {round,elapsed,winner:(hash>>>0)%FOOD.length,phase,betting:phase==='betting',
    remaining:Math.ceil((deadline-elapsed)/1000)};
}
function GlobalGreedyPreview({visible,onClose,onShop,onRestoreRoom,roomName,diamonds,onBet,onCredit}){
  const [now,setNow]=useState(Date.now());
  const {height,width}=useWindowDimensions();
  const rotation=useRef(new Animated.Value(0)).current;
  const [chosen,setChosen]=useState({});
  const roundBets=useRef({round:null,stakes:{},settled:false});
  const creditRef=useRef(onCredit);
  creditRef.current=onCredit;
  const [amount,setAmount]=useState(10);
  const [roundHistory,setRoundHistory]=useState([]);
  const lastRound=useRef(globalRoundAt(Date.now()).round);
  useEffect(()=>{
    const tick=setInterval(()=>setNow(Date.now()),200);
    return ()=>clearInterval(tick);
  },[]);
  const state=globalRoundAt(now);
  function settle(current){
    const bets=roundBets.current;
    if(bets.round===null||bets.settled||current.round<bets.round||
      (current.round===bets.round&&current.phase!=='result'))return;
    bets.settled=true;
    const {winner}=globalRoundAt(bets.round*GLOBAL_ROUND_MS);
    const prize=(bets.stakes[winner]||0)*FOOD[winner][2];
    if(prize>0)creditRef.current(prize);
  }
  useEffect(()=>{
    settle(state);
    if(state.round!==lastRound.current){
      const previous=globalRoundAt((state.round-1)*GLOBAL_ROUND_MS);
      setRoundHistory(h=>[{round:previous.round,winner:previous.winner},...h].slice(0,8));
      setChosen([]);
      lastRound.current=state.round;
    }
  },[state.round,state.phase]);
  useEffect(()=>()=>settle(globalRoundAt(Date.now())),[]);
  const choose=i=>{
    const current=globalRoundAt(Date.now());
    if(!current.betting||current.round!==state.round)return;
    settle(current);
    if(roundBets.current.round!==current.round)roundBets.current={round:current.round,stakes:{},settled:false};
    const {stakes}=roundBets.current;
    if(!stakes[i]&&Object.keys(stakes).length>=6)return Alert.alert('الحد الأقصى','اختر حتى ست خانات');
    if(!onBet(amount))return Alert.alert('رصيد غير كافٍ','عدد الماسات التجريبية لا يكفي لهذا الرهان.');
    const updated={...stakes,[i]:(stakes[i]||0)+amount};
    roundBets.current.stakes=updated;
    setChosen(updated);
  };
  useEffect(()=>{
    const current=globalRoundAt(Date.now());
    const target=5*360+(360-current.winner*360/FOOD.length)%360;
    if(!visible||current.phase!=='spinning'){
      rotation.setValue(current.phase==='result'?target:0);
      return;
    }
    const elapsed=current.elapsed-GLOBAL_BET_MS;
    const progress=elapsed/GLOBAL_SPIN_MS;
    rotation.setValue(target*progress);
    const animation=Animated.timing(rotation,{
      toValue:target,duration:GLOBAL_SPIN_MS-elapsed,easing:Easing.linear,useNativeDriver:true
    });
    animation.start();
    return()=>animation.stop();
  },[visible,state.round,state.phase,rotation]);
  const sheetHeight=Math.round(height*.52);
  const size=Math.min(width-28,250,Math.max(145,sheetHeight-155));
  const foodSize=size*.225,radius=size*.374,mid=size/2,centerSize=size*.34;
  const angle=rotation.interpolate({inputRange:[0,2160],outputRange:['0deg','2160deg']});
  const label=state.phase==='betting'?'المراهنة':state.phase==='spinning'?'الدوران':'الجولة التالية';
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={S.gameOverlay}>
      <TouchableOpacity accessibilityLabel="إغلاق اللعبة" style={StyleSheet.absoluteFillObject} onPress={onClose}/>
      {onRestoreRoom&&<WindowControl label={"تكبير الغرفة"} icon="⤢" style={{position:"absolute",right:12,bottom:sheetHeight+8}} onPress={onRestoreRoom}/>}
      <View style={[S.gameSheet,{height:sheetHeight}]} accessibilityViewIsModal>
        <View style={S.sheetHandle}/>
        <View style={S.gameBar}>
          <WindowControl icon="×" label={"إغلاق"} onPress={onClose}/>
          <View style={S.gameHeading}>
            <Text style={S.gameTitle}>Greedy Star</Text>
            <Text style={S.gameMeta} numberOfLines={1}>{roomName} · {label} · {state.remaining} ث</Text>
          </View>
          <Small title="شراء الماس" onPress={onShop}/><Text style={S.gameBalance}>🎮 {fmt(diamonds)}</Text>
        </View>
        <ScrollView style={S.gameScroller} contentContainerStyle={S.gameWheelContent}>
          <View style={[S.starWheel,{width:size,height:size}]}>
            <View style={[S.starWheelRing,{width:size*.75,height:size*.75,left:size*.125,top:size*.125,borderRadius:size*.375}]}/>
            <Animated.View style={[StyleSheet.absoluteFillObject,{transform:[{rotate:angle}]}]}>
            {FOOD.map((food,i)=>{
              const position=(i*360/FOOD.length-90)*Math.PI/180;
              return <TouchableOpacity key={i} accessibilityLabel={food[1]} disabled={!state.betting} onPress={()=>choose(i)}
                style={[S.starFood,{width:foodSize,height:foodSize,borderRadius:foodSize/2,
                  left:mid+Math.cos(position)*radius-foodSize/2,top:mid+Math.sin(position)*radius-foodSize/2},
                  (state.phase==='result'&&state.winner===i||Boolean(chosen[i]))&&S.starFoodLit]}>
                <Text style={S.gameFood}>{food[0]}</Text>
                <Text style={S.starFoodLabel}>{chosen[i]?fmt(chosen[i])+' 💎':'×'+food[2]}</Text>
              </TouchableOpacity>;
            })}
            </Animated.View>
            <View style={[S.starCenter,{width:centerSize,height:centerSize,borderRadius:centerSize/2,
              left:mid-centerSize/2,top:mid-centerSize/2}]}>
              <Text style={S.gameClock}>{state.phase==='result'?FOOD[state.winner][0]:state.remaining+' ث'}</Text>
            </View>
            {state.phase!=='betting'&&<Text pointerEvents="none" style={[S.gamePointer,{top:0,left:mid-10,zIndex:10,elevation:10}]}>▼</Text>}
          </View>
          {roundHistory.map(h=><Text key={h.round} style={S.gameHistory}>#{h.round} · {FOOD[h.winner][1]}</Text>)}
        </ScrollView>
        <View style={S.gameFooter}>
          <Text style={S.gameMeta} accessibilityLiveRegion="polite">
            {state.phase==='result'?'الفائز: '+FOOD[state.winner][1]+' ×'+FOOD[state.winner][2]:
              state.betting?'اختر حتى 6 خانات · ألماس تجريبي':'العجلة تدور · المراهنة مغلقة'}
          </Text>
          <View style={S.gameAmounts}>{[10,100,500,1000,10000].map(n=>
            <TouchableOpacity key={n} accessibilityRole="button" accessibilityState={{disabled:!state.betting,selected:amount===n}}
              disabled={!state.betting} onPress={()=>setAmount(n)} style={[S.gameAmount,amount===n&&S.gameAmountSelected]}>
              <Text style={S.gameAmountText} adjustsFontSizeToFit numberOfLines={1}>{fmt(n)}</Text>
            </TouchableOpacity>)}</View>
        </View>
      </View>
    </View>
  </Modal>;
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
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw Object.assign(new Error(detail.error||'تعذّر الاتصال بالخدمة ('+response.status+')'),{status:response.status})}
  return response.json();
}

class RoomFailureBoundary extends React.Component {
  state={failed:false,attempt:0};
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(error){console.warn('Clipi room rendering failed',error?.message)}
  render(){
    if(this.state.failed)return <View style={S.panel}><Text style={S.white}>تعذّر تشغيل {this.props.label}</Text>
      <Small title="إعادة المحاولة" onPress={()=>this.setState(({attempt})=>({attempt:attempt+1,failed:false}))}/>
      {this.props.onExit&&<Small title="رجوع" onPress={this.props.onExit}/>}</View>;
    return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}

function audioSlot(person,ownerUid){
  if(!person)return null;
  if(person.seat===9||(person.uid===ownerUid&&person.seat===0))return 0;
  return person.seat>0&&person.seat<=8?person.seat:null;
}

function RoomMedia(props){
  const [runtime,setRuntime]=useState(null);
  const [loadError,setLoadError]=useState(false);
  useEffect(()=>{
    const task=InteractionManager.runAfterInteractions(()=>{try{setRuntime(loadRoomMediaRuntime());}
    catch(error){console.warn('Room media initialization failed',error);setLoadError(true);}});
    return ()=>task.cancel();
  },[]);
  if(loadError)return <Text style={mediaStyles.status}>تعذر تشغيل الصوت والفيديو على هذا الجهاز</Text>;
  if(!runtime)return <Text style={mediaStyles.status}>جاري إعداد البث…</Text>;
  return <RoomFailureBoundary label="الصوت والفيديو"><RoomMediaSession {...props} runtime={runtime}/></RoomFailureBoundary>;
}

function RoomMediaSession({room,userId,canPublish,audio,blocked,guests,runtime,session,onSeat,lockedSlots,allMicsLocked,people,initialMedia,speakerMuted}){
  const {AudioSession,LiveKitRoom}=runtime;
  const [credentials,setCredentials]=useState(()=>initialMedia?.canPublish===canPublish?initialMedia:null);
  const firstToken=useRef(credentials);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  const [audioReady,setAudioReady]=useState(false);
  useEffect(()=>{
    if(!MEDIA_CONFIGURED)return;
    let mounted=true;
    setAudioReady(false);
    const start=Promise.resolve().then(()=>AudioSession.startAudioSession());
    void start.then(()=>{if(mounted)setAudioReady(true)},()=>{if(mounted)setError('تعذر بدء جلسة الصوت')});
    return()=>{mounted=false;void start.catch(()=>{}).then(()=>AudioSession.stopAudioSession()).catch(()=>{});};
  },[attempt]);
  useEffect(()=>{
    if(!MEDIA_CONFIGURED)return;
    if(firstToken.current&&attempt===0){firstToken.current=null;return}
    const controller=new AbortController();
    let active=true;
    const timeout=setTimeout(()=>controller.abort(),12000);
    (async()=>{
      if(auth().currentUser?.uid!==userId)throw new Error('انتهت جلسة الدخول');
      const result=await mediaRequest('/token',{roomId:room.id,session},controller.signal);
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
  if(!audioReady||!credentials||credentials.canPublish!==canPublish)return <Text style={mediaStyles.status}>جاري الاتصال بالبث…</Text>;
  return <LiveKitRoom serverUrl={credentials.serverUrl} token={credentials.token} connect audio={false} video={false}
    onError={()=>setError('تعذر الاتصال بالبث')}
    onDisconnected={()=>setError('انقطع اتصال البث')}>
    <ConnectedMedia runtime={runtime} room={room} canPublish={canPublish} audio={audio} blocked={blocked} guests={guests} people={people} lockedSlots={lockedSlots} allMicsLocked={allMicsLocked} onSeat={onSeat} speakerMuted={speakerMuted}/>
  </LiveKitRoom>;
}

function ConnectedMedia({room,canPublish,audio,blocked,guests,runtime,session,onSeat,lockedSlots,allMicsLocked,people,speakerMuted}){
  const {VideoTrack,isTrackReference,useConnectionState,useLocalParticipant,useParticipants,useTracks,ConnectionState,Track}=runtime;
  const state=useConnectionState();
  const {localParticipant,isMicrophoneEnabled,isCameraEnabled}=useLocalParticipant();
  const tracks=useTracks([Track.Source.Camera],{onlySubscribed:true});
  const participants=useParticipants();
  useEffect(()=>{
    for(const participant of participants){
      if(participant===localParticipant||typeof participant.setVolume!=='function')continue;
      participant.setVolume(speakerMuted?0:1);
      participant.setVolume(speakerMuted?0:1,Track.Source.ScreenShareAudio);
    }
  },[participants,localParticipant,speakerMuted,Track]);
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
      try{await localParticipant.setMicrophoneEnabled(true);}
      catch{failed=true;}
      if(active&&!audio){
        try{await localParticipant.setCameraEnabled(true);}
        catch{failed=true;}
      }
      if(active&&failed)Alert.alert('تعذر تشغيل الوسائط','تحقق من أذونات الميكروفون والكاميرا.');
    })().finally(()=>{
      pending.current=false;
      setBusy(false);
    });
    return()=>{active=false;};
  },[canPublish,state,audio,localParticipant]);
  async function toggle(source, enabled){
    if(state!==ConnectionState.Connected||pending.current)return;
    pending.current=true;
    setBusy(true);
    try{
      if(source==='camera')await localParticipant.setCameraEnabled(!isCameraEnabled);
      else await localParticipant.setMicrophoneEnabled(enabled??!isMicrophoneEnabled);
    }catch{
      Alert.alert('تعذر تشغيل الوسائط','تحقق من أذونات الكاميرا والميكروفون.');
    }finally{
      pending.current=false;
      setBusy(false);
    }
  }
  function renderMic(slot){
    const person=seats.get(slot);
    const main=slot===0;
    const locked=lockedSlots.includes(slot)||allMicsLocked;
    const micName=main?'المايك الرئيسي':'المايك'+' '+slot;
    const live=participants.find(p=>p.identity===person?.uid);
    const press=showMenu=>onSeat({slot,person,anchor:seatRefs.current[slot],micName,showMenu,
      toggleMic:()=>toggle('microphone'),micOn:isMicrophoneEnabled});
    return <TouchableOpacity key={slot} ref={node=>{seatRefs.current[slot]=node}}
      testID={'room-mic-'+slot} accessibilityRole="button" accessibilityLabel={micName+(person?' · '+person.name:'')}
      style={main?S.hostSeat:S.seatItem} onPress={()=>press(false)} onLongPress={()=>press(true)}>
      <View style={[main?S.hostCrown:S.throne,person?.frame&&{borderWidth:3,borderColor:GOLD}]}>
        <Text style={main?S.hostCrownText:{fontSize:23}}>{person?(person.uid===room.ownerUid?'♛':live?.isMicrophoneEnabled?'🎙️':'💺'):locked?'🔒':'+'}</Text>
      </View>
      <Text numberOfLines={1} style={main?S.hostSeatName:S.tiny}>{person?.name||(main?micName:slot)}</Text>
      {main&&person&&<Text style={S.hostSeatRole}>{person.uid===room.ownerUid?'صاحب البث':micName}</Text>}
    </TouchableOpacity>;
  }
  return <>
    {!audio&&camera&&!blocked.includes(room.ownerUid)&&<VideoTrack trackRef={camera} style={StyleSheet.absoluteFillObject}/>}
    {!audio&&guestCamera&&<View pointerEvents="none" style={mediaStyles.guest}><VideoTrack trackRef={guestCamera} style={StyleSheet.absoluteFillObject}/></View>}
    {state!==ConnectionState.Connected?<Text style={mediaStyles.status}>جاري الاتصال بالبث…</Text>:
      audio?<>{renderMic(0)}
        <View style={S.seatGrid}>{Array.from({length:AUDIO_GUEST_SEATS},(_,i)=>renderMic(i+1))}</View></>:
        !camera&&<Text style={mediaStyles.status}>كاميرا المضيف مغلقة</Text>}
    {canPublish&&state===ConnectionState.Connected&&!busy&&<View style={mediaStyles.controls}>
      <TouchableOpacity accessibilityLabel={isMicrophoneEnabled?'كتم الميكروفون':'تشغيل الميكروفون'} style={S.roomMenuTrigger} onPress={()=>toggle('microphone')}><Text style={S.roomControlGlyph}>{isMicrophoneEnabled?'🎙️':'🔇'}</Text></TouchableOpacity>
      {!audio&&<TouchableOpacity accessibilityRole="button" accessibilityLabel={isCameraEnabled?'إغلاق الكاميرا':'تشغيل الكاميرا'} style={S.roomMenuTrigger} onPress={()=>toggle('camera')}><Text style={S.roomControlGlyph}>{isCameraEnabled?'📹':'📷'}</Text></TouchableOpacity>}
    </View>}
  </>;
}

const mediaStyles=StyleSheet.create({
  status:{textAlign:'center',color:'white',padding:10,backgroundColor:'#142338'},
  notice:{alignItems:'center'},
  requests:{maxHeight:110,backgroundColor:"#142338"},
  guest:{position:'absolute',right:12,bottom:185,width:116,height:150,zIndex:2,overflow:'hidden',borderRadius:12,borderWidth:2,borderColor:GOLD},
  controls:{flexDirection:'row',alignSelf:'flex-end',gap:6,marginHorizontal:8},
});

function Room({room,userId,username,avatar,equipped,diamonds,onBet,onCredit,onExit,onMinimize,onRestore,onWallet,onShop,minimized}){
  const [globalGameOpen,setGlobalGameOpen]=useState(false);
  const [chatVisible,setChatVisible]=useState(true);
  const audio=room.type==='audio';
  const isHost=room.ownerUid===userId;
  const [message,setMessage]=useState(''),[sending,setSending]=useState(false);
  const [pin,setPin]=useState('');
  const paidNonce=useRef(null),giftSending=useRef(false);
  const [giftTarget,setGiftTarget]=useState(null),[targetProfile,setTargetProfile]=useState(null);
  const [roomActionPending,setRoomActionPending]=useState(false);
  const roomActionLock=useRef(false);
  const [roomMenu,setRoomMenu]=useState(null);
  const [closingRoom,setClosingRoom]=useState(false);
  const [speakerMuted,setSpeakerMuted]=useState(false);
  const [giftNotice,setGiftNotice]=useState('');
  const [giftIssue,setGiftIssue]=useState('');
  const [giftOpen,setGiftOpen]=useState(false),[fx,setFx]=useState(null),[fxId,setFxId]=useState(0),[keyboardOn,setKeyboardOn]=useState(false);
  const roomRef=firestore().collection('rooms').doc(room.id);
  const [legacyChat,setLegacyChat]=useState([]);
  const [legacyMessages,setLegacyMessages]=useState(0);
  const [policyOrigin,setPolicyOrigin]=useState(null);
  function openRoomPolicy(page){
    setPolicyOrigin(roomMenu==='settings'?'settings':null);
    setRoomMenu(page);
  }
  const [stagePanelVisible,setStagePanelVisible]=useState(false),[blocked,setBlocked]=useState([]);
  const chatRef=useRef(null),sendingRef=useRef(false),roomClosedRef=useRef(false),exitHandledRef=useRef(false),closingByHostRef=useRef(false);
  function exitRoomOnce(){if(!exitHandledRef.current){exitHandledRef.current=true;onExit()}}
  const membership=useRoomSession(room.id,username,equipped,entries=>{
    setFxId(v=>v+1);setFx(['🏎️','دخل الغرفة '+entries.map(p=>p.name).join('، '),0,entries.some(p=>p.ride)?'car':'party']);
  },reason=>{if(closingByHostRef.current){exitRoomOnce();return;}if(exitHandledRef.current)return;Alert.alert('الغرفة',reason);exitRoomOnce()},avatar);
  const paidBalance=membership.supportBalance;
  const people=membership.state?.people||[];
  const guests=Object.fromEntries(people.filter(p=>p.seat).map(p=>[p.uid,p.name]));
  const self=people.find(p=>p.uid===userId);
  const onStage=audio?audioSlot(self,room.ownerUid)!==null:!!self?.seat;
  const isGuest=Boolean(self?.seat&&!self?.muted);
  const audioCanPublish=onStage&&!self?.muted;
  const requests=people.filter(p=>p.waiting&&!blocked.includes(p.uid));
  const requested=self?.waiting;
  const act=(op,extra)=>membership.act(op,extra).catch(e=>Alert.alert('الغرفة',e.message));
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
    }catch(error){Alert.alert("الغرفة",error.message)}
    finally{roomActionLock.current=false;setRoomActionPending(false)}
  }
  function openGifts(uid){
    Keyboard.dismiss();
    if(!giftOpen||giftTarget!==uid)setTargetProfile(null);
    setGiftIssue('');
    setGiftNotice('');
    setGiftTarget(uid&&uid!==userId?uid:null);
    setGiftOpen(true);
  }
  const giftPeople=people.filter(person=>person.uid!==userId&&!blocked.includes(person.uid)&&
    (audio?audioSlot(person,room.ownerUid)!==null:person.uid===room.ownerUid||person.seat>0));
  const selectedPerson=giftPeople.find(person=>person.uid===giftTarget);
  const selectedPresent=!!selectedPerson;
  const defaultRecipient=giftPeople.find(person=>person.uid===room.ownerUid)?.uid||giftPeople[0]?.uid;
  useEffect(()=>{
    if(giftOpen&&!giftTarget&&defaultRecipient){
      setGiftIssue('');
      setGiftTarget(defaultRecipient);
    }
  },[giftOpen,giftTarget,defaultRecipient]);
  useEffect(()=>{
    if(!giftOpen||!selectedPresent)return;
    let active=true;
    membership.act('giftRecipient',{recipient:giftTarget}).then(data=>{
      if(active&&data.recipient?.uid===giftTarget)setTargetProfile(data.recipient);
    }).catch(()=>{if(active)setTargetProfile(null)});
    return ()=>{active=false};
  },[giftOpen,giftTarget,selectedPresent]);
  useEffect(()=>{
    if(!giftNotice)return;
    const timer=setTimeout(()=>setGiftNotice(''),6500);
    return ()=>clearTimeout(timer);
  },[giftNotice]);
  async function sendRoomGift(gift){
    if(giftSending.current)return;
    if(roomClosedRef.current){setGiftIssue("الغرفة مغلقة");return}
    if(!selectedPerson){
      setGiftIssue(giftPeople.length?"اختر مستلمًا للهدية":"تحتاج الهدية إلى مضيف أو متحدث آخر على المايك.");
      return;
    }
    setGiftIssue('');
    const key=JSON.stringify([room.id,giftTarget,gift[1]]);
    if(paidNonce.current?.key!==key)paidNonce.current={key,nonce:Crypto.randomUUID()};
    const nonce=paidNonce.current.nonce;
    giftSending.current=true;
    try{
      const receipt=await membership.act('paidGift',{recipient:giftTarget,nonce,gift:gift[1],cost:gift[2]});
      if(receipt?.nonce!==nonce||receipt.recipient!==giftTarget||receipt.diamonds!==gift[2]||receipt.gift!==gift[1]){
        throw Error("تعذّر تأكيد الهدية. أعد المحاولة.");
      }
      paidNonce.current=null;
      setGiftOpen(false);
      setGiftNotice("أُضيفت الهدية إلى هدف"+' '+selectedPerson.name+' · '+fmt(receipt.diamonds)+' 💎');
      setFxId(v=>v+1);setFx(gift);
    }catch(error){
      setGiftIssue(error.message==='Purchased diamonds insufficient or host offline'
        ?"الرصيد غير كافٍ أو المستلم غادر الغرفة":error.message);
    }finally{giftSending.current=false}
  }
  async function moveToMic(slot){
    if(seatMovePending.current)return;
    seatMovePending.current=true;
    try{await act('move',{slot})}finally{seatMovePending.current=false}
  }
  function onSeat({slot,person,anchor,micName,showMenu,toggleMic,micOn}){
    const request=++menuRequest.current;
    const locked=membership.state?.lockedSlots?.includes(slot)||(!isHost&&membership.state?.locked);
    if(!person&&!locked&&!showMenu){void moveToMic(slot);return}
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
    if(!uid&&!menuLocked&&(isHost||!membership.state.locked)){
      options.push({text:'صعود',onPress:()=>moveToMic(slot)});
    }else if(!uid&&!onStage&&!isHost){
      options.push({text:requested?'إلغاء الطلب':'طلب مقعد',onPress:()=>act(requested?'cancel':'request')});
    }
    if(uid===userId){
      options.push({text:seatMenu.micOn?'كتم':'تشغيل المايك',disabled:!!self?.muted,onPress:seatMenu.toggleMic},
        {text:'إنزال',onPress:()=>act('stepDown')});
    }else if(isHost&&uid){
      options.push({text:menuPerson?.muted?'إلغاء الكتم':'كتم',onPress:()=>act(menuPerson?.muted?'unmute':'mute',{uid})},
        {text:'إنزال',onPress:()=>act('demote',{uid})},
        {text:'طرد',onPress:()=>act('eject',{uid})});
    }
    options.push({text:'إرسال هدية',onPress:()=>openGifts(uid&&uid!==userId?uid:defaultRecipient)});
    if(isHost){
      if(!uid&&!menuLocked){
        for(const person of requests)options.push({text:'صعود'+' · '+person.name,key:person.uid,
          onPress:()=>act('approve',{uid:person.uid,slot})});
      }
      options.push({text:menuLocked?'فتح المايك':'قفل المايك',onPress:()=>act('slot',{slot,locked:!menuLocked})});
    }
    return options;
  }
  useEffect(()=>{
    const unsub=roomRef.onSnapshot(d=>{
      roomClosedRef.current=!d.exists||d.data()?.status==='closed';
      if(roomClosedRef.current&&(!d.metadata.fromCache||d.exists))exitRoomOnce();
    },e=>console.warn('Room status listener',e.code));
    const blockedSub=firestore().collection('users').doc(userId).collection('blocked').onSnapshot(s=>setBlocked(s.docs.map(d=>d.id)),e=>console.warn('Room moderation listener',e.code));
    return()=>{unsub();blockedSub()};
  },[room.id,userId]);
  const admitted=Boolean(membership.state);
  useEffect(()=>{
    if(!admitted)return;
    let receivedHistory=false;
    return roomRef.collection('messages').orderBy('createdAt','asc').limitToLast(100).onSnapshot({includeMetadataChanges:true},snapshot=>{
      setLegacyChat(snapshot.docs.map(d=>({...d.data(),id:d.id,legacy:true})));
      if(receivedHistory){
        const added=snapshot.docChanges().filter(change=>change.type==='added').length;
        if(added)setLegacyMessages(total=>Math.min(4,total+added));
      }
      if(!snapshot.metadata.fromCache)receivedHistory=true;
    },()=>{});
  },[room.id,admitted]);
  function stagePanel(){
    if(!isHost)return onStage?null:<Small title={requested?'إلغاء الطلب':'طلب مقعد'} onPress={()=>act(requested?'cancel':'request')}/>;
    return null;
  }
  async function moderateMessage(m){
    if(!m?.id||!userId)return;
    const ownMessage=m.userUid===userId;
    const options=[];
    if(ownMessage||isHost)options.push({text:'حذف الرسالة',style:'destructive',onPress:()=>Alert.alert('حذف الرسالة','هل تريد حذف هذه الرسالة للجميع؟',[
      {text:'إلغاء',style:'cancel'},
      {text:'حذف',style:'destructive',onPress:async()=>{
        try{if(m.legacy)await roomRef.collection('messages').doc(m.id).delete();else await membership.act('deleteMessage',{id:m.id})}
        catch(e){Alert.alert('تعذر حذف الرسالة',e.message)}
      }}])});
    if(m.userUid&&!ownMessage){
      options.push({text:'إبلاغ',onPress:async()=>{
        try{await firestore().collection('reports').add({roomId:room.id,reportedUid:m.userUid,messageId:m.id,reporterUid:userId,reason:'رسالة مسيئة',createdAt:firestore.FieldValue.serverTimestamp(),status:'new'});Alert.alert('تم إرسال البلاغ')}
        catch(e){Alert.alert('تعذر الإبلاغ',e.message)}
      }});
      options.push({text:'حظر المستخدم',onPress:async()=>{
        try{await firestore().collection('users').doc(userId).collection('blocked').doc(m.userUid).set({createdAt:firestore.FieldValue.serverTimestamp()});Alert.alert('تم الحظر')}
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
    const text=message.trim();
    if(!text||!userId||!room?.id||sendingRef.current)return;
    if(roomClosedRef.current)return Alert.alert('الغرفة مغلقة','لا يمكن إرسال رسائل بعد إغلاق الغرفة');
    if(text.length>500)return Alert.alert('الرسالة طويلة','الحد الأقصى 500 حرف');
    sendingRef.current=true;
    setSending(true);
    try{
      await membership.act('message',{text});
      // Do not erase edits typed while the network request was in flight.
      setMessage(current=>current.trim()===text?'':current);
      setTimeout(()=>chatRef.current?.scrollToEnd?.({animated:true}),40);
    }catch(e){Alert.alert('تعذر إرسال الرسالة',e.message)}
    finally{sendingRef.current=false;setSending(false)}
  }
  async function closeHostedRoom(){
    if(!isHost||!room?.id||closingRoom)return;
    setClosingRoom(true);
    closingByHostRef.current=true;
    try{
      await firestore().collection('rooms').doc(room.id).update({status:'closed'});
          if(MEDIA_CONFIGURED)void mediaRequest('/close-room',{roomId:room.id,session:membership.session}).catch(()=>Alert.alert('تعذر إنهاء بث الغرفة على الخادم'));
      setRoomMenu(null);
      exitRoomOnce();
    }catch(e){closingByHostRef.current=false;Alert.alert('تعذر إغلاق الغرفة',e.message)}
    finally{setClosingRoom(false)}
  }
  function confirmCloseHostedRoom(){
    if(!isHost)return;
    Alert.alert('إغلاق الغرفة للجميع','سيتم إغلاق الغرفة ولن يتمكن المشاركون من إرسال رسائل جديدة.',[
      {text:'إلغاء',style:'cancel'},
      {text:'إغلاق الغرفة',style:'destructive',onPress:closeHostedRoom}
    ]);
  }
  function closeRoomMenu(){
    Keyboard.dismiss();
    setPin('');
    setRoomMenu(null);
  }
  function goBackFromRoomMenu(){
    if(roomMenu==='terms'||roomMenu==='privacy')setRoomMenu(policyOrigin);
    else if(roomMenu==='themes')setRoomMenu('settings');
    else closeRoomMenu();
  }
  const roomSettings=<Modal visible={roomMenu!==null&&!minimized} transparent animationType="fade" onRequestClose={goBackFromRoomMenu}>
    {roomMenu==='terms'||roomMenu==='privacy'
      ?<PolicySheet key={roomMenu} page={roomMenu} endpoint={MEDIA_ENDPOINT} onClose={goBackFromRoomMenu}/>
      :<View style={S.roomMenuOverlay}>
      <TouchableOpacity accessible={false} style={StyleSheet.absoluteFillObject} onPress={closeRoomMenu}/>
      <KeyboardAvoidingView style={S.roomMenuPanel} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={S.hostSettingsHeading}>
          <Text style={S.title}>{roomMenu==='themes'?'ثيمات الغرفة':'إعدادات الغرفة'}</Text>
          <WindowControl icon={roomMenu==='themes'?'‹':'×'} label={roomMenu==='themes'?"رجوع":"إغلاق"} onPress={goBackFromRoomMenu}/>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={S.roomMenuItems}>
          {roomMenu==='themes'&&isHost?<>
            {[['default','الأصلي'],['palace','القصر الملكي'],['aurora','الشفق القطبي'],['dunes','كثبان القمر']].map(([theme,label])=>
              <RoomOption key={theme} title={(membership.state?.theme===theme?'✓ ':'')+label} onPress={()=>act('settings',{theme})}/>)}
            <RoomOption title="اختيار خلفية من الاستوديو" onPress={async()=>{
              try{const image=await choosePhoto(1000);if(image)await membership.act('settings',{theme:'upload',image})}
              catch(e){Alert.alert('ثيم الغرفة',e.message)}
            }}/>
          </>:<>
            <RoomOption title="مشاركة الغرفة" onPress={()=>{
              closeRoomMenu();
              Share.share({message:room.name+'\n'+MEDIA_ENDPOINT+'/#room='+encodeURIComponent(room.id)})
                .catch(()=>Alert.alert('تعذرت مشاركة الغرفة'));
            }}/>
            <RoomOption title={"شروط الخدمة"} onPress={()=>openRoomPolicy('terms')}/>
            <RoomOption title={"سياسة الخصوصية"} onPress={()=>openRoomPolicy('privacy')}/>
            <RoomOption title={chatVisible?'إخفاء الدردشة':'إظهار الدردشة'} onPress={()=>{setChatVisible(v=>!v);closeRoomMenu()}}/>
            <RoomOption plain title="تصغير الغرفة" onPress={()=>{closeRoomMenu();onMinimize()}}/>
            {isHost&&<>
              <RoomOption title="ثيمات الغرفة" onPress={()=>{Keyboard.dismiss();setPin('');setRoomMenu('themes')}}/>
              <RoomOption title={membership.state?.locked?'🔓 فتح المايكات':'🔒 قفل المايكات'} disabled={roomActionPending} onPress={()=>updateRoomSettings({locked:!membership.state.locked})}/>
              {(audio||requests.length>0)&&<RoomOption title={(stagePanelVisible?'إخفاء طلبات المقاعد':'طلبات المقاعد')+' ('+requests.length+')'} onPress={()=>{closeRoomMenu();setStagePanelVisible(value=>!value)}}/>}
              <TextInput style={[S.input,{width:'100%'}]} value={pin} secureTextEntry keyboardType="number-pad" maxLength={4} placeholder="رقم سري من أربع خانات" onChangeText={value=>setPin(normalizeRoomPin(value))}/>
              <RoomOption title="حفظ رمز الغرفة" disabled={roomActionPending} onPress={()=>{
                if(!/^[0-9]{4}$/.test(pin))return Alert.alert('أدخل أربعة أرقام');
                void updateRoomSettings({pin},true)
              }}/>
              {membership.state?.protected&&<RoomOption title="إلغاء قفل الغرفة" disabled={roomActionPending} onPress={()=>updateRoomSettings({pin:''},true)}/>}
              <RoomOption plain title="إغلاق الغرفة للجميع" onPress={()=>{closeRoomMenu();confirmCloseHostedRoom()}}/>
            </>}
          </>}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>}
  </Modal>;
  const selectedTheme=membership.state?.theme;
  const roomTheme=selectedTheme&&selectedTheme!=='default'?selectedTheme:audio?'dunes':null;
  if(!membership.state){
    const validPin=/^[0-9]{4}$/.test(pin);
    const submitPin=()=>{if(validPin&&!membership.joining)void membership.join(pin)};
    return <View style={[S.page,{justifyContent:'center',padding:24}]}>
      <Text style={S.title}>{room.name}</Text>
      {membership.pinRequired&&<>
        <Text style={S.gold}>🔒 {"أدخل رمز الغرفة"}</Text>
        <TextInput autoFocus accessibilityLabel={"رمز الغرفة"} style={S.input} value={pin} maxLength={4}
          keyboardType="number-pad" secureTextEntry onChangeText={value=>setPin(normalizeRoomPin(value))}
          onSubmitEditing={submitPin} placeholder={"رمز الغرفة"}/>
      </>}
      <Text accessibilityLiveRegion="polite" style={S.white}>{membership.error||"جارٍ دخول الغرفة…"}</Text>
      {membership.pinRequired?<Btn title={"دخول"} disabled={!validPin||membership.joining} onPress={submitPin}/>:
        membership.error&&<Btn title={"دخول"} disabled={membership.joining} onPress={()=>membership.join()}/>}
      <Small title={"رجوع"} onPress={isHost?closeHostedRoom:exitRoomOnce}/>
    </View>;
  }
  return <KeyboardAvoidingView style={[S.room,{backgroundColor:audio?'#102b2a':'#081923'}]} behavior={Platform.OS==='ios'?'padding':undefined}>
    <StatusBar barStyle="light-content"/>
    {audio&&<View pointerEvents="none" style={S.audioBackdrop}><View style={S.blueGlow}/><View style={S.royalGlow}/><Text style={S.bgCrown}>♛</Text><Text style={S.bgOrnament}>✦ ✧ ♛ ✧ ✦</Text></View>}
    {roomTheme&&<Image pointerEvents="none" resizeMode="cover" style={[StyleSheet.absoluteFillObject,{width:'100%',height:'100%'}]} source={{uri:MEDIA_ENDPOINT+'/themes/'+(['palace','aurora','dunes'].includes(roomTheme)?roomTheme+'.jpg':encodeURIComponent(room.id)+'/'+roomTheme)}}/>}
    {audio&&<View pointerEvents="none" style={S.roomThemeShade}/>}
    {!audio&&<View style={[StyleSheet.absoluteFillObject,{paddingTop:110}]}><RoomMedia room={room} userId={userId} canPublish={isHost||isGuest} audio={audio} blocked={blocked} guests={guests} initialMedia={membership.state.media} key={String(isHost||isGuest)} session={membership.session} people={people} lockedSlots={membership.state?.lockedSlots||[]} allMicsLocked={membership.state.locked} onSeat={onSeat} speakerMuted={speakerMuted}/></View>}
    {roomSettings}
    {globalGameOpen&&<GlobalGreedyPreview visible={minimized} onRestoreRoom={onRestore} roomName={room.name} diamonds={diamonds}
      onShop={()=>{setGlobalGameOpen(false);onShop()}} onBet={onBet} onCredit={onCredit} onClose={()=>setGlobalGameOpen(false)}/>}
    <View style={S.roomTop}>
      <View style={S.roomTopRow}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={isHost?'إغلاق البث':'مغادرة الغرفة'} style={S.roomMenuTrigger} onPress={isHost?closeHostedRoom:exitRoomOnce}><Text style={S.roomControlGlyph}>✕</Text></TouchableOpacity>
        <View style={S.roomIdentity}>
          <Text style={S.roomName} numberOfLines={1}>{room.name}</Text>
          <Text style={S.roomType}>{audio?'🎙 غرفة صوتية':'📹 بث فيديو'}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={'تصغير الغرفة'} style={S.roomMenuTrigger} onPress={onMinimize}><Text style={S.roomControlGlyph}>−</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="إعدادات الغرفة"
          accessibilityState={{expanded:roomMenu!==null}} style={S.roomMenuTrigger}
          onPress={()=>{Keyboard.dismiss();setRoomMenu('settings')}}>
          <Text style={[S.roomControlGlyph,S.roomMenuDots]}>⋮</Text>
        </TouchableOpacity>
      </View>
    </View>
    {audio&&<RoomMedia room={room} userId={userId} canPublish={audioCanPublish} audio={audio} blocked={blocked} guests={guests} initialMedia={membership.state.media} key={String(audioCanPublish)} session={membership.session} people={people} lockedSlots={membership.state?.lockedSlots||[]} allMicsLocked={membership.state.locked} onSeat={onSeat} speakerMuted={speakerMuted}/>}
    <View pointerEvents="none" style={{flex:1}}/>

    {isHost&&stagePanelVisible&&!keyboardOn&&<ScrollView style={mediaStyles.requests}>
      {!requests.length&&<Text style={S.white}>لا توجد طلبات مايك</Text>}
      {requests.map(item=><View key={item.uid} style={S.seatRequest}>
        <Text numberOfLines={1} style={S.white}>{item.name}</Text>
        <Small title="قبول" onPress={()=>act('approve',{uid:item.uid})}/>
        <Small title="رفض" onPress={()=>act('reject',{uid:item.uid})}/>
      </View>)}
    </ScrollView>}
    {!keyboardOn&&<View style={S.actions}><Small title="🌍 Greedy Star" color="#0c9b69" onPress={()=>{Keyboard.dismiss();setGiftOpen(false);setGlobalGameOpen(true);onMinimize()}}/><Text style={S.tiny}>{isHost?'👑 أنت مضيف الغرفة':'👤 أنت مشاهد'} · {audio?'غرفة صوتية':'غرفة فيديو'}</Text></View>}
    {chatVisible&&!keyboardOn&&<ScrollView ref={chatRef} style={S.chat} contentContainerStyle={{padding:7}}><Text style={S.tiny}>اضغط مطولًا للإبلاغ أو الحظر أو حذف رسالتك، ويستطيع المضيف حذف رسائل الغرفة.</Text>{[...legacyChat,...(membership.state?.chat||[])].filter(m=>!blocked.includes(m.userUid)).map(m=><TouchableOpacity key={m.id} onLongPress={()=>moderateMessage(m)} style={S.bubble}><Text style={S.white}><Text style={{color:GOLD}}>{m.userName||'مستخدم'}: </Text>{m.text}</Text></TouchableOpacity>)}</ScrollView>}
    <RoomGiftSheet visible={giftOpen&&!minimized}
      gifts={GIFTS} allLabel="الكل" translate={value=>value}
      copy={{title:"صندوق الهدايا",close:"إغلاق",balance:"الماس المشترى",wallet:"المحفظة",shop:"شراء الماس",send:"إرسال"}}
      recipient={selectedPerson?.name||"اختر مستلمًا للهدية"}
      recipientAvatar={selectedPresent&&targetProfile?.uid===giftTarget?targetProfile.avatar:null} balance={paidBalance}
      onWallet={()=>{setGiftOpen(false);onWallet()}}
      onShop={()=>{setGiftOpen(false);onShop()}}
      onClose={()=>setGiftOpen(false)} onSend={sendRoomGift}>
      {(giftPeople.length>1||(!selectedPresent&&giftPeople.length>0))&&<ScrollView horizontal style={{flexGrow:0}} keyboardShouldPersistTaps="handled">
        {giftPeople.map(person=><Small key={person.uid} title={person.name} onPress={()=>openGifts(person.uid)}/>)}
      </ScrollView>}
      {!selectedPresent&&<Text style={S.white}>{giftPeople.length?"اختر مستلمًا للهدية":"بانتظار صعود مستلم على المايك"}</Text>}
      {!!giftIssue&&<Text accessibilityLiveRegion="polite" style={S.white}>{giftIssue}</Text>}
    </RoomGiftSheet>
    {!!giftNotice&&<Text accessibilityLiveRegion="polite" style={S.gold}>{giftNotice}</Text>}
    <View style={S.roomBottom}>
      {!audio&&!keyboardOn&&<View style={S.roomSeatAction}>{stagePanel()}</View>}
      <RoomTermsNotice onRead={openRoomPolicy} chatRevision={membership.state.chatRevision} legacyMessages={legacyMessages}/>
      <View style={S.roomDock}>
        <View style={S.roomComment}>
          <TextInput style={S.messageInput} value={message} maxLength={500} onChangeText={setMessage}
            accessibilityLabel={"تعليق الغرفة"} placeholder={"اكتب تعليقًا..."} placeholderTextColor="#b7d0c9"
            onFocus={()=>setGiftOpen(false)} returnKeyType="send" onSubmitEditing={sendMessage}/>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={"إرسال التعليق"}
            style={[S.sendButton,(sending||!message.trim())&&{opacity:.5}]}
            disabled={sending||!message.trim()} onPress={sendMessage}><Text style={S.white}>➤</Text></TouchableOpacity>
          {audio&&!isHost&&!onStage&&<TouchableOpacity accessibilityRole="button" accessibilityLabel={requested?'إلغاء طلب المايك':'طلب مايك'} accessibilityState={{selected:!!requested}} style={S.joinButton} onPress={()=>act(requested?'cancel':'request')}><Text style={[S.white,requested&&{color:GOLD}]}>Join</Text></TouchableOpacity>}

        </View>
        {!keyboardOn&&<>
          <RoomAction icon="▦" label={"إعدادات الغرفة"} onPress={()=>setRoomMenu('settings')}/>
          <RoomAction icon={speakerMuted?'🔇':'🔊'} label={speakerMuted?"تشغيل سماعة الغرفة":"كتم سماعة الغرفة"}
            active={!speakerMuted} onPress={()=>setSpeakerMuted(value=>!value)}/>
          <RoomAction icon="▤" label={chatVisible?"إخفاء الدردشة":"إظهار الدردشة"} active={chatVisible}
            onPress={()=>setChatVisible(value=>!value)}/>
        </>}
        <RoomAction icon="🎁" label={"صندوق الهدايا"} active={giftOpen} onPress={()=>openGifts(defaultRecipient)}/>
      </View>
    </View>
    {fx&&<GiftFX key={fxId} gift={fx} onDone={()=>setFx(null)}/>}
    <View ref={roomSurface} collapsable={false} pointerEvents={seatMenu?'auto':'none'}
      style={[StyleSheet.absoluteFillObject,{direction:'ltr',zIndex:100,elevation:16}]}
      onLayout={()=>{menuRequest.current++;setSeatMenu(null)}}>
      {seatMenu&&menuPerson?.uid===seatMenu.uid&&<>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={'إغلاق قائمة المايك'}
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

export default function App(){
  const previousPage=useRef('home');const [mini,setMini]=useState(false);
  const [page,setPage]=useState('loading');
  const returnToWallet=useRef(false);
  useEffect(()=>{
    function onUrl(url){
      if(!/^clipi:\/\/wallet\/?$/.test(url||''))return;
      returnToWallet.current=true;
      if(auth().currentUser){setMini(true);go('wallet');setWalletRequest(v=>v+1)}
    }
    Linking.getInitialURL().then(onUrl).catch(()=>{});
    const sub=Linking.addEventListener('url',e=>onUrl(e.url));
    return ()=>sub.remove();
  },[]);
  const [user,setUser]=useState(null);
  const [giftWallet,setGiftWallet]=useState(null),[giftWalletError,setGiftWalletError]=useState('');
  const [walletRequest,setWalletRequest]=useState(0);
  const funded=giftWallet?.uid===user?.uid?giftWallet?.data:null;
  useEffect(()=>{
    if(!user?.uid||!['wallet','profile'].includes(page))return;
    let active=true,timer;
    async function refresh(){
      try{
        const data=await mediaRequest('/account-number',{op:'wallet'});
        if(active&&auth().currentUser?.uid===user.uid){
          setGiftWallet({uid:user.uid,data});setGiftWalletError('');
        }
      }catch(error){if(active)setGiftWalletError(error.message)}
      if(active&&page==='wallet')timer=setTimeout(refresh,15000);
    }
    setGiftWalletError('');
    if(page==='wallet')void mediaRequest('/account-number',{op:'externalOrders'}).catch(()=>{}).then(()=>{if(active)void refresh()});
    else void refresh();
    return ()=>{active=false;clearTimeout(timer)};
  },[user?.uid,page,walletRequest]);
  const [identity,setIdentity]=useState(null),[numberError,setNumberError]=useState('');
  async function numbers(op='read',number){
    const who=auth().currentUser;
    if(!who)return;
    const token=await who.getIdToken();
    const res=await fetch(MEDIA_ENDPOINT+'/account-number',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({op,number})});
    const data=await res.json();
    if(!res.ok)throw Error(data.error||'تعذر فتح متجر الأرقام');
    if(auth().currentUser?.uid===who.uid){setIdentity({...data,uid:who.uid});setNumberError('')}
  }
  useEffect(()=>{if(user?.uid)numbers().catch(e=>setNumberError(e.message));else setIdentity(null)},[user?.uid,page]);
  const numberAction=(op,n)=>numbers(op,n).catch(e=>Alert.alert('أرقام كليبي',e.message));

  const [name,setName]=useState(''),[phone,setPhone]=useState(''),[country,setCountry]=useState(0),[countriesOpen,setCountriesOpen]=useState(false),[accepted,setAccepted]=useState(false);
  const [loginMethod,setLoginMethod]=useState('email');
  const [emailMode,setEmailMode]=useState('login');
  const [email,setEmail]=useState(''),[password,setPassword]=useState('');
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
        if(!current.exists)update.displayName=(account.displayName||name||"مستخدم").trim().slice(0,35)||"مستخدم";
        transaction.set(profile,update,{merge:true});
      });
      if(auth().currentUser?.uid===account.uid){selectedEmoji.current=null;setAvatar(photo)}
    }catch(error){
      if(auth().currentUser?.uid===account.uid)Alert.alert("الصورة",error.message);
    }finally{pickingPhoto.current=false}
  }
  const profileSetupRef=useRef(false);
  const currentSessionUidRef=useRef(undefined);
  // جميع هذه الأرصدة عرض محلي فقط، لا تُمنح فعليًا لكل حساب على Firebase.
  const [wallet,setWallet]=useState({welcome:WELCOME,purchased:0,owner:0});
  const walletRef=useRef({welcome:WELCOME,purchased:0,owner:0});
  const [ownerDemo,setOwnerDemo]=useState(false),[ownerGranted,setOwnerGranted]=useState(false);
  const [inventory,setInventory]=useState(['👑 إطار فاخر','🏎️ دخول سيارة فاخرة']);
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
  const [discoveryFilter,setDiscoveryFilter]=useState('all');
  const [rooms,setRooms]=useState([]),[roomName,setRoomName]=useState('غرفتي'),[roomType,setRoomType]=useState('video'),[activeRoom,setActiveRoom]=useState(null);
  const [bets,setBets]=useState({}),[betAmount,setBetAmount]=useState(10),[seconds,setSeconds]=useState(30),[phase,setPhase]=useState('betting'),[lit,setLit]=useState(-1),[gameResult,setGameResult]=useState(null),[history,setHistory]=useState([]);
  const betsRef=useRef({}),phaseRef=useRef('betting'),pageRef=useRef('loading'),timerRef=useRef(null);
  const total=wallet.welcome+wallet.purchased+(ownerDemo?wallet.owner:0);
  const available=wallet.welcome+wallet.purchased+(ownerDemo?wallet.owner:0);
  const go=p=>{if(!SHOW_UNRELEASED_DEMOS&&['earnings','payout','gifts','games','game'].includes(p))return;pageRef.current=p;setPage(p)};
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
    try{GoogleSignin.configure({webClientId:GOOGLE_WEB_CLIENT_ID});}
    catch(error){console.warn('Google sign-in initialization failed',error);}
  },[]);
  useEffect(()=>{
    let active=true;
    let unsub;
    try{unsub=auth().onAuthStateChanged(async u=>{
      if(!active)return;
      // Local demo data must never leak between Firebase accounts on the same device.
      if(currentSessionUidRef.current!==u?.uid){
        currentSessionUidRef.current=u?.uid;
        selectedEmoji.current=null;setAvatar('👤');
        setBalance({welcome:WELCOME,purchased:0,owner:0});
        setOwnerDemo(false);setOwnerGranted(false);
        setInventory(['👑 إطار فاخر','🏎️ دخول سيارة فاخرة']);
        setEquipped({frame:'👑 إطار فاخر',ride:'🏎️ دخول سيارة فاخرة'});
        setSpent(0);setReceived(0);setSupportLog([]);
        setPayoutDrafts([]);setPayoutAccount('');setPayoutHolder('');
        setPayoutBankName('');setPayoutSwift('');setPayoutAmount('');
        setHistory([]);setBets({});betsRef.current={};
        phaseRef.current='betting';setPhase('betting');setSeconds(30);
        clearTimeout(timerRef.current);
      }
      setUser(u);
      setRooms([]);setActiveRoom(null);
      if(u){
        // Account creation or SMS confirmation owns profile creation and navigation until it finishes.
        if(profileSetupRef.current)return;
        try{
          const doc=await firestore().collection('users').doc(u.uid).get();
          if(!active||auth().currentUser?.uid!==u.uid)return;
          if(doc.exists){
            const d=doc.data()||{};
            setName(d.displayName||u.displayName||'مستخدم');
            setAvatar(d.avatar||'👤');
          }else if(u.displayName)setName(u.displayName);
        }catch(e){console.warn('Profile load failed',e.message)}
        if(active&&auth().currentUser?.uid===u.uid){go(returnToWallet.current?'wallet':'home');returnToWallet.current=false}
      }else{
        setConfirmation(null);setSmsCode('');setAvatar('👤');setBlockedUsers([]);
        setName('');setRoomError('');
        go('login');
      }
    });}catch(error){
      console.warn('Firebase authentication initialization failed',error);
      setAuthError('تعذر بدء تسجيل الدخول. أغلق التطبيق وحاول مجددًا.');
      go('login');
    }
    return ()=>{active=false;unsub?.()};
  },[]);
  useEffect(()=>{
    if(!user?.uid)return;
    setRooms([]);setRoomError('');
    let candidates=[],live=new Set(),mounted=true,pending=false;
    const display=()=>setRooms(candidates.filter(r=>r.status==='open'&&live.has(r.id)));
    async function refresh(){
      if(pending)return;
      pending=true;
      try{
        const response=await fetch(MEDIA_ENDPOINT+'/active-rooms');
        if(!response.ok)throw Error('تعذر التحقق من الغرف المفتوحة');
        const data=await response.json();
        if(mounted){live=new Set(data.rooms);display();setRoomError('')}
      }catch(e){if(mounted){live.clear();display();setRoomError(e.message)}}
      finally{pending=false}
    }
    void refresh();
    const interval=setInterval(refresh,10000);
    const unsub=firestore().collection('rooms').orderBy('createdAt','desc').limit(50).onSnapshot(snapshot=>{
      candidates=snapshot.docs.map(d=>({id:d.id,...d.data()}));display();
    },e=>{setRooms([]);setRoomError('تعذر تحميل الغرف: '+e.message)});
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
      Alert.alert('تم','أزلنا هذا الحساب من قائمة الحظر لديك');
    }catch(error){Alert.alert('تعذر إلغاء الحظر',error.message)}
  }
  async function deleteAccount(){
    if(!user?.uid)return Alert.alert('تسجيل الدخول','سجل الدخول أولاً لإدارة حسابك');
    // Client-only deletion cannot remove nested Firestore collections, messages,
    // reports or storage objects. Never claim full erasure or leave partial state.
    Alert.alert('طلب حذف الحساب',
      'الحذف الشامل غير متاح آليًا في هذه النسخة. لحماية بياناتك لن نحذف ملفك جزئيًا أو نترك بيانات مرتبطة بحساب محذوف. أرسل طلب حذف إلى Liddawiw@gmail.com مع معرّف حسابك الظاهر أدناه. لا ترسل رمز SMS أو كلمة مرور.',[
      {text:'إلغاء',style:'cancel'},
      {text:'نسخ معرّف الحساب',onPress:()=>Share.share({message:'طلب حذف حساب Clipi\\nمعرّف الحساب: '+user.uid+'\\nيرجى تأكيد إجراءات حذف البيانات المرتبطة بالحساب.'})}
    ]);
  }
  async function saveProfile(u,label,editing=false){
    if(!u?.uid)throw new Error('يرجى تسجيل الدخول أولًا');
    if(!editing&&(await firestore().collection('users').doc(u.uid).get()).exists)return;
    const displayName=(label||u.displayName||'مستخدم').trim();
    if(!displayName||displayName.length>35)throw new Error('اسم المستخدم يجب أن يكون بين 1 و35 حرفًا');
    const update={displayName,updatedAt:firestore.FieldValue.serverTimestamp()};
    if(!editing||selectedEmoji.current)update.avatar=selectedEmoji.current||avatar;
    await firestore().collection('users').doc(u.uid).set(update,{merge:true});
    if(auth().currentUser?.uid===u.uid)setName(displayName);
  }
  async function emailLogin(){
    if(busy)return;
    const address=email.trim();
    const creating=emailMode==='signup';
    const resetting=emailMode==='reset';
    if(!/^\S+@[^\s@]+\.[^\s@]+$/.test(address))return Alert.alert('البريد','أدخل بريدًا إلكترونيًا صحيحًا.');
    if(!resetting&&!accepted)return Alert.alert('الشروط','وافق على الشروط أولاً.');
    if(!resetting&&(!password||(creating&&password.length<6)))return Alert.alert('كلمة المرور','أدخل كلمة المرور. الحساب الجديد يحتاج إلى ستة أحرف على الأقل.');
    if(creating&&(!name.trim()||name.trim().length>35))return Alert.alert('الاسم','أدخل اسمًا من 1 إلى 35 حرفًا.');

    Keyboard.dismiss();
    setBusy(true);
    setAuthError('');
    profileSetupRef.current=creating;
    try{
      if(resetting){
        await auth().sendPasswordResetEmail(address).catch(error=>{
          if(error?.code!=='auth/user-not-found')throw error;
        });
        setEmailMode('login');
        Alert.alert('استعادة كلمة المرور','إذا كان البريد مرتبطًا بحساب، سيصلك رابط لتعيين كلمة مرور جديدة.');
        return;
      }
      if(!creating){
        await auth().signInWithEmailAndPassword(address,password);
        return;
      }
      const {user:created}=await auth().createUserWithEmailAndPassword(address,password);
      const displayName=name.trim();
      try{await created.updateProfile({displayName});}
      catch(error){console.warn('Email profile update failed',error.code);}
      try{await saveProfile(created,displayName);}
      catch(error){console.warn('Email profile sync failed',error.code);}
      setName(displayName);
      go('home');
    }catch(error){
      const messages={
        'auth/operation-not-allowed':'خدمة الدخول بالبريد غير مفعّلة حاليًا.',
        'auth/email-already-in-use':'هذا البريد مسجّل بالفعل. جرّب تسجيل الدخول أو استعادة كلمة المرور.',
        'auth/invalid-email':'أدخل بريدًا إلكترونيًا صحيحًا.',
        'auth/weak-password':'اختر كلمة مرور أقوى.',
        'auth/too-many-requests':'محاولات كثيرة. حاول مرة أخرى لاحقًا.',
        'auth/network-request-failed':'تعذر الاتصال بالشبكة. تحقق من الإنترنت.',
        'auth/user-disabled':'هذا الحساب معطّل.',
      };
      const message=messages[error?.code]||(resetting?'تعذر إرسال رابط الاستعادة. حاول مجددًا.':creating?'تعذر إنشاء الحساب. تحقق من البيانات وحاول مجددًا.':'تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.');
      setAuthError(message);
      Alert.alert('الدخول بالبريد',message);
    }finally{
      profileSetupRef.current=false;
      setPassword('');
      setBusy(false);
    }
  }
  function phoneAuthMessage(e){
    if(/billing[-_ ]not/i.test(`${e?.code||''} ${e?.message||''}`)){
      return 'رموز SMS غير متاحة حاليًا لأن الفوترة غير مفعّلة لدى مزوّد تسجيل الدخول.';
    }
    switch(e?.code){
      case 'auth/invalid-phone-number': return 'رقم الهاتف غير صحيح. تحقق من رمز الدولة والرقم.';
      case 'auth/too-many-requests': return 'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.';
      case 'auth/quota-exceeded': return 'تم تجاوز حد رسائل التحقق. حاول لاحقًا.';
      case 'auth/invalid-verification-code': return 'رمز التحقق غير صحيح.';
      case 'auth/code-expired': return 'انتهت صلاحية الرمز. اطلب رمزًا جديدًا.';
      case 'auth/network-request-failed': return 'تعذر الاتصال بالشبكة. تحقق من الإنترنت.';
      default: return e?.message||'حدث خطأ في التحقق. حاول مرة أخرى.';
    }
  }
  async function phoneLogin(){
    if(busy)return;
    if(!accepted)return Alert.alert('الشروط','وافق على الشروط أولاً');
    if(!name.trim()||name.trim().length>35)return Alert.alert('الاسم','أدخل اسمًا من 1 إلى 35 حرفًا');
    const local=phone.replace(/\D/g,'').replace(/^0+/,'');
    if(local.length<7||local.length>15)return Alert.alert('الهاتف','أدخل رقم هاتف صحيح من 7 إلى 15 رقمًا');
    Keyboard.dismiss();
    setBusy(true);setAuthError('');
    try{const c=await auth().signInWithPhoneNumber(COUNTRIES[country][1]+local);setConfirmation(c);setSmsCode('');go('verify')}
    catch(e){const message=phoneAuthMessage(e);setAuthError(message);Alert.alert('تعذر إرسال SMS',message)}
    finally{setBusy(false)}
  }
  async function verifySms(){
    if(busy)return;
    if(!confirmation||!/^\d{6}$/.test(smsCode.trim()))return Alert.alert('رمز SMS','أدخل ستة أرقام');
    profileSetupRef.current=true;
    setBusy(true);setAuthError('');
    try{
      const credential=await confirmation.confirm(smsCode.trim());
      // A valid SMS code must not be reported as invalid if Firestore is unavailable.
      try{await saveProfile(credential.user,name.trim())}
      catch(e){console.warn('Profile save failed:',e.message);Alert.alert('تعذر حفظ الملف الشخصي','تم تسجيل الدخول بنجاح، لكن تعذر حفظ الاسم مؤقتًا. يمكنك المحاولة لاحقًا.');}
      setUser(credential.user);setConfirmation(null);go('home');
    }
    catch(e){const message=phoneAuthMessage(e);setAuthError(message);Alert.alert('فشل التحقق',message)}
    finally{profileSetupRef.current=false;setBusy(false)}
  }
  async function googleLogin(){
    if(busy)return;
    if(!accepted)return Alert.alert('الشروط','وافق على الشروط أولاً');
    if(!GOOGLE_WEB_CLIENT_ID)return Alert.alert('إعداد Google','أضف EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID في بيئة EAS، وفعّل Google في Firebase');
    setBusy(true);setAuthError('');
    try{
      if(Platform.OS==='android')await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
      const result=await GoogleSignin.signIn();
      if(result.type==='cancelled')return;
      const token=result.data?.idToken||result.idToken;
      if(!token)throw new Error('Google لم يرجع ID Token');
      const credential=auth.GoogleAuthProvider.credential(token);
      const signed=await auth().signInWithCredential(credential);
      try{await saveProfile(signed.user,signed.user.displayName||name.trim())}
      catch(profileError){console.warn('Google profile sync:',profileError.message)}
      setUser(signed.user);go('home');
    }catch(e){if(e?.code!=='SIGN_IN_CANCELLED'&&e?.code!=='12501'){
      const detail=e?.code==='10'?'تعذر التحقق من إعدادات Google لهذا الإصدار.':e?.message||'تعذر تسجيل الدخول باستخدام Google.';setAuthError(detail);Alert.alert('فشل تسجيل Google',detail)
    }}finally{setBusy(false)}
  }
  async function facebookLogin(){
    if(busy)return;
    if(!accepted)return Alert.alert('الشروط','وافق على الشروط أولاً');
    if(!FACEBOOK_CONFIGURED)return Alert.alert('إعداد Facebook','أكمل EXPO_PUBLIC_FACEBOOK_APP_ID وEXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN وإعداد مزود Facebook في Firebase قبل تسجيل الدخول');
    setBusy(true);setAuthError('');
    try{
      const {LoginManager,AccessToken,AuthenticationToken}=require('react-native-fbsdk-next');
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
      try{await saveProfile(signed.user,signed.user.displayName||name.trim())}
      catch(profileError){console.warn('Facebook profile sync:',profileError.message)}
      setUser(signed.user);go('home');
    }catch(e){if(e?.code!=='SIGN_IN_CANCELLED'&&e?.code!=='12501'){
      const detail=e?.message||'راجع Facebook App ID وإعداد Firebase';setAuthError(detail);Alert.alert('فشل تسجيل Facebook',detail)
    }}
    finally{setBusy(false)}
  }
  async function logout(){
    try{await auth().signOut();try{await GoogleSignin.signOut()}catch(_e){}if(FACEBOOK_CONFIGURED){try{require('react-native-fbsdk-next').LoginManager.logOut()}catch(_e){}}setOwnerDemo(false);setOwnerGranted(false);setBalance({welcome:WELCOME,purchased:0,owner:0});setPayoutDrafts([]);setSupportLog([]);setReceived(0);setSpent(0);go('login')}
    catch(e){Alert.alert('تعذر الخروج',e.message)}
  }
  function toggleOwnerDemo(){
    if(!__DEV__){Alert.alert('غير متاح','معاينة المالك متاحة في وضع التطوير فقط');return;}
    // Local developer preview only. This is NOT proof of account ownership or a funded wallet.
    if(!ownerGranted){setBalance({...walletRef.current,owner:OWNER_DEMO});setOwnerGranted(true)}
    setOwnerDemo(v=>!v);
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

  async function createRoom(){
    if(!user?.uid)return Alert.alert('الحساب','سجّل الدخول أولًا');
    const label=roomName.trim().slice(0,55);
    if(!label)return Alert.alert('اسم الغرفة','أدخل الاسم');
    setBusy(true);
    try{
      const host=(name||user.displayName||'مستخدم').slice(0,35);
      const data={name:label,type:roomType,ownerUid:user.uid,ownerName:host,createdAt:firestore.FieldValue.serverTimestamp(),status:'open'};
      const doc=await firestore().collection('rooms').add(data);
      enterRoom({id:doc.id,...data,host,owner:user.uid});
    }catch(e){Alert.alert('تعذر إنشاء الغرفة',e.message)}finally{setBusy(false)}
  }
  function enterRoom(room){
    if(room.status==='closed')return Alert.alert('غرفة مغلقة','هذه الغرفة مغلقة الآن');
    previousPage.current=['room','login','loading'].includes(pageRef.current)?'home':pageRef.current;setMini(false);
    setActiveRoom({...room,host:room.ownerName||room.host||'مضيف',owner:room.ownerUid||room.owner});go(previousPage.current);
  }
  function closeMyRoom(room){
    if(!user?.uid||room.ownerUid!==user.uid)return;
    Alert.alert('إغلاق الغرفة','سيُمنع إرسال رسائل جديدة إلى الغرفة بعد إغلاقها، وتبقى الرسائل السابقة محفوظة للإشراف. هل توافق؟',[
      {text:'إلغاء',style:'cancel'},
      {text:'إغلاق',style:'destructive',onPress:async()=>{
        try{await firestore().collection('rooms').doc(room.id).update({status:'closed'});
          if(MEDIA_CONFIGURED)void mediaRequest('/close-room',{roomId:room.id}).catch(()=>Alert.alert('تعذر إنهاء بث الغرفة على الخادم'));if(activeRoom?.id===room.id){setActiveRoom(null);go('rooms')}}
        catch(e){Alert.alert('تعذر الإغلاق',e.message)}
      }}]);
  }
  function buyGood(g){if(inventory.includes(g[1]))return Alert.alert('مملوكة');if(!spend(g[2]))return Alert.alert('رصيد غير كافٍ');setInventory(v=>[...v,g[1]])}
  function resetGame(){clearTimeout(timerRef.current);betsRef.current={};setBets({});setSeconds(30);setLit(-1);setGameResult(null);phaseRef.current='betting';setPhase('betting')}
  function placeBet(i){
    if(!__DEV__)return Alert.alert('غير متاح','اللعبة المالية غير مفعلة. المحاكاة للتطوير فقط.');
    if(phaseRef.current!=='betting')return;
    if(!betsRef.current[i]&&Object.keys(betsRef.current).length>=6)return Alert.alert('الحد الأقصى ست خانات');
    if(!spend(betAmount))return Alert.alert('رصيد غير كافٍ');
    const b={...betsRef.current,[i]:(betsRef.current[i]||0)+betAmount};betsRef.current=b;setBets(b);
  }
  function spin(){
    if(!__DEV__)return;
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
  function header(title,back=()=>go('home')){return <View style={S.header}><TouchableOpacity onPress={back}><Text style={S.white}>❮ رجوع</Text></TouchableOpacity><Text style={S.headerTitle}>{title}</Text><TouchableOpacity onPress={()=>go('wallet')}><Text style={S.gold}>{funded?'💎 '+fmt(funded.diamonds):'المحفظة'}</Text></TouchableOpacity></View>}
  function nav(){
    const items=[
      {id:'home',icon:'⌂',label:'الرئيسية'},
      {id:'rooms',icon:'◫',label:'الغرف'},
      {id:'create',icon:'+',label:'إنشاء'},
      {id:'store',icon:'◇',label:'المتجر'},
      {id:'profile',icon:'◎',label:'حسابي'}
    ];
    const current=page==='profileEdit'||page==='accountSettings'||page==='earningsWallet'?'profile':page;
    return <ClipiDock items={items} page={current} onNavigate={destination=>{
      if(destination==='home'||destination==='rooms'){setDiscoveryFilter('all');setRoomSearch('')}
      go(destination);
    }}/>;
  }
  function layout(title,children,back){return <View style={S.page}><StatusBar barStyle="light-content"/>{header(title,back)}<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={S.content}>{children}</ScrollView>{nav()}</View>}
  const visibleNumber=identity?.uid===user?.uid?identity:null;
  const myProfile=<View style={S.card}><AccountPhoto avatar={avatar} onPress={pickAccountPhoto} label={"اختيار صورة من الاستوديو"}/><Text style={S.title}>{name||user?.displayName||'مستخدم'} {ownerDemo?'👑':''}</Text><Text style={S.gold}>ID: {visibleNumber?.number||'…'}</Text>{SHOW_UNRELEASED_DEMOS&&<Text style={S.big}>💎 {fmt(total)}</Text>}<Text style={S.white}>{equipped.frame}</Text><Text style={S.white}>{equipped.ride}</Text>{SHOW_UNRELEASED_DEMOS&&<Text style={S.muted}>دعم تجريبي تم إرساله: {fmt(spent)} ماسة</Text>}</View>;

  function renderPage(){
  if(page==='diamondShop')return layout('شراء الماس',<DiamondShop uid={user.uid} isCurrentUser={uid=>auth().currentUser?.uid===uid} request={mediaRequest} endpoint={MEDIA_ENDPOINT} externalAllowed={Constants.expoConfig?.extra?.directCheckout===true&&(Platform.OS==='android'||(Platform.OS==='ios'&&Constants.expoConfig?.extra?.internalIosCheckout===true))}/>,()=>go('wallet'));
  if(page==='earningsWallet')return <EarningsWalletScreen onBack={()=>go('wallet')}/>;
  if(page==='loading')return <View style={[S.page,{justifyContent:'center',alignItems:'center'}]}><Text style={S.title}>Clipi · تحميل الحساب...</Text></View>;
  if(page==='login'||page==='verify')return <View style={{flex:1,backgroundColor:'#180e20'}}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={S.content}>
    <LoginCover image={require('./assets/clipi-icon.png')}/><View style={{backgroundColor:'#38243e',borderRadius:24,padding:18}}>
    {page==='verify'?<><Text style={S.label}>رمز التحقق SMS</Text><TextInput style={S.input} value={smsCode} onChangeText={setSmsCode} keyboardType="number-pad" maxLength={6} placeholder="ستة أرقام"/><Btn title={busy?'جارٍ التحقق...':'تأكيد الرمز'} disabled={busy} onPress={verifySms}/><Btn title="تغيير رقم الهاتف" color="#49306b" onPress={()=>go('login')}/></>:
    <>
      <Btn title={loginMethod==='email'?'استخدام رقم الهاتف':'استخدام البريد الإلكتروني'} color="#49306b" disabled={busy}
        onPress={()=>{setLoginMethod(loginMethod==='email'?'phone':'email');setPassword('');setAuthError('');}}/>
      {loginMethod==='email'?<>
        <Text style={S.label}>{emailMode==='signup'?'إنشاء حساب بالبريد':emailMode==='reset'?'استعادة كلمة المرور':'الدخول بالبريد الإلكتروني'}</Text>
        {emailMode==='signup'&&<TextInput style={S.input} value={name} onChangeText={setName} placeholder="اسم المستخدم" maxLength={35} editable={!busy}/>}
        <TextInput style={S.input} value={email} onChangeText={setEmail} placeholder="البريد الإلكتروني"
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!busy}/>
        {emailMode!=='reset'&&<TextInput style={S.input} value={password} onChangeText={setPassword}
          placeholder="كلمة المرور" secureTextEntry autoCapitalize="none" autoCorrect={false}
          autoComplete={emailMode==='signup'?'new-password':'current-password'} editable={!busy}/>}
      </>:<><Text style={S.label}>الاسم</Text><TextInput style={S.input} value={name} onChangeText={setName} placeholder="اسم المستخدم"/><Text style={S.label}>الدولة</Text><Btn title={COUNTRIES[country].join(' ')} color="#49306b" onPress={()=>setCountriesOpen(v=>!v)}/>{countriesOpen&&COUNTRIES.map((c,i)=><Btn key={i} title={c.join(' ')} color="#382050" onPress={()=>{setCountry(i);setCountriesOpen(false)}}/>)}<Text style={S.label}>الهاتف</Text><TextInput style={S.input} value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" keyboardType="phone-pad"/></>}
      <Btn title={accepted?'☑ أوافق على الشروط':'☐ أوافق على الشروط'} color="#49306b" onPress={()=>setAccepted(v=>!v)}/><View style={S.row}><Small title="شروط الخدمة" onPress={()=>setPolicy('terms')}/><Small title="سياسة الخصوصية" onPress={()=>setPolicy('privacy')}/></View>
      {loginMethod==='email'?<>
        <Btn title={busy?'جارٍ العمل...':emailMode==='signup'?'إنشاء الحساب':emailMode==='reset'?'إرسال رابط الاستعادة':'تسجيل الدخول بالبريد'} disabled={busy} onPress={emailLogin}/>
        <Btn title={emailMode==='login'?'إنشاء حساب جديد':'العودة إلى تسجيل الدخول'} color="#49306b" disabled={busy}
          onPress={()=>{setEmailMode(emailMode==='login'?'signup':'login');setPassword('');setAuthError('');}}/>
        {emailMode==='login'&&<Btn title="نسيت كلمة المرور" color="#49306b" disabled={busy}
          onPress={()=>{setEmailMode('reset');setPassword('');setAuthError('');}}/>}
      </>:<Btn title={busy?'جارٍ العمل...':'📱 تسجيل بالهاتف (SMS)'} disabled={busy} onPress={phoneLogin}/>}
      <Btn title={GOOGLE_WEB_CLIENT_ID?"🌐 متابعة باستخدام Google":"🌐 Google · يحتاج إعدادًا"} color={ORANGE} disabled={busy||!GOOGLE_WEB_CLIENT_ID} onPress={googleLogin}/><Btn title={FACEBOOK_CONFIGURED?"📘 متابعة باستخدام Facebook":"📘 Facebook · يحتاج إعدادًا"} color={ORANGE} disabled={busy||!FACEBOOK_CONFIGURED} onPress={facebookLogin}/>
      {authError?<Text style={{color:'#ffa6a6'}}>{authError}</Text>:null}
    </>}
  </View></ScrollView></View>;
  if(page==='home'||page==='rooms'){
    const query=roomSearch.trim().toLowerCase();
    const visibleRooms=rooms.filter(r=>r.status==='open'&&!blockedUsers.includes(r.ownerUid)
      &&(discoveryFilter==='all'||(r.type==='video'?'video':'audio')===discoveryFilter)
      &&(!query||r.name?.toLowerCase().includes(query)||r.id.toLowerCase().includes(query)));
    const copy={
      all:'الكل',voice:'غرفة صوتية',live:'بث مباشر',create:'إنشاء غرفة',
      createNote:'ابدأ غرفة صوتية أو بث فيديو',search:'ابحث بالاسم أو معرّف الغرفة',
      empty:'لا توجد غرف مطابقة',close:'إغلاق غرفتي',untitled:'الغرفة',
      welcome:'🎁 هدية ترحيبية',welcomeNote:'💎 ١٠٠ ماسة · 👑 إطار ملكي فاخر · 🏎️ سيارة فاخرة'
    };
    return <HubScreen title={page==='home'?'Clipi':'الغرف'} action={page==='home'?{label:'استعراض الغرف',onPress:()=>go('rooms')}:null} dock={nav()}>
      <RoomDiscovery copy={copy} userId={user?.uid} rooms={page==='home'&&!query?visibleRooms.slice(0,6):visibleRooms} error={roomError}
        filter={discoveryFilter} onFilter={setDiscoveryFilter} search={roomSearch} onSearch={setRoomSearch}
        onCreate={()=>go('create')} onEnter={enterRoom} onClose={closeMyRoom} showWelcome={page==='home'}/>
    </HubScreen>;
  }
  if(page==='create')return <RoomStudio name={roomName} setName={setRoomName} kind={roomType} setKind={setRoomType} onStart={createRoom} onClose={()=>go('home')} busy={busy} copy={{close:"رجوع",title:"إنشاء غرفة",name:"اسم الغرفة",mode:"نوع الغرفة",audio:"🎙 صوت",video:"📹 فيديو",start:"فتح الغرفة",note:"الغرفة عامة للمستخدمين المسجلين."}}/>;
  if(page==='wallet')return layout('محفظة كليبي',<>
    <BalanceCard icon="💎" tone="sky" label="الماس المشترى" value={funded?fmt(funded.diamonds):'…'} action="شراء الماس" onPress={()=>go('diamondShop')}/>
    <BalanceCard icon="♡" tone="rose" label="هدف ماس الهدايا" value={(funded?fmt(funded.progress):'…')+' / 10,000 💎'}/>
    <BalanceCard icon="✦" tone="sand" label="مكافآت المضيف" value={(funded?fmt(funded.rewardPi):'…')+' PI'}/>
    <Text style={S.white}>كل 10,000 ماسة تصل إليك من الهدايا تُسجّل لك مكافأة 5 PI داخل كليبي.</Text>
    <Text style={S.white}>إجمالي ماس الهدايا المستلم · {funded?fmt(funded.receivedDiamonds):'…'} 💎</Text>
    {giftWalletError&&<Text accessibilityLiveRegion="polite" style={S.white}>{giftWalletError}</Text>}
    <Small title="تحديث الرصيد" onPress={()=>setWalletRequest(v=>v+1)}/>
    <BalanceCard icon="↗" tone="mint" label="محفظة الأرباح" value="النقاط والسحب النقدي" action="سحب الأرباح" onPress={()=>go('earningsWallet')}/>
    {funded?.history.map((gift,i)=><Text key={i} style={S.white}>{gift.host===user.uid?'واردة':'مرسلة'} · {gift.gift} · {fmt(gift.cost)} 💎</Text>)}
  </>);
  if(page==='earnings')return layout('أرباح المضيف',<><Btn title="💼 فتح محفظة النقاط" onPress={()=>go('earningsWallet')}/>
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

  if(page==='store')return <HubScreen title={"المتجر"} action={{label:"رجوع",onPress:()=>go('profile')}} dock={nav()}>
    <ClipiCollection copy={{store:"المتجر",frame:"إطارات",ride:"مؤثرات الدخول",numbers:"أرقام مميزة",owned:"مقتنياتي",buy:"شراء",equip:"تفعيل",remove:"إزالة",retry:"إعادة تحميل الأرقام",translate:x=>x}}
      goods={GOODS} identity={visibleNumber} inventory={inventory} equipped={equipped} error={numberError}
      onNumber={numberAction} onBuy={buyGood} onEquip={g=>setEquipped(v=>({...v,[g[3]]:v[g[3]]===g[1]?'':g[1]}))}/>
  </HubScreen>;
  if(page==='gifts')return layout('الهدايا',<><Text style={S.muted}>الهدايا تُرسل من داخل غرفة صوت أو فيديو</Text><View style={S.giftGrid}>{GIFTS.map((g,i)=><View key={i} style={S.giftTile}><Text style={{fontSize:22}}>{g[0]}</Text><Text style={S.giftName}>{g[1]}</Text><Text style={S.giftCost}>{g[2]} 💎</Text></View>)}</View><Btn title="استعراض الغرف" onPress={()=>go('rooms')}/></>);
  if(page==='profile')return <HubScreen title={'حسابي'}
    action={{label:'الإعدادات',onPress:()=>go('accountSettings')}} dock={nav()}>
    <AccountHub onPhoto={pickAccountPhoto} photoLabel={"اختيار صورة من الاستوديو"} name={name||user?.displayName||'مستخدم'} avatar={avatar} number={visibleNumber?.number}
      balance={funded?.diamonds} copy={{balance:'الماس المشترى',photo:'الصورة الشخصية'}}
      shortcuts={[
        {icon:'💎',label:'شراء الماس',onPress:()=>go('diamondShop')},
        {icon:'◇',label:'المحفظة',onPress:()=>go('wallet')},
        {icon:'#',label:'المتجر',onPress:()=>go('store')},
        {icon:'↗',label:'الأرباح',onPress:()=>go('earningsWallet')},

        {icon:'♫',label:"الغرف",onPress:()=>go('rooms')},
        {icon:'✦',label:"مركز المضيف",onPress:()=>go('hostCenter')},
      ]}
      settings={[
        {label:'تعديل الملف الشخصي',onPress:()=>go('profileEdit')},
        {label:'الإعدادات',onPress:()=>go('accountSettings')},
      ]}/>
  </HubScreen>;
  if(page==='hostCenter')return <HubScreen title={"مركز المضيف"} action={{label:"رجوع",onPress:()=>go('profile')}} dock={nav()}>
    <AccountHub onPhoto={pickAccountPhoto} photoLabel={"اختيار صورة من الاستوديو"} name={name||user?.displayName||"مستخدم"} avatar={avatar} number={visibleNumber?.number}
      balance={rooms.filter(r=>r.status==='open'&&r.ownerUid===user?.uid).length} copy={{balance:"غرفي المفتوحة",photo:"الصورة الشخصية"}} unit="♫"
      shortcuts={[{icon:'＋',label:"إنشاء غرفة",onPress:()=>go('create')},{icon:'◇',label:"المحفظة",onPress:()=>go('wallet')}]}
      settings={[{label:"استعراض الغرف",onPress:()=>go('rooms')},{label:"الإعدادات",onPress:()=>go('accountSettings')}]}/>
  </HubScreen>;
  if(page==='accountSettings'){
    return <HubScreen title={'الإعدادات'} action={{label:'رجوع',onPress:()=>go('profile')}} dock={nav()}>

      <HubRows items={[
        {label:'الملف الشخصي والحسابات المحظورة',onPress:()=>go('profileEdit')},
        {label:'سياسة الخصوصية',onPress:()=>setPolicy('privacy')},
        {label:'شروط الخدمة',onPress:()=>setPolicy('terms')},
        {label:'مشاركة Clipi',onPress:()=>Share.share({message:MEDIA_ENDPOINT+'/'}).catch(()=>Alert.alert('تعذرت المشاركة'))},
        ...(SHOW_UNRELEASED_DEMOS?[
          {label:'الألعاب',onPress:()=>go('games')},
          {label:'الهدايا',onPress:()=>go('gifts')},
          {label:'أرباح المضيف',onPress:()=>go('earnings')}
        ]:[]),
        {label:'تسجيل الخروج',destructive:true,onPress:logout},
      ]}/>
    </HubScreen>;
  }
  if(page==='profileEdit')return layout('الملف الشخصي',<>{myProfile}<Btn color={ORANGE} title="💼 محفظة النقاط والأرباح" onPress={()=>go('earningsWallet')}/><Text style={S.label}>الاسم</Text><TextInput style={S.input} value={name} onChangeText={setName}/><Text style={S.label}>الصورة الرمزية</Text><View style={S.giftGrid}>{AVATARS.map(a=><TouchableOpacity key={a} style={S.avatarChoice} onPress={()=>{if(!pickingPhoto.current){selectedEmoji.current=a;setAvatar(a)}}}><Text style={{fontSize:29}}>{a}</Text></TouchableOpacity>)}</View><Btn title="حفظ الاسم والصورة" onPress={async()=>{try{if(!name.trim())throw Error('أدخل الاسم');await saveProfile(user,name.trim(),true);Alert.alert('تم الحفظ')}catch(e){Alert.alert('خطأ',e.message)}}}/>{__DEV__&&<View style={S.panel}><Text style={S.title}>👑 معاينة المالك فقط</Text><Text style={S.muted}>زر غير محمي ويجب إزالته قبل النشر. لا يجوز منح رصيد مالي من التطبيق.</Text><Btn title={ownerDemo?'إيقاف معاينة المالك':'تفعيل 100,000,000 تجريبية'} color="#946e2c" onPress={toggleOwnerDemo}/></View>}<View style={S.panel}><Text style={S.title}>🚫 الحسابات المحظورة ({blockedUsers.length})</Text>{blockedUsers.length===0?<Text style={S.muted}>لا توجد حسابات محظورة</Text>:blockedUsers.map(uid=><View key={uid} style={{marginBottom:9}}><Text style={S.muted}>المستخدم: {uid.slice(0,14)}...</Text><Btn title="إلغاء الحظر" color="#7040a7" onPress={()=>unblockUser(uid)}/></View>)}</View><Text style={S.muted}>حذف الحساب في هذه النسخة غير شامل للمحادثات والبلاغات القديمة، ويجب تشغيل خدمة حذف بيانات كاملة قبل إطلاق التطبيق للعامة.</Text><Btn title="حذف حسابي" color="#96334f" onPress={deleteAccount}/><Btn title="تسجيل الخروج" color="#555" onPress={logout}/></>,()=>go('profile'));
  if(page==='games')return layout('الألعاب',<View style={S.card}><Text style={S.title}>🎰 Greedy Star</Text><Text style={S.muted}>الماسات والنتائج هنا تجريبية</Text><Btn title="العب الآن" onPress={()=>{resetGame();go('game')}}/></View>);
  if(page==='game')return <View style={S.starPage}>
    <StatusBar barStyle="light-content"/>
    <View style={S.starTopBar}><WindowControl icon="×" label={"إغلاق"} onPress={leaveGame}/><Small title="شراء الماس" onPress={()=>go('diamondShop')}/><Text style={S.starRules} onPress={()=>Alert.alert('قواعد اللعبة','محاكاة للتطوير فقط. ثماني خانات، ويمكن اختيار ست خانات كحد أقصى. لا توجد أموال أو جوائز قابلة للسحب.')}>📜 قاعدة</Text><View style={S.starBrand}><Text style={S.starBrandText}>Greedy Star</Text></View><Text style={S.starRound}>جولة تجريبية</Text></View>
    <ScrollView contentContainerStyle={S.starScroll}>
      <View style={S.starWheel}>
        <View style={S.starWheelRing}/>
        {FOOD.map((f,i)=>{const angle=(i*45-90)*Math.PI/180;return <TouchableOpacity key={i} disabled={phase!=='betting'} onPress={()=>placeBet(i)} style={[S.starFood,{left:124+Math.cos(angle)*107-39,top:124+Math.sin(angle)*107-39},lit===i&&S.starFoodLit]}>
          <Text style={S.starFoodEmoji}>{f[0]}</Text>
          <Text style={S.starFoodLabel}>{f[2]} أضعاف</Text>
          {bets[i]?<Text style={S.starStake}>{bets[i]} 💎</Text>:null}
        </TouchableOpacity>})}
        <View style={S.starCenter}><Text style={S.starCenterTop}>{phase==='betting'?'حدد الوقت':phase==='spinning'?'تدور العجلة':'النتيجة'}</Text><Text style={S.starCenterTime}>{phase==='betting'?seconds+'S':phase==='spinning'?'⭐':gameResult?gameResult.item[0]:'★'}</Text></View>
      </View>
      <View style={S.starBanner}><Text style={S.starBannerText}>{gameResult?'🎉 '+gameResult.item[1]+' · '+fmt(gameResult.prize)+' 💎 تجريبي':'اختر مقدار الماسة، ثم اضغط على الطعام'}</Text></View>
      <View style={S.starBetTray}>{[10000,1000,500,100,10].map(n=><TouchableOpacity key={n} onPress={()=>setBetAmount(n)} style={[S.starBetChip,betAmount===n&&S.starBetActive]}><Text style={S.starBetText}>{n} 💎</Text></TouchableOpacity>)}</View>
      <View style={S.starInfoRow}><View style={S.starInfoPill}><Text style={S.starInfoText}>الماس المتبقي</Text><Text style={S.starInfoValue}>{fmt(total)}</Text></View><TouchableOpacity style={S.starInfoPill} onPress={()=>Alert.alert('السجل',history.length?history.map(h=>h.item[0]+' '+h.item[1]+' — '+h.prize+' 💎').join('\n'):'لا توجد جولات بعد')}><Text style={S.starInfoText}>سجلاتي</Text><Text style={S.starInfoValue}>📜</Text></TouchableOpacity><View style={[S.starInfoPill,{backgroundColor:'#0ba66c'}]}><Text style={S.starInfoText}>مجموع الجولة</Text><Text style={S.starInfoValue}>{fmt(Object.values(bets).reduce((x,y)=>x+y,0))}</Text></View></View>
      <View style={S.starBottomStrip}>{FOOD.map((f,i)=><TouchableOpacity key={i} disabled={phase!=='betting'} onPress={()=>placeBet(i)} style={S.starMiniFood}><Text style={{fontSize:19}}>{f[0]}</Text></TouchableOpacity>)}</View>
      <Btn title={phase==='betting'?'ابدأ الجولة التجريبية':phase==='result'?'جولة جديدة':'العجلة تدور...'} color="#0c9b69" disabled={phase==='spinning'} onPress={phase==='result'?resetGame:spin}/>
      <Text style={S.starDisclaimer}>نسخة تصميمية مستوحاة من الصورة المرجعية · محاكاة تطويرية فقط، بلا رهانات أو جوائز نقدية.</Text>
    </ScrollView>
  </View>;
  return <View style={S.page}><Btn title="الرئيسية" onPress={()=>go('home')}/></View>;
  }
  return <View style={{flex:1}}>{renderPage()}
    <PolicyModal page={policy} endpoint={MEDIA_ENDPOINT} onClose={()=>setPolicy(null)}/>
    {activeRoom?.id&&user?.uid&&<View style={mini?{position:'absolute',width:1,height:1,overflow:'hidden',opacity:0,pointerEvents:'none'}:StyleSheet.absoluteFillObject}><RoomFailureBoundary key={activeRoom.id} label="الغرفة" onExit={()=>{setActiveRoom(null);setMini(false)}}><Room key={activeRoom.id} room={activeRoom} userId={user.uid} username={name||'مستخدم'} avatar={avatar} equipped={equipped} diamonds={available} onShop={()=>{setMini(true);go('diamondShop')}} onWallet={()=>{setMini(true);go('wallet')}} onBet={spend}
      onCredit={prize=>{if(auth().currentUser?.uid===user.uid)setBalance({...walletRef.current,welcome:walletRef.current.welcome+prize});}} minimized={mini} onRestore={()=>setMini(false)} onMinimize={()=>setMini(true)} onExit={()=>{setActiveRoom(null);setMini(false)}}/></RoomFailureBoundary></View>}
    {mini&&activeRoom&&<WindowControl label={"تكبير الغرفة"} icon="⤢" style={{position:"absolute",right:12,bottom:72}} onPress={()=>setMini(false)}/>}
  </View>;
}

const S=StyleSheet.create({
  gameOverlay:{flex:1,justifyContent:'flex-end',backgroundColor:'#07051444'},
  gameSheet:{backgroundColor:'#201334',borderTopLeftRadius:26,borderTopRightRadius:26,borderWidth:1,borderColor:'#65498d',paddingHorizontal:12,paddingBottom:Platform.OS==='ios'?22:8},
  sheetHandle:{alignSelf:'center',width:34,height:4,borderRadius:3,backgroundColor:'#a58fbc',marginVertical:5},
  gameBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  gameHeading:{flex:1,alignItems:'center'},gameTitle:{color:'#fff',fontSize:17,fontWeight:'900'},
  gameMeta:{color:'#ded2ee',fontSize:12,textAlign:'center'},gameBalance:{color:'#ffe0a0',fontWeight:'900',fontSize:13},
  gameScroller:{flex:1},gameWheelContent:{alignItems:'center',paddingVertical:4},
  gameFood:{fontSize:19},gameClock:{fontSize:21,color:'#fff',fontWeight:'900'},
  gamePointer:{position:'absolute',width:20,textAlign:'center',color:'#fff3a9',fontSize:19,fontWeight:'900'},
  gameHistory:{color:'#d8bbfa',fontSize:11,marginVertical:1},gameFooter:{gap:5,paddingTop:4,borderTopWidth:1,borderTopColor:'#503666'},
  gameAmounts:{flexDirection:'row',gap:5},gameAmount:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#41285b',height:34,paddingHorizontal:3},
  gameAmountSelected:{backgroundColor:'#7d45b0',borderWidth:1,borderColor:'#d9adff'},gameAmountText:{color:'#fff',fontSize:13,fontWeight:'800'},
  hostSeat:{alignSelf:'stretch',width:'100%',alignItems:'center',paddingVertical:5},
  hostCrown:{width:72,height:72,borderWidth:2,borderColor:'#ffe2a4',borderRadius:36,backgroundColor:'#745292',alignItems:'center',justifyContent:'center'},
  hostCrownText:{fontSize:29,color:'#ffe2a4'},hostSeatName:{fontWeight:'900',color:'#fff',marginTop:2,fontSize:14},hostSeatRole:{color:'#ffe2a4',fontSize:11},
  roomTop:{paddingHorizontal:10,paddingTop:8,paddingBottom:5,backgroundColor:'transparent'},
  roomTopRow:{flexDirection:'row',alignItems:'center',gap:8},roomIdentity:{flex:1,alignItems:'center'},roomName:{fontSize:17,fontWeight:'900',color:'#fff'},roomType:{color:'#dac7ef',fontSize:11},
  compact:{alignSelf:"center",maxWidth:"100%",paddingVertical:8,paddingHorizontal:13,borderRadius:12},
  orangeInk:{color:"#32180b",textAlign:"center"},
  roomMenuTrigger:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'transparent'},
  roomControlGlyph:{fontSize:23,color:'white',fontWeight:'800',textShadowColor:'#100b18',textShadowOffset:{width:0,height:1},textShadowRadius:4},
  roomMenuDots:{color:'white',fontSize:30,fontWeight:'700'},
  roomMenuOverlay:{flex:1,alignItems:'flex-end',paddingHorizontal:10,paddingTop:12,backgroundColor:'rgba(0,0,0,.55)'},
  roomMenuPanel:{width:'92%',maxWidth:360,maxHeight:'85%',backgroundColor:'#183530',padding:14,borderRadius:18},
  roomMenuItems:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",gap:8,paddingBottom:8},
  roomBottom:{backgroundColor:'transparent',paddingHorizontal:7,paddingTop:6,paddingBottom:Platform.OS==='ios'?16:9},
  micPopover:{position:'absolute',width:156,padding:6,borderWidth:1,borderColor:'#a78955',borderRadius:14,backgroundColor:'#21172e',elevation:12},
  micPopoverTitle:{color:GOLD,textAlign:'center',fontSize:13,padding:6},
  micPopoverAction:{minHeight:40,justifyContent:'center',alignItems:'center',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#604b65'},
  joinButton:{minWidth:40,height:38,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'#bfa16d',borderRadius:18,marginLeft:4,backgroundColor:'#241b33cc'},
  roomDock:{flexDirection:'row',alignItems:'center',gap:4},
  roomComment:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',paddingEnd:3},
  roomSeatAction:{alignSelf:'flex-end',marginBottom:5},
  roomThemeShade:{...StyleSheet.absoluteFillObject,backgroundColor:'#071f2460'},

  homeHero:{backgroundColor:'#342158',borderWidth:1,borderColor:'#76559d',borderRadius:23,padding:20,alignItems:'flex-end',marginBottom:10},
  homeBrand:{color:'#ffe2a4',fontSize:13,fontWeight:'900',letterSpacing:2},homeTitle:{fontSize:27,color:'#fff',fontWeight:'900',marginVertical:5},homeSubtitle:{color:'#ded0f0',fontSize:14},
  navItem:{minWidth:64,minHeight:46,justifyContent:'center',alignItems:'center',borderRadius:13,paddingHorizontal:8},navActive:{backgroundColor:'#57377a'},
  navIcon:{fontSize:20},navLabel:{fontSize:11,color:'#efe3ff',fontWeight:'700'},

  starPage:{flex:1,backgroundColor:'#ffbd66'},starTopBar:{backgroundColor:'#f9a64a',paddingTop:Platform.OS==='ios'?45:12,paddingBottom:9,paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},starRules:{color:'#8b4d0c',fontWeight:'900',fontSize:12,backgroundColor:'#ffe093',padding:6,borderRadius:14},starBrand:{backgroundColor:'#14a66b',borderRadius:7,borderWidth:2,borderColor:'#f5ef8e',paddingHorizontal:9,paddingVertical:5},starBrandText:{color:'white',fontWeight:'900',fontSize:19},starRound:{color:'#9a4c12',fontSize:10,fontWeight:'800'},starScroll:{paddingHorizontal:10,paddingBottom:32,alignItems:'stretch'},starWheel:{width:326,height:326,alignSelf:'center',marginTop:7,marginBottom:3,position:'relative'},starWheelRing:{position:'absolute',width:244,height:244,left:41,top:41,borderRadius:122,borderWidth:15,borderColor:'#f28c22',backgroundColor:'#eaa14e',shadowColor:'#a8470c',shadowOpacity:.5,shadowRadius:10,elevation:7},starFood:{position:'absolute',width:78,height:78,borderRadius:39,backgroundColor:'#f99a35',borderWidth:4,borderColor:'#ffdf70',alignItems:'center',justifyContent:'center',elevation:4},starFoodLit:{backgroundColor:'#e8f38e',borderColor:'#1cc46a',borderWidth:5},starFoodEmoji:{fontSize:28},starFoodLabel:{color:'#a4480e',fontWeight:'900',fontSize:10},starStake:{color:'#7b290b',fontSize:9,fontWeight:'900'},starCenter:{position:'absolute',top:114,left:114,width:98,height:98,borderRadius:49,backgroundColor:'#02ad70',borderWidth:7,borderColor:'#ffda49',alignItems:'center',justifyContent:'center',elevation:9},starCenterTop:{fontSize:11,color:'white',fontWeight:'900'},starCenterTime:{fontSize:29,color:'#fff64c',fontWeight:'900'},starBanner:{backgroundColor:'#0ca66b',borderWidth:3,borderColor:'#ffdf7a',borderRadius:7,padding:7,marginTop:3},starBannerText:{color:'white',fontWeight:'900',textAlign:'center',fontSize:13},starBetTray:{flexDirection:'row',justifyContent:'space-between',backgroundColor:'#b65b1c',padding:6,borderRadius:12,marginTop:7,borderWidth:3,borderColor:'#ffe49c'},starBetChip:{backgroundColor:'#fff6df',borderRadius:8,paddingVertical:10,paddingHorizontal:4,minWidth:'18%',alignItems:'center',borderWidth:2,borderColor:'#f5b75a'},starBetActive:{backgroundColor:'#ffe15c',borderColor:'#00aa72'},starBetText:{fontSize:11,fontWeight:'900',color:'#8a4a1b'},starInfoRow:{flexDirection:'row',gap:5,marginTop:9},starInfoPill:{flex:1,backgroundColor:'#e88c25',borderRadius:24,borderWidth:2,borderColor:'#fff0a2',alignItems:'center',justifyContent:'center',paddingVertical:7},starInfoText:{fontSize:10,color:'white',fontWeight:'800'},starInfoValue:{fontSize:14,color:'white',fontWeight:'900'},starBottomStrip:{flexDirection:'row',justifyContent:'space-around',marginTop:10,marginBottom:8,backgroundColor:'#d16e25',borderRadius:16,paddingVertical:7},starMiniFood:{width:30,height:30,borderRadius:15,backgroundColor:'#fff5d6',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#f6c45b'},starDisclaimer:{color:'#7d3b0d',fontSize:11,textAlign:'center',marginTop:8,fontWeight:'700'},

  choiceWrap:{flexDirection:'row',flexWrap:'wrap',marginVertical:5},choice:{paddingHorizontal:10,paddingVertical:10,borderRadius:12,backgroundColor:'#32245b',margin:3,borderWidth:1,borderColor:'#4e4770'},choiceActive:{backgroundColor:'#7c2866',borderColor:GOLD},
  page:{flex:1,backgroundColor:'#190e20'},gamePage:{flex:1,backgroundColor:'#7d391d'},content:{padding:16,paddingBottom:40},white:{color:'white',fontWeight:'700'},gold:{color:GOLD,fontWeight:'900'},muted:{color:'#c5bdd3',marginVertical:8,lineHeight:19},title:{color:'white',fontSize:19,fontWeight:'900',marginVertical:10},label:{color:'white',fontWeight:'800',marginTop:13,marginBottom:6},logo:{color:'white',fontSize:52,fontWeight:'900',textAlign:'center',marginTop:46},big:{color:GOLD,fontSize:28,fontWeight:'900',marginVertical:9},input:{backgroundColor:'white',color:'#111',padding:13,borderRadius:12,marginVertical:5},btn:{padding:13,borderRadius:12,alignItems:'center',marginVertical:6,minWidth:82},small:{paddingVertical:8,paddingHorizontal:10,borderRadius:10,marginHorizontal:3,alignItems:'center',justifyContent:'center'},header:{paddingTop:48,paddingBottom:15,paddingHorizontal:12,backgroundColor:'#312035',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},headerTitle:{color:'white',fontWeight:'900',fontSize:17},nav:{backgroundColor:'#260d45',flexDirection:'row',justifyContent:'space-around',paddingVertical:15},banner:{backgroundColor:PINK,padding:19,borderRadius:16,marginBottom:12},card:{backgroundColor:'#322037',padding:18,borderRadius:16,alignItems:'center',marginVertical:9},panel:{backgroundColor:'#39233d',padding:14,borderRadius:13,marginVertical:9},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',flexWrap:'wrap'},shop:{backgroundColor:'#39233d',padding:12,borderRadius:12,marginBottom:8,flexDirection:'row',alignItems:'center'},avatarChoice:{backgroundColor:'#322037',padding:10,margin:5,borderRadius:10},hostSettingsShade:{flex:1,backgroundColor:'rgba(0,0,0,.65)',justifyContent:'flex-end'},hostSettingsPanel:{backgroundColor:'#2a1b43',padding:18,paddingBottom:34,borderTopLeftRadius:24,borderTopRightRadius:24},hostSettingsHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},room:{flex:1},miniRoom:{flex:1,backgroundColor:'#291d43',justifyContent:'center',padding:25,gap:18},audioBackdrop:{...StyleSheet.absoluteFillObject,overflow:'hidden'},blueGlow:{position:'absolute',top:-150,left:-180,width:500,height:500,borderRadius:250,backgroundColor:'#7951ae',opacity:.46},royalGlow:{position:'absolute',bottom:-100,right:-170,width:460,height:460,borderRadius:230,backgroundColor:'#d0a34f',opacity:.22},bgOrnament:{position:'absolute',top:'48%',alignSelf:'center',fontSize:45,color:'#d6b66a',opacity:.16},bgCrown:{position:'absolute',top:'35%',alignSelf:'center',fontSize:155,color:'white',opacity:.08},videoBlank:{...StyleSheet.absoluteFillObject,backgroundColor:'#142246',alignItems:'center',justifyContent:'center',padding:20},liveHeader:{paddingTop:49,paddingBottom:9,paddingHorizontal:11,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(0,17,48,.65)'},tiny:{color:'#d2e1fa',fontSize:10,textAlign:'center',fontWeight:'600'},liveTag:{backgroundColor:PINK,borderRadius:17,padding:9},avatars:{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:8,backgroundColor:'rgba(0,18,47,.35)'},guestAvatar:{width:59,height:58,borderRadius:13,borderWidth:1,borderColor:GOLD,backgroundColor:'rgba(4,27,70,.85)',marginRight:8,alignItems:'center',justifyContent:'center'},videoControls:{flexDirection:'row',justifyContent:'center',marginTop:8},pip:{position:'absolute',bottom:205,right:12,width:142,borderRadius:13,borderWidth:2,borderColor:GOLD,backgroundColor:'#24375d',padding:5,alignItems:'center',zIndex:8},pipPreview:{height:112,width:'100%',backgroundColor:'#364d77',borderRadius:8,alignItems:'center',justifyContent:'center'},callPanel:{position:'absolute',top:175,left:12,right:12,backgroundColor:'#11264b',borderWidth:1,borderColor:GOLD,padding:15,borderRadius:15,alignItems:'center',zIndex:20},seatHeading:{color:GOLD,fontSize:18,fontWeight:'900',textAlign:'center',marginTop:20,marginBottom:18},seatGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',paddingHorizontal:12},seatItem:{width:'24%',alignItems:'center',marginBottom:12},throne:{width:52,height:52,borderWidth:1,borderColor:'#f3d39290',borderRadius:26,backgroundColor:'#ffffff35',alignItems:'center',justifyContent:'center',shadowColor:'#e5c080',shadowOpacity:.55,shadowRadius:13,elevation:7},throneCrown:{position:'absolute',top:-19,fontSize:25,color:GOLD},seatGem:{position:'absolute',bottom:-10,fontSize:14,color:'#fce7b6'},seatRequest:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',backgroundColor:'#16396c',padding:8,marginHorizontal:12,marginBottom:5,borderRadius:12},actions:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:9,marginBottom:5},chat:{maxHeight:125,minHeight:45,marginHorizontal:9,marginBottom:5},bubble:{backgroundColor:'rgba(0,20,56,.82)',borderRadius:10,padding:8,alignSelf:'flex-start',marginTop:4},composer:{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingTop:8,paddingBottom:Platform.OS==='ios'?20:10,backgroundColor:'rgba(0,18,51,.94)'},composerGift:{width:43,height:43,borderRadius:22,backgroundColor:'#235398',alignItems:'center',justifyContent:'center',marginRight:7},messageInput:{flex:1,minWidth:0,height:42,borderRadius:16,backgroundColor:'#1b3d78',color:'white',paddingHorizontal:14,textAlign:'right'},sendButton:{width:34,height:39,borderRadius:12,backgroundColor:'#23765e',justifyContent:'center',alignItems:'center',marginLeft:7},giftDrawer:{position:'absolute',bottom:Platform.OS==='ios'?78:63,left:8,right:8,height:260,padding:9,borderRadius:18,borderWidth:1,borderColor:'#578ad7',backgroundColor:'#0d265c',zIndex:25,elevation:15},drawerHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:9},giftGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',paddingBottom:10},giftTile:{width:'19%',height:72,marginBottom:7,borderRadius:9,backgroundColor:'#21498d',alignItems:'center',justifyContent:'center',padding:2},giftName:{color:'white',fontSize:9,fontWeight:'800',textAlign:'center'},giftCost:{color:GOLD,fontSize:9},fxOverlay:{...StyleSheet.absoluteFillObject,zIndex:100,elevation:100,alignItems:'center',justifyContent:'center'},fxCenter:{alignItems:'center',justifyContent:'center'},fxIcon:{fontSize:112,textAlign:'center'},fxSpark:{color:GOLD,fontSize:28,textAlign:'center',textShadowColor:'#fff5bb',textShadowRadius:10},fxFire:{fontSize:75,textAlign:'center'},wheel:{width:296,height:296,borderRadius:148,borderWidth:8,borderColor:GOLD,backgroundColor:'#b16a29',alignSelf:'center',marginVertical:24,position:'relative'},slot:{position:'absolute',width:64,height:64,borderRadius:32,backgroundColor:'#ffc970',borderWidth:2,borderColor:'white',alignItems:'center',justifyContent:'center'},slotLit:{backgroundColor:'#78ed8e',borderColor:'#00f74e',borderWidth:4},slotLabel:{fontSize:10,color:'#51240c',fontWeight:'900'},wheelMiddle:{position:'absolute',left:99,top:99,width:82,height:82,borderRadius:41,backgroundColor:'#079e52',borderWidth:4,borderColor:GOLD,alignItems:'center',justifyContent:'center'}
});

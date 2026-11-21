import {useRoomSession} from './useRoomSession';
import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,ScrollView,StyleSheet,Alert,Animated,Keyboard,KeyboardAvoidingView,Platform,StatusBar,Dimensions,useWindowDimensions,Easing,Share,Modal,InteractionManager} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
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
const PINK='#f43b80',GOLD='#ffe39a',BLUE='#0758b7';
const WELCOME=100,OWNER_DEMO=100000000;
// Purchases and payouts remain disabled in this build.
const REAL_PURCHASES_ENABLED=false,REAL_PAYOUTS_ENABLED=false;
// Hide financial/game/gift simulations in release builds. They remain available for development testing.
const SHOW_UNRELEASED_DEMOS=__DEV__;
// Initialize Firestore only when an authenticated feature needs it.
// ضع Web OAuth Client ID من Firebase/Google Cloud بعد تفعيل Google.
const GOOGLE_WEB_CLIENT_ID=Constants.expoConfig?.extra?.googleWebClientId||'';
// Expo only embeds EXPO_PUBLIC_* variables into the JavaScript bundle.
// Facebook client tokens are mobile SDK configuration, not app secrets.
const FACEBOOK_CONFIGURED=Boolean(process.env.EXPO_PUBLIC_FACEBOOK_APP_ID&&process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN);
const GIFTS=[["🌹","وردة حمراء",10,"rose","رومانسي"],["💙","وردة زرقاء",30,"rose","رومانسي"],["💖","قلب",50,"heart","رومانسي"],["🫶","قلب الأصابع",100,"heart","رومانسي"],["💋","قبلة",150,"kiss","رومانسي"],["💞","أحبك",200,"heart","رومانسي"],["💘","قفل الحب",80,"heart","رومانسي"],["👏","تصفيق",5,"clap","تفاعل"],["🍭","مصاص",100,"candy","تفاعل"],["🧊","برودة الصيف",105,"ice","تفاعل"],["🔥","نسر ناري",120,"phoenix","تفاعل"],["🎂","كيكة",100,"cake","تفاعل"],["🍰","كعكة ماكرون",150,"cake","تفاعل"],["🧸","دبدوب",300,"bear","تفاعل"],["🎁","صندوق الكنز",100,"treasure","تفاعل"],["💰","حقيبة ذهبية",500,"gold","تفاعل"],["🪄","صولجان",2000,"magic","فاخر"],["👑","تاج الجواهر",60,"crown","فاخر"],["👑","تاج ملكي",5000,"crown","فاخر"],["👑","التاج الأعلى",5000,"crown","فاخر"],["💍","خاتم",500,"ring","فاخر"],["🧚","مرافقة مدى الحياة",190000,"fairy","فاخر"],["🏰","قصر",10000,"castle","فاخر"],["🗼","صاروخ أعلى",10000,"rocket","فاخر"],["🛸","مركبة فضائية",3000,"spaceship","مركبات"],["🚁","مروحية الماس",9990,"helicopter","مركبات"],["✈️","الطائرات الماسية",19990,"plane","مركبات"],["🚀","هدية الصاروخ",100,"rocket","مركبات"],["🚀","صاروخ",2500,"rocket","مركبات"],["🏎️","سيارة سباق ذهبية",1000,"car","مركبات"],["🚙","سيارة لينكولن بيضاء",7000,"car","مركبات"],["🚘","رولز رويس الماسية",19990,"car","مركبات"],["🏎️","سيارة فاخرة",1000,"car","مركبات"],["🐉","تنين ذهبي",25000,"dragon","أسطوري"],["🦅","نسر",120,"phoenix","أسطوري"],["🤖","روبوت خارق",1000,"robot","أسطوري"],["🐈‍⬛","قطة تحت النجوم",500,"cat","أسطوري"],["🦆","بطة ساحرة",300,"duck","أسطوري"],["🐹","Capybara",1000,"animal","أسطوري"],["🎊","Happy",3000,"party","تفاعل"],["🎉","حفلة البخت",50000,"party","فاخر"],["🌸","أزهار الكرز",200,"flower","رومانسي"],["🌺","زهرة بيضاء",200,"flower","رومانسي"],["🍓","عصير فواكه",100,"fruit","تفاعل"],["🌵","نرقص سويا",300,"dance","تفاعل"],["🔫","مسدس الماء",1700,"water","تفاعل"],["💸","طابع الأموال",1350,"money","فاخر"],["🪙","نيزك",10,"meteor","تفاعل"],["🧑‍🚀","مسافر الفضاء",2000,"space","مركبات"],["🐑","غنم",2000,"animal","أسطوري"],["🏳️","علم",50,"flag","تفاعل"],["🍽️","طاولة الوجبات",50,"dinner","تفاعل"],["🎀","حزمة حمراء",100,"bundle","تفاعل"],["🧁","Pistachio",20,"candy","تفاعل"],["💐","باقة ورد",500,"flower","رومانسي"],["🧴","عطر",50,"perfume","رومانسي"],["🎸","سيجارة",50,"smoke","تفاعل"],["🪅","علم الوطن",50,"flag","تفاعل"],["🦋","فراشة لامعة",500,"butterfly","أسطوري"],["💎","نيرز",10,"gem","تفاعل"]];
const LUCK_GIFTS=[['🌌','بوابة النجوم',100,'space','الحظ'],['🔮','بلورة المصير',300,'magic','الحظ'],['🌠','شهاب الأمنيات',500,'meteor','الحظ'],['🪐','مدار الكواكب',1000,'space','الحظ']];
const LUCK_ODDS=Object.freeze({noBonus:60,small:25,medium:12,grand:3});
// Decorative luck previews only: no paid stakes, prizes, points, wallet changes or cash value.
const GIFT_CATEGORIES=['الكل','الحظ','رومانسي','تفاعل','فاخر','مركبات','أسطوري'];
const GOODS=[['👑','👑 إطار فاخر',0,'frame'],['🏎️','🏎️ دخول سيارة فاخرة',0,'ride'],['🖼️','إطار فضي',250,'frame'],['💜','إطار بنفسجي',1200,'frame'],['👑','إطار أسطوري',5000,'frame'],['🚙','دخول بسيارة',1500,'ride'],['🏎️','دخول رياضي',4000,'ride'],['🚀','دخول بصاروخ',9000,'ride']];
const FOOD=[['🥕','جزر',5],['🦐','جمبري',10],['🥦','بروكلي',5],['🥩','لحم',15],['🥬','خضار',5],['🍗','دجاج',25],['🌽','ذرة',5],['🐟','سمك',45]];
const COUNTRIES=[['🇯🇴 الأردن','+962'],['🇸🇦 السعودية','+966'],['🇦🇪 الإمارات','+971'],['🇵🇸 فلسطين','+970'],['🇪🇬 مصر','+20'],['🇱🇧 لبنان','+961'],['🇸🇾 سوريا','+963'],['🇮🇶 العراق','+964']];
const AVATARS=['👤','😎','👩','👨','🧑','👸','🤴','🦁','🐼','🦊','🌸','⭐'];
// Pricing preview: USD 1 = 1,000 diamonds; Pi USD-equivalent 1 = 1,200 diamonds.
// Pi market quote is entered manually and is NOT a live price feed.
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
function GlobalGreedyPreview({visible,onClose,onRestoreRoom,roomName,diamonds,onBet,onCredit}){
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
      {onRestoreRoom&&<TouchableOpacity accessibilityLabel="تكبير الغرفة" style={{position:'absolute',right:12,bottom:sheetHeight+8,width:76,height:76,backgroundColor:'#412951',borderRadius:12,borderWidth:2,borderColor:GOLD,alignItems:'center',justifyContent:'center'}} onPress={onRestoreRoom}><Text>🎙️</Text><Text numberOfLines={1} style={S.white}>{roomName}</Text></TouchableOpacity>}
      <View style={[S.gameSheet,{height:sheetHeight}]} accessibilityViewIsModal>
        <View style={S.sheetHandle}/>
        <View style={S.gameBar}>
          <Small title="إغلاق" onPress={onClose}/>
          <View style={S.gameHeading}>
            <Text style={S.gameTitle}>Greedy Star</Text>
            <Text style={S.gameMeta} numberOfLines={1}>{roomName} · {label} · {state.remaining} ث</Text>
          </View>
          <Text style={S.gameBalance}>💎 {fmt(diamonds)}</Text>
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
  if(!response.ok)throw new Error('تعذر الاتصال بخدمة البث ('+response.status+')');
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

function RoomMediaSession({room,userId,canPublish,audio,blocked,guests,runtime,session,onSeat,people,initialMedia}){
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
    <ConnectedMedia runtime={runtime} room={room} canPublish={canPublish} audio={audio} blocked={blocked} guests={guests} people={people} onSeat={onSeat}/>
  </LiveKitRoom>;
}

function ConnectedMedia({room,canPublish,audio,blocked,guests,runtime,session,onSeat,people}){
  const {VideoTrack,isTrackReference,useConnectionState,useLocalParticipant,useParticipants,useTracks,ConnectionState,Track}=runtime;
  const state=useConnectionState();
  const {localParticipant,isMicrophoneEnabled,isCameraEnabled}=useLocalParticipant();
  const tracks=useTracks([Track.Source.Camera],{onlySubscribed:true});
  const participants=useParticipants();
  const guestCamera=tracks.find(track=>Object.prototype.hasOwnProperty.call(guests,track.participant.identity)&&!blocked.includes(track.participant.identity)&&isTrackReference(track));
  const seats=Object.entries(guests).filter(([uid])=>uid!==room.ownerUid);
  const host=participants.find(participant=>participant.identity===room.ownerUid);

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
      audio?<><TouchableOpacity style={S.hostSeat} onPress={()=>onSeat(room.ownerUid,room.ownerName||'المضيف')}>
        <View style={[S.hostCrown,people.find(p=>p.uid===room.ownerUid)?.frame&&{borderWidth:4,borderColor:GOLD}]}><Text style={S.hostCrownText}>♛</Text></View>
        <Text style={S.hostSeatName} numberOfLines={1}>{room.ownerName||'المضيف'}</Text>
        <Text style={S.hostSeatRole}>{host?.isMicrophoneEnabled?'🎙 صاحب البث':'صاحب البث'}</Text>
      </TouchableOpacity>
        <View style={S.seatGrid}>{Array.from({length:AUDIO_GUEST_SEATS},(_,i)=>{
          const [uid,label]=seats[i]||[];
          const person=participants.find(participant=>participant.identity===uid);
          return <TouchableOpacity key={i} accessibilityLabel={label||"مقعد متاح"} style={S.seatItem} onPress={()=>{if(uid&&uid===localParticipant.identity){Alert.alert(label,'',[{text:isMicrophoneEnabled?'كتم ميكروفوني':'تشغيل ميكروفوني',onPress:()=>{if(canPublish)void toggle('microphone');else Alert.alert('الميكروفون مكتوم من المضيف')}},{text:'إغلاق'}]);return}onSeat(uid,label)}}>
          <View style={[S.throne,people.find(p=>p.uid===uid)?.frame===1&&{borderColor:GOLD,borderWidth:3}]}><Text style={{fontSize:23}}>{uid?(person?.isMicrophoneEnabled?'🎙️':'💺'):'💺'}</Text></View>
          <Text numberOfLines={1} style={S.tiny}>{label||'متاح'}</Text>
        </TouchableOpacity>})}</View></>:
        !camera&&<Text style={mediaStyles.status}>كاميرا المضيف مغلقة</Text>}
    {canPublish&&state===ConnectionState.Connected&&!busy&&<View style={mediaStyles.controls}>
      <TouchableOpacity accessibilityLabel={isMicrophoneEnabled?'كتم الميكروفون':'تشغيل الميكروفون'} style={S.small} onPress={()=>toggle('microphone')}><Text style={S.white}>{isMicrophoneEnabled?'🎙️':'🔇'}</Text></TouchableOpacity>
      {!audio&&<Small title={isCameraEnabled?'إغلاق الكاميرا':'تشغيل الكاميرا'} onPress={()=>toggle('camera')}/>}
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

function Room({room,userId,username,avatar,equipped,diamonds,onSendGift,onBet,onCredit,onExit,onMinimize,onRestore,minimized}){
  const [globalGameOpen,setGlobalGameOpen]=useState(false);
  const [chatVisible,setChatVisible]=useState(true);
  const audio=room.type==='audio';
  const isHost=room.ownerUid===userId;
  const [message,setMessage]=useState(''),[sending,setSending]=useState(false);
  const [pin,setPin]=useState(''),[recipient,setRecipient]=useState(null);
  const [hostSettingsOpen,setHostSettingsOpen]=useState(false);
  const [closingRoom,setClosingRoom]=useState(false);
  const [giftCategory,setGiftCategory]=useState('الكل');
  const [giftQuantity,setGiftQuantity]=useState(1);
  const [giftOpen,setGiftOpen]=useState(false),[fx,setFx]=useState(null),[fxId,setFxId]=useState(0),[keyboardOn,setKeyboardOn]=useState(false);
  const roomRef=firestore().collection('rooms').doc(room.id);
  const [legacyChat,setLegacyChat]=useState([]);
  const [stagePanelVisible,setStagePanelVisible]=useState(false),[blocked,setBlocked]=useState([]);
  const chatRef=useRef(null),sendingRef=useRef(false),roomClosedRef=useRef(false),exitHandledRef=useRef(false),closingByHostRef=useRef(false);
  function exitRoomOnce(){if(!exitHandledRef.current){exitHandledRef.current=true;onExit()}}
  const membership=useRoomSession(room.id,username,equipped,entries=>{
    setFxId(v=>v+1);setFx(['🏎️','دخل الغرفة '+entries.map(p=>p.name).join('، '),0,entries.some(p=>p.ride)?'car':'party']);
  },reason=>{if(closingByHostRef.current){exitRoomOnce();return;}if(exitHandledRef.current)return;Alert.alert('الغرفة',reason);exitRoomOnce()});
  const people=membership.state?.people||[];
  const guests=Object.fromEntries(people.filter(p=>p.seat).map(p=>[p.uid,p.name]));
  const self=people.find(p=>p.uid===userId);
  const isGuest=Boolean(self?.seat&&!self?.muted);
  const requests=people.filter(p=>p.waiting&&!blocked.includes(p.uid));
  const requested=self?.waiting;
  const act=(op,extra)=>membership.act(op,extra).catch(e=>Alert.alert('الغرفة',e.message));
  const [seatMenu,setSeatMenu]=useState(null);
  function onSeat(uid,label){
    if(!uid){if(!isHost&&!self?.seat)void act('request');return}
    const person=people.find(p=>p.uid===uid);
    const options=[];
    if(uid!==userId)options.push({text:'🎁 إرسال هدية إلى '+label,onPress:()=>{setRecipient({uid,name:label});setGiftOpen(true)}});
    if(isHost&&uid!==userId)options.push(
      {text:person?.muted?'السماح بالميكروفون':'كتم الميكروفون',onPress:()=>act(person?.muted?'unmute':'mute',{uid})},
      {text:'إنزال عن المقعد',onPress:()=>act('demote',{uid})},
      {text:'طرد من الغرفة',onPress:()=>act('kick',{uid})});
    setSeatMenu({label,options});
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
    return roomRef.collection('messages').orderBy('createdAt','asc').limitToLast(100).onSnapshot(snapshot=>setLegacyChat(snapshot.docs.map(d=>({...d.data(),id:d.id,legacy:true}))),()=>{});
  },[room.id,admitted]);
  function stagePanel(){
    if(!isHost)return self?.seat?null:<Small title={requested?'إلغاء الطلب':'طلب مقعد'} onPress={()=>act(requested?'cancel':'request')}/>;
    return requests.length?<TouchableOpacity accessibilityLabel={'طلبات المقاعد '+requests.length} style={S.small} onPress={()=>setStagePanelVisible(v=>!v)}><Text style={S.white}>💺 {requests.length}</Text></TouchableOpacity>:null;
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
  function send(gift){
    if(roomClosedRef.current)return Alert.alert('الغرفة مغلقة','لا يمكن إرسال هدايا بعد إغلاق الغرفة');
    if(!Array.isArray(gift)||!Number.isSafeInteger(gift[2])||gift[2]<=0)return Alert.alert('هدية غير صالحة');
    if(gift[4]==='الحظ'){
      const roll=Math.random()*100;
      const outcome=roll<LUCK_ODDS.grand?'grand':roll<LUCK_ODDS.grand+LUCK_ODDS.medium?'medium':roll<LUCK_ODDS.grand+LUCK_ODDS.medium+LUCK_ODDS.small?'small':'none';
      const title=outcome==='grand'?'✨ تأثير أسطوري':outcome==='medium'?'🌟 تأثير مميز':outcome==='small'?'⭐ تأثير بسيط':'🌙 لا توجد مكافأة';
      if(outcome!=='none'){setFxId(v=>v+1);setFx(gift)}
      Alert.alert('تجربة الحظ',title+' — سياسة التوزيع عند تفعيل الهدايا المدفوعة: 55% للمضيف، 10% للوكيل، 35% للمالك من النقاط المؤهلة، سواء فاز المرسل أو خسر. هذه معاينة فقط؛ لا خصم أو نقاط فعلية الآن.');
      setGiftOpen(false);return;
    }
    if(!Number.isSafeInteger(gift[2]*giftQuantity)||giftQuantity<1)return Alert.alert('عدد هدايا غير صالح');
    if(diamonds<gift[2]*giftQuantity)return Alert.alert('رصيد غير كافٍ');
    // Host may send a local preview gift to their own room.
    // Self-gifts never mint cash-eligible earnings or support points.
    if(!onSendGift([gift[0],gift[1],gift[2]*giftQuantity,gift[3]],room))return;
    setGiftOpen(false);setFxId(v=>v+1);setFx(gift);
  }
  async function closeHostedRoom(){
    if(!isHost||!room?.id||closingRoom)return;
    setClosingRoom(true);
    closingByHostRef.current=true;
    try{
      await firestore().collection('rooms').doc(room.id).update({status:'closed'});
          if(MEDIA_CONFIGURED)void mediaRequest('/close-room',{roomId:room.id,session:membership.session}).catch(()=>Alert.alert('تعذر إنهاء بث الغرفة على الخادم'));
      setHostSettingsOpen(false);
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
  const hostSettings=<Modal visible={hostSettingsOpen&&isHost} transparent animationType="slide" onRequestClose={()=>setHostSettingsOpen(false)}>
    <View style={S.hostSettingsShade}><View style={S.hostSettingsPanel}>
      <View style={S.hostSettingsHeading}><Text style={S.title}>⚙️ إعدادات المضيف</Text><TouchableOpacity onPress={()=>setHostSettingsOpen(false)}><Text style={S.white}>✕</Text></TouchableOpacity></View>
      <Text style={S.muted}>الإعدادات المتاحة حاليًا في Clipi فقط</Text>
      <Small title={membership.state?.locked?'🔓 فتح المايكات':'🔒 قفل المايكات'} onPress={()=>act('settings',{locked:!membership.state.locked})}/>
      <TextInput style={S.input} value={pin} secureTextEntry keyboardType="number-pad" maxLength={4} placeholder="رقم سري من أربع خانات" onChangeText={setPin}/>
      <Small title="حفظ رمز الغرفة" onPress={async()=>{if(!/^[0-9]{4}$/.test(pin))return Alert.alert('أدخل أربعة أرقام');try{await membership.act('settings',{pin});setPin('');setHostSettingsOpen(false)}catch(e){Alert.alert('الغرفة',e.message)}}}/>
      {membership.state?.protected&&<Small title="إلغاء قفل الغرفة" onPress={()=>act('settings',{pin:''})}/>}
      <View style={S.hostSettingsGrid}>
        <TouchableOpacity style={S.hostSettingsItem} onPress={()=>{setHostSettingsOpen(false);onMinimize()}}>
          <Text style={S.hostSettingsIcon}>▣</Text><Text style={S.white}>تصغير الغرفة</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.hostSettingsItem} onPress={()=>{setHostSettingsOpen(false);confirmCloseHostedRoom()}}>
          <Text style={S.hostSettingsIcon}>⏻</Text><Text style={S.white}>إغلاق للجميع</Text>
        </TouchableOpacity>
      </View>
      <Text style={S.muted}>طلبات المقاعد وأزرار الصوت والكاميرا تظهر داخل الغرفة.</Text>
    </View></View>
  </Modal>;
  if(!membership.state)return <View style={S.page}><Text style={S.title}>{room.name}</Text><Text style={S.white}>{membership.error||'جارٍ دخول الغرفة…'}</Text>
    {membership.pinRequired&&<TextInput style={S.input} value={pin} maxLength={4} keyboardType="number-pad" secureTextEntry onChangeText={setPin} placeholder="رمز الغرفة"/>}
    {!!membership.error&&<Btn title="دخول" onPress={()=>membership.join(pin)}/>}<Small title="رجوع" onPress={exitRoomOnce}/></View>;
  return <KeyboardAvoidingView style={[S.room,{backgroundColor:audio?'#291d43':'#10132e'}]} behavior={Platform.OS==='ios'?'padding':undefined}>
    <StatusBar barStyle="light-content"/>
    {audio&&<View pointerEvents="none" style={S.audioBackdrop}><View style={S.blueGlow}/><View style={S.royalGlow}/><Text style={S.bgCrown}>♛</Text><Text style={S.bgOrnament}>✦ ✧ ♛ ✧ ✦</Text></View>}
    {!audio&&<View style={[StyleSheet.absoluteFillObject,{paddingTop:110}]}><RoomMedia room={room} userId={userId} canPublish={isHost||isGuest} audio={audio} blocked={blocked} guests={guests} initialMedia={membership.state.media} key={String(isHost||isGuest)} session={membership.session} people={people} onSeat={onSeat}/></View>}
    <Modal visible={!!seatMenu} transparent onRequestClose={()=>setSeatMenu(null)}><View style={S.hostSettingsShade}><View style={S.hostSettingsPanel}><Text style={S.title}>{seatMenu?.label}</Text>{seatMenu?.options.map(option=><Small key={option.text} title={option.text} onPress={()=>{setSeatMenu(null);option.onPress()}}/>)}<Small title="إغلاق" onPress={()=>setSeatMenu(null)}/></View></View></Modal>
    {hostSettings}
    {globalGameOpen&&<GlobalGreedyPreview visible={minimized} onRestoreRoom={onRestore} roomName={room.name} diamonds={diamonds}
      onBet={onBet} onCredit={onCredit} onClose={()=>setGlobalGameOpen(false)}/>}
    <View style={S.roomTop}>
      <View style={S.roomTopRow}>
        <Small title="✕ خروج" onPress={exitRoomOnce}/>
        <View style={S.roomIdentity}>
          <Text style={S.roomName} numberOfLines={1}>{room.name}</Text>
          <Text style={S.roomType}>{audio?'🎙 غرفة صوتية':'📹 بث فيديو'}</Text>
        </View>
        <Small title="تصغير" onPress={()=>{Keyboard.dismiss();onMinimize()}}/>
      </View>
      <View style={S.roomToolbar}>
        {isHost&&<Small title="⚙ إعدادات" onPress={()=>setHostSettingsOpen(true)}/>}
        <Small title="مشاركة" onPress={()=>Share.share({message:room.name+'\n'+MEDIA_ENDPOINT+'/#room='+encodeURIComponent(room.id)})}/>
        <Small title={chatVisible?'إخفاء الدردشة':'إظهار الدردشة'} onPress={()=>setChatVisible(v=>!v)}/>
      </View>
    </View>
    {audio&&<RoomMedia room={room} userId={userId} canPublish={isHost||isGuest} audio={audio} blocked={blocked} guests={guests} initialMedia={membership.state.media} key={String(isHost||isGuest)} session={membership.session} people={people} onSeat={onSeat}/>}
    <View pointerEvents="none" style={{flex:1}}/>
    {!keyboardOn&&<View style={{alignSelf:'flex-end',marginHorizontal:8}}>{stagePanel()}</View>}
    {isHost&&stagePanelVisible&&requests.length>0&&!keyboardOn&&<ScrollView style={mediaStyles.requests}>
      {requests.map(item=><Small key={item.uid} title={item.name} onPress={()=>act('approve',{uid:item.uid})}/>)}
    </ScrollView>}
    {!keyboardOn&&<View style={S.actions}><Small title="🌍 Greedy Star" color="#0c9b69" onPress={()=>{Keyboard.dismiss();setGiftOpen(false);setGlobalGameOpen(true);onMinimize()}}/><Text style={S.tiny}>{isHost?'👑 أنت مضيف الغرفة':'👤 أنت مشاهد'} · {audio?'غرفة صوتية':'غرفة فيديو'}</Text></View>}
    {chatVisible&&!keyboardOn&&<ScrollView ref={chatRef} style={S.chat} contentContainerStyle={{padding:7}}><Text style={S.tiny}>اضغط مطولًا للإبلاغ أو الحظر أو حذف رسالتك، ويستطيع المضيف حذف رسائل الغرفة.</Text>{[...legacyChat,...(membership.state?.chat||[])].filter(m=>!blocked.includes(m.userUid)).map(m=><TouchableOpacity key={m.id} onLongPress={()=>moderateMessage(m)} style={S.bubble}><Text style={S.white}><Text style={{color:GOLD}}>{m.userName||'مستخدم'}: </Text>{m.text}</Text></TouchableOpacity>)}</ScrollView>}
    {giftOpen&&!keyboardOn&&<View style={S.panel}><Text style={S.white}>ماسات الدعم المتاحة: {membership.state?.supportBalance??'…'} 💎</Text>
      <Text style={S.muted}>دعم إلى {recipient?.name||room.host} · لا يدخل في الأرباح أو السحب</Text>
      <View style={S.row}>{[10,50,100].map(cost=><Small key={cost} title={'🎁 '+cost+' 💎'} onPress={()=>membership.sendSupport(recipient?.uid||room.ownerUid||room.owner,cost).catch(e=>Alert.alert('هدية الدعم',e.message))}/>)}</View></View>}
    {!SHOW_UNRELEASED_DEMOS&&giftOpen&&<View style={S.panel}><Text style={S.white}>{recipient?'هدية إلى '+recipient.name:'هدايا الغرفة'}</Text><Text style={S.muted}>أكمل دفع Pi في المحفظة من داخل Pi Browser.</Text><Small title="مشاركة رابط الغرفة للدفع" onPress={()=>Share.share({message:MEDIA_ENDPOINT+'/#room='+encodeURIComponent(room.id)})}/><Small title="إغلاق" onPress={()=>setGiftOpen(false)}/></View>}
    {SHOW_UNRELEASED_DEMOS&&giftOpen&&!keyboardOn&&<View style={S.giftDrawer}>
      <View style={S.drawerHeader}><Text style={S.gold}>🎁 هدايا تجريبية محلية</Text><Text style={S.gold}>💎 {fmt(diamonds)}</Text><TouchableOpacity onPress={()=>setGiftOpen(false)}><Text style={S.white}>✕</Text></TouchableOpacity></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight:46}} contentContainerStyle={{alignItems:'center',paddingHorizontal:8}}>
        {GIFT_CATEGORIES.map(c=><TouchableOpacity key={c} onPress={()=>setGiftCategory(c)} style={{paddingHorizontal:12,paddingVertical:8,borderRadius:18,marginRight:6,backgroundColor:giftCategory===c?'#6f3db1':'#26123d'}}>
          <Text style={{color:giftCategory===c?'#fff2a6':'white',fontWeight:'700'}}>{c}</Text></TouchableOpacity>)}
      </ScrollView>
      {giftCategory==='الحظ'&&<Text style={[S.muted,{paddingHorizontal:12}]}>تجربة مؤثرات فقط: 60% بلا مكافأة، 25% بسيط، 12% مميز، 3% أسطوري. عند التفعيل المستقبلي لا تتغير حصة المضيف أو الوكيل أو المالك بنتيجة الحظ. لا خصم أو أرباح فعلية الآن.</Text>}
      <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={S.giftGrid}>
        {[...GIFTS,...LUCK_GIFTS].filter(g=>giftCategory==='الكل'||g[4]===giftCategory).map((g,i)=><TouchableOpacity key={g[1]+i} style={S.giftTile} onPress={()=>send(g)}>
          <Text style={{fontSize:35,textShadowColor:'#e0b5ff',textShadowRadius:12}}>{g[0]}</Text>
          <Text numberOfLines={2} style={S.giftName}>{g[1]}</Text><Text style={S.giftCost}>{g[4]==='الحظ'?'🎲 تجربة مجانية':'💎 '+fmt(g[2]*giftQuantity)}</Text>
        </TouchableOpacity>)}
      </ScrollView>
      <View style={{flexDirection:'row',justifyContent:'space-around',alignItems:'center',paddingVertical:8,backgroundColor:'#261438'}}>
        <Text style={S.gold}>العدد</Text>
        {[1,7,17,37,77].map(n=><TouchableOpacity key={n} onPress={()=>setGiftQuantity(n)} style={{backgroundColor:giftQuantity===n?'#8655d2':'#37234d',borderRadius:16,paddingHorizontal:10,paddingVertical:7}}><Text style={S.white}>{n}</Text></TouchableOpacity>)}
      </View>
    </View>}
    <View style={S.composer}><TouchableOpacity accessibilityLabel="صندوق الهدايا" style={S.composerGift} onPress={()=>{Keyboard.dismiss();setRecipient(null);setGiftOpen(v=>!v)}}><Text style={{fontSize:23}}>🎁</Text></TouchableOpacity><TextInput style={S.messageInput} value={message} maxLength={500} onChangeText={setMessage} accessibilityLabel="تعليق الغرفة" placeholder="اكتب تعليقًا..." placeholderTextColor="#bbd0ea" onFocus={()=>setGiftOpen(false)} returnKeyType="send" onSubmitEditing={sendMessage}/><TouchableOpacity accessibilityLabel="إرسال التعليق" style={[S.sendButton,sending&&{opacity:.5}]} disabled={sending||!message.trim()} onPress={sendMessage}><Text style={S.white}>➤</Text></TouchableOpacity></View>
    {fx&&<GiftFX key={fxId} gift={fx} onDone={()=>setFx(null)}/>}
  </KeyboardAvoidingView>;
}

export default function App(){
  const previousPage=useRef('home');const [mini,setMini]=useState(false);
  const [page,setPage]=useState('loading');
  const [user,setUser]=useState(null);
  const [name,setName]=useState(''),[phone,setPhone]=useState(''),[country,setCountry]=useState(0),[countriesOpen,setCountriesOpen]=useState(false),[accepted,setAccepted]=useState(false);
  const [loginMethod,setLoginMethod]=useState('email');
  const [emailMode,setEmailMode]=useState('login');
  const [email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [confirmation,setConfirmation]=useState(null),[smsCode,setSmsCode]=useState(''),[busy,setBusy]=useState(false),[authError,setAuthError]=useState('');
  const [avatar,setAvatar]=useState('👤');
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
  const [rooms,setRooms]=useState([]),[roomName,setRoomName]=useState('غرفتي'),[roomType,setRoomType]=useState('video'),[activeRoom,setActiveRoom]=useState(null);
  const [paymentMethod,setPaymentMethod]=useState('usd'),[piRate,setPiRate]=useState('');
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
        if(active&&auth().currentUser?.uid===u.uid)go('home');
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
    const unsub=firestore().collection('rooms').orderBy('createdAt','desc').limit(50).onSnapshot(snapshot=>{
      setRooms(snapshot.docs.map(d=>({id:d.id,...d.data()})));setRoomError('');
    },e=>{setRooms([]);setRoomError('تعذر تحميل الغرف: '+e.message)});
    return unsub;
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
  async function saveProfile(u,label){
    if(!u?.uid)throw new Error('يرجى تسجيل الدخول أولًا');
    const displayName=(label||u.displayName||'مستخدم').trim();
    if(!displayName||displayName.length>35)throw new Error('اسم المستخدم يجب أن يكون بين 1 و35 حرفًا');
    await firestore().collection('users').doc(u.uid).set({
      displayName,avatar,updatedAt:firestore.FieldValue.serverTimestamp()
    },{merge:true});
    setName(displayName);
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
  function sendGift(g,room){
    const source=spend(g[2]);if(!source)return false;
    const selfGift=(room.ownerUid||room.owner)===user?.uid;
    setSpent(v=>v+g[2]);
    // Sending a gift is not receiving it. Self-support is visual only and cannot generate earnings.
    setSupportLog(v=>[{id:String(Date.now())+Math.random(),gift:g[1],value:g[2],host:room.host,source,selfGift,eligibleSupportPoints:0},...v].slice(0,50));
    return true;
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
  function purchase(pack){
    const usd=pack/DIAMONDS_PER_USD;
    if(paymentMethod==='usd')Alert.alert('معاينة شراء',`${fmt(pack)} ماسة بسعر $${usd}. الدفع الحقيقي غير مربوط.`);
    else{const rate=Number(piRate);if(!Number.isFinite(rate)||rate<=0)return Alert.alert('سعر Pi','أدخل سعر Pi الحالي بالدولار');Alert.alert('معاينة Pi',`${fmt(Math.round(usd*DIAMONDS_PER_PI_USD))} ماسة مقابل ${(usd/rate).toFixed(6)} Pi وفق السعر المدخل. يتغير سعر Pi من حين إلى آخر، ولا يتم تحصيل أي دفع.`)}
  }
  function resetGame(){clearTimeout(timerRef.current);betsRef.current={};setBets({});setSeconds(30);setLit(-1);setGameResult(null);phaseRef.current='betting';setPhase('betting')}
  function placeBet(i){
    if(!__DEV__||REAL_GREEDY_STAR_ENABLED)return Alert.alert('غير متاح','اللعبة المالية غير مفعلة. المحاكاة للتطوير فقط.');
    if(phaseRef.current!=='betting')return;
    if(!betsRef.current[i]&&Object.keys(betsRef.current).length>=6)return Alert.alert('الحد الأقصى ست خانات');
    if(!spend(betAmount))return Alert.alert('رصيد غير كافٍ');
    const b={...betsRef.current,[i]:(betsRef.current[i]||0)+betAmount};betsRef.current=b;setBets(b);
  }
  function spin(){
    if(!__DEV__||REAL_GREEDY_STAR_ENABLED)return;
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
  function header(title,back=()=>go('home')){return <View style={S.header}><TouchableOpacity onPress={back}><Text style={S.white}>❮ رجوع</Text></TouchableOpacity><Text style={S.headerTitle}>{title}</Text><TouchableOpacity onPress={()=>go('wallet')}><Text style={S.gold}>{'💎 '+fmt(total)}</Text></TouchableOpacity></View>}
  function nav(){const destinations=SHOW_UNRELEASED_DEMOS?[['🏠','home'],['🎮','games'],['🎁','gifts'],['💎','wallet'],['👤','profile']]:[['🏠','home','الرئيسية'],['🚪','rooms','الغرف'],['👤','profile','حسابي']];return <View style={S.nav}>{destinations.map(([icon,p,label])=><TouchableOpacity key={p} accessibilityRole="tab" accessibilityState={{selected:page===p}} style={[S.navItem,page===p&&S.navActive]} onPress={()=>go(p)}><Text style={S.navIcon}>{icon}</Text>{label&&<Text style={S.navLabel}>{label}</Text>}</TouchableOpacity>)}</View>}
  function layout(title,children,back){return <View style={S.page}><StatusBar barStyle="light-content"/>{header(title,back)}<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={S.content}>{children}</ScrollView>{nav()}</View>}
  const myProfile=<View style={S.card}><Text style={{fontSize:54}}>{avatar}</Text><Text style={S.title}>{name||user?.displayName||'مستخدم'} {ownerDemo?'👑':''}</Text><Text style={S.gold}>ID: {user?.uid?.slice(0,12)}</Text>{SHOW_UNRELEASED_DEMOS&&<Text style={S.big}>💎 {fmt(total)}</Text>}<Text style={S.white}>{equipped.frame}</Text><Text style={S.white}>{equipped.ride}</Text>{SHOW_UNRELEASED_DEMOS&&<Text style={S.muted}>دعم تجريبي تم إرساله: {fmt(spent)} ماسة</Text>}</View>;

  function renderPage(){
  if(page==='earningsWallet')return <EarningsWalletScreen onBack={()=>go('profile')}/>;
  if(page==='loading')return <View style={[S.page,{justifyContent:'center',alignItems:'center'}]}><Text style={S.title}>Clipi · تحميل الحساب...</Text></View>;
  if(page==='login'||page==='verify'||page==='terms')return <View style={S.page}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={S.content}>
    <Text style={S.logo}>Clipi</Text>
    {page==='terms'?<><Text style={S.white}>الماس والأرباح في هذه النسخة تجريبية. لا يوجد دفع أو سحب مالي. المحتوى والبث بين الأجهزة يحتاجان خدمة مخصصة. يجب نشر سياسة خصوصية وشروط قانونية قبل الإطلاق.</Text><Btn title="أوافق" onPress={()=>{setAccepted(true);go('login')}}/><Btn title="رجوع" color="#49306b" onPress={()=>go('login')}/></>:
    page==='verify'?<><Text style={S.label}>رمز التحقق SMS</Text><TextInput style={S.input} value={smsCode} onChangeText={setSmsCode} keyboardType="number-pad" maxLength={6} placeholder="ستة أرقام"/><Btn title={busy?'جارٍ التحقق...':'تأكيد الرمز'} disabled={busy} onPress={verifySms}/><Btn title="تغيير رقم الهاتف" color="#49306b" onPress={()=>go('login')}/></>:
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
      <Btn title={accepted?'☑ أوافق على الشروط':'☐ أوافق على الشروط'} color="#49306b" onPress={()=>setAccepted(v=>!v)}/><Btn title="قراءة الشروط" color="#49306b" onPress={()=>go('terms')}/>
      {loginMethod==='email'?<>
        <Btn title={busy?'جارٍ العمل...':emailMode==='signup'?'إنشاء الحساب':emailMode==='reset'?'إرسال رابط الاستعادة':'تسجيل الدخول بالبريد'} disabled={busy} onPress={emailLogin}/>
        <Btn title={emailMode==='login'?'إنشاء حساب جديد':'العودة إلى تسجيل الدخول'} color="#49306b" disabled={busy}
          onPress={()=>{setEmailMode(emailMode==='login'?'signup':'login');setPassword('');setAuthError('');}}/>
        {emailMode==='login'&&<Btn title="نسيت كلمة المرور" color="#49306b" disabled={busy}
          onPress={()=>{setEmailMode('reset');setPassword('');setAuthError('');}}/>}
      </>:<Btn title={busy?'جارٍ العمل...':'📱 تسجيل بالهاتف (SMS)'} disabled={busy} onPress={phoneLogin}/>}
      <Btn title={GOOGLE_WEB_CLIENT_ID?"🌐 متابعة باستخدام Google":"🌐 Google · يحتاج إعدادًا"} color="#4285f4" disabled={busy||!GOOGLE_WEB_CLIENT_ID} onPress={googleLogin}/><Btn title={FACEBOOK_CONFIGURED?"📘 متابعة باستخدام Facebook":"📘 Facebook · يحتاج إعدادًا"} color="#1877f2" disabled={busy||!FACEBOOK_CONFIGURED} onPress={facebookLogin}/>
      {authError?<Text style={{color:'#ffa6a6'}}>{authError}</Text>:null}
    </>}
  </ScrollView></View>;
  if(page==='home')return layout('Clipi',<><View style={S.homeHero}>
    <Text style={S.homeBrand}>Clipi</Text>
    <Text style={S.homeTitle}>أهلًا {name||'بك'}</Text>
    <Text style={S.homeSubtitle}>غرف صوتية وبث فيديو مباشر</Text>
  </View>{myProfile}{<View style={S.panel}><Text style={S.title}>🎉 مكافأة الترحيب التجريبية</Text><Text style={S.white}>💎 100 ماسة دعم غير قابلة للسحب · 👑 إطار فاخر · 🏎️ دخول سيارة فاخرة</Text></View>}<Btn title="📹 إنشاء غرفة صوتية أو فيديو" onPress={()=>go('create')}/><Btn title="🚪 استعراض الغرف" color="#7040a7" onPress={()=>go('rooms')}/>{<><Btn title="💎 شراء الماسات (تجريبي)" color="#7040a7" onPress={()=>go('wallet')}/><Btn title="🛍 المتجر (تجريبي)" color="#7040a7" onPress={()=>go('store')}/></>}{SHOW_UNRELEASED_DEMOS&&<><Btn title="💰 أرباح المضيف (تجريبي)" color="#7040a7" onPress={()=>go('earnings')}/><Btn title="🎮 Greedy Star (تجريبي)" color="#7040a7" onPress={()=>go('games')}/></>}<Btn title="📤 مشاركة Clipi" color="#7040a7" onPress={()=>Share.share({message:'Clipi'})}/></>);
  if(page==='create')return layout('إنشاء غرفة',<><Text style={S.label}>اسم الغرفة</Text><TextInput style={S.input} value={roomName} onChangeText={setRoomName}/><Text style={S.label}>نوع الغرفة</Text><View style={S.row}><Btn title="📹 فيديو" color={roomType==='video'?PINK:'#49306b'} onPress={()=>setRoomType('video')}/><Btn title="🎙 صوت" color={roomType==='audio'?PINK:'#49306b'} onPress={()=>setRoomType('audio')}/></View><Text style={S.muted}>الغرفة عامة للمستخدمين المسجلين. الغرف الخاصة وكلمات المرور غير متاحة حاليًا.</Text><Btn title="فتح الغرفة" onPress={createRoom}/></>);
  if(page==='rooms')return layout('الغرف',<><Btn title="➕ إنشاء غرفة" onPress={()=>go('create')}/><TextInput style={S.input} value={roomSearch} onChangeText={setRoomSearch} placeholder="ابحث بالاسم أو معرّف الغرفة"/><Text style={S.muted}>يمكنك إخفاء غرف المستخدمين المحظورين وإلغاء الحظر من ملفك الشخصي.</Text>{roomError?<Text style={{color:'#ffa6a6'}}>{roomError}</Text>:null}{rooms.filter(r=>r.status==='open'&&!blockedUsers.includes(r.ownerUid)&&(r.name?.toLowerCase().includes(roomSearch.trim().toLowerCase())||r.id.toLowerCase().includes(roomSearch.trim().toLowerCase()))).length===0?<Text style={S.muted}>لا توجد غرف مطابقة</Text>:rooms.filter(r=>r.status==='open'&&!blockedUsers.includes(r.ownerUid)&&(r.name?.toLowerCase().includes(roomSearch.trim().toLowerCase())||r.id.toLowerCase().includes(roomSearch.trim().toLowerCase()))).map(r=><View key={r.id} style={S.panel}><TouchableOpacity onPress={()=>enterRoom(r)}><Text style={S.title}>{r.type==='video'?'📹':'🎙'} {r.name}</Text><Text style={S.gold}>#{r.id.slice(0,9)} 🌐 · دردشة مباشرة (البث غير مفعّل)</Text></TouchableOpacity>{r.ownerUid===user?.uid&&<Btn title="إغلاق غرفتي" color="#96334f" onPress={()=>closeMyRoom(r)}/>}</View>)}</>);
  if(page==='wallet')return layout('محفظة Clipi',<><View style={S.card}><Text style={S.title}>💎 الرصيد التجريبي</Text><Text style={S.big}>{fmt(total)}</Text><Text style={S.white}>هدية الترحيب: {fmt(wallet.welcome)}</Text><Text style={S.white}>المشتَرى: {fmt(wallet.purchased)}</Text>{ownerDemo&&<Text style={S.gold}>معاينة المالك: {fmt(wallet.owner)}</Text>}</View><Text style={S.title}>طريقة الشراء</Text><View style={S.row}><Btn title="💵 دولار" color={paymentMethod==='usd'?PINK:'#49306b'} onPress={()=>setPaymentMethod('usd')}/><Btn title="🪙 Pi" color={paymentMethod==='pi'?PINK:'#49306b'} onPress={()=>setPaymentMethod('pi')}/></View>{paymentMethod==='pi'&&<><Text style={S.label}>سعر Pi بالدولار (يدوي للمعاينة)</Text><TextInput style={S.input} keyboardType="decimal-pad" value={piRate} onChangeText={setPiRate} placeholder="مثال: 0.50"/></>}{PACKS.map(pack=><View key={pack} style={S.shop}><View style={{flex:1}}><Text style={S.gold}>💎 {fmt(paymentMethod==='pi'?Math.round((pack/DIAMONDS_PER_USD)*DIAMONDS_PER_PI_USD):pack)}</Text><Text style={S.white}>{paymentMethod==='usd'?`${(pack/DIAMONDS_PER_USD).toFixed(2)}`:Number(piRate)>0?`${((pack/DIAMONDS_PER_USD)/Number(piRate)).toFixed(6)} Pi`:'أدخل سعر Pi'}</Text></View><Small title="شراء" color={PINK} onPress={()=>purchase(pack)}/></View>)}<Text style={S.muted}>الأسعار المرجعية: 1 دولار = 1,000 ماسة، وما يعادل 1 دولار من Pi = 1,200 ماسة. يتغير سعر Pi صعودًا وهبوطًا من حين إلى آخر؛ أدخل سعر Pi الحالي بالدولار للمعاينة، ولا يُحدَّث السعر تلقائيًا. زر شراء للمعاينة فقط ولا يتم خصم أي أموال. الربط بمتجر Apple / Google ومعالجة Pi يحتاجان إعدادات دفع فعلية.</Text></>);
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

  if(page==='store')return layout('المتجر',<><View style={S.panel}><Text style={S.gold}>هدايا الترحيب: 👑 إطار ملكي · 🏎️ سيارة فاخرة</Text></View>{GOODS.map((g,i)=><View key={i} style={S.shop}><Text style={{fontSize:25}}>{g[0]}</Text><View style={{flex:1}}><Text style={S.white}>{g[1]}</Text><Text style={S.gold}>{g[2]} 💎</Text></View>{inventory.includes(g[1])?<Small title={equipped[g[3]]===g[1]?'إزالة':'تفعيل'} onPress={()=>setEquipped(v=>({...v,[g[3]]:v[g[3]]===g[1]?'':g[1]}))}/>:<Small title="شراء" color={PINK} onPress={()=>buyGood(g)}/>}</View>)}</>);
  if(page==='gifts')return layout('الهدايا',<><Text style={S.muted}>الهدايا تُرسل من داخل غرفة صوت أو فيديو</Text><View style={S.giftGrid}>{GIFTS.map((g,i)=><View key={i} style={S.giftTile}><Text style={{fontSize:22}}>{g[0]}</Text><Text style={S.giftName}>{g[1]}</Text><Text style={S.giftCost}>{g[2]} 💎</Text></View>)}</View><Btn title="استعراض الغرف" onPress={()=>go('rooms')}/></>);
  if(page==='profile')return layout('الملف الشخصي',<>{myProfile}<Btn title="💼 محفظة النقاط والأرباح" onPress={()=>go('earningsWallet')}/><Text style={S.label}>الاسم</Text><TextInput style={S.input} value={name} onChangeText={setName}/><Text style={S.label}>الصورة الرمزية</Text><View style={S.giftGrid}>{AVATARS.map(a=><TouchableOpacity key={a} style={S.avatarChoice} onPress={()=>setAvatar(a)}><Text style={{fontSize:29}}>{a}</Text></TouchableOpacity>)}</View><Btn title="حفظ الاسم على Firebase" onPress={async()=>{try{await saveProfile(user,name.trim());Alert.alert('تم الحفظ')}catch(e){Alert.alert('خطأ',e.message)}}}/>{__DEV__&&<View style={S.panel}><Text style={S.title}>👑 معاينة المالك فقط</Text><Text style={S.muted}>زر غير محمي ويجب إزالته قبل النشر. لا يجوز منح رصيد مالي من التطبيق.</Text><Btn title={ownerDemo?'إيقاف معاينة المالك':'تفعيل 100,000,000 تجريبية'} color="#946e2c" onPress={toggleOwnerDemo}/></View>}<View style={S.panel}><Text style={S.title}>🚫 الحسابات المحظورة ({blockedUsers.length})</Text>{blockedUsers.length===0?<Text style={S.muted}>لا توجد حسابات محظورة</Text>:blockedUsers.map(uid=><View key={uid} style={{marginBottom:9}}><Text style={S.muted}>المستخدم: {uid.slice(0,14)}...</Text><Btn title="إلغاء الحظر" color="#7040a7" onPress={()=>unblockUser(uid)}/></View>)}</View><Text style={S.muted}>حذف الحساب في هذه النسخة غير شامل للمحادثات والبلاغات القديمة، ويجب تشغيل خدمة حذف بيانات كاملة قبل إطلاق التطبيق للعامة.</Text><Btn title="حذف حسابي" color="#96334f" onPress={deleteAccount}/><Btn title="تسجيل الخروج" color="#555" onPress={logout}/></>);
  if(page==='games')return layout('الألعاب',<View style={S.card}><Text style={S.title}>🎰 Greedy Star</Text><Text style={S.muted}>الماسات والنتائج هنا تجريبية</Text><Btn title="العب الآن" onPress={()=>{resetGame();go('game')}}/></View>);
  if(page==='game')return <View style={S.starPage}>
    <StatusBar barStyle="light-content"/>
    <View style={S.starTopBar}><TouchableOpacity onPress={leaveGame} style={S.starClose}><Text style={S.starCloseText}>×</Text></TouchableOpacity><Text style={S.starRules} onPress={()=>Alert.alert('قواعد اللعبة','محاكاة للتطوير فقط. ثماني خانات، ويمكن اختيار ست خانات كحد أقصى. لا توجد أموال أو جوائز قابلة للسحب.')}>📜 قاعدة</Text><View style={S.starBrand}><Text style={S.starBrandText}>Greedy Star</Text></View><Text style={S.starRound}>جولة تجريبية</Text></View>
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
    {activeRoom?.id&&user?.uid&&<View style={mini?{position:'absolute',width:1,height:1,overflow:'hidden',opacity:0,pointerEvents:'none'}:StyleSheet.absoluteFillObject}><RoomFailureBoundary key={activeRoom.id} label="الغرفة" onExit={()=>{setActiveRoom(null);setMini(false)}}><Room key={activeRoom.id} room={activeRoom} userId={user.uid} username={name||'مستخدم'} avatar={avatar} equipped={equipped} diamonds={available} onSendGift={sendGift} onBet={spend}
      onCredit={prize=>{if(auth().currentUser?.uid===user.uid)setBalance({...walletRef.current,welcome:walletRef.current.welcome+prize});}} minimized={mini} onRestore={()=>setMini(false)} onMinimize={()=>setMini(true)} onExit={()=>{setActiveRoom(null);setMini(false)}}/></RoomFailureBoundary></View>}
    {mini&&activeRoom&&<TouchableOpacity accessibilityLabel="تكبير الغرفة" onPress={()=>setMini(false)} style={{position:'absolute',right:12,bottom:72,width:86,height:86,backgroundColor:'#412951',borderRadius:14,borderWidth:2,borderColor:GOLD,justifyContent:'center',alignItems:'center'}}><Text>🎙️</Text><Text numberOfLines={2} style={S.white}>{activeRoom.name}</Text></TouchableOpacity>}
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
  hostSeat:{alignSelf:'center',alignItems:'center',paddingVertical:5,paddingHorizontal:18,maxWidth:'82%'},
  hostCrown:{width:72,height:72,borderWidth:2,borderColor:'#ffe2a4',borderRadius:36,backgroundColor:'#745292',alignItems:'center',justifyContent:'center'},
  hostCrownText:{fontSize:29,color:'#ffe2a4'},hostSeatName:{fontWeight:'900',color:'#fff',marginTop:2,fontSize:14},hostSeatRole:{color:'#ffe2a4',fontSize:11},
  roomTop:{paddingHorizontal:10,paddingTop:8,paddingBottom:5,backgroundColor:'#15102bea',borderBottomColor:'#4c3469',borderBottomWidth:1},
  roomTopRow:{flexDirection:'row',alignItems:'center',gap:8},roomIdentity:{flex:1,alignItems:'center'},roomName:{fontSize:17,fontWeight:'900',color:'#fff'},roomType:{color:'#dac7ef',fontSize:11},
  roomToolbar:{flexDirection:'row',justifyContent:'center',flexWrap:'wrap',gap:6,paddingTop:4},
  homeHero:{backgroundColor:'#342158',borderWidth:1,borderColor:'#76559d',borderRadius:23,padding:20,alignItems:'flex-end',marginBottom:10},
  homeBrand:{color:'#ffe2a4',fontSize:13,fontWeight:'900',letterSpacing:2},homeTitle:{fontSize:27,color:'#fff',fontWeight:'900',marginVertical:5},homeSubtitle:{color:'#ded0f0',fontSize:14},
  navItem:{minWidth:64,minHeight:46,justifyContent:'center',alignItems:'center',borderRadius:13,paddingHorizontal:8},navActive:{backgroundColor:'#57377a'},
  navIcon:{fontSize:20},navLabel:{fontSize:11,color:'#efe3ff',fontWeight:'700'},

  starPage:{flex:1,backgroundColor:'#ffbd66'},starTopBar:{backgroundColor:'#f9a64a',paddingTop:Platform.OS==='ios'?45:12,paddingBottom:9,paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},starClose:{width:27,height:27,borderRadius:14,backgroundColor:'#d96229',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#fff2c7'},starCloseText:{color:'white',fontSize:23,fontWeight:'900',lineHeight:24},starRules:{color:'#8b4d0c',fontWeight:'900',fontSize:12,backgroundColor:'#ffe093',padding:6,borderRadius:14},starBrand:{backgroundColor:'#14a66b',borderRadius:7,borderWidth:2,borderColor:'#f5ef8e',paddingHorizontal:9,paddingVertical:5},starBrandText:{color:'white',fontWeight:'900',fontSize:19},starRound:{color:'#9a4c12',fontSize:10,fontWeight:'800'},starScroll:{paddingHorizontal:10,paddingBottom:32,alignItems:'stretch'},starWheel:{width:326,height:326,alignSelf:'center',marginTop:7,marginBottom:3,position:'relative'},starWheelRing:{position:'absolute',width:244,height:244,left:41,top:41,borderRadius:122,borderWidth:15,borderColor:'#f28c22',backgroundColor:'#eaa14e',shadowColor:'#a8470c',shadowOpacity:.5,shadowRadius:10,elevation:7},starFood:{position:'absolute',width:78,height:78,borderRadius:39,backgroundColor:'#f99a35',borderWidth:4,borderColor:'#ffdf70',alignItems:'center',justifyContent:'center',elevation:4},starFoodLit:{backgroundColor:'#e8f38e',borderColor:'#1cc46a',borderWidth:5},starFoodEmoji:{fontSize:28},starFoodLabel:{color:'#a4480e',fontWeight:'900',fontSize:10},starStake:{color:'#7b290b',fontSize:9,fontWeight:'900'},starCenter:{position:'absolute',top:114,left:114,width:98,height:98,borderRadius:49,backgroundColor:'#02ad70',borderWidth:7,borderColor:'#ffda49',alignItems:'center',justifyContent:'center',elevation:9},starCenterTop:{fontSize:11,color:'white',fontWeight:'900'},starCenterTime:{fontSize:29,color:'#fff64c',fontWeight:'900'},starBanner:{backgroundColor:'#0ca66b',borderWidth:3,borderColor:'#ffdf7a',borderRadius:7,padding:7,marginTop:3},starBannerText:{color:'white',fontWeight:'900',textAlign:'center',fontSize:13},starBetTray:{flexDirection:'row',justifyContent:'space-between',backgroundColor:'#b65b1c',padding:6,borderRadius:12,marginTop:7,borderWidth:3,borderColor:'#ffe49c'},starBetChip:{backgroundColor:'#fff6df',borderRadius:8,paddingVertical:10,paddingHorizontal:4,minWidth:'18%',alignItems:'center',borderWidth:2,borderColor:'#f5b75a'},starBetActive:{backgroundColor:'#ffe15c',borderColor:'#00aa72'},starBetText:{fontSize:11,fontWeight:'900',color:'#8a4a1b'},starInfoRow:{flexDirection:'row',gap:5,marginTop:9},starInfoPill:{flex:1,backgroundColor:'#e88c25',borderRadius:24,borderWidth:2,borderColor:'#fff0a2',alignItems:'center',justifyContent:'center',paddingVertical:7},starInfoText:{fontSize:10,color:'white',fontWeight:'800'},starInfoValue:{fontSize:14,color:'white',fontWeight:'900'},starBottomStrip:{flexDirection:'row',justifyContent:'space-around',marginTop:10,marginBottom:8,backgroundColor:'#d16e25',borderRadius:16,paddingVertical:7},starMiniFood:{width:30,height:30,borderRadius:15,backgroundColor:'#fff5d6',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#f6c45b'},starDisclaimer:{color:'#7d3b0d',fontSize:11,textAlign:'center',marginTop:8,fontWeight:'700'},

  choiceWrap:{flexDirection:'row',flexWrap:'wrap',marginVertical:5},choice:{paddingHorizontal:10,paddingVertical:10,borderRadius:12,backgroundColor:'#32245b',margin:3,borderWidth:1,borderColor:'#4e4770'},choiceActive:{backgroundColor:'#7c2866',borderColor:GOLD},
  page:{flex:1,backgroundColor:'#170b2c'},gamePage:{flex:1,backgroundColor:'#7d391d'},content:{padding:16,paddingBottom:40},white:{color:'white',fontWeight:'700'},gold:{color:GOLD,fontWeight:'900'},muted:{color:'#c5bdd3',marginVertical:8,lineHeight:19},title:{color:'white',fontSize:19,fontWeight:'900',marginVertical:10},label:{color:'white',fontWeight:'800',marginTop:13,marginBottom:6},logo:{color:'white',fontSize:52,fontWeight:'900',textAlign:'center',marginTop:46},big:{color:GOLD,fontSize:28,fontWeight:'900',marginVertical:9},input:{backgroundColor:'white',color:'#111',padding:13,borderRadius:12,marginVertical:5},btn:{padding:13,borderRadius:12,alignItems:'center',marginVertical:6,minWidth:82},small:{paddingVertical:8,paddingHorizontal:10,borderRadius:10,marginHorizontal:3,alignItems:'center',justifyContent:'center'},header:{paddingTop:48,paddingBottom:15,paddingHorizontal:12,backgroundColor:'#2c104b',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},headerTitle:{color:'white',fontWeight:'900',fontSize:17},nav:{backgroundColor:'#260d45',flexDirection:'row',justifyContent:'space-around',paddingVertical:15},banner:{backgroundColor:PINK,padding:19,borderRadius:16,marginBottom:12},card:{backgroundColor:'#321752',padding:18,borderRadius:16,alignItems:'center',marginVertical:9},panel:{backgroundColor:'#302051',padding:14,borderRadius:13,marginVertical:9},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',flexWrap:'wrap'},shop:{backgroundColor:'#302051',padding:12,borderRadius:12,marginBottom:8,flexDirection:'row',alignItems:'center'},avatarChoice:{backgroundColor:'#321752',padding:10,margin:5,borderRadius:10},hostSettingsShade:{flex:1,backgroundColor:'rgba(0,0,0,.65)',justifyContent:'flex-end'},hostSettingsPanel:{backgroundColor:'#2a1b43',padding:18,paddingBottom:34,borderTopLeftRadius:24,borderTopRightRadius:24},hostSettingsHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},hostSettingsGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-around',marginVertical:16},hostSettingsItem:{width:'44%',minHeight:105,backgroundColor:'#3d2c5d',borderRadius:18,marginBottom:12,alignItems:'center',justifyContent:'center',padding:12},hostSettingsIcon:{fontSize:32,color:'#f4d28c',marginBottom:10},room:{flex:1},miniRoom:{flex:1,backgroundColor:'#291d43',justifyContent:'center',padding:25,gap:18},audioBackdrop:{...StyleSheet.absoluteFillObject,overflow:'hidden'},blueGlow:{position:'absolute',top:-150,left:-180,width:500,height:500,borderRadius:250,backgroundColor:'#7951ae',opacity:.46},royalGlow:{position:'absolute',bottom:-100,right:-170,width:460,height:460,borderRadius:230,backgroundColor:'#d0a34f',opacity:.22},bgOrnament:{position:'absolute',top:'48%',alignSelf:'center',fontSize:45,color:'#d6b66a',opacity:.16},bgCrown:{position:'absolute',top:'35%',alignSelf:'center',fontSize:155,color:'white',opacity:.08},videoBlank:{...StyleSheet.absoluteFillObject,backgroundColor:'#142246',alignItems:'center',justifyContent:'center',padding:20},liveHeader:{paddingTop:49,paddingBottom:9,paddingHorizontal:11,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(0,17,48,.65)'},tiny:{color:'#d2e1fa',fontSize:10,textAlign:'center',fontWeight:'600'},liveTag:{backgroundColor:PINK,borderRadius:17,padding:9},avatars:{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:8,backgroundColor:'rgba(0,18,47,.35)'},guestAvatar:{width:59,height:58,borderRadius:13,borderWidth:1,borderColor:GOLD,backgroundColor:'rgba(4,27,70,.85)',marginRight:8,alignItems:'center',justifyContent:'center'},videoControls:{flexDirection:'row',justifyContent:'center',marginTop:8},pip:{position:'absolute',bottom:205,right:12,width:142,borderRadius:13,borderWidth:2,borderColor:GOLD,backgroundColor:'#24375d',padding:5,alignItems:'center',zIndex:8},pipPreview:{height:112,width:'100%',backgroundColor:'#364d77',borderRadius:8,alignItems:'center',justifyContent:'center'},callPanel:{position:'absolute',top:175,left:12,right:12,backgroundColor:'#11264b',borderWidth:1,borderColor:GOLD,padding:15,borderRadius:15,alignItems:'center',zIndex:20},seatHeading:{color:GOLD,fontSize:18,fontWeight:'900',textAlign:'center',marginTop:20,marginBottom:18},seatGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',paddingHorizontal:12},seatItem:{width:'24%',alignItems:'center',marginBottom:20},throne:{width:52,height:54,borderWidth:2,borderColor:'#f3d392',borderRadius:24,backgroundColor:'#4a2c6a',alignItems:'center',justifyContent:'center',shadowColor:'#e5c080',shadowOpacity:.55,shadowRadius:13,elevation:7},throneCrown:{position:'absolute',top:-19,fontSize:25,color:GOLD},seatGem:{position:'absolute',bottom:-10,fontSize:14,color:'#fce7b6'},seatRequest:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',backgroundColor:'#16396c',padding:8,marginHorizontal:12,marginBottom:5,borderRadius:12},actions:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:9,marginBottom:5},chat:{maxHeight:125,minHeight:45,marginHorizontal:9,marginBottom:5},bubble:{backgroundColor:'rgba(0,20,56,.82)',borderRadius:10,padding:8,alignSelf:'flex-start',marginTop:4},composer:{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingTop:8,paddingBottom:Platform.OS==='ios'?20:10,backgroundColor:'rgba(0,18,51,.94)'},composerGift:{width:43,height:43,borderRadius:22,backgroundColor:'#235398',alignItems:'center',justifyContent:'center',marginRight:7},messageInput:{flex:1,height:43,borderRadius:22,backgroundColor:'#1b3d78',color:'white',paddingHorizontal:14,textAlign:'right'},sendButton:{width:43,height:43,borderRadius:22,backgroundColor:PINK,justifyContent:'center',alignItems:'center',marginLeft:7},giftDrawer:{position:'absolute',bottom:Platform.OS==='ios'?78:63,left:8,right:8,height:260,padding:9,borderRadius:18,borderWidth:1,borderColor:'#578ad7',backgroundColor:'#0d265c',zIndex:25,elevation:15},drawerHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:9},giftGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',paddingBottom:10},giftTile:{width:'19%',height:72,marginBottom:7,borderRadius:9,backgroundColor:'#21498d',alignItems:'center',justifyContent:'center',padding:2},giftName:{color:'white',fontSize:9,fontWeight:'800',textAlign:'center'},giftCost:{color:GOLD,fontSize:9},fxOverlay:{...StyleSheet.absoluteFillObject,zIndex:100,elevation:100,alignItems:'center',justifyContent:'center'},fxCenter:{alignItems:'center',justifyContent:'center'},fxIcon:{fontSize:112,textAlign:'center'},fxSpark:{color:GOLD,fontSize:28,textAlign:'center',textShadowColor:'#fff5bb',textShadowRadius:10},fxFire:{fontSize:75,textAlign:'center'},wheel:{width:296,height:296,borderRadius:148,borderWidth:8,borderColor:GOLD,backgroundColor:'#b16a29',alignSelf:'center',marginVertical:24,position:'relative'},slot:{position:'absolute',width:64,height:64,borderRadius:32,backgroundColor:'#ffc970',borderWidth:2,borderColor:'white',alignItems:'center',justifyContent:'center'},slotLit:{backgroundColor:'#78ed8e',borderColor:'#00f74e',borderWidth:4},slotLabel:{fontSize:10,color:'#51240c',fontWeight:'900'},wheelMiddle:{position:'absolute',left:99,top:99,width:82,height:82,borderRadius:41,backgroundColor:'#079e52',borderWidth:4,borderColor:GOLD,alignItems:'center',justifyContent:'center'}
});


import React, {
  useState,
  useEffect,
  useRef
} from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
  Share,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Dimensions
} from 'react-native';

const { width: SW } = Dimensions.get('window');

const FOOD = [
  ['🥕','جزر',5],
  ['🦐','جمبري',10],
  ['🥦','بروكلي',5],
  ['🥩','لحم',15],
  ['🥬','خضار ورقية',5],
  ['🍗','ستيك',25],
  ['🌽','ذرة',5],
  ['🐟','سمك',45]
];

const GIFTS = [
  ['🌹','وردة',10],
  ['💖','قلب',50],
  ['🎂','كيكة',100],
  ['🧸','دبدوب',300],
  ['💍','خاتم',500],
  ['🚗','سيارة',1000],
  ['🚀','صاروخ',2500],
  ['👑','تاج ملكي',5000],
  ['🏰','قصر',10000],
  ['🐉','تنين أسطوري',25000]
];

const GOODS = [
  ['🖼️','إطار فضي',250,'frame'],
  ['💜','إطار ملكي',1200,'frame'],
  ['👑','إطار أسطوري',5000,'frame'],
  ['🚙','دخول بسيارة',1500,'ride'],
  ['🏎️','دخول بسيارة رياضية',4000,'ride'],
  ['🚀','دخول بصاروخ',9000,'ride'],
  ['✨','دخول مميز',800,'entry'],
  ['🌟','دخول VIP',3000,'entry']
];

const COUNTRIES = [
  ['🇯🇴 الأردن','+962'],
  ['🇸🇦 السعودية','+966'],
  ['🇦🇪 الإمارات','+971'],
  ['🇪🇬 مصر','+20'],
  ['🇱🇧 لبنان','+961'],
  ['🇸🇾 سوريا','+963'],
  ['🇮🇶 العراق','+964'],
  ['🇵🇸 فلسطين','+970']
];

const AVATARS = [
  '👤','😎','👩','👨',
  '🧑','👸','🤴','🦁',
  '🐼','🦊','🌸','⭐'
];

const LEVELS = [
  0,100,500,1500,4000,10000,
  25000,50000,100000,250000,
  500000,1000000
];

const PINK = '#f03473';
const GOLD = '#ffe26d';

function Button({
  label,
  onPress,
  color=PINK,
  disabled=false
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {backgroundColor:disabled?'#777':color}
      ]}
    >
      <Text style={styles.buttonText}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function levelFor(value) {
  let result=1;
  LEVELS.forEach((n,i)=>{
    if(value>=n) result=i+1;
  });
  return result;
}

export default function App() {

  const [screen,setScreen]=useState('login');
  const [name,setName]=useState('Walid');
  const [phone,setPhone]=useState('');
  const [country,setCountry]=useState(0);
  const [showCountries,setShowCountries]=useState(false);
  const [accepted,setAccepted]=useState(false);

  const [uid]=useState(
    ()=>String(Math.floor(10000000+Math.random()*90000000))
  );
  const [avatar,setAvatar]=useState('👤');
  const [diamonds,setDiamonds]=useState(5010);
  const [support,setSupport]=useState(0);
  const [inventory,setInventory]=useState([]);
  const [equipped,setEquipped]=useState({
    frame:'',
    ride:'',
    entry:''
  });

  const [rooms,setRooms]=useState([]);
  const [roomName,setRoomName]=useState('غرفتي');
  const [roomType,setRoomType]=useState('audio');
  const [roomPassword,setRoomPassword]=useState('');
  const [joinPassword,setJoinPassword]=useState('');
  const [pendingRoom,setPendingRoom]=useState(null);
  const [roomId,setRoomId]=useState(null);
  const [role,setRole]=useState('owner');

  const [message,setMessage]=useState('');
  const [messages,setMessages]=useState([]);
  const [giftOpen,setGiftOpen]=useState(false);
  const [lastGift,setLastGift]=useState(null);
  const [giftVisible,setGiftVisible]=useState(false);

  const [bets,setBets]=useState({});
  const [betAmount,setBetAmount]=useState(10);
  const [seconds,setSeconds]=useState(30);
  const [phase,setPhase]=useState('betting');
  const [highlight,setHighlight]=useState(-1);
  const [win,setWin]=useState(null);
  const [history,setHistory]=useState([]);

  const [roomMenu,setRoomMenu]=useState(false);

  const balanceRef=useRef(5010);
  const betsRef=useRef({});
  const phaseRef=useRef('betting');
  const screenRef=useRef('login');
  const spinTimer=useRef(null);
  const resultTimer=useRef(null);
  const spinning=useRef(false);
  const giftAnimation=useRef(
    new Animated.Value(0)
  ).current;

  const room=rooms.find(r=>r.id===roomId);
  const isOwner=role==='owner';

  const go=p=>{
    screenRef.current=p;
    setScreen(p);
  };

  const setBalance=n=>{
    balanceRef.current=n;
    setDiamonds(n);
  };

  const changePhase=p=>{
    phaseRef.current=p;
    setPhase(p);
  };

  const updateRoom=changes=>{
    setRooms(previous=>previous.map(r=>
      r.id===roomId?{...r,...changes}:r
    ));
  };

  const resetGame=()=>{
    clearTimeout(spinTimer.current);
    clearTimeout(resultTimer.current);
    spinning.current=false;
    betsRef.current={};
    setBets({});
    setSeconds(30);
    setHighlight(-1);
    setWin(null);
    changePhase('betting');
  };

  const startGame=()=>{
    resetGame();
    go('game');
  };

  const leaveGame=()=>{
    if(phaseRef.current==='spinning'){
      Alert.alert('انتظر','العجلة تدور الآن');
      return;
    }
    if(phaseRef.current==='betting'){
      const refund=Object.values(betsRef.current)
        .reduce((a,b)=>a+b,0);
      setBalance(balanceRef.current+refund);
    }
    resetGame();
    go('games');
  };

  const placeBet=i=>{
    if(phaseRef.current!=='betting')return;

    if(
      !betsRef.current[i] &&
      Object.keys(betsRef.current).length>=6
    ){
      Alert.alert('تنبيه','الحد الأقصى 6 خانات');
      return;
    }

    if(balanceRef.current<betAmount){
      Alert.alert('رصيد غير كافٍ');
      return;
    }

    const next={
      ...betsRef.current,
      [i]:(betsRef.current[i]||0)+betAmount
    };

    betsRef.current=next;
    setBets(next);
    setBalance(balanceRef.current-betAmount);
  };

  const spin=()=>{
    if(
      phaseRef.current!=='betting' ||
      spinning.current
    )return;

    spinning.current=true;
    changePhase('spinning');

    const placed={...betsRef.current};
    const winner=Math.floor(Math.random()*8);
    const steps=40+winner;
    let step=0;

    const tick=()=>{
      if(screenRef.current!=='game')return;

      if(step>=steps){
        const payout=(placed[winner]||0)*FOOD[winner][2];
        setBalance(balanceRef.current+payout);
        setHighlight(winner);
        setWin({food:FOOD[winner],payout});
        setHistory(old=>[
          {food:FOOD[winner],payout},
          ...old
        ].slice(0,12));
        changePhase('result');

        resultTimer.current=setTimeout(()=>{
          if(screenRef.current==='game')resetGame();
        },3000);
        return;
      }

      setHighlight(step%8);
      step++;
      spinTimer.current=setTimeout(
        tick,
        step>35?220:step>25?130:70
      );
    };
    tick();
  };

  useEffect(()=>{
    if(screen!=='game'||phase!=='betting')return;
    const t=setInterval(()=>{
      setSeconds(v=>Math.max(0,v-1));
    },1000);
    return ()=>clearInterval(t);
  },[screen,phase]);

  useEffect(()=>{
    if(
      screen==='game' &&
      phase==='betting' &&
      seconds===0
    )spin();
  },[screen,phase,seconds]);

  useEffect(()=>()=>{
    clearTimeout(spinTimer.current);
    clearTimeout(resultTimer.current);
  },[]);

  const login=()=>{
    if(!name.trim()||phone.replace(/\D/g,'').length<7){
      Alert.alert('أدخل اسمك ورقم هاتف صحيح');
      return;
    }
    if(!accepted){
      Alert.alert('وافق على الشروط أولاً');
      return;
    }
    go('home');
  };

  const createRoom=()=>{
    if(!roomName.trim()){
      Alert.alert('أدخل اسم الغرفة');
      return;
    }

    const newRoom={
      id:String(Date.now()).slice(-7),
      name:roomName.trim(),
      type:roomType,
      password:roomPassword.trim(),
      owner:uid,
      seats:Array(8).fill(null),
      seatsLocked:false,
      seatRequests:[],
      guest:null,
      guestLocked:false,
      guestRequests:[]
    };

    setRooms(old=>[newRoom,...old]);
    setRoomId(newRoom.id);
    setRole('owner');
    setMessages([]);
    setGiftOpen(false);
    go('room');
  };

  const enterRoom=r=>{
    if(r.password){
      setPendingRoom(r);
      setJoinPassword('');
      go('password');
    }else{
      setRoomId(r.id);
      setRole('owner');
      setMessages([]);
      setGiftOpen(false);
      go('room');
    }
  };

  const verifyPassword=()=>{
    if(!pendingRoom)return;
    if(joinPassword!==pendingRoom.password){
      Alert.alert('كلمة المرور غير صحيحة');
      return;
    }
    setRoomId(pendingRoom.id);
    setRole('owner');
    setMessages([]);
    setGiftOpen(false);
    setPendingRoom(null);
    go('room');
  };

  const leaveRoom=()=>{
    setGiftOpen(false);
    setRoomMenu(false);
    setRoomId(null);
    go('rooms');
  };

  const seatPress=index=>{
    if(!room)return;

    const seats=[...room.seats];
    const current=seats[index];
    const myId=isOwner?uid:'demo-visitor';

    if(current){
      if(current.id===myId){
        seats[index]=null;
        updateRoom({seats});
      }else{
        Alert.alert('المقعد مشغول');
      }
      return;
    }

    if(seats.some(s=>s&&s.id===myId)){
      Alert.alert('أنت جالس على كرسي آخر');
      return;
    }

    if(room.seatsLocked&&!isOwner){
      if(room.seatRequests.some(r=>r.userId===myId)){
        Alert.alert('طلبك قيد الانتظار');
        return;
      }

      updateRoom({
        seatRequests:[
          ...room.seatRequests,
          {
            userId:myId,
            userName:'زائر تجريبي',
            index
          }
        ]
      });
      Alert.alert('تم إرسال طلب الكرسي');
      return;
    }

    seats[index]={
      id:myId,
      name:isOwner?name:'زائر تجريبي',
      avatar:isOwner?avatar:'😎'
    };
    updateRoom({seats});
  };

  const answerSeat=(request,approve)=>{
    if(!room||!isOwner)return;

    const remaining=room.seatRequests.filter(
      r=>!(r.userId===request.userId&&r.index===request.index)
    );

    if(!approve){
      updateRoom({seatRequests:remaining});
      return;
    }

    const seats=[...room.seats];

    if(
      seats[request.index] ||
      seats.some(s=>s&&s.id===request.userId)
    ){
      updateRoom({seatRequests:remaining});
      Alert.alert('المقعد لم يعد متاحًا');
      return;
    }

    seats[request.index]={
      id:request.userId,
      name:request.userName,
      avatar:'😎'
    };

    updateRoom({
      seats,
      seatRequests:remaining
    });
  };

  const requestGuest=()=>{
    if(!room||isOwner)return;
    if(room.guest){
      Alert.alert('يوجد ضيف بالفعل');
      return;
    }
    if(room.guestLocked){
      Alert.alert('طلبات الصعود مغلقة');
      return;
    }
    if(room.guestRequests.some(r=>r.userId==='demo-visitor')){
      Alert.alert('طلبك قيد الانتظار');
      return;
    }

    updateRoom({
      guestRequests:[
        ...room.guestRequests,
        {
          userId:'demo-visitor',
          userName:'زائر تجريبي'
        }
      ]
    });
    Alert.alert('تم إرسال طلب الصعود');
  };

  const answerGuest=(request,approve)=>{
    if(!room||!isOwner)return;

    const remaining=room.guestRequests.filter(
      r=>r.userId!==request.userId
    );

    if(!approve){
      updateRoom({guestRequests:remaining});
      return;
    }

    if(room.guest){
      Alert.alert('مقعد الضيف مشغول');
      return;
    }

    updateRoom({
      guest:{
        id:request.userId,
        name:request.userName
      },
      guestRequests:remaining
    });
  };

  const sendMessage=()=>{
    if(!message.trim())return;

    setMessages(old=>[
      ...old,
      {
        id:String(Date.now())+Math.random(),
        text:(isOwner?name:'زائر تجريبي')+
          ': '+message.trim()
      }
    ]);
    setMessage('');
  };

  const sendGift=g=>{
    if(!room){
      Alert.alert('افتح غرفة أولاً');
      return;
    }
    if(balanceRef.current<g[2]){
      Alert.alert('رصيد غير كافٍ');
      return;
    }

    setBalance(balanceRef.current-g[2]);
    setSupport(n=>n+g[2]);
    setLastGift(g);
    setGiftVisible(true);
    setGiftOpen(false);

    giftAnimation.stopAnimation();
    giftAnimation.setValue(0);

    Animated.sequence([
      Animated.timing(giftAnimation,{
        toValue:1,
        duration:500,
        useNativeDriver:true
      }),
      Animated.delay(1000),
      Animated.timing(giftAnimation,{
        toValue:0,
        duration:350,
        useNativeDriver:true
      })
    ]).start(()=>setGiftVisible(false));

    setMessages(old=>[
      ...old,
      {
        id:String(Date.now())+Math.random(),
        text:'🎁 '+(isOwner?name:'زائر تجريبي')+
          ' أرسل '+g[1]
      }
    ]);
  };

  const buy=item=>{
    if(inventory.includes(item[1])){
      Alert.alert('هذه الأداة مملوكة بالفعل');
      return;
    }
    if(balanceRef.current<item[2]){
      Alert.alert('رصيد غير كافٍ');
      return;
    }
    setBalance(balanceRef.current-item[2]);
    setInventory(old=>[...old,item[1]]);
    Alert.alert('تم الشراء','يمكن تفعيل الأداة من المتجر');
  };

  const header=(title,back=()=>go('home'))=>(
    <View style={styles.header}>
      <TouchableOpacity onPress={back}>
        <Text style={styles.white}>❮ رجوع</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={()=>go('store')}>
        <Text style={styles.gold}>💎 {diamonds}</Text>
      </TouchableOpacity>
    </View>
  );

  const nav=()=>(
    <View style={styles.nav}>
      {[
        ['🏠','home'],
        ['🎮','games'],
        ['🎁','gifts'],
        ['🛒','store'],
        ['👤','profile']
      ].map(([icon,p])=>(
        <TouchableOpacity key={p} onPress={()=>go(p)}>
          <Text style={{fontSize:23}}>{icon}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const wrap=(title,content,back)=>(
    <View style={styles.page}>
      <StatusBar barStyle="light-content"/>
      {header(title,back)}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {content}
      </ScrollView>
      {nav()}
    </View>
  );

  const roleControls=(
    <View style={styles.roleBar}>
      <Text style={styles.smallWhite}>
        محاكاة الصلاحيات:
      </Text>
      <TouchableOpacity
        style={[
          styles.roleButton,
          isOwner&&{backgroundColor:'#b38b37'}
        ]}
        onPress={()=>setRole('owner')}
      >
        <Text style={styles.white}>👑 أدمن</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.roleButton,
          !isOwner&&{backgroundColor:'#008d84'}
        ]}
        onPress={()=>setRole('visitor')}
      >
        <Text style={styles.white}>👤 زائر</Text>
      </TouchableOpacity>
    </View>
  );

  const audioSeat=(index)=> {
    const occupant=room?.seats[index];

    return (
      <TouchableOpacity
        key={index}
        style={styles.audioSeatItem}
        onPress={()=>seatPress(index)}
      >
        <View style={[
          styles.chairCircle,
          occupant&&styles.chairOccupied
        ]}>
          <Text style={styles.chairSymbol}>
            {occupant?occupant.avatar:'🛋️'}
          </Text>
        </View>
        <Text style={styles.seatLabel} numberOfLines={1}>
          {occupant
            ?occupant.name
            :'المقعد '+(index+1)}
        </Text>
        {room?.seatsLocked&&!occupant&&(
          <Text style={styles.lockLabel}>🔒</Text>
        )}
      </TouchableOpacity>
    );
  };

  const audioRoom=(
    <View style={styles.audioBackground}>
      <View style={styles.audioTop}>
        <Text style={styles.audioTitle}>
          🎙️ {room?.name}
        </Text>
        <Text style={styles.audioSub}>
          ID {room?.id} {room?.password?'🔒':''}
        </Text>
      </View>

      <View style={styles.hostRow}>
        <View style={styles.hostBadge}>
          <Text style={{fontSize:28}}>{avatar}</Text>
          <Text style={styles.hostName}>{name}</Text>
          <Text style={styles.hostTag}>👑 صاحب الغرفة</Text>
        </View>
      </View>

      <View style={styles.seatRows}>
        <View style={styles.seatRow}>
          {[0,1,2,3].map(audioSeat)}
        </View>
        <View style={styles.seatRow}>
          {[4,5,6,7].map(audioSeat)}
        </View>
      </View>

      <View style={styles.audioEmptyArea}>
        <Text style={styles.roomHint}>
          اضغط على المقعد للجلوس أو طلب الصعود
        </Text>
      </View>
    </View>
  );

  const videoRoom=(
    <View style={styles.videoBackground}>
      <View style={styles.videoHostCenter}>
        <Text style={styles.videoBigAvatar}>{avatar}</Text>
        <Text style={styles.videoHostName}>{name}</Text>
        <Text style={styles.videoCaption}>
          📹 بث فيديو تجريبي
        </Text>
        <Text style={styles.videoCaption}>
          تظهر صورة المذيع هنا حتى ربط الكاميرا
        </Text>
      </View>

      {room?.guest&&(
        <View style={styles.guestWindow}>
          <Text style={{fontSize:42}}>😎</Text>
          <Text style={styles.guestText}>
            {room.guest.name}
          </Text>
          <Text style={styles.guestText}>🎤 ضيف</Text>
        </View>
      )}

      {!isOwner&&!room?.guest&&(
        <TouchableOpacity
          style={styles.requestGuestButton}
          onPress={requestGuest}
        >
          <Text style={styles.white}>
            🎤 طلب الصعود مع المذيع
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const giftPanel=(
    <View style={styles.floatingGiftPanel}>
      <View style={styles.giftPanelHeader}>
        <Text style={styles.white}>🎁 صندوق الهدايا</Text>
        <TouchableOpacity onPress={()=>setGiftOpen(false)}>
          <Text style={styles.white}>✕ إغلاق</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={{maxHeight:250}}>
        <View style={styles.giftGrid}>
          {GIFTS.map((g,i)=>(
            <TouchableOpacity
              key={i}
              style={styles.giftItem}
              onPress={()=>sendGift(g)}
            >
              <Text style={{fontSize:35}}>{g[0]}</Text>
              <Text style={styles.giftName}>{g[1]}</Text>
              <Text style={styles.gold}>💎 {g[2]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const chatBar=(
    <View style={styles.chatBar}>
      <TextInput
        style={styles.chatInput}
        value={message}
        onChangeText={setMessage}
        placeholder="اكتب رسالة..."
        placeholderTextColor="#777"
        returnKeyType="send"
        onSubmitEditing={sendMessage}
      />
      <TouchableOpacity
        style={styles.sendButton}
        onPress={sendMessage}
      >
        <Text style={styles.white}>➤</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.giftButton}
        onPress={()=>setGiftOpen(v=>!v)}
      >
        <Text style={{fontSize:27}}>🎁</Text>
      </TouchableOpacity>
    </View>
  );

  if(screen==='login')return(
    <View style={styles.page}>
      <StatusBar barStyle="light-content"/>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>Clipi</Text>
        <Text style={styles.muted}>
          عالم البث المباشر والألعاب
        </Text>

        <Text style={styles.label}>اسم المستخدم</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="الاسم"
        />

        <Text style={styles.label}>الدولة</Text>
        <Button
          label={COUNTRIES[country].join(' ')}
          color="#52327c"
          onPress={()=>setShowCountries(!showCountries)}
        />

        {showCountries&&COUNTRIES.map((c,i)=>(
          <Button
            key={i}
            label={c.join(' ')}
            color="#392050"
            onPress={()=>{
              setCountry(i);
              setShowCountries(false);
            }}
          />
        ))}

        <Text style={styles.label}>رقم الهاتف</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="رقم الهاتف"
        />

        <Button
          label={accepted?'☑ أوافق على الشروط':'☐ أوافق على الشروط'}
          color="#52327c"
          onPress={()=>setAccepted(!accepted)}
        />
        <Button
          label="قراءة الشروط"
          color="#52327c"
          onPress={()=>go('terms')}
        />
        <Button
          label="تسجيل الدخول"
          onPress={login}
        />
        <Button
          label="🌐 Google"
          color="#4285f4"
          onPress={()=>Alert.alert('يتطلب ربط Google OAuth')}
        />
        <Button
          label="📘 Facebook"
          color="#1877f2"
          onPress={()=>Alert.alert('يتطلب ربط Facebook OAuth')}
        />
      </ScrollView>
    </View>
  );

  if(screen==='terms')return wrap(
    'الشروط والأحكام',
    <>
      <Text style={styles.white}>
        هذه نسخة تجريبية من Clipi. الماسات والهدايا
        والرهانات افتراضية ولا يمكن تحويلها إلى أموال.
        الغرف والحماية والرسائل محلية ولا تتصل بمستخدمين
        حقيقيين. يجب استكمال الخدمات وسياسة الخصوصية
        قبل النشر.
      </Text>
      <Button
        label="أوافق"
        onPress={()=>{
          setAccepted(true);
          go('login');
        }}
      />
    </>,
    ()=>go('login')
  );

  if(screen==='home')return wrap(
    'Clipi',
    <>
      <View style={styles.banner}>
        <Text style={styles.title}>أهلاً {name} 👋</Text>
        <Text style={styles.white}>
          عالم Clipi للبث والألعاب والهدايا
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={{fontSize:60}}>{avatar}</Text>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.gold}>ID: {uid}</Text>
        <Text style={styles.white}>
          🏅 مستوى الدعم {levelFor(support)}
        </Text>
        <Text style={styles.gold}>💎 {diamonds}</Text>
      </View>

      <Button
        label="🎤 إنشاء غرفة صوتية"
        onPress={()=>{
          setRoomType('audio');
          go('create');
        }}
      />
      <Button
        label="📹 إنشاء بث فيديو"
        onPress={()=>{
          setRoomType('video');
          go('create');
        }}
      />
      <Button
        label="🚪 استعراض الغرف"
        color="#7139b5"
        onPress={()=>go('rooms')}
      />
      <Button
        label="🎮 Greedy Star"
        color="#7139b5"
        onPress={()=>go('games')}
      />
      <Button
        label="🛒 المتجر"
        color="#7139b5"
        onPress={()=>go('store')}
      />
      <Button
        label="📤 مشاركة"
        color="#7139b5"
        onPress={()=>Share.share({message:'Clipi'})}
      />
    </>
  );

  if(screen==='create')return wrap(
    'إنشاء غرفة',
    <>
      <Text style={styles.label}>اسم الغرفة</Text>
      <TextInput
        style={styles.input}
        value={roomName}
        onChangeText={setRoomName}
      />
      <Text style={styles.label}>نوع الغرفة</Text>
      <View style={styles.row}>
        <Button
          label="🎤 صوت"
          color={roomType==='audio'?PINK:'#543577'}
          onPress={()=>setRoomType('audio')}
        />
        <Button
          label="📹 فيديو"
          color={roomType==='video'?PINK:'#543577'}
          onPress={()=>setRoomType('video')}
        />
      </View>
      <Text style={styles.label}>
        كلمة مرور الغرفة (اختيارية)
      </Text>
      <TextInput
        style={styles.input}
        value={roomPassword}
        onChangeText={setRoomPassword}
        secureTextEntry
        placeholder="اتركها فارغة للغرفة العامة"
      />
      <Button label="فتح الغرفة" onPress={createRoom}/>
    </>
  );

  if(screen==='rooms')return wrap(
    'الغرف',
    <>
      <Button label="➕ إنشاء غرفة" onPress={()=>go('create')}/>
      {rooms.length===0?(
        <Text style={styles.muted}>لا توجد غرف بعد</Text>
      ):rooms.map(r=>(
        <TouchableOpacity
          key={r.id}
          style={styles.panel}
          onPress={()=>enterRoom(r)}
        >
          <Text style={styles.title}>
            {r.type==='audio'?'🎤':'📹'} {r.name}
            {r.password?' 🔒':''}
          </Text>
          <Text style={styles.gold}>ID: {r.id}</Text>
          <Text style={styles.white}>اضغط للدخول</Text>
        </TouchableOpacity>
      ))}
    </>,
    ()=>go('home')
  );

  if(screen==='password')return wrap(
    'غرفة مقفلة',
    <>
      <Text style={styles.title}>🔒 {pendingRoom?.name}</Text>
      <TextInput
        style={styles.input}
        value={joinPassword}
        onChangeText={setJoinPassword}
        secureTextEntry
        placeholder="كلمة المرور"
      />
      <Button label="دخول" onPress={verifyPassword}/>
    </>,
    ()=>go('rooms')
  );

  if(screen==='room')return(
    <KeyboardAvoidingView
      style={styles.roomPage}
      behavior={Platform.OS==='ios'?'padding':undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content"/>

      <View style={styles.roomHeader}>
        <TouchableOpacity onPress={leaveRoom}>
          <Text style={styles.white}>✕</Text>
        </TouchableOpacity>

        <View style={{alignItems:'center'}}>
          <Text style={styles.white}>{room?.name}</Text>
          <Text style={styles.smallWhite}>
            {room?.type==='audio'?'🎤 صوت':'📹 فيديو'}
            {'  '}ID: {room?.id}
          </Text>
        </View>

        <TouchableOpacity onPress={()=>setRoomMenu(v=>!v)}>
          <Text style={styles.white}>⋮</Text>
        </TouchableOpacity>
      </View>

      {roleControls}

      <View style={{flex:1}}>
        {room?.type==='audio'?audioRoom:videoRoom}

        {roomMenu&&(
          <View style={styles.roomMenu}>
            <Text style={styles.title}>⚙️ إعدادات الغرفة</Text>

            {isOwner&&room?.type==='audio'&&(
              <Button
                label={room.seatsLocked?'🔓 فتح المقاعد':'🔒 إغلاق المقاعد'}
                onPress={()=>{
                  updateRoom({seatsLocked:!room.seatsLocked});
                }}
              />
            )}

            {isOwner&&room?.type==='video'&&(
              <>
                <Button
                  label={room.guestLocked?'🔓 فتح طلبات الضيوف':'🔒 إغلاق طلبات الضيوف'}
                  onPress={()=>{
                    updateRoom({guestLocked:!room.guestLocked});
                  }}
                />
                {room.guest&&(
                  <Button
                    label="⬇️ إنزال الضيف"
                    color="#a42e4e"
                    onPress={()=>updateRoom({guest:null})}
                  />
                )}
              </>
            )}

            {isOwner&&room?.seatRequests.map((request,i)=>(
              <View key={i} style={styles.requestCard}>
                <Text style={styles.white}>
                  🔔 {request.userName} يطلب الكرسي {request.index+1}
                </Text>
                <View style={styles.row}>
                  <Button
                    label="قبول"
                    color="#168a50"
                    onPress={()=>answerSeat(request,true)}
                  />
                  <Button
                    label="رفض"
                    color="#c12b48"
                    onPress={()=>answerSeat(request,false)}
                  />
                </View>
              </View>
            ))}

            {isOwner&&room?.guestRequests.map((request,i)=>(
              <View key={i} style={styles.requestCard}>
                <Text style={styles.white}>
                  🔔 {request.userName} يطلب الصعود
                </Text>
                <View style={styles.row}>
                  <Button
                    label="قبول"
                    color="#168a50"
                    onPress={()=>answerGuest(request,true)}
                  />
                  <Button
                    label="رفض"
                    color="#c12b48"
                    onPress={()=>answerGuest(request,false)}
                  />
                </View>
              </View>
            ))}

            <Button
              label="إغلاق القائمة"
              color="#555"
              onPress={()=>setRoomMenu(false)}
            />
          </View>
        )}

        <View style={styles.messagesOverlay}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{padding:8}}
          >
            {messages.slice(-15).map(m=>(
              <Text key={m.id} style={styles.roomMessage}>
                {m.text}
              </Text>
            ))}
          </ScrollView>
        </View>

        {giftOpen&&giftPanel}

        {giftVisible&&lastGift&&(
          <Animated.View
            pointerEvents="none"
            style={[
              styles.giftAnimation,
              {
                opacity:giftAnimation,
                transform:[{
                  scale:giftAnimation.interpolate({
                    inputRange:[0,1],
                    outputRange:[0.4,1.2]
                  })
                }]
              }
            ]}
          >
            <Text style={{fontSize:85}}>{lastGift[0]}</Text>
            <Text style={styles.title}>{lastGift[1]}</Text>
            <Text style={styles.gold}>💎 {lastGift[2]}</Text>
          </Animated.View>
        )}
      </View>

      {chatBar}
    </KeyboardAvoidingView>
  );

  if(screen==='profile')return wrap(
    'الملف الشخصي',
    <>
      <View style={styles.panel}>
        <Text style={{fontSize:65}}>{avatar}</Text>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.gold}>ID: {uid}</Text>
        <Text style={styles.white}>
          🏅 مستوى الدعم {levelFor(support)}
        </Text>
        <Text style={styles.gold}>
          مجموع الدعم: {support} 💎
        </Text>
        {equipped.frame?(
          <Text style={styles.gold}>✨ {equipped.frame}</Text>
        ):null}
        {equipped.ride?(
          <Text style={styles.gold}>🚘 {equipped.ride}</Text>
        ):null}
        {equipped.entry?(
          <Text style={styles.gold}>🌟 {equipped.entry}</Text>
        ):null}
      </View>

      <Text style={styles.label}>تغيير الاسم</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>الصورة الرمزية</Text>
      <View style={styles.grid}>
        {AVATARS.map(a=>(
          <TouchableOpacity
            key={a}
            style={[
              styles.avatarOption,
              avatar===a&&{borderColor:GOLD,borderWidth:2}
            ]}
            onPress={()=>setAvatar(a)}
          >
            <Text style={{fontSize:30}}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button
        label="حفظ التعديلات"
        onPress={()=>Alert.alert('تم الحفظ مؤقتًا')}
      />

      <Text style={styles.title}>🏅 مستويات الدعم</Text>
      {LEVELS.map((v,i)=>(
        <Text
          key={i}
          style={[
            styles.level,
            support>=v&&{color:GOLD}
          ]}
        >
          المستوى {i+1} — {v.toLocaleString()} 💎
          {support>=v?' ✓':''}
        </Text>
      ))}

      <Button
        label="تسجيل الخروج"
        color="#555"
        onPress={()=>go('login')}
      />
    </>
  );

  if(screen==='store')return wrap(
    'متجر Clipi',
    <>
      <Text style={styles.title}>💎 رصيدك: {diamonds}</Text>
      <Text style={styles.title}>
        الإطارات والسيارات والدخول المميز
      </Text>

      {GOODS.map((g,i)=>(
        <View key={i} style={styles.shopRow}>
          <Text style={{fontSize:31}}>{g[0]}</Text>
          <View style={{flex:1,marginHorizontal:10}}>
            <Text style={styles.white}>{g[1]}</Text>
            <Text style={styles.gold}>💎 {g[2]}</Text>
          </View>
          <TouchableOpacity
            style={styles.miniButton}
            onPress={()=>{
              if(!inventory.includes(g[1])){
                buy(g);
              }else{
                setEquipped(old=>({
                  ...old,
                  [g[3]]:old[g[3]]===g[1]?'':g[1]
                }));
              }
            }}
          >
            <Text style={styles.white}>
              {!inventory.includes(g[1])
                ?'شراء'
                :equipped[g[3]]===g[1]
                  ?'إزالة'
                  :'تفعيل'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.title}>باقات الماسات</Text>
      {[
        [100,'$0.99'],
        [500,'$4.99'],
        [1200,'$9.99'],
        [6500,'$49.99'],
        [14000,'$99.99']
      ].map((p,i)=>(
        <View key={i} style={styles.shopRow}>
          <Text style={styles.gold}>💎 {p[0]}</Text>
          <Text style={styles.white}> {p[1]} </Text>
          <Button
            label="شراء"
            onPress={()=>Alert.alert(
              'الدفع غير مفعل',
              'يحتاج ربط Google Play Billing'
            )}
          />
        </View>
      ))}

      <Text style={styles.title}>🪙 الدفع بعملة Pi</Text>
      <Text style={styles.muted}>غير مفعل حاليًا.</Text>
    </>
  );

  if(screen==='gifts')return wrap(
    'الهدايا',
    <>
      <Text style={styles.title}>🎁 هدايا الدعم</Text>
      <View style={styles.giftGrid}>
        {GIFTS.map((g,i)=>(
          <TouchableOpacity
            key={i}
            style={styles.giftItem}
            onPress={()=>{
              if(!room){
                Alert.alert('افتح غرفة أولاً');
              }else{
                sendGift(g);
              }
            }}
          >
            <Text style={{fontSize:35}}>{g[0]}</Text>
            <Text style={styles.giftName}>{g[1]}</Text>
            <Text style={styles.gold}>💎 {g[2]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Button
        label="استعراض الغرف"
        onPress={()=>go('rooms')}
      />
    </>
  );

  if(screen==='games')return wrap(
    'الألعاب',
    <View style={styles.panel}>
      <Text style={styles.title}>🎰 Greedy Star</Text>
      <Text style={styles.muted}>
        8 خانات ومضاعفات من ×5 إلى ×45
      </Text>
      <Button label="العب الآن" onPress={startGame}/>
    </View>
  );

  if(screen==='game')return(
    <View style={styles.gamePage}>
      {header('Greedy Star',leaveGame)}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title,{textAlign:'center'}]}>
          ⭐ GREEDY STAR ⭐
        </Text>
        <Text style={[styles.gold,{textAlign:'center'}]}>
          {phase==='betting'
            ?'الوقت: '+seconds
            :phase==='spinning'
              ?'العجلة تدور...'
              :'نتيجة الجولة'}
        </Text>

        <View style={styles.wheel}>
          {FOOD.map((f,i)=>{
            const angle=(i*45-90)*Math.PI/180;
            return(
              <TouchableOpacity
                key={i}
                disabled={phase!=='betting'}
                onPress={()=>placeBet(i)}
                style={[
                  styles.slot,
                  {
                    left:112+Math.cos(angle)*99,
                    top:112+Math.sin(angle)*99
                  },
                  highlight===i&&styles.slotActive
                ]}
              >
                <Text style={{fontSize:25}}>{f[0]}</Text>
                <Text style={styles.slotText}>{f[1]}</Text>
                <Text style={styles.slotText}>×{f[2]}</Text>
                {bets[i]>0&&(
                  <Text style={styles.slotBet}>{bets[i]}💎</Text>
                )}
              </TouchableOpacity>
            );
          })}
          <View style={styles.wheelCenter}>
            <Text style={{fontSize:28}}>⭐</Text>
            <Text style={styles.white}>
              {phase==='betting'?seconds:'WIN'}
            </Text>
          </View>
        </View>

        {win&&(
          <View style={styles.panel}>
            <Text style={styles.title}>
              {win.food[0]} {win.food[1]}
            </Text>
            <Text style={styles.gold}>
              {win.payout>0
                ?'ربحت '+win.payout+' 💎'
                :'لم تربح هذه الجولة'}
            </Text>
          </View>
        )}

        <Text style={styles.title}>قيمة الرهان</Text>
        <View style={styles.amountRow}>
          {[10,100,500,1000,10000].map(n=>(
            <TouchableOpacity
              key={n}
              onPress={()=>setBetAmount(n)}
              style={[
                styles.amountButton,
                betAmount===n&&{borderColor:GOLD,borderWidth:2}
              ]}
            >
              <Text style={styles.white}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.gold}>
          الرهانات: {Object.values(bets).reduce((a,b)=>a+b,0)} 💎
        </Text>

        <Button
          label={
            phase==='betting'
              ?'ابدأ الجولة'
              :phase==='spinning'
                ?'جاري الدوران'
                :'الجولة التالية قريبًا'
          }
          color="#087e42"
          disabled={phase!=='betting'}
          onPress={spin}
        />

        <Text style={styles.muted}>
          العجلة تدور تلقائيًا حتى بدون رهان.
        </Text>

        <Text style={styles.title}>آخر النتائج</Text>
        {history.map((h,i)=>(
          <Text key={i} style={styles.white}>
            {h.food[0]} {h.food[1]} — {h.payout} 💎
          </Text>
        ))}
      </ScrollView>
    </View>
  );

  return null;
}

const styles=StyleSheet.create({
  page:{
    flex:1,
    backgroundColor:'#15072d'
  },
  gamePage:{
    flex:1,
    backgroundColor:'#7d391d'
  },
  content:{
    padding:16,
    paddingBottom:40
  },
  header:{
    paddingTop:48,
    paddingBottom:15,
    paddingHorizontal:12,
    backgroundColor:'#290d4a',
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between'
  },
  headerTitle:{
    color:'#fff',
    fontSize:17,
    fontWeight:'bold'
  },
  white:{
    color:'#fff',
    fontWeight:'600'
  },
  gold:{
    color:GOLD,
    fontWeight:'bold'
  },
  muted:{
    color:'#cbbbdc',
    marginVertical:8
  },
  label:{
    color:'#fff',
    fontWeight:'bold',
    marginTop:14,
    marginBottom:6
  },
  input:{
    backgroundColor:'#fff',
    color:'#111',
    padding:13,
    borderRadius:10,
    marginVertical:5
  },
  button:{
    padding:13,
    borderRadius:12,
    alignItems:'center',
    marginVertical:6,
    minWidth:78
  },
  buttonText:{
    color:'#fff',
    fontWeight:'bold',
    textAlign:'center'
  },
  logo:{
    color:'#fff',
    fontSize:48,
    fontWeight:'900',
    textAlign:'center',
    marginTop:40,
    marginBottom:15
  },
  title:{
    color:'#fff',
    fontSize:19,
    fontWeight:'bold',
    marginVertical:9
  },
  panel:{
    backgroundColor:'#321651',
    padding:18,
    borderRadius:15,
    marginVertical:9,
    alignItems:'center'
  },
  banner:{
    backgroundColor:'#e73570',
    padding:20,
    borderRadius:15,
    marginBottom:14
  },
  nav:{
    backgroundColor:'#280d49',
    flexDirection:'row',
    justifyContent:'space-around',
    paddingVertical:16
  },
  row:{
    flexDirection:'row',
    justifyContent:'space-around',
    alignItems:'center',
    flexWrap:'wrap'
  },
  grid:{
    flexDirection:'row',
    flexWrap:'wrap',
    justifyContent:'space-around'
  },
  avatarOption:{
    padding:9,
    backgroundColor:'#321651',
    borderRadius:12,
    margin:5
  },
  level:{
    color:'#aaa',
    padding:9,
    backgroundColor:'#2a1641',
    marginVertical:3,
    borderRadius:7
  },
  shopRow:{
    flexDirection:'row',
    alignItems:'center',
    backgroundColor:'#30164e',
    padding:12,
    borderRadius:12,
    marginBottom:8
  },
  miniButton:{
    backgroundColor:PINK,
    padding:11,
    borderRadius:8
  },
  giftGrid:{
    flexDirection:'row',
    flexWrap:'wrap',
    justifyContent:'space-around'
  },
  giftItem:{
    width:'30%',
    alignItems:'center',
    backgroundColor:'#42236b',
    borderRadius:12,
    padding:9,
    marginBottom:9
  },
  giftName:{
    color:'#fff',
    fontSize:11,
    textAlign:'center',
    marginVertical:5
  },

  roomPage:{
    flex:1,
    backgroundColor:'#241c73'
  },
  roomHeader:{
    paddingTop:48,
    paddingBottom:12,
    paddingHorizontal:18,
    backgroundColor:'#3859d6',
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between'
  },
  smallWhite:{
    color:'#e8eaff',
    fontSize:11
  },
  roleBar:{
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-around',
    backgroundColor:'#344dc4',
    padding:5
  },
  roleButton:{
    backgroundColor:'#5063a9',
    paddingHorizontal:10,
    paddingVertical:6,
    borderRadius:15
  },

  audioBackground:{
    flex:1,
    backgroundColor:'#3c45cb'
  },
  audioTop:{
    paddingHorizontal:16,
    paddingTop:13
  },
  audioTitle:{
    color:'#fff',
    fontWeight:'bold',
    fontSize:17
  },
  audioSub:{
    color:'#d4ddff',
    fontSize:11,
    marginTop:4
  },
  hostRow:{
    alignItems:'flex-end',
    paddingHorizontal:18,
    marginTop:10
  },
  hostBadge:{
    alignItems:'center'
  },
  hostName:{
    color:'#fff',
    fontSize:12,
    fontWeight:'bold'
  },
  hostTag:{
    color:GOLD,
    fontSize:9
  },
  seatRows:{
    marginTop:10
  },
  seatRow:{
    flexDirection:'row',
    justifyContent:'space-evenly',
    marginBottom:16
  },
  audioSeatItem:{
    width:'23%',
    alignItems:'center'
  },
  chairCircle:{
    width:SW*0.18,
    height:SW*0.18,
    maxWidth:78,
    maxHeight:78,
    borderRadius:45,
    backgroundColor:'#6378ef',
    borderWidth:2,
    borderColor:'#7f93ff',
    alignItems:'center',
    justifyContent:'center',
    elevation:3
  },
  chairOccupied:{
    backgroundColor:'#304f9e',
    borderColor:GOLD
  },
  chairSymbol:{
    fontSize:32
  },
  seatLabel:{
    color:'#fff',
    fontSize:10,
    textAlign:'center',
    marginTop:6
  },
  lockLabel:{
    fontSize:11
  },
  audioEmptyArea:{
    flex:1,
    backgroundColor:'#3432a6',
    marginTop:10,
    paddingTop:20,
    alignItems:'center'
  },
  roomHint:{
    color:'#bfc5ff',
    fontSize:11
  },

  videoBackground:{
    flex:1,
    backgroundColor:'#10131d',
    position:'relative'
  },
  videoHostCenter:{
    flex:1,
    alignItems:'center',
    justifyContent:'center',
    backgroundColor:'#272f49'
  },
  videoBigAvatar:{
    fontSize:145
  },
  videoHostName:{
    color:'#fff',
    fontSize:23,
    fontWeight:'bold'
  },
  videoCaption:{
    color:'#c1c7d8',
    fontSize:12,
    marginTop:6
  },
  guestWindow:{
    position:'absolute',
    right:12,
    bottom:150,
    width:116,
    height:150,
    backgroundColor:'#404a68',
    borderWidth:2,
    borderColor:GOLD,
    borderRadius:12,
    alignItems:'center',
    justifyContent:'center',
    elevation:8
  },
  guestText:{
    color:'#fff',
    fontSize:11,
    fontWeight:'bold',
    textAlign:'center'
  },
  requestGuestButton:{
    position:'absolute',
    alignSelf:'center',
    bottom:155,
    backgroundColor:PINK,
    padding:12,
    borderRadius:22
  },

  roomMenu:{
    position:'absolute',
    top:8,
    right:8,
    left:8,
    zIndex:20,
    backgroundColor:'#30214e',
    padding:15,
    borderRadius:15,
    maxHeight:'75%',
    elevation:12
  },
  requestCard:{
    backgroundColor:'#432d5b',
    borderRadius:10,
    padding:10,
    marginVertical:5
  },

  messagesOverlay:{
    position:'absolute',
    bottom:12,
    left:10,
    width:'76%',
    maxHeight:140,
    backgroundColor:'rgba(20,18,60,0.28)',
    borderRadius:10
  },
  roomMessage:{
    color:'#fff',
    fontSize:12,
    marginVertical:3,
    backgroundColor:'rgba(0,0,0,0.25)',
    borderRadius:8,
    padding:5
  },

  chatBar:{
    flexDirection:'row',
    alignItems:'center',
    paddingHorizontal:9,
    paddingVertical:9,
    backgroundColor:'#242b70'
  },
  chatInput:{
    flex:1,
    backgroundColor:'#fff',
    color:'#111',
    borderRadius:23,
    paddingHorizontal:14,
    paddingVertical:10,
    minWidth:0
  },
  sendButton:{
    backgroundColor:PINK,
    padding:12,
    borderRadius:20,
    marginLeft:6
  },
  giftButton:{
    padding:6,
    marginLeft:3
  },

  floatingGiftPanel:{
    position:'absolute',
    left:8,
    right:8,
    bottom:5,
    zIndex:30,
    backgroundColor:'#291443',
    borderRadius:18,
    padding:12,
    borderWidth:1,
    borderColor:'#b99bff',
    elevation:15
  },
  giftPanelHeader:{
    flexDirection:'row',
    justifyContent:'space-between',
    marginBottom:10
  },
  giftAnimation:{
    position:'absolute',
    top:'28%',
    alignSelf:'center',
    backgroundColor:'#502577',
    borderWidth:3,
    borderColor:GOLD,
    borderRadius:25,
    padding:25,
    alignItems:'center',
    zIndex:40,
    elevation:20
  },

  wheel:{
    width:296,
    height:296,
    borderRadius:148,
    borderWidth:8,
    borderColor:GOLD,
    backgroundColor:'#b16a29',
    alignSelf:'center',
    marginVertical:24,
    position:'relative'
  },
  slot:{
    position:'absolute',
    width:64,
    height:64,
    borderRadius:32,
    backgroundColor:'#ffc970',
    borderWidth:2,
    borderColor:'#fff',
    alignItems:'center',
    justifyContent:'center'
  },
  slotActive:{
    backgroundColor:'#78ed8e',
    borderColor:'#00f74e',
    borderWidth:4
  },
  slotText:{
    fontSize:10,
    color:'#51240c',
    fontWeight:'bold'
  },
  slotBet:{
    fontSize:9,
    color:'#511199',
    fontWeight:'bold'
  },
  wheelCenter:{
    position:'absolute',
    left:99,
    top:99,
    width:82,
    height:82,
    borderRadius:41,
    backgroundColor:'#079e52',
    borderWidth:4,
    borderColor:GOLD,
    alignItems:'center',
    justifyContent:'center'
  },
  amountRow:{
    flexDirection:'row',
    justifyContent:'space-around',
    marginVertical:14
  },
  amountButton:{
    padding:10,
    backgroundColor:'#623716',
    borderRadius:8
  }
});

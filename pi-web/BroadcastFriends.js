import {ui as appText} from './interface-language.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,StyleSheet,Switch,Text,TouchableOpacity,View} from 'react-native';
import {theme} from './ClipiTheme';
import {accountLabels} from './AccountLabels';

const words={
  ar:['دعوة الأصدقاء','دعوة','إرسال الدعوات','حرية المايك','طلب','لا يوجد أصدقاء بعد','تمت الدعوة','انضمام'],
  en:['Invite friends','Invite','Send invitations','Open microphones','Request','No friends yet','Invited','Join'],
  fr:['Inviter des amis','Inviter','Envoyer les invitations','Micros libres','Demander','Aucun ami','Invité','Rejoindre'],
  es:['Invitar a amigos','Invitar','Enviar invitaciones','Micrófonos libres','Solicitar','Sin amigos','Invitado','Unirse'],
  de:['Freunde einladen','Einladen','Einladungen senden','Freie Mikrofone','Anfragen','Noch keine Freunde','Eingeladen','Beitreten'],
  pt:['Convidar amigos','Convidar','Enviar convites','Microfones livres','Solicitar','Sem amigos','Convidado','Entrar'],
  it:['Invita amici','Invita','Invia inviti','Microfoni liberi','Richiedi','Nessun amico','Invitato','Entra'],
  tr:['Arkadaşlarını davet et','Davet et','Davetleri gönder','Serbest mikrofon','İstek gönder','Henüz arkadaş yok','Davet edildi','Katıl'],
  ru:['Пригласить друзей','Пригласить','Отправить приглашения','Свободные микрофоны','Запросить','Пока нет друзей','Приглашён','Войти'],
  uk:['Запросити друзів','Запросити','Надіслати запрошення','Вільні мікрофони','Запит','Ще немає друзів','Запрошено','Приєднатися'],
  pl:['Zaproś znajomych','Zaproś','Wyślij zaproszenia','Wolne mikrofony','Poproś','Brak znajomych','Zaproszono','Dołącz'],
  nl:['Vrienden uitnodigen','Uitnodigen','Uitnodigingen versturen','Vrije microfoons','Aanvragen','Nog geen vrienden','Uitgenodigd','Deelnemen'],
  fa:['دعوت از دوستان','دعوت','ارسال دعوت‌ها','میکروفون آزاد','درخواست','هنوز دوستی ندارید','دعوت شد','پیوستن'],
  ur:['دوستوں کو دعوت دیں','دعوت','دعوتیں بھیجیں','آزاد مائیک','درخواست','ابھی کوئی دوست نہیں','مدعو کیا گیا','شامل ہوں'],
  he:['הזמנת חברים','הזמנה','שליחת הזמנות','מיקרופונים פתוחים','בקשה','אין חברים עדיין','הוזמן','הצטרפות'],
  hi:['दोस्तों को आमंत्रित करें','आमंत्रित करें','निमंत्रण भेजें','खुले माइक्रोफ़ोन','अनुरोध','अभी कोई दोस्त नहीं','आमंत्रित','जुड़ें'],
  bn:['বন্ধুদের আমন্ত্রণ','আমন্ত্রণ','আমন্ত্রণ পাঠান','খোলা মাইক','অনুরোধ','এখনও কোনো বন্ধু নেই','আমন্ত্রিত','যোগ দিন'],
  ta:['நண்பர்களை அழை','அழை','அழைப்புகளை அனுப்பு','திறந்த மைக்குகள்','கோரிக்கை','நண்பர்கள் இல்லை','அழைக்கப்பட்டது','சேர்'],
  id:['Undang teman','Undang','Kirim undangan','Mikrofon bebas','Minta','Belum ada teman','Diundang','Gabung'],
  ms:['Jemput rakan','Jemput','Hantar jemputan','Mikrofon bebas','Mohon','Belum ada rakan','Dijemput','Sertai'],
  fil:['Mag-imbita ng mga kaibigan','Imbitahan','Ipadala ang mga imbitasyon','Bukas na mikropono','Humiling','Wala pang kaibigan','Inimbitahan','Sumali'],
  vi:['Mời bạn bè','Mời','Gửi lời mời','Mic tự do','Yêu cầu','Chưa có bạn bè','Đã mời','Tham gia'],
  th:['เชิญเพื่อน','เชิญ','ส่งคำเชิญ','ไมค์อิสระ','ขอขึ้นไมค์','ยังไม่มีเพื่อน','เชิญแล้ว','เข้าร่วม'],
  ja:['友達を招待','招待','招待を送信','自由にマイクに参加','リクエスト','友達がいません','招待済み','参加'],
  ko:['친구 초대','초대','초대 보내기','자유 마이크','요청','친구가 없습니다','초대됨','참가'],
  sw:['Alika marafiki','Alika','Tuma mialiko','Mikrofoni huru','Omba','Hakuna marafiki bado','Amealikiwa','Jiunge'],
  el:['Πρόσκληση φίλων','Πρόσκληση','Αποστολή προσκλήσεων','Ελεύθερα μικρόφωνα','Αίτημα','Δεν υπάρχουν φίλοι','Προσκλήθηκε','Συμμετοχή'],
  ro:['Invită prieteni','Invită','Trimite invitații','Microfoane libere','Solicită','Încă nu ai prieteni','Invitat','Intră']
};
export function broadcastWords(locale){
  const [friends,invite,send,free,ask,empty,sent,join]=words[locale]||words.en;
  return {friends,invite,send,free,ask,empty,sent,join};
}
export function useStartInvites(enabled,act){
  const request=useRef(act),done=useRef(false);
  request.current=act;
  useEffect(()=>{
    if(!enabled||done.current)return;
    let active=true,timer;
    async function send(){
      try{await request.current('inviteAtStart');done.current=true}
      catch{if(active)timer=setTimeout(send,6000)}
    }
    send();
    return ()=>{active=false;clearTimeout(timer)};
  },[enabled]);
}
export function CircleChoice({label,checked,onPress,disabled}){
  return <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={label} aria-checked={checked}
    accessibilityState={{checked,disabled:!!disabled}} disabled={disabled} onPress={onPress} style={s.row}>
    <View style={[s.circle,checked&&s.selected]}>{checked&&<Text style={s.mark}>✓</Text>}</View>
    <Text style={s.text}>{label}</Text>
  </TouchableOpacity>;
}
export function MicFreedom({label,value,onChange,disabled}){
  return <View style={s.row}><Text style={s.text}>{label}</Text><Switch accessibilityLabel={label}
    disabled={disabled} value={value} onValueChange={onChange}/></View>;
}
function Action({label,onPress,disabled}){
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={s.action}>
    <Text style={[s.text,{color:disabled?theme.secondary:theme.accent}]}>{label}</Text></TouchableOpacity>;
}
export function RoomAdmins({act}){
  const [data,setData]=useState({admins:[],friends:[],next:null}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const active=useRef(false),locked=useRef(false),action=useRef(act);action.current=act;
  async function load(after=null,change=null){
    if(locked.current)return;
    locked.current=true;setBusy(true);setError('');
    try{
      if(change)await action.current('setRoomAdmin',change);
      const result=await action.current('roomAdmins',{after:after||''});
      if(active.current)setData(previous=>({...result,friends:after?[...previous.friends,...result.friends]:result.friends}));
    }catch(e){if(active.current)setError(e.message||'تعذّر تحديث القائمة');}
    finally{locked.current=false;if(active.current)setBusy(false);}
  }
  useEffect(()=>{active.current=true;void load();return ()=>{active.current=false;};},[]);
  const ids=new Set(data.admins.map(row=>row.uid));
  return <View style={{gap:8}}>
    <Text style={s.text}>{appText('أدمن الغرفة')}</Text>
    {data.admins.map(row=><Action key={row.uid} disabled={busy} label={row.name+' · '+appText('إزالة الصلاحية')} onPress={()=>load(null,{uid:row.uid,enabled:false})}/>)}
    <Text style={s.text}>{appText('تعيين أدمن')}</Text>
    {data.friends.filter(row=>!ids.has(row.uid)).map(row=><Action key={row.uid} disabled={busy} label={row.name} onPress={()=>load(null,{uid:row.uid,enabled:true})}/>)}
    {!busy&&!error&&!data.next&&data.friends.every(row=>ids.has(row.uid))&&<Text style={s.text}>{appText('ليس لديك أصدقاء متاحون للتعيين')}</Text>}
    {!!error&&<Text accessibilityLiveRegion="polite" style={s.text}>{appText(error)}</Text>}
    {(data.next||error)&&<Action disabled={busy} label={appText(data.next?'عرض المزيد':'إعادة المحاولة')} onPress={()=>load(data.next)}/>}
  </View>;
}

export function FriendPicker({act,locale}){
  const copy=broadcastWords(locale),menu=accountLabels[locale]||accountLabels.en;
  const [rows,setRows]=useState([]),[selected,setSelected]=useState([]),[next,setNext]=useState(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
  const request=useRef(act),lock=useRef(false),mounted=useRef(false);request.current=act;
  async function load(cursor){
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');
    try{
      const data=await request.current('inviteChoices',{after:cursor||''});
      if(mounted.current){setRows(prev=>cursor?[...prev,...data.friends]:data.friends);setNext(data.next);setLoaded(true)}
    }catch(e){if(mounted.current)setError(e.message)}
    finally{lock.current=false;if(mounted.current)setBusy(false)}
  }
  useEffect(()=>{mounted.current=true;load(null);return ()=>{mounted.current=false}},[]);
  async function send(){
    if(lock.current||!selected.length)return;
    lock.current=true;setBusy(true);setError('');
    try{
      const result=await request.current('inviteFriends',{uids:selected});
      if(mounted.current){
        const sent=new Set(result.invited);
        setRows(list=>list.map(p=>sent.has(p.uid)?{...p,invited:true}:p));setSelected([]);
      }
    }catch(e){if(mounted.current)setError(e.message)}
    finally{lock.current=false;if(mounted.current)setBusy(false)}
  }
  return <View>{loaded&&!rows.length&&<Text style={s.text}>{copy.empty}</Text>}
    {rows.map(p=><CircleChoice key={p.uid} label={p.name+(p.invited?' · '+copy.sent:'')} checked={!!p.invited||selected.includes(p.uid)}
      disabled={busy||!!p.invited} onPress={()=>setSelected(list=>list.includes(p.uid)?list.filter(uid=>uid!==p.uid):[...list,p.uid])}/>)}
    {!!error&&<Text accessibilityLiveRegion="polite" style={s.text}>{appText(error)}</Text>}
    {busy&&<ActivityIndicator/>}
    {(!loaded&&!!error||next)&&<Action label={next?(menu.more||'…'):menu.retry} disabled={busy} onPress={()=>load(next)}/>}
    {rows.length>0&&<Action label={copy.send} disabled={busy||!selected.length} onPress={send}/>}
  </View>;
}

export function InviteInbox({request,onJoin,locale,blocked,roomId}){
  const [items,setItems]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const handled=useRef(new Set()),lock=useRef(false),mounted=useRef(false);
  const copy=broadcastWords(locale),menu=accountLabels[locale]||accountLabels.en;
  const current=items.find(item=>item.room!==roomId&&!blocked.includes(item.sender)&&!handled.current.has(item.room));
  useEffect(()=>{
    mounted.current=true;let active=true,timer;
    async function refresh(){
      try{const data=await request('/account-number',{op:'roomInviteInbox'});if(active)setItems(data.invitations||[])}catch{}
      if(active)timer=setTimeout(refresh,20000);
    }
    refresh();return ()=>{mounted.current=false;active=false;clearTimeout(timer)};
  },[request]);
  async function respond(join){
    if(!current||lock.current)return;
    lock.current=true;setBusy(true);setError('');
    try{
      if(join)await onJoin(current.room);
      await request('/account-number',{op:'dismissRoomInvite',room:current.room});
      handled.current.add(current.room);
      if(mounted.current)setItems(list=>list.filter(i=>i.room!==current.room));
    }catch(e){if(mounted.current)setError(e.message)}
    finally{lock.current=false;if(mounted.current)setBusy(false)}
  }
  if(!current)return null;
  return <View style={s.inbox}><Text accessibilityLiveRegion="polite" style={s.text}>{copy.invite} · {current.name} · {current.title}</Text>
    {!!error&&<Text style={s.text}>{appText(error)}</Text>}<View style={s.row}>
    <Action label={copy.join} disabled={busy} onPress={()=>respond(true)}/>
    <Action label={menu.back} disabled={busy} onPress={()=>respond(false)}/></View></View>;
}
const s=StyleSheet.create({
  row:{minHeight:44,flexDirection:'row',gap:8,alignItems:'center'},text:{color:theme.ink,fontSize:14,fontWeight:'600',flexShrink:1},
  circle:{width:19,height:19,borderRadius:10,borderWidth:1.5,borderColor:theme.secondary,justifyContent:'center',alignItems:'center'},
  selected:{borderColor:theme.accent},mark:{color:theme.accent,fontSize:13,fontWeight:'800'},
  action:{minHeight:44,justifyContent:'center',paddingHorizontal:6},inbox:{position:'absolute',left:12,right:12,bottom:86,padding:12,
    borderRadius:14,backgroundColor:theme.paper,borderWidth:1,borderColor:theme.line,elevation:8,zIndex:40}
});

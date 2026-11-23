import {PolicyModal} from './PolicySheet';
import React,{useEffect,useRef,useState} from 'react';
import {FlatList,Image,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import VideoTapSurface from './VideoTapSurface';
import {Player,starters,shareShort,saveShort,nonce,pickShort,uploadFile,releaseDraft} from './ShortMedia';
import {RoomGiftSheet} from './RoomControls';

const redHeart=require('./assets/actions/like-on.png');
const samples=[{id:'palace',title:'القصر'},{id:'aurora',title:'الشفق'},{id:'dunes',title:'الكثبان'}];
const asVideo=(item,endpoint)=>starters[item.id]||endpoint+'/shorts/media/'+item.id;
const identity=x=>x;
const copy={title:'صندوق الهدايا',close:'إغلاق',balance:'الماس المشترى',wallet:'المحفظة',shop:'شراء الماس',send:'إرسال'};

function Button({label,onPress,children,disabled=false,selected}){
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,selected}} disabled={disabled} onPress={onPress} style={s.button}>
    {children||<Text style={s.label}>{label}</Text>}
  </Pressable>;
}
function Panel({onClose,children}){
  return <Modal transparent animationType="slide" onRequestClose={onClose}>
    <View style={s.scrim}><View style={s.panel}><Button label="إغلاق" onPress={onClose}/>{children}</View></View>
  </Modal>;
}
function Clip({item,endpoint,request,gifts,onWallet,onShop,playable,onReport}){
  const [stats,setStats]=useState(null),[dialog,setDialog]=useState(''),[message,setMessage]=useState('');
  const [muted,setMuted]=useState(true);
  const [comments,setComments]=useState([]),[text,setText]=useState(''),[balance,setBalance]=useState(null);
  const alive=useRef(true),lock=useRef(false),revision=useRef(0),pending=useRef(null),commentSeq=useRef(0);
  const source=asVideo(item,endpoint);
  const api=(op,body={})=>request('/account-number',{op,clip:item.id,...body});
  useEffect(()=>{
    alive.current=true;
    const version=revision.current;
    api('shortState').then(v=>{if(alive.current&&version===revision.current)setStats(v);}).catch(()=>{});
    return ()=>{alive.current=false;};
  },[item.id]);
  async function like(wanted,onConfirmed){
    if(lock.current)return;
    if(stats?.liked===wanted){onConfirmed?.();return;}
    lock.current=true;revision.current++;setMessage('');
    try{
      const next=await api('shortLike',{liked:wanted});
      if(alive.current){setStats(next);if(next.liked===wanted)onConfirmed?.();}
    }catch{if(alive.current)setMessage('تعذّر حفظ الإعجاب. حاول مرة ثانية');}
    finally{lock.current=false;}
  }
  async function run(fn){
    try{await fn();}catch(e){if(alive.current&&e.name!=='AbortError')setMessage(e.message||'تعذّرت العملية');}
  }
  function openComments(){
    setDialog('comments');setMessage('');
    const version=++commentSeq.current;
    void run(async()=>{const v=await api('shortComments');if(alive.current&&version===commentSeq.current)setComments(v.comments);});
  }
  async function submit(kind,value,callback){
    if(lock.current)return;
    lock.current=true;setMessage('');
    if(pending.current?.kind!==kind||pending.current.value!==value)pending.current={kind,value,nonce:nonce()};
    try{
      const key=pending.current.nonce;
      const result=await api(kind,{nonce:key,...(kind==='shortGift'?{gift:value}:{body:value})});
      pending.current=null;
      if(alive.current)callback(result);
    }catch(e){if(alive.current)setMessage(e.message||'تعذّر الإرسال');}
    finally{lock.current=false;}
  }
  function openGifts(){setDialog('gift');setMessage('');void run(async()=>{const v=await request('/account-number',{op:'wallet'});if(alive.current)setBalance(v.diamonds);});}
  return <View style={s.fill}>
    <Player source={source} active={playable&&!dialog} muted={muted}/>
    <VideoTapSurface clipId={item.id} onDoubleTap={confirm=>like(true,confirm)}/>
    <View style={s.audio}><Button label={muted?'تشغيل الصوت':'كتم الصوت'} onPress={()=>setMuted(v=>!v)}><Text style={s.count}>{muted?'تشغيل الصوت':'كتم الصوت'}</Text></Button></View>
    <View style={s.rail}>
      <Button label="إهداء الفيديو" onPress={openGifts}><Text style={s.icon}>🎁</Text></Button>
      <Button label={stats?.liked?'إلغاء الإعجاب':'إعجاب'} selected={!!stats?.liked} onPress={()=>like(!stats?.liked)}>
        {stats?.liked?<Image source={redHeart} style={s.heart}/>:<Text style={s.icon}>♡</Text>}
        {stats!==null&&<Text style={s.count}>{stats.likes}</Text>}
      </Button>
      <Button label="التعليقات" onPress={openComments}><Text style={s.icon}>✎</Text></Button>
      <Button label="مشاركة الفيديو" onPress={()=>run(()=>shareShort(endpoint+'/#short='+item.id))}><Text style={s.icon}>↗</Text></Button>
      <Button label="تنزيل الفيديو" onPress={()=>run(()=>saveShort(item.id,source))}><Text style={s.icon}>↓</Text></Button>
      {onReport&&<Button label="الإبلاغ عن المقطع أو تعليق" onPress={()=>onReport(item.id)}><Text style={s.count}>إبلاغ</Text></Button>}
    </View>
    <View pointerEvents="none" style={s.caption}>{!!item.title&&<Text style={s.label}>{item.title}</Text>}
      {!!message&&!dialog&&<Text accessibilityLiveRegion="polite" style={s.label}>{message}</Text>}</View>
    {dialog==='comments'&&<Panel onClose={()=>setDialog('')}>
      <Text style={s.lightTitle}>التعليقات</Text>
      <ScrollView keyboardShouldPersistTaps="handled">{comments.map(c=><Text style={s.comment} key={c.id}>{c.body}</Text>)}</ScrollView>
      {!!message&&<Text style={s.label}>{message}</Text>}
      <TextInput value={text} maxLength={450} onChangeText={setText} placeholder="اكتب تعليقك" placeholderTextColor="#aaa" style={s.input}/>
      <Button label="إرسال" disabled={!text.trim()} onPress={()=>submit('shortComment',text.trim(),v=>{commentSeq.current++;setComments(v.comments);setText('');})}/>
    </Panel>}
    {dialog==='gift'&&<RoomGiftSheet visible gifts={gifts} allLabel="الكل" translate={identity} copy={copy}
      recipient={item.title||'الفيديو'} balance={balance} onWallet={onWallet} onShop={onShop} onClose={()=>setDialog('')}
      onSend={gift=>submit('shortGift',gift[1],()=>{setDialog('');setMessage('تم إرسال الهدية');})}>
      <Text style={s.label}>{message||'دعم للمقطع بالماس المشترى. الهدية ما إلها عائد نقدي لصاحب الفيديو.'}</Text>
    </RoomGiftSheet>}
  </View>;
}

export function ShortVideoHome({playable=true,dock,onRooms,endpoint,request,gifts,onWallet,onShop,initialId,onReport}){
  const [items,setItems]=useState(samples),[active,setActive]=useState(0),[height,setHeight]=useState(0),[error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const page=useRef(null),loading=useRef(false),mounted=useRef(true);
  useEffect(()=>{
    let current=true;mounted.current=true;
    (async()=>{
      try{
        const {clips}=await request('/account-number',{op:'shortList'});
        if(!current)return;
        page.current=clips.length===30?clips.at(-1).cursor:null;
        const all=[...clips,...samples];
        const selected=all.find(c=>c.id===initialId);
        if(initialId&&!selected&&/^[0-9a-f-]{36}$/i.test(initialId))all.unshift({id:initialId,title:''});
        else if(selected)all.unshift(...all.splice(all.indexOf(selected),1));
        setActive(0);setItems(all);setError('');
      }catch{if(current)setError('تعذّر تحميل المقاطع الجديدة');}
    })();
    return ()=>{current=false;mounted.current=false;};
  },[retry,initialId]);
  async function more(){
    if(!page.current||loading.current)return;
    loading.current=true;
    try{
      const {clips}=await request('/account-number',{op:'shortList',before:page.current});
      if(!mounted.current)return;
      page.current=clips.length===30?clips.at(-1).cursor:null;
      setItems(old=>old.concat(clips.filter(c=>!old.some(x=>x.id===c.id))));
    }catch{if(mounted.current)setError('تعذّر تحميل المقاطع الجديدة');}
    finally{loading.current=false;}
  }
  const visible=useRef(({viewableItems})=>{const i=viewableItems.find(v=>v.isViewable)?.index;if(i!=null)setActive(i);}).current;
  const visibility=useRef({itemVisiblePercentThreshold:55}).current;
  return <View style={s.screen}><View style={s.screen} onLayout={e=>setHeight(Math.round(e.nativeEvent.layout.height))}>
    {height>0&&<FlatList data={items} extraData={active} keyExtractor={x=>x.id} pagingEnabled snapToInterval={height} decelerationRate="fast"
      showsVerticalScrollIndicator={false} style={Platform.OS==='web'?{scrollSnapType:'y mandatory'}:null}
      getItemLayout={(_,i)=>({length:height,offset:i*height,index:i})} onViewableItemsChanged={visible} viewabilityConfig={visibility}
      onScroll={e=>{if(Platform.OS==='web')setActive(Math.max(0,Math.min(items.length-1,Math.round(e.nativeEvent.contentOffset.y/height))));}}
      scrollEventThrottle={32} onEndReached={more} onEndReachedThreshold={0.5}
      renderItem={({item,index})=><View style={[{height},Platform.OS==='web'&&{scrollSnapAlign:'start'}]}>{index===active&&<Clip key={item.id} {...{item,endpoint,request,gifts,onWallet,onShop,playable,onReport}}/>}</View>}/>}
    <View pointerEvents="box-none" style={s.header}><Text style={s.brand}>Live Clipi</Text><View style={s.tabs}>
      <Button label="بث مباشر" onPress={onRooms}/><Text accessibilityRole="header" style={[s.label,s.selected]}>استكشف</Text>
    </View></View>
    {!!error&&<Pressable accessibilityRole="button" onPress={()=>setRetry(n=>n+1)} style={s.retry}><Text style={s.count}>{error} · إعادة المحاولة</Text></Pressable>}
  </View>{dock}</View>;
}

export function ShortUpload({endpoint,request,getToken,onDone,onClose}){
  const [draft,setDraft]=useState(null),[title,setTitle]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const [accepted,setAccepted]=useState(false),[policy,setPolicy]=useState(null);
  const job=useRef(null),lock=useRef(false),alive=useRef(true);
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;};},[]);
  useEffect(()=>()=>{if(draft)releaseDraft(draft);},[draft]);
  async function choose(){
    try{const file=await pickShort();if(file){if(!alive.current){releaseDraft(file);return;}job.current=null;setAccepted(false);setDraft(file);setNotice('');}}
    catch(e){if(alive.current)setNotice(e.message);}
  }
  async function publish(){
    if(lock.current||!draft||!accepted)return;
    lock.current=true;setBusy(true);setNotice('');
    try{
      const token=await getToken();
      if(!job.current)job.current=(await request('/account-number',{op:'shortPrepare',title})).id;
      await uploadFile(endpoint+'/shorts/media/'+job.current,draft,token);
      if(alive.current)onDone(job.current);
    }catch(e){if(alive.current)setNotice(e.message||'تعذّر نشر الفيديو');}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  return <View style={s.screen}><View style={[s.screen,s.preview]}>{draft&&<Player source={draft.uri}/>}</View>
    <View style={s.panel}><Text style={s.lightTitle}>رفع فيديو قصير</Text>
    <Button label={draft?'اختيار فيديو آخر':'اختيار فيديو من الجهاز'} disabled={busy} onPress={choose}/>
    {draft&&<><TextInput style={s.input} value={title} maxLength={100} editable={!busy&&!job.current} onChangeText={setTitle} placeholderTextColor="#aaa" placeholder="عنوان الفيديو"/>
      <View style={{flexDirection:'row-reverse',justifyContent:'space-around'}}><Button label="شروط الخدمة" onPress={()=>setPolicy('terms')}/><Button label="سياسة الخصوصية" onPress={()=>setPolicy('privacy')}/></View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{checked:accepted}} disabled={busy} onPress={()=>setAccepted(v=>!v)} style={s.button}><Text style={s.label}>{accepted?'☑':'☐'} أوافق على شروط نشر المقطع وإتاحة مشاركته وتنزيله</Text></Pressable>
      <Button label={busy?'جارٍ النشر…':'نشر الفيديو'} disabled={busy||!accepted} onPress={publish}/></>}
    {!!notice&&<Text accessibilityLiveRegion="polite" style={s.label}>{notice}</Text>}
    <Button label="رجوع" disabled={busy} onPress={onClose}/></View><PolicyModal page={policy} endpoint={endpoint} onClose={()=>setPolicy(null)}/></View>;
}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#111416'},fill:{flex:1,overflow:'hidden'},preview:{minHeight:80},
  header:{position:'absolute',top:12,alignSelf:'center',alignItems:'center'},brand:{color:'white',fontSize:18,fontWeight:'800',textShadowColor:'#202020',textShadowRadius:4},
  tabs:{flexDirection:'row-reverse',alignItems:'center',gap:14},selected:{borderBottomColor:'white',borderBottomWidth:2,paddingBottom:3},
  audio:{position:'absolute',left:10,top:24},
  rail:{position:'absolute',right:8,bottom:56,alignItems:'center'},button:{alignItems:'center',justifyContent:'center',minWidth:48,minHeight:46,paddingHorizontal:5},
  label:{fontSize:16,color:'white',fontWeight:'700',textShadowColor:'#202020',textShadowRadius:4},icon:{fontSize:31,color:'white',textShadowColor:'#222',textShadowRadius:4},
  count:{fontSize:13,color:'white',textShadowColor:'#111',textShadowRadius:4},heart:{width:29,height:29},caption:{position:'absolute',left:15,right:70,bottom:22},
  retry:{position:'absolute',left:12,bottom:4},panel:{backgroundColor:'#202428',maxHeight:'78%',padding:16,gap:6},lightTitle:{fontSize:20,fontWeight:'700',color:'white'},
  scrim:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.55)'},comment:{color:'white',fontSize:16,paddingVertical:8},
  input:{borderColor:'#71767a',borderWidth:1,borderRadius:8,padding:10,color:'white'}
});

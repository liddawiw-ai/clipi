import {shortProfile} from './photo';
import {PolicyModal} from './PolicySheet';
import React,{useEffect,useRef,useState} from 'react';
import {FlatList,Platform,Pressable,StyleSheet,Text,TextInput,useWindowDimensions,View} from 'react-native';
import ShortCommentsSheet,{ShortAvatar} from './ShortCommentsSheet';
import VideoTapSurface from './VideoTapSurface';
import {Player,starters,shareShort,saveShort,nonce,pickShort,uploadFile,releaseDraft} from './ShortMedia';
import {RoomGiftSheet} from './RoomControls';

import {FeedAction,FeedIcon,FeedSheet} from './FeedControls';
import {starterPoster} from './ShortMedia';
const samples=[{id:'palace',title:'القصر'},{id:'aurora',title:'الشفق'},{id:'dunes',title:'الكثبان'}];
const asVideo=(item,endpoint)=>starters[item.id]||endpoint+'/shorts/media/'+item.id;
const identity=x=>x;
const copy={title:'صندوق الهدايا',close:'إغلاق',balance:'الماس المشترى',wallet:'المحفظة',shop:'شراء الماس',send:'إرسال'};

function Button({label,onPress,children,disabled=false,selected}){
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,selected}} disabled={disabled} onPress={onPress} style={s.button}>
    {children||<Text style={s.label}>{label}</Text>}
  </Pressable>;
}
function SoundControl({playerRef,muted,setMuted}){
  function toggleSound(){
    const next=!muted;
    setMuted(next);
    const player=playerRef.current;
    if(!player)return;
    player.muted=next;
    if(!next)Promise.resolve(player.play()).catch(()=>{
      if(playerRef.current===player&&!player.muted)setMuted(true);
    });
  }
  return <button type="button" className="clipi-audio" onClick={toggleSound}>
    <FeedIcon name={muted?'muted':'sound'} size={18}/>{muted?'تشغيل الصوت':'كتم الصوت'}
  </button>;
}
function Clip({item,endpoint,request,gifts,onWallet,onShop,playable,onReport,translate,muted,setMuted,viewer,viewMode,setViewMode,topHeight}){
  const [stats,setStats]=useState(null),[dialog,setDialog]=useState(''),[message,setMessage]=useState('');
  const playerRef=useRef(null);
  const [visibleVideoHeight,setVisibleVideoHeight]=useState(null);
  const [commentCount,setCommentCount]=useState(null);
  const [confirmedClip,setConfirmedClip]=useState(null);
  const [balance,setBalance]=useState(null);
  const alive=useRef(true),lock=useRef(false),revision=useRef(0),pending=useRef(null);
  const source=asVideo(item,endpoint);
  const progress=useRef(null);
  const api=(op,body={})=>request('/account-number',{op,clip:item.id,...body});
  useEffect(()=>{
    alive.current=true;
    const version=revision.current;
    api('shortState').then(v=>{if(alive.current&&version===revision.current){setStats(v);if(v.commentCount!=null)setCommentCount(v.commentCount);}}).catch(()=>{});
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
  function openComments(){setMessage('');setDialog('comments');setViewMode('half');}
  function closeComments(){setVisibleVideoHeight(null);setDialog('');setViewMode('');}
  async function follow(){
    if(lock.current||!stats?.social)return;
    lock.current=true;
    try{const v=await api('shortFollow',{following:!stats.following});if(alive.current)setStats(prev=>({...prev,following:v.following}));}
    catch(e){if(alive.current)setMessage(e.message||'تعذّرت المتابعة');}finally{lock.current=false;}
  }
  const showing=dialog==='comments';
  const official=!!starters[item.id],authorName=stats?.authorName||(official?'Clipi':'صاحب المقطع');
  async function submit(kind,value,callback){
    if(lock.current || (kind==='shortGift' && confirmedClip!==item.id))return;
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
  function openGifts(){
    setDialog('gift');
    setMessage('');
  }
  useEffect(()=>{
    if(dialog!=='gift')return;
    let current=true;
    setConfirmedClip(null);
    api('shortState').then(()=>{
      if(current)setConfirmedClip(item.id);
    }).catch(()=>{if(current)setMessage('تعذّر التحقق من المقطع');});
    request('/account-number',{op:'wallet'}).then(v=>{
      if(current)setBalance(v.diamonds);
    }).catch(()=>{if(current)setBalance(null);});
    return ()=>{current=false;};
  },[dialog,item.id]);
  return <View style={s.fill}>
    <View style={showing?[s.compactVideo,{height:visibleVideoHeight??topHeight}]:StyleSheet.absoluteFill}><Player source={source} fit={showing?'contain':'cover'} poster={starterPoster(item.id)} active={playable&&(!dialog||dialog==='comments')} muted={muted} playerRef={playerRef} onMuteRequired={setMuted}
      onTimeUpdate={e=>{const v=e.currentTarget;if(progress.current&&v.duration>0)progress.current.style.transform='scaleX('+v.currentTime/v.duration+')';}}/></View>
    {!showing&&<>
    <VideoTapSurface clipId={item.id} onDoubleTap={confirm=>like(true,confirm)}/>
    <div aria-hidden="true" className="clipi-clip-shade"/>
    <div className="clipi-action-stack">
      <div className="clipi-author-badge"><ShortAvatar name={authorName} avatar={stats?.authorAvatar} official={official} size={40}/>
        {stats?.social&&stats.owner!==viewer?.uid&&<button type="button" className="clipi-follow" aria-pressed={!!stats.following} onClick={follow}>{stats.following?'متابَع':'متابعة'}</button>}</div>
      <FeedAction icon="like" label={stats?.liked?'إلغاء الإعجاب':'إعجاب'} selected={!!stats?.liked} count={stats?.likes} onClick={()=>like(!stats?.liked)}/>
      <FeedAction icon="comment" label="التعليقات" count={commentCount} onClick={openComments}/>

      <FeedAction icon="share" label="مشاركة الفيديو" onClick={()=>run(()=>shareShort(endpoint+'/#short='+item.id))}/>
      <FeedAction icon="download" label="تنزيل الفيديو" onClick={()=>run(()=>saveShort(item.id,source))}/>
      <FeedAction icon="more" label={translate('المزيد')} onClick={()=>setDialog('more')}/>
    </div>
    <div className="clipi-caption">
      <h2 dir="auto">{authorName}</h2>{!!item.title&&<p dir="auto">{item.title}</p>}
      <div className="clipi-caption-meta">

        <SoundControl {...{playerRef,muted,setMuted}}/>
      </div>
      {!!message&&!dialog&&<p role="status">{message}</p>}
    </div>
    <div className="clipi-progress" aria-hidden="true"><span ref={progress}/></div>
    {dialog==='more'&&<FeedSheet title={translate('المزيد')} closeLabel={translate('إغلاق')} onClose={()=>setDialog('')}
      choices={[
        {icon:'gift',label:'إهداء الفيديو',onClick:openGifts},
        ...(onReport?[{icon:'flag',label:'الإبلاغ عن المقطع أو تعليق',onClick:()=>{setDialog('');onReport(item.id);}}]:[])
      ]}/>}
    </>}
    {showing&&<ShortCommentsSheet clip={item.id} owner={stats?.owner} viewer={viewer} request={request} count={commentCount}
      onVisibleHeight={setVisibleVideoHeight} onCount={setCommentCount} topHeight={topHeight} expanded={viewMode==='expanded'} onExpand={()=>setViewMode(viewMode==='expanded'?'half':'expanded')} onClose={closeComments}/>}
    {dialog==='gift'&&<RoomGiftSheet visible recipientReady={confirmedClip===item.id} gifts={gifts} allLabel="الكل" translate={identity} copy={copy}
      recipient={item.title||'الفيديو'} balance={balance} onWallet={onWallet} onShop={onShop} onClose={()=>{setConfirmedClip(null);setDialog('');}}
      onSend={gift=>submit('shortGift',gift[1],()=>{setDialog('');setMessage('تم إرسال الهدية');})}>
      <Text style={s.label}>{message||'دعم للمقطع بالماس المشترى. الهدية ما إلها عائد نقدي لصاحب الفيديو.'}</Text>
    </RoomGiftSheet>}
  </View>;
}

export function ShortVideoHome({playable=true,dock,onRooms,translate=identity,endpoint,request,gifts,onWallet,onShop,initialId,onReport,viewer}){
  const [items,setItems]=useState(samples),[active,setActive]=useState(0),[height,setHeight]=useState(0),[error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const [muted,setMuted]=useState(false);
  const [liveMenu,setLiveMenu]=useState(false);
  const windowHeight=useWindowDimensions().height;
  const [viewMode,setViewModeState]=useState('');
  const locked=useRef(''),openedHeight=useRef(0);
  function setViewMode(mode){
    if(mode&&!locked.current)openedHeight.current=windowHeight;
    locked.current=mode;setViewModeState(mode);
  }
  const topHeight=Math.round(openedHeight.current*(viewMode==='expanded'?.30:.5));
  function chooseRooms(kind){
    setLiveMenu(false);
    onRooms(kind);
  }
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
  const visible=useRef(({viewableItems})=>{const i=viewableItems.find(v=>v.isViewable)?.index;if(!locked.current&&i!=null)setActive(i);}).current;
  const visibility=useRef({itemVisiblePercentThreshold:55}).current;
  const poster=starterPoster(items[active]?.id);
  return <div className="clipi-feed-shell">
    <div className="clipi-ambient" aria-hidden="true" style={poster?{'--scene':'url('+poster+')'}:undefined}/>
    <div className="clipi-feed-stage"><View style={s.screen} onLayout={e=>{if(!locked.current)setHeight(Math.round(e.nativeEvent.layout.height));}}>
    {height>0&&<FlatList data={items} scrollEnabled={!viewMode} extraData={[active,muted,liveMenu,playable,viewMode]} keyExtractor={x=>x.id} pagingEnabled snapToInterval={height} decelerationRate="fast"
      showsVerticalScrollIndicator={false} style={Platform.OS==='web'?{scrollSnapType:'y mandatory'}:null}
      getItemLayout={(_,i)=>({length:height,offset:i*height,index:i})} onViewableItemsChanged={visible} viewabilityConfig={visibility}
      onScroll={e=>{if(!locked.current&&Platform.OS==='web')setActive(Math.max(0,Math.min(items.length-1,Math.round(e.nativeEvent.contentOffset.y/height))));}}
      scrollEventThrottle={32} onEndReached={more} onEndReachedThreshold={0.5}
      renderItem={({item,index})=><View style={[{height},Platform.OS==='web'&&{scrollSnapAlign:'start'}]}>{index===active&&<Clip key={item.id} {...{item,endpoint,request,gifts,onWallet,onShop,playable:playable&&!liveMenu,onReport,translate,muted,setMuted,viewer,viewMode,setViewMode,topHeight}}/>}</View>}/>}
    <div className="clipi-feed-header" style={viewMode?{visibility:'hidden'}:undefined}>
      <button type="button" aria-expanded={liveMenu} aria-haspopup="dialog" onClick={()=>setLiveMenu(true)} className="clipi-feed-live">
        <FeedIcon name="live" size={21}/>{translate('بث مباشر')}
      </button>
    </div>
    {liveMenu&&<FeedSheet title={translate('بث مباشر')} closeLabel={translate('إغلاق')} onClose={()=>setLiveMenu(false)} choices={[
      {icon:'mic',label:translate('غرف صوتية'),onClick:()=>chooseRooms('audio')},
      {icon:'camera',label:translate('بث فيديو'),onClick:()=>chooseRooms('video')}
    ]}/>}
    {!viewMode&&!!error&&<Pressable accessibilityRole="button" onPress={()=>setRetry(n=>n+1)} style={s.retry}><Text style={s.count}>{error} · إعادة المحاولة</Text></Pressable>}
  </View><div style={viewMode?{visibility:'hidden'}:undefined}>{dock}</div></div></div>;
}

export function ShortUpload({endpoint,request,getToken,onDone,onClose,viewer}){
  const [draft,setDraft]=useState(null),[title,setTitle]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const [muted,setMuted]=useState(false);
  const playerRef=useRef(null);
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
      if(!job.current)job.current=(await request('/account-number',{op:'shortPrepare',title,profile:await shortProfile(viewer)})).id;
      await uploadFile(endpoint+'/shorts/media/'+job.current,draft,token);
      if(alive.current)onDone(job.current);
    }catch(e){if(alive.current)setNotice(e.message||'تعذّر نشر الفيديو');}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  return <View style={s.screen}><View style={[s.screen,s.preview]}>{draft&&<><Player source={draft.uri} muted={muted} playerRef={playerRef} onMuteRequired={setMuted}/><div className="clipi-upload-audio"><SoundControl {...{playerRef,muted,setMuted}}/></div></>}</View>
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
  compactVideo:{position:'absolute',top:0,left:0,right:0,backgroundColor:'#000'},
  screen:{flex:1,backgroundColor:'#111416'},fill:{flex:1,overflow:'hidden',backgroundColor:'#000'},preview:{minHeight:80},
  button:{alignItems:'center',justifyContent:'center',minWidth:48,minHeight:46,paddingHorizontal:5},
  label:{fontSize:16,color:'white',fontWeight:'700',textShadowColor:'#202020',textShadowRadius:4},
  count:{fontSize:13,color:'white',textShadowColor:'#111',textShadowRadius:4},
  retry:{position:'absolute',left:12,bottom:4},panel:{backgroundColor:'#202428',maxHeight:'78%',padding:16,gap:6},lightTitle:{fontSize:20,fontWeight:'700',color:'white'},
  scrim:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.55)'},
  input:{borderColor:'#71767a',borderWidth:1,borderRadius:8,padding:10,color:'white'}
});

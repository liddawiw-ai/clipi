import {uiError,ui as appText,interfaceLocale} from './interface-language.mjs';
import {useClipLike} from './useClipLike';
import {shortProfile} from './photo';
import {PolicyModal} from './PolicySheet';
import React,{useEffect,useRef,useState} from 'react';
import {FlatList,Platform,Pressable,StyleSheet,Text,TextInput,useWindowDimensions,View} from 'react-native';
import ShortCommentsSheet,{ShortAvatar} from './ShortCommentsSheet';
import VideoTapSurface from './VideoTapSurface';
import DeleteVideoDialog from './DeleteVideoDialog';
import {Player,starters,shareShort,shortVideoUrl,copyShortLink,saveShort,nonce,pickShort,uploadFile,releaseDraft} from './ShortMedia';
import {RoomGiftSheet} from './RoomControls';

import {FeedAction,FeedIcon,FeedSheet} from './FeedControls';
import {starterPoster} from './ShortMedia';
const samples=[{id:'palace',title:'القصر'},{id:'aurora',title:'الشفق'},{id:'dunes',title:'الكثبان'}];
const asVideo=(item,endpoint)=>starters[item.id]||endpoint+'/shorts/media/'+item.id;
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
  }
  return <button type="button" className="clipi-audio" onClick={toggleSound}>
    <FeedIcon name={muted?'muted':'sound'} size={18}/>{muted?appText('تشغيل الصوت'):appText('كتم الصوت')}
  </button>;
}
function Clip({item,isCurrent,preload,initialVideo,liveRooms,onVisitLive,onAuthor,followRevision,onFollowChange,followLabels,endpoint,request,gifts,onWallet,onShop,playable,onReport,translate,muted,setMuted,viewer,viewMode,setViewMode,topHeight,onDeleted}){
  const [stats,setStats]=useState(null),[dialog,setDialog]=useState(''),[message,setMessage]=useState('');
  const playerRef=useRef(null);
  const [paused,setPaused]=useState(false);
  const [playing,setPlaying]=useState(false);
  const showPlay=paused||!playing;
  useEffect(()=>{if(!isCurrent)setPaused(false);},[isCurrent]);
  function togglePlayback(){
    if(!playable)return;
    const player=playerRef.current;
    if(!player)return;
    if(player.paused||paused){
      setPaused(false);
      player.play().catch(()=>{if(playerRef.current===player&&player.paused)setPaused(true)});
    }else{
      player.pause();
      setPaused(true);
    }
  }
  const [visibleVideoHeight,setVisibleVideoHeight]=useState(null);
  const [commentCount,setCommentCount]=useState(null);
  const [confirmedClip,setConfirmedClip]=useState(null);
  const [balance,setBalance]=useState(null);
  const alive=useRef(true),lock=useRef(false),pending=useRef(null);
  const deleting=useRef(false);
  const [busyDelete,setBusyDelete]=useState(false);
  const ownerUid=item.owner || stats?.owner;
  const [caption,setCaption]=useState('');
  useEffect(()=>{
    if(!playable||!stats?.cues?.length){setCaption('');return}
    function update(){
      const time=playerRef.current?.currentTime||0;
      const cues=stats.cues;
      let text='';
      for(let i=cues.length-1;i>=0;i--)if(time>=cues[i].at){text=time<cues[i].at+5?cues[i].text:'';break}
      setCaption(text);
    }
    update();const timer=setInterval(update,150);return()=>clearInterval(timer);
  },[playable,stats?.cues]);
  const liveRoom=ownerUid&&liveRooms?.find(room=>room.ownerUid===ownerUid);
  const canDelete=!starters[item.id] && (stats?.canDelete ?? item.canDelete ?? (!!viewer?.uid && ownerUid===viewer.uid));
  function openDelete(){
    if(!canDelete)return;
    setMessage('');setDialog('delete');setViewMode('delete');
  }
  function cancelDelete(){
    if(!deleting.current){setDialog('');setViewMode('');}
  }
  async function confirmDelete(){
    if(!canDelete||deleting.current)return;
    deleting.current=true;setBusyDelete(true);setMessage('');
    try{
      await api('shortDelete');
      onDeleted(item.id);
    }catch(error){
      if(alive.current)setMessage(uiError(error,'تعذّر حذف الفيديو. حاول مجددًا'));
    }finally{
      deleting.current=false;
      if(alive.current)setBusyDelete(false);
    }
  }
  const source=asVideo(item,endpoint);
  const progress=useRef(null);
  const api=(op,body={})=>request('/account-number',{op,clip:item.id,...body});
  const {liked,likes,like,initialize}=useClipLike(
    wanted=>api('shortLike',{liked:wanted,likeOnly:true}),
    ()=>setMessage(translate('تعذّر حفظ الإعجاب. حاول مرة ثانية'))
  );
  const firstPage=useRef(null);
  function firstComments(){
    if(firstPage.current && Date.now()-firstPage.current.time<15000)return firstPage.current.result;
    const entry={time:Date.now(),result:api('shortComments',{parent:null,before:null})};
    firstPage.current=entry;
    entry.result.catch(()=>{if(firstPage.current===entry)firstPage.current=null;});
    return entry.result;
  }
  useEffect(()=>{
    let current=true;
    alive.current=true;
    if(!isCurrent)return ()=>{alive.current=false;};
    api('shortState').then(v=>{
      if(!current)return;
      initialize(v);setStats(v);
      if(v.commentCount!=null)setCommentCount(previous=>previous??v.commentCount);
      if(v.commentCount>0)firstComments();
    }).catch(()=>{});
    return ()=>{current=false;alive.current=false;};
  },[item.id,followRevision,isCurrent]);
  const videoLink=shortVideoUrl(endpoint,item.id);
  function copyLink(){
    setDialog('');
    run(async()=>{
      await copyShortLink(videoLink);
      if(alive.current)setMessage(translate('تم نسخ رابط الفيديو'));
    });
  }
  async function run(fn){
    try{await fn();}catch(e){if(alive.current&&e.name!=='AbortError')setMessage(uiError(e,'تعذّرت العملية'));}
  }
  function openComments(){setMessage('');setDialog('comments');setViewMode('half');}
  function closeComments(){setVisibleVideoHeight(null);setDialog('');setViewMode('');}
  async function follow(){
    if(lock.current||!stats?.social)return;
    lock.current=true;
    try{const v=await api('shortFollow',{following:!stats.following});if(alive.current)setStats(prev=>({...prev,following:v.following}));onFollowChange?.();}
    catch(e){if(alive.current)setMessage(uiError(e,'تعذّرت المتابعة'));}finally{lock.current=false;}
  }
  const showing=dialog==='comments';
  const official=!!starters[item.id],authorName=stats?.authorName||(official?'Clipi':appText('صاحب المقطع'));
  async function submit(kind,value,callback){
    if(lock.current || (kind==='shortGift' && confirmedClip!==item.id))return;
    lock.current=true;setMessage('');
    if(pending.current?.kind!==kind||pending.current.value!==value)pending.current={kind,value,nonce:nonce()};
    try{
      const key=pending.current.nonce;
      const result=await api(kind,{nonce:key,...(kind==='shortGift'?{gift:value}:{body:value})});
      pending.current=null;
      if(alive.current)callback(result);
    }catch(e){if(alive.current)setMessage(uiError(e,'تعذّر الإرسال'));}
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
    }).catch(()=>{if(current)setMessage(appText('تعذّر التحقق من المقطع'));});
    request('/account-number',{op:'wallet'}).then(v=>{
      if(current)setBalance(v.diamonds);
    }).catch(()=>{if(current)setBalance(null);});
    return ()=>{current=false;};
  },[dialog,item.id]);
  return <View style={s.fill}>
    <View style={showing?[s.compactVideo,{height:visibleVideoHeight??topHeight}]:StyleSheet.absoluteFill}><Player source={source} initialVideo={initialVideo} preload={preload} onPlayingChange={setPlaying} fit={showing?'contain':'cover'} poster={starterPoster(item.id)} onPlayBlocked={()=>setPaused(true)} active={isCurrent&&playable&&!paused&&(!dialog||dialog==='comments'||dialog==='more')} muted={muted} playerRef={playerRef} onMuteRequired={setMuted}
      onTimeUpdate={e=>{const v=e.currentTarget;if(progress.current&&v.duration>0)progress.current.style.transform='scaleX('+v.currentTime/v.duration+')';}}/>
      {dialog==='delete' && <DeleteVideoDialog translate={translate} busy={busyDelete} error={message}
        onCancel={cancelDelete} onConfirm={confirmDelete}/>}
    </View>
    {isCurrent&&!showing&&<>
    <VideoTapSurface clipId={item.id} paused={showPlay} playing={playing} onPlaybackPress={togglePlayback}
      playbackLabel={translate(showPlay?'استئناف الفيديو':'إيقاف الفيديو مؤقتًا')}
      onDoubleTap={confirm=>like(true,confirm)}/>
    <div aria-hidden="true" className="clipi-clip-shade"/>
    <div className="clipi-action-stack">
      <div className="clipi-author-badge"><button type="button" disabled={official || !ownerUid} aria-label={translate('عرض الملف الشخصي')+' · '+authorName}
        style={{border:0,padding:0,background:'transparent',borderRadius:'50%',color:'inherit',display:'inline-flex'}}
        onClick={()=>onAuthor(ownerUid,authorName,item.id,canDelete,stats?.authorAvatar)}><ShortAvatar name={authorName} avatar={stats?.authorAvatar} official={official} size={40}/></button>
        {liveRoom&&onVisitLive&&<button type="button" aria-label={appText('دخول البث المباشر')+' · '+authorName}
          style={{color:'#fff',background:'#992449',border:'1px solid white',borderRadius:15,minHeight:44,marginBottom:6,padding:'2px 7px',fontSize:12,cursor:'pointer'}}
          onClick={()=>onVisitLive(liveRoom)}>{appText('مباشر الآن')}</button>}
        {stats?.social&&stats.owner!==viewer?.uid&&<button type="button" className="clipi-follow" aria-pressed={!!stats.following} onClick={follow}>{stats.following?(followLabels?.followed??appText('متابَع')):(followLabels?.follow??appText('متابعة'))}</button>}</div>
      <FeedAction icon="like" label={liked?appText('إلغاء الإعجاب'):appText('إعجاب')} selected={liked} count={likes} onClick={()=>like()}/>
      <FeedAction icon="comment" label={appText("التعليقات")} count={commentCount} onClick={openComments}/>

      <FeedAction icon="share" label={appText("مشاركة الفيديو")} onClick={()=>run(()=>shareShort(videoLink))}/>
      <FeedAction icon="download" label={appText("تنزيل الفيديو")} onClick={()=>run(()=>saveShort(item.id,source))}/>
      <FeedAction icon="more" label={translate('المزيد')} onClick={()=>setDialog('more')}/>
    </div>
    <div className="clipi-caption">{!!caption&&<span dir="auto" style={{alignSelf:"flex-start",background:"#111b",color:"white",padding:"2px 6px",whiteSpace:"pre-wrap"}}>{caption}</span>}
      <h2 dir="auto">{authorName}</h2>{!!item.title&&<p dir="auto">{official?appText(item.title):item.title}</p>}
      <div className="clipi-caption-meta">

        <SoundControl {...{playerRef,muted,setMuted}}/>
        
      </div>
      {!!message&&!dialog&&<p role="status">{appText(message)}</p>}
    </div>
    <div className="clipi-progress" aria-hidden="true"><span ref={progress}/></div>
    {dialog==='more'&&<FeedSheet title={translate('المزيد')} closeLabel={translate('إغلاق')} onClose={()=>setDialog('')}
      choices={[
        {icon:'share',label:translate('نسخ رابط الفيديو'),onClick:copyLink},
        {icon:'gift',label:appText('إهداء الفيديو'),onClick:openGifts},
        ...(canDelete?[{icon:'trash',label:translate('حذف الفيديو'),onClick:openDelete}]:[]),
        ...(onReport?[{icon:'flag',label:appText('إبلاغ عن الفيديو'),onClick:()=>{setDialog('');onReport(item.id);}}]:[])
      ]}/>}
    </>}
    {showing&&<ShortCommentsSheet onReportComment={onReport?row=>{closeComments();onReport(item.id,row)}:undefined} firstComments={firstComments} invalidateComments={()=>{firstPage.current=null;}} clip={item.id} owner={stats?.owner} viewer={viewer} request={request} count={commentCount}
      onVisibleHeight={setVisibleVideoHeight} onCount={setCommentCount} topHeight={topHeight} expanded={viewMode==='expanded'} onExpand={()=>setViewMode(viewMode==='expanded'?'half':'expanded')} onClose={closeComments}/>}
    {dialog==='gift'&&<RoomGiftSheet visible recipientReady={confirmedClip===item.id} gifts={gifts} allLabel="الكل" translate={appText} copy={copy}
      recipient={official?appText(item.title):item.title||appText('الفيديو')} balance={balance} onWallet={onWallet} onShop={onShop} onClose={()=>{setConfirmedClip(null);setDialog('');}}
      onSend={gift=>submit('shortGift',gift[1],()=>{setDialog('');setMessage(appText('تم إرسال الهدية'));})}>
      <Text style={s.label}>{message||appText('دعم للمقطع بالماس المشترى. الهدية ما إلها عائد نقدي لصاحب الفيديو.')}</Text>
    </RoomGiftSheet>}
  </View>;
}

function deviceAccountTarget(){
  const ios=/iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const store=new URL('/device-install/'+(ios?'ios':'android'),location.origin).href;
  const href=ios?'clipi://account':'intent://account/#Intent;scheme=clipi;package=com.walid.clipi;S.browser_fallback_url='+encodeURIComponent(store)+';end';
  return {href,store};
}

function watchDeviceLaunch(store){
  let timer;
  function clear(){
    clearTimeout(timer);
    window.removeEventListener('pagehide',clear);
    document.removeEventListener('visibilitychange',hidden);
  }
  function hidden(){if(document.hidden)clear()}
  window.addEventListener('pagehide',clear);
  document.addEventListener('visibilitychange',hidden);
  timer=setTimeout(()=>{
    clear();
    if(!document.hidden)location.assign(store);
  },2100);
  return clear;
}

export function ShortVideoHome({roomLabels,liveRooms=[],onVisitLive,onAuthor,followRevision,onFollowChange,followLabels,playable=true,dock,onOpenLive,translate=appText,endpoint,request,gifts,onWallet,onShop,initialId,onReport,viewer,profileFeed}){
  const goLiveLabel=['ar','en'].includes(interfaceLocale())?'Go Live':roomLabels?.startBroadcast||translate('ابدأ البث');
  const target=deviceAccountTarget();
  const launchCleanup=useRef(null);
  useEffect(()=>()=>launchCleanup.current?.(),[]);
  useEffect(()=>{
    const url=new URL(location.href);
    if(url.searchParams.get('deviceStore')!=='unavailable')return;
    url.searchParams.delete('deviceStore');
    history.replaceState(history.state,'',url);
    setNotice(roomLabels.deviceStoreNotice);
  },[]);
  const fromProfile=!!profileFeed;
  const windowHeight=useWindowDimensions().height;
  const [firstIndex] = useState(() => Math.max(0, profileFeed?.clips.findIndex(clip => clip.id === initialId) ?? 0));
  const [homeItems,setItems]=useState(samples),[active,setActive]=useState(firstIndex),[height,setHeight]=useState(fromProfile?windowHeight:0),[error,setError]=useState('');
  const [retry,setRetry]=useState(0),[notice,setNotice]=useState('');
  const items=profileFeed?.clips ?? homeItems;
  const removed=useRef(new Set()),list=useRef(null);
  useEffect(()=>{
    if(!notice)return;
    const timer=setTimeout(()=>setNotice(''),4000);
    return ()=>clearTimeout(timer);
  },[notice]);
  const [muted,setMuted]=useState(true);
  const [viewMode,setViewModeState]=useState('');
  const locked=useRef(''),openedHeight=useRef(0);
  function setViewMode(mode){
    if(mode&&!locked.current)openedHeight.current=windowHeight;
    locked.current=mode;setViewModeState(mode);
  }
  const topHeight=Math.round(openedHeight.current*(viewMode==='expanded'?.30:.5));
  const page=useRef(null),loading=useRef(false),mounted=useRef(true);
  useEffect(()=>{
    if(fromProfile)return;
    let current=true;mounted.current=true;
    (async()=>{
      try{
        const {clips}=await request('/account-number',{op:'shortList'});
        if(!current)return;
        page.current=clips.length===30?clips.at(-1).cursor:null;
        const all=[...clips.filter(c=>!removed.current.has(c.id)),...samples];
        const selected=all.find(c=>c.id===initialId);
        if(initialId&&!selected&&!removed.current.has(initialId)&&/^[0-9a-f-]{36}$/i.test(initialId)){
          const {clip}=await request('/account-number',{op:'shortLookup',clip:initialId});
          if(!current)return;
          if(clip&&!removed.current.has(clip.id))all.unshift(clip);
          else if(new URLSearchParams(location.hash.slice(1)).get('short')===initialId)setNotice(translate('هذا الفيديو لم يعد متاحًا'));
        }
        else if(selected)all.unshift(...all.splice(all.indexOf(selected),1));
        setActive(0);setItems(all);setError('');
      }catch{if(current)setError(appText('تعذّر تحميل المقاطع الجديدة'));}
    })();
    return ()=>{current=false;mounted.current=false;};
  },[retry,initialId,fromProfile]);
  async function more(){
    if(fromProfile){profileFeed.onMore();return;}
    if(!page.current||loading.current)return;
    loading.current=true;
    try{
      const {clips}=await request('/account-number',{op:'shortList',before:page.current});
      if(!mounted.current)return;
      page.current=clips.length===30?clips.at(-1).cursor:null;
      setItems(old=>old.concat(clips.filter(c=>!removed.current.has(c.id)&&!old.some(x=>x.id===c.id))));
    }catch{if(mounted.current)setError(appText('تعذّر تحميل المقاطع الجديدة'));}
    finally{loading.current=false;}
  }
  function onDeleted(id){
    if(fromProfile){profileFeed.onDeleted(id);return;}
    removed.current.add(id);
    if(!mounted.current)return;
    const next=items.filter(c=>c.id!==id);
    const index=Math.max(0,Math.min(active,next.length-1));
    setViewMode('');setActive(index);
    setItems(old=>old.filter(c=>c.id!==id));setNotice(translate('تم حذف الفيديو'));
    const url=new URL(window.location.href);
    const fields=new URLSearchParams(url.hash.slice(1));
    if(fields.get('short')===id){
      fields.delete('short');url.hash=fields.toString();
      window.history.replaceState(window.history.state,'',url);
    }
    if(index!==active)requestAnimationFrame(()=>list.current?.scrollToOffset({offset:index*height,animated:false}));
  }
  const visible=useRef(({viewableItems})=>{const i=viewableItems.find(v=>v.isViewable)?.index;if(!locked.current&&i!=null)setActive(i);}).current;
  const visibility=useRef({itemVisiblePercentThreshold:55}).current;
  const poster=starterPoster(items[active]?.id);
  return <div className="clipi-feed-shell">
    <div className="clipi-ambient" aria-hidden="true" style={poster?{'--scene':'url('+poster+')'}:undefined}/>
    <div className="clipi-feed-stage"><View style={s.screen} onLayout={e=>{if(!locked.current)setHeight(Math.round(e.nativeEvent.layout.height));}}>
    {height>0&&<FlatList ref={list} initialScrollIndex={firstIndex || undefined} data={items} scrollEnabled={!viewMode} extraData={[active,muted,playable,viewMode]} keyExtractor={x=>x.id} pagingEnabled snapToInterval={height} decelerationRate="fast"
      showsVerticalScrollIndicator={false} style={Platform.OS==='web'?{scrollSnapType:'y mandatory'}:null}
      getItemLayout={(_,i)=>({length:height,offset:i*height,index:i})} onViewableItemsChanged={Platform.OS==='web'?undefined:visible} viewabilityConfig={visibility}
      onScroll={e=>{if(!locked.current&&Platform.OS==='web')setActive(Math.max(0,Math.min(items.length-1,Math.round(e.nativeEvent.contentOffset.y/height))));}}
      scrollEventThrottle={16} onEndReached={more} onEndReachedThreshold={0.5}
      renderItem={({item,index})=><View style={[{height},Platform.OS==='web'&&{scrollSnapAlign:'start'}]}>{Math.abs(index-active)<=1&&<Clip key={item.id} isCurrent={index===active} preload={index>=active?'auto':'metadata'} initialVideo={fromProfile&&item.id===initialId?profileFeed.initialVideo:undefined} {...{item:fromProfile?{...item,canDelete:profileFeed.canDelete}:item,liveRooms,onVisitLive,onAuthor,followRevision,onFollowChange,followLabels,endpoint,request,gifts,onWallet,onShop,playable,onReport,translate,muted,setMuted,viewer,viewMode,setViewMode,topHeight,onDeleted}}/>}</View>}/>}
    {fromProfile ? !viewMode && <Pressable accessibilityRole="button" accessibilityLabel={translate('رجوع')}
      onPress={profileFeed.onClose} style={s.back}><Text style={s.backIcon}>‹</Text></Pressable> : (
      <div className="clipi-feed-header" style={viewMode?{visibility:'hidden'}:undefined}>
      <a className="clipi-device-account" href={target.href} onClick={()=>{
        launchCleanup.current?.();
        launchCleanup.current=watchDeviceLaunch(target.store);
      }}><bdi>{roomLabels.otherAccount}</bdi></a>
      <button type="button" onClick={()=>onOpenLive(items[active]?.id)} className="clipi-feed-live">
        <FeedIcon name="live" size={21}/>{goLiveLabel}
      </button>
    </div>
    )}
    {!!notice&&<div className="clipi-feed-notice" role="status">{appText(notice)}</div>}
    {!viewMode&&!!error&&<Pressable accessibilityRole="button" onPress={()=>setRetry(n=>n+1)} style={s.retry}><Text style={s.count}>{appText(error)}{appText(" · إعادة المحاولة")}</Text></Pressable>}
  </View><div style={viewMode?{visibility:'hidden'}:undefined}>{dock}</div></div></div>;
}

export function ShortUpload({endpoint,request,getToken,onDone,onClose,viewer}){
  const [cues,setCues]=useState([]),[cueText,setCueText]=useState(''),[editingCues,setEditingCues]=useState(false),[cueAt,setCueAt]=useState(0);
  const [draft,setDraft]=useState(null),[title,setTitle]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const [muted,setMuted]=useState(true);
  const playerRef=useRef(null);
  const [accepted,setAccepted]=useState(false),[policy,setPolicy]=useState(null);
  const job=useRef(null),lock=useRef(false),alive=useRef(true);
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;};},[]);
  useEffect(()=>()=>{if(draft)releaseDraft(draft);},[draft]);
  async function choose(){
    try{const file=await pickShort();if(file){if(!alive.current){releaseDraft(file);return;}job.current=null;setCues([]);setCueText('');setEditingCues(false);setAccepted(false);setDraft(file);setNotice('');}}
    catch(e){if(alive.current)setNotice(uiError(e));}
  }
  async function publish(){
    if(lock.current||!draft||!accepted)return;
    lock.current=true;setBusy(true);setNotice('');
    try{
      const token=await getToken();
      if(!job.current)job.current=(await request('/account-number',{op:'shortPrepare',title,cues,profile:await shortProfile(viewer)})).id;
      await uploadFile(endpoint+'/shorts/media/'+job.current,draft,token);
      if(alive.current)onDone(job.current);
    }catch(e){if(alive.current)setNotice(uiError(e,'تعذّر نشر الفيديو'));}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  return <View style={s.screen}>{draft&&<View style={[s.screen,s.preview]}><Player source={draft.uri} muted={muted} playerRef={playerRef} onMuteRequired={setMuted}/><div className="clipi-upload-audio"><SoundControl {...{playerRef,muted,setMuted}}/></div></View>}
    <View style={[s.panel,!draft&&s.emptyUpload]}><Text style={s.lightTitle}>{appText("رفع فيديو قصير")}</Text>
    <Text style={s.label}>{appText("MP4 · حتى ٣ دقائق و٥٠ ميغابايت")}</Text>
    <Button label={draft?appText('اختيار فيديو آخر'):appText('اختيار فيديو من الجهاز')} disabled={busy} onPress={choose}/>
    {draft&&<><TextInput style={s.input} value={title} maxLength={100} editable={!busy&&!job.current} onChangeText={setTitle} placeholderTextColor="#aaa" placeholder={appText("عنوان الفيديو")}/>
      <Button label={appText('إضافة نص متزامن')} disabled={busy||!!job.current} onPress={()=>{
        setEditingCues(!editingCues);setCueAt(Math.round((playerRef.current?.currentTime||0)*10)/10);
        if(!editingCues)playerRef.current?.pause?.();else playerRef.current?.play?.();
      }}/>
      {editingCues&&<View><TextInput accessible accessibilityLabel={appText('نص اللقطة')} placeholder={appText('نص اللقطة')} value={cueText} maxLength={160} onChangeText={setCueText} style={s.input}/>
        <Button label={appText('تثبيت النص عند هذه اللقطة')+' · '+cueAt+'s'} disabled={!cueText.trim()||cues.length>=80||busy||!!job.current} onPress={()=>{
          setCues(old=>[...old.filter(c=>c.at!==cueAt),{at:cueAt,text:cueText.trim()}].sort((a,b)=>a.at-b.at));
          setCueText('');setEditingCues(false);playerRef.current?.play?.();
        }}/>
        {cues.map(c=><Button key={c.at} disabled={busy||!!job.current} label={appText('حذف')+' · '+c.at+'s · '+c.text} onPress={()=>setCues(old=>old.filter(x=>x.at!==c.at))}/>)}</View>}
      <View style={{flexDirection:'row-reverse',justifyContent:'space-around'}}><Button label={appText("شروط الخدمة")} onPress={()=>setPolicy('terms')}/><Button label={appText("سياسة الخصوصية")} onPress={()=>setPolicy('privacy')}/></View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{checked:accepted}} disabled={busy} onPress={()=>setAccepted(v=>!v)} style={s.button}><Text style={s.label}>{accepted?'☑':'☐'}{appText(" أوافق على شروط نشر المقطع وإتاحة مشاركته وتنزيله")}</Text></Pressable>
      <Button label={busy?appText('جارٍ النشر…'):appText('نشر الفيديو')} disabled={busy||!accepted} onPress={publish}/></>}
    {!!notice&&<Text accessibilityLiveRegion="polite" style={s.label}>{appText(notice)}</Text>}
    <Button label={appText("رجوع")} disabled={busy} onPress={onClose}/></View><PolicyModal page={policy} endpoint={endpoint} onClose={()=>setPolicy(null)}/></View>;
}

const s=StyleSheet.create({
  back:{position:'absolute',top:12,left:8,width:48,height:48,alignItems:'center',justifyContent:'center'},
  backIcon:{color:'white',fontSize:38,lineHeight:42,textShadowColor:'#151515',textShadowRadius:4},
  compactVideo:{position:'absolute',top:0,left:0,right:0,backgroundColor:'#000'},
  screen:{flex:1,backgroundColor:'#111416'},fill:{flex:1,overflow:'hidden',backgroundColor:'#000'},preview:{minHeight:80},emptyUpload:{flex:1,maxHeight:'100%'},
  button:{alignItems:'center',justifyContent:'center',minWidth:48,minHeight:46,paddingHorizontal:5},
  label:{fontSize:16,color:'white',fontWeight:'700',textShadowColor:'#202020',textShadowRadius:4},
  count:{fontSize:13,color:'white',textShadowColor:'#111',textShadowRadius:4},
  retry:{position:'absolute',left:12,bottom:4},panel:{backgroundColor:'#202428',maxHeight:'78%',padding:16,gap:6},lightTitle:{fontSize:20,fontWeight:'700',color:'white'},
  scrim:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.55)'},
  input:{borderColor:'#71767a',borderWidth:1,borderRadius:8,padding:10,color:'white'}
});

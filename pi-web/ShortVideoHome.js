import {useShortCaption} from './useShortCaption';
import {PublishedAlbum,Overlay} from './Album';
import {SearchButton,VideoInsights} from './DiscoveryScreens';
import {useWatchVisit} from './useWatchVisit';
import {useShortPlayback} from './useShortPlayback';
import {uiError,ui as appText,interfaceLocale} from './interface-language.mjs';
import {usePullDown} from './usePullDown';
import {useRandomShort} from './useRandomShort';
import {useClipLike} from './useClipLike';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,FlatList,Platform,Pressable,StyleSheet,Text,TextInput,useWindowDimensions,View} from 'react-native';
import ShortCommentsSheet,{ShortAvatar} from './ShortCommentsSheet';
import VideoTapSurface from './VideoTapSurface';
import DeleteVideoDialog from './DeleteVideoDialog';
import {Player,shareShort,shortPlaybackUrl,shortVideoUrl,copyShortLink,saveShort,nonce} from './ShortMedia';
import {RoomGiftSheet} from './RoomControls';

import {FeedAction,FeedIcon,FeedSheet} from './FeedControls';
import {shortsLookahead,warmFeedVideo} from './ShortMedia';
const copy={title:'صندوق الهدايا',close:'إغلاق',balance:'ماس الهدايا المشترى بعملة Pi',wallet:'المحفظة',shop:'شحن بعملة Pi',send:'إرسال'};

function Button({label,onPress,children,disabled=false,selected}){
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,selected}} disabled={disabled} onPress={onPress} style={s.button}>
    {children||<Text style={s.label}>{label}</Text>}
  </Pressable>;
}
function SoundControl({muted,setMuted,onEnable}){
  function toggleSound(){
    const next=!muted;
    if(!next)onEnable?.();
    setMuted(next);
  }
  return <button type="button" className="clipi-audio" onClick={toggleSound}>
    <FeedIcon name={muted?'muted':'sound'} size={18}/>{muted?appText('تشغيل الصوت'):appText('كتم الصوت')}
  </button>;
}
function Clip({item,isCurrent,playback,onHide,preload,onFirstPlaying,initialVideo,liveRooms,onVisitLive,onAuthor,onCommentAuthor,followRevision,onFollowChange,followLabels,endpoint,request,gifts,onWallet,onShop,playable,onReport,translate,muted,setMuted,viewer,viewMode,setViewMode,topHeight,onDeleted}){
  const [stats,setStats]=useState(null),[dialog,setDialog]=useState(''),[message,setMessage]=useState('');
  const playerRef=useRef(null);
  const [paused,setPaused]=useState(false);
  const [playing,setPlaying]=useState(false),[blocked,setBlocked]=useState(false);
  function playbackChanged(value){setPlaying(value);if(value){setBlocked(false);if(isCurrent)onFirstPlaying?.();}}
  useWatchVisit({clip:item.id,viewer:viewer?.uid,active:!item.photoCount&&isCurrent&&playable,playing,playerRef,playback,request});
  async function hide(){
    if(lock.current)return;
    lock.current=true;
    try{await request('/account-number',{op:'shortHide',clip:item.id});if(alive.current){setDialog('');onHide(item.id);}}
    catch(e){if(alive.current){setDialog('');setMessage(uiError(e));}}
    finally{lock.current=false;}
  }
  const showPlay=paused||blocked;
  useEffect(()=>{if(!isCurrent){setPaused(false);setBlocked(false);}},[isCurrent]);
  function togglePlayback(){
    if(!isCurrent||!playable||!playback.isSelected(item.id))return;
    const player=playerRef.current;
    if(!player)return;
    if(player.paused||paused||blocked){
      setPaused(false);
      player.play().catch(()=>{if(playback.isSelected(item.id)&&playerRef.current===player&&player.paused)setPaused(true)});
    }else{
      player.pause();
      setPaused(true);
    }
  }
  const [visibleVideoHeight,setVisibleVideoHeight]=useState(null);
  const [commentCount,setCommentCount]=useState(null);
  const [confirmedClip,setConfirmedClip]=useState(null);
  const [balance,setBalance]=useState(null);
  const [giftAttempt,retryGift]=useState(0);
  const [giftReadFailed,setGiftReadFailed]=useState(false);
  const alive=useRef(true),lock=useRef(false),pending=useRef(null);
  const deleting=useRef(false);
  const [busyDelete,setBusyDelete]=useState(false);
  const ownerUid=item.owner || stats?.owner;
  const caption=useShortCaption(playerRef,stats?.cues,isCurrent&&playable);
  const liveRoom=ownerUid&&liveRooms?.find(room=>room.ownerUid===ownerUid);
  const canDelete=stats?.canDelete ?? item.canDelete ?? (!!viewer?.uid && ownerUid===viewer.uid);
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
  const source=shortVideoUrl(endpoint,item.id);
  const [slide,setSlide]=useState(0);
  const shareUrl=item.photoCount||!stats||stats.overlay||stats.cues?.length?endpoint+'/#short='+encodeURIComponent(item.id):source;
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
  function copyLink(){
    setDialog('');
    run(async()=>{
      await copyShortLink(shareUrl);
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
    try{const v=await api('shortFollow',{following:!stats.following,profile:{name:viewer?.name,avatar:viewer?.avatar}});if(alive.current)setStats(prev=>({...prev,following:v.following}));onFollowChange?.();}
    catch(e){if(alive.current)setMessage(uiError(e,'تعذّرت المتابعة'));}finally{lock.current=false;}
  }
  const showing=dialog==='comments';
  const authorName=stats?.authorName||appText('صاحب المقطع');
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
    setBalance(null);
    setDialog('gift');
    setMessage('');
  }
  useEffect(()=>{
    if(dialog!=='gift')return;
    let current=true;
    setConfirmedClip(null);
    setGiftReadFailed(false);
    setBalance(null);
    api('shortGiftBalance').then(data=>{
      if(data.clip!==item.id||!Number.isSafeInteger(data.diamonds))throw Error();
      if(current){setBalance(data.diamonds);setConfirmedClip(item.id);}
    }).catch(()=>{if(current)setGiftReadFailed(true);});
    return ()=>{current=false;};
  },[dialog,item.id,giftAttempt]);
  return <View style={s.fill}>
    <View style={showing?[s.compactVideo,{height:visibleVideoHeight??topHeight}]:StyleSheet.absoluteFill}>{item.photoCount?<PublishedAlbum item={item} source={source} notes={stats?.photos} active={isCurrent&&playable} request={request} onIndex={setSlide}/>:<><Player playback={playback} clipId={item.id} source={shortPlaybackUrl(endpoint,item.id)} initialVideo={initialVideo} preload={preload} onPlayingChange={playbackChanged} fit={showing?'contain':'cover'} onPlayBlocked={()=>setBlocked(true)} active={isCurrent&&playable&&!paused&&(!dialog||dialog==='comments'||dialog==='more')} muted={muted} playerRef={playerRef} onMuteRequired={setMuted}
      onTimeUpdate={e=>{const v=e.currentTarget;if(progress.current&&v.duration>0)progress.current.style.transform='scaleX('+v.currentTime/v.duration+')';}}/><Overlay text={stats?.overlay}/></>}
      {dialog==='delete' && <DeleteVideoDialog translate={translate} busy={busyDelete} error={message}
        onCancel={cancelDelete} onConfirm={confirmDelete}/>}
    </View>
    {isCurrent&&!showing&&<>
    {!item.photoCount&&<VideoTapSurface clipId={item.id} loading={!showPlay&&!playing} paused={showPlay} playing={playing} onPlaybackPress={togglePlayback}
      playbackLabel={translate(showPlay?'استئناف الفيديو':'إيقاف الفيديو مؤقتًا')}
      onDoubleTap={confirm=>like(true,confirm)}/>}
    <div aria-hidden="true" className="clipi-clip-shade"/>
    <div className="clipi-action-stack">
      <div className="clipi-author-badge"><button type="button" disabled={!ownerUid} aria-label={translate('عرض الملف الشخصي')+' · '+authorName}
        style={{border:0,padding:0,background:'transparent',borderRadius:'50%',color:'inherit',display:'inline-flex'}}
        onClick={()=>onAuthor(ownerUid,authorName,item.id,canDelete,stats?.authorAvatar)}><ShortAvatar name={authorName} avatar={stats?.authorAvatar} size={40}/></button>
        {liveRoom&&onVisitLive&&<button type="button" aria-label={appText('دخول البث المباشر')+' · '+authorName}
          style={{color:'#fff',background:'#992449',border:'1px solid white',borderRadius:15,minHeight:44,marginBottom:6,padding:'2px 7px',fontSize:12,cursor:'pointer'}}
          onClick={()=>onVisitLive(liveRoom)}>{appText('مباشر الآن')}</button>}
        {stats?.social&&stats.owner!==viewer?.uid&&<button type="button" className="clipi-follow" aria-pressed={!!stats.following} onClick={follow}>{stats.following?(followLabels?.followed??appText('متابَع')):(followLabels?.follow??appText('متابعة'))}</button>}</div>
      <FeedAction icon="like" label={liked?appText('إلغاء الإعجاب'):appText('إعجاب')} selected={liked} count={likes} onClick={()=>like()}/>
      <FeedAction icon="comment" label={appText("التعليقات")} count={commentCount} onClick={openComments}/>

      <FeedAction icon="share" label={appText("مشاركة الفيديو")} onClick={()=>run(()=>shareShort(shareUrl))}/>
      <FeedAction icon="download" label={appText("تنزيل الفيديو")} onClick={()=>run(()=>saveShort(item.id,item.photoCount?source+'?photo='+slide:source,!!item.photoCount))}/>
      <FeedAction icon="more" label={translate('المزيد')} onClick={()=>setDialog('more')}/>
    </div>
    <div className="clipi-caption">{!!caption&&<span dir="auto" style={{alignSelf:"flex-start",background:"#111b",color:"white",padding:"2px 6px",whiteSpace:"pre-wrap"}}>{caption}</span>}
      <h2 dir="auto">{authorName}</h2>{!!item.title&&<p dir="auto">{item.title}</p>}
      <div className="clipi-caption-meta">

        {!item.photoCount&&<SoundControl {...{muted,setMuted}} onEnable={()=>playerRef.current?.enableSound()}/>}
        
      </div>
      {!!message&&!dialog&&<p role="status">{appText(message)}</p>}
    </div>
    <div className="clipi-progress" aria-hidden="true"><span ref={progress}/></div>
    {dialog==='more'&&<FeedSheet title={translate('المزيد')} closeLabel={translate('إغلاق')} onClose={()=>setDialog('')}
      choices={[
        {icon:'share',label:translate('نسخ رابط الفيديو'),onClick:copyLink},
        {icon:'gift',label:appText('إهداء الفيديو'),onClick:openGifts},
        ...(canDelete?[{icon:'trash',label:translate('حذف الفيديو'),onClick:openDelete}]:[]),
        ...(canDelete?[{icon:'stats',label:translate('إحصاءات الفيديو'),onClick:()=>setDialog('insights')}]:onHide?[{icon:'hide',label:translate('غير مهتم'),onClick:hide}]:[]),
        ...(onReport?[{icon:'flag',label:appText('إبلاغ عن الفيديو'),onClick:()=>{setDialog('');onReport(item.id);}}]:[])
      ]}/>}
    </>}
    {dialog==='insights'&&isCurrent&&<VideoInsights request={request} clip={item.id} onClose={()=>setDialog('')}/>}
    {showing&&<ShortCommentsSheet onProfile={onCommentAuthor?row=>{
      closeComments();
      onCommentAuthor(row.uid,row.name||appText('مستخدم كليبي'),item.id,row.uid===viewer?.uid,row.avatar);
    }:undefined} onReportComment={onReport?row=>{closeComments();onReport(item.id,row)}:undefined} firstComments={firstComments} invalidateComments={()=>{firstPage.current=null;}} clip={item.id} owner={stats?.owner} viewer={viewer} request={request} count={commentCount}
      onVisibleHeight={setVisibleVideoHeight} onCount={setCommentCount} topHeight={topHeight} expanded={viewMode==='expanded'} onExpand={()=>setViewMode(viewMode==='expanded'?'half':'expanded')} onClose={closeComments}/>}
    {dialog==='gift'&&<RoomGiftSheet visible recipientReady={confirmedClip===item.id} gifts={gifts} allLabel="الكل" translate={appText} copy={copy}
      recipient={item.title||appText('الفيديو')} balance={balance} onWallet={onWallet} onShop={onShop} onClose={()=>{setConfirmedClip(null);setDialog('');}}
      onSend={gift=>submit('shortGift',gift[1],()=>{setDialog('');setMessage(appText('تم إرسال الهدية'));})}>
      {giftReadFailed&&<Pressable accessibilityRole="button" onPress={()=>retryGift(n=>n+1)}>
        <Text style={s.label}>{appText('تعذر تحديث المحفظة')} · {appText('إعادة المحاولة')}</Text>
      </Pressable>}
      <Text style={s.label}>{message||appText('دعم للمقطع من ماس اشتريته بعملة Pi. الهدية ما إلها عائد نقدي لصاحب الفيديو.')}</Text>
    </RoomGiftSheet>}
  </View>;
}

export function ShortVideoHome({onSearch,onHiddenClip,roomLabels,liveRooms=[],onVisitLive,onAuthor,onCommentAuthor=onAuthor,followRevision,onFollowChange,followLabels,playable=true,dock,onOpenLive,translate=appText,endpoint,request,gifts,onWallet,onShop,initialId,onReport,viewer,profileFeed}){
  const goLiveLabel=['ar','en'].includes(interfaceLocale())?'Go Live':roomLabels?.startBroadcast||translate('ابدأ البث');
  const [stores,setStores]=useState(false);
  const [storeNotice,setStoreNotice]=useState('');
  const [destinations,setDestinations]=useState({});
  const storeRequests=useRef({});
  useEffect(()=>{
    if(!stores)return;
    const controller=new AbortController();
    for(const platform of ['android','ios']){
      storeRequests.current[platform]=fetch('/device-install/'+platform+'?availability=1',{signal:controller.signal})
        .then(response=>response.ok?response.json():Promise.reject())
        .then(data=>{
          if(data.platform!==platform)throw Error('Unexpected store response');
          if(!controller.signal.aborted)setDestinations(old=>({...old,[platform]:data.url}));
          return data.url;
        }).catch(()=>undefined);
    }
    return ()=>{controller.abort();storeRequests.current={};};
  },[stores]);
  useEffect(()=>{
    const url=new URL(location.href);
    if(url.searchParams.get('deviceStore')!=='unavailable')return;
    url.searchParams.delete('deviceStore');
    history.replaceState(history.state,'',url);
    setNotice(roomLabels.deviceStoreNotice);
  },[]);
  const fromProfile=!!profileFeed;
  const ahead=shortsLookahead();
  const windowHeight=useWindowDimensions().height;
  const [firstIndex] = useState(() => Math.max(0, profileFeed?.clips.findIndex(clip => clip.id === initialId) ?? 0));
  const [homeItems,setItems]=useState(null),[active,setActiveIndex]=useState(firstIndex),[height,setHeight]=useState(windowHeight),[error,setError]=useState('');
  const [retry,setRetry]=useState(0),[notice,setNotice]=useState('');
  const items=profileFeed?.clips ?? homeItems ?? [];
  const playback=useShortPlayback(items[active]?.id,playable);
  const latestItems=useRef(items);
  latestItems.current=items;
  const setActive=useCallback(index=>{
    playback.select(latestItems.current[index]?.id);
    setActiveIndex(index);
  },[playback]);
  const removed=useRef(new Set()),list=useRef(null);
  useEffect(()=>{
    if(!notice)return;
    const timer=setTimeout(()=>setNotice(''),4000);
    return ()=>clearTimeout(timer);
  },[notice]);
  const [feedStarted,setFeedStarted]=useState(false);
  const [muted,setMuted]=useState(true);
  const [viewMode,setViewModeState]=useState('');
  const locked=useRef(''),openedHeight=useRef(0);
  function setViewMode(mode){
    if(mode&&!locked.current)openedHeight.current=windowHeight;
    locked.current=mode;setViewModeState(mode);
  }
  const topHeight=Math.round(openedHeight.current*(viewMode==='expanded'?.30:.5));
  const warm=useRef(null);
  const page=useRef(null),loading=useRef(false),mounted=useRef(true);
  useEffect(()=>{
    if(fromProfile)return;
    let current=true;mounted.current=true;
    const cacheKey=viewer?.uid?'clipi.firstVideo.'+viewer.uid:null;
    let candidate=initialId;
    try{if(!candidate&&cacheKey)candidate=sessionStorage.getItem(cacheKey);}catch{}
    const prepared=warmFeedVideo(endpoint,candidate);
    warm.current=prepared;
    function releaseUnused(){
      if(prepared&&!prepared.adopted){
        prepared.video.removeAttribute('src');prepared.video.load();
        if(warm.current===prepared)warm.current=null;
      }
    }
    (async()=>{
      try{
        const {clips,linkedClip}=await request('/account-number',{op:'shortList',initialId});
        if(!current)return;
        page.current=clips.length===30?clips.at(-1).cursor:null;
        const all=clips.filter(c=>!removed.current.has(c.id));
        const selected=all.find(c=>c.id===initialId);
        if(initialId&&!selected&&!removed.current.has(initialId)&&/^[0-9a-f-]{36}$/i.test(initialId)){
          const clip=linkedClip===undefined?(await request('/account-number',{op:'shortLookup',clip:initialId})).clip:linkedClip;
          if(!current)return;
          if(clip&&!removed.current.has(clip.id))all.unshift(clip);
          else if(new URLSearchParams(location.hash.slice(1)).get('short')===initialId)setNotice(translate('هذا الفيديو لم يعد متاحًا'));
        }
        else if(selected)all.unshift(...all.splice(all.indexOf(selected),1));
        const first=all[0];
        if(!first||first.photoCount||prepared?.id!==first.id)releaseUnused();
        try{
          if(cacheKey&&!initialId){
            if(first&&!first.photoCount)sessionStorage.setItem(cacheKey,first.id);
            else sessionStorage.removeItem(cacheKey);
          }
        }catch{}
        setActiveIndex(0);setItems(all);setError('');
      }catch{releaseUnused();if(current)setError(appText('تعذّر تحميل المقاطع الجديدة'));}
    })();
    return ()=>{current=false;mounted.current=false;releaseUnused();};
  },[retry,initialId,fromProfile,endpoint,viewer?.uid]);
  const canRefresh=!fromProfile&&homeItems!==null&&active===0&&!viewMode&&playable;
  const {refresh,refreshing}=useRandomShort({enabled:canRefresh,firstId:items[0]?.id,initialId,request,removed,setItems,setNotice});
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
  function hideFromFeed(id){
    if(fromProfile)profileFeed.onClose();
    else onDeleted(id,true);
    onHiddenClip?.(id);
  }
  function onDeleted(id,hidden=false){
    if(fromProfile){profileFeed.onDeleted(id);return;}
    removed.current.add(id);
    if(!mounted.current)return;
    const next=items.filter(c=>c.id!==id);
    const index=Math.max(0,Math.min(active,next.length-1));
    setViewMode('');setActive(index);
    setItems(old=>old.filter(c=>c.id!==id));setNotice(translate(hidden?'تم إخفاء الفيديو من الرئيسية':'تم حذف الفيديو'));
    const url=new URL(window.location.href);
    const fields=new URLSearchParams(url.hash.slice(1));
    if(fields.get('short')===id){
      fields.delete('short');url.hash=fields.toString();
      window.history.replaceState(window.history.state,'',url);
    }
    if(index!==active)requestAnimationFrame(()=>list.current?.scrollToOffset({offset:index*height,animated:false}));
  }
  function preloadFor(index){
    if(index<active)return 'metadata';
    // Prime the next clip while the current one waits for its first network response.
    if(index<=active+1||feedStarted||fromProfile||items[active]?.photoCount)return 'auto';
    return 'none';
  }
  function initialPlayer(id){
    if(fromProfile)return profileFeed.initialVideos?.get(id);
    if(warm.current?.id===id){warm.current.adopted=true;return warm.current.video;}
  }
  const pullStage=usePullDown(list,canRefresh,refresh);
  const visible=useRef(({viewableItems})=>{const i=viewableItems.find(v=>v.isViewable)?.index;if(!locked.current&&i!=null)setActive(i);}).current;
  const visibility=useRef({itemVisiblePercentThreshold:55}).current;
  return <div className="clipi-feed-shell">
    <div className="clipi-ambient" aria-hidden="true"/>
    <div className="clipi-feed-stage" ref={pullStage}><View style={s.screen} onLayout={e=>{if(!locked.current)setHeight(Math.round(e.nativeEvent.layout.height));}}>
    {/* Keep the first snap target mounted when a new clip replaces it, so the browser stays at the top. */}
    {height>0&&<FlatList ref={list} initialScrollIndex={firstIndex || undefined} data={items} scrollEnabled={!viewMode} extraData={[active,muted,playable,viewMode]} keyExtractor={(item,index)=>!fromProfile&&index===0?'home-first-slot':item.id} pagingEnabled snapToInterval={height} decelerationRate="fast"
      showsVerticalScrollIndicator={false} style={Platform.OS==='web'?{scrollSnapType:'y mandatory',overscrollBehaviorY:'contain',overflowAnchor:'none'}:null}
      getItemLayout={(_,i)=>({length:height,offset:i*height,index:i})} onViewableItemsChanged={Platform.OS==='web'?undefined:visible} viewabilityConfig={visibility}
      onScroll={e=>{if(!locked.current&&Platform.OS==='web')setActive(Math.max(0,Math.min(items.length-1,Math.round(e.nativeEvent.contentOffset.y/height))));}}
      scrollEventThrottle={16} onEndReached={more} onEndReachedThreshold={0.5}
      renderItem={({item,index})=><View style={[{height},Platform.OS==='web'&&{scrollSnapAlign:'start'}]}>{index>=active-1&&index<=active+ahead&&<Clip key={item.id} onHide={hideFromFeed} isCurrent={index===active} playback={playback} onFirstPlaying={()=>setFeedStarted(true)} preload={preloadFor(index)} initialVideo={initialPlayer(item.id)} {...{item:fromProfile?{...item,canDelete:profileFeed.canDelete}:item,liveRooms,onVisitLive,onAuthor,onCommentAuthor,followRevision,onFollowChange,followLabels,endpoint,request,gifts,onWallet,onShop,playable,onReport,translate,muted,setMuted,viewer,viewMode,setViewMode,topHeight,onDeleted}}/>}</View>}/>}
    {refreshing&&!viewMode&&<View pointerEvents="none" style={s.refreshStatus} accessibilityLiveRegion="polite">
      <ActivityIndicator color="#fff" size="small"/><Text style={{color:'#fff'}}>{translate('جارٍ تحميل الفيديوهات…')}</Text>
    </View>}
    {!fromProfile && homeItems?.length===0 && !error && <View pointerEvents="none" style={s.emptyFeed}><Text style={s.count}>{translate('لا توجد فيديوهات منشورة بعد')}</Text></View>}
    {fromProfile ? !viewMode && <Pressable accessibilityRole="button" accessibilityLabel={translate('رجوع')}
      onPress={profileFeed.onClose} style={s.back}><Text style={s.backIcon}>‹</Text></Pressable> : (
      <div className="clipi-feed-header" style={viewMode?{visibility:'hidden'}:undefined}>
      <button type="button" className="clipi-device-account" aria-haspopup="dialog" onClick={()=>{
        setStoreNotice('');setDestinations({});setStores(true);
      }}><FeedIcon name="download" size={17}/><bdi>{roomLabels.downloadApp}</bdi></button>
      {onSearch&&<SearchButton onPress={onSearch}/>}
      <button type="button" onClick={()=>onOpenLive(items[active]?.id)} className="clipi-feed-live">
        <FeedIcon name="live" size={21}/>{goLiveLabel}
      </button>
    </div>
    )}
    {stores&&<FeedSheet title={roomLabels.downloadApp} closeLabel={translate('إغلاق')} onClose={()=>setStores(false)} note={storeNotice}
      choices={['android','ios'].map(platform=>{
        const label=platform==='android'?'Google Play':'App Store';
        return {icon:'download',label,href:destinations[platform]||'/device-install/'+platform,onClick:async event=>{
          if(destinations[platform])return;
          event.preventDefault();
          const request=storeRequests.current[platform];
          const url=await request;
          if(request!==storeRequests.current[platform])return;
          if(url)location.assign(url);
          else setStoreNotice(label+' · '+(url===null?roomLabels.deviceStoreNotice:roomLabels.retry));
        }};
      })}/>}
    {!!notice&&<div className="clipi-feed-notice" role="status">{appText(notice)}</div>}
    {!viewMode&&!!error&&<Pressable accessibilityRole="button" onPress={()=>setRetry(n=>n+1)} style={s.retry}><Text style={s.count}>{appText(error)}{appText(" · إعادة المحاولة")}</Text></Pressable>}
  </View><div style={viewMode?{visibility:'hidden'}:undefined}>{dock}</div></div></div>;
}

export {default as ShortUpload} from './PostComposer';

const s=StyleSheet.create({
  refreshStatus:{position:'absolute',top:74,alignSelf:'center',flexDirection:'row',alignItems:'center',gap:8,paddingVertical:7,paddingHorizontal:14,borderRadius:16,backgroundColor:'#172023',zIndex:4},
  back:{position:'absolute',top:12,left:8,width:48,height:48,alignItems:'center',justifyContent:'center'},
  backIcon:{color:'white',fontSize:38,lineHeight:42,textShadowColor:'#151515',textShadowRadius:4},
  compactVideo:{position:'absolute',top:0,left:0,right:0,backgroundColor:'#000'},
  screen:{flex:1,backgroundColor:'#111416'},fill:{flex:1,overflow:'hidden',backgroundColor:'#000'},preview:{minHeight:80},emptyUpload:{flex:1,maxHeight:'100%'},
  button:{alignItems:'center',justifyContent:'center',minWidth:48,minHeight:46,paddingHorizontal:5},
  label:{fontSize:16,color:'white',fontWeight:'700',textShadowColor:'#202020',textShadowRadius:4},
  count:{fontSize:13,color:'white',textShadowColor:'#111',textShadowRadius:4},
  emptyFeed:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center'},
  retry:{position:'absolute',left:12,bottom:4},panel:{backgroundColor:'#202428',maxHeight:'78%',padding:16,gap:6},lightTitle:{fontSize:20,fontWeight:'700',color:'white'},
  scrim:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.55)'},
  input:{borderColor:'#71767a',borderWidth:1,borderRadius:8,padding:10,color:'white'}
});

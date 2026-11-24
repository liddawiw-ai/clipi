import {useClipLike} from './useClipLike';
import {shortProfile} from './photo';
import {PolicyModal} from './PolicySheet';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {FlatList,Image,Modal,Platform,Pressable,StyleSheet,Text,TextInput,useWindowDimensions,View} from 'react-native';
import ShortCommentsSheet,{ShortAvatar} from './ShortCommentsSheet';
import VideoTapSurface from './VideoTapSurface';
import DeleteVideoDialog from './DeleteVideoDialog';
import {Player,starters,shareShort,shortVideoUrl,copyShortLink,saveShort,nonce,pickShort,uploadFile,releaseDraft} from './ShortMedia';
import {RoomGiftSheet} from './RoomControls';

const redHeart=require('./assets/actions/like-on.png');
const commentIcon=require('./assets/actions/comment-bubble.png');
const soundOn=require('./assets/actions/sound-on.png');
const soundOff=require('./assets/actions/sound-off.png');
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
  return <View style={s.audio}><Button label={muted?'تشغيل الصوت':'كتم الصوت'} onPress={toggleSound}><Image accessible={false} source={muted?soundOff:soundOn} style={s.soundIcon}/></Button></View>;
}
function Panel({onClose,children,closeLabel='إغلاق',busy=false}){
  return <Modal transparent animationType="slide" onRequestClose={onClose}>
    <View style={s.scrim}><View style={s.panel}><Button label={closeLabel} disabled={busy} onPress={onClose}/>{children}</View></View>
  </Modal>;
}
function Clip({item,onAuthor,followRevision,onFollowChange,followLabels,endpoint,request,gifts,onWallet,onShop,playable,onReport,muted,setMuted,viewer,viewMode,setViewMode,topHeight,onDeleted,translate}){
  const [stats,setStats]=useState(null),[dialog,setDialog]=useState(''),[message,setMessage]=useState('');
  const playerRef=useRef(null);
  const [visibleVideoHeight,setVisibleVideoHeight]=useState(null);
  const [commentCount,setCommentCount]=useState(null);
  const [confirmedClip,setConfirmedClip]=useState(null);
  const [balance,setBalance]=useState(null);
  const alive=useRef(true),lock=useRef(false),pending=useRef(null);
  const deleting=useRef(false);
  const [busyDelete,setBusyDelete]=useState(false);
  const ownerUid=item.owner || stats?.owner;
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
      if(alive.current)setMessage(error.message||translate('تعذّر حذف الفيديو. حاول مجددًا'));
    }finally{
      deleting.current=false;
      if(alive.current)setBusyDelete(false);
    }
  }
  const source=asVideo(item,endpoint);
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
    api('shortState').then(v=>{
      if(!current)return;
      initialize(v);setStats(v);
      if(v.commentCount!=null)setCommentCount(previous=>previous??v.commentCount);
      if(v.commentCount>0)firstComments();
    }).catch(()=>{});
    return ()=>{current=false;alive.current=false;};
  },[item.id,followRevision]);
  const videoLink=shortVideoUrl(endpoint,item.id);
  function copyLink(){
    setDialog('');
    run(async()=>{
      await copyShortLink(videoLink);
      if(alive.current)setMessage(translate('تم نسخ رابط الفيديو'));
    });
  }
  async function run(fn){
    try{await fn();}catch(e){if(alive.current&&e.name!=='AbortError')setMessage(e.message||'تعذّرت العملية');}
  }
  function openComments(){setMessage('');setDialog('comments');setViewMode('half');}
  function closeComments(){setVisibleVideoHeight(null);setDialog('');setViewMode('');}
  async function follow(){
    if(lock.current||!stats?.social)return;
    lock.current=true;
    try{const v=await api('shortFollow',{following:!stats.following});if(alive.current)setStats(prev=>({...prev,following:v.following}));onFollowChange?.();}
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
    <View style={showing?[s.compactVideo,{height:visibleVideoHeight??topHeight}]:StyleSheet.absoluteFill}><Player source={source} fit={showing?'contain':'cover'} active={playable&&dialog!=='gift'&&dialog!=='delete'} muted={muted} playerRef={playerRef} onMuteRequired={setMuted}/></View>
    {!showing&&dialog!=='delete'&&<>
    <VideoTapSurface clipId={item.id} onDoubleTap={confirm=>like(true,confirm)}/>
    <SoundControl {...{playerRef,muted,setMuted}}/>
    <View style={s.rail}>
      <View style={s.authorBadge}><Pressable accessibilityRole="button" accessibilityLabel={translate('عرض الملف الشخصي')+' · '+authorName}
        disabled={official || !ownerUid} onPress={()=>onAuthor(ownerUid,authorName,item.id,canDelete,stats?.authorAvatar)}><ShortAvatar name={authorName} avatar={stats?.authorAvatar} official={official} size={40}/></Pressable>
        {stats?.social&&stats.owner!==viewer?.uid&&<Pressable accessibilityRole="button" accessibilityLabel={stats.following?(followLabels?.followed??'متابَع'):(followLabels?.follow??'متابعة')} accessibilityState={{selected:!!stats.following}} onPress={follow} style={s.follow}><Text style={s.followText}>{stats.following?(followLabels?.followed??'متابَع'):(followLabels?.follow??'متابعة')}</Text></Pressable>}</View>
      <Button label={liked?'إلغاء الإعجاب':'إعجاب'} selected={liked} onPress={()=>like()}>
        {liked?<Image source={redHeart} style={s.heart}/>:<Text style={s.icon}>♥</Text>}{likes!=null&&<Text style={s.count}>{likes}</Text>}
      </Button>
      <Button label="التعليقات" onPress={openComments}><Image source={commentIcon} style={s.commentIcon}/>{commentCount!=null&&<Text style={s.count}>{commentCount}</Text>}</Button>
      <Button label="مشاركة الفيديو" onPress={()=>run(()=>shareShort(videoLink))}><Image source={require('./assets/actions/share-left.png')} style={s.soundIcon}/><Text style={s.count}>مشاركة</Text></Button>
      <Button label="تنزيل الفيديو" onPress={()=>run(()=>saveShort(item.id,source))}><Image source={require('./assets/actions/download.png')} style={s.soundIcon}/></Button>
      <Button label="المزيد" onPress={()=>setDialog('more')}><Text style={s.label}>•••</Text></Button>
    </View>
    <View pointerEvents="box-none" style={s.caption}><Text style={s.label}>{authorName}</Text>{!!item.title&&<Text style={s.count}>{item.title}</Text>}
      
      {!!message&&!dialog&&<Text accessibilityLiveRegion="polite" style={s.label}>{message}</Text>}</View>
    {dialog==='more'&&<Panel onClose={()=>setDialog('')}><Button label={translate('نسخ رابط الفيديو')} onPress={copyLink}/><Button label="إهداء الفيديو" onPress={openGifts}/>{canDelete&&<Button label={translate('حذف الفيديو')} onPress={openDelete}/>}{onReport&&<Button label="الإبلاغ عن المقطع أو تعليق" onPress={()=>{setDialog('');onReport(item.id);}}/>}</Panel>}
    </>}
    {dialog==='delete'&&<DeleteVideoDialog translate={translate} busy={busyDelete} error={message} onCancel={cancelDelete} onConfirm={confirmDelete}/>}
    {showing&&<ShortCommentsSheet firstComments={firstComments} invalidateComments={()=>{firstPage.current=null;}} clip={item.id} owner={stats?.owner} viewer={viewer} request={request} count={commentCount}
      onVisibleHeight={setVisibleVideoHeight} onCount={setCommentCount} topHeight={topHeight} expanded={viewMode==='expanded'} onExpand={()=>setViewMode(viewMode==='expanded'?'half':'expanded')} onClose={closeComments}/>}
    {dialog==='gift'&&<RoomGiftSheet visible recipientReady={confirmedClip===item.id} gifts={gifts} allLabel="الكل" translate={identity} copy={copy}
      recipient={item.title||'الفيديو'} balance={balance} onWallet={onWallet} onShop={onShop} onClose={()=>{setConfirmedClip(null);setDialog('');}}
      onSend={gift=>submit('shortGift',gift[1],()=>{setDialog('');setMessage('تم إرسال الهدية');})}>
      <Text style={s.label}>{message||'دعم للمقطع بالماس المشترى. الهدية ما إلها عائد نقدي لصاحب الفيديو.'}</Text>
    </RoomGiftSheet>}
  </View>;
}

export function ShortVideoHome({onAuthor,followRevision,onFollowChange,followLabels,playable=true,dock,onRooms,translate=identity,endpoint,request,gifts,onWallet,onShop,initialId,onReport,viewer,profileFeed}){
  const fromProfile=!!profileFeed;
  const [homeItems,setItems]=useState(samples),[active,setActive]=useState(0),[height,setHeight]=useState(0),[error,setError]=useState('');
  const [retry,setRetry]=useState(0),[notice,setNotice]=useState('');
  const profileClips=profileFeed?.clips;
  const items=useMemo(()=>{
    if(!profileClips)return homeItems;
    const selected=profileClips.find(clip=>clip.id===initialId);
    return selected?[selected,...profileClips.filter(clip=>clip.id!==initialId)]:profileClips;
  },[profileClips,initialId,homeItems]);
  const removed=useRef(new Set()),list=useRef(null);
  useEffect(()=>{
    if(!notice)return;
    const timer=setTimeout(()=>setNotice(''),4000);
    return ()=>clearTimeout(timer);
  },[notice]);
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
          else setNotice(translate('هذا الفيديو لم يعد متاحًا'));
        }
        else if(selected)all.unshift(...all.splice(all.indexOf(selected),1));
        setActive(0);setItems(all.filter(c=>!removed.current.has(c.id)));setError('');
      }catch{if(current)setError('تعذّر تحميل المقاطع الجديدة');}
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
    }catch{if(mounted.current)setError('تعذّر تحميل المقاطع الجديدة');}
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
    if(index!==active)requestAnimationFrame(()=>list.current?.scrollToOffset({offset:index*height,animated:false}));
  }
  const visible=useRef(({viewableItems})=>{const i=viewableItems.find(v=>v.isViewable)?.index;if(!locked.current&&i!=null)setActive(i);}).current;
  const visibility=useRef({itemVisiblePercentThreshold:55}).current;
  return <View style={s.screen}><View style={s.screen} onLayout={e=>{if(!locked.current)setHeight(Math.round(e.nativeEvent.layout.height));}}>
    {height>0&&<FlatList ref={list} data={items} scrollEnabled={!viewMode} extraData={[active,muted,liveMenu,playable,viewMode]} keyExtractor={x=>x.id} pagingEnabled snapToInterval={height} decelerationRate="fast"
      showsVerticalScrollIndicator={false} style={Platform.OS==='web'?{scrollSnapType:'y mandatory'}:null}
      getItemLayout={(_,i)=>({length:height,offset:i*height,index:i})} onViewableItemsChanged={visible} viewabilityConfig={visibility}
      onScroll={e=>{if(!locked.current&&Platform.OS==='web')setActive(Math.max(0,Math.min(items.length-1,Math.round(e.nativeEvent.contentOffset.y/height))));}}
      scrollEventThrottle={32} onEndReached={more} onEndReachedThreshold={0.5}
      renderItem={({item,index})=><View style={[{height},Platform.OS==='web'&&{scrollSnapAlign:'start'}]}>{index===active&&<Clip key={item.id} {...{item:fromProfile?{...item,canDelete:profileFeed.canDelete}:item,onAuthor,followRevision,onFollowChange,followLabels,endpoint,request,gifts,onWallet,onShop,playable:playable&&!liveMenu,onReport,muted,setMuted,viewer,viewMode,setViewMode,topHeight,onDeleted,translate}}/>}</View>}/>}
    {fromProfile ? !viewMode && <Pressable accessibilityRole="button" accessibilityLabel={translate('رجوع')}
      onPress={profileFeed.onClose} style={s.back}><Text style={s.backIcon}>‹</Text></Pressable> : (
      <View pointerEvents="box-none" style={[s.header,viewMode&&{display:'none'}]}>
      <Pressable accessibilityRole="button" accessibilityLabel="go live" accessibilityState={{expanded:liveMenu}} onPress={()=>setLiveMenu(true)} style={({pressed})=>[s.goLive,pressed&&s.pressed]}>
        <Text style={s.liveLabel}>go live</Text>
      </Pressable>
    </View>
    )}
    {liveMenu&&<Panel onClose={()=>setLiveMenu(false)} closeLabel={translate('إغلاق')}>
      <Button label={translate('غرف صوتية')} onPress={()=>chooseRooms('audio')}/>
      <Button label={translate('بث فيديو')} onPress={()=>chooseRooms('video')}/>
    </Panel>}
    {!viewMode&&!!notice&&<View pointerEvents="none" style={s.notice}><Text accessibilityLiveRegion="polite" style={s.label}>{notice}</Text></View>}
    {!viewMode&&!!error&&<Pressable accessibilityRole="button" onPress={()=>setRetry(n=>n+1)} style={s.retry}><Text style={s.count}>{error} · إعادة المحاولة</Text></Pressable>}
  </View><View style={viewMode&&{opacity:0}} pointerEvents={viewMode?'none':'auto'}>{dock}</View></View>;
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
  return <View style={s.screen}><View style={[s.screen,s.preview]}>{draft&&<><Player source={draft.uri} muted={muted} playerRef={playerRef} onMuteRequired={setMuted}/><SoundControl {...{playerRef,muted,setMuted}}/></>}</View>
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
  back:{position:'absolute',top:12,left:8,width:48,height:48,alignItems:'center',justifyContent:'center'},
  backIcon:{color:'white',fontSize:38,lineHeight:42,textShadowColor:'#151515',textShadowRadius:4},
  compactVideo:{position:'absolute',top:0,left:0,right:0,backgroundColor:'#000'},
  screen:{flex:1,backgroundColor:'#111416'},fill:{flex:1,overflow:'hidden',backgroundColor:'#000'},preview:{minHeight:80},
  header:{position:'absolute',top:12,alignSelf:'center',alignItems:'center'},
  goLive:{backgroundColor:'rgba(0,0,0,.22)',borderWidth:1,borderColor:'rgba(255,255,255,.8)',borderRadius:24,minWidth:94,minHeight:46,paddingHorizontal:17,alignItems:'center',justifyContent:'center'},
  pressed:{opacity:.72},
  notice:{position:'absolute',bottom:12,alignSelf:'center',backgroundColor:'#232527',borderRadius:14,paddingHorizontal:14,paddingVertical:8},
  liveLabel:{color:'white',fontSize:19,fontWeight:'800',textShadowColor:'#171717',textShadowOffset:{width:0,height:1},textShadowRadius:4},
  commentIcon:{width:24,height:24},soundIcon:{width:24,height:24},
  audio:{position:'absolute',right:9,top:12},
  authorBadge:{alignItems:'center',paddingBottom:4},follow:{backgroundColor:'#ff4b22',paddingHorizontal:7,borderRadius:10,marginTop:-6},followText:{color:'white',fontSize:11,fontWeight:'700'},
  rail:{position:'absolute',left:5,bottom:10,alignItems:'center'},button:{alignItems:'center',justifyContent:'center',minWidth:48,minHeight:46,paddingHorizontal:5},
  label:{fontSize:16,color:'white',fontWeight:'700',textShadowColor:'#202020',textShadowRadius:4},icon:{fontSize:31,color:'white',textShadowColor:'#222',textShadowRadius:4},
  count:{fontSize:13,color:'white',textShadowColor:'#111',textShadowRadius:4},heart:{width:29,height:29},caption:{position:'absolute',right:15,left:70,bottom:22,alignItems:'flex-end'},
  retry:{position:'absolute',left:12,bottom:4},panel:{backgroundColor:'#202428',maxHeight:'78%',padding:16,gap:6},lightTitle:{fontSize:20,fontWeight:'700',color:'white'},
  scrim:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.55)'},
  input:{borderColor:'#71767a',borderWidth:1,borderRadius:8,padding:10,color:'white'}
});

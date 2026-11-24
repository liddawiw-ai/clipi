import React,{useCallback,useEffect,useRef,useState} from 'react';
import {FlatList,Image,Modal,Pressable,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import {Player} from './ShortMedia';
import {shortThumbnail} from './ShortThumbnail';
import DeleteVideoDialog from './DeleteVideoDialog';

const unchanged=text=>text;

function Tile({clip,index,endpoint,onOpen,translate}){
  const [uri,setUri]=useState(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let current=true;setUri(null);setFailed(false);
    shortThumbnail(clip.id,endpoint+'/shorts/media/'+clip.id,()=>current)
      .then(value=>{if(current)setUri(value);}).catch(()=>{if(current)setFailed(true);});
    return ()=>{current=false;};
  },[clip.id,endpoint]);
  return <Pressable accessibilityRole="button" accessibilityLabel={translate('تشغيل الفيديو')+' '+(clip.title||index+1)}
    style={s.tile} onPress={()=>onOpen(clip)}>
    {uri?<Image accessible={false} source={{uri}} resizeMode="cover" style={StyleSheet.absoluteFill}/>:failed&&<Text numberOfLines={2} style={s.tileLabel}>{clip.title||'▶'}</Text>}
  </Pressable>;
}

function Control({label,children,onPress}){
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.control}>
    <Text style={s.controlText}>{children||label}</Text>
  </Pressable>;
}

function ProfileVideo({clip,source,canDelete,translate,onClose,onDelete}){
  const [panel,setPanel]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [playing,setPlaying]=useState(true),[muted,setMuted]=useState(true);
  const submitting=useRef(false);
  function dismiss(){
    if(submitting.current)return;
    if(panel)setPanel('');else onClose();
  }
  async function remove(){
    if(!canDelete||panel!=='delete'||submitting.current)return;
    submitting.current=true;setBusy(true);setError('');
    try{await onDelete(clip.id);}
    catch(e){setError(e.message||translate('تعذّر حذف الفيديو'));setBusy(false);}
    finally{submitting.current=false;}
  }
  return <Modal visible animationType="fade" onRequestClose={dismiss}>
    <View style={s.stage}>
      <Player source={source} fit="contain" active={playing&&!panel} muted={muted}/>
      <View importantForAccessibility={panel?'no-hide-descendants':'auto'} style={s.close}>
        <Control label={translate('إغلاق')} onPress={dismiss}>×</Control>
      </View>
      <View importantForAccessibility={panel?'no-hide-descendants':'auto'} style={s.controls}>
        <Control label={translate(playing?'إيقاف مؤقت':'تشغيل')} onPress={()=>setPlaying(!playing)}/>
        <Control label={translate(muted?'تشغيل الصوت':'كتم الصوت')} onPress={()=>setMuted(!muted)}/>
        {canDelete&&<Control label={translate('المزيد')} onPress={()=>setPanel('more')}>•••</Control>}
      </View>
      {panel==='more'&&canDelete&&<View style={s.menuOverlay} accessibilityViewIsModal>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={dismiss}/>
        <View style={s.menu}><Pressable accessibilityRole="button" style={s.menuButton} onPress={()=>{setError('');setPanel('delete');}}>
          <Text style={s.menuText}>{translate('حذف الفيديو')}</Text></Pressable></View>
      </View>}
      {panel==='delete'&&canDelete&&<DeleteVideoDialog translate={translate} busy={busy} error={error} onCancel={dismiss} onConfirm={remove}/>}
    </View>
  </Modal>;
}

export default function ProfileShorts({request,endpoint,authorUid,header,translate=unchanged}){
  const [clips,setClips]=useState([]),[cursor,setCursor]=useState(null),[canDelete,setCanDelete]=useState(false);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[selected,setSelected]=useState(null);
  const life=useRef(0),loadingPage=useRef(null);
  const {width}=useWindowDimensions(), columns=Math.max(1,Math.floor((Math.min(width,680)-28)/66));
  const load=useCallback(async before=>{
    const generation=life.current;
    if(loadingPage.current===generation)return;
    loadingPage.current=generation;setLoading(true);setError('');
    try{
      const page=await request('/account-number',{op:'shortProfileList',owner:authorUid,before});
      if(life.current!==generation)return;
      setClips(current=>before==null?page.clips:[...current,...page.clips]);setCanDelete(page.canDelete===true);setCursor(page.nextCursor);
    }catch(e){if(life.current===generation)setError(e.message||translate('تعذّر تحميل الفيديوهات'));}
    finally{if(life.current===generation){loadingPage.current=null;setLoading(false);}}
  },[request,authorUid,translate]);
  useEffect(()=>{
    life.current++;setClips([]);setCursor(null);setSelected(null);setCanDelete(false);load(null);
    return ()=>{life.current++;};
  },[load]);
  async function remove(id){
    if(!canDelete||selected?.id!==id)return;
    const generation=life.current;
    await request('/account-number',{op:'shortDelete',clip:id});
    if(life.current===generation){setClips(current=>current.filter(clip=>clip.id!==id));setSelected(null);}
  }
  return <>
    <FlatList key={columns} data={clips} numColumns={columns} keyExtractor={clip=>clip.id} style={s.list} contentContainerStyle={s.content}
      initialNumToRender={4} windowSize={5} maxToRenderPerBatch={4} columnWrapperStyle={columns>1?s.row:undefined}
      onEndReachedThreshold={.3} onEndReached={()=>{if(cursor!=null&&!loading&&!error)load(cursor);}}
      ListHeaderComponent={<>{header}<Text accessibilityRole="header" style={s.heading}>{translate(authorUid?'الفيديوهات':'فيديوهاتي')}</Text></>}
      renderItem={({item,index})=><Tile clip={item} index={index} endpoint={endpoint} translate={translate} onOpen={setSelected}/>}
      ListFooterComponent={<>
        {loading&&<Text style={s.note}>{translate('جارٍ تحميل الفيديوهات…')}</Text>}
        {!loading&&!!error&&<><Text accessibilityRole="alert" style={s.note}>{error}</Text><Control label={translate('إعادة المحاولة')} onPress={()=>load(cursor)}/></>}
        {!loading&&!error&&!clips.length&&<Text style={s.note}>{translate('لا توجد فيديوهات منشورة بعد')}</Text>}
        {!loading&&!error&&cursor!=null&&<Control label={translate('عرض المزيد')} onPress={()=>load(cursor)}/>}
      </>}/>
    {selected&&<ProfileVideo key={selected.id} clip={selected} source={endpoint+'/shorts/media/'+selected.id}
      canDelete={canDelete} translate={translate} onClose={()=>setSelected(null)} onDelete={remove}/>}
  </>;
}
const s=StyleSheet.create({
  list:{flex:1},content:{width:'100%',maxWidth:680,paddingHorizontal:14,paddingTop:4,paddingBottom:20,alignSelf:'center'},
  heading:{fontSize:20,fontWeight:'700',textAlign:'right',color:'#192625',marginTop:14,marginBottom:10},
  row:{flexDirection:'row-reverse',gap:6},tile:{width:60,aspectRatio:3/4,backgroundColor:'#263334',borderRadius:6,overflow:'hidden',marginBottom:6,justifyContent:'center'},
  tileLabel:{fontSize:11,textAlign:'center',color:'white'},note:{textAlign:'right',color:'#53625b',padding:8},
  stage:{flex:1,backgroundColor:'#101518'},close:{position:'absolute',top:12,right:12},controls:{position:'absolute',bottom:16,left:12,right:12,flexDirection:'row-reverse',justifyContent:'space-between',gap:6},
  control:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#172322',paddingHorizontal:12},
  controlText:{color:'white',fontWeight:'600'},menuOverlay:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.25)',justifyContent:'flex-end',alignItems:'flex-start',paddingLeft:12,paddingBottom:68},
  menu:{borderRadius:12,backgroundColor:'#fffefa'},menuButton:{minHeight:44,paddingHorizontal:16,justifyContent:'center'},menuText:{color:'#872c30',fontWeight:'700'}
});

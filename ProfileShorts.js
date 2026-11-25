import {ui as appText} from './interface-language.mjs';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {FlatList,Image,Modal,Pressable,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import {shortThumbnail} from './ShortThumbnail';
import {ShortVideoHome} from './ShortVideoHome';

const TILE_WIDTH = 76;
const GRID_GAP = 6;
const LIST_PADDING = 14;
const LIST_MAX_WIDTH = 680;

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

export default function ProfileShorts({playerProps,request,endpoint,authorUid,header,translate=appText}){
  const [clips,setClips]=useState([]),[cursor,setCursor]=useState(null),[canDelete,setCanDelete]=useState(false);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[selected,setSelected]=useState(null);
  const life=useRef(0),loadingPage=useRef(null);
  const {width} = useWindowDimensions();
  const gridWidth = Math.min(width, LIST_MAX_WIDTH) - 2 * LIST_PADDING;
  const columns = Math.max(1, Math.floor((gridWidth + GRID_GAP) / (TILE_WIDTH + GRID_GAP)));
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
  function removed(id) {
    setClips(current => current.filter(clip => clip.id !== id));
    setSelected(null);
  }
  return <>
    <FlatList key={columns} data={clips} numColumns={columns} keyExtractor={clip=>clip.id} style={s.list} contentContainerStyle={s.content}
      initialNumToRender={4} windowSize={5} maxToRenderPerBatch={4} columnWrapperStyle={columns>1?s.row:undefined}
      onEndReachedThreshold={.3} onEndReached={()=>{if(cursor!=null&&!loading&&!error)load(cursor);}}
      ListHeaderComponent={<>{header}<Text accessibilityRole="header" style={[s.heading,header&&s.afterShortcuts]}>{translate(authorUid?'الفيديوهات':'فيديوهاتي')}</Text></>}
      renderItem={({item,index})=><Tile clip={item} index={index} endpoint={endpoint} translate={translate} onOpen={setSelected}/>}
      ListFooterComponent={<>
        {loading&&<Text style={s.note}>{translate('جارٍ تحميل الفيديوهات…')}</Text>}
        {!loading&&!!error&&<><Text accessibilityRole="alert" style={s.note}>{appText(error)}</Text><Control label={translate('إعادة المحاولة')} onPress={()=>load(cursor)}/></>}
        {!loading&&!error&&!clips.length&&<Text style={s.note}>{translate('لا توجد فيديوهات منشورة بعد')}</Text>}
        {!loading&&!error&&cursor!=null&&<Control label={translate('عرض المزيد')} onPress={()=>load(cursor)}/>}
      </>}/>
    {selected && <Modal visible animationType="none" onRequestClose={()=>setSelected(null)}>
      <ShortVideoHome {...playerProps} request={request} endpoint={endpoint} translate={translate}
        initialId={selected.id} onAuthor={()=>setSelected(null)} onCommentAuthor={playerProps?.onAuthor?(...args)=>{
          setSelected(null);playerProps.onAuthor(...args);
        }:undefined}
        profileFeed={{clips,canDelete,onClose:()=>setSelected(null),onDeleted:removed,
          onMore:()=>{if(cursor!=null&&!loading&&!error)load(cursor);}}}/>
    </Modal>}
  </>;
}
const s=StyleSheet.create({
  list:{flex:1},content:{width:'100%',maxWidth:LIST_MAX_WIDTH,paddingHorizontal:LIST_PADDING,paddingTop:4,paddingBottom:20,alignSelf:'center'},
  heading:{fontSize:20,fontWeight:'700',textAlign:'right',color:'#192625',marginTop:14,marginBottom:10},
  afterShortcuts:{marginTop:0},
  row:{flexDirection:'row-reverse',gap:GRID_GAP},tile:{width:TILE_WIDTH,maxWidth:'100%',aspectRatio:2/3,backgroundColor:'#263334',borderRadius:6,overflow:'hidden',marginBottom:GRID_GAP,justifyContent:'center'},
  tileLabel:{fontSize:11,textAlign:'center',color:'white'},note:{textAlign:'right',color:'#53625b',padding:8},
  control:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#172322',paddingHorizontal:12},
  controlText:{color:'white',fontWeight:'600'}
});

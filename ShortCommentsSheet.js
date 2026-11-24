import React,{useEffect,useRef,useState} from 'react';
import {Image,Keyboard,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {choosePhoto,shortProfile} from './photo';
import {nonce} from './ShortMedia';
import {CommentKeyboard} from './CommentKeyboard';
import {editComment} from './CommentEditing.mjs';

const stickers={heart:require('./assets/actions/reaction-heart.gif'),spark:require('./assets/actions/reaction-spark.gif'),clap:require('./assets/actions/reaction-clap.gif')};
const stickerNames={heart:'قلب نابض',spark:'لمعة',clap:'تصفيق'};
const emojis=['❤️','😍','😂','😘','😃','😎','👋','😢'];
const iconExpand=require('./assets/actions/expand-corners.png'), iconImage=require('./assets/actions/image-picker.png'), iconSend=require('./assets/actions/send-left.png');
const brand=require('./assets/actions/clipi-author.png');
export function ShortAvatar({name='',avatar,size=34,official=false}) {
  const container={width:size,height:size,borderRadius:size/2};
  if(official||avatar?.startsWith('data:image/jpeg;base64,'))return <Image accessible={false} style={container} source={official?brand:{uri:avatar}}/>;
  const initial=avatar&&avatar!=='👤'&&avatar.length<=16?avatar:Array.from(name.trim())[0]||'•';
  const palette=['#866c61','#586b84','#96704f','#48746e','#785c7b'];
  return <View style={[container,s.avatar,{backgroundColor:palette[(name.codePointAt(0)||0)%palette.length]}]}><Text style={{color:'white',fontSize:size*.49}}>{initial}</Text></View>;
}
function Action({label,onPress,children,style,disabled=false,selected}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,selected}} disabled={disabled} onPress={onPress} style={[s.action,style]}>{children}</Pressable>;
}
function relativeTime(value) {
  if(!value)return '';
  const elapsed=Math.max(0,Date.now()-Number(value));
  if(elapsed<60000)return 'الآن فقط';
  if(elapsed<3600000)return 'قبل '+Math.floor(elapsed/60000)+' د';
  if(elapsed<86400000)return 'قبل '+Math.floor(elapsed/3600000)+' س';
  const date=new Date(Number(value));return date.getDate()+'-'+(date.getMonth()+1);
}
function Media({value}) {
  if(!value)return null;
  const source=stickers[value]||{uri:value};
  return <Image accessibilityLabel={stickerNames[value]||'صورة التعليق'} resizeMode="contain" style={stickers[value]?s.sticker:s.picture} source={source}/>;
}
function CommentRow({row,owner,nested,social,onReply,onLike,onToggle,open}) {
  const author=row.name||'مستخدم كليبي';
  return <View style={[s.row,nested&&s.nested]}>
    <ShortAvatar name={author} avatar={row.avatar} size={nested?29:36}/>
    <View style={s.copy}>
      <Text style={s.author}>{author}{row.uid&&row.uid===owner?' · المنشئ':''}</Text>
      {!!row.body&&<Text style={s.body}>{row.body}</Text>}
      <Media value={row.media}/>
      <View style={s.meta}>{row.pending&&<Text accessibilityLiveRegion="polite" style={s.metaText}>جارٍ الإرسال…</Text>}{!!row.created&&<Text style={s.metaText}>{relativeTime(row.created)}</Text>}
        {social&&<Action label={'رد على '+author} onPress={onReply} style={s.inline}><Text style={s.metaText}>رد</Text></Action>}
      </View>
      {!!row.creatorLiked&&<Text style={s.creator}>أعجب المنشئ</Text>}
      {!nested&&row.replyCount>0&&<Action label={open?'إخفاء الردود':'عرض الردود'} onPress={onToggle} style={s.thread}>
        <Text style={s.threadLabel}>{open?'إخفاء الردود':'عرض '+row.replyCount+' من الردود'} {open?'⌃':'⌄'}</Text>
      </Action>}
    </View>
    {social&&<Action selected={!!row.liked} label={row.liked?'إلغاء إعجاب التعليق':'إعجاب بالتعليق'} onPress={onLike} style={s.like}>
      <Text style={[s.heart,!!row.liked&&s.liked]}>{row.liked?'♥':'♡'}</Text>
      {row.likes>0&&<Text style={s.metaText}>{row.likes}</Text>}
    </Action>}
  </View>;
}
const emptyPage={rows:[],next:null};
export default function ShortCommentsSheet({firstComments,invalidateComments,clip,owner,viewer,request,count,onCount,topHeight,expanded,onExpand,onClose,onVisibleHeight}) {
  const [outgoing,setOutgoing]=useState(null);
  const [main,setMain]=useState(emptyPage),[threads,setThreads]=useState({}),[open,setOpen]=useState({});
  const [draft,setDraft]=useState(''),[attachment,setAttachment]=useState(''),[reply,setReply]=useState(null);
  const [tools,setTools]=useState(''),[sending,setSending]=useState(false),[loading,setLoading]=useState(true),[social,setSocial]=useState(false),[error,setError]=useState('');
  const [inset,setInset]=useState(0),[available,setAvailable]=useState(0),[inputHeight,setInputHeight]=useState(40),[focused,setFocused]=useState(false);
  const list=useRef(null),input=useRef(null),alive=useRef(true),pending=useRef(null),busy=useRef(new Set()),sequence=useRef(0);
  const caret=useRef({start:0,end:0}),currentDraft=useRef(''),[selection,setSelection]=useState(undefined);
  function changeDraft(text){currentDraft.current=text;setDraft(text);setSelection(undefined);}
  function showKeyboard(){setFocused(true);input.current?.focus();}
  function hideKeyboard(){setFocused(false);setTools('');input.current?.blur();Keyboard.dismiss();}
  function edit(value){
    if(busy.current.has('send'))return;
    const field=input.current;
    const range=typeof field?.selectionStart==='number'&&Platform.OS==='web'&&currentDraft.current===field.value
      ?{start:field.selectionStart,end:field.selectionEnd}:caret.current;
    const next=editComment(currentDraft.current,range,value);
    caret.current=next.selection;currentDraft.current=next.text;
    setDraft(next.text);setSelection(next.selection);setTools('');showKeyboard();
  }
  const api=(op,fields={})=>request('/account-number',{op,clip,...fields});
  useEffect(()=>{
    alive.current=true;load();return ()=>{alive.current=false;};
  },[clip]);
  useEffect(()=>{
    if(Platform.OS!=='web'||!window.visualViewport)return;
    const vv=window.visualViewport;
    const resize=()=>setInset(Math.max(0,window.innerHeight-vv.height-vv.offsetTop));
    resize();vv.addEventListener('resize',resize);vv.addEventListener('scroll',resize);
    return ()=>{vv.removeEventListener('resize',resize);vv.removeEventListener('scroll',resize);};
  },[]);
  function updatePage(parent,reduce) {
    if(parent==null)setMain(reduce);
    else setThreads(old=>({...old,[parent]:reduce(old[parent]||emptyPage)}));
  }
  function accept(result,parent,before) {
    const rows=result.comments||[];
    setSocial(!!result.social);
    if(result.count!=null)onCount(result.count);
    else if(parent==null)onCount(rows.length);
    updatePage(parent,current=>({next:result.next||null,rows:before?current.rows.concat(rows.filter(r=>!current.rows.some(v=>v.id===r.id))):rows}));
  }
  async function load(parent=null,before=null) {
    const key='load:'+parent, version=sequence.current;
    if(busy.current.has(key))return;
    busy.current.add(key);
    try{
      const result=parent==null&&before==null ? await firstComments() : await api('shortComments',{parent,before});
      if(alive.current&&version===sequence.current)accept(result,parent,before);
    }catch(e){if(alive.current)setError(e.message||'تعذّر تحميل التعليقات');}
    finally{busy.current.delete(key);if(alive.current)setLoading(false);}
  }
  function toggle(row){
    setOpen(old=>({...old,[row.id]:!old[row.id]}));if(!open[row.id]&&!threads[row.id])load(row.id);
  }
  function replaceRow(id,patch){
    const change=page=>({...page,rows:page.rows.map(r=>r.id===id?{...r,...patch}:r)});
    setMain(change);setThreads(old=>Object.fromEntries(Object.entries(old).map(([k,v])=>[k,change(v)])));
  }
  async function like(row){
    const key='heart:'+row.id;if(busy.current.has(key))return;
    busy.current.add(key);setError('');
    replaceRow(row.id,{liked:!row.liked,likes:Math.max(0,(row.likes||0)+(row.liked?-1:1))});
    try{const v=await api('shortCommentLike',{commentId:row.id,liked:!row.liked});invalidateComments();if(alive.current)replaceRow(row.id,v);}
    catch(e){if(alive.current){replaceRow(row.id,{liked:row.liked,likes:row.likes});setError(e.message||'تعذّر حفظ الإعجاب');}}finally{busy.current.delete(key);}
  }
  async function send() {
    const body=draft.trim(),parent=reply?.id??null;
    if((!body&&!attachment)||busy.current.has('send'))return;
    busy.current.add('send');setSending(true);setError('');
    const signature=JSON.stringify([clip,parent,body,attachment]);
    if(pending.current?.signature!==signature)pending.current={signature,id:nonce()};
    setOutgoing({parent,body,media:attachment,name:viewer?.name,uid:viewer?.uid,avatar:viewer?.avatar,pending:true});
    if(parent==null)list.current?.scrollTo({y:0,animated:false});
    else setOpen(old=>({...old,[parent]:true}));
    try{
      const result=await api('shortComment',{body,parent,media:attachment,nonce:pending.current.id,profile:await shortProfile(viewer)});
      invalidateComments();
      if(!alive.current)return;
      pending.current=null;sequence.current++;accept(result,parent,null);
      if(parent!=null){setOpen(old=>({...old,[parent]:true}));setMain(old=>({...old,rows:old.rows.map(r=>r.id===parent?{...r,replyCount:(r.replyCount||0)+1}:r)}));}
      else list.current?.scrollTo({y:0,animated:false});
      changeDraft('');caret.current={start:0,end:0};setInputHeight(40);setReply(null);setAttachment('');hideKeyboard();
    }catch(e){if(alive.current)setError(e.message||'تعذّر إرسال التعليق');}
    finally{busy.current.delete('send');if(alive.current){setOutgoing(null);setSending(false);}}
  }
  function insert(value){edit(value);}
  async function pickImage(){
    try{const image=await choosePhoto(240);if(image&&alive.current){if(image.length>85000)throw Error('اختر صورة أصغر');setAttachment(image);setTools('');}}
    catch(e){if(alive.current)setError(e.message||'تعذّر فتح الصورة');}
  }
  function startReply(row,root){setReply({id:root.id,name:row.name||'مستخدم كليبي'});setTools('');showKeyboard();}
  function rowView(row,root){
    return <CommentRow row={row} owner={owner} social={social} nested={!!root} open={!!open[row.id]} onToggle={()=>toggle(row)} onReply={()=>startReply(row,root||row)} onLike={()=>like(row)}/>;
  }
  const canSend=!!(draft.trim()||attachment)&&!sending;
  const names=[...new Set([...main.rows,...Object.values(threads).flatMap(t=>t.rows)].map(r=>r.name).filter(Boolean))].slice(0,10);
  const viewport=Math.max(0,available-inset),compact=viewport>0&&viewport<570;
  const keyHeight=compact?Math.max(24,Math.min(34,Math.floor(viewport*.085))):42;
  const keyboardHeight=4*keyHeight+24;
  const [composerHeight,setComposerHeight]=useState(96);
  // Make room for a readable section of the thread before reserving space for video.
  const threadHeight=Math.min(168,Math.max(80,Math.round(viewport*.23)));
  const fixedSpace=46+composerHeight+(focused?keyboardHeight:0)+threadHeight+16+(error?24:0);
  const top=available?Math.max(0,Math.min(topHeight,viewport-fixedSpace)):topHeight;
  useEffect(()=>{onVisibleHeight?.(top);},[top,onVisibleHeight]);
  function requestClose(){if(focused)hideKeyboard();else onClose();}

  return <Modal visible transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={requestClose}>
    <View style={s.overlay} onLayout={e=>setAvailable(e.nativeEvent.layout.height)}>
      <Pressable accessible={false} onPress={onClose} style={{height:top}}/>
      <View style={[s.sheet,{marginBottom:inset}]} accessibilityViewIsModal testID="short-comments-sheet">
        <View style={s.head}><Text accessibilityRole="header" style={s.title}>{count==null?'التعليقات':count+' من التعليقات'}</Text>
          <View style={s.headActions}><Action label="إغلاق التعليقات" onPress={onClose}><Text style={s.close}>×</Text></Action>
            <Action label={expanded?'تصغير التعليقات':'توسيع التعليقات'} onPress={onExpand}><Image source={iconExpand} style={s.smallIcon}/></Action></View>
        </View>
        <ScrollView ref={list} testID="short-comment-list" style={s.list} keyboardShouldPersistTaps="handled" contentContainerStyle={s.listInner}>
          {outgoing&&outgoing.parent==null&&<CommentRow row={outgoing} owner={owner}/>}
          {main.rows.map(row=><View key={row.id}>{rowView(row)}
            {open[row.id]&&outgoing?.parent===row.id&&<CommentRow row={outgoing} nested owner={owner}/>}
            {open[row.id]&&(threads[row.id]?.rows||[]).map(child=><View key={child.id}>{rowView(child,row)}</View>)}
            {open[row.id]&&threads[row.id]?.next&&<Action label="المزيد من الردود" onPress={()=>load(row.id,threads[row.id].next)}><Text>المزيد من الردود</Text></Action>}
          </View>)}
          {!main.rows.length&&!outgoing&&!error&&<Text style={s.empty}>{loading?'جارٍ تحميل التعليقات…':'كن أول من يعلّق'}</Text>}
          {!!main.next&&<Action label="المزيد من التعليقات" onPress={()=>load(null,main.next)}><Text>المزيد من التعليقات</Text></Action>}
        </ScrollView>
        {!!error&&<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
        <View testID="short-comment-composer" style={s.composeArea} onLayout={e=>setComposerHeight(e.nativeEvent.layout.height)}>
          {!!reply&&<Action label="إلغاء الرد" style={s.context} onPress={()=>setReply(null)}><Text>رد على {reply.name}　×</Text></Action>}
          {!!attachment&&<Action label="إزالة المرفق" style={s.context} onPress={()=>setAttachment('')}>{focused?<Text style={s.author}>{stickerNames[attachment]||'صورة مرفقة'}</Text>:<Media value={attachment}/>}<Text>×</Text></Action>}
          {tools==='gif'&&<View style={s.picker}>{Object.keys(stickers).map(key=><Action key={key} label={stickerNames[key]} onPress={()=>{setAttachment(key);setTools('');}}><Media value={key}/></Action>)}</View>}
          {tools==='mention'&&<ScrollView horizontal keyboardShouldPersistTaps="always">{names.map(n=><Action key={n} label={n} onPress={()=>insert('@'+n+' ')}><Text style={s.author}>{'@'+n}</Text></Action>)}<Action label="اكتب اسم المستخدم" onPress={()=>insert('@')}><Text>اكتب اسم المستخدم</Text></Action></ScrollView>}
          <View style={s.composer}>
            <ShortAvatar avatar={viewer?.avatar} name={viewer?.name} size={34}/>
            <View style={s.inputBox}>
              <TextInput ref={input} accessibilityLabel="اكتب تعليقك" value={draft} onChangeText={changeDraft} maxLength={450} inputMode="none" showSoftInputOnFocus={false} selection={selection}
                onSelectionChange={e=>{caret.current=e.nativeEvent.selection;}} editable={!sending}
                multiline returnKeyType="send" enterKeyHint="send" submitBehavior="submit" blurOnSubmit={false}
                onSubmitEditing={send} onFocus={()=>setFocused(true)}
                onKeyPress={Platform.OS==='web'?e=>{if(e.nativeEvent.key==='Escape'){e.preventDefault();hideKeyboard();return;}if(e.nativeEvent.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}:undefined}
                onContentSizeChange={e=>setInputHeight(Math.min(94,Math.max(40,e.nativeEvent.contentSize.height)))}
                placeholder="اكتب تعليقك…" placeholderTextColor="#777" style={[s.input,{height:compact?Math.min(56,inputHeight):inputHeight}]}/>
              {social&&(!compact||!focused)&&<View style={s.tools}><Action label="إرفاق صورة" onPress={pickImage}><Image source={iconImage} style={s.smallIcon}/></Action>
                <Action label="اختيار GIF" onPress={()=>setTools(v=>v==='gif'?'':'gif')}><Text style={s.gif}>GIF</Text></Action>
                <Action label="ذكر مستخدم" onPress={()=>setTools(v=>v==='mention'?'':'mention')}><Text style={s.at}>@</Text></Action></View>}
            </View>
            {(canSend||focused||sending)&&<Action label="إرسال التعليق" disabled={!canSend} onPress={send} style={[s.send,!canSend&&s.disabled]}><Image source={iconSend} style={s.sendIcon}/></Action>}
          </View>
          {(!compact||!focused)&&<View style={s.emojiRow}>{emojis.map(e=><Action key={e} label={'إدراج '+e} style={s.emojiButton} onPress={()=>insert(e)}><Text style={s.emoji}>{e}</Text></Action>)}</View>}
        </View>
        {focused&&<CommentKeyboard onEdit={edit} onSend={send} onHide={hideKeyboard} canSend={canSend} disabled={sending} short={compact} rowHeight={keyHeight}/>}
      </View>
    </View>
  </Modal>;
}
const s=StyleSheet.create({
  overlay:{flex:1,alignItems:'stretch'},sheet:{flex:1,minHeight:0,alignSelf:'center',width:'100%',maxWidth:Platform.OS==='web'?510:undefined,overflow:'hidden',borderTopLeftRadius:18,borderTopRightRadius:18,backgroundColor:'#fff',paddingBottom:Platform.OS==='web'?'env(safe-area-inset-bottom, 0px)':4},
  head:{height:46,alignItems:'center',justifyContent:'center'},headActions:{position:'absolute',left:4,top:0,direction:'ltr',flexDirection:'row'},action:{minHeight:42,minWidth:36,alignItems:'center',justifyContent:'center'},title:{fontSize:16,fontWeight:'700',color:'#202020'},close:{fontSize:27,color:'#222',lineHeight:32},smallIcon:{width:20,height:20},
  list:{flex:1,minHeight:0},listInner:{paddingHorizontal:14,paddingBottom:8},empty:{padding:18,textAlign:'center',color:'#666'},row:{flexDirection:'row-reverse',direction:'ltr',alignItems:'flex-start',gap:9,paddingVertical:9},nested:{marginRight:26},avatar:{alignItems:'center',justifyContent:'center'},copy:{flex:1,minWidth:0,alignItems:'flex-end'},author:{fontSize:13,fontWeight:'700',color:'#666',textAlign:'right'},body:{fontSize:16,lineHeight:22,color:'#131313',textAlign:'right',writingDirection:'auto'},meta:{flexDirection:'row-reverse',direction:'ltr',alignItems:'center',gap:10},metaText:{fontSize:12,color:'#686868'},inline:{minHeight:30,minWidth:32},thread:{minHeight:34,alignSelf:'flex-end'},threadLabel:{fontSize:13,fontWeight:'600',color:'#616161'},creator:{backgroundColor:'#f2f2f2',alignSelf:'flex-end',color:'#555',fontSize:12,paddingHorizontal:5},like:{width:34},heart:{fontSize:24,color:'#646464'},liked:{color:'#e44559'},
  composeArea:{paddingHorizontal:8,paddingTop:4,backgroundColor:'#fff'},composer:{direction:'ltr',flexDirection:'row-reverse',gap:7,alignItems:'center'},inputBox:{flex:1,minWidth:0,borderRadius:10,backgroundColor:'#f2f2f2',flexDirection:'column'},input:{paddingHorizontal:10,paddingVertical:8,textAlign:'right',color:'#161616',fontSize:16,writingDirection:'auto'},tools:{direction:'ltr',flexDirection:'row',alignItems:'center',paddingLeft:4,height:32},gif:{borderRadius:9,borderWidth:1.5,borderColor:'#292929',fontWeight:'800',fontSize:10,padding:2,color:'#242424'},at:{fontSize:21,color:'#222'},send:{borderRadius:23,width:38,minHeight:38,backgroundColor:'#ff4b22'},sendIcon:{width:20,height:20},disabled:{opacity:.45},emojiRow:{direction:'ltr',flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',paddingTop:1},emojiButton:{minWidth:0,flex:1},emoji:{fontSize:23},context:{minHeight:28,flexDirection:'row',gap:8,alignSelf:'flex-end'},picker:{flexDirection:'row',justifyContent:'space-evenly'},sticker:{width:47,height:47},picture:{width:96,height:74},error:{fontSize:13,color:'#a03424',paddingHorizontal:10,textAlign:'right'}
});

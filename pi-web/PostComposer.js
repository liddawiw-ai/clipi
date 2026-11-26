import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import CaptureStudio from './CaptureStudio';
import {Album,Overlay} from './Album';
import {Player,releaseDraft,uploadFile} from './ShortMedia';
import {useShortPlayback} from './useShortPlayback';
import {readShortDraft,saveShortDraft,clearShortDraft} from './ShortDraft';
import {shortProfile} from './photo';
import {ui,uiError} from './interface-language.mjs';
import {PolicyModal} from './PolicySheet';

function Action({label,onPress,disabled,primary}){
  return <Pressable accessibilityRole="button" accessibilityLabel={ui(label)} disabled={disabled} onPress={onPress}
    style={[s.action,primary&&s.primary,disabled&&{opacity:.45}]}><Text style={s.label}>{ui(label)}</Text></Pressable>;
}
export default function PostComposer({endpoint,request,getToken,onDone,onClose,viewer}){
  const [draft,setDraft]=useState(null),[studio,setStudio]=useState(true),[ready,setReady]=useState(false);
  const [title,setTitle]=useState(''),[overlay,setOverlay]=useState(''),[notes,setNotes]=useState([]),[index,setIndex]=useState(0);
  const [cues,setCues]=useState([]),[cue,setCue]=useState(null),[accepted,setAccepted]=useState(false),[muted,setMuted]=useState(true);
  const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[policy,setPolicy]=useState(null);
  const uid=viewer?.uid,life=useRef(true),job=useRef(null),cached=useRef(null),lock=useRef(false),player=useRef(null);
  const photos=draft?.photos,editable=!busy&&!job.current,playback=useShortPlayback(draft?.uri,!!draft?.uri&&!studio);
  useEffect(()=>()=>{if(draft?.uri)releaseDraft(draft);},[draft]);
  useEffect(()=>{
    let current=true;life.current=true;
    if(uid)readShortDraft(uid).then(saved=>{
      if(!current){if(saved?.draft?.uri)releaseDraft(saved.draft);return;}
      if(saved){setDraft(saved.draft);cached.current=saved.draft;job.current=saved.job||null;
        setTitle(saved.title||'');setOverlay(saved.overlay||'');setNotes(saved.notes||[]);setCues(saved.cues||[]);setAccepted(!!saved.accepted);}
    }).catch(()=>{if(current)setNotice(ui('تعذّرت قراءة المسودة المحلية'));}).finally(()=>{if(current)setReady(true);});
    else setReady(true);
    return ()=>{current=false;life.current=false;};
  },[uid]);
  function selectMedia(media){
    job.current=null;cached.current=null;setDraft(media);setStudio(false);setTitle('');setOverlay('');setNotes(media.photos?.map(()=>'')||[]);
    setIndex(0);setCues([]);setCue(null);setAccepted(false);setNotice('');
  }
  function changeOrder(step){
    if(!editable)return;
    const next=index+step,images=photos.slice(),text=notes.slice();
    [images[index],images[next]]=[images[next],images[index]];[text[index],text[next]]=[text[next],text[index]];
    cached.current=null;setDraft({photos:images});setNotes(text);setIndex(next);
  }
  function removePhoto(){
    if(!editable||photos.length<=1)return;
    cached.current=null;setDraft({photos:photos.filter((_,i)=>i!==index)});setNotes(notes.filter((_,i)=>i!==index));setIndex(Math.min(index,photos.length-2));
  }
  async function save(attempted){
    cached.current=await saveShortDraft(uid,cached.current||draft,{title,cues,overlay,notes,accepted,job:job.current,attempted});
  }
  async function perform(action){
    if(lock.current)return;
    lock.current=true;setBusy(true);setNotice('');
    try{await action();}catch(e){if(life.current)setNotice(uiError(e,'تعذّر نشر المنشور. أعد المحاولة.'));}
    finally{lock.current=false;if(life.current)setBusy(false);}
  }
  function publish(){
    if(!accepted||!draft)return;
    void perform(async()=>{
      await save(true);const token=await getToken();
      if(!job.current)job.current=(await request('/account-number',{op:'shortPrepare',title,cues,overlay,photos:photos?notes:null,profile:await shortProfile(viewer)})).id;
      await save(true);
      const url=endpoint+'/shorts/media/'+job.current;
      if(photos){
        const response=await fetch(url,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(photos)});
        if(!response.ok)throw Error((await response.json().catch(()=>({}))).error||'تعذّر رفع الصور');
      }else await uploadFile(url,cached.current||draft,token);
      await clearShortDraft(uid);if(life.current)onDone(job.current);
    });
  }
  if(!ready)return <View style={s.screen}><ActivityIndicator color="#fff"/></View>;
  if(studio||!draft)return <CaptureStudio onMedia={selectMedia} hasDraft={!!draft} onRestore={()=>setStudio(false)} onClose={onClose}/>;
  return <View style={s.screen}>
    <View style={s.preview}>{photos?<Album count={photos.length} uri={'data:image/jpeg;base64,'+photos[index]} notes={notes} index={index} setIndex={setIndex}/>:
      <><Player playback={playback} source={draft.uri} muted={muted} fit="contain" playerRef={player} onMuteRequired={setMuted}/><Overlay text={overlay}/>
        <View style={s.audio}><Action label={muted?'تشغيل الصوت':'كتم الصوت'} onPress={()=>setMuted(!muted)}/></View></>}</View>
    <ScrollView style={s.panel} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      {photos&&photos.length>1&&<View style={s.row}><Action label="تقديم الصورة" disabled={!editable||index===0} onPress={()=>changeOrder(-1)}/>
        <Action label="تأخير الصورة" disabled={!editable||index===photos.length-1} onPress={()=>changeOrder(1)}/><Action label="إزالة الصورة" disabled={!editable} onPress={removePhoto}/></View>}
      <Text style={s.label}>{ui(photos?'النص على الصورة':'النص على الفيديو')}</Text>
      <TextInput accessibilityLabel={ui(photos?'النص على الصورة':'النص على الفيديو')} placeholder={ui('اكتب هنا')} placeholderTextColor="#a4afa9" maxLength={160}
        multiline editable={editable} style={s.field} value={photos?(notes[index]||''):overlay} onChangeText={t=>photos?setNotes(v=>v.map((x,i)=>i===index?t:x)):setOverlay(t)}/>
      {!photos&&<Action label="إضافة نص متزامن" disabled={!editable} onPress={()=>{setCue({at:Math.round((player.current?.currentTime||0)*10)/10,text:''});player.current?.pause?.();}}/>}
      {cue&&<><TextInput accessibilityLabel={ui('نص اللقطة')} value={cue.text} style={s.field} maxLength={160} onChangeText={text=>setCue({...cue,text})}/>
        <Action label="تثبيت النص عند هذه اللقطة" disabled={!editable||!cue.text.trim()||cues.length>=80} onPress={()=>{setCues(v=>[...v.filter(c=>c.at!==cue.at),{...cue,text:cue.text.trim()}].sort((a,b)=>a.at-b.at));setCue(null);player.current?.play?.();}}/></>}
      {cues.map(c=><Action key={c.at} label={ui('حذف')+' · '+c.at+'s · '+c.text} disabled={!editable} onPress={()=>setCues(v=>v.filter(x=>x.at!==c.at))}/>)}
      <TextInput accessibilityLabel={ui('وصف المنشور')} placeholder={ui('وصف المنشور')} maxLength={100} editable={editable} value={title} style={s.field} placeholderTextColor="#a4afa9" onChangeText={setTitle}/>
      <View style={s.row}><Action label="شروط الخدمة" onPress={()=>setPolicy('terms')}/><Action label="سياسة الخصوصية" onPress={()=>setPolicy('privacy')}/></View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{checked:accepted}} disabled={busy} onPress={()=>setAccepted(!accepted)} style={s.action}><Text style={s.label}>{accepted?'☑ ':'☐ '}{ui('أوافق على نشر المنشور ومشاركته وتنزيله')}</Text></Pressable>
      {!!notice&&<Text accessibilityLiveRegion="polite" style={s.label}>{notice}</Text>}
      <Action primary label={busy?'جارٍ الحفظ…':job.current?'إعادة المحاولة':'نشر'} disabled={busy||!accepted} onPress={publish}/>
      <View style={s.row}><Action label="حفظ المسودة" disabled={busy} onPress={()=>perform(async()=>{await save(false);if(life.current)setNotice(ui('تم حفظ المسودة على هذا الجهاز'));})}/>
        <Action label="حذف المسودة" disabled={busy} onPress={()=>perform(async()=>{await clearShortDraft(uid);if(life.current){job.current=null;cached.current=null;setDraft(null);setStudio(true);}})}/>
        <Action label="رجوع للكاميرا" disabled={busy} onPress={()=>setStudio(true)}/></View>
    </ScrollView>{policy&&<PolicyModal page={policy} endpoint={endpoint} onClose={()=>setPolicy(null)}/>}</View>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#141a1b'},preview:{flex:1,minHeight:115,backgroundColor:'#080a0b',overflow:'hidden'},
  panel:{flexGrow:0,maxHeight:'53%',backgroundColor:'#202828'},content:{padding:14,gap:7},label:{color:'#fff',fontSize:15,fontWeight:'600'},
  audio:{position:'absolute',top:6,right:8},field:{backgroundColor:'#293333',color:'white',paddingHorizontal:12,paddingVertical:9,borderRadius:9,fontSize:16,minHeight:44},
  row:{flexDirection:'row',flexWrap:'wrap',gap:5},action:{backgroundColor:'#35403f',minHeight:42,paddingHorizontal:12,paddingVertical:8,borderRadius:9,alignItems:'center',justifyContent:'center'},
  primary:{backgroundColor:'#ad355d'}});

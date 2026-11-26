import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,PanResponder,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import {ui} from './interface-language.mjs';
import {CaptureDevice,pickPhotos} from './CaptureDevice';
import {CameraTool,CameraTextEditor} from './CaptureTools';
import {pickShort,releaseDraft} from './ShortMedia';
import {Overlay} from './Album';

function Mode({label,active,disabled,onPress}){
  return <Pressable accessibilityRole="tab" aria-selected={active} accessibilityLabel={ui(label)} accessibilityState={{selected:active,disabled}}
    disabled={disabled} onPress={onPress} style={s.mode}>
    <Text style={[s.modeLabel,active&&s.activeLabel]}>{ui(label)}</Text>
    <View style={[s.indicator,active&&s.activeIndicator]}/>
  </Pressable>;
}

export default function CaptureStudio({backAction,onMedia,onClose,hasDraft,onRestore}){
  const [mode,setMode]=useState('video'),[facing,setFacing]=useState('user'),[muted,setMuted]=useState(false),[torch,setTorch]=useState(false);
  const [device,setDevice]=useState({recording:false,torch:false,audio:true}),[seconds,setSeconds]=useState(0);
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  const [text,setText]=useState(''),[writing,setWriting]=useState(false);
  const control=useRef(null),lock=useRef(false),live=useRef(true),current=useRef({});
  useEffect(()=>{live.current=true;return ()=>{live.current=false;};},[]);
  useEffect(()=>{
    if(!device.recording){setSeconds(0);return;}
    const start=Date.now(),timer=setInterval(()=>setSeconds(Math.min(180,Math.floor((Date.now()-start)/1000))),200);
    return ()=>clearInterval(timer);
  },[device.recording]);
  const unavailable=loading||device.processing||device.recording||writing;
  function deliver(media){
    if(live.current)onMedia(media,text);
    else releaseDraft(media);
  }
  async function gallery(){
    if(lock.current||unavailable)return;
    lock.current=true;setLoading(true);setError('');
    try{
      const media=await (mode==='photos'?pickPhotos():pickShort());
      if(media)deliver(media);
    }catch(e){if(live.current)setError(e.message);}
    finally{lock.current=false;if(live.current)setLoading(false);}
  }
  function shutter(){
    setError('');
    Promise.resolve(control.current?.()).catch(e=>{if(live.current)setError(e.message);});
  }
  function changeMode(next){
    if(unavailable||lock.current)return;
    setError('');setMode(next);
  }
  current.current={changeMode,unavailable,onClose,recording:device.recording,writing};
  useEffect(()=>{
    if(!backAction)return;
    backAction.current=()=>{
      if(current.current.writing)setWriting(false);
      else if(current.current.recording)shutter();
      else if(!current.current.unavailable)current.current.onClose();
    };
    return ()=>{backAction.current=null;};
  },[backAction]);

  const swipe=useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture:(_,g)=>!current.current.unavailable&&Math.abs(g.dx)>14&&Math.abs(g.dx)>Math.abs(g.dy)*1.4,
    onPanResponderRelease:(_,g)=>{if(Math.abs(g.dx)>40)current.current.changeMode(g.dx<0?'photos':'video');}
  })).current;
  const photo=mode==='photos';
  return <View style={s.screen} {...swipe.panHandlers}>
    <CaptureDevice control={control} mode={mode} facing={facing} muted={muted} torch={torch}
      onState={patch=>setDevice(d=>({...d,...patch}))} onReady={deliver} onError={setError}/>
    {!!text&&!writing&&<Overlay text={text}/>}
    <View style={s.top} pointerEvents="box-none">
      <CameraTool icon="×" label="رجوع" onPress={onClose} disabled={unavailable}/>
      {!photo&&<Text style={s.clock}>{device.recording?'●  ':''}{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')} / 3:00</Text>}
    </View>
    <View style={s.rail}>
      <CameraTool icon="flip" label="تبديل الكاميرا" disabled={unavailable} onPress={()=>{setTorch(false);setFacing(f=>f==='user'?'environment':'user');}}/>
      {device.torch&&<CameraTool icon="flash" label="الفلاش" disabled={unavailable} selected={torch} onPress={()=>setTorch(v=>!v)}/>}
      {!photo&&<CameraTool icon={muted||!device.audio?'silent':'mic'} label={muted?'تشغيل الميكروفون':'كتم الميكروفون'} selected={muted} disabled={unavailable||!device.audio} onPress={()=>setMuted(v=>!v)}/>}
      <CameraTool icon="T" label="الكتابة على الشاشة" disabled={unavailable} selected={!!text} onPress={()=>setWriting(true)}/>
      <CameraTool icon="gallery" label={photo?'رفع صور':'رفع فيديو'} disabled={unavailable} onPress={gallery}/>
      {hasDraft&&<CameraTool icon="↩" label="متابعة المسودة" disabled={unavailable} onPress={onRestore}/>}
    </View>
    <View style={s.dock} pointerEvents="box-none">
      {(loading||device.processing)&&<ActivityIndicator color="#fff"/>}
      {!!error&&<Text accessibilityLiveRegion="polite" style={s.status}>{ui(error)}</Text>}
      <View style={s.selector}>
        <Mode label="فيديو" active={!photo} disabled={unavailable} onPress={()=>changeMode('video')}/>
        <Pressable accessibilityRole="button" accessibilityLabel={ui(device.recording?'إيقاف التسجيل':photo?'التقاط صورة':'بدء التسجيل')}
          disabled={loading||device.processing||device.starting||writing} style={s.ring} onPress={shutter}>
          <View style={[s.shutter,photo&&s.photo,device.recording&&s.stop]}/>
        </Pressable>
        <Mode label="صور" active={photo} disabled={unavailable} onPress={()=>changeMode('photos')}/>
      </View>
    </View>
    {writing&&<CameraTextEditor value={text} onChange={setText} onDone={()=>setWriting(false)} label="الكتابة على الشاشة"/>}
  </View>;
}
const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#101415',...(Platform.OS==='web'?{touchAction:'pan-y'}:{})},
  top:{position:'absolute',top:Platform.OS==='web'?'max(8px,env(safe-area-inset-top))':12,left:8,right:8,flexDirection:'row',direction:'ltr',alignItems:'center',justifyContent:'space-between'},
  rail:{position:'absolute',top:Platform.OS==='web'?'max(60px,calc(env(safe-area-inset-top) + 48px))':62,right:6,alignItems:'center'},
  dock:{position:'absolute',bottom:Platform.OS==='web'?'max(20px,calc(env(safe-area-inset-bottom) + 12px))':24,left:4,right:4,alignItems:'center',gap:5},
  selector:{flexDirection:'row',direction:'ltr',alignItems:'center',justifyContent:'center',gap:6},
  mode:{minWidth:62,minHeight:48,alignItems:'center',justifyContent:'center',paddingTop:7},
  modeLabel:{color:'#e2e2e2',fontSize:15,fontWeight:'500',textShadowColor:'#101010',textShadowRadius:4,textShadowOffset:{width:0,height:1}},
  activeLabel:{color:'#fff',fontWeight:'800'},indicator:{width:15,height:2,borderRadius:1,marginTop:5},activeIndicator:{backgroundColor:'white'},
  clock:{color:'#fff',fontSize:12,fontWeight:'600',backgroundColor:'rgba(12,14,16,.64)',paddingVertical:4,paddingHorizontal:9,borderRadius:12},
  ring:{width:70,height:70,borderRadius:35,borderWidth:3,borderColor:'#fff',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,0,0,.24)'},
  shutter:{width:56,height:56,borderRadius:28,backgroundColor:'#ed4058'},photo:{backgroundColor:'#fff'},stop:{width:28,height:28,borderRadius:6},
  status:{color:'white',backgroundColor:'rgba(12,14,16,.78)',textAlign:'center',padding:6,borderRadius:7,maxWidth:'85%'}
});

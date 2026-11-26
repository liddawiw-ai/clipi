import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,PanResponder,Pressable,StyleSheet,Text,View} from 'react-native';
import {ui} from './interface-language.mjs';
import {CaptureDevice,pickPhotos} from './CaptureDevice';
import {pickShort,releaseDraft} from './ShortMedia';

function Control({glyph,label,action,disabled,selected}){
  return <Pressable accessibilityRole="button" accessibilityLabel={ui(label)} accessibilityState={{disabled,selected}} disabled={disabled} onPress={action}
    style={[s.control,selected&&{borderWidth:1,borderColor:'#fff'},disabled&&{opacity:.45}]}><Text style={s.glyph}>{glyph}</Text><Text style={s.small}>{ui(label)}</Text></Pressable>;
}
export default function CaptureStudio({backAction,onMedia,onClose,hasDraft,onRestore}){
  const [facing,setFacing]=useState('user'),[muted,setMuted]=useState(false),[torch,setTorch]=useState(false);
  const [device,setDevice]=useState({recording:false,torch:false,audio:true}),[seconds,setSeconds]=useState(0);
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  const control=useRef(null),lock=useRef(false),live=useRef(true),current=useRef({});
  useEffect(()=>{live.current=true;return ()=>{live.current=false;};},[]);
  useEffect(()=>{
    if(!device.recording){setSeconds(0);return;}
    const start=Date.now(),timer=setInterval(()=>setSeconds(Math.min(180,Math.floor((Date.now()-start)/1000))),200);
    return ()=>clearInterval(timer);
  },[device.recording]);
  const unavailable=loading||device.processing||device.recording;
  async function choose(mode){
    if(lock.current||unavailable)return;
    lock.current=true;setLoading(true);setError('');
    try{
      const media=await (mode==='photos'?pickPhotos():pickShort());
      if(media&&live.current)onMedia(media);else if(media)releaseDraft(media);
    }catch(e){if(live.current)setError(e.message);}
    finally{lock.current=false;if(live.current)setLoading(false);}
  }
  current.current={choose,unavailable,onClose,recording:device.recording};
  useEffect(()=>{
    backAction.current=()=>{
      if(current.current.recording){
        Promise.resolve(control.current?.()).catch(e=>{if(live.current)setError(e.message);});
      }else if(!current.current.unavailable)current.current.onClose();
    };
    return ()=>{backAction.current=null;};
  },[backAction]);
  const swipe=useRef(PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>!current.current.unavailable&&Math.abs(g.dx)>24&&Math.abs(g.dx)>Math.abs(g.dy)*1.4,
    onPanResponderRelease:(_,g)=>{if(Math.abs(g.dx)>45)void current.current.choose(g.dx<0?'photos':'video');}
  })).current;
  return <View style={s.screen} {...swipe.panHandlers}>
    <CaptureDevice control={control} facing={facing} muted={muted} torch={torch} onState={patch=>setDevice(d=>({...d,...patch}))}
      onReady={onMedia} onError={setError}/>
    <View style={s.top}><Control glyph="×" label="رجوع" action={onClose} disabled={unavailable}/><Text style={s.clock}>{device.recording?'●  ':''}{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')} / 3:00</Text></View>
    <View style={s.rail}>
      <Control glyph="↺" label="تبديل الكاميرا" disabled={unavailable} action={()=>{setTorch(false);setFacing(f=>f==='user'?'environment':'user');}}/>
      {device.torch&&<Control glyph="ϟ" label="الفلاش" disabled={unavailable} selected={torch} action={()=>setTorch(v=>!v)}/>}
      <Control glyph={muted||!device.audio?'♩':'♫'} label={muted?'تشغيل الميكروفون':'كتم الميكروفون'} selected={muted} disabled={unavailable||!device.audio} action={()=>setMuted(v=>!v)}/>
    </View>
    <View style={s.selector}>
      <Control glyph="▷" label="رفع فيديو" disabled={unavailable} action={()=>choose('video')}/>
      <Pressable accessibilityRole="button" accessibilityLabel={ui(device.recording?'إيقاف التسجيل':'بدء التسجيل')} disabled={loading||device.processing||device.starting} style={s.ring}
        onPress={()=>{setError('');Promise.resolve(control.current?.()).catch(e=>{if(live.current)setError(e.message);});}}>
        <View style={[s.shutter,device.recording&&s.stop]}/></Pressable>
      <Control glyph="▧" label="رفع صور" disabled={unavailable} action={()=>choose('photos')}/>
    </View>
    <View style={s.bottom}>{(loading||device.processing)&&<ActivityIndicator color="#fff"/>}{!!error&&<Text accessibilityLiveRegion="polite" style={s.status}>{ui(error)}</Text>}
      {hasDraft&&<Control glyph="↩" label="متابعة المسودة" disabled={unavailable} action={onRestore}/>}</View>
  </View>;
}
const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#101415',alignItems:'center',justifyContent:'center'},
  top:{position:'absolute',top:30,left:16,right:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  rail:{position:'absolute',right:10,top:94,gap:4},selector:{flexDirection:'row',direction:'ltr',alignItems:'center',gap:16},
  control:{minWidth:52,minHeight:45,borderRadius:14,backgroundColor:'rgba(18,23,24,.72)',alignItems:'center',justifyContent:'center',padding:5},
  small:{color:'#fff',fontSize:12,fontWeight:'600'},glyph:{color:'#fff',fontSize:24,lineHeight:26},clock:{color:'#fff',backgroundColor:'#191d21',padding:8,borderRadius:14,fontWeight:'700'},
  ring:{width:76,height:76,borderRadius:38,borderWidth:4,borderColor:'white',alignItems:'center',justifyContent:'center'},shutter:{width:60,height:60,borderRadius:32,backgroundColor:'#f3485c'},stop:{width:30,height:30,borderRadius:5},
  bottom:{position:'absolute',bottom:32,left:18,right:18,alignItems:'center',gap:8},status:{color:'white',backgroundColor:'#252b2e',textAlign:'center',padding:8,borderRadius:8}
});

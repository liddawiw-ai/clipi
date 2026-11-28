import React,{useEffect,useRef,useState} from 'react';
import {ui} from './interface-language.mjs';
import {checkShortVideo} from './short-upload-limits.mjs';
export default function CaptureStudio({onMedia,onGallery,onPhotos,onClose}){
 const preview=useRef(null),stream=useRef(null),rec=useRef(null),timer=useRef(null),chunks=useRef([]),alive=useRef(true),discard=useRef(false);
 const [facing,setFacing]=useState('environment'),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[error,setError]=useState(''),[ready,setReady]=useState(false),[mic,setMic]=useState(true);
 useEffect(()=>{alive.current=true;let cancelled=false;setReady(false);setError('');
 async function open(){try{
 const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing}},audio:true});
 if(cancelled){media.getTracks().forEach(t=>t.stop());return}
 stream.current=media;media.getAudioTracks().forEach(t=>t.enabled=mic);
 preview.current.srcObject=media;await preview.current.play();if(!cancelled)setReady(true);
 }catch{if(!cancelled)setError(ui('تعذّر فتح الكاميرا'));}}
 void open();return()=>{cancelled=true;alive.current=false;discard.current=true;clearInterval(timer.current);if(rec.current?.state==='recording')rec.current.stop();stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;};
 },[facing]);
 function stop(){if(rec.current?.state==='recording')rec.current.stop();}
 async function record(){if(recording){stop();return}
 if(!ready||!stream.current||typeof MediaRecorder==='undefined'){onGallery(true);return}
 const type=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!type){onGallery(true);return}
 try{const recorder=new MediaRecorder(stream.current,{mimeType:type,videoBitsPerSecond:1800000,audioBitsPerSecond:96000});rec.current=recorder;chunks.current=[];discard.current=false;let bytes=0;
 recorder.ondataavailable=e=>{if(e.data.size){chunks.current.push(e.data);bytes+=e.data.size;if(bytes>48*1024*1024)stop()}};
 recorder.onerror=()=>{discard.current=true;stop();clearInterval(timer.current);if(alive.current){setRecording(false);setError(ui('تعذّر تسجيل الفيديو'));}};
 recorder.onstop=async()=>{clearInterval(timer.current);if(!alive.current||discard.current)return;setRecording(false);const file=new File(chunks.current,'clipi-camera.mp4',{type:'video/mp4'});let problem;try{problem=await checkShortVideo(file)}catch{problem={error:'تعذّر تسجيل الفيديو'}}if(!alive.current)return;if(problem){setError(ui(problem.error));return}onMedia({file,uri:URL.createObjectURL(file)});};
 recorder.start(500);setRecording(true);setSeconds(0);const start=Date.now();timer.current=setInterval(()=>{const elapsed=Math.floor((Date.now()-start)/1000);setSeconds(elapsed);if(elapsed>=179)stop()},250);
 }catch{setError(ui('تعذّر تسجيل الفيديو'));}}
 const button=(glyph,label,action,disabled=false)=><button type="button" aria-label={ui(label)} title={ui(label)} disabled={disabled} onClick={action} style={{border:0,color:'white',background:'#101827b8',borderRadius:22,minWidth:44,minHeight:44,fontSize:23}}>{glyph}</button>;
 return <div style={{position:'absolute',inset:0,background:'#10141a',color:'white',overflow:'hidden'}}>
 <video ref={preview} muted playsInline autoPlay style={{width:'100%',height:'100%',objectFit:'cover'}}/>
 <div style={{position:'absolute',top:'max(12px,env(safe-area-inset-top))',left:12,right:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>{button('×','رجوع',onClose,recording)}<span>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')} / 3:00</span></div>
 <div style={{position:'absolute',right:12,top:'20%',display:'grid',gap:10}}>{button('↻','تبديل الكاميرا',()=>setFacing(v=>v==='user'?'environment':'user'),recording)}{button(mic?'♫':'×♫',mic?'كتم الميكروفون':'تشغيل الميكروفون',()=>{setMic(v=>!v);stream.current?.getAudioTracks().forEach(t=>t.enabled=!mic)})}</div>
 <div style={{position:'absolute',bottom:'max(20px,env(safe-area-inset-bottom))',left:10,right:10,textAlign:'center'}}>
 {error&&<p role="status" style={{background:'#101827cc',padding:8}}>{error}</p>}
 <div style={{display:'flex',direction:'ltr',justifyContent:'space-around',alignItems:'center',gap:8}}>
 <button type="button" disabled={recording} onClick={onPhotos} style={{background:'#172437dd',border:0,color:'white',padding:10,borderRadius:12}}>{ui('رفع صور')}</button>
 <button type="button" aria-label={ui(recording?'إيقاف التسجيل':'بدء التسجيل')} onClick={record} style={{width:76,height:76,border:'4px solid white',borderRadius:'50%',background:'transparent',display:'grid',placeItems:'center'}}><span style={{width:recording?30:57,height:recording?30:57,borderRadius:recording?6:'50%',background:'#ef394e'}}/></button>
 <button type="button" disabled={recording} onClick={()=>onGallery(false)} style={{background:'#172437dd',border:0,color:'white',padding:10,borderRadius:12}}>{ui('رفع فيديو')}</button>
 </div></div></div>;
}

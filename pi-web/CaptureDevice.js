import React,{useEffect,useRef,useState} from 'react';
import {checkShortVideo} from './short-upload-limits.mjs';

function selectFile(accept,multiple=false,capture){
  return new Promise(resolve=>{
    const input=document.createElement('input');
    input.type='file';input.accept=accept;input.multiple=multiple;
    if(capture)input.setAttribute('capture',capture);
    input.onchange=()=>resolve(Array.from(input.files||[]));
    input.oncancel=()=>resolve([]);input.click();
  });
}
async function preparedVideo(file){
  if(!file)return null;
  const error=await checkShortVideo(file);if(error)throw Error(error.error);
  return {file,uri:URL.createObjectURL(file)};
}
async function compressedPhoto(file){
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=url;await img.decode();
    const scale=Math.min(1,1440/Math.max(img.width,img.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    for(const quality of [.82,.65,.46,.3]){
      const data=canvas.toDataURL('image/jpeg',quality).split(',')[1];
      if(data&&data.length<=4*Math.floor(640*1024/3))return data;
    }
    throw Error('حجم الصور كبير جدًا');
  }finally{URL.revokeObjectURL(url);}
}
export async function pickPhotos(){
  const files=await selectFile('image/*',true);
  if(!files.length)return null;
  if(files.length>10)throw Error('اختر حتى ١٠ صور');
  const photos=[];for(const f of files)photos.push(await compressedPhoto(f));
  return {photos};
}
export function CaptureDevice({control,facing,muted,torch,onState,onReady,onError}){
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;};},[]);
  const host=useRef(null),stream=useRef(null),rec=useRef(null),actions=useRef(null),stopTimer=useRef(null);
  const [available,setAvailable]=useState(false);
  actions.current={onState,onReady,onError,muted};
  useEffect(()=>{
    let live=true,local;
    const stop=()=>{if(rec.current?.state==='recording')rec.current.stop();};
    function visibility(){if(document.hidden){stop();local?.getTracks().forEach(t=>t.stop());setAvailable(false);}else if(live)void connect();}
    async function connect(){
      let next;actions.current.onState({starting:true});
      try{
        if(!navigator.mediaDevices?.getUserMedia)throw Error();
        const video={facingMode:{ideal:facing},width:{ideal:720},height:{ideal:1280}};
        try{next=await navigator.mediaDevices.getUserMedia({video,audio:true});}
        catch{if(!live)return;next=await navigator.mediaDevices.getUserMedia({video,audio:false});}
        if(!live||document.hidden){next.getTracks().forEach(t=>t.stop());return;}
        local?.getTracks().forEach(t=>t.stop());local=stream.current=next;
        next.getAudioTracks().forEach(t=>{t.enabled=!actions.current.muted});
        host.current.srcObject=next;await host.current.play();if(!live)return;
        setAvailable(true);actions.current.onState({starting:false,torch:!!next.getVideoTracks()[0]?.getCapabilities?.().torch,audio:!!next.getAudioTracks().length});
      }catch{if(live){setAvailable(false);actions.current.onState({starting:false});actions.current.onError('الكاميرا غير متاحة. يمكنك التصوير بكاميرا الجهاز أو اختيار ملف.');}}
    }
    void connect();document.addEventListener('visibilitychange',visibility);
    return ()=>{live=false;clearTimeout(stopTimer.current);document.removeEventListener('visibilitychange',visibility);stop();local?.getTracks().forEach(t=>t.stop());stream.current=null;};
  },[facing]);
  useEffect(()=>{stream.current?.getAudioTracks().forEach(t=>{t.enabled=!muted;});},[muted,available]);
  useEffect(()=>{const track=stream.current?.getVideoTracks()[0];if(track?.getCapabilities?.().torch)track.applyConstraints({advanced:[{torch}]}).catch(()=>actions.current.onError('تعذّر تشغيل الفلاش'));},[torch,available]);
  useEffect(()=>{
    let live=true;
    control.current=async()=>{
      if(rec.current?.state==='recording'){rec.current.stop();return;}
      const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'].find(t=>globalThis.MediaRecorder?.isTypeSupported(t));
      if(!available||!mime){
        const [file]=await selectFile('video/*',false,facing);
        const result=await preparedVideo(file);if(live&&result)actions.current.onReady(result);else if(result)URL.revokeObjectURL(result.uri);
        return;
      }
      const parts=[],recorder=new MediaRecorder(stream.current,{mimeType:mime,videoBitsPerSecond:1650000,audioBitsPerSecond:96000});rec.current=recorder;
      recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};
      recorder.onerror=()=>{if(live)actions.current.onError('تعذّر تسجيل الفيديو');};
      recorder.onstop=async()=>{
        clearTimeout(stopTimer.current);rec.current=null;
        if(!mounted.current)return;
        actions.current.onState({recording:false,processing:true});
        try{
          const file=await preparedVideo(new File(parts,'clipi.mp4',{type:'video/mp4'}));
          if(mounted.current)actions.current.onReady(file);else URL.revokeObjectURL(file.uri);
        }catch(e){if(mounted.current)actions.current.onError(e.message);}
        finally{if(mounted.current)actions.current.onState({processing:false});}
      };
      recorder.start(400);actions.current.onState({recording:true});
      stopTimer.current=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},179750);
    };
    return ()=>{live=false;control.current=null;};
  },[available,control,facing]);
  return <video ref={host} autoPlay muted playsInline style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transform:facing==='user'?'scaleX(-1)':undefined}}/>;
}

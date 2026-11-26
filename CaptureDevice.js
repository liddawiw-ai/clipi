import React,{useEffect,useRef,useState} from 'react';
import {AppState,StyleSheet} from 'react-native';
import {CameraView,useCameraPermissions,useMicrophonePermissions} from 'expo-camera';
import {launchImageLibraryAsync} from 'expo-image-picker';
import {manipulateAsync,SaveFormat} from 'expo-image-manipulator';

async function preparedPhoto(asset){
  const dimension=asset.width>=asset.height?'width':'height';
  const actions=[{resize:{[dimension]:Math.min(1440,asset[dimension]||1440)}}];
  for(const compress of [.8,.6,.4,.25]){
    const result=await manipulateAsync(asset.uri,actions,{format:SaveFormat.JPEG,compress,base64:true});
    if(result.base64&&result.base64.length<=4*Math.floor(640*1024/3))return result.base64;
  }
  throw Error('حجم الصور كبير جدًا');
}
export async function pickPhotos(){
  const result=await launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,orderedSelection:true,selectionLimit:10});
  if(result.canceled||!result.assets.length)return null;
  if(result.assets.length>10)throw Error('اختر حتى ١٠ صور');
  const photos=[];
  for(const asset of result.assets)photos.push(await preparedPhoto(asset));
  return {photos};
}
export function CaptureDevice({control,mode='video',facing,muted,torch,onState,onReady,onError}){
  const cam=useRef(null),alive=useRef(true),recording=useRef(false),takingPhoto=useRef(false),ready=useRef(null),latest=useRef({});
  const [permission,askCamera,getCamera]=useCameraPermissions({get:false});
  const [mic,askMic,getMic]=useMicrophonePermissions({get:false});
  const [permissionsChecked,setPermissionsChecked]=useState(false);
  const [active,setActive]=useState(AppState.currentState!=='background');
  const cameraKey=facing+'/'+mode;
  latest.current={onState,onReady,onError,permission,mic};
  useEffect(()=>{
    alive.current=true;
    let current=true;
    async function enable(){
      try{
        let p=await getCamera();
        if(!current)return;
        if(!p.granted&&p.canAskAgain)p=await askCamera();
        if(!current)return;
        if(!p.granted){latest.current.onError('اسمح بالكاميرا من إعدادات الجهاز أو اختر ملفًا');return;}
        let m=await getMic();
        if(!current)return;
        if(!m.granted&&m.canAskAgain)m=await askMic();
        if(current)latest.current.onState({audio:m.granted});
      }catch{if(current)latest.current.onError('تعذّر فتح الكاميرا');}
      finally{if(current)setPermissionsChecked(true);}
    }
    void enable();
    const sub=AppState.addEventListener('change',s=>{if(s==='background'){if(recording.current)cam.current?.stopRecording();ready.current=false;setActive(false);}else if(s==='active')setActive(true);});
    return ()=>{current=false;alive.current=false;sub.remove();if(recording.current)cam.current?.stopRecording();};
  },[getCamera,askCamera,getMic,askMic]);
  useEffect(()=>{onState({torch:facing==='environment'});},[facing]);
  useEffect(()=>{
    control.current=async()=>{
      if(recording.current){cam.current?.stopRecording();return;}
      if(!permissionsChecked)return;
      if(!latest.current.permission?.granted){const p=await askCamera();if(!p.granted)throw Error('اسمح بالكاميرا من إعدادات الجهاز أو اختر ملفًا');return;}
      if(ready.current!==cameraKey||!cam.current)throw Error('انتظر حتى تفتح الكاميرا');
      if(mode==='photos'){
        if(takingPhoto.current)return;
        takingPhoto.current=true;latest.current.onState({processing:true});
        try{
          const picture=await cam.current.takePictureAsync({quality:.9});
          if(!picture?.uri)throw Error('تعذّرت قراءة الصور');
          const photo=await preparedPhoto(picture);
          if(alive.current)latest.current.onReady({photos:[photo]});
        }finally{takingPhoto.current=false;if(alive.current)latest.current.onState({processing:false});}
        return;
      }
      recording.current=true;latest.current.onState({recording:true});
      try{
        const result=await cam.current.recordAsync({maxDuration:180,maxFileSize:50*1024*1024});
        if(alive.current&&result?.uri)latest.current.onReady({uri:result.uri});
      }finally{recording.current=false;if(alive.current)latest.current.onState({recording:false});}
    };
    return ()=>{control.current=null;};
  },[control,askCamera,cameraKey,mode,permissionsChecked]);
  return permissionsChecked&&permission?.granted&&active?<CameraView key={cameraKey} ref={cam} style={StyleSheet.absoluteFill} mode={mode==='photos'?'picture':'video'} facing={facing==='user'?'front':'back'}
    enableTorch={torch&&facing==='environment'} mute={muted||!mic?.granted} videoQuality="720p" videoBitrate={1650000}
    onCameraReady={()=>{ready.current=cameraKey;}} onMountError={()=>latest.current.onError('تعذّر فتح الكاميرا')}/>:null;
}

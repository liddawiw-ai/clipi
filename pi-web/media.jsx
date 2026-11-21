import React,{useEffect,useState} from 'react';
import {LiveKitRoom as BrowserRoom,RoomAudioRenderer,useAudioPlayback,VideoTrack as Video} from '@livekit/components-react';
export {useConnectionState,useLocalParticipant,useParticipants,useTracks,isTrackReference} from '@livekit/components-react';
export {ConnectionState,Track} from 'livekit-client';
export const AudioSession={startAudioSession:async()=>{},stopAudioSession:async()=>{}};

function RoomSpeaker(){
  const {canPlayAudio,startAudio}=useAudioPlayback();
  const [muted,setMuted]=useState(false);
  const [failed,setFailed]=useState(false);
  const unlock=()=>startAudio().then(()=>setFailed(false)).catch(()=>setFailed(true));
  useEffect(()=>{
    if(canPlayAudio||muted)return;
    const resume=()=>{void unlock()};
    document.addEventListener('pointerdown',resume,{once:true,capture:true});
    return()=>document.removeEventListener('pointerdown',resume,true);
  },[canPlayAudio,muted,startAudio]);
  const needsTap=!canPlayAudio||failed;
  const label=needsTap||muted?'تشغيل سماعة الغرفة':'كتم سماعة الغرفة';
  return <><RoomAudioRenderer muted={muted}/><button aria-label={label} title={label} style={{position:'absolute',left:8,top:'43%',zIndex:4,borderRadius:20,padding:8,background:'#2c3765',color:'white'}} onClick={()=>{
    if(needsTap||muted){setMuted(false);void unlock()}else setMuted(true);
  }}>{needsTap?'🔊 تشغيل الصوت':muted?'🔇':'🔊'}</button></>;
}
export function LiveKitRoom({children,...props}){
 return <BrowserRoom {...props}><RoomSpeaker/>{children}</BrowserRoom>;
}
export function VideoTrack({trackRef}){
 return <Video trackRef={trackRef} playsInline style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0}}/>;
}

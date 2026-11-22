import {ui} from './interface-language.mjs';
import React,{useEffect,useState} from 'react';
import {LiveKitRoom as BrowserRoom,RoomAudioRenderer,useAudioPlayback,VideoTrack as Video} from '@livekit/components-react';
export {useConnectionState,useLocalParticipant,useParticipants,useTracks,isTrackReference} from '@livekit/components-react';
export {ConnectionState,Track} from 'livekit-client';
export const AudioSession={startAudioSession:async()=>{},stopAudioSession:async()=>{}};

function RoomSpeaker({muted}){
  const {canPlayAudio,startAudio}=useAudioPlayback();
  const [failed,setFailed]=useState(false);
  const unlock=()=>startAudio().then(()=>setFailed(false)).catch(()=>setFailed(true));
  useEffect(()=>{
    if(canPlayAudio||muted)return;
    const resume=()=>{void unlock()};
    document.addEventListener('pointerdown',resume,{once:true,capture:true});
    return()=>document.removeEventListener('pointerdown',resume,true);
  },[canPlayAudio,muted,startAudio]);
  return <><RoomAudioRenderer muted={muted}/>{!muted&&(!canPlayAudio||failed)&&
    <button style={{position:'absolute',left:8,top:'43%',zIndex:4,borderRadius:12,padding:8,background:'#244741',color:'white'}}
      onClick={()=>void unlock()}>{ui("🔊 تشغيل الصوت")}</button>}</>;
}
export function LiveKitRoom({children,speakerMuted,...props}){
 return <BrowserRoom {...props}><RoomSpeaker muted={speakerMuted}/>{children}</BrowserRoom>;
}
export function VideoTrack({trackRef}){
 return <Video trackRef={trackRef} playsInline style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0}}/>;
}

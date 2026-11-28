import React,{useEffect} from 'react';
import {LiveKitRoom as BrowserRoom,RoomAudioRenderer,useAudioPlayback,VideoTrack as Video} from '@livekit/components-react';
export {useConnectionState,useLocalParticipant,useParticipants,useTracks,isTrackReference} from '@livekit/components-react';
export {ConnectionState,Track} from 'livekit-client';
export const AudioSession={startAudioSession:async()=>{},stopAudioSession:async()=>{}};

function RoomSpeaker({muted}){
  const {canPlayAudio,startAudio}=useAudioPlayback();
  useEffect(()=>{
    if(canPlayAudio||muted)return;
    let pending=false;
    const resume=()=>{if(pending)return;pending=true;Promise.resolve().then(()=>startAudio()).catch(()=>{}).finally(()=>{pending=false});};
    resume();
    document.addEventListener('pointerdown',resume,true);
    document.addEventListener('touchend',resume,true);
    window.addEventListener('pageshow',resume);
    return()=>{document.removeEventListener('pointerdown',resume,true);document.removeEventListener('touchend',resume,true);window.removeEventListener('pageshow',resume);};
  },[canPlayAudio,muted,startAudio]);
  return <RoomAudioRenderer muted={muted}/>;
}
export function LiveKitRoom({children,speakerMuted,...props}){
 return <BrowserRoom {...props}><RoomSpeaker muted={speakerMuted}/>{children}</BrowserRoom>;
}
export function VideoTrack({trackRef}){
 return <Video trackRef={trackRef} playsInline style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0}}/>;
}

import React from 'react';
import {LiveKitRoom as BrowserRoom,RoomAudioRenderer,StartAudio,VideoTrack as Video} from '@livekit/components-react';
export {useConnectionState,useLocalParticipant,useParticipants,useTracks,isTrackReference} from '@livekit/components-react';
export {ConnectionState,Track} from 'livekit-client';
export const AudioSession={startAudioSession:async()=>{},stopAudioSession:async()=>{}};
export function LiveKitRoom({children,...props}){
 return <BrowserRoom {...props}><RoomAudioRenderer/><StartAudio label="تشغيل صوت الغرفة"/>{children}</BrowserRoom>;
}
export function VideoTrack({trackRef}){
 return <Video trackRef={trackRef} playsInline style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0}}/>;
}

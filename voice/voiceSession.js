// Clipi voice transport for a custom Expo development build.
// Requires @livekit/react-native and @livekit/react-native-webrtc.
// Token is issued by a trusted Firebase Cloud Function, never by the app.
import {AudioSession,registerGlobals} from '@livekit/react-native';
import {Room,RoomEvent} from 'livekit-client';
import functions from '@react-native-firebase/functions';

registerGlobals();

export async function connectVoiceRoom({roomId,onParticipant,onDisconnected}){
  if(!roomId||typeof roomId!=='string')throw new Error('Invalid room ID');
  const response=await functions().httpsCallable('issueVoiceToken')({roomId});
  const {url,token}=response.data||{};
  if(!url||!token)throw new Error('Voice server unavailable');
  const room=new Room({adaptiveStream:true,dynacast:true});
  const update=()=>onParticipant?.(room.remoteParticipants.size+1);
  room.on(RoomEvent.ParticipantConnected,update);
  room.on(RoomEvent.ParticipantDisconnected,update);
  room.on(RoomEvent.Disconnected,()=>onDisconnected?.());
  try{
    await AudioSession.startAudioSession();
    await room.connect(url,token,{autoSubscribe:true});
    update();
    return {
      room,
      setMicrophoneEnabled:async enabled=>{
        await room.localParticipant.setMicrophoneEnabled(Boolean(enabled));
      },
      disconnect:async()=>{
        await room.localParticipant.setMicrophoneEnabled(false).catch(()=>{});
        await room.disconnect();
        await AudioSession.stopAudioSession();
      }
    };
  }catch(error){
    await room.disconnect().catch(()=>{});
    await AudioSession.stopAudioSession().catch(()=>{});
    throw error;
  }
}

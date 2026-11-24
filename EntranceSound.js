import {useEffect} from 'react';
import {useVideoPlayer} from 'expo-video';

export default function EntranceSound({source,muted}){
  const player=useVideoPlayer(source,p=>{
    p.audioMixingMode='mixWithOthers';
    p.volume=0.42;
    p.muted=muted;
  });
  useEffect(()=>{player.muted=muted;},[player,muted]);
  useEffect(()=>{player.play();},[player]);
  return null;
}

import {useEffect} from 'react';
import {useAudioPlayer} from 'expo-audio';

export default function GiftAudio({source}){
  const player=useAudioPlayer(source);
  useEffect(()=>{
    player.volume=.42;
    player.play();
  },[player]);
  return null;
}

import {useEffect} from 'react';

let context;
function unlock(){
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext)return;
  try{
    context??=new AudioContext();
    if(context.state==='suspended')context.resume().catch(()=>{});
  }catch{}
}
for(const type of ['pointerdown','keydown'])window.addEventListener(type,unlock,{passive:true});
export default function GiftAudio({source}){
  useEffect(()=>{
    let active=true,node,gain;
    const abort=new AbortController();
    async function play(){
      if(!context||context.state!=='running')return;
      const res=await fetch(source,{signal:abort.signal});
      if(!res.ok)return;
      const clip=await context.decodeAudioData(await res.arrayBuffer());
      if(!active)return;
      node=context.createBufferSource();gain=context.createGain();
      gain.gain.value=.42;node.buffer=clip;node.connect(gain);gain.connect(context.destination);node.start();
    }
    play().catch(()=>{});
    return ()=>{active=false;abort.abort();if(node){node.stop();node.disconnect();gain.disconnect()}};
  },[source]);
  return null;
}

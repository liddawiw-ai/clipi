import React,{useEffect,useRef} from 'react';
export default function EntranceSound({source,muted}){
  const ref=useRef(null);
  useEffect(()=>{
    const audio=ref.current;
    audio.volume=0.42;
    audio.play().catch(()=>{});
    return ()=>{audio.pause();};
  },[source]);
  return <audio ref={ref} src={source} muted={muted} preload="auto" aria-hidden="true"/>;
}

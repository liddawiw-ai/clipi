import {useEffect,useState} from 'react';

export function useShortCaption(player,cues,enabled){
  const [caption,setCaption]=useState('');
  useEffect(()=>{
    if(!enabled||!cues?.length){setCaption('');return;}
    function update(){
      const time=player.current?.currentTime??0;
      let cue;
      for(let i=cues.length-1;i>=0;i--){if(time>=cues[i].at){cue=cues[i];break;}}
      setCaption(cue&&time<cue.at+5?cue.text:'');
    }
    update();
    const timer=setInterval(update,150);
    return ()=>clearInterval(timer);
  },[player,cues,enabled]);
  return caption;
}

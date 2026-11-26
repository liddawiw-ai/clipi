import {useEffect,useRef} from 'react';
import {nonce} from './ShortMedia';

export function useWatchVisit({clip,viewer,active,playing,playerRef,playback,request}){
  const visit=useRef(null);
  useEffect(()=>{
    visit.current=active&&viewer?{id:nonce(),watched:0,started:false,finished:false,sending:false,retry:0}:null;
    return ()=>{visit.current=null;};
  },[clip,viewer,active]);
  useEffect(()=>{
    const session=visit.current;
    if(!session||session.recordedEnd||!playing)return;
    let previous=Number(playerRef.current?.currentTime)||0,last=Date.now();
    const timer=setInterval(()=>{
      const p=playerRef.current,now=Date.now();
      if(!p||!playback.isSelected(clip)||p.playing===false||p.paused===true){last=now;previous=Number(p?.currentTime)||0;return;}
      const at=Number(p.currentTime),duration=Number(p.duration),elapsed=(now-last)/1000;
      if(!Number.isFinite(at)||!(duration>0)||!Number.isFinite(duration))return;
      const loop=at<previous&&previous>duration*.65&&at<duration*.35;
      const delta=loop?duration-previous+at:at-previous;
      previous=at;last=now;
      if(delta>0&&delta<=elapsed+.28&&elapsed<2)session.watched+=delta;
      const edge=Math.min(.3,duration*.06);
      if(session.watched>=duration-Math.max(edge,.28)&&(loop||at>=duration-edge))session.finished=true;
      if(session.watched<Math.min(.2,duration*.35)||session.sending||now<session.retry||session.started&&!session.finished)return;
      const complete=session.finished;
      session.sending=true;
      request('/account-number',{op:'shortWatch',clip,visit:session.id,finished:complete})
        .then(()=>{session.started=true;if(complete){session.recordedEnd=true;clearInterval(timer);}})
        .catch(()=>{session.retry=Date.now()+4000;}).finally(()=>{session.sending=false;});
    },200);
    return ()=>clearInterval(timer);
  },[clip,viewer,active,playing,request,playerRef,playback]);
}

import {useEffect,useRef} from 'react';

export function usePullDown(list,enabled,refresh){
  const stage=useRef(null);
  const refreshRef=useRef(refresh);
  refreshRef.current=refresh;
  useEffect(()=>{
    const node=stage.current;
    if(!enabled||!node)return;
    let origin=null;
    function start(event){
      const scroller=list.current?.getScrollableNode();
      const finger=event.touches[0];
      origin=event.touches.length===1&&scroller?.contains(event.target)&&scroller.scrollTop<=1
        ?{x:finger.clientX,y:finger.clientY,id:finger.identifier}:null;
    }
    function move(event){
      if(!origin)return;
      const finger=event.touches[0];
      if(event.touches.length!==1||finger.identifier!==origin.id){origin=null;return;}
      const dx=Math.abs(finger.clientX-origin.x),dy=finger.clientY-origin.y;
      if(dy < -8 || (dx>10&&dx>Math.abs(dy))){origin=null;return;}
      if(dy>6&&dy>dx*1.3&&event.cancelable)event.preventDefault();
    }
    function end(event){
      const from=origin;
      origin=null;
      const finger=event.changedTouches[0];
      if(!from||event.touches.length||finger.identifier!==from.id)return;
      const dy=finger.clientY-from.y;
      if(dy>=64&&dy>Math.abs(finger.clientX-from.x)*1.3)refreshRef.current();
    }
    function cancel(){origin=null;}
    node.addEventListener('touchstart',start,{passive:true});
    node.addEventListener('touchmove',move,{passive:false});
    node.addEventListener('touchend',end);
    node.addEventListener('touchcancel',cancel);
    return ()=>{
      node.removeEventListener('touchstart',start);node.removeEventListener('touchmove',move);
      node.removeEventListener('touchend',end);node.removeEventListener('touchcancel',cancel);
    };
  },[list,enabled]);
  return stage;
}

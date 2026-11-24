import {useEffect,useRef,useState} from 'react';

export function useClipLike(save,onError) {
  const model=useRef({liked:false,likes:null,desired:null,saving:false,confirmed:false});
  const alive=useRef(true);
  const [view,setView]=useState({liked:false,likes:null});
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;};},[]);
  function render(){
    const state=model.current;
    const liked=state.desired??state.liked;
    const likes=state.likes==null ? null : Math.max(0,state.likes+Number(liked)-Number(state.liked));
    if(alive.current)setView({liked,likes});
  }
  function initialize(initial){
    const state=model.current;
    if(state.confirmed)return;
    state.liked=initial.liked;state.likes=initial.likes;render();
  }
  async function like(wanted,onTap){
    const state=model.current;
    state.desired=wanted??!(state.desired??state.liked);
    onTap?.();render();
    if(state.saving)return;
    state.saving=true;
    try {
      while(state.desired!=null){
        const target=state.desired;
        if(state.likes!=null&&target===state.liked){state.desired=null;break;}
        const result=await save(target);
        state.confirmed=true;state.liked=result.liked;state.likes=result.likes;
        if(state.desired===target)state.desired=null;
        render();
      }
    } catch {
      state.desired=null;
      if(alive.current)onError();
    } finally {state.saving=false;render();}
  }
  return {...view,like,initialize};
}

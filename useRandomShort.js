import {useEffect,useRef,useState} from 'react';
import {ui} from './interface-language.mjs';

export function useRandomShort({enabled,firstId,initialId,request,removed,setItems,setNotice}){
  const [refreshing,setRefreshing]=useState(false);
  const pending=useRef(null);
  useEffect(()=>{
    setRefreshing(false);
    return ()=>{pending.current=null;};
  },[enabled,firstId,initialId,request]);

  async function refresh(){
    if(!enabled||pending.current)return;
    const attempt={};
    pending.current=attempt;
    setRefreshing(true);
    setNotice('');
    try{
      const {clip}=await request('/account-number',{op:'shortRandom',exclude:firstId??''});
      if(pending.current!==attempt)return;
      if(!clip||removed.current.has(clip.id)){
        setNotice(ui(firstId?'لا يوجد فيديو آخر منشور حاليًا':'لا توجد فيديوهات منشورة بعد'));
        return;
      }
      setItems(items=>[clip,...(items||[]).filter(item=>item.id!==clip.id)]);
    }catch{
      if(pending.current===attempt)setNotice(ui('تعذّر تحميل المقاطع الجديدة'));
    }finally{
      if(pending.current===attempt){pending.current=null;setRefreshing(false);}
    }
  }
  return {refresh,refreshing};
}

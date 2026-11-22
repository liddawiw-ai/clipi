import {ui} from './interface-language.mjs';
import {useState,useRef,useEffect} from 'react';
import {auth} from './services';

export function useRoomSession(roomId,username,equipped,onEntry,onExit){
  const [session]=useState(()=>crypto.randomUUID());
  const [state,setState]=useState(null),[error,setError]=useState(''),[pinRequired,setPinRequired]=useState(false);
  const current=useRef({onEntry,onExit,username,equipped});
  current.current={onEntry,onExit,username,equipped};
  const known=useRef(null),sequence=useRef(0),lastApplied=useRef(0),alive=useRef(true);
  async function act(op,extra={}){
    const index=++sequence.current;
    const token=await auth().currentUser?.getIdToken();
    const response=await fetch('/room-control',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({op,roomId,session,...extra}),signal:AbortSignal.timeout(12000)});
    const data=await response.json();
    if(!response.ok){
      if(alive.current){
        if(data.pinRequired)setPinRequired(true);
        if(op==='poll'&&[403,404].includes(response.status)){current.current.onExit(ui(data.error));return}
      }
      throw Error(ui(data.error)||ui("تعذّر الاتصال بالغرفة"));
    }
    if(!alive.current||!data.people||index<lastApplied.current)return;
    lastApplied.current=index;
    const newKeys=new Set(data.people.map(p=>p.uid+'/'+p.joined));
    const entries=known.current?data.people.filter(p=>!known.current.has(p.uid+'/'+p.joined)):data.people.filter(p=>p.uid===auth().currentUser?.uid);
    known.current=newKeys;setState(data);setError('');setPinRequired(false);
    if(entries.length)current.current.onEntry(entries);
  }
  function join(pin){return act('join',{pin,name:current.current.username,frame:!!current.current.equipped.frame,ride:!!current.current.equipped.ride}).catch(e=>setError(e.message))}
  useEffect(()=>{
    alive.current=true;
    void join();
    return ()=>{alive.current=false;void act('leave').catch(()=>{})};
  },[roomId]);
  const joined=!!state;
  useEffect(()=>{
    if(!joined)return;
    let stopped=false,timer;
    async function poll(){
      try{await act('poll')}catch(e){if(!stopped)setError(e.message)}
      if(!stopped)timer=setTimeout(poll,3500);
    }
    timer=setTimeout(poll,3500);
    return()=>{stopped=true;clearTimeout(timer)};
  },[roomId,joined]);
  return {state,error,pinRequired,join,act,session};
}

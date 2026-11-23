import {equippedEntrance,incomingEntries} from './entranceStyles.mjs';
import {ui} from './interface-language.mjs';
import {useState,useRef,useEffect} from 'react';
import {auth} from './services';

export function useRoomSession(roomId,username,equipped,onEntry,onExit,avatar){
  const [session]=useState(()=>crypto.randomUUID());
  const [state,setState]=useState(null),[error,setError]=useState(''),[pinRequired,setPinRequired]=useState(false);
  const current=useRef({onEntry,onExit,username,equipped,avatar});
  current.current={onEntry,onExit,username,equipped,avatar};
  const known=useRef(null),sequence=useRef(0),lastApplied=useRef(0),alive=useRef(true);
  const [supportBalance,setSupportBalance]=useState(null);
  const lastBalanceResponse=useRef(0);
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
    const diamonds=data.senderDiamonds??data.supportBalance;
    if(alive.current&&index>lastBalanceResponse.current&&Number.isSafeInteger(diamonds)){
      lastBalanceResponse.current=index;
      setSupportBalance(diamonds);
    }
    if(op==='giftRecipient')return data;
    if(op==='paidGift')return data.receipt;
    if(!alive.current||!data.people||index<lastApplied.current)return;
    lastApplied.current=index;
    const {known:next,arrivals}=incomingEntries(known.current,data.people,auth().currentUser?.uid);
    known.current=next;setState(data);setError('');setPinRequired(false);
    if(arrivals.length)current.current.onEntry(arrivals);
  }
  const [joining,setJoining]=useState(false);
  const joinLock=useRef(false);
  async function join(pin){
    if(joinLock.current)return;
    joinLock.current=true;
    setJoining(true);
    try{
      await act('join',{pin,avatar:current.current.avatar,name:current.current.username,frame:!!current.current.equipped.frame,ride:equippedEntrance(current.current.equipped)});
    }catch(error){if(alive.current)setError(error.message)}
    finally{joinLock.current=false;if(alive.current)setJoining(false)}
  }
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
  return {state,supportBalance,error,pinRequired,joining,join,act,session};
}

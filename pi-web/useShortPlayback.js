import {useLayoutEffect,useState} from 'react';
import {createShortPlayback} from './short-playback.mjs';

export function useShortPlayback(selected,enabled){
  const [session]=useState(createShortPlayback);
  useLayoutEffect(()=>{session.select(selected);},[session,selected]);
  useLayoutEffect(()=>{
    if(!enabled)return;
    session.focus();
    return ()=>session.blur();
  },[session,enabled]);
  return session;
}

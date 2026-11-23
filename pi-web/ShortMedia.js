import React,{useEffect,useImperativeHandle,useRef} from 'react';

export const starters=Object.fromEntries(['palace','aurora','dunes'].map(id=>[id,'/shorts/starter/'+id+'.mp4']));
export const starterPoster=id=>Object.hasOwn(starters,id)?'/shorts/starter/'+id+'.jpg':undefined;
export const nonce=()=>crypto.randomUUID();
export function Player({source,active=true,muted=true,playerRef,onMuteRequired,poster,onTimeUpdate,fit='cover'}){
  const ref=useRef(null);
  useImperativeHandle(playerRef,()=>ref.current,[]);
  useEffect(()=>{
    const video=ref.current;
    let current=true;
    function sync(){
      if(!active||document.hidden){video.pause();return;}
      video.muted=muted;
      video.play().catch(error=>{
        if(current&&!document.hidden&&!muted&&error.name==='NotAllowedError')onMuteRequired?.(true);
      });
    }
    sync();
    document.addEventListener('visibilitychange',sync);
    return ()=>{current=false;document.removeEventListener('visibilitychange',sync);video.pause();};
  },[source,active,muted,onMuteRequired]);
  return <video ref={ref} src={source} poster={poster} onTimeUpdate={onTimeUpdate} muted={muted} loop playsInline preload="auto" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:fit}}/>;
}
export function pickShort(){
  return new Promise((resolve,reject)=>{
    const input=document.createElement('input');
    input.type='file';input.accept='video/mp4,.mp4';
    input.oncancel=()=>resolve(null);
    input.onchange=()=>{
      const file=input.files[0];
      if(!file)return resolve(null);
      if(file.size>24*1024*1024)return reject(Error('اختر فيديو حجمه حتى ٢٤ ميغابايت'));
      resolve({file,uri:URL.createObjectURL(file)});
    };
    input.click();
  });
}
export const releaseDraft=draft=>URL.revokeObjectURL(draft.uri);
export async function uploadFile(url,draft,token){
  const response=await fetch(url,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'video/mp4'},body:draft.file});
  if(!response.ok)throw Error((await response.json().catch(()=>({}))).error||'تعذّر رفع الفيديو');
}
export async function shareShort(url){if(navigator.share)await navigator.share({url});else await navigator.clipboard.writeText(url);}
export function saveShort(id,url){const a=document.createElement('a');a.href=url;a.download='Clipi-'+id+'.mp4';document.body.appendChild(a);a.click();a.remove();}

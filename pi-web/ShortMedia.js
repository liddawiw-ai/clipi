import React,{useEffect,useRef} from 'react';

export const starters=Object.fromEntries(['palace','aurora','dunes'].map(id=>[id,'/shorts/starter/'+id+'.mp4']));
export const nonce=()=>crypto.randomUUID();
export function Player({source,active=true,muted=true}){
  const ref=useRef(null);
  useEffect(()=>{
    const video=ref.current;
    function sync(){
      if(!active||document.hidden){video.pause();return;}
      video.muted=muted;
      video.play().catch(()=>{});
    }
    sync();
    document.addEventListener('visibilitychange',sync);
    return ()=>{document.removeEventListener('visibilitychange',sync);video.pause();};
  },[source,active,muted]);
  return <video ref={ref} src={source} muted={muted} loop playsInline preload="auto" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>;
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

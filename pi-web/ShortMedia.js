import {selectFile} from './select-file.mjs';
import {createShortPlayback} from './short-playback.mjs';
import React,{useLayoutEffect,useImperativeHandle,useRef,useState} from 'react';
import {checkShortVideo} from './short-upload-limits.mjs';

export const shortsLookahead = () => 2;
export const nonce=()=>crypto.randomUUID();
export function startProfileVideo(source, poster, playable, preparedVideo) {
  const video = preparedVideo || document.createElement('video');
  video.defaultMuted = video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  if (poster) video.poster = poster;
  if (video.getAttribute('src') !== source) video.src = source;
  // Start inside the tile's tap, before the modal has measured its layout.
  if (playable && !document.hidden){
    const startup=createShortPlayback();
    startup.select(source);startup.focus();
    startup.attach(source,{
      start:()=>video.play().catch(()=>{}),
      stop:()=>{video.muted=true;video.pause();}
    });
  }
  return video;
}

export function Player({source, clipId, playback, initialVideo, active=true, muted=true, preload='auto', playerRef,
  onMuteRequired, onPlayBlocked, poster, onTimeUpdate, onPlayingChange, fit='cover'}) {
  const container = useRef(null);
  const [video] = useState(() => initialVideo || document.createElement('video'));
  const callbacks = useRef({});
  const audio=useRef(null);
  callbacks.current = {muted,onMuteRequired, onPlayBlocked, onPlayingChange, onTimeUpdate};
  useImperativeHandle(playerRef, () => video, [video]);

  useLayoutEffect(() => {
    const host = container.current;
    video.playsInline = true;
    video.loop = true;
    video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    host.appendChild(video);
    const playing = () => callbacks.current.onPlayingChange?.(true);
    const paused = () => callbacks.current.onPlayingChange?.(false);
    const time = event => callbacks.current.onTimeUpdate?.(event);
    video.addEventListener('playing', playing);
    video.addEventListener('pause', paused);
    video.addEventListener('timeupdate', time);
    if (!video.paused && video.readyState >= 3) playing();
    return () => {
      video.removeEventListener('playing', playing);
      video.removeEventListener('pause', paused);
      video.removeEventListener('timeupdate', time);
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    };
  }, [video]);

  useLayoutEffect(() => {video.style.objectFit = fit;}, [video, fit]);

  useLayoutEffect(() => {
    video.preload = preload;
    if (poster) video.poster = poster;
    if (video.getAttribute('src') !== source) video.src = source;
  }, [video, preload, poster, source]);

  useLayoutEffect(() => {
    let gestureRequired=false, pageVisible=!document.hidden;
    function selected(){return pageVisible&&!document.hidden&&playback.owns(control);}
    function allowed(){return active&&selected();}
    function stop(){video.autoplay=false;video.defaultMuted=video.muted=true;video.pause();}
    function applyVolume(){video.defaultMuted=video.muted=!selected()||callbacks.current.muted;}
    function start(){
      if(!allowed()){stop();return;}
      applyVolume();
      if(!video.paused)return;
      video.play().catch(error=>{
        if(!allowed()||error.name!=='NotAllowedError')return;
        if(video.muted){gestureRequired=true;callbacks.current.onPlayBlocked?.();return;}
        video.defaultMuted=video.muted=true;
        callbacks.current.onMuteRequired?.(true);
        video.play().catch(retry=>{
          if(allowed()&&retry.name==='NotAllowedError'){gestureRequired=true;callbacks.current.onPlayBlocked?.();}
        });
      });
    }
    const control={start,stop};
    const ready=()=>{if(allowed()&&!gestureRequired)start();};
    const guard=()=>{if(!allowed())stop();};
    const visibility=()=>{pageVisible=!document.hidden;if(allowed())start();else stop();};
    const hide=()=>{pageVisible=false;stop();};
    audio.current=applyVolume;
    video.autoplay=false;
    if(!active)stop();
    const detach=playback.attach(clipId??source,control);
    applyVolume();
    video.addEventListener('play',guard);
    video.addEventListener('playing',guard);
    video.addEventListener('canplay',ready);
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pagehide',hide);
    window.addEventListener('pageshow',visibility);
    return ()=>{
      video.removeEventListener('play',guard);
      video.removeEventListener('playing',guard);
      video.removeEventListener('canplay',ready);
      document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('pagehide',hide);
      window.removeEventListener('pageshow',visibility);
      audio.current=null;
      detach();
    };
  }, [video, source, active, playback, clipId]);
  useLayoutEffect(()=>{audio.current?.();},[muted]);

  return <span ref={container}/>;
}
export async function pickShort(){
  const [file]=await selectFile('video/mp4,.mp4');
  if(!file)return null;
  const problem=await checkShortVideo(file);
  if(problem)throw new Error(problem.error);
  return {file,uri:URL.createObjectURL(file)};
}
export const releaseDraft=draft=>{if(draft.uri)URL.revokeObjectURL(draft.uri);};
export async function uploadFile(url,draft,token){
  const response=await fetch(url,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'video/mp4'},body:draft.file});
  if(!response.ok)throw Error((await response.json().catch(()=>({}))).error||'تعذّر رفع الفيديو');
}
export function shortVideoUrl(endpoint,id) {
  return endpoint.replace(/\/+$/,'')+'/shorts/media/'+encodeURIComponent(id);
}
export async function copyShortLink(url) {
  if(navigator.clipboard?.writeText){
    try {await navigator.clipboard.writeText(url);return;} catch {}
  }
  const field=document.createElement('textarea');
  field.value=url;field.style.cssText='position:fixed;left:-9999px;top:0';
  const focused=document.activeElement;
  document.body.append(field);
  try {
    field.select();
    if(!document.execCommand('copy'))throw Error('تعذّر نسخ الرابط');
  } finally {field.remove();focused?.focus?.();}
}
export async function shareShort(url){
  if(navigator.share)await navigator.share({url});
  else await copyShortLink(url);
}
export function saveShort(id,url,photo=false){const a=document.createElement('a');a.href=url;a.download='Clipi-'+id+(photo?'.jpg':'.mp4');document.body.appendChild(a);a.click();a.remove();}

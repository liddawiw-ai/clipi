import React,{useLayoutEffect,useImperativeHandle,useRef,useState} from 'react';
import {checkShortVideo} from './short-upload-limits.mjs';

export const starters=Object.fromEntries(['palace','aurora','dunes'].map(id=>[id,'/shorts/starter/'+id+'.mp4']));
export const starterPoster=id=>Object.hasOwn(starters,id)?'/shorts/starter/'+id+'.jpg':undefined;
// Keep the next two players warm for fast consecutive swipes. Respect reduced-data connections.
export function shortsLookahead() {
  const connection = globalThis.navigator?.connection;
  return connection?.saveData || ['slow-2g','2g'].includes(connection?.effectiveType) ? 1 : 2;
}
export const nonce=()=>crypto.randomUUID();
export function startProfileVideo(source, poster, playable, preparedVideo) {
  const video = preparedVideo || document.createElement('video');
  video.defaultMuted = video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  if (poster) video.poster = poster;
  if (video.getAttribute('src') !== source) video.src = source;
  // Start inside the tile's tap, before the modal has measured its layout.
  if (playable && !document.hidden) video.play().catch(() => {});
  return video;
}

export function Player({source, initialVideo, active=true, muted=true, preload='auto', playerRef,
  onMuteRequired, onPlayBlocked, poster, onTimeUpdate, onPlayingChange, fit='cover'}) {
  const container = useRef(null);
  const [video] = useState(() => initialVideo || document.createElement('video'));
  const callbacks = useRef({});
  callbacks.current = {onMuteRequired, onPlayBlocked, onPlayingChange, onTimeUpdate};
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
  useLayoutEffect(() => {video.defaultMuted = video.muted = muted;}, [video, muted]);
  useLayoutEffect(() => {
    video.preload = preload;
    if (poster) video.poster = poster;
    if (video.getAttribute('src') !== source) video.src = source;
  }, [video, preload, poster, source]);

  useLayoutEffect(() => {
    let current = true, gestureRequired = false;
    video.autoplay = active;
    function sync() {
      if (!active || document.hidden) {video.pause(); return;}
      if (!video.paused) return;
      video.play().catch(error => {
        if (!current || document.hidden || error.name !== 'NotAllowedError') return;
        if (video.muted) {gestureRequired = true; callbacks.current.onPlayBlocked?.(); return;}
        video.muted = true;
        callbacks.current.onMuteRequired?.(true);
        video.play().catch(retry => {
          if (current && !document.hidden && retry.name === 'NotAllowedError') {
            gestureRequired = true; callbacks.current.onPlayBlocked?.();
          }
        });
      });
    }
    // A denied autoplay must not consume a tap on the visible play button.
    const ready = () => {if (!gestureRequired) sync();};
    sync();
    video.addEventListener('canplay', ready);
    document.addEventListener('visibilitychange', sync);
    return () => {
      current = false;
      video.autoplay = false;
      video.removeEventListener('canplay', ready);
      document.removeEventListener('visibilitychange', sync);
      video.pause();
    };
  }, [video, source, active]);

  return <span ref={container}/>;
}
export function pickShort(){
  return new Promise((resolve,reject)=>{
    const input=document.createElement('input');
    input.type='file';input.accept='video/mp4,.mp4';
    input.oncancel=()=>resolve(null);
    input.onchange=async()=>{
      const file=input.files[0];
      if(!file)return resolve(null);
      try {
        const problem = await checkShortVideo(file);
        if (problem) throw new Error(problem.error);
        resolve({file, uri:URL.createObjectURL(file)});
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}
export const releaseDraft=draft=>URL.revokeObjectURL(draft.uri);
export async function uploadFile(url,draft,token){
  const response=await fetch(url,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'video/mp4'},body:draft.file});
  if(!response.ok)throw Error((await response.json().catch(()=>({}))).error||'تعذّر رفع الفيديو');
}
export function shortVideoUrl(endpoint,id) {
  const path=Object.prototype.hasOwnProperty.call(starters,id)
    ? '/shorts/starter/'+encodeURIComponent(id)+'.mp4' : '/shorts/media/'+encodeURIComponent(id);
  return endpoint.replace(/\/+$/,'')+path;
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
export function saveShort(id,url){const a=document.createElement('a');a.href=url;a.download='Clipi-'+id+'.mp4';document.body.appendChild(a);a.click();a.remove();}

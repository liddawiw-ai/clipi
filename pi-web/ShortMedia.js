import {presentSilentShort,presentPortableShort} from './SilentShort';
import {selectFile} from './select-file.mjs';
import {createShortPlayback} from './short-playback.mjs';
import React,{useLayoutEffect,useImperativeHandle,useRef,useState} from 'react';
import {checkShortVideo} from './short-upload-limits.mjs';

export const shortsLookahead = () => 2;
export const nonce=()=>crypto.randomUUID();
function inlineVideo(video){
  video.playsInline=true;
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');
  video.defaultMuted=video.muted=true;
  return video;
}
export function warmFeedVideo(endpoint,id) {
  if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id||''))return null;
  const source=shortPlaybackUrl(endpoint,id);
  const shared=document.getElementById('clipi-shared-video');
  const reusable=shared&&shared.src===new URL(source,location.href).href;
  const video=inlineVideo(reusable?shared:document.createElement('video'));
  if(reusable){
    video.removeAttribute('id');video.hidden=false;video.remove();
  }else{
    video.preload='metadata';video.src=source;
  }
  return {id,video,adopted:false};
}
export function startProfileVideo(source, poster, playable, preparedVideo) {
  const video = inlineVideo(preparedVideo || document.createElement('video'));
  video.defaultMuted = video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  if (poster) video.poster = poster;
  if (video.src !== new URL(source,location.href).href) video.src = source;
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
  const [video] = useState(() => inlineVideo(initialVideo || document.createElement('video')));
  const callbacks = useRef({});
  const audio=useRef(null);
  callbacks.current = {muted,onMuteRequired, onPlayBlocked, onPlayingChange, onTimeUpdate};
  const silent=useRef(null);
  const handoff=useRef(null);
  useImperativeHandle(playerRef, () => ({
    get currentTime(){return silent.current?.playing?silent.current.currentTime:video.currentTime;},
    get duration(){return silent.current?.duration||video.duration;},
    get paused(){return !silent.current?.playing&&video.paused;},
    pause(){video.pause();},
    play(){return video.play();},
    enableSound(){handoff.current?.();}
  }), [video]);

  useLayoutEffect(() => {
    const host = container.current;
    video.playsInline = true;
    video.loop = true;
    video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    host.appendChild(video);
    const playing = () => callbacks.current.onPlayingChange?.(true);
    const paused = () => {if(!silent.current?.playing)callbacks.current.onPlayingChange?.(false);};
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

  useLayoutEffect(() => {
    video.style.objectFit=fit;
    if(silent.current)silent.current.canvas.style.objectFit=fit;
  },[video,fit]);

  useLayoutEffect(() => {
    video.preload = preload;
    if (poster) video.poster = poster;
    if (video.src !== new URL(source,location.href).href) video.src = source;
  }, [video, preload, poster, source]);

  useLayoutEffect(() => {
    let pageVisible=!document.hidden, inFlight=null, disposed=false, mutedFallback=false;
    let deniedWhenReady=false, denialTimer;
    function selected(){return !disposed&&pageVisible&&!document.hidden&&playback.owns(control);}
    function allowed(){return active&&selected();}
    function stopSilent(){
      const session=silent.current;
      if(!session)return;
      silent.current=null;session.close();
      if(session.playing&&video.readyState>=1&&Math.abs(video.currentTime-session.currentTime)>.025){
        video.currentTime=session.currentTime;
      }
    }
    function startSilent(){
      if(!allowed()||!video.paused||silent.current)return;
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||navigator.connection?.saveData){
        callbacks.current.onPlayBlocked?.();return;
      }
      let started=false;
      function frame(session){
        if(!started){started=true;callbacks.current.onPlayingChange?.(true);}
        callbacks.current.onTimeUpdate?.({currentTarget:{currentTime:session.currentTime,duration:session.duration||video.duration}});
      }
      function blocked(){
        stopSilent();callbacks.current.onPlayingChange?.(false);callbacks.current.onPlayBlocked?.();
      }
      function portableFrames(){
        stopSilent();
        if(!allowed()||!video.paused)return;
        try{silent.current=presentPortableShort(video,container.current,frame,blocked);}
        catch{blocked();}
      }
      if(window.VideoDecoder){
        try{silent.current=presentSilentShort(video,container.current,frame,portableFrames);}
        catch{portableFrames();}
      }else portableFrames();
    }
    function stop(){
      clearTimeout(denialTimer);deniedWhenReady=false;inFlight=null;video.autoplay=false;
      if(silent.current?.playing)callbacks.current.onPlayingChange?.(false);
      stopSilent();video.defaultMuted=video.muted=true;video.pause();
    }
    function applyVolume(){video.defaultMuted=video.muted=!selected()||mutedFallback||callbacks.current.muted;}
    function start(){
      if(!allowed()){stop();return;}
      applyVolume();video.autoplay=true;
      if(!video.paused||inFlight||deniedWhenReady)return;
      const attempt={};inFlight=attempt;
      clearTimeout(denialTimer);
      denialTimer=setTimeout(()=>{
        // Some embedded players leave play() pending even when metadata is ready.
        if(inFlight===attempt&&allowed()&&video.paused&&video.readyState>=1)startSilent();
      },1800);
      video.play().then(()=>{if(!disposed&&!allowed())stop();},error=>{
        if(inFlight!==attempt||!allowed())return;
        inFlight=null;
        if(error.name!=='NotAllowedError'&&error.name!=='NotSupportedError')return;
        if(!video.muted){
          mutedFallback=true;callbacks.current.onMuteRequired?.(true);
          start();return;
        }
        const rect=video.getBoundingClientRect();
        if(video.readyState>=2&&rect.bottom>0&&rect.top<window.innerHeight&&rect.height>0){
          deniedWhenReady=true;startSilent();
        }else{
          clearTimeout(denialTimer);
          // A slow metadata request is common on a cold mobile connection.
          // Keep the native request alive and give loadeddata its normal start.
          denialTimer=setTimeout(()=>{if(allowed()&&video.paused)startSilent();},6000);
        }
      }).finally(()=>{if(inFlight===attempt)inFlight=null;});
    }
    const control={start,stop};
    const ready=()=>{if(allowed())start();};
    const visibilityObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))ready();
    }):null;
    const guard=()=>{if(!allowed())stop();};
    const visibility=()=>{deniedWhenReady=false;pageVisible=!document.hidden;if(allowed())start();else stop();};
    const hide=()=>{pageVisible=false;stop();};
    audio.current=()=>{mutedFallback=false;applyVolume();};
    handoff.current=()=>{
      if(!allowed()||!silent.current)return;
      mutedFallback=false;
      video.defaultMuted=video.muted=false;
      video.play().catch(()=>{if(allowed()){video.defaultMuted=video.muted=true;callbacks.current.onMuteRequired?.(true);}});
    };
    const nativePlaying=()=>{clearTimeout(denialTimer);if(allowed())stopSilent();else stop();};
    video.autoplay=false;
    if(!active)stop();
    const detach=playback.attach(clipId??source,control);
    applyVolume();
    video.addEventListener('play',guard);
    video.addEventListener('playing',nativePlaying);
    visibilityObserver?.observe(video);
    video.addEventListener('loadeddata',ready);
    video.addEventListener('canplay',ready);
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pagehide',hide);
    window.addEventListener('pageshow',visibility);
    return ()=>{
      video.removeEventListener('play',guard);
      video.removeEventListener('playing',nativePlaying);
      disposed=true;clearTimeout(denialTimer);
      visibilityObserver?.disconnect();
      video.removeEventListener('loadeddata',ready);
      video.removeEventListener('canplay',ready);
      document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('pagehide',hide);
      window.removeEventListener('pageshow',visibility);
      audio.current=null;handoff.current=null;stopSilent();
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
export function shortPlaybackUrl(endpoint,id){
  return endpoint.replace(/\/+$/,'')+'/shorts/play/'+encodeURIComponent(id);
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
export function saveShort(id,url,photo=false){const a=document.createElement('a');const target=new URL(url,location.href);target.searchParams.set('download','1');a.href=target.href;a.download='Clipi-'+id+(photo?'.jpg':'.mp4');document.body.appendChild(a);a.click();a.remove();}

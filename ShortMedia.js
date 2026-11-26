import {ui as appText} from './interface-language.mjs';
import React, {useLayoutEffect, useImperativeHandle, useRef, useState} from 'react';
import {AppState, Clipboard, Share, StyleSheet} from 'react-native';
import {VideoView, useVideoPlayer} from 'expo-video';
import {launchImageLibraryAsync} from 'expo-image-picker';
import * as FS from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import {Asset} from 'expo-asset';

export const nonce = () => Crypto.randomUUID();
export function Player(props) {
  return <ShortVideoPlayer key={props.source} {...props}/>;
}

function ShortVideoPlayer({source, clipId, playback, active = true, mountedSurface = true, muted = true, playerRef, onPlayingChange, fit = 'cover'}) {
  const [rendered,setRendered]=useState(false),[playing,setPlaying]=useState(false);
  const player = useVideoPlayer(source, p => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
    p.bufferOptions = {preferredForwardBufferDuration: 6, minBufferForPlayback: 0.5, maxBufferBytes: 6 * 1024 * 1024};
  });
  useImperativeHandle(playerRef, () => player, [player]);
  const audio=useRef(null), latest=useRef(null);
  latest.current={muted,onPlayingChange};
  useLayoutEffect(() => {
    let foreground=AppState.currentState!=='background'&&AppState.currentState!=='inactive';
    function stop(){
      player.muted=true;
      player.volume=0;
      player.pause();
    }
    function applyVolume(){
      const silent=!foreground||!playback.owns(control)||latest.current.muted;
      player.muted=silent;
      player.volume=silent?0:1;
    }
    const control={stop,start(){
      if(!foreground||!playback.owns(control)){stop();return;}
      applyVolume();
      player.play();
    }};
    audio.current=applyVolume;
    const changed=player.addListener('playingChange',({isPlaying})=>{
      if(isPlaying&&(!foreground||!playback.owns(control))){stop();return;}
      setPlaying(isPlaying);latest.current.onPlayingChange?.(isPlaying);
    });
    const ready=player.addListener('statusChange',({status})=>{
      if(status==='readyToPlay'&&playback.owns(control))control.start();
    });
    const life=AppState.addEventListener('change',state=>{
      foreground=state==='active';
      if(foreground&&playback.owns(control))control.start();
      else stop();
    });
    stop();
    setPlaying(false);latest.current.onPlayingChange?.(false);
    const detach=active?playback.attach(clipId??source,control):null;
    return ()=>{
      changed.remove();ready.remove();life.remove();
      audio.current=null;
      detach?.();
    };
  },[active,player,playback,clipId,source]);
  useLayoutEffect(()=>{audio.current?.();},[muted]);
  if (!mountedSurface) return null;
  return <VideoView accessible={!!clipId} accessibilityLabel={clipId?appText('تشغيل الفيديو'):undefined} testID={clipId&&active&&rendered&&playing?'short-frame-'+clipId:undefined} onFirstFrameRender={()=>setRendered(true)} style={StyleSheet.absoluteFill} player={player} contentFit={fit} surfaceType="textureView" nativeControls={false}/>;
}
export async function pickShort() {
  const result=await launchImageLibraryAsync({mediaTypes:['videos'],allowsEditing:false});
  if(result.canceled)return null;
  const file=result.assets[0];
  const bytes = file.fileSize ?? (await FS.getInfoAsync(file.uri).catch(() => null))?.size;
  if (bytes > 50 * 1024 * 1024) throw Error('اختر فيديو حجمه حتى ٥٠ ميغابايت');
  if (file.duration > 180000) throw Error('أقصى مدة للفيديو ثلاث دقائق. قصّر المقطع ثم حاول مجددًا.');
  return {uri:file.uri};
}
export async function uploadFile(url,file,token) {
  const res=await FS.uploadAsync(url,file.uri,{httpMethod:'PUT',uploadType:FS.FileSystemUploadType.BINARY_CONTENT,headers:{Authorization:'Bearer '+token,'Content-Type':'video/mp4'}});
  if(res.status<200||res.status>=300){let msg;try{msg=JSON.parse(res.body).error}catch{}throw Error(msg||'تعذّر رفع الفيديو');}
}
export const releaseDraft=()=>{};
export function shortVideoUrl(endpoint,id) {
  return endpoint.replace(/\/+$/,'')+'/shorts/media/'+encodeURIComponent(id);
}
export const copyShortLink=url=>Clipboard.setString(url);
export const shareShort=url=>Share.share({message:url});
export async function saveShort(id,source) {
  const access=await FS.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if(!access.granted)return;
  let local,temp;
  try{
    if(typeof source==='number'){
      const asset=await Asset.fromModule(source).downloadAsync();
      local=asset.localUri;
    }else{
      temp=FS.cacheDirectory+'clipi-'+nonce()+'.mp4';
      const res=await FS.downloadAsync(source,temp);
      if(res.status!==200)throw Error('تعذّر تنزيل الفيديو');
      local=res.uri;
    }
    const data=await FS.readAsStringAsync(local,{encoding:FS.EncodingType.Base64});
    const dest=await FS.StorageAccessFramework.createFileAsync(access.directoryUri,'Clipi-'+id+'.mp4','video/mp4');
    await FS.writeAsStringAsync(dest,data,{encoding:FS.EncodingType.Base64});
  }finally{if(temp)await FS.deleteAsync(temp,{idempotent:true});}
}

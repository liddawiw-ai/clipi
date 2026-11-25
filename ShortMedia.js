import React, {useLayoutEffect, useImperativeHandle} from 'react';
import {AppState, Clipboard, Share, StyleSheet} from 'react-native';
import {VideoView, useVideoPlayer} from 'expo-video';
import {launchImageLibraryAsync} from 'expo-image-picker';
import * as FS from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import {Asset} from 'expo-asset';

export const nonce = () => Crypto.randomUUID();
export const starters = {
  palace: require('./assets/shorts/palace.mp4'),
  aurora: require('./assets/shorts/aurora.mp4'),
  dunes: require('./assets/shorts/dunes.mp4')
};
export function Player(props) {
  return <ShortVideoPlayer key={props.source} {...props}/>;
}

function ShortVideoPlayer({source, active = true, mountedSurface = true, muted = true, playerRef, onPlayingChange, fit = 'cover'}) {
  const player = useVideoPlayer(source, p => {
    p.loop = true;
    p.muted = muted;
    p.bufferOptions = {preferredForwardBufferDuration: 6, minBufferForPlayback: 0.5, maxBufferBytes: 6 * 1024 * 1024};
  });
  useImperativeHandle(playerRef, () => player, [player]);
  useLayoutEffect(() => {player.muted=muted;},[muted,player]);
  useLayoutEffect(() => {
    if (!onPlayingChange) return;
    const subscription = player.addListener('playingChange', ({isPlaying}) => onPlayingChange(isPlaying));
    onPlayingChange(player.playing);
    return () => subscription.remove();
  }, [player, onPlayingChange]);
  useLayoutEffect(() => {
    let listening = true;
    function sync(state) {
      if (!listening) return;
      if (active && state === 'active') player.play();
      else player.pause();
    }
    sync(AppState.currentState || 'active');
    const subscription = AppState.addEventListener('change', sync);
    const ready = player.addListener('statusChange', ({status}) => {
      if (status === 'readyToPlay') sync(AppState.currentState || 'active');
    });
    return () => {
      // useVideoPlayer stops and releases its native player on unmount.
      listening = false;
      subscription.remove();
      ready.remove();
    };
  }, [active, player]);
  if (!mountedSurface) return null;
  return <VideoView style={StyleSheet.absoluteFill} player={player} contentFit={fit} surfaceType="textureView" nativeControls={false}/>;
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
  const path=Object.prototype.hasOwnProperty.call(starters,id)
    ? '/shorts/starter/'+encodeURIComponent(id)+'.mp4' : '/shorts/media/'+encodeURIComponent(id);
  return endpoint.replace(/\/+$/,'')+path;
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

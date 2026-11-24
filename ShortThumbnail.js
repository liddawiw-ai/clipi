import {createVideoPlayer} from 'expo-video';
import {ImageManipulator,SaveFormat} from 'expo-image-manipulator';
import * as FS from 'expo-file-system';

// Decode one thumbnail at a time, and reuse the small JPEG in Android's disposable cache.
let tail=Promise.resolve();
export function shortThumbnail(id,source,isCurrent){
  const result=tail.then(async()=>{
    if(!isCurrent())return null;
    const target=FS.cacheDirectory+'clipi-short-'+encodeURIComponent(id)+'.jpg';
    if((await FS.getInfoAsync(target)).exists)return target;
    if(!isCurrent())return null;
    const player=createVideoPlayer(source);
    let frame,context,image;
    try{
      const size={maxWidth:184,maxHeight:240};
      try { [frame]=await player.generateThumbnailsAsync(.6,size); }
      catch { [frame]=await player.generateThumbnailsAsync(0,size); }
      if(!isCurrent()||!frame)return null;
      context=ImageManipulator.manipulate(frame);
      image=await context.renderAsync();
      const file=await image.saveAsync({compress:.78,format:SaveFormat.JPEG});
      await FS.moveAsync({from:file.uri,to:target});
      return target;
    }finally{
      image?.release();context?.release();frame?.release();player.release();
    }
  });
  tail=result.catch(()=>{});
  return result;
}

import {CanvasSink, Input, MP4, UrlSource} from 'mediabunny';

// Present the selected clip's video track when an embedded browser requires
// a gesture for the native player. Audio remains owned by the native player.
export function presentSilentShort(video, host, onFrame, onFailure){
  const input=new Input({formats:[MP4],source:new UrlSource(video.currentSrc||video.src,{
    parallelism:1,maxCacheSize:4*1024*1024,getRetryDelay:attempt=>attempt===0?.25:null
  })});
  const canvas=document.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  const ctx=canvas.getContext('2d',{alpha:false});
  let closed=false,timer,wake;
  const state={
    currentTime:video.currentTime||0,duration:video.duration,playing:false,canvas,
    close(){
      if(closed)return;
      closed=true;clearTimeout(timer);wake?.();canvas.remove();input.dispose();
    }
  };
  const wait=ms=>new Promise(resolve=>{wake=resolve;timer=setTimeout(resolve,ms);});
  async function run(){
    const track=await input.getPrimaryVideoTrack();
    if(!track||!ctx||!await track.canDecode())throw Error('Video decoder unavailable');
    const origin=await track.getFirstTimestamp();
    if(!Number.isFinite(state.duration))state.duration=await track.getDurationFromMetadata();
    const sink=new CanvasSink(track,{poolSize:2});
    let position=state.currentTime;
    while(!closed){
      let clock,frames=0,lastEnd=0;
      for await(const frame of sink.canvases(origin+position)){
        if(closed)return;
        const time=Math.max(0,frame.timestamp-origin);
        clock??=performance.now()-time*1000;
        const delay=clock+time*1000-performance.now();
        if(delay>1)await wait(delay);
        if(closed)return;
        if(!frames&&!canvas.isConnected){
          canvas.width=frame.canvas.width;canvas.height=frame.canvas.height;
          canvas.style.objectFit=video.style.objectFit;host.appendChild(canvas);
        }
        ctx.drawImage(frame.canvas,0,0,canvas.width,canvas.height);
        state.currentTime=time;state.playing=true;onFrame(state);
        frames++;lastEnd=time+frame.duration;
      }
      if(closed)return;
      if(!frames&&position===0)throw Error('No decodable frames');
      if(frames)await wait(Math.max(0,clock+lastEnd*1000-performance.now()));
      position=0;
    }
  }
  run().catch(()=>{if(!closed)onFailure();});
  return state;
}

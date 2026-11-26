import {BufferTarget,EncodedPacketSink,EncodedVideoPacketSource,Input,MP4,Mp4OutputFormat,Output,UrlSource} from 'mediabunny';

// This worker is downloaded only after native playback and WebCodecs fail.
const folder=new URL('./',self.location.href);
let acknowledge;
self.onmessage=({data})=>{
  if(data==='drawn'){acknowledge?.();return;}
  play(data).catch(error=>{console.warn('Clipi video decoder:',error.message);self.postMessage({error:true});});
};

// Fetch a keyframe and its dependent frames as one independently decodable
// group. Long clips do not have to finish downloading before playback starts.
async function* groups(sink,startPacket){
  let group=[];
  for await(const packet of sink.packets(startPacket)){
    if(packet.type==='key'&&group.length){yield group;group=[];}
    group.push(packet);
  }
  if(group.length)yield group;
}
async function makeSegment(packets,codec,config,base){
  const target=new BufferTarget(),output=new Output({target,format:new Mp4OutputFormat()});
  const track=new EncodedVideoPacketSource(codec);
  output.addVideoTrack(track);
  await output.start();
  for(const [i,packet] of packets.entries()){
    await track.add(packet.clone({timestamp:packet.timestamp-base}),i===0?{decoderConfig:config}:undefined);
  }
  await output.finalize();
  return new Uint8Array(target.buffer);
}
async function play({source,start}){
  const media=new URL(source);
  if(media.origin!==self.location.origin||!media.pathname.startsWith('/shorts/play/'))throw Error('Unexpected video source');
  const input=new Input({formats:[MP4],source:new UrlSource(media.href,{parallelism:1,maxCacheSize:4*1024*1024,getRetryDelay:n=>n===0?.25:null})});
  const loadDecoder=async()=>{
    const {gpu}=await import(new URL('gpu.js',folder).href);
    await gpu.load({wasmPath:new URL('cpu.js',folder).href});return gpu;
  };
  try{
    const [gpu,track]=await Promise.all([loadDecoder(),input.getPrimaryVideoTrack()]);
    if(!track)throw Error('Missing video');
    const [codec,config,rotation,origin,duration]=await Promise.all([
      track.getCodec(),track.getDecoderConfig(),track.getRotation(),track.getFirstTimestamp(),track.getDurationFromMetadata()
    ]);
    const sink=new EncodedPacketSink(track);
    let resume=Math.max(0,start||0);
    while(true){
      let clock,last=-Infinity,end=0,shown=0;
      const first=await sink.getKeyPacket(origin+resume)||await sink.getFirstKeyPacket();
      if(!first)throw Error('Missing first keyframe');
      for await(const packets of groups(sink,first)){
        const order=packets.slice().sort((a,b)=>a.timestamp-b.timestamp);
        const data=await makeSegment(packets,codec,config,order[0].timestamp);
        const decoder=gpu.createDecoder(data);
        try{
          const scale=Math.min(1,640/Math.max(decoder.width,decoder.height));
          const width=Math.max(1,Math.round(decoder.width*scale)),height=Math.max(1,Math.round(decoder.height*scale));
          for(const packet of order){
            const at=packet.timestamp-origin;
            const pixels=decoder.nextFrame(width,height);
            if(!pixels)break;
            end=Math.max(end,at+packet.duration);
            if(at+.025<resume||at-last<1/30-.001)continue;
            const now=performance.now();
            if(clock===undefined||now-(clock+at*1000)>200)clock=now-at*1000;
            const delay=clock+at*1000-now;
            if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
            last=at;shown++;
            const drawn=new Promise(resolve=>{acknowledge=resolve;});
            self.postMessage({pixels:pixels.buffer,width,height,rotation,time:at,duration},[pixels.buffer]);
            await drawn;
          }
        }finally{decoder.close();}
      }
      if(!shown&&resume===0)throw Error('No frames');
      if(shown)await new Promise(resolve=>setTimeout(resolve,Math.max(0,clock+end*1000-performance.now())));
      resume=0;
    }
  }finally{input.dispose();}
}

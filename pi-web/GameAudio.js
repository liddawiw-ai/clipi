// Original synthesized game effects; no external recordings.
let context=null, enabled=true;
export function soundEnabled(){return enabled;}
export function setGameSound(value){enabled=!!value;if(enabled)unlockGameAudio();}
export function unlockGameAudio(){
  if(!enabled)return;
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    context??=new Audio();if(context.state==='suspended')context.resume().catch(()=>{});
  }catch{}
}
export function gameSound(type){
  if(!enabled||!context||context.state!=='running')return;
  const patterns={dice:[180,240,190,320],piece:[470,620],card:[280,180],capture:[660,330],shot:[170,90],collision:[740],pocket:[420,210],turn:[440,550],win:[523,659,784,1047]};
  const notes=patterns[type];if(!notes)return;
  const t=context.currentTime;
  notes.forEach((frequency,i)=>{
    const osc=context.createOscillator(),gain=context.createGain(),start=t+i*.065;
    osc.type=['dice','shot','collision','card'].includes(type)?'triangle':'sine';
    osc.frequency.setValueAtTime(frequency,start);
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.07,start+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,start+.085);
    osc.connect(gain);gain.connect(context.destination);osc.start(start);osc.stop(start+.09);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  });
}

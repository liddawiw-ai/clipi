// Exactly one foreground video surface can hand playback to a clip.
let foreground=null;

export function stopShortPlayback(){
  const previous=foreground;
  foreground=null;
  previous?.sync();
}

export function createShortPlayback(){
  let selected=null,playing=null;
  const players=new Map();
  const session={
    focus(){
      if(foreground===session)return;
      stopShortPlayback();
      foreground=session;
      session.sync();
    },
    blur(){if(foreground===session)stopShortPlayback();},
    select(id){selected=id;session.sync();},
    isSelected(id){return foreground===session&&selected===id;},
    owns(player){return foreground===session&&playing===player;},
    attach(id,player){
      players.set(id,player);
      session.sync();
      return ()=>{
        if(players.get(id)===player){players.delete(id);session.sync();}
      };
    },
    sync(){
      const next=foreground===session?players.get(selected)??null:null;
      if(next===playing)return;
      const previous=playing;
      playing=null;
      previous?.stop();
      playing=next;
      next?.start();
    }
  };
  return session;
}

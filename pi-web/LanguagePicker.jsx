import React, {useId, useRef, useState} from 'react';
import {languages} from './languages.mjs';

const choices = ['en','ar',...Object.keys(languages).filter(code=>code!=='en'&&code!=='ar')];
const button = {
  border:'1px solid #8462ad', borderRadius:10, background:'#382054', color:'white',
  padding:'10px 12px', font:'inherit', textAlign:'start', cursor:'pointer',
  width:'100%', minHeight:44, boxSizing:'border-box'
};

export function LanguageDropdown({selected, onPick, label}) {
  const [expanded,setExpanded] = useState(false);
  const trigger = useRef(null);
  const listId = useId();
  function close() {
    setExpanded(false);
    trigger.current?.focus();
  }
  return <div style={{margin:'12px 0 8px',fontFamily:'system-ui'}}
    onKeyDown={event=>{if(expanded&&event.key==='Escape'){event.preventDefault();close()}}}>
    <button type="button" ref={trigger} aria-expanded={expanded} aria-controls={listId}
      style={{...button,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}
      onClick={()=>setExpanded(value=>!value)}>
      <span>{label} · <bdi lang={selected}>{languages[selected].name}</bdi></span>
      <span aria-hidden="true">{expanded?'▴':'▾'}</span>
    </button>
    <div id={listId} hidden={!expanded} style={{maxHeight:224,overflowY:'auto',overscrollBehavior:'contain'}}>
      {expanded&&choices.map(code=><button key={code} type="button" lang={code} dir={languages[code].direction}
        aria-pressed={selected===code} style={{...button,display:'block',marginTop:4}}
        onClick={()=>{onPick(code);close()}}>
        {languages[code].name}
      </button>)}
    </div>
  </div>;
}

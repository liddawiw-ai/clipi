import React, {useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {ui} from './interface-language.mjs';
import {languages} from './languages.mjs';

const choices = ['en','ar',...Object.keys(languages).filter(code=>code!=='en'&&code!=='ar')];
const css = `
.clipi-language-trigger,.clipi-language-sheet button {box-sizing:border-box;font:inherit;color:#173e38;cursor:pointer}
.clipi-language-trigger {display:flex;align-items:center;justify-content:space-between;gap:.75rem;width:100%;min-height:46px;background:#fff;border:1px solid #c7d8cd;border-radius:12px;padding:.65rem .85rem;text-align:start}
dialog.clipi-language-sheet {--row:3rem;position:fixed;inset:auto 0 0;margin:0 auto;box-sizing:border-box;width:min(100%,32rem);max-width:100%;max-height:90vh;max-height:90dvh;overflow-y:auto;overscroll-behavior:contain;border:1px solid #d8e4df;border-radius:24px 24px 0 0;padding:.5rem 1rem max(1rem,env(safe-area-inset-bottom));background:#fff;color:#173e38;box-shadow:0 -8px 30px rgba(29,66,54,.12);font:inherit}
dialog.clipi-language-sheet[open] {animation:clipi-language-rise .22s ease-out}
.clipi-language-sheet::backdrop {background:rgba(28,59,49,.12)}
.clipi-language-sheet header {display:flex;align-items:center;justify-content:space-between;gap:.5rem}
.clipi-language-sheet h2 {font-size:1.12rem;margin:.5rem 0;color:#173e38}
.clipi-language-sheet .handle {margin:0 auto .2rem;width:36px;height:4px;border-radius:5px;background:#d4dfda}
.clipi-language-sheet .dismiss {border:0;background:transparent;width:44px;min-height:44px;font-size:1.5rem;text-align:center;padding:0}
.clipi-language-window {position:relative}
.clipi-language-window::before {content:'';position:absolute;inset:var(--row) 0;height:var(--row);box-sizing:border-box;border:1px solid #cfe3db;border-radius:12px;background:#f2f8f5;pointer-events:none}
.clipi-language-wheel {position:relative;box-sizing:border-box;height:calc(3 * var(--row));overflow-y:auto;overscroll-behavior:contain;scroll-snap-type:y mandatory;touch-action:pan-y;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.clipi-language-wheel::-webkit-scrollbar {display:none}
.clipi-language-wheel::before,.clipi-language-wheel::after {content:'';display:block;height:var(--row)}
.clipi-language-wheel button {display:block;scroll-snap-align:center;width:100%;height:var(--row);min-height:0;padding:0 .5rem;border:0;background:transparent;text-align:center;color:#51685f}
.clipi-language-wheel button[aria-pressed=true] {font-weight:700;color:#153f34}
.clipi-language-sheet .apply {width:100%;min-height:44px;border:0;border-radius:12px;background:#086d60;color:#fff;font-weight:700;text-align:center;margin-top:.5rem}
@keyframes clipi-language-rise {from{transform:translateY(100%)}to{transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){dialog.clipi-language-sheet[open]{animation:none}}
`;

function LanguageSheet({selected,onPick,label,onClose,id}) {
  const dialog=useRef(null), wheel=useRef(null);
  const [index,setIndex]=useState(()=>choices.indexOf(selected));
  useLayoutEffect(()=>{
    const el=dialog.current;
    el.showModal();
    const current=wheel.current.children[choices.indexOf(selected)];
    if(current){
      current.focus({preventScroll:true});
      wheel.current.scrollTop=choices.indexOf(selected)*current.offsetHeight;
    }
    return ()=>el.close();
  },[selected]);
  function centered(){
    const list=wheel.current;
    const height=list.firstElementChild.offsetHeight;
    return Math.max(0,Math.min(choices.length-1,Math.round(list.scrollTop/height)));
  }
  function apply(code){onPick(code);onClose();}
  return createPortal(<dialog className="clipi-language-sheet" ref={dialog} id={id}
    dir={languages[selected].direction} aria-labelledby={id+'-title'}
    onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{
      if(e.target!==dialog.current)return;
      const b=dialog.current.getBoundingClientRect();
      if(e.clientY<b.top||e.clientX<b.left||e.clientX>b.right||e.clientY>b.bottom)onClose();
    }}>
    <div className="handle" aria-hidden="true"/>
    <header><h2 id={id+'-title'}>{label}</h2>
      <button type="button" className="dismiss" aria-label={ui('إغلاق')} onClick={onClose}>×</button>
    </header>
    <div className="clipi-language-window">
      <div className="clipi-language-wheel" ref={wheel} onScroll={()=>setIndex(centered())}>
        {choices.map((code,i)=><button key={code} type="button" lang={code} dir={languages[code].direction}
          aria-pressed={i===index} onClick={()=>apply(code)}>{languages[code].name}</button>)}
      </div>
    </div>
    <button type="button" className="apply" onClick={()=>apply(choices[centered()])}>{ui('حفظ')}</button>
  </dialog>,document.body);
}

export function LanguageDropdown({selected,onPick,label}){
  const [expanded,setExpanded]=useState(false);
  const trigger=useRef(null),id=useId();
  function close(){
    setExpanded(false);
    requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}));
  }
  return <div style={{margin:'12px 0 8px',fontFamily:'system-ui'}}>
    <style>{css}</style>
    <button ref={trigger} type="button" className="clipi-language-trigger" aria-haspopup="dialog"
      aria-expanded={expanded} aria-controls={expanded?id:undefined} onClick={()=>setExpanded(true)}>
      <span>{label} · <bdi lang={selected}>{languages[selected].name}</bdi></span>
      <span aria-hidden="true">⌃</span>
    </button>
    {expanded&&<LanguageSheet {...{selected,onPick,label,id}} onClose={close}/>}
  </div>;
}

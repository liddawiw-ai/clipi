import React, {useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {ui} from './interface-language.mjs';
import {languages} from './languages.mjs';

const choices = ['en','ar',...Object.keys(languages).filter(code=>code!=='en'&&code!=='ar')];
const css = `
.clipi-language-trigger,.clipi-language-sheet button {box-sizing:border-box;font:inherit;color:#173e38;cursor:pointer}
.clipi-language-trigger {display:flex;align-items:center;justify-content:space-between;gap:.75rem;width:100%;min-height:46px;background:#fff;border:1px solid #c7d8cd;border-radius:12px;padding:.65rem .85rem;text-align:start}
dialog.clipi-language-sheet {
  --row:max(44px,2.75rem);--wheel-height:calc(var(--rows,5) * var(--row));
  position:fixed;inset:auto;margin:0;transform:translate(-50%,-100%);box-sizing:border-box;
  max-height:none;max-width:none;overflow:hidden;overscroll-behavior:contain;padding:6px 8px;
  border:1px solid rgba(174,195,205,.8);border-radius:18px 18px 12px 12px;
  background:rgba(255,255,255,.90);color:#173e38;font:inherit;
  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
  box-shadow:0 -5px 22px rgba(25,56,68,.14),inset 0 1px 0 #fff
}
dialog.clipi-language-sheet[open] {animation:clipi-wheel-open .2s ease-out}
.clipi-language-sheet::backdrop {background:transparent}
.clipi-language-window {position:relative}
.clipi-language-window::before {content:'';position:absolute;inset:50% 0 auto;transform:translateY(-50%);height:var(--row);box-sizing:border-box;
  border-block:1px solid #4385bb;background:rgba(221,239,252,.58);pointer-events:none}
.clipi-language-wheel {position:relative;box-sizing:border-box;height:var(--wheel-height);overflow-y:auto;overscroll-behavior:contain;
  scroll-snap-type:y mandatory;touch-action:pan-y;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.clipi-language-wheel::-webkit-scrollbar {display:none}
.clipi-language-wheel::before,.clipi-language-wheel::after {content:'';display:block;height:calc((var(--wheel-height) - var(--row)) / 2)}
.clipi-language-wheel button {display:block;scroll-snap-align:center;width:100%;height:var(--row);padding:0 .25rem;border:0;
  background:transparent;text-align:center;color:#4c6260}
.clipi-language-wheel span {display:block;transform:scale(.88);opacity:.78}
.clipi-language-wheel button[data-near=true] span {transform:scale(.96);opacity:.95}
.clipi-language-wheel button[aria-pressed=true] span {transform:none;opacity:1;font-weight:700;color:#153f34}
.clipi-language-sheet footer {display:flex;align-items:stretch;gap:6px;padding-top:4px}
.clipi-language-sheet footer button {height:var(--row);min-height:44px;border:0;border-radius:10px;text-align:center;padding:0 .35rem}
.clipi-language-sheet .dismiss {flex:none;width:44px;background:transparent;font-size:1.45rem}
.clipi-language-sheet .apply {flex:1;width:auto;background:#086d60;color:#fff;font-weight:700}
@keyframes clipi-wheel-open {from{clip-path:inset(100% 0 0 round 12px)}to{clip-path:inset(0 round 12px)}}
@media (prefers-reduced-motion:reduce){dialog.clipi-language-sheet[open]{animation:none}}
`;

function LanguageSheet({selected,onPick,label,onClose,id,trigger,spacer}) {
  const dialog=useRef(null), wheel=useRef(null);
  const [index,setIndex]=useState(()=>choices.indexOf(selected));
  useLayoutEffect(()=>{
    const el=dialog.current, list=wheel.current, field=trigger.current, room=spacer.current;
    const viewport=window.visualViewport;
    el.showModal();
    const row=list.firstElementChild;
    function available(){
      return field.getBoundingClientRect().top-(viewport?.offsetTop||0)-8;
    }
    function makeRoom(){
      const rect=field.getBoundingClientRect();
      const minimum=Math.min(3*row.offsetHeight+el.querySelector('footer').offsetHeight+14,
        (viewport?.height||window.innerHeight)-rect.height-16);
      if(available()>=minimum)return;
      // Bring the field towards the lower edge before borrowing space on very short pages.
      field.scrollIntoView({block:'end',inline:'nearest',behavior:'instant'});
      if(available()<minimum){
        room.style.height=(room.offsetHeight+Math.ceil(minimum-available()))+'px';
        field.scrollIntoView({block:'end',inline:'nearest',behavior:'instant'});
      }
    }
    function place(){
      const rect=field.getBoundingClientRect();
      const free=available()-el.querySelector('footer').offsetHeight-14;
      const maxRows=Math.max(1,Math.floor(free/row.offsetHeight));
      const rows=Math.min(7,maxRows%2?maxRows:maxRows-1);
      el.style.setProperty('--rows',String(rows));
      el.style.top=rect.top+'px';
      el.style.left=(rect.left+rect.width/2)+'px';
      el.style.width=Math.min(208,rect.width*.8)+'px';
    }
    function resize(){makeRoom();place();}
    function scrolled(event){if(!el.contains(event.target))place();}
    resize();
    const initial=choices.indexOf(selected);
    list.children[initial].focus({preventScroll:true});
    list.scrollTop=initial*row.offsetHeight;
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(place):null;
    observer?.observe(field);
    window.addEventListener('resize',resize);
    document.addEventListener('scroll',scrolled,true);
    viewport?.addEventListener('resize',resize);
    viewport?.addEventListener('scroll',place);
    return ()=>{
      observer?.disconnect();
      window.removeEventListener('resize',resize);
      document.removeEventListener('scroll',scrolled,true);
      viewport?.removeEventListener('resize',resize);
      viewport?.removeEventListener('scroll',place);
      room.style.height='';el.close();
    };
  },[selected,trigger,spacer]);
  function centered(){
    const list=wheel.current;
    return Math.max(0,Math.min(choices.length-1,Math.round(list.scrollTop/list.firstElementChild.offsetHeight)));
  }
  function apply(code){onPick(code);onClose();}
  return createPortal(<dialog className="clipi-language-sheet" ref={dialog} id={id}
    dir={languages[selected].direction} aria-label={label}
    onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{
      if(e.target!==dialog.current)return;
      const b=dialog.current.getBoundingClientRect();
      if(e.clientY<b.top||e.clientX<b.left||e.clientX>b.right||e.clientY>b.bottom)onClose();
    }}>
    <div className="clipi-language-window">
      <div className="clipi-language-wheel" ref={wheel} onScroll={()=>setIndex(centered())}>
        {choices.map((code,i)=><button key={code} type="button" lang={code} dir={languages[code].direction}
          data-near={Math.abs(i-index)===1} aria-pressed={i===index} onClick={()=>apply(code)}>
          <span>{languages[code].name}</span>
        </button>)}
      </div>
    </div>
    <footer>
      <button type="button" className="apply" onClick={()=>apply(choices[centered()])}>{ui('حفظ')}</button>
      <button type="button" className="dismiss" aria-label={ui('إغلاق')} onClick={onClose}>×</button>
    </footer>
  </dialog>,document.body);
}

export function LanguageDropdown({selected,onPick,label}){
  const [expanded,setExpanded]=useState(false);
  const trigger=useRef(null),spacer=useRef(null),id=useId();
  function close(){
    setExpanded(false);
    requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}));
  }
  return <div style={{margin:'12px 0 8px',fontFamily:'system-ui',overflowAnchor:'none'}}>
    <style>{css}</style>
    <div ref={spacer} aria-hidden="true"/>
    <button ref={trigger} type="button" className="clipi-language-trigger" aria-haspopup="dialog"
      aria-expanded={expanded} aria-controls={expanded?id:undefined} onClick={()=>setExpanded(true)}>
      <span>{label} · <bdi lang={selected}>{languages[selected].name}</bdi></span>
      <span aria-hidden="true">⌃</span>
    </button>
    {expanded&&<LanguageSheet {...{selected,onPick,label,id,trigger,spacer}} onClose={close}/>}
  </div>;
}

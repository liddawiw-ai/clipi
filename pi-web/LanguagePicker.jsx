import React, {useState} from 'react';
import {languages} from './languages.mjs';

const page = {flex:1, overflowY:'auto', padding:'24px', color:'white', background:'#170b2c', fontFamily:'system-ui'};
const card = {maxWidth:540, margin:'0 auto'};
const button = {border:'1px solid #8462ad', borderRadius:10, background:'#382054', color:'white', padding:12, font:'inherit', textAlign:'start', cursor:'pointer'};
const input = {...button, width:'100%', boxSizing:'border-box', marginBottom:16};
let english;
try { english = new Intl.DisplayNames(['en'], {type:'language'}); } catch {}

export function LanguageDropdown({selected, onPick, label}) {
  return <label style={{display:'block',color:'white',margin:'12px 0 8px'}}>
    <span style={{display:'block',fontWeight:700,marginBottom:6}}>{label}</span>
    <select id="clipi-language" value={selected} onChange={event=>onPick(event.target.value)}
      style={{...button,width:'100%',minHeight:44,appearance:'auto'}}>
      {Object.entries(languages).map(([code, language])=>
        <option key={code} value={code} lang={code} dir={language.direction}>{language.name}</option>)}
    </select>
  </label>;
}

export function LanguagePicker({onPick, onBack}) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const choices = [['en', languages.en], ...Object.entries(languages).filter(([code]) => code !== 'en')].filter(([code, language]) =>
    [code, language.name, english?.of(code)].some(value => value?.toLowerCase().includes(query))
  );
  return <main dir="ltr" lang="en" style={page}>
    <div style={card}>
      <h1>Clipi</h1>
      <h2>Choose your language <span lang="ar" dir="rtl">· اختر لغتك</span></h2>
      <input value={search} onChange={event=>setSearch(event.target.value)}
        aria-label="Search languages · ابحث عن لغة" placeholder="Search languages · ابحث عن لغة"
        dir="auto" type="search" style={input}/>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(125px, 1fr))', gap:8}}>
        {choices.map(([code, language]) => <button key={code} type="button" lang={code}
          dir={language.direction} style={button} onClick={()=>onPick(code)}>{language.name}</button>)}
      </div>
      {!choices.length&&<p role="status">No matching languages · لا توجد نتائج</p>}
      {onBack&&<button type="button" style={{...button, marginTop:16}} onClick={onBack}>Back · رجوع</button>}
    </div>
  </main>;
}

import React from 'react';
import {Modal} from 'react-native';
import './short-feed.css';

const paths = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  rooms: 'M3 5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-5 4v-4H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M21 9v8a2 2 0 0 1-2 2h-2',
  create: 'M12 5v14 M5 12h14',
  store: 'M2 8.5 6 3.5h12l4 5-10 12z M2 8.5h20 M8 8.5l4 12 4-12',
  profile: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M4 21a8 7 0 0 1 16 0',
  live: 'M4.2 5.2a10 10 0 0 0 0 13.6 M7.4 8.1a5.8 5.8 0 0 0 0 7.8 M19.8 5.2a10 10 0 0 1 0 13.6 M16.6 8.1a5.8 5.8 0 0 1 0 7.8 M13.3 12a1.3 1.3 0 1 1-2.6 0 1.3 1.3 0 0 1 2.6 0z',
  mic: 'M9 6a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z M5.5 11.5v.5a6.5 6.5 0 0 0 13 0v-.5 M12 18.5V22 M8.5 22h7',
  camera: 'M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z M16 10l6-3v10l-6-3',
  like: 'M20.9 4.8a5.4 5.4 0 0 0-8 .5l-.9 1.1-.9-1.1a5.4 5.4 0 0 0-8-.5c-2.2 2.3-1.9 5.8.4 8.4L12 21l8.5-7.8c2.3-2.6 2.6-6.1.4-8.4z',
  gift: 'M3 8.5h18v4H3z M5 12.5V21h14v-8.5 M12 8.5V21 M12 8.5C8 8.5 5 8 5 5.4a2.4 2.4 0 0 1 4.5-1.2z M12 8.5c4 0 7-.5 7-3.1a2.4 2.4 0 0 0-4.5-1.2z',
  share: 'M14 4l7 6-7 6v-4c-5 0-8.5 2.5-11 7 .7-8.4 4.4-12 11-12z',
  more: 'M5.5 12h.01 M12 12h.01 M18.5 12h.01',
  muted: 'M3 9h4l5-4v14l-5-4H3z M17 9l5 6 M22 9l-5 6',
  sound: 'M3 9h4l5-4v14l-5-4H3z M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v4h16v-4',
  flag: 'M5 21V4c5-4 9 4 14 0v10c-5 4-9-4-14 0',
  close: 'M6 6l12 12 M18 6 6 18',
};

export function FeedIcon({name, size = 24, filled = false}) {
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={name === 'more' ? 3.5 : 1.75}
    strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}

export function FeedAction({icon, label, onClick, selected, count}) {
  return <button type="button" className={'clipi-feed-action action-' + icon} aria-label={label} title={label}
    aria-pressed={selected} onClick={onClick}>
    {icon==='share'||icon==='download'
      ? <img src={icon==='share'?require('./assets/actions/share-left.png'):require('./assets/actions/download.png')} width={26} height={26} alt=""/>
      : icon==='comment'
      ? <img src={require('./assets/actions/comment-bubble.png')} width={24} height={24} alt=""/>
      : <FeedIcon name={icon} size={27} filled={icon==='like'||selected}/>}
    {icon==='share'&&<span>مشاركة</span>}
    {count != null && <span>{Number(count).toLocaleString(document.documentElement.lang || 'ar')}</span>}
  </button>;
}

export function FeedSheet({title, closeLabel, onClose, choices}) {
  return <Modal transparent animationType="fade" onRequestClose={onClose}>
    <div className="clipi-sheet-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <section className="clipi-feed-sheet" aria-label={title}>
        <header><h2>{title}</h2><button type="button" onClick={onClose} aria-label={closeLabel}><FeedIcon name="close" size={19}/></button></header>
        {choices.map(({label,icon,onClick})=><button type="button" key={icon} className={'clipi-sheet-choice choice-'+icon} onClick={onClick}>
          <span className="clipi-choice-icon"><FeedIcon name={icon} size={24}/></span>{label}
        </button>)}
      </section>
    </div>
  </Modal>;
}

import {ui as appText} from './interface-language.mjs';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Modal} from 'react-native';
import {ShortVideoHome} from './ShortVideoHome';
import {startProfileVideo} from './ShortMedia';


function ClipTile({source, label, onOpen}) {
  const tile = useRef(null);
  const [visible, setVisible] = useState(false);
  const [image, setImage] = useState('');
  useEffect(() => {
    if (!window.IntersectionObserver) {setVisible(true); return;}
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {setVisible(true); observer.disconnect();}
    }, {rootMargin:'100px'});
    observer.observe(tile.current);
    return () => observer.disconnect();
  }, []);

  function capture(event) {
    const video = event.currentTarget;
    if (video.seeking || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = 228; canvas.height = 342;
    const context = canvas.getContext('2d');
    if (!context) return;
    const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const w = video.videoWidth * scale, h = video.videoHeight * scale;
    try {
      context.drawImage(video, (canvas.width-w)/2, (canvas.height-h)/2, w, h);
      setImage(canvas.toDataURL('image/jpeg', .76));
    } catch { /* Keep the paused video frame when capture is unavailable. */ }
  }

  return <button ref={tile} type="button" className="clipi-profile-tile" aria-label={label} onClick={()=>onOpen(image)}>
    {image ? <img alt="" src={image}/> : visible && <video aria-hidden="true" muted playsInline preload="metadata"
      src={source + '#t=0.1'} onLoadedMetadata={e => {
        const v=e.currentTarget;
        if (Number.isFinite(v.duration) && v.duration>0) v.currentTime=Math.min(.6,v.duration/2);
      }} onLoadedData={capture} onSeeked={capture}/>}
  </button>;
}

export default function ProfileShorts({playerProps,request, endpoint, authorUid, translate = appText}) {
  const [clips,setClips] = useState([]), [cursor,setCursor] = useState(null);
  const [canDelete,setCanDelete] = useState(false), [loading,setLoading] = useState(true);
  const [error,setError] = useState(''), [selected,setSelected] = useState(null);
  const life = useRef(0), loadingPage = useRef(null), more = useRef(null);
  const load = useCallback(async before => {
    const generation = life.current;
    if (loadingPage.current === generation) return;
    loadingPage.current = generation;setLoading(true);setError('');
    try {
      const page = await request('/account-number',{op:'shortProfileList',owner:authorUid,before});
      if (life.current !== generation) return;
      setClips(current=>before == null?page.clips:[...current,...page.clips]);
      setCanDelete(page.canDelete === true);
      setCursor(page.nextCursor);
    } catch(e) {
      if (life.current === generation) setError(e.message || translate('تعذّر تحميل الفيديوهات'));
    } finally {
      if (life.current === generation) {loadingPage.current=null;setLoading(false);}
    }
  },[request,authorUid,translate]);
  useEffect(() => {
    life.current++;
    setClips([]);setCursor(null);setSelected(null);setCanDelete(false);
    load(null);
    return () => {life.current++;};
  },[load]);
  useEffect(() => {
    if (!more.current || !window.IntersectionObserver || loading || error || cursor == null) return;
    const observer = new IntersectionObserver(([entry])=>{if(entry.isIntersecting) load(cursor);},{rootMargin:'140px'});
    observer.observe(more.current);
    return () => observer.disconnect();
  },[load,cursor,loading,error]);

  useEffect(() => () => { selected?.video.pause(); }, [selected]);

  function removed(id) {
    setClips(current => current.filter(clip => clip.id !== id));
    setSelected(null);
  }

  const source = clip => endpoint + '/shorts/media/' + clip.id;
  return <section className="clipi-profile-gallery">
    <h2>{translate(authorUid?'الفيديوهات':'فيديوهاتي')}</h2>
    <div className="clipi-profile-grid">{clips.map((clip,index)=><ClipTile key={clip.id}
      source={source(clip)} label={translate('تشغيل الفيديو')+' '+(clip.title||index+1)} onOpen={poster=>setSelected({id:clip.id, video:startProfileVideo(source(clip),poster,playerProps?.playable!==false)})}/>)}</div>
    {loading && <p role="status">{translate('جارٍ تحميل الفيديوهات…')}</p>}
    {!loading && !!error && <><p role="alert">{appText(error)}</p><button type="button" onClick={()=>load(cursor)}>{translate('إعادة المحاولة')}</button></>}
    {!loading && !error && !clips.length && <p>{translate('لا توجد فيديوهات منشورة بعد')}</p>}
    {!loading && !error && cursor!=null && <button type="button" ref={more} onClick={()=>load(cursor)}>{translate('عرض المزيد')}</button>}
    {selected && <Modal visible animationType="none" onRequestClose={()=>setSelected(null)}>
      <ShortVideoHome {...playerProps} request={request} endpoint={endpoint} translate={translate}
        initialId={selected.id} onAuthor={()=>setSelected(null)}
        profileFeed={{clips,canDelete,initialVideo:selected.video,onClose:()=>setSelected(null),onDeleted:removed,
          onMore:()=>{if(cursor!=null&&!loading&&!error)load(cursor);}}}/>
    </Modal>}
  </section>;
}

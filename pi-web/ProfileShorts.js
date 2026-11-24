import React, {useCallback, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {Player} from './ShortMedia';
import {FeedIcon} from './FeedControls';
import DeleteVideoDialog from './DeleteVideoDialog';

const unchanged = text => text;

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
    canvas.width = 120; canvas.height = 160;
    const context = canvas.getContext('2d');
    if (!context) return;
    const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const w = video.videoWidth * scale, h = video.videoHeight * scale;
    try {
      context.drawImage(video, (canvas.width-w)/2, (canvas.height-h)/2, w, h);
      setImage(canvas.toDataURL('image/jpeg', .76));
    } catch { /* Keep the paused video frame when capture is unavailable. */ }
  }

  return <button ref={tile} type="button" className="clipi-profile-tile" aria-label={label} onClick={onOpen}>
    {image ? <img alt="" src={image}/> : visible && <video aria-hidden="true" muted playsInline preload="metadata"
      src={source + '#t=0.1'} onLoadedMetadata={e => {
        const v=e.currentTarget;
        if (Number.isFinite(v.duration) && v.duration>0) v.currentTime=Math.min(.6,v.duration/2);
      }} onLoadedData={capture} onSeeked={capture}/>}
  </button>;
}

function ProfileVideo({clip, source, canDelete, translate, onClose, onDelete}) {
  const viewer = useRef(null), menuButton = useRef(null), menu = useRef(null), submitting = useRef(false);
  const [panel,setPanel] = useState(''), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const [playing,setPlaying] = useState(true), [muted,setMuted] = useState(true);
  const menuId = useId();

  useLayoutEffect(() => {
    const dialog = viewer.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  useEffect(() => { if(panel==='more') menu.current?.focus(); },[panel]);

  function dismiss() {
    if (submitting.current) return;
    if (panel) {setPanel(''); menuButton.current?.focus();} else onClose();
  }

  async function remove() {
    if (!canDelete || panel!=='delete' || submitting.current) return;
    submitting.current=true;setBusy(true);setError('');
    try {await onDelete(clip.id);}
    catch(e) {setError(e.message || translate('تعذّر حذف الفيديو'));setBusy(false);}
    finally {submitting.current=false;}
  }

  return <dialog ref={viewer} className="clipi-profile-viewer" aria-label={clip.title || translate('تشغيل الفيديو')}
    onCancel={e=>{e.preventDefault();dismiss();}}>
    <div className="clipi-profile-video-stage">
      <Player source={source} fit="contain" active={playing && !panel} muted={muted} onMuteRequired={setMuted}/>
      <button type="button" className="clipi-viewer-close" aria-label={translate('إغلاق')} onClick={dismiss}><FeedIcon name="close"/></button>
      <div className="clipi-viewer-controls">
        <button type="button" onClick={()=>setPlaying(!playing)}>{translate(playing?'إيقاف مؤقت':'تشغيل')}</button>
        <button type="button" aria-label={translate(muted?'تشغيل الصوت':'كتم الصوت')} onClick={()=>setMuted(!muted)}><FeedIcon name={muted?'muted':'sound'}/></button>
        {canDelete && <button ref={menuButton} type="button" aria-label={translate('المزيد')} aria-expanded={panel==='more'}
          aria-controls={panel==='more'?menuId:undefined} onClick={()=>setPanel(panel==='more'?'':'more')}><FeedIcon name="more"/></button>}
      </div>
      {panel==='more' && canDelete && <>
        <div className="clipi-profile-menu-backdrop" onClick={dismiss}/>
        <div id={menuId} className="clipi-profile-video-menu" aria-label={translate('المزيد')}>
          <button ref={menu} type="button" onClick={()=>{setError('');setPanel('delete');}}><FeedIcon name="trash" size={18}/>{translate('حذف الفيديو')}</button>
        </div>
      </>}
      {panel==='delete' && canDelete && <DeleteVideoDialog translate={translate} busy={busy} error={error} onCancel={dismiss} onConfirm={remove}/>}
    </div>
  </dialog>;
}

export default function ProfileShorts({request, endpoint, authorUid, translate = unchanged}) {
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

  async function remove(id) {
    if (!canDelete || selected?.id!==id) return;
    const generation=life.current;
    await request('/account-number',{op:'shortDelete',clip:id});
    if (life.current!==generation) return;
    setClips(current=>current.filter(clip=>clip.id!==id));setSelected(null);
  }

  const source = clip => endpoint + '/shorts/media/' + clip.id;
  return <section className="clipi-profile-gallery">
    <h2>{translate(authorUid?'الفيديوهات':'فيديوهاتي')}</h2>
    <div className="clipi-profile-grid">{clips.map((clip,index)=><ClipTile key={clip.id}
      source={source(clip)} label={translate('تشغيل الفيديو')+' '+(clip.title||index+1)} onOpen={()=>setSelected(clip)}/>)}</div>
    {loading && <p role="status">{translate('جارٍ تحميل الفيديوهات…')}</p>}
    {!loading && !!error && <><p role="alert">{error}</p><button type="button" onClick={()=>load(cursor)}>{translate('إعادة المحاولة')}</button></>}
    {!loading && !error && !clips.length && <p>{translate('لا توجد فيديوهات منشورة بعد')}</p>}
    {!loading && !error && cursor!=null && <button type="button" ref={more} onClick={()=>load(cursor)}>{translate('عرض المزيد')}</button>}
    {selected && <ProfileVideo key={selected.id} clip={selected} source={source(selected)} canDelete={canDelete}
      translate={translate} onClose={()=>setSelected(null)} onDelete={remove}/>}
  </section>;
}

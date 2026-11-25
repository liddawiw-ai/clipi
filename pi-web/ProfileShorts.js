import {ui as appText} from './interface-language.mjs';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Modal} from 'react-native';
import {ShortVideoHome} from './ShortVideoHome';
import {shortsLookahead, startProfileVideo} from './ShortMedia';


function ClipTile({source, label, onOpen, previews, suspended, warm}) {
  const tile = useRef(null), host = useRef(null);
  const [visible, setVisible] = useState(false);
  const [image, setImage] = useState('');
  const captured = useRef('');
  useEffect(() => {
    if (!window.IntersectionObserver) {setVisible(true); return;}
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {rootMargin:'100px'});
    observer.observe(tile.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || suspended || (!warm && captured.current)) return;
    const video = document.createElement('video');
    video.defaultMuted = video.muted = true;
    video.playsInline = true;
    video.preload = warm ? 'auto' : 'metadata';
    const pool = previews.current;
    pool.set(source,video);
    function seekCover() {
      if (!warm && pool.get(source)===video && Number.isFinite(video.duration) && video.duration>0)
        video.currentTime=Math.min(.1,video.duration/2);
    }
    function capture() {
      if (pool.get(source)!==video || captured.current || video.seeking || video.readyState<2 || !video.videoWidth) return;
      const canvas = document.createElement('canvas');
      canvas.width=228; canvas.height=342;
      const context=canvas.getContext('2d');
      if (!context) return;
      const scale=Math.max(canvas.width/video.videoWidth,canvas.height/video.videoHeight);
      const w=video.videoWidth*scale, h=video.videoHeight*scale;
      try {
        context.drawImage(video,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
        captured.current=canvas.toDataURL('image/jpeg',.76);
        setImage(captured.current);
      } catch { /* The paused inline frame remains the cover. */ }
    }
    video.addEventListener('loadedmetadata',seekCover);
    video.addEventListener('loadeddata',capture);
    video.addEventListener('seeked',capture);
    host.current.appendChild(video);
    video.src=source;
    return () => {
      video.removeEventListener('loadedmetadata',seekCover);
      video.removeEventListener('loadeddata',capture);
      video.removeEventListener('seeked',capture);
      if (pool.get(source)===video) {
        pool.delete(source);
        video.pause();video.removeAttribute('src');video.load();video.remove();
      }
    };
  }, [visible, source, previews, suspended, warm]);

  return <button ref={tile} type="button" className="clipi-profile-tile" aria-label={label} onClick={()=>onOpen(image)}>
    <span ref={host} aria-hidden="true" style={image?{display:'none'}:undefined}/>
    {image && <img alt="" src={image}/>}
  </button>;
}

export default function ProfileShorts({playerProps,request, endpoint, authorUid, translate = appText}) {
  const [clips,setClips] = useState([]), [cursor,setCursor] = useState(null);
  const [canDelete,setCanDelete] = useState(false), [loading,setLoading] = useState(true);
  const [error,setError] = useState(''), [selected,setSelected] = useState(null);
  const previews = useRef(new Map());
  const ahead = shortsLookahead();
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

  useEffect(() => () => {
    for (const video of selected?.videos.values() || []) {
      video.pause();video.removeAttribute('src');video.load();
    }
  }, [selected]);

  function removed(id) {
    setClips(current => current.filter(clip => clip.id !== id));
    setSelected(null);
  }

  const source = clip => endpoint + '/shorts/media/' + clip.id;
  function open(index,poster) {
    const chosen=clips[index], videos=new Map();
    for (const clip of clips.slice(Math.max(0,index-1),index+ahead+1)) {
      const url=source(clip), video=previews.current.get(url);
      if (!video) continue;
      previews.current.delete(url);
      video.remove();
      if (video.readyState>=1 && video.currentTime!==0) video.currentTime=0;
      videos.set(clip.id,video);
    }
    videos.set(chosen.id,startProfileVideo(source(chosen),poster,playerProps?.playable!==false,videos.get(chosen.id)));
    setSelected({id:chosen.id,videos});
  }
  return <section className="clipi-profile-gallery">
    <h2>{translate(authorUid?'الفيديوهات':'فيديوهاتي')}</h2>
    <div className="clipi-profile-grid">{clips.map((clip,index)=><ClipTile key={clip.id}
      previews={previews} warm={index < (ahead===2 ? 3 : 1)} suspended={!!selected} source={source(clip)} label={translate('تشغيل الفيديو')+' '+(clip.title||index+1)} onOpen={poster=>open(index,poster)}/>)}</div>
    {loading && <p role="status">{translate('جارٍ تحميل الفيديوهات…')}</p>}
    {!loading && !!error && <><p role="alert">{appText(error)}</p><button type="button" onClick={()=>load(cursor)}>{translate('إعادة المحاولة')}</button></>}
    {!loading && !error && !clips.length && <p>{translate('لا توجد فيديوهات منشورة بعد')}</p>}
    {!loading && !error && cursor!=null && <button type="button" ref={more} onClick={()=>load(cursor)}>{translate('عرض المزيد')}</button>}
    {selected && <Modal visible animationType="none" onRequestClose={()=>setSelected(null)}>
      <ShortVideoHome {...playerProps} request={request} endpoint={endpoint} translate={translate}
        initialId={selected.id} onAuthor={()=>setSelected(null)}
        profileFeed={{clips,canDelete,initialVideos:selected.videos,onClose:()=>setSelected(null),onDeleted:removed,
          onMore:()=>{if(cursor!=null&&!loading&&!error)load(cursor);}}}/>
    </Modal>}
  </section>;
}

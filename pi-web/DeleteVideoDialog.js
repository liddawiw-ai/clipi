import React, {useId, useLayoutEffect, useRef} from 'react';

export default function DeleteVideoDialog({translate, busy, error, onCancel, onConfirm}) {
  const ref = useRef(null);
  const titleId = useId();
  const noteId = useId();

  useLayoutEffect(() => {
    const dialog = ref.current;
    const stage = dialog.parentElement;
    const viewport = window.visualViewport;

    function centerOnVideo() {
      const rect = stage.getBoundingClientRect();
      const x = viewport?.offsetLeft ?? 0, y = viewport?.offsetTop ?? 0;
      const w = viewport?.width ?? window.innerWidth, h = viewport?.height ?? window.innerHeight;
      dialog.style.maxWidth = Math.max(1, Math.min(w, rect.width) - 16) + 'px';
      dialog.style.maxHeight = Math.max(1, h - 16) + 'px';
      const halfWidth = dialog.offsetWidth / 2, halfHeight = dialog.offsetHeight / 2;
      const centerX = Math.max(x + halfWidth + 8, Math.min(rect.left + rect.width / 2, x + w - halfWidth - 8));
      const centerY = Math.max(y + halfHeight + 8, Math.min(rect.top + rect.height / 2, y + h - halfHeight - 8));
      dialog.style.left = centerX + 'px';
      dialog.style.top = centerY + 'px';
    }

    // The browser displays the dialog in its top layer. Anchor it to the active video.
    stage.scrollIntoView({block:'nearest', inline:'nearest'});
    dialog.showModal();
    centerOnVideo();
    const observer = new ResizeObserver(centerOnVideo);
    observer.observe(stage);
    observer.observe(dialog);
    window.addEventListener('scroll', centerOnVideo, true);
    window.addEventListener('resize', centerOnVideo);
    viewport?.addEventListener('resize', centerOnVideo);
    viewport?.addEventListener('scroll', centerOnVideo);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', centerOnVideo, true);
      window.removeEventListener('resize', centerOnVideo);
      viewport?.removeEventListener('resize', centerOnVideo);
      viewport?.removeEventListener('scroll', centerOnVideo);
      dialog.close();
    };
  }, []);

  return <dialog ref={ref} className="clipi-video-delete-dialog" aria-labelledby={titleId} aria-describedby={noteId}
    onCancel={event => {event.preventDefault(); event.stopPropagation(); if (!busy) onCancel();}}>
    <h2 id={titleId}>{translate('حذف الفيديو؟')}</h2>
    <p id={noteId}>{translate('سيُحذف المقطع وتعليقاته نهائيًا.')}</p>
    {error && <p role="alert">{error}</p>}
    <div className="clipi-video-delete-actions">
      <button type="button" autoFocus disabled={busy} onClick={onCancel}>{translate('إلغاء')}</button>
      <button type="button" className="clipi-video-delete-confirm" disabled={busy} onClick={onConfirm}>
        {translate(busy ? 'جارٍ الحذف…' : 'تأكيد الحذف')}
      </button>
    </div>
  </dialog>;
}

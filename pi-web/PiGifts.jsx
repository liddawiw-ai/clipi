import {ui} from './interface-language.mjs';
import React, {useEffect, useRef, useState} from 'react';
import {auth, piSdk} from './services';
import {gifts} from '../worker/gift-catalog.mjs';

async function request(action, body, sessionId) {
  const token = await auth().currentUser?.getIdToken();
  const response = await fetch('/pi-gifts/' + action, {
    method: body ? 'POST' : 'GET',
    headers: {...(sessionId?{'X-Room-Session':sessionId}:{}),Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
    body: body && JSON.stringify(body)
  });
  if (!response.ok) throw Error(ui("تعذّر الاتصال بخدمة الهدايا."));
  return response.json();
}

export function PiGifts({roomId, recipient, sessionId, open, close, show}) {
  const [catalog, setCatalog] = useState(null);
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(null);
  useEffect(() => () => { lock.current = null; }, []);
  const display = useRef(show);
  display.current = show;
  useEffect(() => {
    let stopped = false, timer, seen;
    async function poll() {
      try {
        const data = await request('events?room=' + encodeURIComponent(roomId),undefined,sessionId);
        if (stopped) return;
        const latest = data.gifts.filter(item => seen && !seen.has(item.id) && Object.hasOwn(gifts,item.gift));
        seen = new Set(data.gifts.map(item => item.id));
        if (latest.length) {const event=latest.at(-1), gift=gifts[event.gift];display.current({...gift,name:event.name?ui(gift.name)+ui(" إلى ")+event.name:ui(gift.name)})}
      } catch {}
      if (!stopped) timer = setTimeout(poll, 4500);
    }
    poll();
    return () => {stopped = true; clearTimeout(timer)};
  }, [roomId,sessionId]);
  useEffect(() => {
    let active = true;
    if (open) request('catalog').then(data => {if(active) {setCatalog(data.gifts);setPaused(data.paused===true)}})
      .catch(() => {if(active) {setCatalog(null);setMessage(ui("الدفع غير متاح حالياً."))}});
    return () => {active = false};
  }, [open]);
  async function buy(id, gift) {
    if (paused || lock.current) return;
    const attempt = {};
    lock.current = attempt;
    const active = () => lock.current === attempt;
    setBusy(true);
    setMessage(ui("جاري تسجيل الدخول إلى Pi…"));
    function end(text) {
      if (!active()) return;
      clearTimeout(timer);
      lock.current = null;
      setBusy(false);
      setMessage(text);
    }
    let timer = setTimeout(() => end(ui("تأخر رد Pi على طلب صلاحية الدفع. حاول مجددًا.")), 30000);
    try {
      const pending = [];
      let accessToken;
      const completeOld = payment => request('complete', {kind:payment.metadata?.kind,roomId:payment.metadata?.roomId, paymentId:payment.identifier, txid:payment.transaction?.txid, accessToken});
      const sdk=piSdk();
      const session = await sdk.authenticate(['username','payments'], payment => {
        if (!active() && !accessToken) return;
        if (!accessToken) pending.push(payment);
        else completeOld(payment).catch(() => end(ui("تعذّر تأكيد دفعة سابقة.")));
      });
      if (!active()) return;
      clearTimeout(timer);
      accessToken = session.accessToken;
      if (pending.length) {
        setMessage(ui("جاري تأكيد دفعة سابقة…"));
        timer = setTimeout(() => end(ui("تأخر تأكيد الدفعة السابقة. تحقق من حالتها في المحفظة.")), 30000);
      }
      for (const payment of pending) await completeOld(payment);
      if (pending.length) return end(ui("تم تأكيد الدفعة السابقة. يمكنك اختيار هدية الآن."));
      const send = (action, paymentId, txid) => request(action,{roomId,paymentId,txid,accessToken},sessionId);
      if (!active()) return;
      setMessage(ui("جاري فتح محفظة Pi…"));
      timer = setTimeout(() => {
        if (active()) setMessage(ui("تأخر رد المحفظة. إذا ما ظهرت، أعد فتح الغرفة في Pi Browser وتحقق من حالة الدفعة."));
      }, 20000);
      await sdk.createPayment({amount:gift.amount,memo:'Clipi app wallet · '+gift.name,metadata:{destination:'app_wallet',gift:id,roomId,...(recipient?{recipientUid:recipient.uid,recipientName:recipient.name}:{})}},{
        onReadyForServerApproval: paymentId => {
          if (!active()) return;
          clearTimeout(timer);
          setMessage(ui("بانتظار موافقة خادم Clipi…"));
          return send('approve',paymentId).then(() => {
            if (active()) setMessage(ui("بانتظار تأكيدك في المحفظة…"));
          }).catch(() => {
            if (active()) setMessage(ui("تعذرت موافقة الخادم. بانتظار رد المحفظة…"));
          });
        },
        onReadyForServerCompletion: (paymentId,txid) => send('complete',paymentId,txid).then(() => end(ui("تم إرسال الهدية."))).catch(() => end(ui("الدفع بانتظار التأكيد."))),
        onCancel: () => end(ui("أُلغي الدفع.")),
        onError: () => end(ui("تعذّر إكمال الدفع."))
      });
    } catch {end(window.Pi?ui("تعذّر بدء الدفع. تحقق من صلاحية المدفوعات في حساب Pi ثم حاول مجددًا."):ui("لم يتم تحميل خدمة Pi. حدّث الصفحة داخل Pi Browser."))}
  }
  if (!open) return null;
  return <section role="dialog" aria-modal="true" dir="auto" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:1000,maxHeight:"85vh",overflowY:"auto",background:'#201631',color:'white',padding:16,borderRadius:16}}>
    <button onClick={close} aria-label={ui("إغلاق")}>×</button> <strong>{ui("هدايا Pi")}</strong>
    <p>{ui("دفعة Pi حقيقية إلى محفظة Clipi. تظهر الهدية في الغرفة وحصة المضيف في هذه التجربة صفر.")}</p>
    <p role="status">{paused ? ui("هدايا Pi المدفوعة متوقفة مؤقتًا حتى تتوفر تحويلات المضيفين.") : message || (catalog ? ui("اختَر هدية") : ui("جاري تحميل الهدايا…"))}</p>
    <div style={{display:'flex',gap:8,marginTop:12}}>{Object.entries(catalog||{}).map(([id,g]) =>
      <button key={id} disabled={busy} onClick={() => buy(id,g)} style={{flex:1,padding:10,borderRadius:12,background:'#453263',color:'white'}}>
        <span style={{fontSize:28}}>{g.icon}</span><br/>{ui(g.name)}<br/>{g.amount} Pi
      </button>)}</div>
  </section>;
}

import React, {useEffect, useRef, useState} from 'react';
import {auth} from './services';
import {gifts} from '../worker/gift-catalog.mjs';

async function request(action, body) {
  const token = await auth().currentUser?.getIdToken();
  const response = await fetch('/pi-gifts/' + action, {
    method: body ? 'POST' : 'GET',
    headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
    body: body && JSON.stringify(body)
  });
  if (!response.ok) throw Error('تعذّر الاتصال بخدمة الهدايا.');
  return response.json();
}

export function PiGifts({roomId, open, close, show}) {
  const [catalog, setCatalog] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const display = useRef(show);
  display.current = show;
  useEffect(() => {
    let stopped = false, timer, seen;
    async function poll() {
      try {
        const data = await request('events?room=' + encodeURIComponent(roomId));
        if (stopped) return;
        const latest = data.gifts.filter(item => seen && !seen.has(item.id) && Object.hasOwn(gifts,item.gift));
        seen = new Set(data.gifts.map(item => item.id));
        if (latest.length) display.current(gifts[latest.at(-1).gift]);
      } catch {}
      if (!stopped) timer = setTimeout(poll, 4500);
    }
    poll();
    return () => {stopped = true; clearTimeout(timer)};
  }, [roomId]);
  useEffect(() => {
    let active = true;
    if (open) request('catalog').then(data => {if(active) setCatalog(data.gifts)})
      .catch(() => {if(active) {setCatalog(null);setMessage('الدفع غير متاح حالياً.')}});
    return () => {active = false};
  }, [open]);
  async function buy(id, gift) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    function end(text) {lock.current=false; setBusy(false); setMessage(text)}
    try {
      const pending = [];
      let accessToken;
      const completeOld = payment => request('complete', {roomId:payment.metadata?.roomId, paymentId:payment.identifier, txid:payment.transaction?.txid, accessToken});
      const session = await window.Pi.authenticate(['username','payments'], payment => {
        if (!accessToken) pending.push(payment);
        else completeOld(payment).catch(() => end('تعذّر تأكيد دفعة سابقة.'));
      });
      accessToken = session.accessToken;
      for (const payment of pending) await completeOld(payment);
      if (pending.length) return end('تم تأكيد الدفعة السابقة. يمكنك اختيار هدية الآن.');
      const send = (action, paymentId, txid) => request(action,{roomId,paymentId,txid,accessToken});
      await window.Pi.createPayment({amount:gift.amount,memo:'Clipi · '+gift.name,metadata:{gift:id,roomId}},{
        onReadyForServerApproval: paymentId => send('approve',paymentId).catch(() => end('تعذرت الموافقة على الدفع.')),
        onReadyForServerCompletion: (paymentId,txid) => send('complete',paymentId,txid).then(() => end('تم إرسال الهدية.')).catch(() => end('الدفع بانتظار التأكيد.')),
        onCancel: () => end('أُلغي الدفع.'),
        onError: () => end('تعذّر إكمال الدفع.')
      });
    } catch {end('تعذّر فتح الدفع. افتح الغرفة من Pi Browser.')}
  }
  if (!open) return null;
  return <section dir="rtl" style={{background:'#201631',color:'white',padding:16,borderRadius:16}}>
    <button onClick={close} aria-label="إغلاق">×</button> <strong>هدايا الغرفة</strong>
    <div style={{display:'flex',gap:8,marginTop:12}}>{Object.entries(catalog||{}).map(([id,g]) =>
      <button key={id} disabled={busy} onClick={() => buy(id,g)} style={{flex:1,padding:10,borderRadius:12,background:'#453263',color:'white'}}>
        <span style={{fontSize:28}}>{g.icon}</span><br/>{g.name}<br/>{g.amount} Pi
      </button>)}</div><small role="status">{message || (busy?'بانتظار المحفظة…':'')}</small>
  </section>;
}

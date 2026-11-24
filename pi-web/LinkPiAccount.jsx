import {ui as appText} from './interface-language.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {piLogin,verifyEmailForPi} from './services';


export default function LinkPiAccount({uid,linked,onDone}){
  const [email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [review,setReview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reauth,setReauth]=useState(false);
  const active=useRef(true),lock=useRef(false);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function run(action){
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');
    try{await action();}
    catch(e){if(active.current)setError(e.message||appText('تعذّر إتمام العملية. حاول مجددًا.'));}
    finally{lock.current=false;if(active.current)setBusy(false);}
  }
  const buttonStyle={minHeight:44,padding:'8px 16px',borderRadius:12,border:'1px solid #bdcfc6',background:'#f8fbf9',color:'#163c30',font:'inherit',cursor:'pointer'};
  const inputStyle={minHeight:44,padding:'0 12px',border:'1px solid #a2b5aa',borderRadius:10,font:'inherit'};
  const form={display:'grid',gap:12,textAlign:'start',background:'white',color:'#203529',borderRadius:16,padding:16};
  if(uid.startsWith('pi:')&&linked&&!reauth)return <section style={form}>
    <p>{appText('أنت في ملف Pi الأصلي. يمكنك الرجوع إلى حساب كليبي المرتبط الذي يحتوي فيديوهات أندرويد.')}</p>
    <button disabled={busy} style={buttonStyle} onClick={()=>run(async()=>{const result=await piLogin(false,uid);if(result.needsEmail)setReauth(true);else onDone();})}>{appText('فتح الحساب المرتبط')}</button>
    {error&&<p role="alert">{appText(error)}</p>}
  </section>;
  if(!uid.startsWith('pi:'))return <section style={form}>
    <p>{linked?appText('أنت في حساب البريد المرتبط. لعرض بيانات Pi السابقة افتح ملف Pi الأصلي.'):appText('أنت داخل بالبريد. افتح ملف Pi، ثم ارجع إلى إعدادات الربط لتأكيد حساب البريد.')}</p>
    <button style={buttonStyle} disabled={busy} onClick={()=>run(async()=>{await piLogin(true);onDone();})}>{appText('فتح ملف Pi الأصلي')}</button>
    {error&&<p role="alert">{appText(error)}</p>}
  </section>;
  return <form style={form} onSubmit={event=>{
    event.preventDefault();
    if(review){void run(async()=>{await review.confirm();onDone(true);});return;}
    void run(async()=>{
      const verification=verifyEmailForPi(email,password,uid);
      setPassword('');
      const result=await verification;
      if(active.current)setReview(result);
    });
  }}>
    {review?<div>
      <p>{appText('حساب Pi الحالي')} · {review.details.piNumber}</p>
      <p>{appText('حساب البريد الذي سيفتح عند الدخول بـPi')} · <strong>{review.details.emailNumber}</strong></p>
      <p>{appText('سيظهر اسم حساب البريد ورقمه وفيديوهاته. يمكنك فتح ملف Pi الأصلي من الإعدادات للوصول إلى رصيده وبياناته السابقة.')}</p>
    </div>:<>
      <p>{appText('أدخل بيانات حساب كليبي الذي نشرت منه على أندرويد. ستراجع رقم الحساب قبل تأكيد الربط.')}</p>
      <label htmlFor="clipi-link-email">{appText('بريد حساب أندرويد')}</label>
      <input id="clipi-link-email" type="email" autoComplete="username" required value={email} disabled={busy} style={inputStyle} onChange={e=>setEmail(e.target.value)}/>
      <label htmlFor="clipi-link-password">{appText('كلمة المرور')}</label>
      <input id="clipi-link-password" type="password" autoComplete="current-password" required value={password} disabled={busy} style={inputStyle} onChange={e=>setPassword(e.target.value)}/>
    </>}
    <button style={buttonStyle} type="submit" disabled={busy}>{busy?appText('جارٍ التحقق…'):review?appText('تأكيد الربط وفتح حساب البريد'):appText('تحقّق من الحسابين')}</button>
    {review&&<button style={buttonStyle} type="button" disabled={busy} onClick={()=>{setReview(null);setError('');}}>{appText('إلغاء')}</button>}
    {error&&<p role="alert">{appText(error)}</p>}
  </form>;
}

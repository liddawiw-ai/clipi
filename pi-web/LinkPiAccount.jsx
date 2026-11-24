import React,{useEffect,useRef,useState} from 'react';
import {piLogin,verifyEmailForPi} from './services';

const text=(ar,en)=>document.documentElement.lang==='ar'?ar:en;

export default function LinkPiAccount({uid,linked,onDone}){
  const [email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [review,setReview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reauth,setReauth]=useState(false);
  const active=useRef(true),lock=useRef(false);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function run(action){
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');
    try{await action();}
    catch(e){if(active.current)setError(e.message||text('تعذّر إتمام العملية. حاول مجددًا.','Please try again.'));}
    finally{lock.current=false;if(active.current)setBusy(false);}
  }
  const buttonStyle={minHeight:44,padding:'8px 16px',borderRadius:12,border:'1px solid #bdcfc6',background:'#f8fbf9',color:'#163c30',font:'inherit',cursor:'pointer'};
  const inputStyle={minHeight:44,padding:'0 12px',border:'1px solid #a2b5aa',borderRadius:10,font:'inherit'};
  const form={display:'grid',gap:12,textAlign:'start',background:'white',color:'#203529',borderRadius:16,padding:16};
  if(uid.startsWith('pi:')&&linked&&!reauth)return <section style={form}>
    <p>{text('أنت في ملف Pi الأصلي. يمكنك الرجوع إلى حساب كليبي المرتبط الذي يحتوي فيديوهات أندرويد.','This is the original Pi profile. Return to the linked profile to see your Android videos.')}</p>
    <button disabled={busy} style={buttonStyle} onClick={()=>run(async()=>{const result=await piLogin(false,uid);if(result.needsEmail)setReauth(true);else onDone();})}>{text('فتح الحساب المرتبط','Open linked account')}</button>
    {error&&<p role="alert">{error}</p>}
  </section>;
  if(!uid.startsWith('pi:'))return <section style={form}>
    <p>{linked?text('أنت في حساب البريد المرتبط. لعرض بيانات Pi السابقة افتح ملف Pi الأصلي.','You are in the linked email profile. Open the original Pi profile for its previous data.'):text('أنت داخل بالبريد. افتح ملف Pi، ثم ارجع إلى إعدادات الربط لتأكيد حساب البريد.','You are signed in with email. Open your Pi profile and return to linking settings to verify the email account.')}</p>
    <button style={buttonStyle} disabled={busy} onClick={()=>run(async()=>{await piLogin(true);onDone();})}>{text('فتح ملف Pi الأصلي','Open original Pi profile')}</button>
    {error&&<p role="alert">{error}</p>}
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
      <p>{text('حساب Pi الحالي','Current Pi profile')} · {review.details.piNumber}</p>
      <p>{text('حساب البريد الذي سيفتح عند الدخول بـPi','Email profile used on Pi sign-in')} · <strong>{review.details.emailNumber}</strong></p>
      <p>{text('سيظهر اسم حساب البريد ورقمه وفيديوهاته. يمكنك فتح ملف Pi الأصلي من الإعدادات للوصول إلى رصيده وبياناته السابقة.','You will see the email account’s name, number and videos. Its balance stays separate from your original Pi profile, which remains available in Settings.')}</p>
    </div>:<>
      <p>{text('أدخل بيانات حساب كليبي الذي نشرت منه على أندرويد. ستراجع رقم الحساب قبل تأكيد الربط.','Enter the Clipi email account you used to post on Android. Review its account number before confirming.')}</p>
      <label htmlFor="clipi-link-email">{text('بريد حساب أندرويد','Android account email')}</label>
      <input id="clipi-link-email" type="email" autoComplete="username" required value={email} disabled={busy} style={inputStyle} onChange={e=>setEmail(e.target.value)}/>
      <label htmlFor="clipi-link-password">{text('كلمة المرور','Password')}</label>
      <input id="clipi-link-password" type="password" autoComplete="current-password" required value={password} disabled={busy} style={inputStyle} onChange={e=>setPassword(e.target.value)}/>
    </>}
    <button style={buttonStyle} type="submit" disabled={busy}>{busy?text('جارٍ التحقق…','Please wait…'):review?text('تأكيد الربط وفتح حساب البريد','Confirm and open email profile'):text('تحقّق من الحسابين','Verify both accounts')}</button>
    {review&&<button style={buttonStyle} type="button" disabled={busy} onClick={()=>{setReview(null);setError('');}}>{text('إلغاء','Cancel')}</button>}
    {error&&<p role="alert">{error}</p>}
  </form>;
}

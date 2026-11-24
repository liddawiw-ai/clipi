import {ui} from './interface-language.mjs';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';
firebase.initializeApp({projectId:'clipi-f67c0',authDomain:'clipi-f67c0.firebaseapp.com',apiKey:'AIzaSyAjP8dTGO_XdWrtmNRZQS4fifNalGzI2wI'});
export const auth=firebase.auth, firestore=firebase.firestore, functions=firebase.functions;
export const Alert={alert(title,message='',buttons){
  if(!buttons?.length){window.alert([title,message].filter(Boolean).join('\n'));return}
  const dialog=document.createElement('dialog');
  const label=document.createElement('p');label.textContent=[title,message].filter(Boolean).join('\n');dialog.append(label);
  for(const button of buttons){const el=document.createElement('button');el.textContent=button.text;el.onclick=()=>{dialog.close();button.onPress?.()};dialog.append(el)}
  dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
}};
let initialized=false;
export function piSdk(){
 if(!window.Pi)throw Error(ui("افتح الرابط داخل PI Browser وسجّل دخولك إلى PI."));
 if(!initialized){window.Pi.init({version:'2.0',sandbox:false});initialized=true}
 return window.Pi;
}
async function piRequest(path,session,body){
 const response=await fetch(path,{method:'POST',
   headers:{Authorization:'Bearer '+session.accessToken,...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();
 if(!response.ok)throw Error(data.error||ui("تعذر تأكيد حساب PI"));
 return data;
}
async function enterPiSession(data){
 const {user}=await auth().signInWithCustomToken(data.token);
 if(data.username&&user.displayName!==data.username)await user.updateProfile({displayName:data.username});
}
export async function piLogin(original=false,expectedPiUid=null){
 const session=await piSdk().authenticate(['username'],()=>{});
 if(expectedPiUid&&'pi:'+session.user.uid!==expectedPiUid)throw Error(ui('حساب Pi المفتوح مختلف عن حساب التطبيق.'));
 const data=await piRequest(original?'/auth/pi/original':'/auth/pi',session);
 await enterPiSession(data);
 return data;
}
export async function verifyEmailForPi(email,password,expectedPiUid){
 const session=await piSdk().authenticate(['username'],()=>{});
 if(auth().currentUser?.uid!==expectedPiUid||'pi:'+session.user.uid!==expectedPiUid)throw Error(ui('حساب Pi المفتوح مختلف عن حساب التطبيق.'));
 // Use an isolated, in-memory Firebase session so verifying the password cannot replace the current Pi session.
 const secondary=firebase.initializeApp(firebase.app().options,'verify-email-'+crypto.randomUUID());
 let emailToken;
 try{
   const verifier=secondary.auth();
   await verifier.setPersistence(firebase.auth.Auth.Persistence.NONE);
   try{
     const credential=await verifier.signInWithEmailAndPassword(email.trim(),password);
     emailToken=await credential.user.getIdToken();
   }catch{throw Error(ui('تعذّر تسجيل الدخول بحساب البريد. تحقّق من البيانات وحاول مجددًا.'));}
 }finally{await secondary.delete();}
 function requestLink(path,extra){
   if(auth().currentUser?.uid!==expectedPiUid)throw Error(ui('تغيّر الحساب المفتوح. أعد التحقق.'));
   return piRequest(path,session,{emailToken,piUid:expectedPiUid,...extra});
 }
 const details=await requestLink('/auth/pi/link-preview',{});
 return {details,async confirm(){
   const data=await requestLink('/auth/pi/link-confirm',{confirmNumber:details.emailNumber});
   await enterPiSession(data);
 }};
}

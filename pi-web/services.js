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
 if(!window.Pi)throw Error(ui("افتح الرابط داخل Pi Browser وسجّل دخولك إلى Pi."));
 if(!initialized){window.Pi.init({version:'2.0',sandbox:false});initialized=true}
 return window.Pi;
}
export async function piLogin(){
 const session=await piSdk().authenticate(['username'],()=>{});
 const res=await fetch('/auth/pi',{method:'POST',headers:{Authorization:'Bearer '+session.accessToken}});
 const data=await res.json();
 if(!res.ok)throw Error(data.error||ui("تعذر تأكيد حساب Pi"));
 const {user}=await auth().signInWithCustomToken(data.token);
 if(data.username&&user.displayName!==data.username)await user.updateProfile({displayName:data.username});
}

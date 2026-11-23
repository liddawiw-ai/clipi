import {ui} from './interface-language.mjs';

export async function choosePhoto(max){
  const picker=document.createElement('input');
  picker.type='file';
  picker.accept='image/*';
  picker.style.display='none';
  document.body.appendChild(picker);
  let file;
  let returnTimer;
  // Older embedded pickers return focus without firing a cancel event.
  let onReturn;

  try{
    file=await new Promise((resolve,reject)=>{
      onReturn=()=>{
        clearTimeout(returnTimer);
        returnTimer=setTimeout(()=>resolve(picker.files?.[0]||null),600);
      };
      window.addEventListener('focus',onReturn);
      picker.onchange=()=>resolve(picker.files?.[0]);
      picker.oncancel=()=>resolve(null);
      try{picker.click()}catch(error){reject(error)}
    });
  }finally{
    clearTimeout(returnTimer);
    window.removeEventListener('focus',onReturn);
    picker.remove();
  }
  if(!file)return null;
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();
    await new Promise((resolve,reject)=>{
      img.onload=resolve;
      img.onerror=()=>reject(Error(ui("تعذّرت قراءة الصورة. اختر صورة JPEG أو PNG.")));
      img.src=url;
    });
    const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/jpeg',0.68);
    if(!data.startsWith('data:image/jpeg;base64,')||data.length>620000)throw Error(ui("اختر صورة أصغر"));
    return data;
  }finally{URL.revokeObjectURL(url)}
}

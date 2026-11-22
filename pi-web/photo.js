import {ui} from './interface-language.mjs';
export async function choosePhoto(max){
  const picker=document.createElement('input');
  picker.type='file';picker.accept='image/*';
  const file=await new Promise(resolve=>{
    picker.onchange=()=>resolve(picker.files?.[0]);
    picker.oncancel=()=>resolve(null);
    picker.click();
  });
  if(!file)return null;
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=url;await img.decode();
    const scale=Math.min(1,max/Math.max(img.width,img.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/jpeg',0.68);
    if(data.length>620000)throw Error(ui("اختر صورة أصغر"));
    return data;
  }finally{URL.revokeObjectURL(url)}
}

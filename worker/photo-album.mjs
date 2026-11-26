// Photos are resized on the device and stored as separate JPEGs in the post's existing media object.
export const maxPhotos=10;
const maxPhotoBytes=640*1024;
const fail=(error,status)=>Response.json({error},{status});
export function validNotes(notes){
  return Array.isArray(notes)&&notes.length>=1&&notes.length<=maxPhotos&&notes.every(x=>typeof x==='string'&&x.length<=160);
}
async function albumBody(request,limit){
  if(!request.body||Number(request.headers.get('Content-Length'))>limit)return null;
  const reader=request.body.getReader(),parts=[];
  let bytes=0;
  while(true){
    const {done,value}=await reader.read();if(done)break;
    bytes+=value.byteLength;
    if(bytes>limit){await reader.cancel();return null;}
    parts.push(value);
  }
  return new Blob(parts).text();
}
function jpeg(base64){
  if(typeof base64!=='string'||base64.length>4*Math.ceil(maxPhotoBytes/3))return null;
  const raw=atob(base64),size=raw.length;
  if(size<12||size>maxPhotoBytes||raw.charCodeAt(0)!==255||raw.charCodeAt(1)!==216||raw.charCodeAt(size-2)!==255||raw.charCodeAt(size-1)!==217)return null;
  // Only accept JPEG image frames of a size the app can display on a phone.
  let offset=2,hasFrame=false;
  while(offset+4<size&&raw.charCodeAt(offset)===255){
    while(raw.charCodeAt(offset)===255)offset++;
    const marker=raw.charCodeAt(offset++),length=(raw.charCodeAt(offset)<<8)|raw.charCodeAt(offset+1);
    if(length<2||offset+length>size)return null;
    if([0xc0,0xc1,0xc2].includes(marker)){
      if(length<8)return null;
      const h=(raw.charCodeAt(offset+3)<<8)|raw.charCodeAt(offset+4),w=(raw.charCodeAt(offset+5)<<8)|raw.charCodeAt(offset+6);
      if(!w||!h||Math.max(w,h)>4096||w*h>10000000)return null;
      hasFrame=true;
    }
    if(marker===0xda)return hasFrame?Uint8Array.from(raw,c=>c.charCodeAt(0)):null;
    offset+=length;
  }
  return null;
}
export async function albumFile(request,storage,count,index){
  const sql=storage.sql;
  sql.exec('CREATE TABLE IF NOT EXISTS album_slide(position INTEGER PRIMARY KEY, jpeg BLOB NOT NULL)');
  if(request.method==='PUT'){
    if(!Number.isInteger(count)||count<1||count>maxPhotos)return fail('عدد الصور غير صالح',400);
    if(sql.exec('SELECT COUNT(*) AS n FROM album_slide').one().n===count)return new Response(null,{status:204});
    const body=await albumBody(request,count*(Math.ceil(maxPhotoBytes/3)*4+5)+4);
    if(body===null)return fail('حجم الصور كبير جدًا',413);
    let slides;
    try{const values=JSON.parse(body);if(Array.isArray(values)&&values.length===count)slides=values.map(jpeg);}catch{}
    if(!slides||slides.some(x=>!x))return fail('تعذّرت قراءة الصور',415);
    return storage.transactionSync(()=>{
      if(sql.exec('SELECT id FROM deletion').toArray().length)return fail('المنشور غير موجود',404);
      if(!sql.exec('SELECT position FROM album_slide LIMIT 1').toArray().length)
        slides.forEach((pic,i)=>sql.exec('INSERT INTO album_slide VALUES(?,?)',i,pic.buffer));
      return new Response(null,{status:204});
    });
  }
  const photo=sql.exec('SELECT jpeg FROM album_slide WHERE position=?',index).toArray()[0];
  if(!photo)return fail('الصورة غير موجودة',404);
  return new Response(request.method==='HEAD'?null:photo.jpeg,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});
}
export function albumCall(store,id,request,count,index=0){
  const url='https://video.internal/album/'+index+'?count='+count;
  return store.getByName('album/'+id).fetch(url,{method:request.method,...(request.method==='PUT'?{body:request.body,headers:{'Content-Type':'application/json'}}:{})});
}

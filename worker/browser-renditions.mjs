import {roomStore} from './room-controls.mjs';
import {putVideo} from './video-storage.mjs';
import {verifyRenditionJob} from '../pi-web/verify-video-job.mjs';

const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function maintainBrowserVideo(request,env){
  if(env.PI_GIFTS_NETWORK!=='mainnet'||!env.CLIP_MEDIA)return json({},404);
  if(!await verifyRenditionJob(request))return json({},401);
  const url=new URL(request.url),id=url.searchParams.get('id');
  const q=await roomStore(env.PI_GIFTS_DB);
  await q('CREATE TABLE IF NOT EXISTS browser_rendition(clip TEXT PRIMARY KEY)').run();
  if(request.method==='GET'&&!id){
    const rows=await q("SELECT c.id FROM short_clip c WHERE c.object_key='cloud/'||c.id AND c.id>? AND NOT EXISTS(SELECT 1 FROM browser_rendition b WHERE b.clip=c.id) ORDER BY c.id LIMIT 12",url.searchParams.get('after')||'').all();
    return json({clips:rows.results.map(row=>row.id)});
  }
  if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id||'')||!['PUT','POST'].includes(request.method))return json({},400);
  const key='cloud/'+id;
  if(!await q('SELECT 1 FROM short_clip WHERE id=? AND object_key=?',id,key).first())return json({},404);
  if(request.method==='PUT'){
    const response=await putVideo(env.CLIP_MEDIA,key,request,true);
    if(!response.ok)return response;
  }
  await q('INSERT OR IGNORE INTO browser_rendition(clip) SELECT id FROM short_clip WHERE id=? AND object_key=?',id,key).run();
  return json({ok:true});
}

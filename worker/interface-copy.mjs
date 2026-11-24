import {english} from '../pi-web/interface-copy.mjs';
import {languageNames,sources} from '../pi-web/interface-keys.mjs';

const model='@cf/meta/m2m100-1.2b';
const schema=`CREATE TABLE IF NOT EXISTS interface_translation(
  locale TEXT, key TEXT, value TEXT, lease INTEGER NOT NULL, attempts INTEGER NOT NULL,
  PRIMARY KEY(locale,key))`;
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
function reply(data,status=200,complete=false){
  return new Response(JSON.stringify(data),{status,headers:{...headers,'Cache-Control':complete?'public, max-age=86400':'no-store'}});
}
export async function interfaceCopy(path,env){
  const [, ,locale,list,extra]=path.split('/');
  const ids=[...new Set((list||'').split(','))];
  if(extra!==undefined||!Object.hasOwn(languageNames,locale)||ids.length>8||ids.some(id=>!sources.has(id)))return reply({},400);
  const db=env.PI_GIFTS_DB;
  await db.prepare(schema).run();
  const now=Math.floor(Date.now()/1000);
  const entries=await Promise.all(ids.map(async id=>{
    const key=sources.get(id),text=english[key]||key;
    const source=/[\u0620-\u064a]/u.test(text)?'arabic':'english';
    if(source===languageNames[locale])return [id,text];
    const saved=await db.prepare('SELECT value FROM interface_translation WHERE locale=? AND key=?').bind(locale,id).first();
    if(saved?.value)return [id,saved.value];
    if(!env.AI)return null;
    // Each release-owned phrase can be submitted only once concurrently. Bound retries, including across isolates.
    const claim=await db.prepare(`INSERT INTO interface_translation VALUES(?,?,NULL,?,1)
      ON CONFLICT(locale,key) DO UPDATE SET lease=excluded.lease,attempts=attempts+1
      WHERE value IS NULL AND lease<=? AND attempts<4 RETURNING attempts`).bind(locale,id,now+120,now).first();
    if(!claim)return null;
    try{
      const output=await env.AI.run(model,{text,source_lang:source,target_lang:languageNames[locale]});
      const value=output?.translated_text?.trim();
      if(!value||value.length>6000)return null;
      await db.prepare('UPDATE interface_translation SET value=? WHERE locale=? AND key=? AND value IS NULL').bind(value,locale,id).run();
      return [id,value];
    }catch{return null;}
  }));
  const data=Object.fromEntries(entries.filter(Boolean));
  return reply(data,200,entries.every(Boolean));
}

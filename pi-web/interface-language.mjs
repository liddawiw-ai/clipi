import {english,videoActions,roomActions} from './interface-copy.mjs';
import {copyId,languageNames,sources} from './interface-keys.mjs';

const builtin=new Map(),aliases=new Map(),listeners=new Set(),packs=new Map();
function register(table){
  const source=table.ar;
  for(const key of Object.keys(source)){
    if(typeof source[key]==='object'){
      register(Object.fromEntries(Object.entries(table).map(([lang,values])=>[lang,values[key]])));
    }else if(key!=='languageName'){
      const values=Object.fromEntries(Object.entries(table).map(([lang,labels])=>[lang,labels[key]]));
      builtin.set(source[key],values);
      aliases.set(values.en,source[key]);
    }
  }
}
register(videoActions);
register(roomActions);
for(const [ar,en] of Object.entries(english))if(!aliases.has(en))aliases.set(en,ar);

let locale='ar',endpoint='',cache=null,revision=0;
const inFlight=new Set(),failures=new Map(),pending=new Map(),saveTimers=new Map();
let scheduled=false;
export const subscribeInterface=fn=>{listeners.add(fn);return ()=>listeners.delete(fn);};
export const interfaceRevision=()=>revision;
export const interfaceLocale=()=>locale;
export const isRTL=()=>['ar','he','fa','ur'].includes(locale);
function changed(){revision++;for(const fn of listeners)fn();}
function packFor(code){
  if(!packs.has(code))packs.set(code,Object.create(null));
  return packs.get(code);
}
function persist(code){
  if(!cache||saveTimers.has(code))return;
  saveTimers.set(code,setTimeout(()=>{
    saveTimers.delete(code);
    Promise.resolve().then(()=>cache.write(code,JSON.stringify(packFor(code)))).catch(()=>{});
  },250));
}
export function configureInterface(origin,code,storage,labels){
  if(labels)register(labels);
  endpoint=origin;
  cache=storage||(typeof window!=='undefined'?{
    read:lang=>window.localStorage.getItem('clipi.ui.v1.'+lang),
    write:(lang,value)=>window.localStorage.setItem('clipi.ui.v1.'+lang,value)
  }:null);
  setInterfaceLanguage(code);
}
export function setInterfaceLanguage(code){
  const next=Object.hasOwn(languageNames,code)?code:'en';
  const switched=next!==locale;
  locale=next;
  if(typeof document!=='undefined'){
    document.documentElement.lang=locale;
    document.documentElement.dir=isRTL()?'rtl':'ltr';
  }
  if(cache&&!packs.has(next)){
    const pack=packFor(next);
    Promise.resolve().then(()=>cache.read(next)).then(raw=>{
      if(!raw)return;
      const stored=JSON.parse(raw);
      for(const [id,value] of Object.entries(stored))if(sources.has(id)&&typeof value==='string'&&!(id in pack))pack[id]=value;
      if(locale===next)changed();
    }).catch(()=>{});
  }
  if(switched)changed();
}
function enqueue(code,id){
  const key=code+'/'+id;
  if(!endpoint||inFlight.has(key)||(failures.get(key)||0)>Date.now())return;
  pending.set(key,{code,id});
  if(!scheduled){scheduled=true;setTimeout(flush,0);}
}
async function flush(){
  const first=pending.values().next().value;
  if(!first){scheduled=false;return;}
  const {code}=first,ids=[];
  for(const [key,item] of pending){
    if(item.code!==code)continue;
    pending.delete(key);
    if(packFor(code)[item.id])continue;
    ids.push(item.id);inFlight.add(key);
    if(ids.length===8)break;
  }
  try{
    if(ids.length){
      const result=await fetch(endpoint+'/interface-copy/'+code+'/'+ids.join(','));
      if(!result.ok)throw Error('Translation unavailable');
      const data=await result.json(),pack=packFor(code);
      let updated=false;
      for(const id of ids){
        if(typeof data[id]==='string'&&data[id]){pack[id]=data[id];updated=true;}
        else failures.set(code+'/'+id,Date.now()+30000);
      }
      if(updated){persist(code);if(code===locale)changed();}
    }
  }catch{for(const id of ids)failures.set(code+'/'+id,Date.now()+60000);}
  finally{
    for(const id of ids)inFlight.delete(code+'/'+id);
    if(pending.size)setTimeout(flush,0);else scheduled=false;
  }
}
export function ui(value){
  if(typeof value!=='string'||!value.trim())return value;
  const raw=value.trim(),key=aliases.get(raw)||raw;
  const fixed=builtin.get(key)?.[locale];
  const id=copyId(key);
  if(!fixed&&!sources.has(id))return value;
  let output=fixed||packFor(locale)[id];
  const sourceLanguage=/[\u0620-\u064a]/u.test(key)?'ar':'en';
  if(!output){
    if(locale===sourceLanguage)output=key;
    else if(locale==='en'&&english[key])output=english[key];
    else {enqueue(locale,id);output=english[key]||key;}
  }
  return value.replace(raw,()=>output);
}

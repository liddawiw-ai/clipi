import assert from 'node:assert/strict';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {languages} from '../pi-web/languages.mjs';
import {interfaceCopy} from './interface-copy.mjs';
import {copyId,languageNames,sources} from '../pi-web/interface-keys.mjs';
import {videoActions,roomActions,english} from '../pi-web/interface-copy.mjs';
import {configureInterface,setInterfaceLanguage,ui,uiError,isRTL} from '../pi-web/interface-language.mjs';

test('video settings have offline labels in every offered language and English copy does not leak Arabic',()=>{
  configureInterface('','ar');
  assert.deepEqual(Object.keys(languages).sort(),Object.keys(languageNames).sort());
  assert.equal(uiError(new Error('Failed to fetch')), 'تعذّر جلب البيانات');
  assert.equal(uiError('upstream debug text'), 'تعذّر إتمام العملية. حاول مجددًا.');

  for(const code of Object.keys(languageNames)){
    setInterfaceLanguage(code);
    assert.deepEqual(videoActions.ar.map(ui),videoActions[code]);
    assert.deepEqual(roomActions.ar.map(ui),roomActions[code]);
    assert.equal(isRTL(),['ar','ur','fa','he'].includes(code));
    assert.equal(ui('ليلى ٤٢'),'ليلى ٤٢');
  }
  setInterfaceLanguage('en');
  assert.equal(uiError('مايك المضيف محمي'),'Host microphone is protected');
  for(const [id,key] of sources)if(/[\u0620-\u064a]/.test(key)){
    assert.ok(english[key]||videoActions.ar.includes(key),id);
    assert.doesNotMatch(ui(key),/[\u0620-\u064a]/);
  }
});
test('translations accept only release copy, deduplicate concurrent inference and reuse the stored language',async()=>{
  const sqlite=new DatabaseSync(':memory:');
  const db={prepare(query){const statement=(args=[])=>({run:()=>sqlite.prepare(query).run(...args),first:()=>sqlite.prepare(query).get(...args)});return {...statement(),bind:(...args)=>statement(args)};}};
  const calls=[];const env={PI_GIFTS_DB:db,AI:{async run(model,input){calls.push(input);await new Promise(r=>setTimeout(r,2));return {translated_text:'Fermer la salle pour tout le monde'};}}};
  const id=copyId('إغلاق الغرفة للجميع'),path='/interface-copy/fr/'+id;
  for(const invalid of ['/interface-copy/xx/'+id,'/interface-copy/fr/personal-data','/interface-copy/fr/'+id+'/extra'])assert.equal((await interfaceCopy(invalid,env)).status,400);
  const responses=await Promise.all([interfaceCopy(path,env),interfaceCopy(path,env)]);
  assert.ok(responses.every(r=>r.status===200));
  const cached=await interfaceCopy(path,env);
  assert.equal((await cached.json())[id],'Fermer la salle pour tout le monde');
  assert.equal(calls.length,1);
  assert.equal(calls[0].target_lang,'french');
  assert.equal(calls[0].text,english['إغلاق الغرفة للجميع']);
});

test('the translation endpoint returns original Arabic and release English for room messages without an inference service',async()=>{
  const source='إغلاق الغرفة للجميع',id=copyId(source);
  for(const [code,label] of [['ar',source],['en',english[source]]]){
    const res=await interfaceCopy('/interface-copy/'+code+'/'+id,{});
    assert.equal(res.status,200);
    assert.deepEqual(await res.json(),{[id]:label});
  }
});

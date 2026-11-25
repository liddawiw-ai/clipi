import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {setTimeout as delay} from 'node:timers/promises';
import {fulfill} from './fulfill.mjs';

const [ticket] = process.argv.slice(2);
const projectId=process.env.GOOGLE_CLOUD_PROJECT;
const key=process.env.CLIPI_ERASURE_KEY;
if(!projectId || !key || !ticket || !process.env.CLIPI_ERASURE_ORIGIN)
  throw Error('Supply a deletion request reference, GOOGLE_CLOUD_PROJECT, CLIPI_ERASURE_ORIGIN and CLIPI_ERASURE_KEY.');
const url=new URL('/internal/account-deletion',process.env.CLIPI_ERASURE_ORIGIN);
if(url.protocol!=='https:'||url.username||url.password)throw Error('An HTTPS Worker origin is required.');
const app=initializeApp({projectId,credential:applicationDefault()});
async function request(action,fields={}){
  const reply=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),
    headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({ticket,action,project:projectId,...fields})});
  if(!reply.ok)throw Error('Deletion step '+action+' returned '+reply.status+'. Resume with the same reference.');
  return reply.json();
}
for(;;){
  const result=await fulfill({db:getFirestore(app),auth:getAuth(app),request,ticket});
  if(result.state==='completed'){console.log('Account deletion completed.');break;}
  console.log('Access revoked. Resuming at '+new Date(result.resumeAt).toISOString());
  await delay(Math.max(0,result.resumeAt-Date.now()));
}

import {createRemoteJWKSet,jwtVerify} from 'jose';
const issuer='https://token.actions.githubusercontent.com';
const keys=createRemoteJWKSet(new URL(issuer+'/.well-known/jwks'));
const ref='refs/heads/work/clipi-testnet-gifts';
const repository='liddawiw-ai/clipi';
export function isRenditionJob(p){
  return p.repository_id==='1456852157'&&p.repository_owner_id==='356305926'&&p.repository===repository&&p.ref===ref&&
    ['repo:'+repository+':ref:'+ref,'repo:liddawiw-ai@356305926/clipi@1456852157:ref:'+ref].includes(p.sub)&&['push','workflow_dispatch'].includes(p.event_name)&&
    p.workflow_ref===repository+'/.github/workflows/pi-video-compat.yml@'+ref;
}
export async function verifyRenditionJob(request){
  const bearer=request.headers.get('Authorization')||'';
  if(!/^Bearer [\w.-]{1,8192}$/.test(bearer))return false;
  try{
    const {payload}=await jwtVerify(bearer.slice(7),keys,{issuer,audience:'clipi-pi-mainnet-video-renditions',algorithms:['RS256'],requiredClaims:['exp','iat'],maxTokenAge:600});
    return isRenditionJob(payload);
  }catch{return false;}
}

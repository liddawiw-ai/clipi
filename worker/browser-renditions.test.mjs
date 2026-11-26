import test from 'node:test';
import assert from 'node:assert/strict';
import {isRenditionJob,verifyRenditionJob} from '../pi-web/verify-video-job.mjs';
test('only the designated production job can import browser renditions',async()=>{
  const repo='liddawiw-ai/clipi',ref='refs/heads/work/clipi-testnet-gifts';
  const claims={repository_id:'1456852157',repository_owner_id:'356305926',repository:repo,ref,
    sub:'repo:'+repo+':ref:'+ref,event_name:'push',workflow_ref:repo+'/.github/workflows/pi-video-compat.yml@'+ref};
  assert.equal(isRenditionJob(claims),true);
  for(const [field,value] of Object.entries({repository_id:'other',ref:'refs/heads/main',event_name:'pull_request',workflow_ref:'another workflow',sub:'other'}))
    assert.equal(isRenditionJob({...claims,[field]:value}),false);
  assert.equal(await verifyRenditionJob(new Request('https://clipi.test/internal/browser-renditions')),false);
});

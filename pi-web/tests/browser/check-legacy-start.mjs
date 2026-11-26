import assert from 'node:assert/strict';

export async function checkLegacyStart(browser,origin,mode='missing'){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  try{
    await page.addInitScript(mode=>{
      window.userInputs=0;
      document.addEventListener('pointerdown',()=>window.userInputs++,true);
      if(mode==='missing')Object.defineProperty(window,'VideoDecoder',{configurable:true,value:undefined});
      else if(window.VideoDecoder)window.VideoDecoder.isConfigSupported=async()=>({supported:false});
      Object.defineProperty(HTMLMediaElement.prototype,'autoplay',{get(){return false;},set(){}});
      const play=HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play=function(){
        if(window.userInputs&&navigator.userActivation?.isActive)return play.call(this);
        return Promise.reject(new DOMException('Needs a gesture','NotAllowedError'));
      };
    },mode);
    await page.goto(origin+'/?lang=ar&role=user&pair=1');
    const canvas=page.locator('.clipi-feed-stage canvas').first();
    const pixels=()=>canvas.evaluate(c=>{
      const copy=document.createElement('canvas');copy.width=40;copy.height=32;
      copy.getContext('2d').drawImage(c,0,0,40,32);return copy.toDataURL();
    });
    await canvas.waitFor({timeout:9000});
    const before=await pixels();
    await page.waitForFunction(before=>{
      const current=document.querySelector('.clipi-feed-stage canvas');
      if(!current)return false;
      const copy=document.createElement('canvas');copy.width=40;copy.height=32;
      copy.getContext('2d').drawImage(current,0,0,40,32);return copy.toDataURL()!==before;
    },before,{timeout:5000});
    assert.equal(await page.evaluate(()=>window.userInputs),0);
    if(mode==='missing'){
      const original=await canvas.elementHandle();
      await page.locator('video').nth(1).evaluate(v=>v.scrollIntoView());
      await page.waitForFunction(old=>{
        const next=document.querySelectorAll('video')[1];
        return !old.isConnected&&next?.parentElement.querySelector('canvas')&&document.querySelectorAll('.clipi-feed-stage canvas').length===1;
      },original);
      assert.ok(await page.locator('video').first().evaluate(v=>v.paused&&v.muted));
      await page.locator('video').first().evaluate(v=>v.scrollIntoView());
      await page.waitForFunction(()=>document.querySelector('video')?.parentElement.querySelector('canvas'));
      assert.equal(await page.evaluate(()=>window.userInputs),0);
    }
    const control=page.getByTestId('short-video-playback').first();
    assert.equal(await control.getAttribute('aria-label'),'إيقاف الفيديو مؤقتًا');
    await control.tap();
    await canvas.waitFor({state:'detached'});
    assert.equal(await control.getAttribute('aria-label'),'استئناف الفيديو');
    const first=page.locator('video').first();
    const t=await first.evaluate(v=>v.currentTime);
    await page.waitForTimeout(300);
    assert.ok(await first.evaluate((v,t)=>v.paused&&v.muted&&Math.abs(v.currentTime-t)<0.02,t));
    await control.tap();
    await page.waitForFunction(()=>!document.querySelector('video').paused);
    console.log('PASS first clip shows changing frames with zero taps when decoder is '+mode+', tap pauses and resumes');
  }finally{await page.close();}
}

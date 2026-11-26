import assert from 'node:assert/strict';

export async function checkFirstStart(browser,origin){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await page.addInitScript(()=>{
    const play=HTMLMediaElement.prototype.play;
    window.inputs=0;for(const name of ['pointerdown','keydown'])document.addEventListener(name,()=>window.inputs++,true);
    Object.defineProperty(HTMLMediaElement.prototype,'autoplay',{get(){return false;},set(){}});
    HTMLMediaElement.prototype.play=function(){
      // A mobile WebView can reject a muted start before inline media becomes visible/ready.
      if(!window.earlyDenials||!this.muted||!this.hasAttribute('muted')||!this.hasAttribute('playsinline')||this.readyState<2){
        window.earlyDenials=(window.earlyDenials||0)+1;
        return Promise.reject(new DOMException('not yet available inline','NotAllowedError'));
      }
      return play.call(this);
    };
    window.firstFrames={};
    document.addEventListener('playing',event=>{
      const video=event.target;
      if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(()=>{
        window.firstFrames[new URL(video.currentSrc).pathname.split('/').pop()]??=performance.now();
      });
    },true);
  });
  try{
    await page.goto(origin+'/?lang=ar&role=user&pair=1',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.firstFrames.fixture&&document.querySelector('video').currentTime>.1,null,{timeout:8000});
    assert.ok(await page.evaluate(()=>window.earlyDenials>0&&window.inputs===0));
    const cdp=await page.context().newCDPSession(page);
    await page.evaluate(()=>{window.swipeAt=performance.now();});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:680}]});
    for(const y of [610,510,410,290,180])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:130,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>window.firstFrames.two&&document.querySelector('video').paused,null,{timeout:8000});
    const times=await page.evaluate(()=>({first:Math.round(window.firstFrames.fixture),second:Math.round(window.firstFrames.two-window.swipeAt)}));
    console.log('PASS fresh visit, muted inline first frame without interaction, then second on swipe (ms):',times);
  }finally{await page.close();}
}

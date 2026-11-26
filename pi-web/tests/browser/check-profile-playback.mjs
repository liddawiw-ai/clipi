import assert from 'node:assert/strict';

export async function checkProfilePlayback(browser, origin) {
  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
    const client = await page.context().newCDPSession(page);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const media = id => page.locator('.clipi-feed-stage video[src$="/'+id+'"]');
    async function moving(id) {
      await page.waitForFunction(id => {
        const videos = [...document.querySelectorAll('.clipi-feed-stage video')];
        const v = videos.find(x => x.src.endsWith('/'+id));
        if (!v || v.paused || v.readyState < 2 || !v.getVideoPlaybackQuality().totalVideoFrames) return false;
        const rect = v.getBoundingClientRect();
        return rect.top < innerHeight/2 && rect.bottom > innerHeight/2 && videos.filter(x=>!x.paused).length===1;
      }, id, {timeout:8000});
    }
    async function swipe(down=false) {
      const y = down ? 210 : 630, step = down ? 49 : -49;
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:125,y}]});
      for(let i=1;i<=9;i++){
        await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:125,y:y+i*step}]});
        await new Promise(resolve=>setTimeout(resolve,30));
      }
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }
    await page.goto(origin+'/?lang=en&role=user&profile=1');
    const tiles = page.locator('.clipi-profile-tile');
    const firstPreview = await tiles.nth(0).locator('video').elementHandle();
    const thirdPreview = await tiles.nth(2).locator('video').elementHandle();
    await tiles.nth(0).tap();
    await moving('one');
    await page.locator('.clipi-audio').click();
    await page.waitForFunction(v=>!v.paused&&!v.muted,firstPreview);
    assert.ok(await firstPreview.evaluate(v=>v.isConnected && !!v.closest('.clipi-feed-stage')));
    // A rapid second swipe must reuse the third tile, even before the first swipe.
    assert.ok(await thirdPreview.evaluate(v=>v.isConnected && !!v.closest('.clipi-feed-stage') && v.preload==='auto' && v.paused));
    const next = await media('two').elementHandle();
    await page.waitForFunction(v=>v && v.readyState>=2 && v.paused,next);
    await swipe();
    await moving('two');
    assert.equal(await next.evaluate(v=>v.isConnected && !v.paused && !v.muted),true);
    assert.ok(await firstPreview.evaluate(v=>v.paused&&v.muted));
    await firstPreview.evaluate(v=>v.dispatchEvent(new Event('canplay')));
    assert.ok(await firstPreview.evaluate(v=>v.paused&&v.muted));
    // Wait for the native snap to finish: a touch during momentum stops scrolling.
    await page.waitForFunction(v=>Math.abs(v.getBoundingClientRect().top)<3,next);
    await page.waitForTimeout(150);
    await page.touchscreen.tap(90,260);
    await page.waitForFunction(v=>v.paused,next);
    await page.touchscreen.tap(90,260);
    await moving('two');
    await swipe();
    await moving('three');
    assert.ok(await thirdPreview.evaluate(v=>!v.paused && !v.muted && v.isConnected));
    assert.ok(await next.evaluate(v=>v.paused&&v.muted));
    await swipe(true);
    await moving('two');
    await page.getByRole('button',{name:'Back',exact:true}).tap();
    await page.locator('.clipi-feed-stage').waitFor({state:'detached'});
    assert.equal(await page.locator('video').evaluateAll(videos=>videos.some(v=>!v.paused)),false);
    await tiles.nth(1).tap();
    await moving('two');
    await swipe(true);
    await moving('one');
    assert.deepEqual(errors,[]);
    console.log('PASS visitor opens any of three profile clips, swipes both ways into autoplay, single tap pauses/resumes, next player is reused, and close stops playback');
  } finally {
    await page.close();
  }
}

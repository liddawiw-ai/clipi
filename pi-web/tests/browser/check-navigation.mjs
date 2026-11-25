import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

export async function checkNavigation(browser) {
  const out = await build({
    entryPoints: [new URL('../../main.jsx', import.meta.url).pathname],
    bundle: true,
    minify: true,
    write: false,
    outfile: 'clipi-app.js',
    loader: {
      '.js': 'jsx',
      '.mp3': 'dataurl',
      '.jpg': 'dataurl',
      '.gif': 'dataurl',
      '.png': 'dataurl'
    },
    alias: { 'react-native': 'react-native-web' },
    define: {
      global: 'globalThis',
      __DEV__: 'false',
      'process.env.NODE_ENV': '"production"'
    },
    plugins: [
      {
        name: 'test-session',
        setup(b) {
          b.onResolve({ filter: /^\.\/services$/ }, () => ({
            path: new URL('session-fixture.js', import.meta.url).pathname
          }));
        }
      }
    ]
  });
  const bundle = new Map(
    out.outputFiles.map((f) => ['/' + path.basename(f.path), f.contents])
  );
  for (const [width, height, lang] of [
    [390, 844, 'ar'],
    [360, 640, 'en'],
    [844, 390, 'ar']
  ]) {
    const p = await browser.newPage({
      viewport: { width, height },
      isMobile: true,
      userAgent: lang==='en'?'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15':'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36',
      hasTouch: true
    });
    p.setDefaultTimeout(12000);
    await p.addInitScript(
      (l) => { if (!localStorage.getItem('clipi.language.v2')) localStorage.setItem('clipi.language.v2', l); },
      lang
    );
    const errors = [];
    p.on('pageerror', (e) => {
      errors.push(e.message);
    });
    await p.route('**/*', async (route) => {
      const url = new URL(route.request().url()),
        name = url.pathname;
      const send = (contentType, body) => route.fulfill({ contentType, body });
      if (url.hostname !== 'clipi.local' && url.hostname !== 'clipi-mainnet.liddawiw.workers.dev') return route.abort();
      if (name === '/room')
        return send(
          'text/html',
          readFileSync(new URL('../../index.html', import.meta.url))
        );
      if (bundle.has(name))
        return send(
          name.endsWith('.js') ? 'application/javascript' : 'text/css',
          Buffer.from(bundle.get(name))
        );
      if(name==='/shorts/media/fixture')return send('video/mp4',readFileSync(new URL('./feed-fixture.mp4',import.meta.url)));
      if(name.startsWith('/room-covers/'))return send('image/jpeg',readFileSync(new URL('../../assets/shorts/palace.jpg',import.meta.url)));
      const op = route.request().postDataJSON()?.op;
      const fixtures = {
        shortList: { clips: [{id:'fixture',title:'Navigation fixture'}] },
        shortState: { social: true, likes: 0, commentCount: 0 },
        shortProfileList: { clips: [], nextCursor: null },
        roomInviteInbox: { invites: [] },
        read: { number: '1234567' },
        wallet: { diamonds: 0, history: [] },
        shortSocialStats: {},
        shortIdentity: {}
      };
      return route.fulfill({
        json: name === '/active-rooms' ? { rooms: ['cover-video','cover-audio'],tags:Object.fromEntries(['audio','video'].map(type=>['cover-'+type,{cover:'6f6e492b-b5ee-4db2-b76d-1d78e7e238d8'}])) } : (fixtures[op] ?? {})
      });
    });
    await p.goto('https://clipi.local/room');
    const root = p.locator('[data-clipi-page]'),
      dock = p.locator('.clipi-dock'),
      home = () => dock.getByRole('tab').nth(0).click();
    const pageFull = async (name) => {
      await p.locator('[data-clipi-page="' + name + '"]').waitFor();
      for (const element of [root, root.locator(':scope > :first-child')]) {
        const box = await element.boundingBox();
        assert.ok(
          box &&
            box.x === 0 &&
            box.y === 0 &&
            Math.abs(box.width - width) < 1 &&
            Math.abs(box.height - height) < 1,
          JSON.stringify({ name, box, width, height })
        );
      }
      if (name !== 'home') {
        assert.equal(
          await p.locator('.clipi-feed-shell,.clipi-video-settings').count(),
          0
        );
      }
    };
    await pageFull('home');
    const accountButton=p.getByRole('link',{name:lang==='en'?'Open your account on your device':'افتح حسابك على جهازك',exact:true});
    const launchHref=await accountButton.getAttribute('href');
    if(lang==='en')assert.equal(launchHref,'clipi://account');
    else{
      assert.ok(launchHref.startsWith('intent://account/#Intent;scheme=clipi;package=com.walid.clipi;'));
      assert.ok(decodeURIComponent(launchHref).includes('https://clipi.local/device-install/android;end'));
    }
    const liveButton=p.locator('.clipi-feed-live');
    const [accountBox,liveBox,stageBox]=await Promise.all([accountButton,liveButton,p.locator('.clipi-feed-stage')].map(el=>el.boundingBox()));
    assert.ok(accountBox.x>=stageBox.x && accountBox.x+accountBox.width<=liveBox.x+0.5);
    assert.ok(Math.abs(stageBox.x+stageBox.width-liveBox.x-liveBox.width)<=12);
    for(const button of [accountButton,liveButton])assert.equal(await button.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');

    await p.locator('.action-more').click();
    await p.waitForFunction(() => {
      const v = document.querySelector('video');
      return v && !v.paused && v.currentTime > 0.12;
    });
    const sheet = p.locator('.clipi-video-settings .clipi-feed-sheet'),
      b = await sheet.boundingBox();
    assert.ok(
      b.y >= height * 0.52 - 1 &&
        b.height <= height * 0.48 + 1 &&
        b.y + b.height >= height - 1
    );
    const v = await p.locator('video').first().elementHandle(),
      frames = await v.evaluate(
        (e) => e.getVideoPlaybackQuality().totalVideoFrames
      );
    await p.waitForFunction(
      ({ v, frames }) =>
        v === document.querySelector('video') &&
        !v.paused &&
        v.getVideoPlaybackQuality().totalVideoFrames > frames,
      { v, frames }
    );
    await sheet.locator('header button').click();
    for (const [i, name] of [
      [4, 'profile'],
      [3, 'store'],
      [1, 'rooms'],
      [2, 'uploadShort']
    ]) {
      await dock.getByRole('tab').nth(i).click();
      await pageFull(name);
      if(name==='rooms'){
        for(const type of ['audio','video']){
          await p.getByText('Cover fixture '+type,{exact:true}).waitFor();
          await p.waitForFunction(id=>Array.from(document.querySelectorAll('img')).some(img=>img.src.includes('/room-covers/'+id+'/')&&img.complete&&img.naturalWidth>0),'cover-'+type);
        }
      }
      if (name === 'uploadShort') {
        assert.equal(await p.locator('video').count(), 0);
        await p
          .getByRole('button', {
            name: lang === 'ar' ? 'رجوع' : 'Back',
            exact: true
          })
          .click();
      } else await home();
    }
    for (const i of [0, 1]) {
      await p.locator('.clipi-feed-live').click();
      await pageFull('liveOptions');
      const options = root.getByRole('button');
      assert.equal(await options.count(), 3);
      await options.nth(i + 1).click();
      await pageFull('rooms');
      const roomTabs = root.getByRole('tablist').first().getByRole('tab');
      assert.equal(
        await roomTabs.nth(i + 1).getAttribute('aria-selected'),
        'true'
      );
      await home();
    }
    await p.locator('.clipi-feed-live').click();
    await root.getByRole('button').first().click();
    await pageFull('home');
    await checkLoginLanguages(p, lang);
    assert.deepEqual(errors, []);
    console.log(
      'PASS',
      width,
      height,
      lang,
      'settings',
      b.height,
      'advancing frames, all tabs, live audio + video and back'
    );
    await p.close();
  }
}

async function checkLoginLanguages(page, initialLanguage) {
  await page.goto('https://clipi.local/room?signedOut=1');
  const trigger = page.locator('.clipi-language-trigger');
  const sheet = page.getByRole('dialog'), wheel = sheet.locator('.clipi-language-wheel');
  if (initialLanguage !== 'ar') {
    await trigger.click();
    await sheet.getByRole('button', {name:'العربية', exact:true}).click();
  }
  await trigger.scrollIntoViewIfNeeded();
  const before = await trigger.boundingBox();
  await trigger.click();
  await sheet.waitFor();
  await page.waitForFunction(() => !document.querySelector('dialog').getAnimations().some(a => a.playState === 'running'));
  const bounds = await sheet.boundingBox(), field = await trigger.boundingBox();
  assert.ok(bounds.y >= 0 && Math.abs(bounds.y + bounds.height - field.y) < 2,
    JSON.stringify({ message:'The wheel must end at the top of the language field', bounds, field }));
  assert.ok(bounds.width < field.width && Math.abs(bounds.x + bounds.width/2 - field.x - field.width/2) < 2);
  if (before.y > 240) assert.ok(Math.abs(before.y-field.y) < 2, 'Opening the picker moved the language field');
  assert.equal(await sheet.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(255, 255, 255, 0.9)');
  const chosen = await wheel.locator('[aria-pressed="true"]').boundingBox();
  const area = await wheel.boundingBox();
  assert.ok(Math.abs(chosen.y + chosen.height/2 - area.y - area.height/2) < 2);
  if (page.viewportSize().height >= 600) assert.ok(area.height >= chosen.height*5 - 1, 'Expected a tall wheel');
  const box = await wheel.boundingBox();
  const touch = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2, start = box.y + box.height / 4;
  await touch.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x, y:start}]});
  for (let i=1; i<=5; i++) {
    await touch.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x, y:start+13*i}]});
    await page.waitForTimeout(30);
  }
  await touch.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
  await touch.detach();
  await page.waitForFunction(() => document.querySelector('.clipi-language-wheel').scrollTop < 1);
  await sheet.getByRole('button', {name:'حفظ',exact:true}).click();
  const english = page.getByRole('button', {name:/Change language/});
  await english.waitFor();
  await page.reload();
  await english.click();
  await sheet.getByRole('button', {name:'العربية',exact:true}).click();
  await page.getByRole('button', {name:/تغيير اللغة/}).waitFor();
  await trigger.click();
  await page.keyboard.press('Escape');
  await sheet.waitFor({state:'hidden'});
  assert.equal(await page.evaluate(() => localStorage.getItem('clipi.language.v2')), 'ar');
  console.log('PASS narrow translucent wheel above the Pi language field, centred choice, touch, save, reload and cancel');
}

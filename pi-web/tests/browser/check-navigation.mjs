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
    const isOwner = width === 390;
    let giftDiamonds=0, approved=false, completed=false, sentGifts=0;
    if(isOwner)await p.addInitScript(()=>{
      window.Pi={
        authenticate:async()=>({user:{uid:'funding-fixture'},accessToken:'fixture'}),
        createPayment:async(pack,callbacks)=>{
          if(pack.amount!==1||pack.metadata.kind!=='diamond_pack'||pack.metadata.diamonds!==1000)throw Error('Unexpected pack');
          await callbacks.onReadyForServerApproval('fixture-receipt');
          await callbacks.onReadyForServerCompletion('fixture-receipt','a'.repeat(64));
        }
      };
    });
    let assigned = false,hidden=false;
    const played=new Set(),finished=new Set();
    let releaseRandom;
    let randomRequests = 0;
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
      if(['/shorts/media/fixture','/shorts/media/random-fixture','/shorts/media/second','/shorts/media/third'].includes(name))return send('video/mp4',readFileSync(new URL('./feed-fixture.mp4',import.meta.url)));
      if(name.startsWith('/room-covers/'))return send('image/jpeg',readFileSync(new URL('../../assets/shorts/palace.jpg',import.meta.url)));
      if(name.startsWith('/pi-gifts/')&&isOwner){
        const data=route.request().postDataJSON();
        assert.equal(data.kind,'diamond_pack');assert.equal(data.paymentId,'fixture-receipt');
        if(name.endsWith('/approve'))approved=true;
        else if(name.endsWith('/complete')){assert.ok(approved);completed=true;giftDiamonds=1000;}
        else throw Error('Unexpected checkout operation');
        return route.fulfill({json:{ok:true}});
      }
      const op = route.request().postDataJSON()?.op;
      if (op === 'lookupAppAdmin' || op === 'setAppAdmin') {
        const body = route.request().postDataJSON();
        assert.ok(isOwner);
        assert.equal(body.number, '7654321');
        if (op === 'setAppAdmin') {
          assert.equal(body.targetUid, 'target-fixture');
          assigned = body.enabled;
        }
        return route.fulfill({json:{uid:'target-fixture',number:body.number,name:'Fixture user',admin:assigned,owner:false}});
      }
      const body=route.request().postDataJSON()||{};
      if(op==='shortGift'){
        assert.ok(completed&&giftDiamonds>=10);assert.equal(body.gift,'وردة حمراء');
        sentGifts++;giftDiamonds-=10;return route.fulfill({json:{sent:true}});
      }
      if(op==='shortWatch'){
        played.add(body.clip);if(body.finished)finished.add(body.clip);
        return route.fulfill({json:{ok:true}});
      }
      if(op==='shortSearch')return route.fulfill({json:{items:body.kind==='accounts'?[{uid:'guest-fixture',name:'Guest writer',number:'2222222'}]:[{id:'second',title:'Second clip'}],next:null}});
      if(op==='shortHistory')return route.fulfill({json:{items:[{id:'fixture',title:'Navigation fixture'}],next:null}});
      if(op==='shortHide'){hidden=true;return route.fulfill({json:{ok:true}});}
      if(op==='shortInsights')return route.fulfill({json:{views:4,viewers:3,completed:2}});
      if(op==='adminDecisionLog')return route.fulfill({json:{items:[{cursor:1,kind:'approved',actorName:'Walid',targetName:'Host',subject:'Test agency',stamp:1234567890000}],next:null}});
      if (op === 'shortRandom') {
        randomRequests++;
        assert.equal(route.request().postDataJSON().exclude, 'fixture');
        await new Promise(resolve=>{releaseRandom=resolve;});
        return route.fulfill({json:{clip:{id:'random-fixture',title:'Random fixture'}}});
      }
      const commentReplies=route.request().postDataJSON()?.parent!=null;
      const fixtures = {
        shortComments:{social:true,comments:commentReplies
          ?[{id:2,name:'Reply writer',uid:'layout-fixture',body:'reply'}]
          :[{id:1,name:'Guest writer',uid:'guest-fixture',body:'comment',replyCount:1}]},

        shortList: { clips: [...hidden?[]:[{id:'fixture',title:'Navigation fixture'}],{id:'second',title:'Second clip',canDelete:true},{id:'third',title:'Third clip'}] },
        shortState: { social: true, canDelete:body.clip==='second', likes: 0, commentCount: 0 },
        shortProfileList: { clips: [], nextCursor: null },
        roomInviteInbox: { invites: [] },
        read: { number: '1234567', owned:['1234567'], offers:[{number:'777',cost:100000}], canManageAppAdmins: isOwner },
        trialRead: {sandbox:0,owner:null},
        wallet: { diamonds: giftDiamonds, history: [], linkedPiUid:'pi:funding-fixture' },
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
      if (name === 'profile') {
        const entry = p.getByText(lang === 'ar' ? 'تعيين أدمن للتطبيق' : 'Assign an app admin', {exact:true});
        if (isOwner) {
          await entry.click();
          await pageFull('appAdmins');
          await p.getByRole('textbox', {name:'رقم حساب كليبي'}).fill('٧٦٥٤٣٢١');
          await p.getByRole('button', {name:'بحث عن الحساب'}).click();
          await p.getByText('Fixture user · 7654321', {exact:true}).waitFor();
          await p.getByRole('button', {name:'تأكيد تعيين أدمن للتطبيق'}).click();
          await p.getByText('تم تعيين أدمن التطبيق', {exact:true}).waitFor();
          await p.getByRole('button', {name:'سحب صلاحية أدمن التطبيق'}).click();
          await p.getByText('تم سحب صلاحية أدمن التطبيق', {exact:true}).waitFor();
        } else {
          await p.getByText('1234567', {exact:false}).first().waitFor();
          assert.equal(await entry.count(), 0);
        }
      }
      if(name==='store'&&isOwner){
        await p.getByRole('tab',{name:'أرقام مميزة'}).click();
        assert.equal(await p.getByText('777',{exact:true}).count(),0);
        await p.getByText('1234567',{exact:true}).waitFor();
        assert.equal(await p.getByRole('button',{name:'شراء',exact:true}).count(),0);
      }
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
    if (isOwner) {
      const client=await p.context().newCDPSession(p);
      await p.getByText('Navigation fixture',{exact:true}).waitFor();
      const first=await p.locator('.clipi-feed-stage video').first().elementHandle();
      await p.locator('.clipi-audio').click();
      await p.waitForFunction(v=>!v.paused&&!v.muted,first);
      for(const id of ['second','third']){
        await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:630}]});
        for(let i=1;i<=9;i++){
          await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:130,y:630-49*i}]});
          await new Promise(resolve=>setTimeout(resolve,30));
        }
        await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await p.waitForFunction(id=>{
          const videos=[...document.querySelectorAll('.clipi-feed-stage video')];
          const audible=videos.filter(v=>!v.muted&&!v.paused);
          return audible.length===1&&audible[0].src.endsWith('/'+id)&&Math.abs(audible[0].getBoundingClientRect().top)<3;
        },id);
        assert.ok(await first.evaluate(v=>v.paused&&v.muted));
        await p.waitForTimeout(150);
      }
      const third=await p.locator('video[src$="/third"]').elementHandle();
      await dock.getByRole('tab').nth(4).click();
      await pageFull('profile');
      assert.ok(await third.evaluate(v=>v.paused&&v.muted));
      assert.ok(await first.evaluate(v=>v.paused&&v.muted));
      await first.evaluate(v=>v.dispatchEvent(new Event('canplay')));
      assert.ok(await first.evaluate(v=>v.paused&&v.muted));
      await home();
      await p.getByText('Navigation fixture',{exact:true}).waitFor();
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:185}]});
      for (const y of [205,240,285,335]) await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:130,y}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await p.getByText('جارٍ تحميل الفيديوهات…',{exact:true}).waitFor();
      assert.equal(randomRequests,1);
      releaseRandom();
      await p.getByText('Random fixture',{exact:true}).waitFor();
      await p.waitForFunction(()=>[...document.querySelectorAll('.clipi-feed-stage video')].filter(v=>!v.paused).length===1&&
        [...document.querySelectorAll('.clipi-feed-stage video')].some(v=>v.src.endsWith('/random-fixture')&&!v.paused&&v.currentTime>0.1));
      await p.locator('.action-comment').click();
      await p.getByRole('button',{name:'فتح حساب Guest writer',exact:true}).first().click();
      await pageFull('shortAuthor');
      await p.getByText('Guest writer',{exact:true}).first().waitFor();
      await home();
      await p.locator('.action-comment').click();
      await p.getByRole('button',{name:'عرض الردود',exact:true}).click();
      await p.getByRole('button',{name:'فتح حساب Reply writer',exact:true}).last().click();
      await pageFull('profile');
      await home();
    }
    if(isOwner){
      const button=label=>p.getByRole('button',{name:label,exact:true});
      await home();
      await p.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.currentTime>0.2;});
      for(let i=0;i<65&&!finished.has('fixture');i++)await p.waitForTimeout(150);
      assert.ok(played.has('fixture')&&finished.has('fixture'),'the foreground clip records a real view and completion');
      const openRose=async()=>{
        await p.locator('.action-more').click();
        await button('إهداء الفيديو').click();
        await p.getByRole('button',{name:/وردة حمراء/}).click();
      };
      await openRose();
      assert.ok(!(await button('إرسال').isEnabled()));
      await button('شحن بعملة Pi').click();
      await pageFull('wallet');await p.getByText('شراء الماس بعملة Pi',{exact:true}).waitFor();
      assert.equal(await p.getByText('بطاقة تجريبية',{exact:true}).count(),0);
      await p.getByRole('button',{name:/💎 · 1 PI$/}).click();
      await p.getByText('تم شحن الماس',{exact:true}).waitFor();assert.ok(completed);
      await home();await openRose();await button('إرسال').click();
      await p.getByText('تم إرسال الهدية',{exact:true}).waitFor();
      assert.equal(sentGifts,1);assert.equal(giftDiamonds,990);
      await button('بحث في كليبي').click();await pageFull('clipiSearch');
      const field=p.getByRole('textbox');
      await field.fill('2222222');await p.getByText('Guest writer',{exact:true}).first().click();await pageFull('shortAuthor');
      await button('رجوع').click();await pageFull('clipiSearch');
      await button('غرف').click();await field.fill('Cover fixture');await p.getByText('Cover fixture audio',{exact:true}).waitFor();
      await button('فيديوهات').click();await field.fill('Second');await p.getByText('Second clip',{exact:true}).click();await pageFull('home');
      await p.locator('.action-more').click();await button('إحصاءات الفيديو').click();
      await p.getByText('مشاهدون أكملوا الفيديو · 2',{exact:true}).waitFor();await button('إغلاق').click();
      await dock.getByRole('tab').nth(4).click();await button('سجل قرارات الإدارة').click();
      await p.getByText('قبول طلب وكالة',{exact:true}).waitFor();await p.getByText(/Test agency/).waitFor();await button('رجوع').click();
      await button('سجل المشاهدة').click();await p.getByText('Navigation fixture',{exact:true}).click();await pageFull('home');
      await p.locator('.action-more').click();await button('غير مهتم').click();await p.getByText('تم إخفاء الفيديو من الرئيسية',{exact:true}).waitFor();
      assert.ok(hidden);await p.waitForFunction(()=>![...document.querySelectorAll('.clipi-feed-stage video')].some(v=>v.src.endsWith('/fixture')));
    }
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

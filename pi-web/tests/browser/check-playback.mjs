import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {checkNavigation} from './check-navigation.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const entry=new URL('short-feed.jsx',import.meta.url).pathname;
const output=await build({entryPoints:[entry],bundle:true,write:false,minify:true,outfile:'feed.js',
  alias:{'react-native':'react-native-web'},loader:{'.js':'jsx','.png':'dataurl','.jpg':'dataurl','.gif':'dataurl','.mp3':'dataurl'},
  define:{global:'globalThis',__DEV__:'false','process.env.NODE_ENV':'"production"'}});
const video=await readFile(new URL('../../assets/shorts/palace.mp4',import.meta.url));
const files=new Map(output.outputFiles.map(file=>['/'+file.path.split('/').pop(),file.contents]));
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/shorts/media/fixture'){
    const offset=Number(/^bytes=(\d+)-/.exec(req.headers.range||'')?.[1]||0);
    res.writeHead(req.headers.range?206:200,{'Content-Type':'video/mp4','Accept-Ranges':'bytes',
      ...(req.headers.range?{'Content-Range':`bytes ${offset}-${video.length-1}/${video.length}`}:{})});
    res.end(video.subarray(offset));return;
  }
  if(files.has(url.pathname)){
    res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css':'application/javascript');
    res.end(files.get(url.pathname));return;
  }
  if(url.pathname!=='/'){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/feed.css"><style>html,body,#app{margin:0;height:100%;display:flex;flex-direction:column}</style><div id="app"></div><script src="/feed.js"></script>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
  for(const locale of ['ar','en'])for(const role of ['host','admin','user']){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const en=locale==='en',errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const button=name=>page.getByRole('button',{name,exact:true});
    await page.goto(`http://127.0.0.1:${server.address().port}/?lang=${locale}&role=${role}`);
    await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0.1);
    const original=await page.locator('video').first().elementHandle();
    await button(en?'More':'المزيد').click();
    const sheet=page.locator('.clipi-video-settings .clipi-feed-sheet');
    await sheet.waitFor();
    assert.equal(await sheet.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
    const bounds=await sheet.boundingBox();
    assert.ok(bounds.y>422&&bounds.height>0&&bounds.height<=844*.48+1);
    assert.equal(await button(en?'Delete video':'حذف الفيديو').count(),Number(role==='host'));
    assert.equal(await button(en?'Copy video link':'نسخ رابط الفيديو').count(),1);
    const before=await original.evaluate(v=>[v.currentTime,v.totalVideoFrames||v.getVideoPlaybackQuality().totalVideoFrames]);
    await page.waitForFunction(({v,time,frames})=>v===document.querySelector('video')&&!v.paused&&v.currentTime!==time&&v.getVideoPlaybackQuality().totalVideoFrames>frames,
      {v:original,time:before[0],frames:before[1]});
    await button(en?'Close':'إغلاق').click();
    await button(en?'Comments':'التعليقات').first().click();
    await page.getByText('مشاركة',{exact:true}).first().waitFor();
    assert.ok(await page.getByText('حفظ',{exact:true}).count()>=1);
    assert.deepEqual(errors,[]);await page.close();console.log('PASS',locale,role,'partial white sheet, decoded video frames and unchanged user text');
  }
  await checkNavigation(browser);
}finally{await browser.close();server.close();}

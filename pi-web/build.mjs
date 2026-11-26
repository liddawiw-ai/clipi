import {buildFramePlayer} from './build-frame-player.mjs';
import {build} from 'esbuild';
import {copyFile} from 'node:fs/promises';
await build({entryPoints:['main.jsx'],bundle:true,minify:true,outfile:'dist/clipi-app.js',loader:{'.js':'jsx','.mp3':'dataurl','.jpg':'dataurl','.png':'dataurl','.gif':'dataurl'},alias:{'react-native':'react-native-web'},define:{CLIPI_WEB_APP_ID:JSON.stringify(process.env.CLIPI_WEB_APP_ID||''),CLIPI_WEB_APPCHECK_KEY:JSON.stringify(process.env.CLIPI_WEB_APPCHECK_KEY||''),global:'globalThis',__DEV__:'false','process.env.NODE_ENV':'"production"'}});
await build({entryPoints:['policy-links.mjs'],bundle:true,minify:true,outfile:'dist/clipi-policy-links.js'});
await copyFile('index.html','dist/index.html');

for (const page of ['privacy','terms','external-checkout']) await copyFile(page+'.html','dist/'+page+'.html');

const {readFile,mkdir,writeFile}=await import('node:fs/promises');
const themes=JSON.parse(await readFile('theme-images.json','utf8'));
await mkdir('dist/themes',{recursive:true});
for(const [key,data] of Object.entries(themes))await writeFile('dist/themes/'+key+'.jpg',Buffer.from(data,'base64'));

await buildFramePlayer('dist');

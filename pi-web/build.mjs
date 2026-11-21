import {build} from 'esbuild';
import {copyFile} from 'node:fs/promises';
await build({entryPoints:['main.jsx'],bundle:true,minify:true,outfile:'dist/clipi-app.js',loader:{'.js':'jsx'},alias:{'react-native':'react-native-web'},define:{__DEV__:'false','process.env.NODE_ENV':'"production"'}});
await copyFile('index.html','dist/index.html');

for (const page of ['privacy','terms']) await copyFile(page+'.html','dist/'+page+'.html');

const {readFile,mkdir,writeFile}=await import('node:fs/promises');
const themes=JSON.parse(await readFile('theme-images.json','utf8'));
await mkdir('dist/themes',{recursive:true});
for(const [key,data] of Object.entries(themes))await writeFile('dist/themes/'+key+'.jpg',Buffer.from(data,'base64'));

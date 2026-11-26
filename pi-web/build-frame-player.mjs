import {build} from 'esbuild';
import {copyFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export async function buildFramePlayer(root){
  const output=path.join(root,'clipi-frames-v1');
  const dependency=path.dirname(createRequire(import.meta.url).resolve('@wasmpeg/cpu/package.json'));
  await mkdir(output,{recursive:true});
  await Promise.all([
    ...['src/js/gpu.js','dist/cpu.js','dist/cpu.wasm','LICENSE','NOTICE'].map(src=>copyFile(path.join(dependency,src),path.join(output,path.basename(src)))),
    build({entryPoints:[fileURLToPath(new URL('./ShortFrameWorker.mjs',import.meta.url))],outfile:path.join(output,'player.js'),format:'esm',bundle:true,minify:true})
  ]);
}

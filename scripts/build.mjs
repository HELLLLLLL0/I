import './prepare-assets.mjs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
await rm(dist, {recursive:true,force:true});
await mkdir(dist, {recursive:true});
for (const name of ['index.html','app.js','style.css','games.json','favicon.ico','games']) {
  await cp(resolve(root,name),resolve(dist,name),{recursive:true,filter: source => !basename(source).startsWith('.') && !/(?:\.zip|\.part\d+|\.DS_Store)$/.test(source)});
}
console.log('Static website built in dist/');

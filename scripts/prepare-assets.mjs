// Download pinned, hash-verified build inputs. No credentials or paid hosting.
import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await readFile(new URL('./assets.json',import.meta.url),'utf8'));
const hash=data=>createHash('sha256').update(data).digest('hex');
async function prepare(entry){
 const target=resolve(root,entry.path);
 if(!entry.transform){try{if(hash(await readFile(target))===entry.sha256)return;}catch{}}
 // Transformed files have separate verified output digests below.
 if(entry.outputSha256){try{
   if(hash(await readFile(target))===entry.outputSha256 && (!entry.extraPath || hash(await readFile(resolve(root,entry.extraPath)))===entry.extraSha256))return;
 }catch{}}
 let data;
 for(let attempt=0;attempt<3;attempt++){
  try{const response=await fetch(entry.url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('HTTP '+response.status);data=Buffer.from(await response.arrayBuffer());if(hash(data)!==entry.sha256)throw Error('SHA-256 mismatch');break;}
  catch(error){if(attempt===2)throw Error(entry.path+': '+error.message);await new Promise(r=>setTimeout(r,1000));}
 }
 await mkdir(dirname(target),{recursive:true});
 if(entry.transform==='unzip'){
  if(data.readUInt32LE(0)!==0x04034b50)throw Error('Invalid ZIP');
  const start=30+data.readUInt16LE(26)+data.readUInt16LE(28);
  const method=data.readUInt16LE(8);
  // Only the first named WASM entry is used; validate its complete output hash.
  const content=method===8?inflateRawSync(data.subarray(start)):data.subarray(start,start+data.readUInt32LE(18));
  if(hash(content)!==entry.outputSha256)throw Error('Extracted WASM hash mismatch');
  await writeFile(target,content);
 }else if(entry.transform==='eaglercraft'){
  const html=data.toString('utf8');
  const embedded=html.match(/window.eaglercraftXOpts.assetsURI = "data:application\/octet-stream;base64,([^"]+)";/);
  if(!embedded)throw Error('Embedded EPW not found');
  const epw=Buffer.from(embedded[1],'base64');
  if(hash(epw)!==entry.outputSha256)throw Error('EPW hash mismatch');
  const start=html.indexOf('<script>',html.indexOf('</script>')+9)+8;
  const proxy=html.slice(start,html.indexOf('</script>',start));
  if(hash(Buffer.from(proxy))!==entry.extraSha256)throw Error('Proxy script hash mismatch');
  await writeFile(target,epw);await writeFile(resolve(root,entry.extraPath),proxy);
 }else await writeFile(target,data);
 console.log('Prepared '+entry.path);
}
let next=0;
async function worker(){while(next<manifest.length)await prepare(manifest[next++]);}
await Promise.all([worker(),worker(),worker()]);

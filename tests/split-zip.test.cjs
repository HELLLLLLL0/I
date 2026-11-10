const {test} = require('node:test');
const assert = require('node:assert/strict');
const {deflateRawSync, crc32} = require('node:zlib');
const {SplitZip} = require('../games/hollow-knight-silksong-master/zip-assets.js');
function fixture() {
  const plain = Buffer.from('Game asset data '.repeat(1000));
  const compressed = deflateRawSync(plain);
  const header = Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(8,8);header.writeUInt16LE(5,26);
  const archive=Buffer.concat([Buffer.alloc(11),header,Buffer.from('a.bin'),compressed]);
  const index={partSize:23,totalSize:archive.length,entries:[{name:'a.bin',offset:11,method:8,compressed:compressed.length,size:plain.length,crc:crc32(plain)}]};
  const calls=[];
  const fetch=async url=>{const n=Number(url.split('/').pop());calls.push(n);return new Response(archive.subarray((n-1)*23,n*23));};
  return {plain,index,fetch,calls};
}
test('streams an asset across part boundaries and verifies CRC',async()=>{
  const f=fixture();const zip=new SplitZip(f.index,{base:'https://test/',fetch:f.fetch});
  assert.deepEqual(Buffer.from(await (await zip.response('a.bin')).arrayBuffer()),f.plain);
  assert.ok(f.calls.length>1);assert.ok(zip.recent.size<=2);
});
test('cache hits skip downloads and quota errors do not stop playback',async()=>{
  const f=fixture(),saved=new Map();const cache={match:async key=>saved.get(key)?.clone(),put:async(key,r)=>{saved.set(key,r.clone());},delete:async key=>saved.delete(key)};
  let zip=new SplitZip(f.index,{base:'https://test/',fetch:f.fetch,cache});await (await zip.response('a.bin')).arrayBuffer();
  const count=f.calls.length;zip=new SplitZip(f.index,{base:'https://test/',fetch:f.fetch,cache});await (await zip.response('a.bin')).arrayBuffer();assert.equal(f.calls.length,count);
  const original=console.warn;console.warn=()=>{};
  try{zip=new SplitZip(f.index,{base:'https://test/',fetch:f.fetch,cache:{match:async()=>null,put:async()=>{throw new Error('QuotaExceededError')}}});assert.equal((await (await zip.response('a.bin')).arrayBuffer()).byteLength,f.plain.length);}finally{console.warn=original;}
});
test('bad integrity and unknown assets fail rather than marking cache complete',async()=>{
  const f=fixture();f.index.entries[0].crc=0;const zip=new SplitZip(f.index,{base:'https://test/',fetch:f.fetch});
  await assert.rejects(async()=>await (await zip.response('a.bin')).arrayBuffer(),/integrity/);
  await assert.rejects(()=>zip.response('missing'),/missing/);
});
test('duplicate part requests share a download and concurrency is bounded',async()=>{
  const f=fixture();let active=0,max=0;const zip=new SplitZip(f.index,{base:'https://test/',fetch:async url=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,10));const response=await f.fetch(url);active--;return response;}});
  await Promise.all([zip.part(1),zip.part(1),zip.part(2),zip.part(3)]);
  assert.equal(f.calls.filter(n=>n===1).length,1);assert.ok(max<=2);
});

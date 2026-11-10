const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync('games/escaperoad/loader.js','utf8');
function setup(blocked=false){
 const elements=Object.fromEntries(['unity-canvas','loading-cover','progress','status','retry'].map(id=>[id,{hidden:false,addEventListener(){},focus(){}}]));
 const scripts=[],calls=[];let initialized=false;
 const window={addEventListener(){}};
 const context={window,document:{querySelector:s=>elements[s.slice(1)],head:{appendChild(script){scripts.push(script.src);queueMicrotask(()=>blocked?script.onerror():script.onload());}},createElement:()=>({})},localStorage:{getItem:()=>null},location:{reload(){}},console:{error(){},warn(){}},setTimeout,clearTimeout,
 firebase:{initializeApp(){initialized=true;}},createUnityInstance:async(canvas,config,progress)=>{
  assert.ok(initialized,'Firebase must be initialized before Unity');
  assert.equal(scripts.filter(s=>s.includes('firebase-')).length,4);
  window.unityInstance.SendMessage('Auth','SignedOut','User signed out');
  progress(.9);
  return {SendMessage:(...args)=>calls.push(args)};
 }};
 vm.runInNewContext(code,context);
 return {elements,scripts,calls};
}
test('Firebase loads before Unity and early auth callbacks are delivered',async()=>{
 const x=setup();await new Promise(r=>setImmediate(r));
 assert.equal(x.elements['loading-cover'].hidden,true);
 assert.deepEqual(x.calls,[['Auth','SignedOut','User signed out']]);
 assert.ok(x.scripts.at(-1).endsWith('TemplateData/loader.js'));
});
test('blocked dependency shows error and retry instead of a frozen progress bar',async()=>{
 const x=setup(true);await new Promise(r=>setImmediate(r));
 assert.match(x.elements.status.textContent,/Could not load/);
 assert.equal(x.elements.retry.hidden,false);
 assert.equal(x.elements.progress.hidden,true);
 assert.equal(x.scripts.length,1);
});

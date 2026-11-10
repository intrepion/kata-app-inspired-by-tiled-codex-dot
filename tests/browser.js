import {createProject, validateProject} from '../src/model.js';
const KEY='tilehaven.project.v1';
const runButton=document.getElementById('run'),results=document.getElementById('results'),summary=document.getElementById('summary'),fixture=document.getElementById('fixture');
let frame=null,doc=null,win=null,canvas=null,captured=null,serial=0;
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const equal=(actual,expected,message)=>assert(actual===expected,`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
const el=id=>{const result=doc.getElementById(id);assert(result,`Missing app element #${id}`);return result;};
const saved=()=>validateProject(JSON.parse(localStorage.getItem(KEY)));
const layer=p=>p.layers.find(l=>l.id===p.activeLayerId);
const count=p=>p.layers.reduce((total,l)=>total+l.data.filter(Boolean).length,0);
const checkCount=n=>equal(el('tileCount').textContent,`${n} placed`,'Visible tile-count readout');
const checkHistory=(undo,redo)=>{equal(!el('undo').disabled,undo,'Undo availability');equal(!el('redo').disabled,redo,'Redo availability');};
const tick=()=>new Promise(resolve=>setTimeout(resolve,40));
function pointer(type,x,y,{id=1,primary=true,button=0}={}){
 const r=canvas.getBoundingClientRect();
 canvas.dispatchEvent(new win.PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,isPrimary:primary,pointerType:'touch',button,buttons:type==='pointerup'||type==='pointercancel'?0:1,clientX:r.left+(x+.5)*r.width/(canvas.width/32),clientY:r.top+(y+.5)*r.height/(canvas.height/32)}));
}
function key(value,options={}){canvas.dispatchEvent(new win.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...options}));}
function drag(x0,y0,x1,y1){pointer('pointerdown',x0,y0);pointer('pointermove',x1,y1);pointer('pointerup',x1,y1);}
async function load(raw=JSON.stringify(createProject({name:'Browser regression fixture',width:8,height:8,template:'blank'}))){
 if(frame){frame.remove();frame=null;}
 if(raw===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,raw);
 frame=document.createElement('iframe');frame.title='Real Tilehaven app under test';
 const loaded=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('App iframe load timed out')),10000);frame.onload=()=>{clearTimeout(timer);resolve();};frame.onerror=()=>{clearTimeout(timer);reject(new Error('App iframe failed to load'));};});
 frame.src=`../index.html?browser-regression=${++serial}`;fixture.append(frame);await loaded;
 win=frame.contentWindow;doc=frame.contentDocument;
 const deadline=Date.now()+5000;
 while(!doc.querySelector('.tile-button')&&Date.now()<deadline)await tick();
 assert(doc.querySelector('.tile-button'),'App did not initialize its palette');await tick();
 canvas=el('map');assert(canvas.width>0&&canvas.getBoundingClientRect().width>0,'Canvas has a usable layout');
 // Synthetic PointerEvents cannot obtain native pointer capture. Simulate only its bookkeeping.
 captured=new Set();canvas.setPointerCapture=id=>captured.add(id);canvas.hasPointerCapture=id=>captured.has(id);canvas.releasePointerCapture=id=>captured.delete(id);
 return savedIfValid();
}
function savedIfValid(){try{return saved();}catch{return null;}}
const cases=[];const test=(name,fn)=>cases.push({name,fn});

test('Clean initialization: demo, valid autosave, palette, dimensions, empty history',async()=>{
 await load(null);const p=saved();equal(p.name,'Fernbrook Crossing','Default project name');equal(doc.querySelectorAll('.tile-button').length,24,'Palette tile count');equal(canvas.width,p.width*32,'Canvas width');equal(canvas.height,p.height*32,'Canvas height');checkCount(count(p));checkHistory(false,false);assert(el('recoverSaved').hidden,'Recovery button is hidden for valid data');assert(!el('modal').open,'No initialization modal');
});

for(const [label,raw] of [['malformed JSON',' { "broken": [ original recovery bytes\n'],['future version',JSON.stringify({...createProject({template:'blank'}),version:99,privateExtra:'retain this exact payload'})]]){
 test(`Recovery: preserve ${label} across edits and reload until explicit Use this map`,async()=>{
  await load(raw);equal(localStorage.getItem(KEY),raw,'Initial recovery payload unchanged');assert(el('modal').open,'Recovery modal opens');assert(el('saveStatus').textContent.includes('paused'),'Autosave shows paused');assert(!el('recoverSaved').hidden,'Recovery action visible');
  el('pauseRecovery').click();el('mapName').value='Paused edits';el('mapName').dispatchEvent(new win.Event('change',{bubbles:true}));
  equal(el('mapName').value,'Paused edits','Editing remains usable');checkHistory(true,false);equal(localStorage.getItem(KEY),raw,'Edits do not overwrite recovery payload');
  // A real iframe navigation re-runs app initialization from the same saved bytes.
  await load(localStorage.getItem(KEY));equal(localStorage.getItem(KEY),raw,'Reload preserves exact recovery bytes');assert(el('modal').open,'Recovery still offered after reload');
  el('pauseRecovery').click();el('mapName').value='Explicitly adopted map';el('mapName').dispatchEvent(new win.Event('change',{bubbles:true}));el('recoverSaved').click();equal(localStorage.getItem(KEY),raw,'Opening recovery does not replace data');
  el('replaceRecovery').click();const p=saved();equal(p.name,'Explicitly adopted map','Explicit adoption persists current map');assert(!el('modal').open,'Recovery dialog closes');assert(el('recoverSaved').hidden,'Recovery action clears');equal(el('saveStatus').textContent,'Saved in this browser','Autosave resumes');
 });
}

test('Synthetic pointer regression: sparse move samples produce a continuous stroke and one undo step',async()=>{
 await load();const before=localStorage.getItem(KEY);pointer('pointerdown',0,1);pointer('pointermove',7,4);equal(localStorage.getItem(KEY),before,'Unfinished stroke is not autosaved');pointer('pointerup',7,4);
 const p=saved(),d=layer(p).data;const expected=[[0,1],[1,1],[2,2],[3,2],[4,3],[5,3],[6,4],[7,4]];
 equal(d.filter(Boolean).length,8,'Exactly eight stroke tiles');for(const [x,y] of expected)equal(d[y*8+x],4,`Stroke continuity at ${x},${y}`);checkCount(8);checkHistory(true,false);
 el('undo').click();checkCount(0);equal(count(saved()),0,'Undo removes whole stroke');checkHistory(false,true);el('redo').click();checkCount(8);equal(count(saved()),8,'Redo restores stroke');checkHistory(true,false);equal(captured.size,0,'Pointer capture released');
});

test('Synthetic pointer regression: secondary events cannot start, replace, extend, cancel or finish a stroke',async()=>{
 await load();pointer('pointerdown',7,7,{id:2,primary:false});pointer('pointerup',7,7,{id:2,primary:false});checkHistory(false,false);equal(count(saved()),0,'Secondary-only touch ignored');
 pointer('pointerdown',0,0);pointer('pointerdown',7,7,{id:2,primary:false});pointer('pointermove',7,7,{id:2,primary:false});pointer('pointercancel',7,7,{id:2,primary:false});pointer('lostpointercapture',7,7,{id:2,primary:false});pointer('pointerup',7,7,{id:2,primary:false});
 assert(captured.has(1),'Primary stroke remains captured');pointer('pointermove',3,0);pointer('pointerup',3,0);const p=saved();equal(count(p),4,'Only primary four-cell stroke committed');for(let x=0;x<4;x++)equal(layer(p).data[x],4,`Primary cell ${x}`);equal(layer(p).data[63],0,'Secondary location untouched');checkCount(4);checkHistory(true,false);el('undo').click();equal(count(saved()),0,'Single undo removes complete primary transaction');checkHistory(false,true);
});

for(const interruption of ['pointercancel','lostpointercapture','blur']){
 test(`Synthetic pointer regression: ${interruption} rolls back without autosave or history changes`,async()=>{
  await load();drag(0,0,1,0);const before=localStorage.getItem(KEY);pointer('pointerdown',4,4);pointer('pointermove',7,7);
  if(interruption==='blur')win.dispatchEvent(new win.Event('blur'));else pointer(interruption,7,7);
  equal(localStorage.getItem(KEY),before,'Saved project unchanged by cancellation');checkCount(2);checkHistory(true,false);equal(captured.size,0,'Capture cleared');pointer('pointerup',7,7);checkCount(2);equal(localStorage.getItem(KEY),before,'Late pointerup does not commit canceled stroke');el('undo').click();checkCount(0);checkHistory(false,true);
 });
}

test('Synthetic pointer regression: keyboard painting is ignored during a held stroke',async()=>{
 await load();const before=localStorage.getItem(KEY);pointer('pointerdown',1,1);key('ArrowRight');key(' ');key('Enter');equal(localStorage.getItem(KEY),before,'Keyboard creates no nested commit');pointer('pointerup',1,1);checkCount(1);const p=saved();equal(layer(p).data[9],4,'Original pointer cell committed');equal(layer(p).data[10],0,'Keyboard did not move or paint');checkHistory(true,false);el('undo').click();checkCount(0);checkHistory(false,true);
});

test('Synthetic pointer regression: redo cancels active stroke and keeps project, history and autosave consistent',async()=>{
 await load();drag(0,0,2,0);el('undo').click();checkCount(0);checkHistory(false,true);
 pointer('pointerdown',6,6);pointer('pointermove',7,7);key('z',{ctrlKey:true,shiftKey:true});
 const redone=localStorage.getItem(KEY);equal(count(saved()),3,'Redo restores only original three cells');equal(layer(saved()).data[54],0,'Interrupted stroke absent');checkCount(3);checkHistory(true,false);equal(captured.size,0,'Redo releases interrupted capture');
 key('Escape');pointer('pointerup',7,7);equal(localStorage.getItem(KEY),redone,'Escape and late pointerup cannot revert redo');checkCount(3);el('undo').click();equal(count(saved()),0,'Undo after redo restores blank state, not partial stroke');checkCount(0);checkHistory(false,true);
});

test('Cached rendering: idle hover does not repaint minimap and committed edits invalidate it',async()=>{
 await load();const mini=el('minimap'),mc=mini.getContext('2d'),map=canvas.getContext('2d');let paints=0;const native=mc.drawImage;mc.drawImage=function(...args){paints++;return native.apply(this,args);};
 const pixel=()=>Array.from(map.getImageData(16,16,1,1).data).join(',');const emptyPixel=pixel();
 pointer('pointermove',4,4);pointer('pointermove',5,5);await tick();equal(paints,0,'Hover keeps cached minimap');
 drag(0,0,0,0);pointer('pointerleave',0,0);await tick();assert(paints>0,'Painting invalidates minimap cache');assert(pixel()!==emptyPixel,'Committed tile is rendered on canvas');checkCount(1);el('undo').click();await tick();equal(pixel(),emptyPixel,'Undo restores rendered background');checkCount(0);
});

runButton.addEventListener('click',async()=>{
 runButton.disabled=true;results.replaceChildren();summary.textContent='Running…';let original,backedUp=false,passed=0,failed=0;
 try{
  original=localStorage.getItem(KEY);backedUp=true;
  for(const {name,fn} of cases){const item=document.createElement('li');item.textContent=`Running: ${name}`;results.append(item);try{await fn();item.className='pass';item.textContent=`PASS: ${name}`;passed++;}catch(error){item.className='fail';item.textContent=`FAIL: ${name} — ${error.message}`;failed++;}}
 }catch(error){failed++;const item=document.createElement('li');item.className='fail';item.textContent=`Harness error: ${error.message}`;results.append(item);}
 finally{
  // Remove the app first so no live app callback can save over the restored original.
  frame?.remove();frame=null;doc=null;win=null;canvas=null;
  try{if(backedUp){if(original===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,original);equal(localStorage.getItem(KEY),original,'Original browser data restored');}}catch(error){failed++;const item=document.createElement('li');item.className='fail';item.textContent=`RESTORE ERROR: ${error.message}. Keep this page open; original payload is retained in the closure.`;results.append(item);}
  summary.textContent=`${passed} passed, ${failed} failed. ${backedUp?'Original browser data restoration attempted.':'No test payloads written.'}`;runButton.disabled=false;
 }
});

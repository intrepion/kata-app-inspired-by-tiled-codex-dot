import test from 'node:test';
import assert from 'node:assert/strict';
import {TILE_COUNT, TILE_SIZE, MAX_LAYERS, createProject, clone, validateProject, setCell, strokeLine, fill, rectangle, toTiled, History} from '../src/model.js';
const blank = () => createProject({width: 8, height: 8, template: 'blank'});
const layerId = 'layer-3';
const data = p => p.layers[2].data;

test('constants, blank and demo templates are valid for every supported size', () => {
  assert.equal(TILE_COUNT, 24); assert.equal(TILE_SIZE, 32); assert.equal(MAX_LAYERS, 8);
  for (const template of ['blank', 'meadow', 'ruin']) {
    for (const [width,height] of [[4,4],[28,20],[64,64],[4,64],[64,4]]) {
      const p = createProject({width,height,template}); assert.deepEqual(validateProject(p),p);
      assert.equal(p.layers.length,3); if (template === 'blank') assert.ok(p.layers.every(l => l.data.every(t => t === 0)));
    }
  }
});

test('validation returns isolated normalized values without unknown fields', () => {
  const p = blank(); p.extra = 'discard'; p.layers[0].extra = true;
  const normalized = validateProject(p);
  assert.equal(normalized.extra, undefined); assert.equal(normalized.layers[0].extra, undefined);
  normalized.layers[0].data[0] = 3; assert.equal(p.layers[0].data[0], 0);
});

test('malformed project shapes, dimensions, layers and tiles are rejected', () => {
  for (const value of [null, [], {}, 1, 'project']) assert.throws(() => validateProject(value));
  const mutations = [p => p.format = 'tiled', p => p.version = 2, p => p.tileSize = 16,
    p => p.width = 3, p => p.height = 65, p => p.width = 8.5, p => p.width = '8',
    p => p.name = 12, p => p.name = 'x'.repeat(81), p => p.layers = [], p => p.layers = null,
    p => p.layers = Array(9).fill(p.layers[0]), p => p.layers[0] = null,
    p => p.layers[1].id = p.layers[0].id, p => p.layers[0].id = '', p => p.layers[0].id = ' ',
    p => p.layers[0].id = 3, p => p.layers[0].name = null, p => p.layers[0].name = 'x'.repeat(81),
    p => p.layers[0].visible = 1, p => p.layers[0].locked = 'false',
    p => p.layers[0].opacity = NaN, p => p.layers[0].opacity = Infinity,
    p => p.layers[0].opacity = -1, p => p.layers[0].opacity = 1.1, p => p.layers[0].opacity = '1',
    p => p.layers[0].data.pop(), p => p.layers[0].data.push(0), p => p.layers[0].data = {},
    p => p.layers[0].data[0] = 25, p => p.layers[0].data[0] = -1, p => p.layers[0].data[0] = 1.2,
    p => p.layers[0].data[0] = '2', p => delete p.layers[0].data[0],
    p => p.activeLayerId = 'missing'];
  for (const mutate of mutations) {const p = blank(); mutate(p); assert.throws(() => validateProject(p), Error, mutate.toString());}
  assert.throws(() => createProject({width:1000}));
});

test('setCell validates bounds and tile IDs, reports changes and permits erasing', () => {
  const p = blank(); assert.equal(setCell(p, layerId,0,0,24),true);
  assert.equal(setCell(p,layerId,0,0,24),false); assert.equal(setCell(p,layerId,0,0,0),true);
  for (const [x,y,t] of [[-1,0,1],[8,0,1],[0,8,1],[0,-1,1],[.5,0,1],[NaN,0,1],[0,0,25],[0,0,-1],[0,0,1.1]]) assert.equal(setCell(p,layerId,x,y,t),false);
  assert.equal(setCell(p,'missing',0,0,1),false); assert.equal(data(p).length,64);
});

test('all tools ignore hidden or locked layers without changing anything', () => {
  for (const property of ['locked','visible']) {
    const p = blank(); p.layers[2][property] = property === 'locked'; const before = clone(p);
    assert.equal(setCell(p,layerId,0,0,1),false); assert.equal(strokeLine(p,layerId,0,0,7,7,1),false);
    assert.equal(fill(p,layerId,0,0,1),false); assert.equal(rectangle(p,layerId,0,0,7,7,1),false);
    assert.deepEqual(p,before);
  }
});

test('Bresenham covers horizontal vertical diagonal steep and reversed lines without gaps', () => {
  for (const [x0,y0,x1,y1] of [[0,0,7,0],[0,0,0,7],[0,0,7,7],[0,0,3,7],[7,6,0,2],[4,5,4,5]]) {
    const p=blank(); assert.equal(strokeLine(p,layerId,x0,y0,x1,y1,4),true);
    assert.equal(data(p)[y0*8+x0],4); assert.equal(data(p)[y1*8+x1],4);
    assert.equal(data(p).filter(t=>t===4).length,Math.max(Math.abs(x1-x0),Math.abs(y1-y0))+1);
    assert.equal(strokeLine(p,layerId,x0,y0,x1,y1,4),false);
    const visited = new Set([y0*8+x0]), queue=[y0*8+x0];
    for (const i of queue) for (let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
      const x=i%8+dx,y=Math.floor(i/8)+dy,j=y*8+x;
      if(x>=0&&x<8&&y>=0&&y<8&&data(p)[j]===4&&!visited.has(j)){visited.add(j);queue.push(j);}
    }
    assert.equal(visited.size,data(p).filter(t=>t===4).length);
  }
  const p=blank(); assert.equal(strokeLine(p,layerId,-1,0,7,7,4),false); assert.equal(strokeLine(p,layerId,0,0,Infinity,7,4),false);
});

test('fill stays within contiguous regions and never wraps rows or crosses diagonals', () => {
  const p=blank(); strokeLine(p,layerId,3,0,3,7,8);
  assert.equal(fill(p,layerId,0,0,1),true); assert.equal(data(p).filter(t=>t===1).length,24);
  assert.equal(data(p).filter(t=>t===8).length,8); assert.equal(data(p).filter(t=>t===0).length,32);
  assert.equal(fill(p,layerId,0,0,1),false); assert.equal(fill(p,layerId,-1,0,2),false);
  const q=blank(); data(q).fill(8); data(q)[7]=0; data(q)[8]=0; data(q)[18]=0; data(q)[27]=0;
  fill(q,layerId,7,0,1); assert.equal(data(q)[8],0);
  fill(q,layerId,2,2,1); assert.equal(data(q)[27],0);
  const full=blank(); fill(full,layerId,0,0,2); assert.ok(data(full).every(t=>t===2));
});

test('rectangles include endpoints, reverse direction, clip safely, and reject bad input', () => {
  const p=blank(); assert.equal(rectangle(p,layerId,4,3,2,1,7),true);
  assert.equal(data(p).filter(t=>t===7).length,9); assert.equal(rectangle(p,layerId,2,1,4,3,7),false);
  assert.equal(rectangle(p,layerId,-100,-100,1,1,3),true); assert.equal(data(p).filter(t=>t===3).length,4);
  assert.equal(rectangle(p,layerId,9,9,20,20,4),false); assert.equal(rectangle(p,layerId,0,0,NaN,3,4),false);
});

test('history clones states, supports undo/redo, and clears redo after a new edit', () => {
  const h=new History(2), a=blank(), b=clone(a); setCell(b,layerId,0,0,1);
  assert.equal(h.commit(a,a),false); assert.equal(h.canUndo,false); assert.equal(h.undo(a),null);
  assert.equal(h.commit(a,b),true); a.name='mutated'; const restored=h.undo(b);
  assert.equal(restored.name,'Untitled world'); assert.equal(data(restored)[0],0); assert.equal(h.canRedo,true);
  b.name='changed after undo'; const redone=h.redo(restored); assert.equal(redone.name,'Untitled world'); assert.equal(data(redone)[0],1);
  h.undo(redone); const c=clone(restored); c.name='branch'; h.commit(restored,c); assert.equal(h.canRedo,false);
  assert.equal(h.redo(c),null); h.clear(); assert.equal(h.canUndo,false); assert.equal(h.canRedo,false);
});

test('history respects its capacity and no-op commits keep redo', () => {
  const h=new History(2); let p=blank();
  for(let i=1;i<=3;i++){const next=clone(p);next.name=String(i);h.commit(p,next);p=next;}
  p=h.undo(p);assert.equal(p.name,'2'); h.commit(p,clone(p));assert.equal(h.canRedo,true);
  p=h.undo(p);assert.equal(p.name,'1');assert.equal(h.undo(p),null);
});

test('Tiled export has the finite orthogonal atlas contract and detached tile arrays', () => {
  const p=createProject(); p.layers[1].visible=false;p.layers[1].opacity=.4;p.layers[1].locked=true;
  const t=toTiled(p);assert.equal(t.infinite,false);assert.equal(t.orientation,'orthogonal');
  assert.equal(t.tilewidth,32);assert.equal(t.tileheight,32);assert.equal(t.layers.length,3);
  assert.deepEqual(t.tilesets[0],{firstgid:1,name:'Tilehaven',tilewidth:32,tileheight:32,tilecount:24,columns:8,margin:0,spacing:0,image:'tilehaven-atlas.png',imagewidth:256,imageheight:96});
  for(let i=0;i<3;i++){assert.equal(t.layers[i].id,i+1);assert.equal(t.layers[i].name,p.layers[i].name);assert.deepEqual(t.layers[i].data,p.layers[i].data);}
  assert.equal(t.layers[1].visible,false);assert.equal(t.layers[1].opacity,.4);assert.deepEqual(t.layers[1].properties,[{name:'tilehaven_locked',type:'bool',value:true}]);
  t.layers[0].data[0]=24;assert.notEqual(p.layers[0].data[0],24);
  assert.equal(toTiled(p,'custom.png').tilesets[0].image,'custom.png'); assert.throws(()=>validateProject(t));
});

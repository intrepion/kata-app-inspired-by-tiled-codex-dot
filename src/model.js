export const TILE_COUNT = 24;
export const TILE_SIZE = 32;
export const MAX_LAYERS = 8;

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const fail = message => { throw new Error(message); };
const validName = (name, label) => {
  if (typeof name !== 'string' || name.length > 80) fail(`${label} must be text of at most 80 characters.`);
  return name;
};

export function validateProject(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('Project must be a JSON object.');
  if (raw.format !== 'tilehaven') fail('Not a Tilehaven project. Open a Tilehaven JSON file, not a Tiled export.');
  if (raw.version !== 1) fail('Unsupported Tilehaven project version.');
  if (!integer(raw.width, 4, 64) || !integer(raw.height, 4, 64)) fail('Map width and height must be whole numbers from 4 to 64.');
  if (raw.tileSize !== TILE_SIZE) fail('Tile size must be 32 pixels.');
  validName(raw.name, 'Project name');
  if (!Array.isArray(raw.layers) || raw.layers.length < 1 || raw.layers.length > MAX_LAYERS) fail('A project must have 1 to 8 layers.');
  const ids = new Set();
  const layers = raw.layers.map((layer, index) => {
    if (!layer || typeof layer !== 'object' || Array.isArray(layer)) fail(`Layer ${index + 1} must be an object.`);
    if (typeof layer.id !== 'string' || !layer.id.trim() || layer.id.length > 80 || ids.has(layer.id)) fail('Layer IDs must be unique, nonempty text of at most 80 characters.');
    ids.add(layer.id);
    validName(layer.name, 'Layer name');
    if (typeof layer.visible !== 'boolean' || typeof layer.locked !== 'boolean') fail('Layer visibility and lock must be booleans.');
    if (typeof layer.opacity !== 'number' || !Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1) fail('Layer opacity must be a number from 0 to 1.');
    if (!Array.isArray(layer.data) || layer.data.length !== raw.width * raw.height) fail(`Layer ${index + 1} must contain exactly ${raw.width * raw.height} tiles.`);
    // Array.from also checks sparse slots instead of silently skipping them.
    const data = Array.from(layer.data, tile => {
      if (!integer(tile, 0, TILE_COUNT)) fail('Tile IDs must be whole numbers from 0 to 24.');
      return tile;
    });
    return {id: layer.id, name: layer.name, visible: layer.visible, locked: layer.locked, opacity: layer.opacity, data};
  });
  if (typeof raw.activeLayerId !== 'string' || !ids.has(raw.activeLayerId)) fail('The active layer must exist in the project.');
  return {format: 'tilehaven', version: 1, name: raw.name, width: raw.width, height: raw.height, tileSize: TILE_SIZE, layers, activeLayerId: raw.activeLayerId};
}

export function createProject({name = 'Untitled world', width = 28, height = 20, template = 'meadow'} = {}) {
  if (!integer(width, 4, 64) || !integer(height, 4, 64)) fail('Map width and height must be whole numbers from 4 to 64.');
  const layers = ['Ground', 'Paths', 'Details'].map((name, i) => ({id: `layer-${i + 1}`, name, visible: true, locked: false, opacity: 1, data: Array(width * height).fill(0)}));
  const project = {format: 'tilehaven', version: 1, name, width, height, tileSize: TILE_SIZE, layers, activeLayerId: layers[2].id};
  validName(name, 'Project name');
  if (template === 'blank') return project;
  const put = (l, x, y, tile) => { if (x >= 0 && y >= 0 && x < width && y < height) layers[l].data[y * width + x] = tile; };
  const riverX = Math.floor(width * .64), roadY = Math.floor(height * .56);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const nx = (x - (width - 1) / 2) / (width * .48), ny = (y - (height - 1) / 2) / (height * .47);
    const edge = nx * nx + ny * ny;
    let tile = edge > 1.05 ? 6 : edge > .88 ? 5 : edge > .72 ? 7 : ((x * 11 + y * 7) % 17 === 0 ? 2 : 1);
    const river = riverX + (y < height * .35 ? -1 : y > height * .7 ? 1 : 0);
    if (Math.abs(x - river) < 1 && edge < .88) tile = 5;
    if (x > width * .23 && x < width * .4 && y > height * .3 && y < height * .47) tile = 3;
    put(0, x, y, tile);
    if (edge < .65 && tile !== 5 && (x * 17 + y * 13) % 23 === 0) put(2, x, y, 9);
    if (edge < .62 && tile !== 5 && (x * 7 + y * 19) % 41 === 0) put(2, x, y, 10);
    if (edge < .6 && tile !== 5 && (x * 5 + y * 11) % 47 === 0) put(2, x, y, 12);
  }
  for (let x = Math.floor(width * .17); x < width * .83; x++) {
    put(1, x, roadY, layers[0].data[roadY * width + x] === 5 ? 17 : 4);
    put(2, x, roadY, 0);
  }
  const rx = Math.floor(width * .34), ry = Math.floor(height * .28);
  for (let y = ry; y <= ry + 2; y++) for (let x = rx; x <= rx + 3; x++) {put(1, x, y, 8); put(2, x, y, 0);}
  put(2, rx, ry, 16); put(2, rx + 3, ry, 16); put(2, rx + 2, ry + 1, 22);
  put(2, Math.floor(width * .26), roadY - 1, 15);
  put(2, Math.floor(width * .44), roadY + 2, 21);
  put(2, Math.floor(width * .77), Math.floor(height * .65), 13);
  if (template === 'ruin') {
    for (let i = 0; i < layers[0].data.length; i++) if (layers[0].data[i] === 1 || layers[0].data[i] === 2) layers[0].data[i] = i % 7 === 0 ? 8 : 3;
  }
  return project;
}

function editable(project, layerId, tile) {
  if (!project || !integer(tile, 0, TILE_COUNT)) return null;
  const layer = project.layers?.find(layer => layer.id === layerId);
  return layer && layer.visible && !layer.locked ? layer : null;
}
function inBounds(project, x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < project.width && y < project.height;
}
export function setCell(project, layerId, x, y, tile) {
  const layer = editable(project, layerId, tile);
  if (!layer || !inBounds(project, x, y)) return false;
  const index = y * project.width + x;
  if (layer.data[index] === tile) return false;
  layer.data[index] = tile;
  return true;
}

export function strokeLine(project, layerId, x0, y0, x1, y1, tile) {
  if (!editable(project, layerId, tile) || ![x0, y0, x1, y1].every(Number.isSafeInteger)) return false;
  // Ignore outside pointer samples, avoiding unbounded iteration on imported coordinates.
  if (!inBounds(project, x0, y0) || !inBounds(project, x1, y1)) return false;
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let error = dx + dy, changed = false;
  while (true) {
    changed = setCell(project, layerId, x0, y0, tile) || changed;
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * error;
    if (e2 >= dy) { error += dy; x0 += sx; }
    if (e2 <= dx) { error += dx; y0 += sy; }
  }
  return changed;
}

export function fill(project, layerId, x, y, tile) {
  const layer = editable(project, layerId, tile);
  if (!layer || !inBounds(project, x, y)) return false;
  const start = y * project.width + x, original = layer.data[start];
  if (original === tile) return false;
  const queue = [start]; layer.data[start] = tile;
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head], cx = index % project.width, cy = Math.floor(index / project.width);
    for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
      if (!inBounds(project, nx, ny)) continue;
      const next = ny * project.width + nx;
      if (layer.data[next] !== original) continue;
      layer.data[next] = tile; queue.push(next);
    }
  }
  return true;
}

export function rectangle(project, layerId, x0, y0, x1, y1, tile) {
  if (!editable(project, layerId, tile) || ![x0, y0, x1, y1].every(Number.isSafeInteger)) return false;
  let changed = false;
  const left = Math.max(0, Math.min(x0, x1)), right = Math.min(project.width - 1, Math.max(x0, x1));
  const top = Math.max(0, Math.min(y0, y1)), bottom = Math.min(project.height - 1, Math.max(y0, y1));
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) changed = setCell(project, layerId, x, y, tile) || changed;
  return changed;
}

export function toTiled(project, imageName = 'tilehaven-atlas.png') {
  const p = validateProject(project);
  return {
    compressionlevel: -1, height: p.height, width: p.width, infinite: false,
    orientation: 'orthogonal', renderorder: 'right-down', version: '1.10',
    tilewidth: TILE_SIZE, tileheight: TILE_SIZE, type: 'map', nextlayerid: p.layers.length + 1, nextobjectid: 1,
    layers: p.layers.map((layer, i) => ({id: i + 1, name: layer.name, type: 'tilelayer', width: p.width, height: p.height, x: 0, y: 0, opacity: layer.opacity, visible: layer.visible, properties: [{name: 'tilehaven_locked', type: 'bool', value: layer.locked}], data: [...layer.data]})),
    tilesets: [{firstgid: 1, name: 'Tilehaven', tilewidth: TILE_SIZE, tileheight: TILE_SIZE, tilecount: TILE_COUNT, columns: 8, margin: 0, spacing: 0, image: imageName, imagewidth: 256, imageheight: 96}]
  };
}

export class History {
  constructor(limit = 80) {
    this.limit = Number.isInteger(limit) && limit > 0 ? limit : 80;
    this.past = []; this.future = [];
  }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  commit(before, after) {
    if (JSON.stringify(before) === JSON.stringify(after)) return false;
    this.past.push(clone(before));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    return true;
  }
  undo(current) {
    if (!this.canUndo) return null;
    this.future.push(clone(current));
    return clone(this.past.pop());
  }
  redo(current) {
    if (!this.canRedo) return null;
    this.past.push(clone(current));
    if (this.past.length > this.limit) this.past.shift();
    return clone(this.future.pop());
  }
  clear() { this.past = []; this.future = []; }
}

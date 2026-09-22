/* =====================================================================
   Document model
   Every object has a box (x, y, w, h) plus rot (degrees, about the center).
   rect / ellipse: drawn natively.   polygon / text / path: an SVG path `d`
   in local coordinates (0,0 = top-left of the box).   line: two endpoints.
   ===================================================================== */
const blankDoc = () => ({ w: 800, h: 600, bg: '#ffffff', nextId: 1, objects: [] });
let doc = blankDoc();
const S = {
  tool: 'select', sel: new Set(), snap: true, showGrid: true, grid: 20, clip: null, pasteN: 0,
  style: { fill: '#3b3bf5', stroke: 'none', sw: 2, join: 'miter', dash: 'solid' }
};
const view = { x: 0, y: 0, z: 1 };

// Photo limits. Change these to suit the devices your students use.
const LIMITS = {
  fileBytes: 15 * 1024 * 1024,   // largest file accepted for import
  srcPixels: 50e6,               // largest picture accepted, in pixels (width x height); a small file can still be huge once opened
  edge: 1600,                    // photos are shrunk so the longest side is at most this many pixels
  storedBytes: 3 * 1024 * 1024,  // a shrunk photo is squeezed further if it is still bigger than this
  photos: 12                     // most different photos in one drawing
};
// Photos live here once; the drawing and the undo history only point at them by id.
const images = new Map();        // id -> { id, blob, dataUrl, w, h, mime, bytes, name, stored }
const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g, '').slice(0, 20) : Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
function docImageIds(d) {
  const s = new Set();
  d.objects.forEach(o => { if (o.kind === 'image' && o.img) s.add(o.img); if (o.pic && o.pic.id) s.add(o.pic.id); });
  return s;
}
// A shape (or text) whose fill is a photo
const hasPic = o => !!(o.pic && o.kind !== 'line' && o.kind !== 'image' && images.has(o.pic.id));
const byId = id => doc.objects.find(o => o.id === id);
const selObjs = () => doc.objects.filter(o => S.sel.has(o.id));
const one = () => { const s = selObjs(); return s.length === 1 ? s[0] : null; };

const KIND_LABEL = { image: 'Photo', rect: 'Rectangle', ellipse: 'Ellipse', polygon: 'Polygon', line: 'Line', text: 'Text', path: 'Shape' };
function labelOf(o) {
  if (o.name) return o.name;
  if (o.kind === 'text') return (o.text || '').split('\n')[0].slice(0, 26) || 'Text';
  if (o.kind === 'polygon' && o.star) return 'Star';
  return KIND_LABEL[o.kind] || 'Object';
}
const iconFor = o => o.kind === 'polygon' ? (o.star ? 'star' : 'polygon') : (o.kind !== 'line' && o.kind !== 'image' && o.pic ? 'image' : o.kind);

/* ---------- geometry builders ---------- */
function buildText(o) {
  const font = fontOf(o.font), size = o.size, scale = size / font.unitsPerEm;
  const asc = font.ascender * scale, desc = -font.descender * scale;
  const lineH = size * o.lh, lines = String(o.text).split('\n');
  const opts = { kerning: true, letterSpacing: o.ls || 0 };
  const widths = lines.map(l => l ? font.getAdvanceWidth(l, size, opts) : 0);
  const W = Math.max(size * 0.4, ...widths);
  let d = '';
  lines.forEach((l, i) => {
    if (!l) return;
    const x = o.align === 'center' ? (W - widths[i]) / 2 : o.align === 'right' ? W - widths[i] : 0;
    const y = i * lineH + (lineH - (asc + desc)) / 2 + asc;
    d += font.getPath(l, x, y, size, opts).toPathData(2);
  });
  return { d, w: W, h: lineH * lines.length };
}
function buildPolygon(o) {
  const n = clamp(Math.round(o.sides || 5), 3, 24), star = !!o.star, inner = clamp(o.inner || 0.45, 0.1, 0.95);
  const total = star ? n * 2 : n, pts = [];
  for (let i = 0; i < total; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / total, r = star && i % 2 ? inner : 1;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  pts.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
  const sx = o.w / (x1 - x0), sy = o.h / (y1 - y0);
  return 'M' + pts.map(p => rnd((p[0] - x0) * sx, 3) + ' ' + rnd((p[1] - y0) * sy, 3)).join('L') + 'Z';
}
const natCache = new Map();
function scaledPathD(nat, w, h) {
  const sx = nat.w > 1e-6 ? w / nat.w : 1, sy = nat.h > 1e-6 ? h / nat.h : 1;
  if (Math.abs(sx - 1) < 1e-9 && Math.abs(sy - 1) < 1e-9) return nat.d;
  let base = natCache.get(nat.d);
  if (!base) {
    base = new paper.CompoundPath({ pathData: nat.d, insert: false });
    natCache.set(nat.d, base);
    if (natCache.size > 24) natCache.delete(natCache.keys().next().value);
  }
  const c = base.clone({ insert: false });
  c.scale(sx, sy, new paper.Point(0, 0));
  return c.pathData;
}
function syncLineBox(o) {
  o.x = Math.min(o.x1, o.x2); o.y = Math.min(o.y1, o.y2);
  o.w = Math.abs(o.x2 - o.x1); o.h = Math.abs(o.y2 - o.y1); o.rot = 0;
}
// Rebuild derived geometry after a parameter changed
function refresh(o) {
  if (o.kind === 'text') { const g = buildText(o); o.d = g.d; o.w = g.w; o.h = g.h; }
  else if (o.kind === 'polygon') o.d = buildPolygon(o);
  else if (o.kind === 'path') o.d = scaledPathD(o.nat, o.w, o.h);
  else if (o.kind === 'line') syncLineBox(o);
}
function newShape(kind, props) {
  const st = S.style;
  const o = Object.assign({
    id: doc.nextId++, kind, name: '', x: 0, y: 0, w: 100, h: 100, rot: 0,
    fill: st.fill, stroke: st.stroke, sw: st.sw, opacity: 1, join: st.join, dash: st.dash, hidden: false, locked: false
  }, props || {});
  const given = k => props && props[k] !== undefined;
  if (kind === 'rect' && o.r === undefined) o.r = 0;
  if (kind === 'polygon') { o.sides = o.sides || 6; o.star = !!o.star; o.inner = o.inner || 0.45; }
  if (kind === 'line') {
    if (!given('fill')) o.fill = 'none';
    if (!given('stroke')) o.stroke = st.stroke === 'none' ? '#151936' : st.stroke;
    if (!given('sw')) o.sw = Math.max(st.sw, 3);
    o.x1 = o.x1 || 0; o.y1 = o.y1 || 0; o.x2 = o.x2 || 0; o.y2 = o.y2 || 0;
  }
  if (kind === 'text') {
    o.text = o.text !== undefined ? o.text : 'Text'; o.font = o.font || DEFAULT_FONT; o.size = o.size || 64;
    o.align = o.align || 'left'; o.lh = o.lh || 1.2; o.ls = o.ls || 0;
    if (!given('fill')) o.fill = '#151936';
    if (!given('stroke')) o.stroke = 'none';
  }
  refresh(o);
  return o;
}

/* ---------- bounds ---------- */
function centerOf(o) { return { x: o.x + o.w / 2, y: o.y + o.h / 2 }; }
function aabb(o) {
  if (!o.rot) return { x: o.x, y: o.y, w: o.w, h: o.h };
  const c = centerOf(o);
  const pts = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]].map(p => rotPt(p[0], p[1], c.x, c.y, o.rot));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}
function unionBox(list) {
  let x0 = 1e12, y0 = 1e12, x1 = -1e12, y1 = -1e12;
  list.forEach(o => { const b = aabb(o); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); });
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function moveBy(o, dx, dy) {
  o.x += dx; o.y += dy;
  if (o.kind === 'line') { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy; }
}


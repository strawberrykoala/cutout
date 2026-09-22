/* =====================================================================
   Editing commands
   ===================================================================== */
function deleteSelected() {
  if (!S.sel.size) return;
  doc.objects = doc.objects.filter(o => !S.sel.has(o.id));
  S.sel = new Set(); commit();
}
function cloneObj(o, off) {
  const c = JSON.parse(JSON.stringify(o));
  c.id = doc.nextId++; c.name = o.name ? o.name + ' copy' : '';
  moveBy(c, off, off);
  return c;
}
function duplicateSelected() {
  const sel = selObjs(); if (!sel.length) return;
  const ids = new Set();
  sel.forEach(o => { const c = cloneObj(o, 16); doc.objects.push(c); ids.add(c.id); });
  S.sel = ids; commit();
}
function copySelected() { const sel = selObjs(); if (sel.length) { S.clip = JSON.stringify(sel); S.pasteN = 0; toast('Copied.'); } }
function pasteClipboard() {
  if (!S.clip) return;
  S.pasteN++;
  const ids = new Set();
  JSON.parse(S.clip).forEach(o => { const c = cloneObj(o, 16 * S.pasteN); c.name = o.name; doc.objects.push(c); ids.add(c.id); });
  S.sel = ids; commit();
}
function orderSelected(how) {
  const a = doc.objects, sel = S.sel;
  if (!sel.size) return;
  if (how === 'front') doc.objects = a.filter(o => !sel.has(o.id)).concat(a.filter(o => sel.has(o.id)));
  else if (how === 'back') doc.objects = a.filter(o => sel.has(o.id)).concat(a.filter(o => !sel.has(o.id)));
  else if (how === 'forward') { for (let i = a.length - 2; i >= 0; i--) if (sel.has(a[i].id) && !sel.has(a[i + 1].id)) { const t = a[i]; a[i] = a[i + 1]; a[i + 1] = t; } }
  else if (how === 'backward') { for (let i = 1; i < a.length; i++) if (sel.has(a[i].id) && !sel.has(a[i - 1].id)) { const t = a[i]; a[i] = a[i - 1]; a[i - 1] = t; } }
  commit();
}
function alignSelected(mode) {
  const sel = selObjs(); if (!sel.length) return;
  const ref = sel.length > 1 ? unionBox(sel) : { x: 0, y: 0, w: doc.w, h: doc.h };
  sel.forEach(o => {
    const b = aabb(o); let dx = 0, dy = 0;
    if (mode === 'l') dx = ref.x - b.x;
    if (mode === 'ch') dx = ref.x + ref.w / 2 - (b.x + b.w / 2);
    if (mode === 'r') dx = ref.x + ref.w - (b.x + b.w);
    if (mode === 't') dy = ref.y - b.y;
    if (mode === 'cv') dy = ref.y + ref.h / 2 - (b.y + b.h / 2);
    if (mode === 'b') dy = ref.y + ref.h - (b.y + b.h);
    moveBy(o, dx, dy);
  });
  commit();
}
// Mirror each selected object about the center of the whole selection
// (for a single object that is its own center, so it flips in place).
function mirrorSelected(axis) {
  const sel = selObjs(); if (!sel.length) return;
  const u = unionBox(sel), ux = u.x + u.w / 2, uy = u.y + u.h / 2;
  sel.forEach(o => {
    if (o.kind === 'line') {
      if (axis === 'h') { o.x1 = 2 * ux - o.x1; o.x2 = 2 * ux - o.x2; } else { o.y1 = 2 * uy - o.y1; o.y2 = 2 * uy - o.y2; }
      refresh(o); return;
    }
    const c = centerOf(o);
    if (axis === 'h') { o.x = 2 * ux - c.x - o.w / 2; o.fx = !o.fx; } else { o.y = 2 * uy - c.y - o.h / 2; o.fy = !o.fy; }
    o.rot = rnd(normDeg(-o.rot), 2);   // a mirror image turns the other way
  });
  commit();
}
function nudge(dx, dy) { const sel = selObjs(); if (!sel.length) return; sel.forEach(o => moveBy(o, dx, dy)); commit(); }
function selectAll() { S.sel = new Set(doc.objects.filter(o => !o.hidden && !o.locked).map(o => o.id)); refreshAll(); }


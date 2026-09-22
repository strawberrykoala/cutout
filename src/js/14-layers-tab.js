/* =====================================================================
   Layers tab
   ===================================================================== */
const layersBox = $('#layers');
let layerSig = '';
function renderLayers() {
  // Only rebuild rows when the list itself changed; otherwise just update selection in place
  const sig = doc.objects.map(o => o.id + '|' + labelOf(o) + '|' + (o.hidden ? 1 : 0) + (o.locked ? 1 : 0) + '|' + iconFor(o)).join('\n');
  if (sig === layerSig && layersBox.children.length) {
    $$('.layer', layersBox).forEach(row => {
      const on = S.sel.has(+row.dataset.id);
      row.classList.toggle('sel', on); row.querySelector('input[type=checkbox]').checked = on;
    });
    return;
  }
  layerSig = sig;
  layersBox.textContent = '';
  if (!doc.objects.length) { layersBox.appendChild(elt('p', 'hint', 'Nothing on the page yet.')); return; }
  for (let i = doc.objects.length - 1; i >= 0; i--) {
    const o = doc.objects[i];
    const row = elt('div', 'layer' + (S.sel.has(o.id) ? ' sel' : '') + (o.hidden ? ' off' : '')); row.dataset.id = o.id;
    const cb = elt('input'); cb.type = 'checkbox'; cb.checked = S.sel.has(o.id); cb.dataset.act = 'pick'; cb.setAttribute('aria-label', 'Select ' + labelOf(o));
    const ic = elt('span', 'kico'); ic.innerHTML = icon(iconFor(o));
    const nm = elt('span', 'lname', labelOf(o)); nm.dataset.act = 'name'; nm.title = 'Click to select, double-click to rename';
    const eye = elt('button', 'btn icon'); eye.dataset.act = 'eye'; eye.title = o.hidden ? 'Show' : 'Hide'; eye.setAttribute('aria-label', eye.title); eye.innerHTML = '<span class="ico">' + icon(o.hidden ? 'eyeoff' : 'eye') + '</span>';
    const lk = elt('button', 'btn icon'); lk.dataset.act = 'lock'; lk.title = o.locked ? 'Unlock' : 'Lock'; lk.setAttribute('aria-label', lk.title); lk.innerHTML = '<span class="ico">' + icon(o.locked ? 'lock' : 'unlock') + '</span>';
    row.append(cb, ic, nm, eye, lk);
    layersBox.appendChild(row);
  }
}
layersBox.addEventListener('click', e => {
  const row = e.target.closest('.layer'); if (!row) return;
  const o = byId(+row.dataset.id); if (!o) return;
  const act = (e.target.closest('[data-act]') || {}).dataset ? e.target.closest('[data-act]').dataset.act : 'name';
  if (act === 'eye') { o.hidden = !o.hidden; if (o.hidden) S.sel.delete(o.id); commit(); }
  else if (act === 'lock') { o.locked = !o.locked; commit(); }
  else if (act === 'pick') { if (S.sel.has(o.id)) S.sel.delete(o.id); else S.sel.add(o.id); refreshAll(); }
  else if (e.shiftKey || e.metaKey || e.ctrlKey) { if (S.sel.has(o.id)) S.sel.delete(o.id); else S.sel.add(o.id); refreshAll(); }
  else { S.sel = new Set([o.id]); refreshAll(); }
});
layersBox.addEventListener('dblclick', e => {
  const nm = e.target.closest('.lname'); if (!nm) return;
  const row = nm.closest('.layer'), o = byId(+row.dataset.id); if (!o) return;
  const inp = elt('input', 'lname-in'); inp.type = 'text'; inp.value = labelOf(o); inp.maxLength = 60;
  nm.replaceWith(inp); inp.focus(); inp.select();
  let done = false;
  const finish = ok => { if (done) return; done = true; if (ok) { o.name = inp.value.trim(); commit(); } else renderLayers(); };
  inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') finish(true); else if (ev.key === 'Escape') finish(false); });
  inp.addEventListener('blur', () => finish(true));
});


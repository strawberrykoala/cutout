/* =====================================================================
   Page tab
   ===================================================================== */
const PRESETS = [['800 \u00d7 600  Default', 800, 600], ['1080 \u00d7 1080  Square', 1080, 1080], ['1920 \u00d7 1080  Slide', 1920, 1080], ['1200 \u00d7 630  Social card', 1200, 630], ['512 \u00d7 512  Icon', 512, 512], ['816 \u00d7 1056  Letter page', 816, 1056], ['794 \u00d7 1123  A4 page', 794, 1123]];
(function () {
  const sel = $('#pg-preset');
  PRESETS.forEach((p, i) => { const o = elt('option', '', p[0]); o.value = i; sel.appendChild(o); });
  const c = elt('option', '', 'Custom'); c.value = 'custom'; sel.appendChild(c);
})();
function updatePageTab() {
  setNum($('#pg-w'), doc.w); setNum($('#pg-h'), doc.h);
  const i = PRESETS.findIndex(p => p[1] === doc.w && p[2] === doc.h);
  $('#pg-preset').value = i < 0 ? 'custom' : String(i);
  const tr = doc.bg === 'transparent';
  $('#bg-color').value = tr ? '#ffffff' : toHex6(doc.bg);
  if (document.activeElement !== $('#bg-hex')) $('#bg-hex').value = tr ? '' : toHex6(doc.bg);
  $('#bg-none').setAttribute('aria-pressed', tr ? 'true' : 'false');
  $('#grid-show').checked = S.showGrid; $('#grid-snap').checked = S.snap; setNum($('#grid-size'), S.grid);
  if (!$('[data-pane="page"]').hidden) updatePhotoInfo();
}
$('#pg-preset').addEventListener('change', e => { if (e.target.value === 'custom') return; const p = PRESETS[+e.target.value]; doc.w = p[1]; doc.h = p[2]; commit(); fit(); });
$('#pg-w').addEventListener('change', e => { const v = parseFloat(e.target.value); if (isFinite(v)) { doc.w = clamp(Math.round(v), 16, 8000); commit(); fit(); } else updatePageTab(); });
$('#pg-h').addEventListener('change', e => { const v = parseFloat(e.target.value); if (isFinite(v)) { doc.h = clamp(Math.round(v), 16, 8000); commit(); fit(); } else updatePageTab(); });
$('#bg-color').addEventListener('input', e => { doc.bg = e.target.value; drawArtboard(); });
$('#bg-color').addEventListener('change', () => commit());
$('#bg-hex').addEventListener('change', e => { const v = e.target.value.trim(); if (HEX.test(v)) { doc.bg = v.toLowerCase(); commit(); } else updatePageTab(); });
$('#bg-none').addEventListener('click', () => { doc.bg = doc.bg === 'transparent' ? '#ffffff' : 'transparent'; commit(); });
$('#grid-show').addEventListener('change', e => { S.showGrid = e.target.checked; drawArtboard(); });
$('#grid-snap').addEventListener('change', e => { S.snap = e.target.checked; });
$('#grid-size').addEventListener('change', e => { const v = parseFloat(e.target.value); if (isFinite(v)) S.grid = clamp(Math.round(v), 2, 200); updatePageTab(); drawArtboard(); });


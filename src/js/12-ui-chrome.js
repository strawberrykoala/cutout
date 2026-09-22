/* =====================================================================
   Toast, menus, panel
   ===================================================================== */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
function closeMenus() { $('#menu-file').hidden = true; $('#btn-file').setAttribute('aria-expanded', 'false'); }
function openPanel() { $('#panel').classList.add('open'); $('#btn-panel').setAttribute('aria-pressed', 'true'); }
function switchTab(name) {
  $$('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false'));
  $$('.pane').forEach(p => { p.hidden = p.dataset.pane !== name; });
  if (name === 'page') updatePhotoInfo();
}
function updateEmpty() { $('#empty').hidden = !(doc.objects.length === 0 && S.tool === 'select'); }


/* =====================================================================
   Fonts (embedded, parsed once). Text is always converted to outlines.
   ===================================================================== */
const FONT_DEFS = [
  ['inter', 'Inter'], ['inter-xb', 'Inter Extra Bold'], ['nunito-xb', 'Nunito Extra Bold'], ['fredoka', 'Fredoka SemiBold'],
  ['lora', 'Lora'], ['lora-b', 'Lora Bold'], ['bungee', 'Bungee'], ['pacifico', 'Pacifico'],
  ['marker', 'Permanent Marker'], ['mono', 'Roboto Mono']
];
const DEFAULT_FONT = 'inter-xb';
const fonts = {};
function b64ToBuf(b64) {
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}
FONT_DEFS.forEach(([key, label]) => {
  try { fonts[key] = { label, font: opentype.parse(b64ToBuf(FONT_DATA[key])) }; } catch (e) { console.error('font', key, e); }
});
const fontOf = key => (fonts[key] || fonts[DEFAULT_FONT] || fonts[Object.keys(fonts)[0]]).font;

// Wordmark: the app's own text-to-outline in Bungee
(function wordmark() {
  try {
    const f = fontOf('bungee'), size = 20, opts = { kerning: true, letterSpacing: 0.02 };
    const w = f.getAdvanceWidth('CUTOUT', size, opts);
    const svg = $('#wordmark');
    svg.setAttribute('viewBox', '0 0 ' + Math.ceil(w) + ' 22');
    svg.setAttribute('width', Math.ceil(w));
    const p = svgEl('path', { d: f.getPath('CUTOUT', 0, 18.5, size, opts).toPathData(2) });
    svg.appendChild(p);
  } catch (e) { $('#wordmark').outerHTML = '<b>Cutout</b>'; }
})();


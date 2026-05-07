/* =========================================================================
   FluffPiece — Logo Guidelines (working draft)
   Single-file vanilla JS. State persists to localStorage; all text fields
   are contenteditable; palette swatches & sliders drive CSS custom props.
   ========================================================================= */

const STORAGE_KEY = 'fluffpiece-guidelines:v1';

const DEFAULT_STATE = {
  mode: 'edit',
  text: {},
  palette: [
    { id: 'mint',   cssVar: '--c-mint',   name: 'Fluff Mint',     hex: '#7fcd89', usage: 'Primary letterform — "Fluff"' },
    { id: 'forest', cssVar: '--c-forest', name: 'Piece Forest',   hex: '#268a52', usage: 'Primary letterform — "Piece"' },
    { id: 'cream',  cssVar: '--c-cream',  name: 'Bookshelf Cream',hex: '#faf7ee', usage: 'Default background' },
    { id: 'ink',    cssVar: '--c-ink',    name: 'Notebook Ink',   hex: '#1f2933', usage: 'Type & dark backgrounds' },
    { id: 'blush',  cssVar: '--c-blush',  name: 'Sunbeam Blush',  hex: '#ffd6b8', usage: 'Accent — moments only' },
    { id: 'sky',    cssVar: '--c-sky',    name: 'Riverbank Sky',  hex: '#cfe9f5', usage: 'Accent — moments only' }
  ],
  clearX: 1,
  minDigital: 80,
  minPrint: 20
};

// Backgrounds we want to render in the "approved backgrounds" grid.
// `useSticker` flips the placed mark to the sticker variant for that surface.
const BG_PRESETS = [
  { id: 'cream',  label: 'Bookshelf Cream',  cssVar: '--c-cream',  useSticker: false, status: 'ok', note: 'Default — primary mark' },
  { id: 'white',  label: 'Pure white',       hex:    '#ffffff',    useSticker: false, status: 'ok', note: 'Primary mark' },
  { id: 'blush',  label: 'Sunbeam Blush',    cssVar: '--c-blush',  useSticker: false, status: 'ok', note: 'Primary mark' },
  { id: 'sky',    label: 'Riverbank Sky',    cssVar: '--c-sky',    useSticker: false, status: 'ok', note: 'Primary mark' },
  { id: 'ink',    label: 'Notebook Ink',     cssVar: '--c-ink',    useSticker: true,  status: 'ok', note: 'Sticker variant on dark' },
  { id: 'mint',   label: 'Fluff Mint (brand)', cssVar: '--c-mint', useSticker: true,  status: 'ok', note: 'Brand green — sticker variant only' },
  { id: 'forest', label: 'Piece Forest (brand)', cssVar: '--c-forest', useSticker: true, status: 'ok', note: 'Brand green — sticker variant only' }
];

const ASSET_PRIMARY  = 'assets/fluffpiece-stacked.png';
const ASSET_STICKER  = 'assets/fluffpiece-stacked-sticker.png';
const ASSET_HORIZ    = 'assets/fluffpiece-horizontal.png';

// ---------------------------------------------------------------------------
// State plumbing
// ---------------------------------------------------------------------------

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return mergeState(structuredClone(DEFAULT_STATE), parsed);
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function mergeState(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  const out = { ...base, ...patch };
  out.text = { ...(base.text || {}), ...(patch.text || {}) };
  if (Array.isArray(patch.palette) && patch.palette.length) {
    out.palette = base.palette.map((b, i) => ({ ...b, ...(patch.palette[i] || {}) }));
  } else {
    out.palette = base.palette;
  }
  return out;
}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  setSaveStatus('Saving…', true);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaveStatus('All edits saved', false);
  }, 200);
}

function setSaveStatus(text, saving) {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('saving', !!saving);
}

// ---------------------------------------------------------------------------
// Editable text
// ---------------------------------------------------------------------------

function initEditableText() {
  document.querySelectorAll('[data-edit]').forEach(el => {
    const key = el.dataset.edit;
    if (state.text[key] != null) {
      if (el.dataset.multiline === 'true') el.innerHTML = state.text[key];
      else el.textContent = state.text[key];
    }
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');
    el.addEventListener('input', () => {
      state.text[key] = el.dataset.multiline === 'true' ? el.innerHTML : el.textContent;
      persist();
    });
    // Tame Enter on single-line fields so it doesn't insert a div
    if (el.dataset.multiline !== 'true') {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

function applyPaletteToCss() {
  const root = document.documentElement;
  state.palette.forEach(c => root.style.setProperty(c.cssVar, c.hex));
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3
    ? h.split('').map(x => parseInt(x + x, 16))
    : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return v;
}

function renderPalette() {
  const grid = document.getElementById('paletteGrid');
  if (!grid) return;
  grid.innerHTML = '';
  state.palette.forEach((color, i) => {
    const card = document.createElement('article');
    card.className = 'swatch-card';
    card.dataset.colorIndex = i;
    const [r, g, b] = hexToRgb(color.hex);
    card.innerHTML = `
      <label class="swatch-chip" style="background:${color.hex}">
        <input type="color" value="${color.hex}" aria-label="${color.name} color" />
      </label>
      <div class="swatch-meta">
        <span class="swatch-name" contenteditable="true" spellcheck="true" data-field="name">${escapeHtml(color.name)}</span>
        <input class="swatch-hex" value="${color.hex}" data-field="hex" aria-label="${color.name} hex" />
        <span class="swatch-rgb">RGB ${r} · ${g} · ${b}</span>
        <span class="swatch-rgb" contenteditable="true" spellcheck="true" data-field="usage" style="display:block;margin-top:6px;color:var(--doc-text-2);font-family:'Inter',sans-serif;font-size:12px">${escapeHtml(color.usage)}</span>
      </div>
    `;
    grid.appendChild(card);

    const colorInput = card.querySelector('input[type="color"]');
    const chip       = card.querySelector('.swatch-chip');
    const hexInput   = card.querySelector('.swatch-hex');
    const rgbLabel   = card.querySelector('.swatch-rgb');
    const nameField  = card.querySelector('[data-field="name"]');
    const usageField = card.querySelector('[data-field="usage"]');

    colorInput.addEventListener('input', () => {
      const v = colorInput.value;
      state.palette[i].hex = v;
      chip.style.background = v;
      hexInput.value = v;
      const [rr, gg, bb] = hexToRgb(v);
      rgbLabel.textContent = `RGB ${rr} · ${gg} · ${bb}`;
      applyPaletteToCss();
      renderBackgrounds();
      persist();
    });
    hexInput.addEventListener('change', () => {
      const v = normalizeHex(hexInput.value);
      if (!v) { hexInput.value = state.palette[i].hex; return; }
      state.palette[i].hex = v;
      hexInput.value = v;
      colorInput.value = v;
      chip.style.background = v;
      const [rr, gg, bb] = hexToRgb(v);
      rgbLabel.textContent = `RGB ${rr} · ${gg} · ${bb}`;
      applyPaletteToCss();
      renderBackgrounds();
      persist();
    });
    nameField.addEventListener('input', () => {
      state.palette[i].name = nameField.textContent.trim();
      persist();
    });
    usageField.addEventListener('input', () => {
      state.palette[i].usage = usageField.textContent.trim();
      persist();
    });
  });
}

function normalizeHex(v) {
  if (!v) return null;
  let h = v.trim();
  if (!h.startsWith('#')) h = '#' + h;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) {
    if (h.length === 4) h = '#' + h.slice(1).split('').map(c => c + c).join('');
    return h.toLowerCase();
  }
  return null;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ---------------------------------------------------------------------------
// Backgrounds grid
// ---------------------------------------------------------------------------

function colorById(id) {
  return state.palette.find(p => p.id === id);
}

function renderBackgrounds() {
  const grid = document.getElementById('bgGrid');
  if (!grid) return;
  grid.innerHTML = '';
  BG_PRESETS.forEach(bg => {
    const c = bg.cssVar ? colorById(bg.id) : null;
    const fill = bg.hex || (c ? c.hex : '#fff');
    const card = document.createElement('article');
    card.className = 'bg-card';
    card.innerHTML = `
      <div class="bg-stage" style="background:${fill}">
        <img src="${bg.useSticker ? ASSET_STICKER : ASSET_PRIMARY}"
             data-fallback="${ASSET_HORIZ}" alt="" />
      </div>
      <div class="bg-meta">
        <span>${escapeHtml(bg.label)}</span>
        <span class="bg-status ${bg.status}">${bg.useSticker ? 'Sticker variant' : 'Primary'}</span>
      </div>
      <div class="bg-meta" style="border-top:0;padding-top:0;font-size:11px;color:var(--doc-text-3)">
        <span>${escapeHtml(bg.note)}</span>
        <span style="font-family:'JetBrains Mono',ui-monospace,monospace">${fill.toUpperCase()}</span>
      </div>
    `;
    grid.appendChild(card);
  });
  installFallbacks(grid);
}

// ---------------------------------------------------------------------------
// Clear space + min size
// ---------------------------------------------------------------------------

function initClearSpace() {
  const slider = document.getElementById('clearX');
  const out    = document.getElementById('clearXOut');
  const label  = document.getElementById('clearXLabel');
  if (!slider) return;
  const apply = (v) => {
    document.documentElement.style.setProperty('--clear-x', v);
    out.textContent = v + '×';
    label.textContent = v;
    state.clearX = parseFloat(v);
  };
  slider.value = state.clearX;
  apply(state.clearX);
  slider.addEventListener('input', () => { apply(slider.value); persist(); });
}

function initMinSize() {
  const dig  = document.getElementById('minDigital');
  const prn  = document.getElementById('minPrint');
  const dLab = document.getElementById('minDigitalLabel');
  const pLab = document.getElementById('minPrintLabel');
  if (!dig || !prn) return;

  const applyDigital = v => {
    document.documentElement.style.setProperty('--min-digital', v + 'px');
    dLab.textContent = v;
    state.minDigital = parseInt(v, 10);
  };
  const applyPrint = v => {
    // 1mm ≈ 3.78px on a 96dpi screen — close enough for a working preview
    const px = Math.round(parseFloat(v) * 3.78);
    document.documentElement.style.setProperty('--min-print', px + 'px');
    pLab.textContent = v;
    state.minPrint = parseInt(v, 10);
  };

  dig.value = state.minDigital;
  prn.value = state.minPrint;
  applyDigital(state.minDigital);
  applyPrint(state.minPrint);

  dig.addEventListener('input', () => { applyDigital(dig.value); persist(); });
  prn.addEventListener('input', () => { applyPrint(prn.value); persist(); });
}

// ---------------------------------------------------------------------------
// Toolbar buttons
// ---------------------------------------------------------------------------

function initToolbar() {
  const modeBtn = document.getElementById('modeToggle');
  modeBtn.addEventListener('click', () => {
    const next = document.body.dataset.mode === 'edit' ? 'present' : 'edit';
    document.body.dataset.mode = next;
    state.mode = next;
    modeBtn.textContent = next === 'edit' ? 'Edit mode' : 'Presentation';
    document.querySelectorAll('[data-edit]').forEach(el => {
      el.contentEditable = next === 'edit' ? 'true' : 'false';
    });
    persist();
  });
  document.body.dataset.mode = state.mode;
  modeBtn.textContent = state.mode === 'edit' ? 'Edit mode' : 'Presentation';

  document.getElementById('exportBtn').addEventListener('click', exportState);
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('Reset all edits to defaults? This will erase your local changes.')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'fluffpiece-guidelines.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Image fallbacks — when stacked PNGs aren't present yet, fall back to the
// horizontal lockup and visually flag it as a placeholder.
// ---------------------------------------------------------------------------

function installFallbacks(root = document) {
  root.querySelectorAll('img[data-fallback]').forEach(img => {
    if (img.dataset.fallbackInstalled) return;
    img.dataset.fallbackInstalled = '1';
    img.addEventListener('error', () => {
      const fb = img.dataset.fallback;
      if (fb && img.src.indexOf(fb) === -1) {
        img.src = fb;
        img.classList.add('is-fallback');
        img.title = 'Placeholder — drop the proper asset at: ' + (img.dataset.intendedSrc || img.getAttribute('src'));
      }
    }, { once: true });
  });
}

// ---------------------------------------------------------------------------
// Sidenav scroll-spy
// ---------------------------------------------------------------------------

function initScrollSpy() {
  const links = [...document.querySelectorAll('.sidenav a')];
  const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        links.forEach(a => a.classList.remove('is-active'));
        const a = map.get(en.target.id);
        if (a) a.classList.add('is-active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
  document.querySelectorAll('main .section').forEach(s => io.observe(s));
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function boot() {
  // Apply image src placeholders before fallback handlers wire up — record the
  // intended path so the tooltip can guide the user.
  document.querySelectorAll('img[src^="assets/"]').forEach(img => {
    img.dataset.intendedSrc = img.getAttribute('src');
  });

  applyPaletteToCss();
  initEditableText();
  renderPalette();
  renderBackgrounds();
  initClearSpace();
  initMinSize();
  initToolbar();
  installFallbacks();
  initScrollSpy();
}

document.addEventListener('DOMContentLoaded', boot);

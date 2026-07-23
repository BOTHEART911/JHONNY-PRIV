/* ============================================================
   JHONNY PRIV — App Privada · app.js
   Fase 2 · Módulo 1: Shell PWA + Login (documento + PIN) + Home por rol.
   Misma arquitectura y patrón que la app pública (SEP-GROUP):
   helpers api()/go()/$, gate de Instalar, auto-versión, PWA nativa.
   Backend: JHONNY CORE (mismo /exec), namespace priv.*
   ============================================================ */

/* URL del Web App del backend JHONNY CORE (/exec) — el MISMO de la pública */
const API_URL = 'https://script.google.com/macros/s/AKfycbw9CZ9ra6q1KI88M3U9IsYP861JOCFD4-xrV1b0UFYhL1amBjAqTTmtNXi42vwLI_h6Hw/exec';

const APP_ICON   = 'https://res.cloudinary.com/dqqeavica/image/upload/v1753538807/JHONNY_PERDOMO_dn3dah.png';
const APP_BANNER = 'https://res.cloudinary.com/dqqeavica/image/upload/v1753538919/BANNER_JHONNY_e0yw7m.png';

/* ---------- Utilidades ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const app = $('#app');
const layer = $('#layer');
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

/* ============================================================
   VISOR DE IMAGEN CON ZOOM                            (Fase 9.2)
   ------------------------------------------------------------
   Portado TAL CUAL de la app pública (allí vive desde la Fase 1) para que
   las dos apps se comporten igual: pinch en móvil, rueda y doble clic en PC,
   arrastrar cuando está ampliada. El CSS (.imgzoom*) ya estaba en este
   style.css desde el Módulo 9 — se había copiado y nunca se usó.
   Cierra al tocar el fondo (e.target === ov): mismo patrón que arregló el
   modal del video de la pública en esta misma fase.
   ============================================================ */
function zoomImagen(src) {
  if (!src) return;
  const ov = h(`<div class="imgzoom"><button class="imgzoom-close" aria-label="Cerrar">${I.x}</button><img src="${esc(src)}" alt="" draggable="false"/></div>`);
  layer.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('show'));
  const img = ov.querySelector('img');
  let scale = 1, tx = 0, ty = 0, startX = 0, startY = 0, dragging = false, lastDist = 0;
  const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; };
  const close = () => { document.removeEventListener('keydown', onEsc); ov.classList.remove('show'); setTimeout(() => ov.remove(), 250); };
  const onEsc = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onEsc);
  ov.querySelector('.imgzoom-close').onclick = close;
  ov.onclick = e => { if (e.target === ov) close(); };
  img.ondblclick = () => { scale = scale > 1 ? 1 : 2.5; if (scale === 1) { tx = 0; ty = 0; } apply(); };
  ov.onwheel = e => { e.preventDefault(); scale = Math.min(5, Math.max(1, scale + (e.deltaY < 0 ? 0.2 : -0.2))); if (scale === 1) { tx = 0; ty = 0; } apply(); };
  img.onpointerdown = e => { if (scale === 1) return; dragging = true; startX = e.clientX - tx; startY = e.clientY - ty; try { img.setPointerCapture(e.pointerId); } catch {} };
  img.onpointermove = e => { if (!dragging) return; tx = e.clientX - startX; ty = e.clientY - startY; apply(); };
  img.onpointerup = () => { dragging = false; };
  ov.ontouchmove = e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastDist) { scale = Math.min(5, Math.max(1, scale + (d - lastDist) / 200)); if (scale === 1) { tx = 0; ty = 0; } apply(); }
      lastDist = d;
    }
  };
  ov.ontouchend = () => { lastDist = 0; };
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const primerNombre = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const iniciales = (n) => { const p = String(n || '').trim().split(/\s+/); return ((p[0]||' ')[0] + (p[1]||'')[0] || '').toUpperCase() || 'JP'; };
const val = id => (($('#' + id) || {}).value || '').trim();
const onlyDig = s => String(s || '').replace(/\D/g, '');

function toast(msg, kind = '') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); layer.appendChild(t); setTimeout(() => t.remove(), 3200); }

/* ---------- Cliente API ---------- */
let _apiActivas = 0;
function loaderOn() { _apiActivas++; const b = document.getElementById('ios-loader'); if (b) b.classList.add('active'); }
function loaderOff() { _apiActivas = Math.max(0, _apiActivas - 1); if (_apiActivas === 0) { const b = document.getElementById('ios-loader'); if (b) b.classList.remove('active'); } }
/* opts.silent = true → NO enciende el loader de iOS. Es lo que permite el
   refresco EN VIVO "en silencio": sin carga, sin spinner, sin loader.
   Toda llamada normal sigue igual (silent llega undefined). */
async function api(action, params = {}, method = 'GET', body = null, opts = {}) {
  if (API_URL.startsWith('PEGA_AQUI')) { toast('Falta configurar la URL del backend', 'err'); throw new Error('API_URL sin configurar'); }
  const qs = new URLSearchParams(Object.assign({ action }, params)).toString();
  const req = { method };
  if (method === 'POST') { req.headers = { 'Content-Type': 'text/plain;charset=utf-8' }; req.body = JSON.stringify(body || {}); }
  const callado = !!opts.silent;
  if (!callado) loaderOn();
  try {
    const res = await fetch(`${API_URL}?${qs}`, req);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error del servidor');
    return json.data;
  } finally { if (!callado) loaderOff(); }
}

/* ---------- Sesiones privadas en el dispositivo ----------
   Guardamos hasta 6 usuarios del panel (documento/nombre/rol/correo).
   El PIN NO se guarda: se pide en cada equipo nuevo. "Recordar" solo
   conserva la lista para reingresar rápido eligiendo la cuenta. */
const SS_KEY = 'jpriv_sessions', ACT_KEY = 'jpriv_active';
const getSessions = () => { try { return JSON.parse(localStorage.getItem(SS_KEY)) || []; } catch { return []; } };
function saveSession(u) { const list = getSessions().filter(x => x.documento !== u.documento); list.unshift(u); localStorage.setItem(SS_KEY, JSON.stringify(list.slice(0, 6))); localStorage.setItem(ACT_KEY, u.documento); }
const getActive = () => { const d = localStorage.getItem(ACT_KEY); return getSessions().find(x => x.documento === d) || null; };
const setActive = (doc) => localStorage.setItem(ACT_KEY, doc);
function forgetSession(doc) { const list = getSessions().filter(x => x.documento !== doc); localStorage.setItem(SS_KEY, JSON.stringify(list)); if (localStorage.getItem(ACT_KEY) === doc) localStorage.removeItem(ACT_KEY); }
function logout() { localStorage.removeItem(ACT_KEY); go('login'); }

/* ============================================================
   PWA: INSTALACIÓN  (patrón SEP-GROUP, idéntico a la pública)
   ============================================================ */
let deferredPrompt = null;
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: installed)').matches || window.navigator.standalone === true;
const isIOS = () => /(iphone|ipad|ipod)/i.test(navigator.userAgent || '');
const esMovil = () => /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');
const isMarkedInstalled = () => { try { return localStorage.getItem('pwaInstalledFlagPriv') === '1'; } catch { return false; } };
const markInstalled = () => { try { localStorage.setItem('pwaInstalledFlagPriv', '1'); } catch {} };
async function detectInstalled() {
  if (isStandalone()) return true;
  if (typeof navigator.getInstalledRelatedApps === 'function') { try { const a = await navigator.getInstalledRelatedApps(); if (a.some(x => x.platform === 'webapp')) { markInstalled(); return true; } } catch {} }
  return isMarkedInstalled();
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (location.hash === '#/instalar') updateInstallSection(); });
window.addEventListener('appinstalled', () => { justInstalled = true; markInstalled(); deferredPrompt = null; toast('¡App instalada!', 'ok'); updateInstallSection(false); });

/* 23/07/2026 · AVISO DE INSTALACION (3 casos, pliego del usuario)
   1) No hay opcion de instalar (iPhone, o la app ya esta instalada):
      iPhone  -> "busca la opcion Compartir y posteriormente Agregar al inicio"
      PC/Andr -> "busca la App en el escritorio de tu dispositivo"
      Se muestra SOLO la linea del dispositivo detectado.
   2) Recien instalada en PC      -> "Actualiza esta vista Ctrl + R"
   3) Recien instalada en Android -> "buscala en el escritorio de tu movil"
   "Recien instalada" solo es detectable en la MISMA sesion, via el evento
   appinstalled; tras recargar no hay senal fiable y se cae al caso 1, que es
   exactamente lo pedido. */
let justInstalled = false;
const isAndroid = () => /android/i.test(navigator.userAgent || '');

function avisoInstalarTxt() {
  if (justInstalled && !isIOS()) {
    return isAndroid()
      ? 'La App se instaló en tu dispositivo, búscala en el escritorio de tu móvil.'
      : 'La App se instaló en tu dispositivo, Actualiza esta vista Ctrl + R';
  }
  return isIOS()
    ? 'Si estás desde iPhone, busca la opción Compartir y posteriormente Agregar al inicio'
    : 'Si estás desde PC o Android, busca la App en el escritorio de tu dispositivo';
}

function updateInstallSection(esperar) {
  const box = $('#install-aviso'), tx = $('#install-aviso-txt'), b = $('#btn-install');
  if (!box || !tx) return;
  const puedeInstalar = !!deferredPrompt && !justInstalled;
  if (b) b.style.display = puedeInstalar ? '' : 'none';
  if (puedeInstalar) { box.classList.add('hidden'); return; }
  /* Chrome puede tardar unos ms en disparar beforeinstallprompt: no anunciamos
     "no hay instalacion" antes de tiempo o el aviso parpadea. */
  if (esperar && !isIOS() && !justInstalled) {
    box.classList.add('hidden');
    setTimeout(() => { if (location.hash === '#/instalar') updateInstallSection(false); }, 1200);
    return;
  }
  tx.textContent = avisoInstalarTxt();
  box.classList.remove('hidden');
}

/* ============================================================
   VERSIÓN + AUTO-UPDATE  (lee version.js por texto — SEP-GROUP)
   ============================================================ */
let APP_VERSION_LOADED = '', __verInFlight = false;
function paintVersion(v) { $$('.app-version-line').forEach(el => el.textContent = 'Versión ' + v); }
async function checkVersion() {
  if (__verInFlight) return; __verInFlight = true;
  try {
    const r = await fetch('./version.js?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const raw = await r.text();
    const m = raw.match(/version['"]?\s*[:=]\s*['"]([^'"]+)['"]/i) || raw.match(/(\d{4}\.\d{2}\.\d{2}\.\d+|\d+\.\d+(?:\.\d+)?)/);
    const v = m ? String(m[1]).trim() : '';
    if (!v) return;
    if (!APP_VERSION_LOADED) { APP_VERSION_LOADED = v; paintVersion(v); return; }
    if (v !== APP_VERSION_LOADED) { try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch {} location.reload(); }
  } finally { __verInFlight = false; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });

/* ---------- Filtros de entrada ---------- */
function onlyDigits(input) { if (input) input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); }); }

/* ---------- Constructores de campos ---------- */
function loadingBox(text) { return `<div class="loadbox"><span class="spinner spinner-brand"></span><span class="small muted">${esc(text || 'Cargando…')}</span></div>`; }
function backbar(title) { return `<div class="appbar"><button class="icon-btn" id="backbtn">${I.back}</button><div class="who"><b>${esc(title)}</b><span>Jhonny Perdomo · Privada</span></div></div>`; }
function field(label, inner) { return `<label class="field"><span>${esc(label)}</span>${inner}</label>`; }
function inputEl(id, attrs = '') { return `<input class="input" id="${id}" autocomplete="off" ${attrs} />`; }
function footBrand() { return `<img class="brand-banner" src="${APP_BANNER}" alt="" onerror="this.style.display='none'" /><p class="app-version-line">Versión —</p>`; }

/* 17/07/2026 · El botón "Instalar la app" del login SE QUITÓ (lo pidió el
   usuario): para eso está la vista Instalar, que es la primera pantalla.
   Quedó también sin efecto su escucha de clic, así que se fue con él.
   OJO: si alguien ya eligió "Continuar en el navegador" en esta sesión, la
   única forma de volver a ver Instalar es abrir la app en una pestaña nueva
   (el gate vuelve a salir en cada sesión nueva). */

/* Confirmación (hoja inferior) */
function crow(label, v) { return `<div class="crow"><span>${esc(label)}</span><b>${esc(v || '—')}</b></div>`; }
function confirmar(title, rowsHtml) {
  return new Promise(resolve => {
    openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:10px;">${esc(title)}</h2><div class="confirm-list">${rowsHtml}</div><div class="stack" style="margin-top:18px;"><button class="btn btn-primary btn-block" data-yes>Confirmar</button><button class="btn btn-quiet btn-block" data-no>Cancelar</button></div>`);
    layer.querySelector('[data-yes]').onclick = () => { closeLayer(); resolve(true); };
    layer.querySelector('[data-no]').onclick = () => { closeLayer(); resolve(false); };
  });
}
function saving(btn, on) { if (!btn) return; btn.disabled = on; btn.dataset.txt = btn.dataset.txt || btn.innerHTML; const azul = !btn.classList.contains('btn-primary'); btn.innerHTML = on ? `<span class="spinner${azul ? ' spinner-brand' : ''}"></span>` : btn.dataset.txt; }

/* ---------- Íconos ---------- */
const I = {
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>',
  logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
  swap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3 21 7l-4 4"/><path d="M21 7H9"/><path d="M7 21 3 17l4-4"/><path d="M3 17h12"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  reload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
  eyeOn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.7 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.2 3.1M6.6 6.6A13.3 13.3 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m2 2 20 20"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  db:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.5 5.8 21 7 14 2 9.3 9 8.5 12 2"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  cal2:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="4" width="3" height="14"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>',
  bot:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M8 4h8"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M2 13v3M22 13v3"/></svg>',
  vote:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 20h18"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
  sliders:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>',
  pdf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6M9 18h4"/></svg>',
  wa:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.82c2.16 0 4.19.84 5.72 2.37a8.06 8.06 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.09 8.09a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.12.82.83-3.04-.19-.31a8.05 8.05 0 0 1-1.26-4.35c0-4.46 3.63-8.09 8.09-8.09Zm-4.6 4.34c-.19 0-.5.07-.76.34-.26.28-1 .98-1 2.38 0 1.4 1.02 2.76 1.16 2.95.14.19 2 3.06 4.85 4.29.68.29 1.2.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.68-.69 1.92-1.35.24-.66.24-1.23.17-1.35-.07-.11-.26-.19-.55-.33-.29-.14-1.68-.83-1.94-.92-.26-.1-.45-.14-.64.14-.19.28-.73.92-.9 1.11-.16.19-.33.21-.62.07-.29-.14-1.21-.45-2.3-1.42-.85-.76-1.42-1.69-1.59-1.97-.16-.28-.02-.44.12-.58.13-.13.29-.33.43-.5.14-.16.19-.28.29-.47.09-.19.05-.36-.03-.5-.07-.14-.63-1.55-.88-2.11-.23-.55-.46-.48-.63-.48-.16 0-.35-.02-.54-.02Z"/></svg>',
  phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>',
  pencil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  dots:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  chevL:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  chevR:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  repeat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>'
};

/* ---------- Menú de la privada ----------
   `ready` marca los módulos ya construidos (se van activando build a build).
   `roles` restringe la visibilidad; SEDE solo ve "Mi Bot". */
const MENU = [
  { id:'bd',            icon:'db',    title:'Base de Datos',        desc:'Nuestros registros', wide:true },
  { id:'lideres',       icon:'star',  title:'Líderes',              desc:'Coordinadores y referidos' },
  { id:'eventos',       icon:'cal',   title:'Eventos',              desc:'Reuniones generales' },
  { id:'agenda',        icon:'cal2',  title:'Agenda',               desc:'Calendario de reuniones' },
  { id:'compromisos',   icon:'check', title:'Compromisos',          desc:'Seguimiento y estados' },
  { id:'notificaciones',icon:'bell',  title:'Notificaciones',       desc:'Publica en "Ponte al día"' },
  { id:'analisis',      icon:'chart', title:'Análisis de Procesos', desc:'Servicios · Ideas · Comercio' },
  { id:'config',        icon:'gear',  title:'Configuración',        desc:'Ajustes de todo el sistema' },
  { id:'mibot',         icon:'bot',   title:'Mi Bot',               desc:'Tu asistente de WhatsApp' }
];
/* Módulos ya construidos (se activan build a build) */
const READY = new Set(['bd', 'lideres', 'eventos', 'agenda', 'compromisos', 'notificaciones', 'analisis', 'config', 'mibot']);
/* Solo SEDE: ve únicamente "Mi Bot" */
function menuParaRol(rol) {
  if (String(rol).toUpperCase() === 'SEDE') return MENU.filter(m => m.id === 'mibot');
  return MENU.slice();
}

/* ============================================================
   RÚTER
   ============================================================ */
function go(route) { location.hash = '#/' + route; }
window.addEventListener('hashchange', render);
function render() {
  if (window.__votoTeardown) { try { window.__votoTeardown(); } catch (e) {} window.__votoTeardown = null; }
  /* EN VIVO: cada vista enciende su canal al montar; aquí se apaga el de la
     vista que se deja. Va aparte de __votoTeardown a propósito: ese gancho ya
     lo usan Votación y Mi Bot para sus propios sondeos y no se toca. */
  vivoTeardown();
  const route = (location.hash.replace(/^#\//, '') || '').split('?')[0];
  const user = getActive();
  appWide(false); // ancho normal por defecto; las vistas de grid lo reactivan
  /* 23/07/2026 · Si la app YA corre instalada (ventana standalone), la vista
     Instalar no tiene sentido y ademas dejaba la ventana muerta: Chrome abre la
     PWA en la misma URL desde la que se instalo, y si esa URL traia #/instalar,
     Ctrl+R la mantenia ahi para siempre. Se limpia el hash SIN dejar rastro en el
     historial (replaceState no dispara hashchange, por eso se repinta a mano). */
  if (route === 'instalar' && isStandalone()) { history.replaceState(null, '', location.pathname + location.search + '#/'); return render(); }
  if (route === 'instalar') return viewInstalar();
  if (!user && route !== 'login') return go('login');
  if (route === 'login' || !user) return viewLogin();
  switch (route) {
    case 'bd': return viewBaseDatos(user);
    case 'lideres': return viewLideres(user);
    case 'dashboard': return viewDashboard(user);
    case 'simulador': return viewSimulador(user);
    case 'votacion': return viewVotacion(user);
    case 'eventos': return viewEventos(user);
    case 'agenda': return viewAgenda(user);
    case 'compromisos': return viewCompromisos(user);
    case 'solicitudes': return viewSolicitudes(user);
    case 'notificaciones': return viewNotificaciones(user);
    case 'analisis': return viewAnalisis(user);
    case 'config': return viewConfig(user);
    case 'mibot': return viewMiBot(user);
    default: return viewHome(user);
  }
}

/* ============================================================
   EN VIVO — refresco EN SILENCIO (17/07/2026)
   ------------------------------------------------------------
   CÓMO FUNCIONA
     Cada vista, al terminar de montarse, llama vivoBind(canal, caller, load).
     A partir de ahí:
       · Se escucha /meta/<canal>_rev en Firebase → aviso instantáneo.
       · Y en paralelo se pregunta por priv.rev cada 12 s (respaldo). Ese
         endpoint solo devuelve sellos de tiempo, así que un dispositivo
         quieto no gasta prácticamente nada.
     Cuando el rev sube, se llama load(rev) y esa función recarga POR EL
     ENDPOINT NORMAL (la hoja sigue siendo la única fuente de verdad).

   POR QUÉ LAS DOS VÍAS
     Si las reglas del Realtime Database no dejan leer sin autenticar, el
     listener falla y no pasa nada: queda el sondeo de 12 s. Con reglas
     abiertas, el sondeo casi nunca encuentra nada porque la señal llega
     antes. Las dos están construidas a propósito.

   EN SILENCIO, DE VERDAD
     Todas las llamadas de este motor van con {silent:true}: sin loader, sin
     spinner, sin loadingBox. El usuario no ve "cargando" nunca.

   GUARDAS
     · Con la app en segundo plano (document.hidden) no se recarga: se anota
       y se hace al volver.
     · No se solapan dos recargas (VIVO.corriendo).
     · Debounce de 400 ms: diez cambios seguidos = una sola recarga.
     · Se compara la firma de los datos y solo se repinta si cambió DE VERDAD.

   REGLA PEDIDA POR EL USUARIO (a propósito, distinta de SEP-GROUP)
     Si entra una actualización mientras alguien tiene una tarjeta ABIERTA
     editando, la hoja SE CIERRA porque se actualiza. Quien estaba
     escribiendo pierde lo tecleado. SEP-GROUP espera a que cierre el modal;
     aquí NO: así lo pidió. Por eso se avisa con un toast al cerrar: si no,
     la hoja desaparecería sin explicación.
   ============================================================ */
const VIVO_POLL_MS = 12000;     // igual que SEP-GROUP
const VIVO_DEBOUNCE = 400;
const SILENCIO = { silent: true };

let VIVO = { canal: '', caller: '', load: null, firma: '', poll: null, ref: null, onVal: null,
             t: null, ts: 0, base: false, corriendo: false, pend: null };

function vivoTeardown() {
  if (VIVO.poll) { clearInterval(VIVO.poll); VIVO.poll = null; }
  if (VIVO.ref && VIVO.onVal) { try { VIVO.ref.off('value', VIVO.onVal); } catch (e) {} }
  if (VIVO.t) { clearTimeout(VIVO.t); VIVO.t = null; }
  VIVO.ref = null; VIVO.onVal = null; VIVO.canal = ''; VIVO.load = null;
  VIVO.firma = ''; VIVO.ts = 0; VIVO.base = false; VIVO.corriendo = false; VIVO.pend = null;
}

/* La llama cada vista al final de su montaje */
function vivoBind(canal, caller, load) {
  vivoTeardown();
  VIVO.canal = canal; VIVO.caller = caller; VIVO.load = load;
  vivoSondear(true);                                   // fija la referencia inicial
  VIVO.poll = setInterval(() => vivoSondear(false), VIVO_POLL_MS);
  vivoEscuchar();
}

/* Respaldo: pregunta por los sellos de tiempo (no por los datos) */
async function vivoSondear(inicial) {
  if (!VIVO.canal) return;
  if (document.hidden && !inicial) return;
  const canal = VIVO.canal;
  try {
    const r = await api('priv.rev', { caller: VIVO.caller }, 'GET', null, SILENCIO);
    if (VIVO.canal !== canal) return;                  // cambió de vista mientras iba en vuelo
    const rev = (r.revs || {})[canal];
    if (!VIVO.base) { VIVO.base = true; VIVO.ts = rev ? (rev.ts || 0) : 0; return; }
    if (rev && rev.ts > VIVO.ts) vivoDisparar(rev);
  } catch (e) { /* sin red: se reintenta en 12 s */ }
}

/* Señal instantánea. Reusa el Firebase que ya carga Votación. */
function vivoEscuchar() {
  const canal = VIVO.canal;
  loadFirebase().then(fb => {
    if (VIVO.canal !== canal) return;                  // ya se fue de la vista
    (fb.apps && fb.apps.length) ? fb.app() : fb.initializeApp(VOTO_FBCFG);
    VIVO.ref = fb.database().ref('meta/' + canal + '_rev');
    VIVO.onVal = VIVO.ref.on('value', snap => {
      if (VIVO.canal !== canal) return;
      const rev = snap && snap.val();
      if (!rev || !rev.ts) return;
      if (!VIVO.base) { VIVO.base = true; VIVO.ts = rev.ts; return; }   // el primer disparo es el valor actual
      if (rev.ts > VIVO.ts) vivoDisparar(rev);
    }, () => { /* reglas cerradas o sin permiso: queda el sondeo, no se avisa */ });
  }).catch(() => {});
}

function vivoDisparar(rev) {
  VIVO.ts = Math.max(VIVO.ts || 0, rev.ts || 0);
  if (VIVO.t) clearTimeout(VIVO.t);
  VIVO.t = setTimeout(() => { VIVO.t = null; vivoCorrer(rev); }, VIVO_DEBOUNCE);
}

async function vivoCorrer(rev) {
  if (!VIVO.load || VIVO.corriendo) return;
  if (document.hidden) { VIVO.pend = rev; return; }    // en segundo plano no se toca la pantalla
  VIVO.corriendo = true;
  try { await VIVO.load(rev); } catch (e) { /* en silencio: no se molesta al usuario */ }
  finally { VIVO.corriendo = false; }
}

/* Al volver de segundo plano: lo pendiente, y de paso una comprobación. */
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !VIVO.canal) return;
  const p = VIVO.pend; VIVO.pend = null;
  if (p) vivoCorrer(p); else vivoSondear(false);
});

/* ¿De verdad cambió algo? Evita repintar (y perder el scroll y el "Ver más")
   cuando la señal sonó por algo que no altera lo que se está viendo. */
function vivoCambio(firmaNueva) {
  if (VIVO.firma === firmaNueva) return false;
  VIVO.firma = firmaNueva;
  return true;
}

/* Regla del usuario: si había una hoja abierta, se cierra porque se actualizó. */
function vivoCerrarHoja() {
  if (layer && layer.innerHTML.trim()) { closeLayer(); toast('Se actualizó desde otro dispositivo'); }
}

/* ============================================================
   VISTA INSTALAR  (patrón SEP-GROUP)
   ============================================================ */
function viewInstalar() {
  app.innerHTML = `
    <div class="login-wrap"><div class="login-card">
      <img class="login-logo" src="${APP_ICON}" alt="Jhonny Perdomo" />
      <h1 class="login-title">Panel privado</h1>
      <p class="login-sub">Instala la aplicación para acceder más rápido y usarla como app nativa.</p>

      <div id="install-box" style="margin-top:16px;">
        <button id="btn-install" class="btn btn-primary btn-block" style="display:none;">📲 Instalar aplicación</button>
        <div id="install-aviso" class="hidden ios-steps-wrap">
          <p class="small" id="install-aviso-txt" style="text-align:left;color:var(--muted);"></p>
        </div>
        <button id="btn-cont-web" class="btn btn-ghost btn-block" style="margin-top:10px;">🌐 Continuar en el navegador</button>
      </div>

      ${footBrand()}
    </div></div>`;
  app.hidden = false; hideSplash(); paintVersion(APP_VERSION_LOADED || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''));
  updateInstallSection(true);
  const cont = () => { sessionStorage.setItem('continuedWeb', '1'); go('login'); };
  const bi = $('#btn-install');
  if (bi) bi.onclick = async () => {
    if (!deferredPrompt) { toast('La instalación aún no está disponible. Usa el menú del navegador.'); return; }
    const dp = deferredPrompt; dp.prompt(); try { await dp.userChoice; } catch {} deferredPrompt = null; updateInstallSection();
  };
  const cw = $('#btn-cont-web'); if (cw) cw.onclick = cont;
}

/* ============================================================
   LOGIN  (AJUSTE 17/07/2026 — SOLO PIN)
   ------------------------------------------------------------
   Un único método: el pad. Ya NO se pide el documento — el servidor
   busca de quién es el PIN en USUARIOS (Auth.gs → privUsuariosPorPin_),
   por eso el PIN tiene que ser único y Configuración lo exige al crear
   o editar un usuario.
   Tampoco va aquí el enlace a Instalar: la vista Instalar es la primera
   pantalla y ahí se queda (lo pidió el usuario, 17/07).
   ============================================================ */
const PRIV_PIN_LEN = 4; // longitud del PIN de USUARIOS: el pad auto-envía al completarla.
let pinBuffer = '';     // dígitos tecleados en el pad

function viewLogin() { pinBuffer = ''; renderLogin(); }

function renderLogin() {
  app.innerHTML = `
    <div class="login-wrap"><div class="login-card">
      <img class="login-logo" src="${APP_ICON}" alt="Jhonny Perdomo" />
      <h1 class="login-title">Panel privado</h1>
      <p class="login-sub">Acceso del equipo · Jhonny Perdomo</p>
      <div id="login-body"></div>
      ${footBrand()}
    </div></div>`;
  app.hidden = false; hideSplash(); paintVersion(APP_VERSION_LOADED || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''));
  renderLoginPin();
}

/* ---- Pad de PIN ----
   No se pinta ninguna cuenta guardada: el PIN por sí solo dice quién
   entra, así que enseñar aquí un nombre sería adivinar (y filtrar quién
   usa este equipo). Las cuentas del equipo se manejan desde el botón
   "Cambiar de cuenta" de la barra, ya adentro. */
function renderLoginPin() {
  $('#login-body').innerHTML = `
    <p class="pin-hint" id="pin-hint">Ingresa tu PIN de acceso</p>
    <div class="pin-pad" id="pin-pad">${pinDotsHtml()}</div>
    <div class="pin-keypad">
      ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pin-key" data-key="${n}">${n}</button>`).join('')}
      <button class="pin-key action" data-key="clear">Borrar</button>
      <button class="pin-key" data-key="0">0</button>
      <button class="pin-key action" data-key="back">⌫</button>
    </div>
    <button class="btn btn-primary btn-block" id="pin-enter" style="margin-top:4px;">${I.lock} Entrar</button>`;
  paintPin();
  $$('.pin-key').forEach(k => k.onclick = () => onPinKey(k.dataset.key));
  $('#pin-enter').onclick = () => submitPin();
}
function pinDotsHtml() {
  const n = Math.max(PRIV_PIN_LEN, pinBuffer.length || 0);
  let s = ''; for (let i = 0; i < n; i++) s += '<div class="pin-dot"></div>'; return s;
}
function paintPin() {
  const pad = $('#pin-pad'); if (!pad) return;
  pad.innerHTML = pinDotsHtml();
  $$('#pin-pad .pin-dot').forEach((d, i) => d.classList.toggle('filled', i < pinBuffer.length));
}
function onPinKey(k) {
  if (k === 'clear') { pinBuffer = ''; return paintPin(); }
  if (k === 'back') { pinBuffer = pinBuffer.slice(0, -1); return paintPin(); }
  if (pinBuffer.length >= 12) return;
  pinBuffer += k; paintPin();
  if (pinBuffer.length === PRIV_PIN_LEN) setTimeout(submitPin, 120); // auto-envía al completar la longitud esperada
}
function submitPin() {
  if (pinBuffer.length < PRIV_PIN_LEN) return toast('Ingresa tu PIN', 'err');
  loginCon(pinBuffer, $('#pin-enter'));
}


/* Solo viaja el PIN: quién es lo resuelve el servidor (17/07/2026). */
async function loginCon(pin, btn) {
  saving(btn, true);
  try {
    const r = await api('priv.login', {}, 'POST', { pin });
    saving(btn, false);
    if (!r.ok) { pinBuffer = ''; paintPin(); return toast(r.msg || 'No se pudo iniciar sesión', 'err'); }
    saveSession(r.user);
    go('home');
  } catch (e) { toast('Error de conexión', 'err'); saving(btn, false); pinBuffer = ''; paintPin(); }
}

function rolLabel(rol) {
  const r = String(rol || '').toUpperCase();
  if (r === 'DESARROLLADOR') return 'Desarrollador';
  if (r === 'ADMIN') return 'Administrador';
  if (r === 'SEDE') return 'Sede';
  return r || 'Usuario';
}

/* ============================================================
   HOME  (menú por rol)
   ============================================================ */
function viewHome(user) {
  const rol = String(user.rol || '').toUpperCase();
  const menu = menuParaRol(rol);
  app.innerHTML = `${appbar(user)}
    <div class="pad stack">
      <div>
        <p class="eyebrow">Panel privado · Soy de Flandes</p>
        <h1 class="h1">Hola, ${esc(primerNombre(user.nombre))} 👋🏾</h1>
        <span class="rol-badge ${rol === 'DESARROLLADOR' ? 'dev' : rol === 'ADMIN' ? 'admin' : 'sede'}">${esc(rolLabel(rol))}</span>
      </div>
      <p class="eyebrow" style="margin-top:6px;">Módulos</p>
      <div class="menu-grid">
        ${menu.map(m => {
          const ready = READY.has(m.id);
          return `<button class="tile ${m.wide ? 'wide' : ''} ${ready ? '' : 'soon'}" data-id="${m.id}" ${ready ? '' : 'disabled'}>
            <span class="ico">${I[m.icon]}</span>
            <span class="txt"><b>${esc(m.title)}</b><br><span>${esc(m.desc)}</span></span>
            ${ready ? '' : '<span class="soon-tag">Próximamente</span>'}
          </button>`;
        }).join('')}
      </div>
      <p class="center small muted" style="margin-top:10px;">Jhonny Perdomo · Flandes, Tolima</p>
    </div>`;
  app.hidden = false; hideSplash(); bindAppbar(user); appWide(true);   /* 23/07: Inicio tambien se expande en PC */
  app.querySelectorAll('.tile:not(.soon)').forEach(t => t.onclick = () => openModulo(t.dataset.id, user));
  refrescarMiFoto(user);
}

/* Trae la foto de la hoja si la sesión guardada no la tiene todavía (venía de
   una versión anterior a la 9.2) o si cambió desde Configuración → Usuarios.
   Silencioso: si falla, el Inicio se queda con las iniciales y ya. */
async function refrescarMiFoto(user) {
  try {
    const r = await api('priv.miPerfil', {}, 'POST', { caller: user.documento });
    if (!r || !r.ok) return;
    const nueva = String(r.foto || '');
    if (nueva === String(user.foto || '')) return;
    user.foto = nueva;
    const s = getSessions().find(x => x.documento === user.documento);
    if (s) { s.foto = nueva; saveSession(s); }
    pintarAvatarPriv(user);   // en el sitio: llamar a viewHome() aquí se muerde la cola
  } catch (e) {}
}

/* Repinta solo el avatar de la barra (sin rearmar la vista entera) */
function pintarAvatarPriv(user) {
  const wrap = document.querySelector('.appbar .avatar-wrap');
  if (!wrap) return;
  wrap.outerHTML = avatarHtmlPriv(user);
  const box = $('#avatarBox');
  if (box) box.onclick = () => { const f = fotoUsuarioPriv(user); if (f) zoomImagen(f); else miFotoMenu(user); };
  const ed = $('#avatarEdit'); if (ed) ed.onclick = () => miFotoMenu(user);
}

/* Se irá ampliando módulo a módulo (Módulo 2: Base de Datos, etc.) */
function openModulo(id, user) {
  switch (id) {
    case 'bd': return go('bd');
    case 'lideres': return go('lideres');
    case 'eventos': return go('eventos');
    case 'agenda': return go('agenda');
    case 'compromisos': return go('compromisos');
    case 'notificaciones': return go('notificaciones');
    case 'analisis': return go('analisis');
    case 'config': return go('config');
    case 'mibot': return go('mibot');
    default: toast('Este módulo se activa en el próximo build.');
  }
}
/* Ensancha el contenedor en vistas con grid/tarjetas (PC sin desborde) */
function appWide(on) { document.body.classList.toggle('wide', !!on); }

/* ============================================================
   SELECTOR DE FECHA ESTILO iOS  (ruedas · portado de SEP-GROUP)
   ------------------------------------------------------------
   Mismo comportamiento que el de SEP-GROUP: ruedas con scroll-snap en
   móvil, clic directo y flechas ▲▼ en PC. Aquí es SOLO FECHA (las horas
   siguen con los inputs nativos, que ya funcionan bien).

   abrirRuedaFecha(iso, onOk, opts)
     opts.minHoy  → true en AGENDA: de hoy en adelante, año actual
                    automático (no se programa nada para ayer).
     opts.anios   → true en EVENTOS: agrega la rueda de AÑO y quita el
                    tope, porque hay 173 eventos históricos que se editan.
     opts.anioMin / opts.anioMax → acotan la rueda de AÑO (17/07/2026).
                    Los usa la fecha de las ELECCIONES, que mira años
                    ADELANTE: con el rango de Eventos (2019 → año+1) no se
                    podría programar una elección de 2030.
   Lecciones ya aprendidas en SEP-GROUP y respetadas aquí:
     · el picker se muestra ANTES de construir las columnas (con
       display:none, asignar scrollTop no surte efecto);
     · las columnas se LEEN antes de ocultarlo (si no, devuelven 0).
   ============================================================ */
const IOSP_MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const IOSP_H = 42;
const IOSP = { onOk: null, anio: new Date().getFullYear(), meses: [], dias: [], anios: [], minMes: 0, minDia: 1, conAnio: false, minHoy: false };

function iospDiasMes(mesIdx, anio) { return new Date(anio, mesIdx + 1, 0).getDate(); }
function iospSelCol(colEl) { return Math.max(0, Math.round(colEl.scrollTop / IOSP_H)); }
function iospMarcar(colEl) { const i = iospSelCol(colEl); $$('.iosp-item', colEl).forEach(el => el.classList.toggle('sel', +el.dataset.i === i)); }

function iospBuildCol(colEl, items, initIdx, onSettle) {
  colEl.innerHTML = `<div class="iosp-pad"></div>` +
    items.map((t, i) => `<div class="iosp-item" data-i="${i}">${esc(t)}</div>`).join('') +
    `<div class="iosp-pad"></div>`;
  colEl.scrollTop = Math.max(0, initIdx) * IOSP_H;
  iospMarcar(colEl);
  let to = null;
  colEl.onscroll = () => {
    iospMarcar(colEl);
    if (to) clearTimeout(to);
    to = setTimeout(() => { const i = iospSelCol(colEl); colEl.scrollTo({ top: i * IOSP_H, behavior: 'smooth' }); if (onSettle) onSettle(i); }, 90);
  };
  // PC: clic directo en la fila (además del arrastre en móvil)
  $$('.iosp-item', colEl).forEach(el => el.onclick = () => {
    const i = +el.dataset.i;
    colEl.scrollTop = i * IOSP_H;   // instantáneo → lectura fiable
    iospMarcar(colEl);
    if (onSettle) onSettle(i);
  });
}

/* Meses disponibles para el año que esté elegido */
function iospMesesArr() {
  const out = [];
  const desde = (IOSP.minHoy && IOSP.anio === new Date().getFullYear()) ? IOSP.minMes : 0;
  for (let m = desde; m <= 11; m++) out.push(m);
  return out;
}
/* Días del mes elegido (con la cota de hoy si aplica) */
function iospDiasArr(mesIdx) {
  const total = iospDiasMes(mesIdx, IOSP.anio);
  const hoyMes = IOSP.minHoy && IOSP.anio === new Date().getFullYear() && mesIdx === IOSP.minMes;
  const desde = hoyMes ? IOSP.minDia : 1;
  const out = [];
  for (let d = desde; d <= total; d++) out.push(d);
  return out;
}
function iospRebuildDias(mesPos) {
  const mesIdx = IOSP.meses[Math.min(mesPos, IOSP.meses.length - 1)];
  const cur = IOSP.dias[Math.min(iospSelCol($('#iosp-dia')), IOSP.dias.length - 1)];
  IOSP.dias = iospDiasArr(mesIdx);
  const pos = Math.max(0, IOSP.dias.indexOf(cur));
  iospBuildCol($('#iosp-dia'), IOSP.dias.map(String), pos);
}
function iospRebuildMeses() {
  const cur = IOSP.meses[Math.min(iospSelCol($('#iosp-mes')), IOSP.meses.length - 1)];
  IOSP.meses = iospMesesArr();
  let pos = IOSP.meses.indexOf(cur); if (pos < 0) pos = 0;
  iospBuildCol($('#iosp-mes'), IOSP.meses.map(m => IOSP_MESES[m][0].toUpperCase() + IOSP_MESES[m].slice(1)), pos, iospRebuildDias);
  iospRebuildDias(pos);
}
/* Flechas ▲▼ (PC) */
function iospNudge(colId, delta) {
  const colEl = $('#' + colId); if (!colEl) return;
  const n = $$('.iosp-item', colEl).length;
  const i = Math.min(Math.max(iospSelCol(colEl) + delta, 0), n - 1);
  colEl.scrollTop = i * IOSP_H;
  iospMarcar(colEl);
  if (colId === 'iosp-anio') { IOSP.anio = IOSP.anios[i]; $('#iosp-titulo').textContent = IOSP.anio; iospRebuildMeses(); }
  if (colId === 'iosp-mes') iospRebuildDias(i);
}

function abrirRuedaFecha(iso, onOk, opts) {
  opts = opts || {};
  IOSP.onOk = onOk;
  IOSP.conAnio = !!opts.anios;
  IOSP.minHoy = !!opts.minHoy;

  const hoy = new Date();
  IOSP.minMes = hoy.getMonth();
  IOSP.minDia = hoy.getDate();

  let d = null;
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (!d || isNaN(d.getTime())) d = hoy;

  IOSP.anio = IOSP.conAnio ? d.getFullYear() : hoy.getFullYear();
  if (IOSP.minHoy && IOSP.anio < hoy.getFullYear()) IOSP.anio = hoy.getFullYear();
  IOSP.anios = [];
  if (IOSP.conAnio) {
    const desde = opts.anioMin || Math.min(2019, d.getFullYear());
    const hasta = opts.anioMax || (hoy.getFullYear() + 1);
    for (let y = desde; y <= hasta; y++) IOSP.anios.push(y);
    if (IOSP.anios.indexOf(IOSP.anio) === -1) IOSP.anio = Math.max(desde, Math.min(hasta, hoy.getFullYear()));
  }

  const ov = h(`<div class="iosp-overlay">
    <div class="iosp-card">
      <div class="iosp-head">
        <button type="button" class="iosp-btn" id="iosp-cancel">Cancelar</button>
        <span class="iosp-year" id="iosp-titulo">${IOSP.conAnio ? 'Fecha' : IOSP.anio}</span>
        <button type="button" class="iosp-btn ok" id="iosp-ok">Listo</button>
      </div>
      <div class="iosp-nav iosp-nav--up">
        <button type="button" class="iosp-arrow" data-col="iosp-dia" data-d="-1" aria-label="Día arriba">▲</button>
        <button type="button" class="iosp-arrow" data-col="iosp-mes" data-d="-1" aria-label="Mes arriba">▲</button>
        ${IOSP.conAnio ? `<button type="button" class="iosp-arrow" data-col="iosp-anio" data-d="-1" aria-label="Año arriba">▲</button>` : ''}
      </div>
      <div class="iosp-wheels">
        <div class="iosp-highlight"></div>
        <div class="iosp-col" id="iosp-dia"></div>
        <div class="iosp-col" id="iosp-mes"></div>
        ${IOSP.conAnio ? `<div class="iosp-col" id="iosp-anio"></div>` : ''}
      </div>
      <div class="iosp-nav iosp-nav--down">
        <button type="button" class="iosp-arrow" data-col="iosp-dia" data-d="1" aria-label="Día abajo">▼</button>
        <button type="button" class="iosp-arrow" data-col="iosp-mes" data-d="1" aria-label="Mes abajo">▼</button>
        ${IOSP.conAnio ? `<button type="button" class="iosp-arrow" data-col="iosp-anio" data-d="1" aria-label="Año abajo">▼</button>` : ''}
      </div>
    </div>
  </div>`);
  layer.appendChild(ov);   // se muestra ANTES de construir las columnas

  IOSP.meses = iospMesesArr();
  let mesIdx = d.getMonth();
  if (IOSP.meses.indexOf(mesIdx) === -1) mesIdx = IOSP.meses[0];
  const mesPos = Math.max(0, IOSP.meses.indexOf(mesIdx));
  IOSP.dias = iospDiasArr(mesIdx);
  let dia = d.getDate();
  if (IOSP.dias.indexOf(dia) === -1) dia = IOSP.dias[0];

  iospBuildCol($('#iosp-dia'), IOSP.dias.map(String), Math.max(0, IOSP.dias.indexOf(dia)));
  iospBuildCol($('#iosp-mes'), IOSP.meses.map(x => IOSP_MESES[x][0].toUpperCase() + IOSP_MESES[x].slice(1)), mesPos, iospRebuildDias);
  if (IOSP.conAnio) {
    iospBuildCol($('#iosp-anio'), IOSP.anios.map(String), Math.max(0, IOSP.anios.indexOf(IOSP.anio)), (pos) => {
      IOSP.anio = IOSP.anios[pos]; iospRebuildMeses();
    });
  }

  const cerrar = () => { document.removeEventListener('keydown', onEsc); ov.remove(); };
  const onEsc = e => { if (e.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', onEsc);
  ov.onclick = e => { if (e.target === ov) cerrar(); };
  $('#iosp-cancel', ov).onclick = cerrar;
  $$('.iosp-arrow', ov).forEach(b => b.onclick = () => iospNudge(b.dataset.col, +b.dataset.d));
  $('#iosp-ok', ov).onclick = () => {
    // LEER todo antes de cerrar: en un contenedor oculto, scrollTop vale 0
    const mes = IOSP.meses[Math.min(iospSelCol($('#iosp-mes')), IOSP.meses.length - 1)];
    const dd = IOSP.dias[Math.min(iospSelCol($('#iosp-dia')), IOSP.dias.length - 1)];
    const yy = IOSP.conAnio ? IOSP.anios[Math.min(iospSelCol($('#iosp-anio')), IOSP.anios.length - 1)] : IOSP.anio;
    cerrar();
    const p = n => String(n).padStart(2, '0');
    if (IOSP.onOk) IOSP.onOk(`${yy}-${p(mes + 1)}-${p(dd)}`, `${dd} de ${IOSP_MESES[mes]} de ${yy}`);
  };
}

/* ---- Campo de fecha con rueda (reemplaza a <input type="date">) ----
   Guarda el valor en un input oculto con el MISMO id de antes, así el
   resto del módulo (evReadForm/agReadForm/…) no cambia. */
function campoFecha(id, label, opts) {
  const o = opts || {};
  return `<div class="field">
      <span>${esc(label)}</span>
      <button type="button" class="input datebtn" id="${id}-btn" data-minhoy="${o.minHoy ? 1 : 0}" data-anios="${o.anios ? 1 : 0}" data-aniomin="${o.anioMin || ''}" data-aniomax="${o.anioMax || ''}">
        <span class="datebtn-tx">Selecciona la fecha</span><span class="datebtn-ic">📅</span>
      </button>
      <input type="hidden" id="${id}" />
    </div>`;
}
function fechaLargaISO(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${+m[3]} de ${IOSP_MESES[+m[2] - 1]} de ${m[1]}`;
}
/* Pinta el texto del botón según el valor actual del input oculto */
function fechaSync(id) {
  const b = $(`#${id}-btn`), i = $(`#${id}`); if (!b || !i) return;
  const tx = fechaLargaISO(i.value);
  $('.datebtn-tx', b).textContent = tx || 'Selecciona la fecha';
  b.classList.toggle('vacio', !tx);
}
/* Engancha el botón a la rueda. Llamar después de pintar el formulario. */
function bindCampoFecha(id) {
  const b = $(`#${id}-btn`), i = $(`#${id}`); if (!b || !i) return;
  fechaSync(id);
  b.onclick = () => abrirRuedaFecha(i.value, (iso) => { i.value = iso; fechaSync(id); },
    { minHoy: b.dataset.minhoy === '1', anios: b.dataset.anios === '1',
      anioMin: +b.dataset.aniomin || 0, anioMax: +b.dataset.aniomax || 0 });
}

/* ============================================================
   AJUSTES 17/07/2026 · piezas compartidas
   ------------------------------------------------------------
   · elecCrono: el conteo regresivo del Simulador y de la Votación.
   · pctES: porcentajes con coma y máximo 2 decimales (0,1 · 26,51).
   · copiarTexto: portapapeles con plan B.
   ============================================================ */

/* Porcentaje en es-CO, máximo 2 decimales. El backend ya redondeó; aquí solo
   se escribe. Sin base contra qué medir se dice "—", no un 0% mentiroso. */
function pctES(n) { return Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 }) + '%'; }
function pctBase(x) { return x && x.base ? pctES(x.pct) : '—'; }

/* Portapapeles. navigator.clipboard necesita contexto seguro; la app va por
   https (GitHub Pages), pero si el navegador lo niega se cae al textarea de
   toda la vida en vez de dejar al usuario sin nada. */
async function copiarTexto(txt, msgOk) {
  try {
    await navigator.clipboard.writeText(txt);
    toast(msgOk || 'Copiado', 'ok'); return true;
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = txt; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0;';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy'); ta.remove();
      toast(ok ? (msgOk || 'Copiado') : 'No se pudo copiar', ok ? 'ok' : 'err');
      return ok;
    } catch (e2) { toast('No se pudo copiar', 'err'); return false; }
  }
}

/* ---------- CONTEO REGRESIVO ----------
   Fuente de la hora: el SERVIDOR. El backend manda eleccion.now junto con
   iniMs/finMs; aquí se guarda el desfase contra el reloj del equipo y se
   cuenta con la hora buena. Un celular con la hora corrida mostraría otra
   cuenta distinta a la del equipo de al lado, y en esto no puede haber dos
   verdades. El desfase se refresca solo: el Simulador y la Votación vuelven
   a pedir sus datos (EN VIVO / sondeo de 7 s) y con ellos llega un `now`
   nuevo. */
const ELEC = { off: 0, ini: 0, fin: 0, listo: false, timer: null };
const ELEC_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function elecSet(e) {
  if (!e) return;
  ELEC.off = (typeof e.now === 'number' ? e.now : Date.now()) - Date.now();
  ELEC.ini = e.iniMs || 0;
  ELEC.fin = e.finMs || 0;
  ELEC.listo = !!e.configurada;
}
function elecAhora() { return Date.now() + ELEC.off; }
/* Estado: 'sin' (no configurada) · 'antes' · 'curso' · 'cerrada' */
function elecEstado() {
  if (!ELEC.listo) return 'sin';
  const t = elecAhora();
  if (t < ELEC.ini) return 'antes';
  if (t < ELEC.fin) return 'curso';
  return 'cerrada';
}
/* ms → {d,h,m,s} ya en dos dígitos (los días, tal cual) */
function elecPartes(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(t / 86400),
    h: pad2(Math.floor(t % 86400 / 3600)),
    m: pad2(Math.floor(t % 3600 / 60)),
    s: pad2(t % 60),
    hTot: pad2(Math.floor(t / 3600))   // horas TOTALES (Votación no muestra días)
  };
}
/* "domingo, 31 de octubre de 2027 a las 8:00 a. m." */
function elecFechaLarga() {
  if (!ELEC.ini) return '';
  const d = new Date(ELEC.ini);
  const hora = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  return `${ELEC_DIAS[d.getDay()]}, ${d.getDate()} de ${IOSP_MESES[d.getMonth()]} de ${d.getFullYear()} a las ${hora}`;
}

/* Pinta el regresivo dentro de #<id>. modo 'dias' (Simulador) o 'horas' (Votación).
   Devuelve el HTML del armazón; los números los mueve elecTick. */
function elecCronoHtml(id, modo) {
  const cel = (k, l) => `<div class="crono-cel"><b id="${id}-${k}">00</b><span>${l}</span></div>`;
  return `<div class="crono" id="${id}">
      <div class="crono-tit" id="${id}-tit">—</div>
      <div class="crono-celdas">
        ${modo === 'dias' ? cel('d', 'días') : ''}
        ${cel('h', 'horas')}${cel('m', 'min')}${cel('s', 'seg')}
      </div>
      <div class="crono-pie" id="${id}-pie"></div>
    </div>`;
}

function elecTick(id, modo) {
  const box = $('#' + id);
  if (!box) { if (ELEC.timer) { clearInterval(ELEC.timer); ELEC.timer = null; } return; }
  const est = elecEstado();
  const set = (k, v) => { const el = $(`#${id}-${k}`); if (el && el.textContent !== v) el.textContent = v; };
  const tit = $(`#${id}-tit`), pie = $(`#${id}-pie`);

  let p = { d: 0, h: '00', m: '00', s: '00', hTot: '00' }, titulo = '', pieTx = '', cls = '';

  if (est === 'sin') {
    titulo = 'Sin fecha de elecciones';
    pieTx = 'La pone el desarrollador en Configuración → Avanzado.';
    cls = 'crono--sin';
  } else if (est === 'antes') {
    /* El Simulador cuenta lo que falta para ABRIR. La Votación, mientras no
       sea el día ni la hora, va en CEROS y solo anuncia cuándo abre (lo pidió
       así el usuario). */
    if (modo === 'dias') { p = elecPartes(ELEC.ini - elecAhora()); titulo = 'Faltan para las elecciones'; }
    else { titulo = `LA VOTACIÓN INICIARÁ EL ${elecFechaLarga().toUpperCase()}`; }
    pieTx = modo === 'dias' ? elecFechaLarga().replace(/^./, c => c.toUpperCase()) : 'El registro de votos sigue abierto para pruebas.';
    cls = 'crono--antes';
  } else if (est === 'curso') {
    p = elecPartes(ELEC.fin - elecAhora());
    if (modo !== 'dias') p.h = p.hTot;
    titulo = modo === 'dias' ? 'VOTACIÓN EN CURSO · falta para el cierre' : 'Falta para el cierre de la votación';
    pieTx = 'Cierra a las ' + new Date(ELEC.fin).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
    cls = 'crono--curso';
  } else {
    titulo = 'VOTACIÓN CERRADA';
    pieTx = elecFechaLarga().replace(/^./, c => c.toUpperCase());
    cls = 'crono--cerrada';
  }

  if (modo === 'dias') set('d', String(p.d));
  set('h', p.h); set('m', p.m); set('s', p.s);
  if (tit && tit.textContent !== titulo) tit.textContent = titulo;
  if (pie && pie.textContent !== pieTx) pie.textContent = pieTx;
  box.className = 'crono ' + cls + (modo === 'dias' ? ' crono--largo' : '');
}

/* Arranca (o reengancha) el reloj de una vista. Uno solo a la vez: al cambiar
   de vista el elemento desaparece y elecTick se apaga solo. */
function elecCronoBind(id, modo) {
  if (ELEC.timer) { clearInterval(ELEC.timer); ELEC.timer = null; }
  elecTick(id, modo);
  ELEC.timer = setInterval(() => elecTick(id, modo), 1000);
}

/* ============================================================
   BASE DE DATOS  (Nuestros registros · hoja PRINCIPAL)
   ============================================================ */
let BD_ALL = [], BD_ME = '', BD_REG_URL = '', BD_SHOWN = 0, BD_FILT = [];
const BD_INT = new Set(); // intenciones seleccionadas (multi, combinables con municipio)
/* AJUSTES 16/07: filtro por líder + exportación de LO FILTRADO */
let BD_LIDERES = [], BD_COLS = [], BD_LID = '';   // BD_LID = código del líder ('' = todos, 'SIN' = sin líder)
const BD_BATCH = 60;
let _resiCache = null;
async function getResidencias() { if (!_resiCache) { try { _resiCache = await api('pub.residencias'); } catch { _resiCache = []; } } return _resiCache; }

/* Grupo de municipio → clase de color de tarjeta */
function bdColor(mun) {
  const m = String(mun || '').trim().toUpperCase();
  if (m === 'FLANDES') return 'bd-flandes';
  if (m === 'SIN CONSULTAR') return 'bd-sin';
  if (m === 'A LA ESPERA') return 'bd-espera';
  if (m === 'POR CONFIRMAR') return 'bd-confirmar';
  return 'bd-otro';
}

/* URL de la foto de la persona (mismo esquema Drive de la pública).
   Acepta URL completa, ID de Drive suelto o enlace /d/ID. Devuelve '' si no
   hay foto o es la imagen por defecto (user_zefosv). */
const FOTO_DEFAULT_PRIV = 'user_zefosv';
function bdFotoUrl(v) {
  const s = String(v || '').trim();
  if (!s || s.toLowerCase().indexOf(FOTO_DEFAULT_PRIV) !== -1) return '';
  const m = s.match(/\/d\/([-\w]{20,})|[?&]id=([-\w]{20,})/);          // enlace de Drive (file/d/ID o ?id=ID)
  if (m) return 'https://lh3.googleusercontent.com/d/' + (m[1] || m[2]);
  if (/^[-\w]{20,}$/.test(s)) return 'https://lh3.googleusercontent.com/d/' + s; // ID de Drive suelto
  if (/^https?:\/\//i.test(s)) return s;                              // cualquier otra URL directa
  return s;
}

/* Fecha larga en español: "Domingo, 12 de julio de 2026 – 3:45 pm" */
const BD_DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const BD_MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function fmtFechaLarga(s) {
  const m = String(s || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!m) return String(s || '');
  const d = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
  let hh = +(m[4] || 0), mm = m[5] || '00'; const ampm = hh >= 12 ? 'pm' : 'am'; hh = hh % 12 || 12;
  const hora = (m[4] != null) ? ` – ${hh}:${mm} ${ampm}` : '';
  return `${BD_DIAS[d.getDay()]}, ${+m[1]} de ${BD_MESES[+m[2] - 1]} de ${m[3]}${hora}`;
}

function bdCardHtml(c) {
  const inact = c.estado === 'INACTIVO';
  const fechaTxt = c.fechaActualizacion
    ? `Actualizado ${fmtFechaLarga(c.fechaActualizacion)}`
    : (c.fechaRegistro ? `Creado ${fmtFechaLarga(c.fechaRegistro)}` : '');
  return `<article class="bd-card ${bdColor(c.municipio)} ${inact ? 'bd-inact' : ''}" data-doc="${esc(c.documento)}">
    <div class="bd-top">
      <div class="bd-id">
        <b class="bd-nombre">${c.esLider ? `<span class="bd-star" title="Líder">★</span> ` : ''}${esc(c.nombre || 'Sin nombre')}</b>
        <span class="bd-doc">CC ${esc(c.documento)}</span>
      </div>
      ${inact ? '<span class="bd-pill-inact">Inactivo</span>' : `<span class="bd-mun ${bdColor(c.municipio)}">${esc(c.municipio || '—')}</span>`}
    </div>
    <div class="bd-meta">
      <span><span class="bd-k">Residencia</span> ${esc(c.residencia || '—')}</span>
      <span><span class="bd-k">Intención</span> ${esc(c.intencion || '—')}</span>
    </div>
    ${fechaTxt ? `<div class="bd-fecha">${esc(fechaTxt)}</div>` : ''}
    <div class="bd-acts">
      <button class="bd-btn" data-a="detalles">Detalles</button>
      <button class="bd-btn" data-a="editar">Editar</button>
      <button class="bd-btn" data-a="consultar">Consultar</button>
      <button class="bd-btn bd-btn-danger" data-a="inactivar" ${inact ? 'disabled' : ''}>Inactivar</button>
    </div>
  </article>`;
}

async function viewBaseDatos(user) {
  BD_ME = user.documento;
  appWide(true);
  app.innerHTML = `${backbar('Base de Datos')}
    <div class="pad">
      <div class="bd-toolbar">
        <div class="bd-search">
          <input class="input" id="bd-q" placeholder="Buscar por nombre, documento o residencia…" autocomplete="off" />
        </div>
        <button class="btn btn-primary bd-add" id="bd-add">+ Agregar</button>
      </div>
      <div class="bd-nav">
        <button class="btn btn-ghost bd-nav-btn" id="bd-dashboard">${I.chart} Dashboard</button>
        <button class="btn btn-ghost bd-nav-btn" id="bd-simulador">${I.sliders} Simulador</button>
        <button class="btn btn-ghost bd-nav-btn bd-nav-vote" id="bd-votacion">${I.vote} Votación</button>
      </div>
      <div class="bd-chips" id="bd-chips">
        ${['Todos','Flandes','Sin consultar','A la espera','Por confirmar','Otros','Inactivos'].map((t,i)=>`<button class="bd-chip ${i===0?'active':''}" data-f="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
      <div class="bd-chips bd-chips-int" id="bd-chips-int"></div>
      <div class="bd-lidbar">
        <div class="bd-lidsel">
          <span class="bd-chips-lbl">Líder:</span>
          ${comboboxHtml('bd-lid', 'Todos los líderes…')}
        </div>
        <div class="bd-exp">
          <button class="btn btn-ghost" id="bd-excel">${I.download} Excel</button>
          <button class="btn btn-ghost" id="bd-pdf">${I.download} PDF</button>
        </div>
      </div>
      <div class="bd-count" id="bd-count"></div>
      <div id="bd-body">${loadingBox('Cargando registros…')}</div>
      <div class="center" id="bd-more" style="margin-top:12px;"></div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('home');
  $('#bd-add').onclick = () => bdAgregar();
  $('#bd-dashboard').onclick = () => go('dashboard');
  $('#bd-simulador').onclick = () => go('simulador');
  $('#bd-votacion').onclick = () => go('votacion');

  try {
    const r = await api('priv.baseDatos', { caller: BD_ME });
    if (!r.ok) { $('#bd-body').innerHTML = `<p class="muted center">No se pudo cargar.</p>`; return; }
    BD_ALL = r.items || []; BD_REG_URL = r.registraduriaUrl || '';
    BD_LIDERES = r.lideres || []; BD_COLS = r.columnas || [];
    BD_INT.clear(); bdBuildIntChips(); bdBindLiderCombo();
    bdApplyFilter();
  } catch (e) { $('#bd-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; }

  const q = $('#bd-q'); let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(bdApplyFilter, 160); };
  $$('#bd-chips .bd-chip').forEach(ch => ch.onclick = () => { $$('#bd-chips .bd-chip').forEach(x => x.classList.remove('active')); ch.classList.add('active'); bdApplyFilter(); });
  $('#bd-excel').onclick = () => bdExportar('excel');
  $('#bd-pdf').onclick = () => bdExportar('pdf');

  vivoBind('bd', BD_ME, vivoBd);   // EN VIVO
}

/* ---- EN VIVO · Base de Datos ----
   La lista completa son ~705 KB (2.414 filas): NO se vuelve a pedir salvo que
   no sepamos qué cambió. Si el rev trae el documento, se trae SOLO esa
   tarjeta con priv.bdCard (~200 bytes) y se reemplaza en sitio con
   bdUpsertCard, que ya existía. rev.prev cubre el caso de que le hayan
   cambiado el documento a alguien: se quita la tarjeta vieja. */
async function vivoBd(rev) {
  const doc = rev && rev.doc ? normDocJs(rev.doc) : '';

  if (doc) {
    const r = await api('priv.bdCard', { caller: BD_ME, documento: doc }, 'GET', null, SILENCIO);
    const prev = rev.prev ? normDocJs(rev.prev) : '';
    let cambio = false;

    if (prev && prev !== doc) {
      const ip = BD_ALL.findIndex(x => normDocJs(x.documento) === prev);
      if (ip >= 0) { BD_ALL.splice(ip, 1); cambio = true; }
    }
    const i = BD_ALL.findIndex(x => normDocJs(x.documento) === doc);
    if (r.card) {
      if (i < 0 || JSON.stringify(BD_ALL[i]) !== JSON.stringify(r.card)) {
        bdUpsertCard(r.card, true); cambio = true;
      }
    } else if (i >= 0) { BD_ALL.splice(i, 1); cambio = true; }

    if (!cambio) return;                 // sonó por algo que no altera la tarjeta
    if (prev || !r.card) bdApplyFilter(); // se quitó una tarjeta: hay que repintar la lista
    bdBuildIntChips();
    vivoCerrarHoja();
    return;
  }

  /* No sabemos qué cambió: recarga completa (rara) */
  const r = await api('priv.baseDatos', { caller: BD_ME }, 'GET', null, SILENCIO);
  if (!r.ok || !vivoCambio(JSON.stringify(r.items))) return;
  BD_ALL = r.items || []; BD_COLS = r.columnas || [];
  bdBuildIntChips(); bdApplyFilter(); vivoCerrarHoja();
}

/* ---- AJUSTES 16/07 · filtro por LÍDER ----
   Se filtra por REFERENCIA (el código), no por el texto de la columna
   LIDER: el código es el que vincula de verdad al referido con su líder. */
function bdLiderLabel(l) { return `#${l.codigo} · ${l.nombre}`; }
function bdBindLiderCombo() {
  const lista = ['Todos los líderes', 'Sin líder asignado'].concat(BD_LIDERES.map(bdLiderLabel));
  bindCombobox('bd-lid', lista);
  const inp = $('#bd-lid'), list = $('#bd-lid-list'); if (!inp) return;
  inp.value = '';
  const leer = () => {
    if (!$('#bd-count')) return;   // se salió de la vista con el debounce en vuelo
    const v = String(inp.value || '').trim();
    if (!v || /^todos/i.test(v)) BD_LID = '';
    else if (/^sin l/i.test(v)) BD_LID = 'SIN';
    else { const m = v.match(/^#(\d+)/); BD_LID = m ? m[1] : ''; }
    bdApplyFilter();
  };
  /* bindCombobox pisa .oninput y NO dispara 'change' al elegir una opción:
     por eso se escucha el clic en la lista (delegado, así corre DESPUÉS de
     que la opción escribe el valor) y el tecleo con addEventListener. */
  if (list) list.addEventListener('click', () => setTimeout(leer, 0));
  let t = null;
  inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(leer, 250); });
}

/* ---- AJUSTES 16/07 · exportar SOLO lo filtrado, eligiendo columnas ---- */
function bdFiltroTxt() {
  const p = [];
  const f = bdActiveFilter(); if (f && f !== 'Todos') p.push(f);
  if (BD_LID === 'SIN') p.push('Sin líder asignado');
  else if (BD_LID) { const l = BD_LIDERES.find(x => String(x.codigo) === String(BD_LID)); p.push('Líder: ' + (l ? bdLiderLabel(l) : '#' + BD_LID)); }
  if (BD_INT.size) p.push('Intención: ' + Array.from(BD_INT).join(', '));
  const q = (($('#bd-q') || {}).value || '').trim(); if (q) p.push('Búsqueda: “' + q + '”');
  return p.length ? p.join(' · ') : 'Todos los registros';
}
function bdExportar(tipo) {
  const docs = BD_FILT.map(c => c.documento).filter(Boolean);
  if (!docs.length) return toast('No hay registros en el filtro actual', 'err');
  const cols = BD_COLS.length ? BD_COLS : ['NOMBRE', 'DOCUMENTO', 'CONTACTO', 'RESIDENCIA', 'MUNICIPIO', 'PUESTO', 'MESA', 'INTENCION'];
  const pref = ['NOMBRE', 'DOCUMENTO', 'CONTACTO', 'RESIDENCIA', 'REFERENCIA', 'LIDER', 'MUNICIPIO', 'PUESTO', 'MESA', 'INTENCION', 'ASISTENCIA'];
  const marcadas = new Set(cols.filter(c => pref.indexOf(String(c).toUpperCase()) !== -1));
  const filtroTxt = bdFiltroTxt();
  openSheet(`<div class="grip"></div>
    <h2 class="h2" style="margin-bottom:4px;">Exportar a ${tipo === 'excel' ? 'Excel' : 'PDF'}</h2>
    <p class="muted small">${docs.length.toLocaleString('es-CO')} registro(s) · ${esc(filtroTxt)}. Elige las columnas:</p>
    <div class="col-pick" id="bd-colpick">
      ${cols.map(c => `<label class="col-opt"><input type="checkbox" data-c="${esc(c)}" ${marcadas.has(c) ? 'checked' : ''}/> <span>${esc(String(c).replace(/_/g, ' '))}</span></label>`).join('')}
    </div>
    <button class="btn btn-primary btn-block" id="bd-colgo" style="margin-top:12px;">${I.download} Descargar ${tipo === 'excel' ? 'Excel' : 'PDF'}</button>`);
  $('#bd-colgo').onclick = async () => {
    const columnas = $$('#bd-colpick input:checked').map(i => i.dataset.c);
    if (!columnas.length) return toast('Elige al menos una columna', 'err');
    const btn = $('#bd-colgo'); saving(btn, true);
    try {
      const r = await api(tipo === 'excel' ? 'priv.bdExcel' : 'priv.bdPdf', {}, 'POST',
        { caller: BD_ME, documentos: docs, columnas, filtroTxt });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo generar', 'err');
      downloadB64(r.base64, r.mime, r.filename);
      closeLayer(); toast('Archivo generado', 'ok');
    } catch (e) { saving(btn, false); toast('Error al generar el archivo', 'err'); }
  };
}

function bdActiveFilter() { const a = $('#bd-chips .bd-chip.active'); return a ? a.dataset.f : 'Todos'; }

/* Construye las pastillas de INTENCIÓN dinámicamente: solo con los valores que
   EXISTAN en la columna (activos), ordenados por frecuencia. Multi-selección,
   combinables con el filtro de municipio. */
function bdBuildIntChips() {
  const cont = $('#bd-chips-int'); if (!cont) return;
  const conteo = {};
  BD_ALL.forEach(c => {
    if (c.estado === 'INACTIVO') return;
    const v = String(c.intencion || '').trim();
    if (v) conteo[v] = (conteo[v] || 0) + 1;
  });
  const valores = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a]);
  if (!valores.length) { cont.innerHTML = ''; return; }
  cont.innerHTML = `<span class="bd-chips-lbl">Intención:</span>` +
    valores.map(v => `<button class="bd-chip bd-chip-int" data-int="${esc(v)}">${esc(v)} <span class="bd-chip-n">${conteo[v].toLocaleString('es-CO')}</span></button>`).join('');
  $$('#bd-chips-int .bd-chip-int').forEach(ch => ch.onclick = () => {
    const v = ch.dataset.int;
    if (BD_INT.has(v)) BD_INT.delete(v); else BD_INT.add(v);
    ch.classList.toggle('active', BD_INT.has(v));
    bdApplyFilter();
  });
  /* EN VIVO: al repintar las pastillas hay que devolverles lo que el usuario
     tenía marcado; si no, un refresco de fondo le borraría el filtro de la
     pantalla (BD_INT sí lo conserva, pero el botón se veía apagado). */
  $$('#bd-chips-int .bd-chip-int').forEach(ch => ch.classList.toggle('active', BD_INT.has(ch.dataset.int)));
}

/* Milisegundos de FECHA_REGISTRO (dd/MM/yyyy HH:mm:ss). Sin fecha → 0 (el más
   antiguo, va primero). En PRINCIPAL está al 100%, pero se blinda por si acaso. */
function bdRegMs(c) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(String((c && c.fechaRegistro) || '').trim());
  if (!m) return 0;
  return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime() || 0;
}
function bdApplyFilter() {
  const q = (($('#bd-q') || {}).value || '').trim().toLowerCase();
  const f = bdActiveFilter();
  BD_FILT = BD_ALL.filter(c => {
    if (f === 'Inactivos') { if (c.estado !== 'INACTIVO') return false; }
    else if (c.estado === 'INACTIVO') { /* ocultos salvo en pestaña Inactivos */ return false; }
    const mun = String(c.municipio || '').trim().toUpperCase();
    if (f === 'Flandes' && mun !== 'FLANDES') return false;
    if (f === 'Sin consultar' && mun !== 'SIN CONSULTAR') return false;
    if (f === 'A la espera' && mun !== 'A LA ESPERA') return false;
    if (f === 'Por confirmar' && mun !== 'POR CONFIRMAR') return false;
    if (f === 'Otros' && ['FLANDES','SIN CONSULTAR','A LA ESPERA','POR CONFIRMAR'].indexOf(mun) !== -1) return false;
    if (BD_INT.size && !BD_INT.has(String(c.intencion || '').trim())) return false;
    if (BD_LID === 'SIN') { if (String(c.referencia || '')) return false; }
    else if (BD_LID && String(c.referencia || '') !== String(BD_LID)) return false;
    if (q) {
      const hay = (String(c.nombre||'') + ' ' + String(c.documento||'') + ' ' + String(c.residencia||'')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  BD_FILT.sort((a, b) => bdRegMs(b) - bdRegMs(a));   // 21/07 (2ª): de la más RECIENTE a la más antigua (sort estable → empates conservan orden de hoja)
  BD_SHOWN = 0;
  $('#bd-count').textContent = `${BD_FILT.length.toLocaleString('es-CO')} registro(s)`;
  $('#bd-body').innerHTML = `<div class="bd-grid" id="bd-grid"></div>`;
  bdRenderMore();
}
function bdRenderMore() {
  const grid = $('#bd-grid'); if (!grid) return;
  const next = BD_FILT.slice(BD_SHOWN, BD_SHOWN + BD_BATCH);
  grid.insertAdjacentHTML('beforeend', next.map(bdCardHtml).join(''));
  BD_SHOWN += next.length;
  // enlaza acciones de las tarjetas recién pintadas
  $$('#bd-grid .bd-card').forEach(card => { if (card._wired) return; card._wired = true;
    card.querySelectorAll('.bd-btn').forEach(b => b.onclick = () => bdAccion(b.dataset.a, card.dataset.doc));
  });
  const more = $('#bd-more');
  if (BD_SHOWN < BD_FILT.length) {
    more.innerHTML = `<button class="btn btn-ghost" id="bd-more-btn">Ver más (${(BD_FILT.length - BD_SHOWN).toLocaleString('es-CO')} restantes)</button>`;
    $('#bd-more-btn').onclick = bdRenderMore;
  } else { more.innerHTML = ''; }
}

/* Actualiza (o inserta) una tarjeta en memoria + en el DOM */
function bdUpsertCard(card, _prepend) {
  const i = BD_ALL.findIndex(x => normDocJs(x.documento) === normDocJs(card.documento));
  const nuevo = i < 0;
  if (i >= 0) BD_ALL[i] = card; else BD_ALL.push(card);
  // 21/07 (2ª): con orden por recencia, un registro NUEVO se reordena y repinta
  // para caer en su sitio (el más reciente, arriba); no se antepone a ciegas.
  if (nuevo) return bdApplyFilter();
  const node = $(`#bd-grid .bd-card[data-doc="${cssq(card.documento)}"]`);
  if (node) { const nn = h(bdCardHtml(card)); nn._wired = true; nn.querySelectorAll('.bd-btn').forEach(b => b.onclick = () => bdAccion(b.dataset.a, card.documento)); node.replaceWith(nn); }
  else bdApplyFilter();   // en memoria pero fuera de la página pintada: repinta
}
const normDocJs = s => String(s == null ? '' : s).replace(/\D/g, '');
const cssq = s => String(s).replace(/"/g, '\\"');

function bdAccion(a, doc) {
  const card = BD_ALL.find(x => normDocJs(x.documento) === normDocJs(doc));
  if (a === 'detalles') return bdDetalles(doc);
  if (a === 'editar') return bdEditar(doc);
  if (a === 'consultar') return bdConsultar(doc, card);
  if (a === 'inactivar') return bdInactivar(doc, card);
}

/* ---- DETALLES ---- */
async function bdDetalles(doc) {
  openSheet(`<div class="grip"></div><h2 class="h2">Detalles</h2>${loadingBox('Cargando…')}`);
  try {
    const r = await api('priv.persona', { documento: doc, ...auth() });
    if (!r.ok) { closeLayer(); return toast(r.msg || 'No se pudo cargar', 'err'); }
    const p = r.persona;
    const orden = ['NOMBRE','DOCUMENTO','CONTACTO','RESIDENCIA','REFERENCIA','LIDER','DEPARTAMENTO','MUNICIPIO','PUESTO','DIRECCION','MESA','ESTADO','INTENCION','ASISTENCIA','FECHA_REGISTRO','FECHA_ACTUALIZACION','ID_USUARIO'];
    const ocultas = ['FOTO','QR_FILE']; // no se listan como texto (se muestran de otra forma)
    const keys = orden.filter(k => (k in p) && ocultas.indexOf(k) === -1)
      .concat(Object.keys(p).filter(k => orden.indexOf(k) === -1 && ocultas.indexOf(k) === -1));
    const rows = keys.map(k => `<div class="det-row"><span>${esc(k.replace(/_/g,' '))}</span><b>${esc(p[k] || '—')}</b></div>`).join('');
    const fotoUrl = bdFotoUrl(p['FOTO']);
    const fotoHtml = fotoUrl
      ? `<div class="det-foto"><img src="${esc(fotoUrl)}" alt="Foto" onerror="this.closest('.det-foto').remove()" /></div>`
      : '';
    openSheet(`<div class="grip"></div>
      <div class="det-head"><h2 class="h2">${r.esLider ? '★ ' : ''}${esc(p['NOMBRE'] || 'Detalles')}</h2><span class="bd-mun ${bdColor(p['MUNICIPIO'])}">${esc(p['MUNICIPIO'] || '—')}</span></div>
      ${fotoHtml}
      <div class="det-list">${rows}</div>
      <div class="stack" style="margin-top:16px;">
        <button class="btn btn-primary btn-block" id="det-edit">Editar</button>
        <button class="btn btn-quiet btn-block bd-btn-danger" id="det-inact" ${String(p['ESTADO']).toUpperCase()==='INACTIVO'?'disabled':''}>Inactivar</button>
        <button class="btn btn-quiet btn-block bd-btn-danger" id="det-elim">Eliminar</button>
      </div>`);
    /* Fase 9.2: la foto de Detalles se abre con el mismo visor de la pública */
    const fz = layer.querySelector('.det-foto img');
    if (fz) { fz.classList.add('zoomable'); fz.onclick = () => zoomImagen(fotoUrl); }
    $('#det-edit').onclick = () => { closeLayer(); bdEditar(doc); };
    $('#det-inact').onclick = () => { closeLayer(); bdInactivar(doc, BD_ALL.find(x => normDocJs(x.documento) === normDocJs(doc))); };
    $('#det-elim').onclick = () => { closeLayer(); bdEliminar(doc, BD_ALL.find(x => normDocJs(x.documento) === normDocJs(doc))); };
  } catch (e) { closeLayer(); toast('Error de conexión', 'err'); }
}

/* ---- EDITAR ---- */
async function bdEditar(doc) {
  openSheet(`<div class="grip"></div><h2 class="h2">Editar</h2>${loadingBox('Cargando…')}`);
  let p;
  try { const r = await api('priv.persona', { documento: doc, ...auth() }); if (!r.ok) { closeLayer(); return toast(r.msg, 'err'); } p = r.persona; }
  catch { closeLayer(); return toast('Error de conexión', 'err'); }
  openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:10px;">Editar registro</h2>
    <div class="stack">
      ${field('Documento', inputEl('e-doc', 'inputmode="numeric"'))}
      ${field('Nombre completo', inputEl('e-nombre'))}
      ${field('Contacto (WhatsApp)', inputEl('e-contacto', 'inputmode="numeric" maxlength="10"'))}
      ${field('Residencia', comboboxHtml('e-resi', 'Escribe para buscar…'))}
      ${field('Referencia (N° de líder)', inputEl('e-ref', 'inputmode="numeric" placeholder="Código del líder que refirió"'))}
      <button class="btn btn-primary btn-block" id="e-save">Guardar cambios</button>
    </div>`);
  $('#e-doc').value = p['DOCUMENTO'] || ''; $('#e-nombre').value = p['NOMBRE'] || '';
  $('#e-contacto').value = onlyDig(p['CONTACTO'] || ''); $('#e-ref').value = onlyDig(p['REFERENCIA'] || '');
  onlyDigits($('#e-doc')); onlyDigits($('#e-contacto')); onlyDigits($('#e-ref'));
  getResidencias().then(l => { bindCombobox('e-resi', l); $('#e-resi').value = p['RESIDENCIA'] || ''; });
  $('#e-save').onclick = async () => {
    const body = { ...auth(), documentoOriginal: doc, documento: onlyDig(val('e-doc')), nombre: val('e-nombre'), contacto: onlyDig(val('e-contacto')), residencia: val('e-resi'), referencia: onlyDig(val('e-ref')) };
    if (!/^\d{5,10}$/.test(body.documento)) return toast('Documento inválido', 'err');
    if (body.nombre.split(/\s+/).filter(Boolean).length < 2) return toast('Nombre: al menos 2 palabras', 'err');
    const btn = $('#e-save'); saving(btn, true);
    try {
      const r = await api('priv.personaEditar', {}, 'POST', body); saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
      closeLayer(); toast('Registro actualizado', 'ok'); bdUpsertCard(r.card);
    } catch (e) { toast('Error de conexión', 'err'); saving(btn, false); }
  };
}

/* ---- ELIMINAR (21/07) · borra la fila; pide la clave de eliminación ----
   Borra de PRINCIPAL y, si es líder, de LIDERES (sus referidos pasan al
   líder 1). El QR vuelve a la reserva. Distinto de Inactivar: es permanente. */
async function bdEliminar(doc, card) {
  card = card || BD_ALL.find(x => normDocJs(x.documento) === normDocJs(doc));
  const nombre = (card && card.nombre) || '';
  openSheet(`<div class="grip"></div>
    <h2 class="h2" style="margin-bottom:6px;">Eliminar registro</h2>
    <p class="muted small" style="margin-top:0;">${esc(nombre)} · CC ${esc(doc)}</p>
    <p class="muted small" style="color:var(--danger,#c0392b);margin-top:8px;">Esto <b>borra la fila</b> de forma permanente${card && card.esLider ? ' y también de <b>Líderes</b> (sus referidos pasan al líder 1)' : ''}. No se puede deshacer.</p>
    <label class="field" style="margin-top:12px;"><span>Clave de eliminación</span>
      <input class="input" id="elim-clave" inputmode="numeric" maxlength="6" placeholder="6 dígitos" autocomplete="off" /></label>
    <div class="stack" style="margin-top:14px;">
      <button class="btn btn-primary btn-block bd-btn-danger" id="elim-go">Eliminar definitivamente</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`, 'elim-sheet');
  const inp = $('#elim-clave'); if (inp) { onlyDigits(inp); inp.focus(); }
  $('#elim-go').onclick = async () => {
    const clave = String((inp && inp.value) || '').replace(/\D/g, '');
    if (!/^\d{6}$/.test(clave)) return toast('La clave es de 6 dígitos', 'err');
    const btn = $('#elim-go'); saving(btn, true);
    try {
      const r = await api('priv.personaEliminar', {}, 'POST', { ...auth(), documento: doc, clave });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo eliminar', 'err');
      closeLayer(); toast('Registro eliminado', 'ok'); bdRemoveCard(doc);
    } catch (e) { toast('Error de conexión', 'err'); saving(btn, false); }
  };
}

/* Quita una tarjeta de la lista en memoria y repinta (borrado en vivo). */
function bdRemoveCard(doc) {
  BD_ALL = BD_ALL.filter(x => normDocJs(x.documento) !== normDocJs(doc));
  const node = $(`#bd-grid .bd-card[data-doc="${cssq(doc)}"]`);
  if (node) node.remove();
  bdApplyFilter();
}

/* ---- INACTIVAR ---- */
async function bdInactivar(doc, card) {
  const ok = await confirmar('Inactivar registro', crow('Nombre', card && card.nombre) + crow('Documento', doc) + `<p class="muted small" style="margin-top:8px;">El registro quedará como INACTIVO y no podrá iniciar sesión en la app pública.</p>`);
  if (!ok) return;
  try {
    const r = await api('priv.personaInactivar', {}, 'POST', { ...auth(), documento: doc });
    if (!r.ok) return toast(r.msg || 'No se pudo inactivar', 'err');
    toast('Registro inactivado', 'ok'); bdUpsertCard(r.card);
  } catch (e) { toast('Error de conexión', 'err'); }
}

/* ---- CONSULTAR PUESTO (pegar de la Registraduría) ---- */
function bdConsultar(doc, card) {
  const url = BD_REG_URL || 'https://wsp.registraduria.gov.co/censo/consultar/';
  openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:6px;">Consultar puesto de votación</h2>
    <p class="muted small">La Registraduría no permite consulta automática. Copia el documento, ábrela, pega aquí el resultado y guárdalo.</p>
    <div class="cons-doc">
      <div><span class="bd-k">Documento</span><b id="cons-doc">${esc(doc)}</b></div>
      <button class="btn btn-ghost cons-copy" id="cons-copy">Copiar</button>
    </div>
    <a class="btn btn-ghost btn-block" id="cons-open" href="${esc(url)}" target="_blank" rel="noopener">Abrir Registraduría ↗</a>
    <label class="field" style="margin-top:12px;"><span>Pega aquí lo que copiaste de la tabla</span>
      <textarea class="input area" id="cons-paste" rows="4" placeholder="NUIP  DEPARTAMENTO  MUNICIPIO  PUESTO  DIRECCIÓN  MESA&#10;${esc(doc)}  TOLIMA  FLANDES  IE ...  AV ...  33"></textarea></label>
    <button class="btn btn-primary btn-block" id="cons-read">Leer datos</button>
    <div id="cons-step2"></div>`);
  $('#cons-copy').onclick = async () => { try { await navigator.clipboard.writeText(doc); toast('Documento copiado', 'ok'); } catch { toast('Copia manual: ' + doc); } };
  $('#cons-read').onclick = () => {
    const parsed = parseRegistraduria($('#cons-paste').value, doc);
    const v = parsed || { departamento:'', municipio:'', puesto:'', direccion:'', mesa:'' };
    $('#cons-step2').innerHTML = `
      <p class="eyebrow" style="margin:14px 0 6px;">Revisa y guarda</p>
      ${field('Departamento', inputEl('cn-dep'))}
      ${field('Municipio', inputEl('cn-mun'))}
      ${field('Puesto', inputEl('cn-pue'))}
      ${field('Dirección', inputEl('cn-dir'))}
      ${field('Mesa', inputEl('cn-mesa', 'inputmode="numeric"'))}
      <button class="btn btn-primary btn-block" id="cn-save" style="margin-top:8px;">Guardar puesto</button>`;
    $('#cn-dep').value = v.departamento; $('#cn-mun').value = v.municipio; $('#cn-pue').value = v.puesto; $('#cn-dir').value = v.direccion; $('#cn-mesa').value = v.mesa;
    if (!parsed) toast('No reconocí la tabla; escribe o corrige los campos.', 'err');
    $('#cn-save').onclick = async () => {
      const body = { ...auth(), documento: doc, departamento: val('cn-dep'), municipio: val('cn-mun'), puesto: val('cn-pue'), direccion: val('cn-dir'), mesa: val('cn-mesa') };
      if (!body.puesto && !body.mesa) return toast('Faltan datos del puesto', 'err');
      const btn = $('#cn-save'); saving(btn, true);
      try { const r = await api('priv.puestoGuardar', {}, 'POST', body); saving(btn, false);
        if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
        closeLayer(); toast('Puesto guardado', 'ok'); bdUpsertCard(r.card);
      } catch (e) { toast('Error de conexión', 'err'); saving(btn, false); }
    };
  };
}

/* Parser tolerante del texto pegado de la Registraduría.
   Prioriza filas separadas por TAB (copia de tabla). Devuelve la fila cuyo
   primer campo (NUIP) coincide con el documento, o la última fila de datos. */
function parseRegistraduria(text, targetDoc) {
  const t = String(text || '').replace(/\r/g, '');
  const tgt = normDocJs(targetDoc);
  const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
  let best = null, fallback = null;
  for (const line of lines) {
    let cells = line.split('\t').map(c => c.trim()).filter(c => c !== '');
    if (cells.length < 6) cells = line.split(/\s{2,}/).map(c => c.trim()).filter(Boolean); // 2+ espacios
    if (cells.length < 6) continue;
    const nuip = normDocJs(cells[0]);
    if (!/^\d{3,12}$/.test(nuip)) continue; // encabezado u otra línea
    const rec = { departamento: cells[1], municipio: cells[2], puesto: cells[3], direccion: cells[4], mesa: normDocJs(cells[cells.length - 1]) };
    fallback = rec;
    if (nuip === tgt) { best = rec; break; }
  }
  return best || fallback;
}

/* ---- AGREGAR nuevo contacto (documento primero, luego se desbloquea) ---- */
function bdAgregar() {
  openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:6px;">Agregar contacto</h2>
    <p class="muted small">Primero el documento: lo buscamos para no duplicar. Si está libre, se habilita el resto.</p>
    <div class="stack">
      <div class="ag-doc">
        ${field('Documento', inputEl('a-doc', 'inputmode="numeric"'))}
        <button class="btn btn-ghost" id="a-buscar">Buscar</button>
      </div>
      <div id="a-msg"></div>
      <fieldset id="a-rest" disabled class="ag-rest">
        ${field('Nombre completo', inputEl('a-nombre', 'placeholder="Nombres y apellidos"'))}
        ${field('Contacto (WhatsApp)', inputEl('a-contacto', 'inputmode="numeric" maxlength="10"'))}
        ${field('Residencia', comboboxHtml('a-resi', 'Escribe para buscar…'))}
        ${field('Referencia (N° de líder, opcional)', inputEl('a-ref', 'inputmode="numeric"'))}
        <button class="btn btn-primary btn-block" id="a-save">Guardar y crear tarjeta</button>
      </fieldset>
    </div>`);
  onlyDigits($('#a-doc')); onlyDigits($('#a-contacto')); onlyDigits($('#a-ref'));
  getResidencias().then(l => bindCombobox('a-resi', l));
  const unlock = (on) => { $('#a-rest').disabled = !on; };
  $('#a-buscar').onclick = async () => {
    const d = onlyDig(val('a-doc'));
    if (!/^\d{5,10}$/.test(d)) return toast('Documento inválido (5 a 10 dígitos)', 'err');
    const btn = $('#a-buscar'); saving(btn, true);
    try {
      const r = await api('priv.validarDoc', { documento: d, ...auth() }); saving(btn, false);
      if (r.existe) { $('#a-msg').innerHTML = `<div class="ag-warn">Ya existe: <b>${esc(r.nombre || d)}</b>. No se puede duplicar.</div>`; unlock(false); }
      else { $('#a-msg').innerHTML = `<div class="ag-ok">Documento disponible. Completa los datos.</div>`; unlock(true); $('#a-nombre').focus(); }
    } catch (e) { toast('Error de conexión', 'err'); saving(btn, false); }
  };
  $('#a-save').onclick = async () => {
    const body = { ...auth(), documento: onlyDig(val('a-doc')), nombre: val('a-nombre'), contacto: onlyDig(val('a-contacto')), residencia: val('a-resi'), referencia: onlyDig(val('a-ref')) };
    if (body.nombre.split(/\s+/).filter(Boolean).length < 2) return toast('Escribe el nombre completo', 'err');
    const btn = $('#a-save'); saving(btn, true);
    try {
      const r = await api('priv.personaAgregar', {}, 'POST', body); saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo crear', 'err');
      closeLayer(); toast('Contacto creado', 'ok');
      // asegurar que se vea (pestaña Todos) y anteponer
      $$('#bd-chips .bd-chip').forEach(x => x.classList.toggle('active', x.dataset.f === 'Todos'));
      if (($('#bd-q')||{}).value) $('#bd-q').value = '';
      bdUpsertCard(r.card, true);
    } catch (e) { toast('Error de conexión', 'err'); saving(btn, false); }
  };
}

/* Identidad del usuario logueado para los endpoints priv.* (va como `caller`
   para no colisionar con el `documento` de la persona objetivo) */
function auth() { return { caller: BD_ME }; }

/* ---------- Combobox con búsqueda (residencia) ---------- */
function comboboxHtml(id, ph) { return `<div class="combo" id="${id}-combo"><input class="input" id="${id}" placeholder="${esc(ph || 'Escribe para buscar…')}" autocomplete="off" /><div class="combo-list" id="${id}-list" hidden></div></div>`; }
function bindCombobox(id, options) {
  const input = $('#' + id), list = $('#' + id + '-list'); if (!input) return;
  const paint = (q) => {
    const f = (options || []).filter(o => String(o).toLowerCase().includes(String(q || '').toLowerCase())).slice(0, 60);
    list.innerHTML = f.length ? f.map(o => `<button type="button" class="combo-opt" data-v="${esc(o)}">${esc(o)}</button>`).join('') : `<div class="combo-empty">Sin resultados</div>`;
    list.querySelectorAll('.combo-opt').forEach(b => b.onclick = () => { input.value = b.dataset.v; list.hidden = true; });
  };
  input.onfocus = () => { paint(input.value); list.hidden = false; };
  input.oninput = () => { paint(input.value); list.hidden = false; };
}
document.addEventListener('click', (e) => { $$('.combo-list').forEach(l => { const c = l.closest('.combo'); if (c && !c.contains(e.target)) l.hidden = true; }); });


/* ============================================================
   DESCARGA de archivos base64 (Excel/PDF generados en el CORE)
   ============================================================ */
function downloadB64(base64, mime, filename) {
  try {
    const bin = atob(base64); const len = bin.length; const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename || 'archivo';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch (e) { toast('No se pudo descargar el archivo', 'err'); return false; }
}

/* ============================================================
   LÍDERES  (app privada · Módulo 4 · hoja LIDERES)
   Tarjetas con Ver / WhatsApp / Teléfono / Editar / Acciones + Agregar.
   Color por total de referidos (calculado en vivo en el CORE):
   >=50 verde · >=10 azul · <10 rojo.
   ============================================================ */
let LD_ALL = [], LD_ME = '', LD_FILT = [], LD_SHOWN = 0, LD_PLANT = null;
const LD_BATCH = 60;
function ldAuth() { return { caller: LD_ME }; }

/* ============================================================
   AJUSTES 16/07 · MEMORIA MENSUAL DE LÍDERES
   ------------------------------------------------------------
   El 1 de cada mes el CORE cierra el mes anterior: guarda el balance de
   todos los líderes, archiva las filas y deja ASISTENCIA e INTENCION en
   blanco para que los líderes las vuelvan a llenar desde la app pública.
   Aquí se consulta ese histórico y se descarga el PDF cuando se quiera.
   ============================================================ */
async function ldMemoria() {
  openSheet(`<div class="grip"></div><h2 class="h2">Memoria mensual</h2>${loadingBox('Cargando meses…')}`);
  try {
    const r = await api('priv.balances', ldAuth());
    if (!r.ok) { closeLayer(); return toast(r.msg || 'No se pudo cargar', 'err'); }
    const meses = r.meses || [];
    const lista = meses.length ? meses.map(m => `<article class="ld-mes">
        <div class="ld-mes-h">
          <b>${esc(m.mesTxt)}</b>
          <span class="ld-trab ${ldTrabColor(m.pct)}"><b>${m.pct}%</b> trab.</span>
        </div>
        <div class="ld-mes-m small muted">${m.lideres} líder(es) · ${Number(m.ref).toLocaleString('es-CO')} referidos · cerrado ${esc(m.fechaCierre || '—')}</div>
        <div class="ld-mes-acts">
          <button class="bd-btn" data-ver="${esc(m.mes)}">Ver</button>
          <button class="bd-btn" data-pdf="${esc(m.mes)}">${I.download} PDF</button>
        </div>
      </article>`).join('')
      : `<p class="muted center" style="padding:22px 0;">Todavía no hay ningún mes guardado.<br><span class="small">El primer cierre se hace solo el 1 de agosto: guarda julio, lo archiva y deja las columnas listas para el mes nuevo.</span></p>`;
    openSheet(`<div class="grip"></div>
      <h2 class="h2" style="margin-bottom:4px;">Memoria mensual</h2>
      <p class="muted small">Balance del trabajo de cada líder, guardado el primer día de cada mes.</p>
      <div class="ld-meses">${lista}</div>`);
    $$('#layer [data-ver]').forEach(b => b.onclick = () => ldMemoriaVer(b.dataset.ver));
    $$('#layer [data-pdf]').forEach(b => b.onclick = () => ldMemoriaPdf(b.dataset.pdf, b));
  } catch (e) { closeLayer(); toast('Error de conexión', 'err'); }
}

async function ldMemoriaVer(mes) {
  openSheet(`<div class="grip"></div><h2 class="h2">Balance</h2>${loadingBox('Cargando balance…')}`);
  try {
    const r = await api('priv.balanceVer', { mes, ...ldAuth() });
    if (!r.ok) { closeLayer(); return toast(r.msg || 'No se pudo cargar', 'err'); }
    const filas = r.items.map(x => `<tr>
        <td>#${esc(x.codigo)}</td><td class="ld-mes-td">${esc(x.lider)}</td><td>${x.ref}</td>
        <td>${x.firme}</td><td>${x.noVota}</td><td>${x.noSeguro}</td><td>${x.noSabe}</td>
        <td>${x.noContactado}</td><td>${x.noFid}</td><td><b class="${ldTrabColor(x.pct)}">${x.pct}%</b></td>
      </tr>`).join('');
    openSheet(`<div class="grip"></div>
      <div class="det-head"><h2 class="h2">${esc(r.mesTxt)}</h2><span class="small muted">${r.total} líder(es)</span></div>
      <div class="ld-mes-tabla">
        <table class="sim-table">
          <tr><th>#</th><th>Líder</th><th>Ref</th><th>Firme</th><th>No vota</th><th>No seguro(a)</th><th>No sabe</th><th>No contactado</th><th>No fidelizados</th><th>% trab.</th></tr>
          ${filas}
        </table>
      </div>
      <button class="btn btn-primary btn-block" id="ld-mes-pdf" style="margin-top:12px;">${I.download} Descargar PDF</button>`);
    $('#ld-mes-pdf').onclick = () => ldMemoriaPdf(mes, $('#ld-mes-pdf'));
  } catch (e) { closeLayer(); toast('Error de conexión', 'err'); }
}

async function ldMemoriaPdf(mes, btn) {
  if (btn) saving(btn, true);
  try {
    const r = await api('priv.balancePdf', {}, 'POST', { mes, ...ldAuth() });
    if (btn) saving(btn, false);
    if (!r.ok) return toast(r.msg || 'No se pudo generar', 'err');
    downloadB64(r.base64, r.mime, r.filename);
    toast('PDF generado', 'ok');
  } catch (e) { if (btn) saving(btn, false); toast('Error al generar el PDF', 'err'); }
}

function ldColor(ref) {
  const n = Number(ref) || 0;
  if (n >= 50) return 'ld-verde';
  if (n >= 10) return 'ld-azul';
  return 'ld-rojo';
}
const esMovilPriv = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

/* Texto de una ACCIÓN listo para WhatsApp.
   El .replace de %0A es RED DE SEGURIDAD: desde el Módulo 9.1 las plantillas
   se guardan con saltos de línea de verdad, así que no encuentra nada. Se
   deja por si alguien pega un texto viejo que todavía los traiga. Al enlace
   de WhatsApp el %0A se lo pone encodeURIComponent solito, en ldWaOpen. */
function ldWaText(tipo, c) {
  const t = (LD_PLANT && LD_PLANT[tipo]) || '';
  return t.replace(/\[NOMBRE\]/g, c.nombre || '')
          .replace(/\[CODIGO\]/g, c.codigo || '')
          .replace(/\[REFERIDOS\]/g, String(c.referidos || 0))
          .replace(/%0A/g, '\n');
}
/* Abre WhatsApp del líder con el texto prellenado (móvil vs PC, como el repo real) */
function ldWaOpen(numero, texto) {
  const num = String(numero || '').replace(/\D/g, '');
  if (!num) { toast('El líder no tiene número de WhatsApp', 'err'); return; }
  const url = esMovilPriv()
    ? ('whatsapp://send?phone=' + encodeURIComponent(num) + '&text=' + encodeURIComponent(texto || ''))
    : ('https://api.whatsapp.com/send?phone=' + encodeURIComponent(num) + '&text=' + encodeURIComponent(texto || ''));
  window.open(url, '_blank');
}

/* ---- AJUSTES 16/07 · barra de trabajo del líder ----
   % DE TRABAJO = intenciones registradas ÷ referidos (regla del usuario).
   Cuenta CUALQUIER valor en INTENCION: "No vota con nosotros" y "No
   contactado" (= no responde) también son trabajo. Lo que queda VACÍO es
   "No fidelizado": nadie lo llamó. */
function ldTrabColor(p) { return p >= 80 ? 'ld-verde' : p >= 40 ? 'ld-azul' : 'ld-rojo'; }
function ldBarraHtml(c) {
  const ref = Number(c.referidos || 0);
  const pct = Number(c.pctTrabajo || 0);
  if (!ref) return `<div class="ld-bar-wrap"><div class="ld-bar-lbl"><span class="muted small">Sin referidos todavía</span></div></div>`;
  return `<div class="ld-bar-wrap">
      <div class="ld-bar-lbl">
        <span><b>${ref.toLocaleString('es-CO')}</b> ref.</span>
        <span class="ld-trab ${ldTrabColor(pct)}"><b>${pct}%</b> trab.</span>
      </div>
      <div class="ld-bar" title="${Number(c.trabajadas || 0).toLocaleString('es-CO')} de ${ref.toLocaleString('es-CO')} referidos con intención registrada">
        <div class="ld-bar-in ${ldTrabColor(pct)}" style="width:${Math.max(pct ? 2 : 0, pct)}%"></div>
      </div>
    </div>`;
}

function ldCardHtml(c) {
  const tel = c.contacto ? String(c.contacto).replace(/^57/, '') : '';
  return `<article class="bd-card ld-card ${ldColor(c.referidos)}" data-cod="${esc(c.codigo)}">
    <div class="bd-top">
      <div class="bd-id">
        <b class="bd-nombre"><span class="ld-cod">#${esc(c.codigo)}</span> ${esc(c.nombre || 'Sin nombre')}</b>
        <span class="bd-doc">CC ${esc(c.documento || '—')}</span>
      </div>
      <span class="ld-refs ${ldColor(c.referidos)}">${Number(c.referidos || 0).toLocaleString('es-CO')} ref.</span>
    </div>
    ${ldBarraHtml(c)}
    <div class="bd-meta">
      <span><span class="bd-k">Residencia</span> ${esc(c.residencia || '—')}</span>
      <span><span class="bd-k">Padrino</span> ${esc(c.padrino || '—')}</span>
    </div>
    <div class="bd-acts ld-acts">
      <button class="bd-btn" data-a="ver">Ver</button>
      <button class="bd-btn ld-ic ld-btn-wa" data-a="wa" ${c.contacto ? '' : 'disabled'} title="WhatsApp">${I.wa}</button>
      ${esMovilPriv() ? `<button class="bd-btn ld-ic ld-btn-tel" data-a="tel" ${tel ? '' : 'disabled'} title="Llamar">${I.phone}</button>` : ''}
      <button class="bd-btn ld-ic" data-a="editar" title="Editar">${I.pencil}</button>
      <button class="bd-btn ld-ic ld-btn-acc" data-a="acciones" title="Acciones">${I.dots}</button>
    </div>
  </article>`;
}

async function viewLideres(user) {
  LD_ME = user.documento; appWide(true);
  app.innerHTML = `${backbar('Líderes')}
    <div class="pad">
      <div class="bd-toolbar">
        <div class="bd-search"><input class="input" id="ld-q" placeholder="Buscar por código, nombre, documento, residencia o padrino…" autocomplete="off" /></div>
        <button class="btn btn-ghost" id="ld-memoria">${I.chart} Memoria mensual</button>
        <button class="btn btn-primary bd-add" id="ld-add">+ Agregar</button>
      </div>
      <div class="ld-legend">
        <span class="ld-leg ld-rojo">&lt; 10</span>
        <span class="ld-leg ld-azul">10 – 49</span>
        <span class="ld-leg ld-verde">50 o más</span>
        <span class="small muted">referidos por líder</span>
      </div>
      <div class="bd-count" id="ld-count"></div>
      <div id="ld-body">${loadingBox('Cargando líderes…')}</div>
      <div class="center" id="ld-more" style="margin-top:12px;"></div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('home');
  $('#ld-add').onclick = () => ldAgregar();
  $('#ld-memoria').onclick = () => ldMemoria();
  try {
    const r = await api('priv.lideres', ldAuth());
    if (!r.ok) { $('#ld-body').innerHTML = `<p class="muted center">No se pudo cargar.</p>`; return; }
    LD_ALL = r.items || []; LD_PLANT = r.plantillas || null;
    ldApplyFilter();
  } catch (e) { $('#ld-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; }
  const q = $('#ld-q'); let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(ldApplyFilter, 160); };

  vivoBind('lideres', LD_ME, vivoLideres);   // EN VIVO
}

/* ---- EN VIVO · Líderes ---- (la lista es chica: se recarga entera) */
async function vivoLideres() {
  const r = await api('priv.lideres', ldAuth(), 'GET', null, SILENCIO);
  if (!r.ok || !vivoCambio(JSON.stringify(r.items))) return;
  LD_ALL = r.items || []; LD_PLANT = r.plantillas || LD_PLANT;
  ldApplyFilter(); vivoCerrarHoja();
}

function ldApplyFilter() {
  const q = ((($('#ld-q') || {}).value) || '').trim().toLowerCase();
  LD_FILT = LD_ALL.filter(c => {
    if (!q) return true;
    const hay = ('#' + c.codigo + ' ' + (c.nombre || '') + ' ' + (c.documento || '') + ' ' + (c.residencia || '') + ' ' + (c.padrino || '')).toLowerCase();
    return hay.includes(q);
  });
  LD_SHOWN = 0;
  const cEl = $('#ld-count'); if (cEl) cEl.textContent = `${LD_FILT.length.toLocaleString('es-CO')} líder(es)`;
  const body = $('#ld-body'); if (body) body.innerHTML = `<div class="bd-grid" id="ld-grid"></div>`;
  ldRenderMore();
}
function ldRenderMore() {
  const grid = $('#ld-grid'); if (!grid) return;
  const next = LD_FILT.slice(LD_SHOWN, LD_SHOWN + LD_BATCH);
  grid.insertAdjacentHTML('beforeend', next.map(ldCardHtml).join(''));
  LD_SHOWN += next.length;
  $$('#ld-grid .ld-card').forEach(card => {
    if (card._wired) return; card._wired = true;
    card.querySelectorAll('.bd-btn').forEach(b => b.onclick = () => ldAccion(b.dataset.a, card.dataset.cod));
  });
  const more = $('#ld-more');
  if (LD_SHOWN < LD_FILT.length) {
    more.innerHTML = `<button class="btn btn-ghost" id="ld-more-btn">Ver más (${(LD_FILT.length - LD_SHOWN).toLocaleString('es-CO')} restantes)</button>`;
    $('#ld-more-btn').onclick = ldRenderMore;
  } else more.innerHTML = '';
}
function ldFind(cod) { return LD_ALL.find(x => String(x.codigo) === String(cod)); }
function ldUpsertCard(card, prepend) {
  const i = LD_ALL.findIndex(x => String(x.codigo) === String(card.codigo));
  if (i >= 0) LD_ALL[i] = card; else if (prepend) LD_ALL.unshift(card); else LD_ALL.push(card);
  const node = $(`#ld-grid .ld-card[data-cod="${cssq(card.codigo)}"]`);
  if (node) {
    const nn = h(ldCardHtml(card)); nn._wired = true;
    nn.querySelectorAll('.bd-btn').forEach(b => b.onclick = () => ldAccion(b.dataset.a, card.codigo));
    node.replaceWith(nn);
  } else ldApplyFilter();
}
function ldAccion(a, cod) {
  const c = ldFind(cod);
  if (a === 'ver') return ldVer(cod);
  if (a === 'wa') return (c && c.contacto) ? ldWaOpen(c.contacto, '') : toast('Sin número de WhatsApp', 'err');
  if (a === 'tel') { if (c && c.contacto) location.href = 'tel:+' + String(c.contacto).replace(/\D/g, ''); else toast('Sin número', 'err'); return; }
  if (a === 'editar') return ldEditar(cod);
  if (a === 'acciones') return ldAcciones(cod);
}

/* ---- VER ---- */
async function ldVer(cod) {
  openSheet(`<div class="grip"></div><h2 class="h2">Líder</h2>${loadingBox('Cargando…')}`);
  try {
    const r = await api('priv.liderVer', { codigo: cod, ...ldAuth() });
    if (!r.ok) { closeLayer(); return toast(r.msg || 'No se pudo cargar', 'err'); }
    const c = r.lider;
    const tel = c.telLocal || (c.contacto ? String(c.contacto).replace(/^57/, '') : '');
    const rows = [
      ['Código', '#' + c.codigo],
      ['Nombre', c.nombre],
      ['Documento', c.documento],
      ['WhatsApp', tel || '—'],
      ['Residencia', c.residencia || '—'],
      ['Padrino', c.padrino || '—'],
      ['Correo', c.correo || '—'],
      ['Total referidos', Number(c.referidos || 0).toLocaleString('es-CO')],
      ['Trabajo del mes', `${Number(c.pctTrabajo || 0)}% (${Number(c.trabajadas || 0).toLocaleString('es-CO')} con intención)`],
      ['En base de datos', c.enPrincipal ? 'Sí' : 'No'],
      ['Municipio', c.municipio || '—'],
      ['Puesto', c.puesto || '—'],
      ['Mesa', c.mesa || '—']
    ].map(([k, v]) => `<div class="det-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
    openSheet(`<div class="grip"></div>
      <div class="det-head"><h2 class="h2">#${esc(c.codigo)} · ${esc(c.nombre)}</h2><span class="ld-refs ${ldColor(c.referidos)}">${Number(c.referidos || 0).toLocaleString('es-CO')} ref.</span></div>
      ${ldDesgloseHtml(c)}
      <div class="det-list">${rows}</div>
      <div class="ld-ver-acts">
        <button class="btn btn-ghost" id="v-wa" ${c.contacto ? '' : 'disabled'}>${I.wa} WhatsApp</button>
        ${esMovilPriv() ? `<button class="btn btn-ghost" id="v-tel" ${tel ? '' : 'disabled'}>${I.phone} Llamar</button>` : ''}
      </div>
      <div class="stack" style="margin-top:12px;">
        <button class="btn btn-quiet btn-block" id="v-refs">${I.users} Referidos (${Number(c.referidos || 0).toLocaleString('es-CO')})</button>
        <button class="btn btn-primary btn-block" id="v-edit">Editar</button>
        <button class="btn btn-quiet btn-block" id="v-acc">Acciones (mensajes)</button>
      </div>`);
    $('#v-refs').onclick = () => ldReferidos(c.codigo, c.nombre, c.referidos);
    $('#v-wa').onclick = () => ldWaOpen(c.contacto, '');
    if ($('#v-tel')) $('#v-tel').onclick = () => { location.href = 'tel:+' + String(c.contacto || '').replace(/\D/g, ''); };
    $('#v-edit').onclick = () => { closeLayer(); ldEditar(cod); };
    $('#v-acc').onclick = () => { closeLayer(); ldAcciones(cod); };
  } catch (e) { closeLayer(); toast('Error de conexión', 'err'); }
}

/* ---- REFERIDOS del líder (B2 · 18/07) ----
   Tabla estilo asistencia de eventos (reusa .asis-*), filtro LOCAL (no en
   vivo), buena en móvil (data-l), y Excel con selección de columnas igual
   que la Base de Datos. Los datos se piden UNA vez (priv.liderReferidos) y
   se filtran/paginan en el cliente; el Excel exporta lo filtrado. */
let RF_ALL = [], RF_FILT = [], RF_SHOWN = 0, RF_COLS = [], RF_COD = '', RF_NOMBRE = '';
let RF_SEL = null;   // 22/07: null = modo normal · Set(documentos) = modo selección
const RF_BATCH = 50;
const rfNorm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

async function ldReferidos(cod, nombre, refCount) {
  RF_COD = cod; RF_NOMBRE = nombre || ''; RF_SEL = null;
  openSheet(`<div class="grip"></div>
    <div class="det-head"><h2 class="h2">Referidos · ${esc(nombre || ('#' + cod))}</h2>
      <span class="ld-refs">${Number(refCount || 0).toLocaleString('es-CO')} ref.</span></div>
    ${loadingBox('Cargando referidos…')}`, 'sheet-xl');
  let r;
  try { r = await api('priv.liderReferidos', { codigo: cod, ...ldAuth() }); }
  catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  if (!r || !r.ok) { closeLayer(); return toast((r && r.msg) || 'No se pudo cargar', 'err'); }
  RF_ALL = r.items || []; RF_COLS = r.columnas || [];
  rfRender();
}

/* Pinta la hoja de referidos desde memoria (sin volver a pedir datos) */
function rfRender() {
  openSheet(`<div class="grip"></div>
    <div class="det-head"><h2 class="h2">Referidos · ${esc(RF_NOMBRE || ('#' + RF_COD))}</h2>
      <span class="ld-refs">${RF_ALL.length.toLocaleString('es-CO')} ref.</span></div>
    <section class="asis-sec">
      <div class="asis-head">
        <div class="bd-search"><input class="input" id="rf-q" placeholder="Buscar por documento, nombre, contacto, residencia, municipio, puesto o mesa…" autocomplete="off" /></div>
        <button class="btn btn-ghost asis-xls" id="rf-xls" ${RF_ALL.length ? '' : 'hidden'}>${I.download} Excel</button>
      </div>
      <div class="rf-acts" id="rf-acts" ${RF_ALL.length ? '' : 'hidden'}>${rfActsHtml()}</div>
      <div id="rf-body"></div>
    </section>
    <div class="stack" style="margin-top:12px;">
      <button class="btn btn-quiet btn-block" id="rf-back">Volver al líder</button>
    </div>`, 'sheet-xl');
  const q = $('#rf-q'); let t;
  if (q) q.oninput = () => { clearTimeout(t); t = setTimeout(rfApply, 160); };
  const xls = $('#rf-xls'); if (xls) xls.onclick = rfExcel;
  const back = $('#rf-back'); if (back) back.onclick = () => ldVer(RF_COD);
  rfBindActs();
  rfApply();
}

/* ---- SELECCIÓN MÚLTIPLE + REASIGNAR (22/07) ----
   Los botones viven en el encabezado de la hoja, no en cada fila. En
   reposo solo se ve "Seleccionar"; al tocarlo el mismo botón pasa a ser
   "Asignar Seleccionado(s) (N)" y aparecen "Todos" y "Cancelar". La
   selección se guarda por DOCUMENTO, así que sobrevive al buscador y al
   paginado ("Ver más"). */
function rfActsHtml() {
  if (!RF_SEL) return `<button class="btn btn-ghost" id="rf-sel">Seleccionar</button>`;
  const n = RF_SEL.size;
  const todos = RF_FILT.length && RF_FILT.every(x => RF_SEL.has(String(x.documento)));
  return `<button class="btn btn-primary" id="rf-asig">Asignar Seleccionado(s)${n ? ` (${n.toLocaleString('es-CO')})` : ''}</button>
    <button class="btn btn-ghost" id="rf-todos">${todos ? 'Ninguno' : 'Todos'}</button>
    <button class="btn btn-quiet" id="rf-cancel">Cancelar</button>`;
}

function rfBindActs() {
  const box = $('#rf-acts'); if (!box) return;
  const sel = $('#rf-sel'); if (sel) sel.onclick = () => { RF_SEL = new Set(); rfPaintActs(); rfApply(); };
  const can = $('#rf-cancel'); if (can) can.onclick = () => { RF_SEL = null; rfPaintActs(); rfApply(); };
  const asg = $('#rf-asig'); if (asg) asg.onclick = rfReasignar;
  const tod = $('#rf-todos'); if (tod) tod.onclick = () => {
    const todos = RF_FILT.length && RF_FILT.every(x => RF_SEL.has(String(x.documento)));
    RF_FILT.forEach(x => { const d = String(x.documento); if (todos) RF_SEL.delete(d); else RF_SEL.add(d); });
    rfPaintActs(); rfPaintChecks();
  };
}

/* Repinta solo la barra de botones (para no perder el scroll de la tabla) */
function rfPaintActs() {
  const box = $('#rf-acts'); if (!box) return;
  box.innerHTML = rfActsHtml();
  rfBindActs();
}

/* Sincroniza las casillas ya pintadas con el Set (tras "Todos"/"Ninguno") */
function rfPaintChecks() {
  const tb = $('#rf-tb'); if (!tb || !RF_SEL) return;
  tb.querySelectorAll('tr[data-doc]').forEach(tr => {
    const on = RF_SEL.has(String(tr.dataset.doc));
    tr.classList.toggle('rf-on', on);
    const ck = tr.querySelector('.rf-ck'); if (ck) ck.checked = on;
  });
}

/* Click en una fila (delegado en el tbody): alterna su selección */
function rfRowClick(ev) {
  if (!RF_SEL) return;
  const tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-doc]') : null;
  if (!tr) return;
  const d = String(tr.dataset.doc || ''); if (!d) return;
  if (RF_SEL.has(d)) RF_SEL.delete(d); else RF_SEL.add(d);
  const on = RF_SEL.has(d);
  tr.classList.toggle('rf-on', on);
  const ck = tr.querySelector('.rf-ck'); if (ck) ck.checked = on;
  rfPaintActs();
}

/* Reasigna TODOS los seleccionados al mismo líder, en una sola llamada */
function rfReasignar() {
  if (!RF_SEL || !RF_SEL.size) return toast('Toca las filas que quieres mover (o usa "Todos")');
  const docs = Array.from(RF_SEL);
  const fuera = docs.filter(d => !RF_FILT.some(x => String(x.documento) === d)).length;
  const lideres = (typeof LD_ALL !== 'undefined' && LD_ALL.length ? LD_ALL : []).filter(l => String(l.codigo) !== String(RF_COD));
  const label = l => `#${l.codigo} · ${l.nombre}`;
  openSheet(`<div class="grip"></div>
    <h2 class="h2">Reasignar líder</h2>
    <p class="muted small" style="margin:-4px 0 10px;">${docs.length.toLocaleString('es-CO')} referido(s) seleccionado(s)${fuera ? ` · ${fuera.toLocaleString('es-CO')} fuera del filtro actual` : ''}</p>
    <div class="reasg-cur"><span>Líder actual</span><b>${esc('#' + RF_COD + (RF_NOMBRE ? ' · ' + RF_NOMBRE : ''))}</b></div>
    <label class="field" style="margin-top:12px;"><span>Nuevo líder</span>${comboboxHtml('reasg-lid', 'Escribe para buscar líder…')}</label>
    <button class="btn btn-primary btn-block" id="reasg-save" style="margin-top:14px;">Reasignar</button>
    <button class="btn btn-quiet btn-block" id="reasg-back" style="margin-top:8px;">Volver a referidos</button>`, 'reasg-sheet');
  bindCombobox('reasg-lid', lideres.map(label));
  const inp = $('#reasg-lid'); if (inp) inp.focus();
  const back = $('#reasg-back'); if (back) back.onclick = rfRender;
  $('#reasg-save').onclick = async () => {
    const v = String((inp && inp.value) || '').trim();
    const m = /^#(\d+)/.exec(v);
    if (!m) return toast('Elige un líder de la lista', 'err');
    const code = m[1];
    if (String(code) === String(RF_COD)) return toast('Ese ya es su líder', 'err');
    const btn = $('#reasg-save'); saving(btn, true);
    try {
      const r = await api('priv.personaReasignarLote', {}, 'POST', { caller: LD_ME, documentos: docs, referencia: code });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo reasignar', 'err');
      const movidos = new Set(docs);
      RF_ALL = RF_ALL.filter(x => !movidos.has(String(x.documento)));
      const n = Number(r.n || docs.length);
      const src = ldFind(RF_COD); if (src) src.referidos = Math.max(0, Number(src.referidos || 0) - n);
      const dst = ldFind(code);   if (dst) dst.referidos = Number(dst.referidos || 0) + n;
      ldApplyFilter();
      RF_SEL = null;
      toast(`${n.toLocaleString('es-CO')} referido(s) reasignado(s)`, 'ok');
      rfRender();
    } catch (e) { toast('Error de conexión', 'err'); saving(btn, false); }
  };
}

function rfApply() {
  const qEl = $('#rf-q'); const q = qEl ? rfNorm(qEl.value).trim() : '';
  RF_FILT = !q ? RF_ALL.slice() : RF_ALL.filter(x =>
    rfNorm([x.documento, x.nombre, x.contacto, x.residencia, x.municipio, x.puesto, x.mesa].join(' ')).includes(q));
  RF_SHOWN = 0;
  rfPaintActs();
  const body = $('#rf-body'); if (!body) return;
  if (!RF_FILT.length) {
    body.innerHTML = `<p class="muted center small" style="padding:14px 0;">${RF_ALL.length ? 'Ningún referido coincide con la búsqueda.' : 'Este líder no tiene referidos todavía.'}</p>`;
    return;
  }
  body.innerHTML = `<div class="asis-wrap ${RF_SEL ? 'rf-picking' : ''}"><table class="asis-t">
      <thead><tr><th class="asis-i">#</th><th>Documento</th><th>Nombre</th><th>Contacto</th><th>Residencia</th><th>Municipio</th><th>Puesto</th><th>Mesa</th></tr></thead>
      <tbody id="rf-tb"></tbody></table></div>
    <div class="center" id="rf-more" style="margin-top:10px;"></div>`;
  const tb = $('#rf-tb'); if (tb) tb.onclick = rfRowClick;
  rfMore();
}

function rfMore() {
  const tb = $('#rf-tb'); if (!tb) return;
  const next = RF_FILT.slice(RF_SHOWN, RF_SHOWN + RF_BATCH);
  tb.insertAdjacentHTML('beforeend', next.map((x, i) => `<tr data-doc="${esc(x.documento || '')}" class="${RF_SEL && RF_SEL.has(String(x.documento)) ? 'rf-on' : ''}">
      <td class="asis-i" data-l="#">${RF_SEL ? `<input type="checkbox" class="rf-ck" ${RF_SEL.has(String(x.documento)) ? 'checked' : ''} />` : (RF_SHOWN + i + 1).toLocaleString('es-CO')}</td>
      <td data-l="Documento">${esc(x.documento || '—')}</td>
      <td data-l="Nombre"><b>${esc(x.nombre || '—')}</b></td>
      <td data-l="Contacto">${esc(x.contacto ? String(x.contacto).replace(/^57/, '') : '—')}</td>
      <td data-l="Residencia">${esc(x.residencia || '—')}</td>
      <td data-l="Municipio">${esc(x.municipio || '—')}</td>
      <td data-l="Puesto">${esc(x.puesto || '—')}</td>
      <td data-l="Mesa">${esc(x.mesa || '—')}</td>
    </tr>`).join(''));
  RF_SHOWN += next.length;
  const more = $('#rf-more'); if (!more) return;
  if (RF_SHOWN < RF_FILT.length) {
    more.innerHTML = `<button class="btn btn-ghost" id="rf-more-btn">Ver más (${(RF_FILT.length - RF_SHOWN).toLocaleString('es-CO')} restantes)</button>`;
    $('#rf-more-btn').onclick = rfMore;
  } else more.innerHTML = '';
}

/* Excel con selección de columnas (igual que la Base de Datos): exporta lo FILTRADO */
function rfExcel() {
  const docs = RF_FILT.map(x => x.documento).filter(Boolean);
  if (!docs.length) return toast('No hay referidos en el filtro actual', 'err');
  const cols = RF_COLS.length ? RF_COLS : ['DOCUMENTO', 'NOMBRE', 'CONTACTO', 'RESIDENCIA', 'MUNICIPIO', 'PUESTO', 'MESA'];
  const pref = new Set(['DOCUMENTO', 'NOMBRE', 'CONTACTO', 'RESIDENCIA', 'MUNICIPIO', 'PUESTO', 'MESA']);
  const marcadas = new Set(cols.filter(c => pref.has(String(c).toUpperCase())));
  openSheet(`<div class="grip"></div>
    <h2 class="h2" style="margin-bottom:4px;">Exportar a Excel</h2>
    <p class="muted small">${docs.length.toLocaleString('es-CO')} referido(s) · ${esc(RF_NOMBRE || ('#' + RF_COD))}. Elige las columnas:</p>
    <div class="col-pick" id="rf-colpick">
      ${cols.map(c => `<label class="col-opt"><input type="checkbox" data-c="${esc(c)}" ${marcadas.has(c) ? 'checked' : ''}/> <span>${esc(String(c).replace(/_/g, ' '))}</span></label>`).join('')}
    </div>
    <div class="stack" style="margin-top:12px;">
      <button class="btn btn-primary btn-block" id="rf-colgo">${I.download} Descargar Excel</button>
      <button class="btn btn-quiet btn-block" id="rf-colback">Volver a referidos</button>
    </div>`, 'sheet-xl');
  $('#rf-colback').onclick = rfRender;
  $('#rf-colgo').onclick = async () => {
    const columnas = $$('#rf-colpick input:checked').map(i => i.dataset.c);
    if (!columnas.length) return toast('Elige al menos una columna', 'err');
    const btn = $('#rf-colgo'); saving(btn, true);
    try {
      const r = await api('priv.liderReferidosExcel', {}, 'POST', { caller: LD_ME, codigo: RF_COD, documentos: docs, columnas });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo generar', 'err');
      downloadB64(r.base64, r.mime, r.filename);
      toast('Archivo generado', 'ok');
    } catch (e) { saving(btn, false); toast('Error al generar el archivo', 'err'); }
  };
}

/* ---- AJUSTES 16/07 · desglose de intenciones del líder ----
   Solo se pintan las intenciones REGISTRADAS (las que están en cero no se
   pintan) + "No fidelizados", que son las filas sin intención. */
function ldDesgloseHtml(c) {
  const ref = Number(c.referidos || 0);
  if (!ref) return '';
  const filas = (c.desglose || []).map(d =>
    `<div class="ld-dg-row">
       <span class="ld-dg-k">${esc(d.label)} <b>${d.pct}%</b></span>
       <span class="ld-dg-n">${Number(d.n).toLocaleString('es-CO')}</span>
     </div>`).join('');
  const noFid = Number(c.noFidelizados || 0);
  const noFidHtml = noFid
    ? `<div class="ld-dg-row ld-dg-nofid">
         <span class="ld-dg-k">No fidelizados <b>${Number(c.pctNoFidelizados || 0)}%</b></span>
         <span class="ld-dg-n">${noFid.toLocaleString('es-CO')}</span>
       </div>` : '';
  return `<div class="ld-dg">
      ${ldBarraHtml(c)}
      ${filas || `<p class="small muted" style="margin:2px 0 0;">Todavía no hay intenciones registradas este mes.</p>`}
      ${noFidHtml}
      <p class="small muted ld-dg-nota">Sin intención registrada = no fidelizado (nadie lo ha contactado). “No contactado” sí es trabajo: lo llamaron y no responde.</p>
    </div>`;
}

/* ---- ACCIONES (Código · Tarea · No tarea) — WhatsApp prellenado o BuilderBot ---- */
function ldAcciones(cod) {
  const c = ldFind(cod);
  if (!c) return toast('Líder no encontrado', 'err');
  const items = [
    { tipo: 'codigo',  titulo: 'Código (bienvenida)', desc: 'Envía su N° de referido y cómo usar la app.' },
    { tipo: 'tarea',   titulo: 'Tarea OK',            desc: 'Felicita por la tarea bien hecha.' },
    { tipo: 'notarea', titulo: 'No tarea',            desc: 'Recuerda amablemente la meta de referidos.' }
  ];
  const bloques = items.map(it => {
    const texto = ldWaText(it.tipo, c);
    return `<div class="ld-acc-block">
      <div class="ld-acc-head"><b>${esc(it.titulo)}</b><span class="small muted">${esc(it.desc)}</span></div>
      <div class="ld-acc-prev">${esc(texto)}</div>
      <div class="ld-acc-btns">
        <button class="btn btn-primary" data-wa="${it.tipo}" ${c.contacto ? '' : 'disabled'}>${I.wa} Abrir WhatsApp</button>
        <button class="btn btn-ghost" data-bot="${it.tipo}" ${c.contacto ? '' : 'disabled'}>Enviar por bot</button>
      </div>
    </div>`;
  }).join('');
  openSheet(`<div class="grip"></div>
    <div class="det-head"><h2 class="h2">Acciones · ${esc(c.nombre)}</h2><span class="bd-doc">#${esc(c.codigo)} · ${Number(c.referidos || 0).toLocaleString('es-CO')} ref.</span></div>
    ${c.contacto ? '' : '<div class="ag-warn">Este líder no tiene número de WhatsApp registrado.</div>'}
    <div class="ld-acc-list">${bloques}</div>`);
  layer.querySelectorAll('[data-wa]').forEach(b => b.onclick = () => ldWaOpen(c.contacto, ldWaText(b.dataset.wa, c)));
  layer.querySelectorAll('[data-bot]').forEach(b => {
    const orig = b.innerHTML; let armed = false, timer = null;
    b.onclick = async () => {
      if (b.disabled) return;
      if (!armed) {
        armed = true; b.classList.add('ld-armed'); b.textContent = '¿Confirmar envío?';
        timer = setTimeout(() => { armed = false; b.classList.remove('ld-armed'); b.innerHTML = orig; }, 3500);
        return;
      }
      clearTimeout(timer); armed = false; b.classList.remove('ld-armed');
      b.disabled = true; b.innerHTML = '<span class="spinner spinner-brand"></span>';
      try {
        const r = await api('priv.liderAccion', {}, 'POST', { ...ldAuth(), codigo: c.codigo, tipo: b.dataset.bot });
        toast(r.msg || (r.ok ? 'Mensaje enviado' : 'No se pudo enviar'), r.ok ? 'ok' : 'err');
      } catch (e) { toast('Error de conexión', 'err'); }
      b.disabled = false; b.innerHTML = orig;
    };
  });
}

/* ---- EDITAR (no permite código existente; documento/contraseña fijos) ---- */
async function ldEditar(cod) {
  openSheet(`<div class="grip"></div><h2 class="h2">Editar líder</h2>${loadingBox('Cargando…')}`);
  let c, meta;
  try {
    const [rv, rm] = await Promise.all([api('priv.liderVer', { codigo: cod, ...ldAuth() }), api('priv.liderNuevoMeta', ldAuth())]);
    if (!rv.ok) { closeLayer(); return toast(rv.msg, 'err'); }
    c = rv.lider; meta = rm;
  } catch { closeLayer(); return toast('Error de conexión', 'err'); }
  const padrinos = (meta.lideres || []).map(l => l.nombre).filter(n => n && n !== c.nombre);
  openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:10px;">Editar líder</h2>
    <div class="stack">
      ${field('Código', inputEl('le-cod', 'inputmode="numeric"'))}
      ${field('Nombre completo', inputEl('le-nombre'))}
      ${field('Documento (no editable)', inputEl('le-doc', 'disabled'))}
      ${field('WhatsApp', inputEl('le-wa', 'inputmode="numeric" maxlength="10"'))}
      ${field('Residencia', comboboxHtml('le-resi', 'Escribe para buscar…'))}
      ${field('Padrino', comboboxHtml('le-padrino', 'Líder que lo refirió (opcional)'))}
      ${field('Correo (opcional)', inputEl('le-correo', 'inputmode="email"'))}
      <button class="btn btn-primary btn-block" id="le-save">Guardar cambios</button>
    </div>`);
  $('#le-cod').value = c.codigo || ''; $('#le-nombre').value = c.nombre || '';
  $('#le-doc').value = c.documento || '';
  $('#le-wa').value = c.telLocal || (c.contacto ? String(c.contacto).replace(/^57/, '') : '');
  $('#le-correo').value = c.correo || '';
  onlyDigits($('#le-cod')); onlyDigits($('#le-wa'));
  getResidencias().then(l => { bindCombobox('le-resi', l); $('#le-resi').value = c.residencia || ''; });
  bindCombobox('le-padrino', padrinos); $('#le-padrino').value = c.padrino || '';
  $('#le-save').onclick = async () => {
    const body = { ...ldAuth(), codigoOriginal: cod, codigo: onlyDig(val('le-cod')), nombre: val('le-nombre'), contacto: onlyDig(val('le-wa')), residencia: val('le-resi'), padrino: val('le-padrino'), correo: val('le-correo') };
    if (!/^\d+$/.test(body.codigo) || Number(body.codigo) < 1) return toast('Código inválido', 'err');
    if (body.nombre.split(/\s+/).filter(Boolean).length < 2) return toast('Nombre: al menos 2 palabras', 'err');
    if (body.contacto && body.contacto.length !== 10) return toast('WhatsApp: 10 dígitos', 'err');
    const btn = $('#le-save'); saving(btn, true);
    try {
      const r = await api('priv.liderEditar', {}, 'POST', body); saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
      closeLayer(); toast('Líder actualizado', 'ok'); ldUpsertCard(r.card);
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}

/* ---- AGREGAR líder (documento primero; crea en base si no existe) ---- */
async function ldAgregar() {
  openSheet(`<div class="grip"></div><h2 class="h2">Registro de líder</h2>${loadingBox('Preparando…')}`);
  let meta;
  try { meta = await api('priv.liderNuevoMeta', ldAuth()); }
  catch { closeLayer(); return toast('Error de conexión', 'err'); }
  const padrinos = (meta.lideres || []).map(l => l.nombre);
  openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:6px;">Registro de líder</h2>
    <p class="muted small">Primero el documento: si ya está en la base, se usa; si no, se crea también en la base. El líder no se duplica.</p>
    <div class="stack">
      ${field('Código', inputEl('la-cod', 'inputmode="numeric"'))}
      <div class="ag-doc">
        ${field('Documento del líder', inputEl('la-doc', 'inputmode="numeric"'))}
        <button class="btn btn-ghost" id="la-buscar">Buscar</button>
      </div>
      <div id="la-msg"></div>
      <fieldset id="la-rest" disabled class="ag-rest">
        ${field('Nombre completo', inputEl('la-nombre', 'placeholder="Nombres y apellidos"'))}
        ${field('WhatsApp', inputEl('la-wa', 'inputmode="numeric" maxlength="10"'))}
        ${field('Residencia', comboboxHtml('la-resi', 'Escribe para buscar…'))}
        ${field('Padrino (opcional)', comboboxHtml('la-padrino', 'Líder que lo refirió'))}
        ${field('Correo (opcional)', inputEl('la-correo', 'inputmode="email"'))}
        <p class="muted small">La contraseña del líder será su documento.</p>
        <button class="btn btn-primary btn-block" id="la-save">Guardar líder</button>
      </fieldset>
    </div>`);
  $('#la-cod').value = meta.sugerido || '';
  onlyDigits($('#la-cod')); onlyDigits($('#la-doc')); onlyDigits($('#la-wa'));
  getResidencias().then(l => bindCombobox('la-resi', l));
  bindCombobox('la-padrino', padrinos);
  const unlock = (on) => { $('#la-rest').disabled = !on; };
  let creaEnBase = false;
  $('#la-buscar').onclick = async () => {
    const d = onlyDig(val('la-doc'));
    if (!/^\d{5,10}$/.test(d)) return toast('Documento inválido (5 a 10 dígitos)', 'err');
    const btn = $('#la-buscar'); saving(btn, true);
    try {
      const r = await api('priv.liderBuscarDoc', { documento: d, ...ldAuth() }); saving(btn, false);
      if (!r.ok) { $('#la-msg').innerHTML = `<div class="ag-warn">${esc(r.msg || 'Documento inválido')}</div>`; unlock(false); return; }
      if (r.yaLider) { $('#la-msg').innerHTML = `<div class="ag-warn">Ya es líder (código <b>#${esc(r.codigo)}</b>): <b>${esc(r.nombre || '')}</b>. No se puede duplicar.</div>`; unlock(false); return; }
      if (r.enPrincipal) {
        creaEnBase = false;
        $('#la-msg').innerHTML = `<div class="ag-ok">Está en la base: <b>${esc(r.nombre || '')}</b>. Confirma o ajusta y guarda.</div>`;
        unlock(true);
        $('#la-nombre').value = r.nombre || ''; $('#la-wa').value = (r.contacto || ''); $('#la-resi').value = r.residencia || '';
      } else {
        creaEnBase = true;
        $('#la-msg').innerHTML = `<div class="ag-ok">No está en la base: se creará también con estos datos.</div>`;
        unlock(true); $('#la-nombre').focus();
      }
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
  $('#la-save').onclick = async () => {
    const cod = onlyDig(val('la-cod'));
    if (!/^\d+$/.test(cod) || Number(cod) < 1) return toast('Código inválido', 'err');
    const body = { ...ldAuth(), codigo: cod, documento: onlyDig(val('la-doc')), nombre: val('la-nombre'), contacto: onlyDig(val('la-wa')), residencia: val('la-resi'), padrino: val('la-padrino'), correo: val('la-correo') };
    if (!/^\d{5,10}$/.test(body.documento)) return toast('Documento inválido', 'err');
    if (creaEnBase) {
      if (body.nombre.split(/\s+/).filter(Boolean).length < 2) return toast('Escribe el nombre completo', 'err');
      if (body.contacto.length !== 10) return toast('WhatsApp: 10 dígitos', 'err');
      if (!body.residencia) return toast('Indica la residencia', 'err');
    }
    const btn = $('#la-save'); saving(btn, true);
    try {
      const r = await api('priv.liderAgregar', {}, 'POST', body); saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo crear', 'err');
      closeLayer(); toast('Líder registrado', 'ok');
      if (($('#ld-q') || {}).value) $('#ld-q').value = '';
      ldUpsertCard(r.card, true);
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}

/* ============================================================
   DASHBOARD  (análisis de registros · barras Flandes vs otro)
   ============================================================ */
let DASH_ROWS = [], DASH_COLS = [], DASH_ME = '';
let DASH_GROUP = 'residencia', DASH_TOPN = 15, DASH_Q = '';
let DASH_SOLO_PUESTO = false, DASH_SIN_REG = false;
const DASH_INT = new Set();
let DASH_RESI_ALL = null;
const DASH_TOPN_OPTS = [10, 15, 25, 50, 0]; // 0 = Todas

async function viewDashboard(user) {
  DASH_ME = user.documento; appWide(true);
  app.innerHTML = `${backbar('Dashboard')}
    <div class="pad">
      <div id="dash-controls"></div>
      <div id="dash-body">${loadingBox('Analizando registros…')}</div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('bd');
  try {
    const r = await api('priv.dashboard', { caller: DASH_ME });
    if (!r.ok) { $('#dash-body').innerHTML = `<p class="muted center">No se pudo cargar.</p>`; return; }
    DASH_ROWS = r.rows || []; DASH_COLS = r.columnas || [];
    DASH_GROUP = 'residencia'; DASH_TOPN = 15; DASH_Q = ''; DASH_SOLO_PUESTO = false; DASH_SIN_REG = false; DASH_INT.clear();
    dashRenderControls(); dashRender();
  } catch (e) { $('#dash-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; }

  vivoBind('bd', DASH_ME, vivoDashboard);   // EN VIVO: el Dashboard sale de PRINCIPAL → canal 'bd'
}

/* ---- EN VIVO · Dashboard ----
   Cambia una persona en otro equipo y las gráficas se recalculan solas. Se
   conservan los controles tal como los dejó el usuario (agrupación, Top N,
   búsqueda, filtros): solo se cambian los datos por debajo. */
async function vivoDashboard() {
  const r = await api('priv.dashboard', { caller: DASH_ME }, 'GET', null, SILENCIO);
  if (!r.ok || !vivoCambio(JSON.stringify(r.rows))) return;
  DASH_ROWS = r.rows || []; DASH_COLS = r.columnas || DASH_COLS;
  dashRender(); vivoCerrarHoja();
}

function dashIntValues() {
  const c = {};
  DASH_ROWS.forEach(r => { if (r.intencion) c[r.intencion] = (c[r.intencion] || 0) + 1; });
  return Object.keys(c).sort((a, b) => c[b] - c[a]);
}

function dashRenderControls() {
  const ints = dashIntValues();
  $('#dash-controls').innerHTML = `
    <div class="dash-toolbar">
      <div class="bd-search"><input class="input" id="dash-q" placeholder="Buscar zona o puesto…" autocomplete="off" value="${esc(DASH_Q)}" /></div>
    </div>
    <div class="dash-segs">
      <div class="seg" id="dash-group">
        <button class="seg-b ${DASH_GROUP === 'residencia' ? 'active' : ''}" data-g="residencia">Por residencia</button>
        <button class="seg-b ${DASH_GROUP === 'puesto' ? 'active' : ''}" data-g="puesto">Por puesto</button>
      </div>
      <label class="dash-top"><span class="small muted">Top</span>
        <select class="input dash-select" id="dash-topn">
          ${DASH_TOPN_OPTS.map(n => `<option value="${n}" ${n === DASH_TOPN ? 'selected' : ''}>${n === 0 ? 'Todas' : n}</option>`).join('')}
        </select></label>
    </div>
    <div class="dash-toggles">
      <button class="bd-chip ${DASH_SOLO_PUESTO ? 'active' : ''}" id="dash-solopuesto">Solo con puesto asignado</button>
      <button class="bd-chip ${DASH_SIN_REG ? 'active' : ''} ${DASH_GROUP === 'puesto' ? 'hidden' : ''}" id="dash-sinreg">Incluir zonas sin registros</button>
    </div>
    ${ints.length ? `<div class="bd-chips bd-chips-int" id="dash-int"><span class="bd-chips-lbl">Intención:</span>
      ${ints.map(v => `<button class="bd-chip bd-chip-int ${DASH_INT.has(v) ? 'active' : ''}" data-int="${esc(v)}">${esc(v)}</button>`).join('')}</div>` : ''}
    <div class="dash-exports">
      <button class="btn btn-ghost" id="dash-xls">${I.download} Excel</button>
      <button class="btn btn-ghost" id="dash-pdf">${I.pdf} PDF</button>
    </div>`;
  let t;
  $('#dash-q').oninput = (e) => { DASH_Q = e.target.value; clearTimeout(t); t = setTimeout(dashRender, 160); };
  $$('#dash-group .seg-b').forEach(b => b.onclick = () => { DASH_GROUP = b.dataset.g; dashRenderControls(); dashRender(); });
  $('#dash-topn').onchange = (e) => { DASH_TOPN = parseInt(e.target.value, 10); dashRender(); };
  $('#dash-solopuesto').onclick = () => { DASH_SOLO_PUESTO = !DASH_SOLO_PUESTO; dashRenderControls(); dashRender(); };
  const sr = $('#dash-sinreg'); if (sr) sr.onclick = async () => { DASH_SIN_REG = !DASH_SIN_REG; if (DASH_SIN_REG && !DASH_RESI_ALL) DASH_RESI_ALL = await getResidencias(); dashRenderControls(); dashRender(); };
  $$('#dash-int .bd-chip-int').forEach(ch => ch.onclick = () => { const v = ch.dataset.int; if (DASH_INT.has(v)) DASH_INT.delete(v); else DASH_INT.add(v); dashRenderControls(); dashRender(); });
  $('#dash-xls').onclick = () => dashExport('excel');
  $('#dash-pdf').onclick = () => dashExport('pdf');
}

/* Filas que pasan los filtros de datos (intención + solo con puesto) */
function dashFilteredRows() {
  return DASH_ROWS.filter(r => {
    if (DASH_SOLO_PUESTO && (!r.puesto || r.puesto === '(Sin puesto)')) return false;
    if (DASH_INT.size && !DASH_INT.has(r.intencion)) return false;
    return true;
  });
}
/* Agrupa por residencia|puesto → verde (Flandes) / rojo (otro) */
function dashAggregate(rows) {
  const key = DASH_GROUP === 'puesto' ? 'puesto' : 'residencia';
  const g = {};
  rows.forEach(r => { const k = r[key] || '(Sin dato)'; if (!g[k]) g[k] = { z: k, g: 0, r: 0 }; if (r.esFlandes) g[k].g++; else g[k].r++; });
  let arr = Object.keys(g).map(k => ({ z: g[k].z, g: g[k].g, r: g[k].r, t: g[k].g + g[k].r }));
  if (DASH_SIN_REG && key === 'residencia' && DASH_RESI_ALL) {
    const have = {}; arr.forEach(x => have[String(x.z).toUpperCase()] = true);
    DASH_RESI_ALL.forEach(z => { if (!have[String(z).toUpperCase()]) arr.push({ z: z, g: 0, r: 0, t: 0 }); });
  }
  const q = DASH_Q.trim().toLowerCase();
  if (q) arr = arr.filter(x => String(x.z).toLowerCase().includes(q));
  arr.sort((a, b) => b.t - a.t || String(a.z).localeCompare(b.z));
  return arr;
}
function dashRender() {
  const rows = dashFilteredRows();
  const agg = dashAggregate(rows);
  const total = rows.length, flandes = rows.filter(r => r.esFlandes).length;
  const pct = total ? Math.round(flandes * 100 / total) : 0;
  const zonasConReg = agg.filter(x => x.t > 0).length;
  const shown = DASH_TOPN === 0 ? agg : agg.slice(0, DASH_TOPN);
  const maxT = agg.reduce((m, x) => Math.max(m, x.t), 1);

  const bars = shown.map(x => {
    const gw = Math.round(x.g / maxT * 100), rw = Math.round(x.r / maxT * 100);
    return `<div class="dbar">
      <div class="dbar-head"><span class="dbar-z" title="${esc(x.z)}">${esc(x.z)}</span><span class="dbar-t">${x.t.toLocaleString('es-CO')}</span></div>
      <div class="dbar-track"><div class="dbar-g" style="width:${gw}%"></div><div class="dbar-r" style="width:${rw}%"></div></div>
      <div class="dbar-legend"><span class="dot-g"></span>${x.g} en Flandes <span class="dot-r"></span>${x.r} otro</div>
    </div>`;
  }).join('') || `<p class="muted center" style="padding:20px 0;">Sin datos para el filtro actual.</p>`;

  // Mini-distribución por intención (de las filas filtradas)
  const ic = {}; rows.forEach(r => { const k = r.intencion || '(Sin dato)'; ic[k] = (ic[k] || 0) + 1; });
  const iArr = Object.keys(ic).map(k => ({ k, n: ic[k] })).sort((a, b) => b.n - a.n);
  const iMax = iArr.reduce((m, x) => Math.max(m, x.n), 1);
  const intBars = iArr.map(x => `<div class="ibar"><span class="ibar-l" title="${esc(x.k)}">${esc(x.k)}</span>
      <div class="ibar-track"><div class="ibar-fill" style="width:${Math.round(x.n / iMax * 100)}%"></div></div>
      <span class="ibar-n">${x.n.toLocaleString('es-CO')}</span></div>`).join('');

  $('#dash-body').innerHTML = `
    <div class="dash-kpis">
      <div class="dk"><b>${total.toLocaleString('es-CO')}</b><span>Registros</span></div>
      <div class="dk"><b>${flandes.toLocaleString('es-CO')}</b><span>Vota en Flandes</span></div>
      <div class="dk"><b>${pct}%</b><span>% en Flandes</span></div>
      <div class="dk"><b>${zonasConReg.toLocaleString('es-CO')}</b><span>${DASH_GROUP === 'puesto' ? 'Puestos' : 'Zonas'}</span></div>
    </div>
    <div class="dash-card">
      <div class="dash-card-h"><b>${DASH_GROUP === 'puesto' ? 'Registros por puesto' : 'Registros por zona de residencia'}</b>
        <span class="dash-key"><span class="dot-g"></span> Flandes <span class="dot-r"></span> Otro municipio</span></div>
      ${bars}
      ${DASH_TOPN !== 0 && agg.length > DASH_TOPN ? `<p class="small muted center" style="margin-top:8px;">Mostrando top ${DASH_TOPN} de ${agg.length.toLocaleString('es-CO')} · usa la búsqueda o cambia el Top.</p>` : ''}
    </div>
    ${iArr.length ? `<div class="dash-card"><div class="dash-card-h"><b>Distribución por intención de voto</b></div>${intBars}</div>` : ''}`;
}

function dashExport(tipo) {
  const rows = dashFilteredRows();
  const q = DASH_Q.trim().toLowerCase();
  const key = DASH_GROUP === 'puesto' ? 'puesto' : 'residencia';
  const finales = q ? rows.filter(r => String(r[key] || '').toLowerCase().includes(q)) : rows;
  const docs = finales.map(r => r.documento).filter(Boolean);
  if (!docs.length) return toast('No hay registros en el filtro actual', 'err');
  const pref = ['NOMBRE', 'DOCUMENTO', 'CONTACTO', 'RESIDENCIA', 'MUNICIPIO', 'PUESTO', 'MESA', 'INTENCION'];
  const checked = new Set(DASH_COLS.filter(c => pref.indexOf(String(c).toUpperCase()) !== -1));
  openSheet(`<div class="grip"></div>
    <h2 class="h2" style="margin-bottom:4px;">Exportar a ${tipo === 'excel' ? 'Excel' : 'PDF'}</h2>
    <p class="muted small">${docs.length.toLocaleString('es-CO')} registro(s) del filtro actual. Elige las columnas:</p>
    <div class="col-pick" id="col-pick">
      ${DASH_COLS.map(c => `<label class="col-opt"><input type="checkbox" data-c="${esc(c)}" ${checked.has(c) ? 'checked' : ''}/> <span>${esc(String(c).replace(/_/g, ' '))}</span></label>`).join('')}
    </div>
    <button class="btn btn-primary btn-block" id="col-go" style="margin-top:12px;">${I.download} Descargar ${tipo === 'excel' ? 'Excel' : 'PDF'}</button>`);
  $('#col-go').onclick = async () => {
    const columnas = $$('#col-pick input:checked').map(i => i.dataset.c);
    if (!columnas.length) return toast('Elige al menos una columna', 'err');
    const btn = $('#col-go'); saving(btn, true);
    try {
      const action = tipo === 'excel' ? 'priv.dashExcel' : 'priv.dashPdf';
      const r = await api(action, {}, 'POST', { caller: DASH_ME, documentos: docs, columnas, groupBy: DASH_GROUP, topN: DASH_TOPN || 15 });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo generar', 'err');
      downloadB64(r.base64, r.mime, r.filename);
      closeLayer(); toast('Archivo generado', 'ok');
    } catch (e) { saving(btn, false); toast('Error al generar el archivo', 'err'); }
  };
}

/* ============================================================
   SIMULADOR  (potencial Flandes vs votos reales)
   ============================================================ */
let SIM = null, SIM_ME = '', SIM_Q = '';
async function viewSimulador(user) {
  SIM_ME = user.documento; appWide(true); SIM_Q = '';
  app.innerHTML = `${backbar('Simulador')}
    <div class="pad">
      <div id="sim-body">${loadingBox('Simulando votación…')}</div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('bd');
  try {
    const r = await api('priv.simulador', { caller: SIM_ME });
    if (!r.ok) { $('#sim-body').innerHTML = `<p class="muted center">No se pudo cargar.</p>`; return; }
    SIM = r; elecSet(r.eleccion); simRender();
  } catch (e) { $('#sim-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; }

  vivoBind('bd', SIM_ME, vivoSimulador);   // EN VIVO: el Simulador también sale de PRINCIPAL
}

/* ---- EN VIVO · Simulador ---- */
async function vivoSimulador() {
  const r = await api('priv.simulador', { caller: SIM_ME }, 'GET', null, SILENCIO);
  /* El `now` del servidor se toma SIEMPRE (aunque los puestos no cambien):
     es la resincronización del regresivo. Lo que se ahorra es el repintado. */
  if (!r.ok) return;
  elecSet(r.eleccion);
  if (!vivoCambio(JSON.stringify(r.puestos) + JSON.stringify(r.eleccion.fecha) + r.eleccion.horaInicio + r.eleccion.horaFin)) return;
  SIM = r; simRender(); vivoCerrarHoja();
}
function simRender() {
  const t = SIM.totales;
  const q = SIM_Q.trim().toLowerCase();
  const puestos = q ? SIM.puestos.filter(p => String(p.puesto).toLowerCase().includes(q)) : SIM.puestos;
  const maxReg = SIM.puestos.reduce((m, x) => Math.max(m, x.registros), 1);
  const bars = puestos.map((x, i) => {
    const w = Math.round(x.registros / maxReg * 100);
    const mesas = x.mesas.map(m => `<tr><td>Mesa ${esc(m.mesa)}</td><td>${m.registros.toLocaleString('es-CO')}</td><td>${pctES(m.pct)}</td></tr>`).join('');
    return `<div class="sbar" data-i="${i}">
      <div class="sbar-head"><span class="sbar-p" title="${esc(x.puesto)}">${esc(x.puesto)}</span><span class="sbar-n">${x.registros.toLocaleString('es-CO')} reg. · <b>${pctES(x.pct)}</b></span></div>
      <div class="sbar-track"><div class="sbar-real" style="width:${w}%"></div></div>
      <button class="sbar-toggle" data-t="${i}">Ver mesas (${x.mesas.length})</button>
      <div class="sbar-mesas hidden" id="sm-${i}"><table class="sim-table"><tr><th>Mesa</th><th>Registros</th><th>Conversión</th></tr>${mesas}</table></div>
    </div>`;
  }).join('') || `<p class="muted center" style="padding:20px 0;">Sin puestos para mostrar.</p>`;

  $('#sim-body').innerHTML = `
    ${elecCronoHtml('sim-crono', 'dias')}
    <div class="dash-kpis">
      <div class="dk"><b>${t.registros.toLocaleString('es-CO')}</b><span>Registros en Flandes</span></div>
      <div class="dk"><b>${t.puestos.toLocaleString('es-CO')}</b><span>Puestos</span></div>
      <div class="dk"><b>${t.mesas.toLocaleString('es-CO')}</b><span>Mesas</span></div>
    </div>
    <p class="small muted" style="margin:2px 0 8px;">Los votos que se obtendrían si votara todo el que está registrado con municipio de votación <b>Flandes</b>. La <b>conversión</b> de un puesto es su peso sobre el total de Flandes; la de una mesa, su peso dentro de su propio puesto.</p>
    <div class="bd-search" style="margin-bottom:10px;"><input class="input" id="sim-q" placeholder="Buscar puesto…" autocomplete="off" value="${esc(SIM_Q)}" /></div>
    <div class="sim-list">${bars}</div>
    <button class="btn btn-primary btn-block" id="sim-pdf" style="margin-top:14px;">${I.pdf} Generar informe PDF</button>`;
  elecCronoBind('sim-crono', 'dias');
  let tm; $('#sim-q').oninput = (e) => { SIM_Q = e.target.value; clearTimeout(tm); tm = setTimeout(simRender, 160); };
  $$('.sbar-toggle').forEach(b => b.onclick = () => { const el = $('#sm-' + b.dataset.t); if (el) el.classList.toggle('hidden'); });
  $('#sim-pdf').onclick = async () => {
    const btn = $('#sim-pdf'); saving(btn, true);
    try {
      const r = await api('priv.simuladorPdf', {}, 'POST', { caller: SIM_ME });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo generar', 'err');
      downloadB64(r.base64, r.mime, r.filename);
      toast('Informe generado', 'ok');
    } catch (e) { saving(btn, false); toast('Error al generar el PDF', 'err'); }
  };
}



/* ============================================================
   VOTACIÓN  (tablero EN VIVO de votos · Excel/PDF)
   Los votos se registran desde la app de escaneo (aparte);
   aquí llegan y se ven en vivo por PUESTO, MESA y LÍDER.
   ============================================================ */
const VOTO_FBCFG = {
  apiKey: "AIzaSyBB1cMPenIxVI0kkgUWQmsbjMRehf7tMLM",
  authDomain: "jhonny-perdomo.firebaseapp.com",
  databaseURL: "https://jhonny-perdomo-default-rtdb.firebaseio.com",
  projectId: "jhonny-perdomo",
  storageBucket: "jhonny-perdomo.firebasestorage.app",
  messagingSenderId: "67514766764",
  appId: "1:67514766764:web:a75b677b43df7787515609",
  measurementId: "G-KBPJGFRTCP"
};
let VOTO_ME = '', VOTO_TAB = 'porPuesto', VOTO_Q = '';
let VOTO_TALLY = { total: 0, porPuesto: [], porMesa: [], porLider: [] };
let VOTO_poll = null, VOTO_fb = null, VOTO_ref = null, VOTO_onVal = null, VOTO_reloadT = null, VOTO_last = 0;

function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s); }); }
async function loadFirebase() { if (window.firebase && window.firebase.database) return window.firebase; const b = 'https://www.gstatic.com/firebasejs/10.12.2/'; await loadScript(b + 'firebase-app-compat.js'); await loadScript(b + 'firebase-database-compat.js'); return window.firebase; }

function votoTeardown() {
  if (VOTO_poll) { clearInterval(VOTO_poll); VOTO_poll = null; }
  if (ELEC.timer) { clearInterval(ELEC.timer); ELEC.timer = null; }
  if (VOTO_ref && VOTO_onVal) { try { VOTO_ref.off('value', VOTO_onVal); } catch (e) {} }
  VOTO_onVal = null;
  if (VOTO_reloadT) { clearTimeout(VOTO_reloadT); VOTO_reloadT = null; }
}

async function viewVotacion(user) {
  VOTO_ME = user.documento; appWide(true);
  VOTO_TAB = 'porPuesto'; VOTO_Q = '';
  votoTeardown(); window.__votoTeardown = votoTeardown;

  app.innerHTML = `${backbar('Votación')}
    <div class="pad">
      <p class="voto-note">Los votos se registran desde la app de escaneo. Aquí llegan y se ven <b>en vivo</b> por puesto, mesa y líder.</p>
      ${elecCronoHtml('voto-crono', 'horas')}
      <div class="voto-total" id="voto-total"></div>
      <div class="seg voto-tabs" id="voto-tabs">
        <button class="seg-b active" data-t="porPuesto">Puesto</button>
        <button class="seg-b" data-t="porMesa">Mesa</button>
        <button class="seg-b" data-t="porLider">Líder</button>
      </div>
      <div class="bd-search" style="margin:8px 0;"><input class="input" id="voto-q" placeholder="Buscar…" autocomplete="off"></div>
      <div id="voto-counters">${loadingBox('Cargando votos…')}</div>
      <div class="dash-exports" style="margin-top:14px;">
        <button class="btn btn-ghost" id="voto-xls">${I.download} Excel</button>
        <button class="btn btn-ghost" id="voto-pdf">${I.pdf} PDF</button>
      </div>
      <button class="btn btn-ghost btn-block" id="voto-refresh" style="margin-top:2px;">Actualizar ahora</button>
    </div>`;
  app.hidden = false; hideSplash();

  $('#backbtn').onclick = () => { votoTeardown(); window.__votoTeardown = null; go('bd'); };
  $$('#voto-tabs .seg-b').forEach(b => b.onclick = () => { VOTO_TAB = b.dataset.t; $$('#voto-tabs .seg-b').forEach(x => x.classList.toggle('active', x === b)); votoRenderCounters(); });
  let tq; $('#voto-q').oninput = (e) => { VOTO_Q = e.target.value; clearTimeout(tq); tq = setTimeout(votoRenderCounters, 140); };
  $('#voto-xls').onclick = () => votoExport('excel');
  $('#voto-pdf').onclick = () => votoExport('pdf');
  $('#voto-refresh').onclick = () => votoLoad(true);

  await votoLoad(false);
  elecCronoBind('voto-crono', 'horas');
  VOTO_poll = setInterval(() => votoLoad(false), 7000); // refresco en vivo desde la hoja
  votoInitFirebase();                                    // + señal instantánea si Firebase está disponible
}

async function votoLoad(manual) {
  try {
    /* 17/07: el refresco de fondo (sondeo de 7 s y señal) va EN SILENCIO —
       sin loader. Solo el botón "Actualizar ahora" muestra carga. */
    const r = await api('voto.contadores', { caller: VOTO_ME }, 'GET', null, manual ? {} : SILENCIO);
    /* cada sondeo trae la hora del servidor → el regresivo se resincroniza */
    if (r.ok) { VOTO_TALLY = r.tally; elecSet(r.eleccion); VOTO_last = Date.now(); votoRenderCounters(); if (manual) toast('Actualizado', 'ok'); }
  } catch (e) { if (manual) toast('No se pudo actualizar', 'err'); }
}

/* Firebase RTDB como SEÑAL de cambio.
   17/07/2026 — CORREGIDO: esto escuchaba /votacion, un nodo que NADIE escribía
   (ni la app ni ninguno de los .gs del CORE): era código muerto y el tablero
   vivía solo del sondeo de 7 s. Ahora escucha /meta/votacion_rev, que SÍ se
   escribe: voto.registrar toca el timbre en el router (Vivo.gs). El sondeo de
   7 s se mantiene tal cual como respaldo. */
function votoInitFirebase() {
  loadFirebase().then(fb => {
    VOTO_fb = fb;
    (fb.apps && fb.apps.length) ? fb.app() : fb.initializeApp(VOTO_FBCFG);
    VOTO_ref = fb.database().ref('meta/votacion_rev');
    VOTO_onVal = VOTO_ref.on('value', () => {
      if (VOTO_reloadT) return;
      VOTO_reloadT = setTimeout(() => { VOTO_reloadT = null; votoLoad(false); }, 600);
    }, () => {});
  }).catch(() => {});
}

function votoRenderCounters() {
  const totEl = $('#voto-total'); if (!totEl) return;
  const hora = VOTO_last ? new Date(VOTO_last).toLocaleTimeString('es-CO') : '';
  const base = VOTO_TALLY.base || 0;
  totEl.innerHTML = `<div class="voto-total-n">${(VOTO_TALLY.total || 0).toLocaleString('es-CO')}</div>
    <div class="voto-total-l"><span class="voto-live">● EN VIVO</span> votos registrados${hora ? ' · ' + hora : ''}</div>
    ${base ? `<div class="voto-total-c">${pctES(VOTO_TALLY.pct)} de conversión · ${base.toLocaleString('es-CO')} registros en Flandes</div>` : ''}`;
  let list = VOTO_TALLY[VOTO_TAB] || [];
  const q = VOTO_Q.trim().toLowerCase();
  if (q) list = list.filter(x => String(x.label).toLowerCase().includes(q));
  const max = list.reduce((m, x) => Math.max(m, x.n), 1);
  /* AJUSTE 17/07: junto al conteo va la CONVERSIÓN contra los registros de
     esa etiqueta (puesto/mesa/líder). La barra sigue midiendo votos contra el
     puesto más votado — si midiera el porcentaje, con 1 voto de 1031 no se
     vería absolutamente nada. El número dice la verdad fina; la barra, quién
     va adelante. */
  $('#voto-counters').innerHTML = list.map(x => `<div class="vc-row">
      <div class="vc-head"><span class="vc-lbl" title="${esc(x.label)}">${esc(x.label)}</span><span class="vc-n">${x.n.toLocaleString('es-CO')}<small class="vc-pct">${pctBase(x)}</small></span></div>
      <div class="vc-track"><div class="vc-fill" style="width:${Math.round(x.n / max * 100)}%"></div></div>
      <div class="vc-sub">${x.base ? `de ${x.base.toLocaleString('es-CO')} registros` : 'sin registros en Flandes con esta etiqueta'}</div>
    </div>`).join('') || `<p class="muted center" style="padding:16px 0;">Sin votos${q ? ' para la búsqueda' : ' aún'}.</p>`;
}

async function votoExport(tipo) {
  const btn = tipo === 'excel' ? $('#voto-xls') : $('#voto-pdf'); saving(btn, true);
  try {
    const r = await api(tipo === 'excel' ? 'voto.excel' : 'voto.informePdf', {}, 'POST', { caller: VOTO_ME });
    saving(btn, false);
    if (!r.ok) return toast(r.msg || 'No se pudo generar', 'err');
    downloadB64(r.base64, r.mime, r.filename); toast('Archivo generado', 'ok');
  } catch (e) { saving(btn, false); toast('Error al generar el archivo', 'err'); }
}

/* ---------- Barra superior con avatar/rol y salir ----------
   Fase 9.2: el avatar del Inicio se comporta igual que el de la app pública
   (avatarHtml/avatarBox): si hay foto la abre con zoom, si no hay la sube.
   El lápiz siempre abre el menú de foto. La foto sale de USUARIOS.FOTO y la
   trae priv.login; una sesión guardada de ANTES de esta versión no la tiene
   (user.foto === undefined) → cae con gracia a las iniciales, y se refresca
   sola con priv.miPerfil al entrar al Inicio. */
function avatarHtmlPriv(user) {
  const ini = esc(iniciales(user.nombre));
  const foto = fotoUsuarioPriv(user);
  const inner = foto
    ? `<div class="mark has-photo" id="avatarBox"><img src="${esc(foto)}" alt="" onerror="this.parentNode.classList.remove('has-photo');this.replaceWith(document.createTextNode('${ini}'))"/></div>`
    : `<div class="mark" id="avatarBox">${ini}</div>`;
  return `<div class="avatar-wrap">${inner}<button class="avatar-edit" id="avatarEdit" title="Editar foto" aria-label="Editar foto">${I.pencil}</button></div>`;
}
/* La foto del panel: '' si no hay, o si quedó apuntando a la imagen por defecto */
function fotoUsuarioPriv(user) {
  const f = String((user && user.foto) || '').trim();
  if (!f || f.toLowerCase().indexOf(FOTO_DEFAULT_PRIV) !== -1) return '';
  return f;
}
function appbar(user, titulo) {
  return `<div class="appbar">
    ${avatarHtmlPriv(user)}
    <div class="who"><b>${esc(titulo || primerNombre(user.nombre))}</b><span>${esc(rolLabel(user.rol))} · CC ${esc(user.documento)}</span></div>
    ${getSessions().length > 1 ? `<button class="icon-btn" id="btnSwap" title="Cambiar de cuenta">${I.swap}</button>` : ''}
    <button class="icon-btn" id="btnOut" title="Salir">${I.logout}</button>
  </div>`;
}
function bindAppbar(user) {
  const box = $('#avatarBox');
  if (box) box.onclick = () => { const f = fotoUsuarioPriv(user); if (f) zoomImagen(f); else miFotoMenu(user); };
  const ed = $('#avatarEdit'); if (ed) ed.onclick = () => miFotoMenu(user);
  const out = $('#btnOut'); if (out) out.onclick = () => logout();
  const swap = $('#btnSwap');
  if (swap) swap.onclick = () => {
    const sesiones = getSessions();
    /* 17/07/2026: la X de "quitar de este equipo" se mudó aquí. Vivía en el
       login, y el login ya no lista cuentas (se entra solo con el PIN). Sin
       ella no habría forma de sacar una cuenta vieja del dispositivo. */
    openSheet(`<div class="grip"></div><h2 class="h2">¿Con cuál cuenta sigues?</h2><div class="stack" style="margin-top:12px;">${sesiones.map(s => `<button class="acc-chip" data-doc="${esc(s.documento)}"><span class="av">${esc(iniciales(s.nombre))}</span><span class="acc-meta"><b>${esc(primerNombre(s.nombre))}</b><span>${esc(rolLabel(s.rol))}</span></span><span class="acc-x" data-forget="${esc(s.documento)}" title="Quitar de este equipo">${I.x}</span></button>`).join('')}</div>`);
    layer.querySelectorAll('.acc-chip').forEach(c => c.onclick = (ev) => {
      const fx = ev.target.closest('.acc-x');
      if (fx) { forgetSession(fx.dataset.forget); closeLayer(); return (fx.dataset.forget === user.documento) ? logout() : go('home'); }
      setActive(c.dataset.doc); closeLayer(); go('home');
    });
  };
}

/* ---------- Mi foto (Fase 9.2) ----------
   Cualquier usuario cambia la SUYA — incluido el DESARROLLADOR. El candado
   del Módulo 9 (nadie edita al DEV) sigue firme donde importa: en
   priv.cfgUsuarioFoto, que es "el DEV le pone foto a OTRO". Este carril
   (priv.miFoto) siempre actúa sobre quien llama, así que no hay nada que
   proteger — y sin él nadie podría ponerse foto, porque hoy el único usuario
   de la hoja ES el DEV.
   Misma sábana, mismos límites y mismo Drive que Configuración → Usuarios. */
function miFotoMenu(user) {
  const foto = fotoUsuarioPriv(user);
  openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:4px;">Mi foto de perfil</h2>
    <p class="muted" style="margin-bottom:14px;">Elige una imagen (JPG, PNG o WEBP, máx. 6 MB).</p>
    <div class="stack center">
      <div class="foto-preview" id="mf-prev">${foto ? `<img src="${esc(foto)}" alt="" />` : `<div class="mf-ini">${esc(iniciales(user.nombre))}</div>`}</div>
      <input type="file" id="mf-file" accept="image/png,image/jpeg,image/webp" style="display:none;" />
      <button class="btn btn-ghost btn-block" id="mf-pick">Elegir imagen</button>
      <button class="btn btn-primary btn-block" id="mf-save" disabled>Guardar foto</button>
      ${foto ? `<button class="btn btn-quiet btn-block" id="mf-zoom">Ver en grande</button>
                <button class="btn btn-quiet btn-block cfg-danger" id="mf-del">Quitar foto</button>` : ''}
    </div>`);
  let dataUrl = '';
  $('#mf-pick').onclick = () => $('#mf-file').click();
  $('#mf-file').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 6 * 1024 * 1024) return toast('La imagen supera 6 MB', 'err');
    const rd = new FileReader();
    rd.onload = () => { dataUrl = rd.result; $('#mf-prev').innerHTML = `<img src="${dataUrl}" alt="" />`; $('#mf-save').disabled = false; };
    rd.readAsDataURL(f);
  };
  $('#mf-save').onclick = async () => {
    if (!dataUrl) return;
    const btn = $('#mf-save'); saving(btn, true);
    try {
      const r = await api('priv.miFoto', {}, 'POST', { caller: user.documento, dataUrl });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo subir', 'err');
      miFotoAplicar(user, r.foto); closeLayer(); toast('Foto actualizada', 'ok');
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
  const z = $('#mf-zoom'); if (z) z.onclick = () => { closeLayer(); zoomImagen(foto); };
  const d = $('#mf-del');
  if (d) d.onclick = async () => {
    if (!await confirmar('¿Quitar tu foto?', crow('El archivo', 'se borra de Drive'))) return;
    try {
      const r = await api('priv.miFotoQuitar', {}, 'POST', { caller: user.documento });
      if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
      miFotoAplicar(user, ''); closeLayer(); toast('Foto quitada', 'ok');
    } catch (e) { toast('Error de conexión', 'err'); }
  };
}
/* Deja la foto en el usuario, en la sesión guardada del dispositivo y repinta */
function miFotoAplicar(user, foto) {
  user.foto = foto || '';
  const s = getSessions().find(x => x.documento === user.documento);
  if (s) { s.foto = user.foto; saveSession(s); }
  pintarAvatarPriv(user);
}

/* ---------- Hojas inferiores (modales) ---------- */
function openSheet(html, cls) {
  closeLayer();
  const bd = h('<div class="backdrop"></div>');
  const sh = h(`<div class="sheet ${cls || ''}">${html}</div>`);
  bd.onclick = closeLayer;
  layer.append(bd, sh);
  sh.querySelectorAll('[data-close]').forEach(b => b.onclick = closeLayer);
  document.body.classList.add('sheet-open');
}
function closeLayer() { layer.innerHTML = ''; document.body.classList.remove('sheet-open'); }
function hideSplash() { const s = $('#splash'); if (s && !s.classList.contains('hide')) { s.classList.add('hide'); setTimeout(() => s.remove(), 500); } }

/* ============================================================
   MÓDULO 5 · EVENTOS + AGENDA (Google Calendar)
   ============================================================ */
let M5_ME = '';
function m5Auth() { return { caller: M5_ME }; }

/* Fecha dd/MM/yyyy → Date (local); Date → dd/MM/yyyy; y helpers de <input type=date> */
function parseFechaES(s) {
  const m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  let y = +m[3]; if (m[3].length === 2) y += 2000;
  return new Date(y, +m[2] - 1, +m[1]);
}
const pad2 = n => ('0' + n).slice(-2);
function dateToDDMM(d) { return d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` : ''; }
function dateToInput(d) { return d ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` : ''; }
function inputToDDMM(v) { const m = String(v || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; }
function ddmmToInput(s) { const d = parseFechaES(s); return d ? dateToInput(d) : ''; }

/* Fecha larga corta: "12 de julio de 2026" (reusa BD_MESES) */
function fmtFechaCorta(s) {
  const d = parseFechaES(s); if (!d) return s || '';
  return `${d.getDate()} de ${BD_MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
/* "Creada 13 de julio de 2026 – 4:35 PM" desde dd/MM/yyyy HH:mm:ss */
function fmtCreada(s) {
  const m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return '';
  let out = `${+m[1]} de ${BD_MESES[+m[2] - 1]} de ${m[3]}`;
  if (m[4] != null) {
    let hh = +m[4]; const ap = hh >= 12 ? 'PM' : 'AM'; hh = hh % 12 || 12;
    out += ` – ${hh}:${m[5]} ${ap}`;
  }
  return out;
}
/* AJUSTE 17/07/2026 · LAS HORAS SE VEN EN 12 HORAS.
   Ojo: solo cambia lo que se MUESTRA. La hoja, el Calendario y los
   <input type="time"> siguen hablando 24h ('18:27'), que es como se ordenan y
   se comparan (evHora_ en el CORE guarda 'HH:mm'). Aquí se traduce al pintar.
   Regla del usuario: 12:xx lleva "M" de mediodía, como se dice en Colombia
   (12:50 M). La medianoche y lo que sigue va en AM (00:30 → 12:30 AM). */
function hora12(v) {
  const m = /^\s*(\d{1,2}):(\d{2})/.exec(String(v == null ? '' : v));
  if (!m) return String(v == null ? '' : v).trim();     // texto raro: se devuelve tal cual
  const h = Number(m[1]);
  if (h > 23) return String(v).trim();
  const suf = h === 12 ? 'M' : (h < 12 ? 'AM' : 'PM');  // 12:00–12:59 = mediodía
  return `${(h % 12) || 12}:${m[2]} ${suf}`;
}
function rangoHoras(a, b) {
  const x = a ? hora12(a) : '', y = b ? hora12(b) : '';
  if (x && y) return `${x} – ${y}`;
  return x || y || '';
}

/* Combobox de CONTACTO con búsqueda en el servidor (PRINCIPAL).
   opts.free=true permite escribir libre (Agenda). onPick(nombre, tel10). */
function bindContactCombo(idName, idTel, opts) {
  opts = opts || {};
  const input = $('#' + idName), list = $('#' + idName + '-list'); if (!input) return;
  let t = null;
  const paint = (items) => {
    list.innerHTML = items.length
      ? items.map(o => `<button type="button" class="combo-opt" data-nom="${esc(o.nombre)}" data-tel="${esc(o.contacto || '')}">${esc(o.nombre)} <span class="combo-sub">CC ${esc(o.documento)}</span></button>`).join('')
      : `<div class="combo-empty">${opts.free ? 'Sin coincidencias — puedes escribirlo libre' : 'Sin resultados'}</div>`;
    list.querySelectorAll('.combo-opt').forEach(b => b.onclick = () => {
      input.value = b.dataset.nom; list.hidden = true;
      if (idTel && $('#' + idTel)) $('#' + idTel).value = b.dataset.tel || '';
    });
    list.hidden = false;
  };
  input.oninput = () => {
    clearTimeout(t); const q = input.value.trim();
    if (q.length < 2) { list.hidden = true; return; }
    t = setTimeout(async () => {
      try { const r = await api('priv.contactoBuscar', { q, ...m5Auth() }); paint((r && r.items) || []); }
      catch (e) { list.hidden = true; }
    }, 240);
  };
  input.onfocus = () => { if (input.value.trim().length >= 2) input.oninput(); };
}

/* ============================================================
   EVENTOS  (hoja EVENTOS · calendario CAL_EVENTOS)
   ============================================================ */
let EV_ALL = [], EV_FILT = [], EV_SHOWN = 0; const EV_BATCH = 60;

function evEstadoClass(e) {
  const x = String(e || '').toUpperCase();
  if (x === 'CORRIENDO') return 'ev-corr';
  if (x === 'TERMINADO') return 'ev-term';
  return 'ev-prog';
}
function evEstadoLabel(e) { return String(e || 'PROGRAMADO').toUpperCase(); }

function evCardHtml(c) {
  const horas = rangoHoras(c.inicia, c.termina);
  return `<article class="bd-card ev-card ${evEstadoClass(c.estado)}" data-id="${esc(c.id)}">
    <div class="bd-top">
      <div class="bd-id">
        <b class="bd-nombre"><span class="ev-id">#${esc(c.id)}</span> ${esc(c.evento || 'Sin nombre')}</b>
        <span class="bd-doc">${I.cal} ${esc(fmtFechaCorta(c.fecha) || '—')}</span>
      </div>
      <div class="ev-topright">
        <span class="ev-badge ${evEstadoClass(c.estado)}">${esc(evEstadoLabel(c.estado))}</span>
        <span class="ev-asis" title="Asistentes registrados">${I.users}<b>${Number(c.asistentes || 0).toLocaleString('es-CO')}</b></span>
      </div>
    </div>
    <div class="bd-meta ev-meta">
      <span><span class="bd-k">Lugar</span> ${esc(c.lugar || '—')}</span>
      <span><span class="bd-k">Líder/Contacto</span> ${esc(c.contacto || '—')}</span>
      ${c.telefono ? `<span><span class="bd-k">Teléfono</span> ${esc(String(c.telefono).replace(/^57/, ''))}</span>` : ''}
      ${horas ? `<span><span class="bd-k">Horario</span> ${esc(horas)}</span>` : ''}
    </div>
    ${c.creada ? `<div class="bd-fecha">Creada ${esc(fmtCreada(c.creada))}</div>` : ''}
    <div class="bd-acts ev-acts">
      <button class="bd-btn" data-a="estado">Estado</button>
      <button class="bd-btn" data-a="detalles">Detalles</button>
      <button class="bd-btn" data-a="editar">Editar</button>
      <button class="bd-btn bd-btn-danger" data-a="eliminar">Eliminar</button>
    </div>
  </article>`;
}

async function viewEventos(user) {
  M5_ME = user.documento; appWide(true);
  app.innerHTML = `${backbar('Eventos')}
    <div class="pad">
      <div class="bd-toolbar">
        <div class="bd-search"><input class="input" id="ev-q" placeholder="Buscar por nombre, lugar, contacto o #id…" autocomplete="off" /></div>
        <button class="btn btn-primary bd-add" id="ev-add">+ Agregar</button>
      </div>
      <div class="bd-chips" id="ev-chips">
        ${['Todos', 'Programado', 'Corriendo', 'Terminado'].map((t, i) => `<button class="bd-chip ${i === 0 ? 'active' : ''}" data-f="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
      <div class="bd-count" id="ev-count"></div>
      <div id="ev-body">${loadingBox('Cargando eventos…')}</div>
      <div class="center" id="ev-more" style="margin-top:12px;"></div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('home');
  $('#ev-add').onclick = () => evAgregar();
  try {
    const r = await api('priv.eventos', m5Auth());
    if (!r.ok) { $('#ev-body').innerHTML = `<p class="muted center">No se pudo cargar.</p>`; return; }
    EV_ALL = r.items || [];
    evApplyFilter();
  } catch (e) { $('#ev-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; }
  const q = $('#ev-q'); let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(evApplyFilter, 160); };
  $$('#ev-chips .bd-chip').forEach(ch => ch.onclick = () => { $$('#ev-chips .bd-chip').forEach(x => x.classList.remove('active')); ch.classList.add('active'); evApplyFilter(); });

  vivoBind('eventos', M5_ME, vivoEventos);   // EN VIVO
}

/* ---- EN VIVO · Eventos ---- */
async function vivoEventos() {
  const r = await api('priv.eventos', m5Auth(), 'GET', null, SILENCIO);
  if (!r.ok || !vivoCambio(JSON.stringify(r.items))) return;
  EV_ALL = r.items || [];
  evApplyFilter(); vivoCerrarHoja();
}

function evActiveFilter() { const a = $('#ev-chips .bd-chip.active'); return a ? a.dataset.f : 'Todos'; }
function evApplyFilter() {
  const q = (($('#ev-q') || {}).value || '').trim().toLowerCase();
  const f = evActiveFilter().toUpperCase();
  EV_FILT = EV_ALL.filter(c => {
    if (f !== 'TODOS' && String(c.estado).toUpperCase() !== f) return false;
    if (!q) return true;
    const hay = ('#' + c.id + ' ' + (c.evento || '') + ' ' + (c.lugar || '') + ' ' + (c.contacto || '') + ' ' + (c.telefono || '')).toLowerCase();
    return hay.includes(q);
  });
  EV_SHOWN = 0;
  const cEl = $('#ev-count'); if (cEl) cEl.textContent = `${EV_FILT.length.toLocaleString('es-CO')} evento(s)`;
  const body = $('#ev-body'); if (body) body.innerHTML = EV_FILT.length ? `<div class="bd-grid" id="ev-grid"></div>` : `<p class="muted center" style="margin-top:20px;">Sin eventos para este filtro.</p>`;
  evRenderMore();
}
function evRenderMore() {
  const grid = $('#ev-grid'); if (!grid) { const m = $('#ev-more'); if (m) m.innerHTML = ''; return; }
  const next = EV_FILT.slice(EV_SHOWN, EV_SHOWN + EV_BATCH);
  grid.insertAdjacentHTML('beforeend', next.map(evCardHtml).join(''));
  EV_SHOWN += next.length;
  $$('#ev-grid .ev-card').forEach(card => {
    if (card._wired) return; card._wired = true;
    card.querySelectorAll('.bd-btn').forEach(b => b.onclick = () => evAccion(b.dataset.a, card.dataset.id));
  });
  const more = $('#ev-more');
  if (EV_SHOWN < EV_FILT.length) { more.innerHTML = `<button class="btn btn-ghost" id="ev-more-btn">Ver más (${(EV_FILT.length - EV_SHOWN).toLocaleString('es-CO')} restantes)</button>`; $('#ev-more-btn').onclick = evRenderMore; }
  else more.innerHTML = '';
}
function evFind(id) { return EV_ALL.find(x => String(x.id) === String(id)); }
function evUpsert(card, prepend) {
  const i = EV_ALL.findIndex(x => String(x.id) === String(card.id));
  if (i >= 0) EV_ALL[i] = card; else if (prepend) EV_ALL.unshift(card); else EV_ALL.push(card);
  evApplyFilter();
}
function evAccion(a, id) {
  if (a === 'estado') return evEstadoPicker(id);
  if (a === 'detalles') return evDetalles(id);
  if (a === 'editar') return evEditar(id);
  if (a === 'eliminar') return evEliminar(id);
}

/* Texto para copiar al portapapeles */
function evTextoCopia(c) {
  const L = [];
  L.push(`📅 EVENTO #${c.id} — ${c.evento}`);
  L.push(`Estado: ${evEstadoLabel(c.estado)}`);
  if (c.fecha) L.push(`Fecha: ${fmtFechaCorta(c.fecha)}`);
  const h = rangoHoras(c.inicia, c.termina); if (h) L.push(`Horario: ${h}`);
  if (c.lugar) L.push(`Lugar: ${c.lugar}`);
  if (c.contacto) L.push(`Líder/Contacto: ${c.contacto}`);
  if (c.telefono) L.push(`Teléfono: ${String(c.telefono).replace(/^57/, '')}`);
  if (c.mensaje) L.push(`\nMensaje a la persona:\n${c.mensaje}`);
  if (c.bitacora) L.push(`\nBitácora del grupo:\n${c.bitacora}`);
  return L.join('\n');
}

async function evDetalles(id) {
  openSheet(`<div class="grip"></div><h2 class="h2">Evento</h2>${loadingBox('Cargando…')}`);
  let c;
  try { const r = await api('priv.eventoVer', { id, ...m5Auth() }); if (!r.ok) { closeLayer(); return toast(r.msg || 'No se pudo cargar', 'err'); } c = r.evento; }
  catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  const rows = [
    ['ID', '#' + c.id],
    ['Estado', evEstadoLabel(c.estado)],
    ['Fecha', fmtFechaCorta(c.fecha) || '—'],
    ['Horario', rangoHoras(c.inicia, c.termina) || '—'],
    ['Lugar', c.lugar || '—'],
    ['Líder/Contacto', c.contacto || '—'],
    ['Teléfono', c.telefono ? String(c.telefono).replace(/^57/, '') : '—'],
    ['Mensaje persona', c.mensaje || '—'],
    ['Bitácora grupo', c.bitacora || '—'],
    ['En calendario', c.idCalendar ? 'Sí' : 'No'],
    ['Creada', c.creada ? fmtCreada(c.creada) : '—']
  ].map(([k, v]) => `<div class="det-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  openSheet(`<div class="grip"></div>
    <div class="det-head"><h2 class="h2">#${esc(c.id)} · ${esc(c.evento)}</h2><span class="ev-badge ${evEstadoClass(c.estado)}">${esc(evEstadoLabel(c.estado))}</span></div>
    <div class="det-list">${rows}</div>
    <section class="asis-sec" id="ev-asis-sec">
      <div class="asis-head">
        <h3 class="asis-tit">${I.users} Asistentes <span class="asis-n" id="ev-asis-n">—</span></h3>
        <button class="btn btn-ghost asis-xls" id="ev-asis-xls" hidden>${I.download} Excel</button>
      </div>
      <div id="ev-asis-body">${loadingBox('Cargando asistentes…')}</div>
    </section>
    <div class="stack" style="margin-top:12px;">
      <button class="btn btn-ghost btn-block" id="ev-copy">${I.copy} Copiar en portapapeles</button>
      <button class="btn btn-primary btn-block" id="ev-edit">Editar</button>
    </div>`, 'sheet-xl');
  $('#ev-copy').onclick = async () => { try { await navigator.clipboard.writeText(evTextoCopia(c)); toast('Evento copiado', 'ok'); } catch { toast('No se pudo copiar', 'err'); } };
  $('#ev-edit').onclick = () => { closeLayer(); evEditar(id); };
  evAsistentes(id);
}

/* ---- Asistentes del evento (dentro del modal Detalles) ---- */
let EV_AS = [], EV_AS_SHOWN = 0;
const EV_AS_BATCH = 50;

async function evAsistentes(id) {
  const body = $('#ev-asis-body'); if (!body) return;
  let r;
  try { r = await api('priv.eventoAsistentes', { id, ...m5Auth() }); }
  catch (e) { body.innerHTML = `<p class="muted center small">No se pudo cargar la asistencia.</p>`; return; }
  if (!$('#ev-asis-body')) return;            // el modal se cerró mientras cargaba
  if (!r.ok) { body.innerHTML = `<p class="muted center small">${esc(r.msg || 'No se pudo cargar la asistencia.')}</p>`; return; }
  EV_AS = r.items || []; EV_AS_SHOWN = 0;
  const n = $('#ev-asis-n'); if (n) n.textContent = EV_AS.length.toLocaleString('es-CO');
  if (!EV_AS.length) { body.innerHTML = `<p class="muted center small" style="padding:14px 0;">Sin asistentes registrados aún.</p>`; return; }
  body.innerHTML = `<div class="asis-wrap"><table class="asis-t">
      <thead><tr><th class="asis-i">#</th><th>Nombre</th><th>Documento</th><th>Teléfono</th><th>Fecha y hora</th></tr></thead>
      <tbody id="ev-asis-tb"></tbody></table></div>
    <div class="center" id="ev-asis-more" style="margin-top:10px;"></div>`;
  evAsisMore();
  const xls = $('#ev-asis-xls');
  if (xls) { xls.hidden = false; xls.onclick = () => evAsisExcel(id); }
}

function evAsisMore() {
  const tb = $('#ev-asis-tb'); if (!tb) return;
  const next = EV_AS.slice(EV_AS_SHOWN, EV_AS_SHOWN + EV_AS_BATCH);
  tb.insertAdjacentHTML('beforeend', next.map((x, i) => `<tr>
      <td class="asis-i" data-l="#">${(EV_AS_SHOWN + i + 1).toLocaleString('es-CO')}</td>
      <td data-l="Nombre"><b>${esc(x.nombre || '—')}</b></td>
      <td data-l="Documento">${esc(x.documento || '—')}</td>
      <td data-l="Teléfono">${esc(x.contacto ? String(x.contacto).replace(/^57/, '') : '—')}</td>
      <td data-l="Fecha y hora">${esc(x.fecha || '—')}</td>
    </tr>`).join(''));
  EV_AS_SHOWN += next.length;
  const more = $('#ev-asis-more'); if (!more) return;
  if (EV_AS_SHOWN < EV_AS.length) {
    more.innerHTML = `<button class="btn btn-ghost" id="ev-asis-more-btn">Ver más (${(EV_AS.length - EV_AS_SHOWN).toLocaleString('es-CO')} restantes)</button>`;
    $('#ev-asis-more-btn').onclick = evAsisMore;
  } else more.innerHTML = '';
}

async function evAsisExcel(id) {
  const btn = $('#ev-asis-xls'); saving(btn, true);
  try {
    const r = await api('priv.eventoAsistentesExcel', {}, 'POST', { id, caller: M5_ME });
    saving(btn, false);
    if (!r.ok) return toast(r.msg || 'No se pudo generar', 'err');
    downloadB64(r.base64, r.mime, r.filename); toast('Archivo generado', 'ok');
  } catch (e) { saving(btn, false); toast('Error al generar el archivo', 'err'); }
}

function evEstadoPicker(id) {
  const c = evFind(id); if (!c) return toast('Evento no encontrado', 'err');
  const opts = [['PROGRAMADO', 'ev-prog'], ['CORRIENDO', 'ev-corr'], ['TERMINADO', 'ev-term']];
  openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:4px;">Cambiar estado</h2>
    <p class="muted small">#${esc(c.id)} · ${esc(c.evento)}</p>
    <div class="estado-opts">${opts.map(([e, cl]) => `<button class="estado-opt ${cl} ${String(c.estado).toUpperCase() === e ? 'sel' : ''}" data-e="${e}">${e}</button>`).join('')}</div>`);
  layer.querySelectorAll('.estado-opt').forEach(b => b.onclick = async () => {
    if (b.classList.contains('sel')) return closeLayer();
    layer.querySelectorAll('.estado-opt').forEach(x => x.disabled = true);
    try { const r = await api('priv.eventoEstado', {}, 'POST', { id, estado: b.dataset.e, ...m5Auth() }); if (!r.ok) { toast(r.msg || 'No se pudo cambiar', 'err'); layer.querySelectorAll('.estado-opt').forEach(x => x.disabled = false); return; } closeLayer(); toast('Estado actualizado', 'ok'); evUpsert(r.card); }
    catch (e) { toast('Error de conexión', 'err'); layer.querySelectorAll('.estado-opt').forEach(x => x.disabled = false); }
  });
}

/* Modal Registro / Edición de Evento (contacto = UNO de PRINCIPAL) */
/* AJUSTES 16/07: la fecha usa la rueda iOS SIN tope (hay 173 eventos
   históricos que se deben poder editar) y con rueda de año. */
function evFormHtml(titulo, c) {
  c = c || {};
  return `<div class="grip"></div><h2 class="h2" style="margin-bottom:10px;">${esc(titulo)}</h2>
    <div class="stack">
      ${field('ID del evento', inputEl('ev-fid', 'disabled'))}
      ${field('Nombre del evento', inputEl('ev-fnombre', 'placeholder="Ej. Reunión de líderes N° 5"'))}
      ${campoFecha('ev-ffecha', 'Fecha', { anios: true })}
      ${field('Lugar (zona)', comboboxHtml('ev-flugar', 'Escribe para buscar…'))}
      ${field('Líder / Contacto (de la base)', comboboxHtml('ev-fcont', 'Busca por nombre o documento…'))}
      ${field('Teléfono', inputEl('ev-ftel', 'inputmode="numeric" maxlength="10" placeholder="Se completa al elegir contacto"'))}
      <div class="ev-hrow">
        ${field('Hora inicio', `<input class="input" id="ev-fini" type="time" />`)}
        ${field('Hora fin', `<input class="input" id="ev-ffin" type="time" />`)}
      </div>
      ${field('Mensaje a la persona', `<textarea class="input ta" id="ev-fmsg" rows="3" placeholder="Opcional"></textarea>`)}
      ${field('Bitácora del grupo', `<textarea class="input ta" id="ev-fbit" rows="3" placeholder="Opcional"></textarea>`)}
      <button class="btn btn-primary btn-block" id="ev-save">${c.id != null ? 'Guardar cambios' : 'Crear evento'}</button>
    </div>`;
}
function evFillForm(c) {
  $('#ev-fid').value = c.id != null ? ('#' + c.id) : '(automático)';
  $('#ev-fnombre').value = c.evento || '';
  $('#ev-ffecha').value = ddmmToInput(c.fecha || '');
  bindCampoFecha('ev-ffecha');
  $('#ev-fcont').value = c.contacto || '';
  $('#ev-ftel').value = c.telefono ? String(c.telefono).replace(/^57/, '') : '';
  $('#ev-fini').value = c.inicia || '';
  $('#ev-ffin').value = c.termina || '';
  $('#ev-fmsg').value = c.mensaje || '';
  $('#ev-fbit').value = c.bitacora || '';
  onlyDigits($('#ev-ftel'));
  getResidencias().then(l => { bindCombobox('ev-flugar', l); $('#ev-flugar').value = c.lugar || ''; });
  bindContactCombo('ev-fcont', 'ev-ftel', { free: false });
}
function evReadForm() {
  return {
    evento: val('ev-fnombre'),
    fecha: inputToDDMM(($('#ev-ffecha') || {}).value),
    lugar: val('ev-flugar'),
    contacto: val('ev-fcont'),
    telefono: onlyDig(val('ev-ftel')),
    inicia: ($('#ev-fini') || {}).value || '',
    termina: ($('#ev-ffin') || {}).value || '',
    mensaje: (($('#ev-fmsg') || {}).value || '').trim(),
    bitacora: (($('#ev-fbit') || {}).value || '').trim()
  };
}
function evValidForm(b) {
  if (!b.evento) { toast('Escribe el nombre del evento', 'err'); return false; }
  if (!b.fecha) { toast('Selecciona la fecha', 'err'); return false; }
  if (b.telefono && b.telefono.length !== 10) { toast('Teléfono: 10 dígitos', 'err'); return false; }
  if (b.inicia && b.termina && b.termina <= b.inicia) { toast('La hora fin debe ser mayor que la de inicio', 'err'); return false; }
  return true;
}

async function evAgregar() {
  openSheet(`<div class="grip"></div><h2 class="h2">Registro de Evento</h2>${loadingBox('Preparando…')}`);
  try { await api('priv.eventoMeta', m5Auth()); } catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  openSheet(evFormHtml('Registro de Evento', {}));
  evFillForm({});
  $('#ev-save').onclick = async () => {
    const b = evReadForm(); if (!evValidForm(b)) return;
    const btn = $('#ev-save'); saving(btn, true);
    try { const r = await api('priv.eventoGuardar', {}, 'POST', { ...b, ...m5Auth() }); saving(btn, false); if (!r.ok) return toast(r.msg || 'No se pudo crear', 'err'); closeLayer(); toast('Evento creado y sincronizado con el calendario', 'ok'); if (($('#ev-q') || {}).value) $('#ev-q').value = ''; $$('#ev-chips .bd-chip').forEach((x, i) => x.classList.toggle('active', i === 0)); evUpsert(r.card, true); }
    catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}
async function evEditar(id) {
  openSheet(`<div class="grip"></div><h2 class="h2">Editar evento</h2>${loadingBox('Cargando…')}`);
  let c;
  try { const r = await api('priv.eventoVer', { id, ...m5Auth() }); if (!r.ok) { closeLayer(); return toast(r.msg, 'err'); } c = r.evento; }
  catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  openSheet(evFormHtml('Editar evento', c));
  evFillForm(c);
  $('#ev-save').onclick = async () => {
    const b = evReadForm(); if (!evValidForm(b)) return;
    const btn = $('#ev-save'); saving(btn, true);
    try { const r = await api('priv.eventoEditar', {}, 'POST', { id, ...b, ...m5Auth() }); saving(btn, false); if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err'); closeLayer(); toast('Evento actualizado', 'ok'); evUpsert(r.card); }
    catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}
async function evEliminar(id) {
  const c = evFind(id); if (!c) return toast('Evento no encontrado', 'err');
  const ok = await confirmar('¿Eliminar este evento?', crow('Evento', '#' + c.id + ' ' + c.evento) + crow('Fecha', fmtFechaCorta(c.fecha)) + `<p class="muted small" style="margin-top:8px;">También se elimina del calendario de Google. Esta acción no se puede deshacer.</p>`);
  if (!ok) return;
  try { const r = await api('priv.eventoEliminar', {}, 'POST', { id, ...m5Auth() }); if (!r.ok) return toast(r.msg || 'No se pudo eliminar', 'err'); EV_ALL = EV_ALL.filter(x => String(x.id) !== String(id)); evApplyFilter(); toast('Evento eliminado', 'ok'); }
  catch (e) { toast('Error de conexión', 'err'); }
}

/* ============================================================
   AGENDA  (hoja CALENDARIO · calendario CAL_AGENDA)
   Calendario profesional: Año / Mes / Día · buscar · Agregar Reunión
   ============================================================ */
let AG_ALL = [], AG_VIEW = 'mes', AG_CUR = new Date(), AG_Q = '';
const AG_DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/* ---- AJUSTES 16/07 · pastillas de estado + selección múltiple ----
   AG_EST  = estados marcados. Si hay alguno marcado, SOLO se muestran esos
             en la vista que se tenga (día, mes o año): el filtro vive en
             agReunionesDia(), que es por donde pasan las tres vistas.
   AG_SEL  = ids seleccionados para marcar un estado en bloque.
   REALIZADA siempre se marca A MANO: nunca se pone sola al pasar la fecha. */
const AG_ESTADOS = ['PROGRAMADA', 'A REPROGRAMAR', 'REALIZADA'];
const AG_EST = new Set();
let AG_SEL = new Set(), AG_SELMODE = false;

/* ============================================================
   AJUSTE 20/07/2026 · NOTIFICACIONES DE AGENDA (al candidato / a la persona)
   AG_NOTIF = { candidato:{nombre,pnombre,wa}, manejo, plantillas:{...} }
   Se carga una vez al abrir Agenda (priv.agendaMeta). Los mensajes se arman
   AQUÍ (el cliente ya tiene las reuniones y las horas) y se mandan directo
   (WhatsApp del cliente) o por bot (endpoint que resuelve el destino).
   ============================================================ */
let AG_NOTIF = null;

/* Íconos propios (no están en el set I): sol saliendo, sol, luna, aviso. */
const AG_SVG = {
  sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.2" y1="10.2" x2="5.6" y2="11.6"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.4" y1="11.6" x2="19.8" y2="10.2"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="8 6 12 2 16 6"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
};

const AG_FRANJAS = {
  manana: { svg: AG_SVG.sunrise, label: 'Mañana', tiempo: 'buenos días', jornada: 'la mañana' },
  tarde: { svg: AG_SVG.sun, label: 'Tarde', tiempo: 'buenas tardes', jornada: 'la tarde' },
  noche: { svg: AG_SVG.moon, label: 'Noche', tiempo: 'buenas noches', jornada: 'la noche' }
};

async function agNotifCargar() {
  try { AG_NOTIF = await api('priv.agendaMeta', m5Auth()); }
  catch (e) { AG_NOTIF = null; }
}

/* Sustituye {var} y borra las líneas que quedan vacías porque su variable
   estaba vacía (p. ej. {detalles} sin texto). Los saltos internos de una
   variable multilínea ({lista_reuniones}, {bloque_aviso}) se conservan. */
function agTplRender(body, vars) {
  /* Respeta los saltos de línea de la plantilla. Solo se descarta una línea
     cuando TIENE variables y TODAS quedaron vacías (así desaparece la línea de
     {detalles} o {mensaje} cuando no hay dato). Las líneas en blanco puestas a
     propósito (sin variables) se conservan. */
  return String(body || '').split('\n').map(line => {
    const toks = line.match(/\{(\w+)\}/g);
    const rendered = line.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : ''));
    if (toks && !toks.some(t => { const v = vars[t.slice(1, -1)]; return v != null && String(v).trim() !== ''; })) {
      return null;
    }
    return rendered;
  }).filter(l => l !== null).join('\n');
}

/* Minutos desde medianoche de una hora 'HH:mm' (24h). null si no hay. */
function agMin(h) { const m = /^(\d{1,2}):(\d{2})/.exec(String(h || '')); return m ? (+m[1] * 60 + +m[2]) : null; }
function agFranjaDe(inicia) {
  const t = agMin(inicia); if (t == null) return null;
  if (t < 13 * 60) return 'manana';
  if (t < 18 * 60) return 'tarde';
  return 'noche';
}

/* "Detalles: <texto>" o '' si el campo está vacío (rótulo embebido). */
function agDetallesLinea(det) { const d = String(det || '').trim(); return d ? ('Detalles: ' + d) : ''; }

/* Bloque compuesto de una reunión para el mensaje Avisar. */
function agBloqueAviso(c) {
  const L = [];
  if (c.titulo) L.push(c.titulo);
  if (c.fecha) L.push('🗓️ ' + fmtFechaCorta(c.fecha) + (c.inicia ? ' · ' + rangoHoras(c.inicia, c.termina) : ''));
  if (c.lugar) L.push('📍 ' + c.lugar);
  const det = agDetallesLinea(c.detalles); if (det) L.push(det);
  return L.join('\n');
}

/* Reuniones PROGRAMADAS de HOY en la franja, enumeradas. {texto, count}. */
function agListaReuniones(franja) {
  const hoy = dateToDDMM(new Date());
  const rs = AG_ALL
    .filter(r => r.fecha === hoy && agEstadoNormJs(r.estado) === 'PROGRAMADA' && agFranjaDe(r.inicia) === franja)
    .sort((a, b) => (a.inicia || '99').localeCompare(b.inicia || '99'));
  const texto = rs.map((r, i) => {
    const hora = rangoHoras(r.inicia, r.termina) || 'sin hora';
    return `${i + 1}. ${hora} · ${r.titulo || 'Reunión'}${r.lugar ? ' — ' + r.lugar : ''}`;
  }).join('\n');
  return { texto, count: rs.length };
}

function agCandidatoOk(requiereWa) {
  if (!AG_NOTIF || !AG_NOTIF.plantillas) { toast('No se pudo cargar la configuración de Agenda', 'err'); return false; }
  if (requiereWa && !(AG_NOTIF.candidato && AG_NOTIF.candidato.wa)) {
    toast('Configura el WhatsApp del candidato en Configuración → General → Agenda', 'err'); return false;
  }
  return true;
}

function agVarsBase() {
  const c = (AG_NOTIF && AG_NOTIF.candidato) || {};
  return { pn_candidato: c.pnombre || '', n_candidato: c.nombre || '', u_agenda: (AG_NOTIF && AG_NOTIF.manejo) || '' };
}

/* ---- Resumen del día (iconos Mañana/Tarde/Noche) ---- */
function agResumenTexto(franja) {
  const f = AG_FRANJAS[franja];
  const lista = agListaReuniones(franja);
  if (!lista.count) return null;
  const vars = Object.assign(agVarsBase(), { tiempo: f.tiempo, jornada: f.jornada, lista_reuniones: lista.texto });
  return { texto: agTplRender(AG_NOTIF.plantillas.resumen, vars), count: lista.count };
}

function agResumenModal(franja) {
  if (!agCandidatoOk(true)) return;
  const f = AG_FRANJAS[franja];
  const r = agResumenTexto(franja);
  if (!r) return toast(`No hay reuniones programadas en ${f.jornada} de hoy`, 'err');
  openSheet(`<div class="grip"></div>
    <h2 class="h2">Notificar resumen · ${esc(f.label)}</h2>
    <p class="muted small">Se enviará al WhatsApp del candidato (${esc(AG_NOTIF.candidato.wa.replace(/^57/, ''))}) · ${r.count} reunión(es).</p>
    <div class="ag-notif-prev">${esc(r.texto)}</div>
    <div class="ag-wa-row" style="margin-top:12px;">
      <button class="btn btn-primary" id="ag-res-dir">${I.wa} Enviar directo</button>
      <button class="btn btn-ghost" id="ag-res-bot">Desde el bot</button>
    </div>`);
  $('#ag-res-dir').onclick = () => { ldWaOpen(AG_NOTIF.candidato.wa, r.texto); };
  $('#ag-res-bot').onclick = (e) => agResumenBot(e.currentTarget, r.texto);
}

function agResumenBot(b, texto) {
  if (!b || b.disabled) return;
  if (!b._armed) { b._armed = true; b.dataset.orig = b.innerHTML; b.classList.add('ld-armed'); b.textContent = '¿Confirmar envío?'; b._t = setTimeout(() => { b._armed = false; b.classList.remove('ld-armed'); b.innerHTML = b.dataset.orig; }, 3500); return; }
  clearTimeout(b._t); b._armed = false; b.classList.remove('ld-armed'); b.disabled = true; b.innerHTML = '<span class="spinner spinner-brand"></span>';
  api('priv.agendaBotEnviar', {}, 'POST', { texto, ...m5Auth() })
    .then(r => toast(r.msg || (r.ok ? 'Enviado' : 'No se pudo enviar'), r.ok ? 'ok' : 'err'))
    .catch(() => toast('Error de conexión', 'err'))
    .finally(() => { b.disabled = false; b.innerHTML = b.dataset.orig || 'Desde el bot'; });
}

/* ---- Avisar (Aviso / Previa / Decisión) → WhatsApp directo al candidato ---- */
function agAvisarModal(c) {
  if (!agCandidatoOk(true)) return;
  openSheet(`<div class="grip"></div>
    <h2 class="h2">Avisar al candidato</h2>
    <p class="muted small">Se abrirá WhatsApp directo al candidato (${esc(AG_NOTIF.candidato.wa.replace(/^57/, ''))}).</p>
    <div class="ag-avisar-grid">
      <button class="btn btn-quiet" data-t="aviso">${I.bell} Aviso</button>
      <button class="btn btn-quiet" data-t="previa">${I.clock} Previa</button>
      <button class="btn btn-quiet" data-t="decision">${AG_SVG.alert} Decisión</button>
    </div>`);
  $$('#layer .ag-avisar-grid [data-t]').forEach(b => b.onclick = () => agAvisarEnviar(c, b.dataset.t));
}

function agAvisarEnviar(c, tipo) {
  const tpl = AG_NOTIF.plantillas[tipo]; if (!tpl) return;
  const vars = Object.assign(agVarsBase(), { bloque_aviso: agBloqueAviso(c) });
  const texto = agTplRender(tpl, vars);
  ldWaOpen(AG_NOTIF.candidato.wa, texto);
}

/* ---- Mensaje directo → WhatsApp directo a la PERSONA de la reunión ---- */
function agDirectoEnviar(c) {
  if (!agCandidatoOk(false)) return;
  if (!c.telefono) return toast('La reunión no tiene teléfono de la persona', 'err');
  const vars = Object.assign(agVarsBase(), {
    contacto: c.contacto || '',
    fecha_larga: c.fecha ? fmtFechaCorta(c.fecha) : '',
    hora_inicio: c.inicia ? hora12(c.inicia) : '',
    hora_fin: c.termina ? hora12(c.termina) : '',
    lugar: c.lugar || '',
    detalles: agDetallesLinea(c.detalles),
    mensaje: c.mensaje || ''
  });
  ldWaOpen(c.telefono, agTplRender(AG_NOTIF.plantillas.directo, vars));
}

function agEstadoNormJs(e) {
  const x = String(e || '').toUpperCase().trim();
  return AG_ESTADOS.indexOf(x) !== -1 ? x : 'PROGRAMADA';
}
/* ¿la reunión cae en el rango que se está viendo? (para los contadores) */
function agEnRango(r) {
  const d = parseFechaES(r.fecha); if (!d) return false;
  if (AG_VIEW === 'dia') return dateToDDMM(d) === dateToDDMM(AG_CUR);
  if (AG_VIEW === 'mes') return d.getMonth() === AG_CUR.getMonth() && d.getFullYear() === AG_CUR.getFullYear();
  return d.getFullYear() === AG_CUR.getFullYear();
}

function agEstadoClass(e) {
  const x = String(e || '').toUpperCase();
  if (x === 'REALIZADA') return 'ag-real';
  if (x === 'A REPROGRAMAR') return 'ag-repro';
  return 'ag-prog';
}
function agFind(id) { return AG_ALL.find(x => String(x.id) === String(id)); }
function agMatchesQ(r) { if (!AG_Q) return true; const hay = ((r.titulo || '') + ' ' + (r.lugar || '') + ' ' + (r.contacto || '') + ' ' + (r.telefono || '')).toLowerCase(); return hay.includes(AG_Q); }
function agReunionesDia(d) {
  const key = dateToDDMM(d);
  return AG_ALL
    .filter(r => r.fecha === key && agMatchesQ(r) && (!AG_EST.size || AG_EST.has(agEstadoNormJs(r.estado))))
    .sort((a, b) => (a.inicia || '99').localeCompare(b.inicia || '99'));
}

/* Pastillas de estado con el conteo de lo que se está viendo */
function agPintaPastillas() {
  const cont = $('#ag-pills'); if (!cont) return;
  const vis = AG_ALL.filter(r => agEnRango(r) && agMatchesQ(r));
  const n = {}; AG_ESTADOS.forEach(e => n[e] = 0);
  vis.forEach(r => n[agEstadoNormJs(r.estado)]++);
  cont.innerHTML = AG_ESTADOS.map(e => `<button class="ag-pill ${agEstadoClass(e)} ${AG_EST.has(e) ? 'active' : ''}" data-e="${esc(e)}">
      ${esc(e)} <span class="ag-pill-n">${n[e]}</span>
    </button>`).join('') +
    (AG_EST.size ? `<button class="ag-pill ag-pill-clear" id="ag-pill-clear">Ver todas</button>` : '');
  $$('#ag-pills .ag-pill[data-e]').forEach(b => b.onclick = () => {
    const e = b.dataset.e;
    if (AG_EST.has(e)) AG_EST.delete(e); else AG_EST.add(e);
    agRender();
  });
  const cl = $('#ag-pill-clear'); if (cl) cl.onclick = () => { AG_EST.clear(); agRender(); };
}

/* ---- Selección múltiple: barra inferior con los 3 estados ---- */
function agSelToggle(id) {
  const k = String(id);
  if (AG_SEL.has(k)) AG_SEL.delete(k); else AG_SEL.add(k);
  agRender();
}
function agSelModo(on) {
  AG_SELMODE = !!on;
  if (!AG_SELMODE) AG_SEL.clear();
  agRender();
}
function agPintaBarraSel() {
  const bar = $('#ag-selbar'); if (!bar) return;
  bar.hidden = !AG_SELMODE;
  document.body.classList.toggle('ag-selecting', AG_SELMODE);
  const btn = $('#ag-selmode'); if (btn) btn.classList.toggle('active', AG_SELMODE);
  if (!AG_SELMODE) return;
  bar.innerHTML = `<div class="ag-selbar-in">
      <b>${AG_SEL.size} seleccionada(s)</b>
      <div class="ag-selbar-acts">
        ${AG_ESTADOS.map(e => `<button class="btn btn-ghost ag-selbtn ${agEstadoClass(e)}" data-e="${esc(e)}" ${AG_SEL.size ? '' : 'disabled'}>${esc(e)}</button>`).join('')}
        <button class="btn btn-quiet" id="ag-selcancel">Cancelar</button>
      </div>
    </div>`;
  $$('#ag-selbar .ag-selbtn').forEach(b => b.onclick = () => agEstadoBloque(b.dataset.e));
  $('#ag-selcancel').onclick = () => agSelModo(false);
}
async function agEstadoBloque(estado) {
  const ids = Array.from(AG_SEL);
  if (!ids.length) return toast('No hay reuniones seleccionadas', 'err');
  const bar = $('#ag-selbar');
  if (bar) bar.innerHTML = `<div class="ag-selbar-in"><b>Marcando ${ids.length}…</b><span class="spinner spinner-brand"></span></div>`;
  try {
    const r = await api('priv.reunionEstadoBulk', {}, 'POST', { ids, estado, ...m5Auth() });
    if (!r.ok) { agRender(); return toast(r.msg || 'No se pudo cambiar', 'err'); }
    (r.cards || []).forEach(c => { const i = AG_ALL.findIndex(x => String(x.id) === String(c.id)); if (i >= 0) AG_ALL[i] = c; });
    AG_SEL.clear(); AG_SELMODE = false;
    agRender();
    toast(r.msg || 'Listo', (r.fallos && r.fallos.length) ? 'err' : 'ok');
  } catch (e) { agRender(); toast('Error de conexión', 'err'); }
}

async function viewAgenda(user) {
  M5_ME = user.documento; appWide(true);
  app.innerHTML = `${backbar('Agenda')}
    <div class="pad">
      <div class="ag-toolbar">
        <div class="ag-nav">
          <button class="icon-btn ag-ic" id="ag-prev" title="Anterior">${I.chevL}</button>
          <button class="btn btn-ghost ag-today" id="ag-today">Hoy</button>
          <button class="icon-btn ag-ic" id="ag-next" title="Siguiente">${I.chevR}</button>
          <b class="ag-title" id="ag-title"></b>
        </div>
        <div class="ag-right">
          <div class="ag-seg" id="ag-seg">
            ${['año', 'mes', 'día'].map(v => `<button class="ag-seg-btn ${v === 'mes' ? 'active' : ''}" data-v="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}
          </div>
          <button class="btn btn-primary ag-add" id="ag-add">${I.plus} Reunión</button>
        </div>
      </div>
      <div class="ag-search">
        <input class="input" id="ag-q" placeholder="Buscar reunión por título, lugar o contacto…" autocomplete="off" />
        <button class="btn btn-ghost ag-selmode" id="ag-selmode" title="Seleccionar varias">${I.check} Seleccionar</button>
      </div>
      <div class="ag-pillsrow">
        <div class="ag-pills" id="ag-pills"></div>
        <div class="ag-notif" id="ag-notif" title="Notificar resumen al candidato">
          ${Object.keys(AG_FRANJAS).map(k => `<button class="ag-notif-ic" data-f="${k}" title="Resumen · ${esc(AG_FRANJAS[k].label)}" aria-label="Resumen ${esc(AG_FRANJAS[k].label)}">${AG_FRANJAS[k].svg}</button>`).join('')}
        </div>
      </div>
      <div id="ag-cal">${loadingBox('Cargando agenda…')}</div>
      <div class="ag-selbar" id="ag-selbar" hidden></div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('home');
  $('#ag-add').onclick = () => agAgregar(AG_CUR);
  $('#ag-prev').onclick = () => { agShift(-1); };
  $('#ag-next').onclick = () => { agShift(1); };
  $('#ag-today').onclick = () => { AG_CUR = new Date(); agRender(); };
  $('#ag-selmode').onclick = () => agSelModo(!AG_SELMODE);
  $$('#ag-seg .ag-seg-btn').forEach(b => b.onclick = () => { AG_VIEW = b.dataset.v === 'año' ? 'anio' : b.dataset.v === 'día' ? 'dia' : 'mes'; $$('#ag-seg .ag-seg-btn').forEach(x => x.classList.toggle('active', x === b)); agRender(); });
  const q = $('#ag-q'); let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => { AG_Q = q.value.trim().toLowerCase(); agRender(); }, 180); };
  $$('#ag-notif .ag-notif-ic').forEach(b => b.onclick = () => agResumenModal(b.dataset.f));
  agNotifCargar();   // AJUSTE 20/07: candidato + plantillas para las notificaciones
  try { const r = await api('priv.agenda', m5Auth()); AG_ALL = (r && r.items) || []; }
  catch (e) { $('#ag-cal').innerHTML = `<p class="muted center">Error de conexión.</p>`; return; }
  agRender();

  vivoBind('agenda', M5_ME, vivoAgenda);   // EN VIVO
}

/* ---- EN VIVO · Agenda ----
   Se respeta dónde está parado el usuario: agRender() repinta el mismo mes/día
   y la misma búsqueda (AG_CUR, AG_VIEW y AG_Q no se tocan). */
async function vivoAgenda() {
  const r = await api('priv.agenda', m5Auth(), 'GET', null, SILENCIO);
  const items = (r && r.items) || [];
  if (!vivoCambio(JSON.stringify(items))) return;
  AG_ALL = items;
  agRender(); vivoCerrarHoja();
}

function agShift(dir) {
  const d = new Date(AG_CUR);
  if (AG_VIEW === 'anio') d.setFullYear(d.getFullYear() + dir);
  else if (AG_VIEW === 'dia') d.setDate(d.getDate() + dir);
  else d.setMonth(d.getMonth() + dir);
  AG_CUR = d; agRender();
}

/* ====================================================================
   AJUSTE 18/07/2026 · AGENDA — vista mensual con puntos de estado + modal
   del día, vista anual con puntos por estado, y línea "ahora" en vivo en
   el día. El filtro de pastillas y la búsqueda se respetan porque todo
   parte de agReunionesDia(). No se toca el backend ni el modal de detalle
   (agVer) ni el de agregar (agAgregar). */
let AG_DAYTIMER = null;

function agRender() {
  const cal = $('#ag-cal'); if (!cal) return;
  const title = $('#ag-title');
  agStopDayLive();
  agPintaPastillas();
  agPintaBarraSel();
  if (AG_VIEW === 'anio') { if (title) title.textContent = AG_CUR.getFullYear(); cal.innerHTML = agRenderAnio(); agWireYear(); }
  else if (AG_VIEW === 'dia') { if (title) title.textContent = `${AG_CUR.getDate()} de ${BD_MESES[AG_CUR.getMonth()]} de ${AG_CUR.getFullYear()}`; cal.innerHTML = agRenderDia(); agWireChips(); agArmDayLive(); }
  else { if (title) title.textContent = `${BD_MESES[AG_CUR.getMonth()][0].toUpperCase() + BD_MESES[AG_CUR.getMonth()].slice(1)} ${AG_CUR.getFullYear()}`; cal.innerHTML = agRenderMes(); agWireMonth(); }
}

/* semana empieza lunes; devuelve índice 0..6 (Lun..Dom) */
function dowMon(d) { return (d.getDay() + 6) % 7; }
function agDowLabel(d) { return AG_DOW[dowMon(d)]; }
function agEsHoy(d) { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); }

/* Resumen por estado de un día (respeta filtro + búsqueda). Solo los estados
   presentes, en orden PROGRAMADA · A REPROGRAMAR · REALIZADA. */
function agResumenDia(d) {
  const rs = agReunionesDia(d);
  const n = { 'PROGRAMADA': 0, 'A REPROGRAMAR': 0, 'REALIZADA': 0 };
  rs.forEach(r => n[agEstadoNormJs(r.estado)]++);
  return AG_ESTADOS.filter(e => n[e] > 0).map(e => ({ estado: e, clase: agEstadoClass(e), n: n[e] }));
}

/* Nombre del estado para la barra del mes. "A REPROGRAMAR" se abrevia
   (decisión del usuario 23/07): en una celda de calendario no cabe entera. */
function agEstadoCorto(e) { return String(e || '') === 'A REPROGRAMAR' ? 'REPROGRAMAR' : String(e || ''); }

/* ---- MES: celdas parejas con barra de estado + conteo ---- */
function agRenderMes() {
  const y = AG_CUR.getFullYear(), m = AG_CUR.getMonth();
  const first = new Date(y, m, 1);
  const start = new Date(first); start.setDate(1 - dowMon(first));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const inMonth = d.getMonth() === m;
    const isToday = d.getTime() === today.getTime();
    const res = inMonth ? agResumenDia(d) : [];
    /* AJUSTE 23/07: el puntico pasó a BARRA de color que aprovecha el ancho de
       la celda. El conteo se mantiene a la izquierda; el nombre del estado solo
       aparece cuando la pantalla da (≥820px, ver style.css) — en móvil la barra
       va sin texto. El markup es el mismo en las dos: lo decide el CSS, así la
       celda nunca se deforma. */
    const dots = res.map(x => `<span class="ag-dot ${x.clase}" title="${esc(x.n + ' ' + x.estado)}"><b class="ag-dot-n">${x.n}</b><span class="ag-dot-bar"><span>${esc(agEstadoCorto(x.estado))}</span></span></span>`).join('');
    cells += `<div class="ag-cell ${inMonth ? '' : 'ag-out'} ${isToday ? 'ag-today-cell' : ''} ${dots ? 'ag-has' : ''}" data-day="${dateToDDMM(d)}">
      <div class="ag-cell-h"><span class="ag-dnum">${d.getDate()}</span></div>
      <div class="ag-cell-body">${dots ? `<div class="ag-dots">${dots}</div>` : ''}</div>
    </div>`;
  }
  return `<div class="ag-monthwrap">
    <div class="ag-dow">${AG_DOW.map(x => `<span>${x}</span>`).join('')}</div>
    <div class="ag-grid">${cells}</div>
  </div>`;
}
function agWireMonth() {
  $$('#ag-cal .ag-cell').forEach(c => c.onclick = () => {
    const d = parseFechaES(c.dataset.day); if (!d) return;
    const rs = agReunionesDia(d);
    if (rs.length) agModalDia(d);          // día con reuniones → modal del día
    else if (!AG_SELMODE) agAgregar(d);    // día vacío → agregar
  });
}

/* ---- Modal del día (lista de reuniones + Agregar) ---- */
/* overFrac (0..1): si viene, la línea "ahora" se dibuja SOBRE esta tarjeta a esa
   altura (reunión en curso). Sin overFrac (modal del mes, tarjetas normales) no
   se dibuja overlay. */
function agDayItemsHtml(rs, overFrac) {
  return rs.map(r => {
    const t = new Date();
    const over = (overFrac != null)
      ? `<span class="ag-now ag-now-over" style="top:${Math.max(0, Math.min(100, overFrac * 100)).toFixed(1)}%;"><span class="ag-now-dot"></span><span class="ag-now-h">${esc(hora12(pad2(t.getHours()) + ':' + pad2(t.getMinutes())))}</span><span class="ag-now-line"></span></span>`
      : '';
    return `<button class="ag-day-item ${agEstadoClass(r.estado)} ${AG_SEL.has(String(r.id)) ? 'ag-picked' : ''} ${overFrac != null ? 'ag-day-live' : ''}" data-id="${esc(r.id)}">
    ${over}<div class="ag-day-time">${esc(r.inicia ? hora12(r.inicia) : '—')}${r.termina ? `<span>${esc(hora12(r.termina))}</span>` : ''}</div>
    <div class="ag-day-main"><b>${esc(r.titulo)}</b><span>${esc([r.lugar, r.contacto].filter(Boolean).join(' · ') || '—')}</span></div>
    <span class="ag-badge ${agEstadoClass(r.estado)}">${esc(r.estado)}</span>
  </button>`;
  }).join('');
}
function agSelPick(id) {
  const k = String(id);
  if (AG_SEL.has(k)) AG_SEL.delete(k); else AG_SEL.add(k);
  agPintaBarraSel();
}
function agModalDia(d) {
  const rs = agReunionesDia(d);
  openSheet(`<div class="grip"></div>
    <div class="ag-md-head">
      <div class="ag-md-when"><span class="ag-md-dow">${esc(agDowLabel(d))}</span><h2 class="h2 ag-md-title">${d.getDate()} de ${esc(BD_MESES[d.getMonth()])}</h2></div>
      <span class="ag-md-count">${rs.length}</span>
    </div>
    <div class="ag-md-list">${rs.length ? agDayItemsHtml(rs) : `<p class="muted center" style="margin:18px 0;">Sin reuniones este día.</p>`}</div>
    <button class="btn btn-primary btn-block ag-md-add" id="ag-md-add">${I.plus} Agregar reunión</button>`, 'ag-md');
  $('#ag-md-add').onclick = () => { closeLayer(); agAgregar(d); };
  $$('#layer .ag-day-item').forEach(b => b.onclick = () => {
    if (AG_SELMODE) { agSelPick(b.dataset.id); agModalDia(d); }
    else { closeLayer(); agVer(b.dataset.id); }
  });
}

/* ---- DÍA: lista + línea "ahora" en vivo (solo si es hoy) ---- */
function agNowMinutes() { const t = new Date(); return t.getHours() * 60 + t.getMinutes(); }
function agMinutos(hhmm) { const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || '')); return m ? (+m[1]) * 60 + (+m[2]) : 99999; }
function agNowLineHtml() {
  const t = new Date();
  return `<div class="ag-now"><span class="ag-now-dot"></span><span class="ag-now-h">${hora12(pad2(t.getHours()) + ':' + pad2(t.getMinutes()))}</span><span class="ag-now-line"></span></div>`;
}
function agRenderDia() {
  const rs = agReunionesDia(AG_CUR);
  const hoy = agEsHoy(AG_CUR);
  const now = hoy ? agNowLineHtml() : '';
  if (!rs.length) return `<div class="ag-daywrap">${now}<p class="muted center" style="margin:30px 0;">${AG_EST.size ? 'Sin reuniones de ese estado este día.' : 'Sin reuniones este día.'}<br><button class="btn btn-ghost" id="ag-day-add" style="margin-top:12px;">${I.plus} Agregar reunión</button></p></div>`;
  const nowMin = agNowMinutes();
  let out = '', placed = false;
  rs.forEach(r => {
    const ini = agMinutos(r.inicia);
    const fin = r.termina ? agMinutos(r.termina) : ini;
    // En curso: inicia <= ahora < termina → la línea va SOBRE esta tarjeta.
    const dentro = hoy && r.termina && fin > ini && ini <= nowMin && nowMin < fin;
    if (dentro) {
      out += agDayItemsHtml([r], (nowMin - ini) / (fin - ini));
      placed = true;                                   // ya se pintó sobre la tarjeta
    } else {
      if (hoy && !placed && ini >= nowMin) { out += now; placed = true; }   // antes de la próxima
      out += agDayItemsHtml([r]);
    }
  });
  if (hoy && !placed) out += now;                       // ya terminó todo → debajo del bloque
  return `<div class="ag-daywrap">${out}</div>`;
}
function agStopDayLive() { if (AG_DAYTIMER) { clearInterval(AG_DAYTIMER); AG_DAYTIMER = null; } }
function agArmDayLive() {
  agStopDayLive();
  if (AG_VIEW !== 'dia' || !agEsHoy(AG_CUR)) return;
  AG_DAYTIMER = setInterval(() => {
    const cal = $('#ag-cal');
    if (!cal || AG_VIEW !== 'dia' || !agEsHoy(AG_CUR)) { agStopDayLive(); return; }
    cal.innerHTML = agRenderDia(); agWireChips();
  }, 60000);
}

/* ---- AÑO: número + puntos por estado (no deforma la celda) ---- */
function agRenderAnio() {
  const y = AG_CUR.getFullYear();
  let months = '';
  for (let m = 0; m < 12; m++) {
    const first = new Date(y, m, 1);
    const start = new Date(first); start.setDate(1 - dowMon(first));
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const inMonth = d.getMonth() === m;
      const res = inMonth ? agResumenDia(d) : [];
      const dots = res.map(x => `<span class="ag-y-dot ${x.clase}"></span>`).join('');
      cells += `<span class="ag-y-d ${inMonth ? '' : 'ag-out'} ${dots ? 'ag-y-has' : ''}"><span class="ag-y-n">${inMonth ? d.getDate() : ''}</span>${dots ? `<span class="ag-y-dots">${dots}</span>` : ''}</span>`;
    }
    months += `<button class="ag-y-month" data-m="${m}">
      <div class="ag-y-name">${BD_MESES[m][0].toUpperCase() + BD_MESES[m].slice(1)}</div>
      <div class="ag-y-dow">${AG_DOW.map(x => `<span>${x[0]}</span>`).join('')}</div>
      <div class="ag-y-grid">${cells}</div>
    </button>`;
  }
  return `<div class="ag-yearwrap">${months}</div>`;
}
function agWireYear() {
  $$('#ag-cal .ag-y-month').forEach(b => b.onclick = () => { AG_CUR = new Date(AG_CUR.getFullYear(), +b.dataset.m, 1); AG_VIEW = 'mes'; $$('#ag-seg .ag-seg-btn').forEach(x => x.classList.toggle('active', x.dataset.v === 'mes')); agRender(); });
}
function agWireChips() {
  $$('#ag-cal .ag-day-item').forEach(b => b.onclick = () => AG_SELMODE ? agSelToggle(b.dataset.id) : agVer(b.dataset.id));
  const add = $('#ag-day-add'); if (add) add.onclick = () => agAgregar(AG_CUR);
}

/* Texto de bitácora para copiar a grupo */
function agTextoBitacora(c) {
  const L = [];
  L.push(`🗓️ ${c.titulo}`);
  if (c.fecha) L.push(`Fecha: ${fmtFechaCorta(c.fecha)}${c.inicia ? ' · ' + rangoHoras(c.inicia, c.termina) : ''}`);
  if (c.lugar) L.push(`Lugar: ${c.lugar}`);
  if (c.contacto) L.push(`Contacto: ${c.contacto}`);
  L.push(`Estado: ${c.estado}`);
  if (c.bitacora) L.push(`\n${c.bitacora}`);
  return L.join('\n');
}

async function agVer(id) {
  openSheet(`<div class="grip"></div><h2 class="h2">Reunión</h2>${loadingBox('Cargando…')}`);
  let c;
  try { const r = await api('priv.reunionVer', { id, ...m5Auth() }); if (!r.ok) { closeLayer(); return toast(r.msg || 'No se pudo cargar', 'err'); } c = r.reunion; }
  catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  const tel = c.telefono ? String(c.telefono).replace(/^57/, '') : '';
  const rows = [
    ['ID', '#' + c.id],
    ['Estado', c.estado],
    ['Fecha', fmtFechaCorta(c.fecha) || '—'],
    ['Horario', rangoHoras(c.inicia, c.termina) || '—'],
    ['Lugar', c.lugar || '—'],
    ['Detalles', c.detalles || '—'],
    ['Contacto', c.contacto || '—'],
    ['Teléfono', tel || '—'],
    ['Mensaje persona', c.mensaje || '—'],
    ['Bitácora grupo', c.bitacora || '—'],
    ['En calendario', c.idCalendar ? 'Sí' : 'No'],
    ['Creada', c.creada ? fmtCreada(c.creada) : '—']
  ].map(([k, v]) => `<div class="det-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  openSheet(`<div class="grip"></div>
    <div class="det-head"><h2 class="h2">${esc(c.titulo)}</h2><span class="ag-badge ${agEstadoClass(c.estado)}">${esc(c.estado)}</span></div>
    <div class="det-list">${rows}</div>
    <div class="ag-wa-row">
      <button class="btn btn-primary" id="ag-wa-dir" ${c.telefono ? '' : 'disabled'}>${I.wa} Mensaje directo</button>
      <button class="btn btn-ghost" id="ag-wa-bot" ${c.telefono ? '' : 'disabled'}>Enviar por bot</button>
    </div>
    <button class="btn btn-ghost btn-block" id="ag-copy" style="margin-top:8px;">${I.copy} Copiar bitácora a grupo</button>
    <button class="btn btn-ghost btn-block" id="ag-avisar" style="margin-top:8px;">${I.bell} Avisar</button>
    <div class="ag-ver-grid">
      <button class="btn btn-quiet" id="ag-edit">${I.pencil} Editar</button>
      <button class="btn btn-quiet" id="ag-repro">${I.repeat} A reprogramar</button>
      <button class="btn btn-quiet" id="ag-real">${I.check} Realizada</button>
      <button class="btn btn-quiet ag-del" id="ag-del">${I.trash} Eliminar</button>
    </div>`);
  $('#ag-wa-dir').onclick = () => { if (c.telefono) agDirectoEnviar(c); else toast('Sin teléfono', 'err'); };
  $('#ag-wa-bot').onclick = () => agWaBot(c);
  $('#ag-copy').onclick = async () => { try { await navigator.clipboard.writeText(agTextoBitacora(c)); toast('Bitácora copiada', 'ok'); } catch { toast('No se pudo copiar', 'err'); } };
  $('#ag-avisar').onclick = () => agAvisarModal(c);
  $('#ag-edit').onclick = () => { closeLayer(); agEditar(id); };
  $('#ag-repro').onclick = () => agEstadoSet(id, 'A REPROGRAMAR');
  $('#ag-real').onclick = () => agEstadoSet(id, 'REALIZADA');
  $('#ag-del').onclick = () => agEliminar(id);
}

/* Enviar Mensaje persona por BuilderBot (doble toque de confirmación) */
function agWaBot(c) {
  const b = $('#ag-wa-bot'); if (!b || b.disabled) return;
  if (!c.mensaje) return toast('No hay "Mensaje persona" para enviar', 'err');
  if (!b._armed) { b._armed = true; const orig = b.innerHTML; b.dataset.orig = orig; b.classList.add('ld-armed'); b.textContent = '¿Confirmar envío?'; b._t = setTimeout(() => { b._armed = false; b.classList.remove('ld-armed'); b.innerHTML = orig; }, 3500); return; }
  clearTimeout(b._t); b._armed = false; b.classList.remove('ld-armed'); b.disabled = true; b.innerHTML = '<span class="spinner spinner-brand"></span>';
  api('priv.reunionWaBot', {}, 'POST', { id: c.id, texto: c.mensaje, ...m5Auth() })
    .then(r => { toast(r.msg || (r.ok ? 'Enviado' : 'No se pudo enviar'), r.ok ? 'ok' : 'err'); })
    .catch(() => toast('Error de conexión', 'err'))
    .finally(() => { b.disabled = false; b.innerHTML = b.dataset.orig || 'Enviar por bot'; });
}

async function agEstadoSet(id, estado) {
  try { const r = await api('priv.reunionEstado', {}, 'POST', { id, estado, ...m5Auth() }); if (!r.ok) return toast(r.msg || 'No se pudo cambiar', 'err'); const i = AG_ALL.findIndex(x => String(x.id) === String(id)); if (i >= 0) AG_ALL[i] = r.card; closeLayer(); toast('Reunión: ' + estado, 'ok'); agRender(); }
  catch (e) { toast('Error de conexión', 'err'); }
}
async function agEliminar(id) {
  const c = agFind(id) || { id }; 
  const ok = await confirmar('¿Eliminar esta reunión?', crow('Reunión', (c.titulo || '#' + id)) + (c.fecha ? crow('Fecha', fmtFechaCorta(c.fecha)) : '') + `<p class="muted small" style="margin-top:8px;">También se elimina su evento del calendario de Google.</p>`);
  if (!ok) return;
  try { const r = await api('priv.reunionEliminar', {}, 'POST', { id, ...m5Auth() }); if (!r.ok) return toast(r.msg || 'No se pudo eliminar', 'err'); AG_ALL = AG_ALL.filter(x => String(x.id) !== String(id)); closeLayer(); toast('Reunión eliminada', 'ok'); agRender(); }
  catch (e) { toast('Error de conexión', 'err'); }
}

/* Modal Agregar / Editar Reunión (contacto de PRINCIPAL o libre) */
/* AJUSTES 16/07: la fecha usa la rueda iOS con tope de HOY en adelante
   (día, mes) y año actual automático. */
function agFormHtml(titulo, c) {
  c = c || {};
  return `<div class="grip"></div><h2 class="h2" style="margin-bottom:10px;">${esc(titulo)}</h2>
    <div class="stack">
      ${field('ID de reunión', inputEl('ag-fid', 'disabled'))}
      ${field('Título de la reunión', inputEl('ag-ftit', 'placeholder="Ej. Visita a líderes de Topacio"'))}
      ${campoFecha('ag-ffecha', 'Fecha', { minHoy: true })}
      ${field('Lugar (zona)', comboboxHtml('ag-flugar', 'Escribe para buscar…'))}
      ${field('Contacto (de la base o libre)', comboboxHtml('ag-fcont', 'Busca en la base o escríbelo…'))}
      ${field('Teléfono', inputEl('ag-ftel', 'inputmode="numeric" maxlength="10" placeholder="10 dígitos (opcional)"'))}
      <div class="ev-hrow">
        ${field('Hora inicio', `<input class="input" id="ag-fini" type="time" />`)}
        ${field('Hora fin', `<input class="input" id="ag-ffin" type="time" />`)}
      </div>
      ${field('Detalles', `<textarea class="input ta" id="ag-fdet" rows="2" placeholder="Dirección, punto de referencia… (si eliges OTRO en Lugar, escríbela aquí)"></textarea>`)}
      ${field('Mensaje a la persona', `<textarea class="input ta" id="ag-fmsg" rows="3" placeholder="Se puede enviar por WhatsApp"></textarea>`)}
      ${field('Bitácora del grupo', `<textarea class="input ta" id="ag-fbit" rows="3" placeholder="Opcional"></textarea>`)}
      <p class="muted small" id="ag-invmsg"></p>
      <button class="btn btn-primary btn-block" id="ag-save">${c.id != null ? 'Guardar cambios' : 'Crear reunión'}</button>
    </div>`;
}
function agFillForm(c, invitados) {
  $('#ag-fid').value = c.id != null ? ('#' + c.id) : '(automático)';
  $('#ag-ftit').value = c.titulo || '';
  $('#ag-ffecha').value = ddmmToInput(c.fecha || '');
  bindCampoFecha('ag-ffecha');
  $('#ag-fcont').value = c.contacto || '';
  $('#ag-ftel').value = c.telefono ? String(c.telefono).replace(/^57/, '') : '';
  $('#ag-fini').value = c.inicia || '';
  $('#ag-ffin').value = c.termina || '';
  $('#ag-fdet').value = c.detalles || '';
  $('#ag-fmsg').value = c.mensaje || '';
  $('#ag-fbit').value = c.bitacora || '';
  onlyDigits($('#ag-ftel'));
  /* AJUSTE 20/07: "OTRO" como opción de Lugar (ubicación libre solo de reuniones). */
  getResidencias().then(l => { bindCombobox('ag-flugar', ['OTRO'].concat(l)); $('#ag-flugar').value = c.lugar || ''; });
  bindContactCombo('ag-fcont', 'ag-ftel', { free: true });
  const im = $('#ag-invmsg');
  if (im) im.textContent = invitados > 0
    ? `Se creará el evento de calendario con administración a ${invitados} usuario(s) (menos el desarrollador).`
    : `Aún no hay usuarios ADMIN/SEDE con correo: el evento se crea sin invitados por ahora.`;
}
function agReadForm() {
  return {
    titulo: val('ag-ftit'),
    fecha: inputToDDMM(($('#ag-ffecha') || {}).value),
    lugar: val('ag-flugar'),
    contacto: val('ag-fcont'),
    telefono: onlyDig(val('ag-ftel')),
    inicia: ($('#ag-fini') || {}).value || '',
    termina: ($('#ag-ffin') || {}).value || '',
    detalles: (($('#ag-fdet') || {}).value || '').trim(),
    mensaje: (($('#ag-fmsg') || {}).value || '').trim(),
    bitacora: (($('#ag-fbit') || {}).value || '').trim()
  };
}
function agValidForm(b) {
  if (!b.titulo) { toast('Escribe el título de la reunión', 'err'); return false; }
  if (!b.fecha) { toast('Selecciona la fecha', 'err'); return false; }
  if (b.telefono && b.telefono.length !== 10) { toast('Teléfono: 10 dígitos', 'err'); return false; }
  if (b.inicia && b.termina && b.termina <= b.inicia) { toast('La hora fin debe ser mayor que la de inicio', 'err'); return false; }
  return true;
}
async function agAgregar(prefillDate) {
  openSheet(`<div class="grip"></div><h2 class="h2">Agregar reunión</h2>${loadingBox('Preparando…')}`);
  let meta;
  try { meta = await api('priv.reunionMeta', m5Auth()); } catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  openSheet(agFormHtml('Agregar reunión', {}));
  agFillForm(prefillDate ? { fecha: dateToDDMM(prefillDate) } : {}, meta.invitados || 0);
  $('#ag-save').onclick = async () => {
    const b = agReadForm(); if (!agValidForm(b)) return;
    const btn = $('#ag-save'); saving(btn, true);
    try { const r = await api('priv.reunionGuardar', {}, 'POST', { ...b, ...m5Auth() }); saving(btn, false); if (!r.ok) return toast(r.msg || 'No se pudo crear', 'err'); AG_ALL.unshift(r.card); closeLayer(); toast('Reunión creada y sincronizada con el calendario', 'ok'); const d = parseFechaES(r.card.fecha); if (d) AG_CUR = d; agRender(); }
    catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}
async function agEditar(id) {
  openSheet(`<div class="grip"></div><h2 class="h2">Editar reunión</h2>${loadingBox('Cargando…')}`);
  let c, meta;
  try { const [rv, rm] = await Promise.all([api('priv.reunionVer', { id, ...m5Auth() }), api('priv.reunionMeta', m5Auth())]); if (!rv.ok) { closeLayer(); return toast(rv.msg, 'err'); } c = rv.reunion; meta = rm; }
  catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  openSheet(agFormHtml('Editar reunión', c));
  agFillForm(c, meta.invitados || 0);
  $('#ag-save').onclick = async () => {
    const b = agReadForm(); if (!agValidForm(b)) return;
    const btn = $('#ag-save'); saving(btn, true);
    try { const r = await api('priv.reunionEditar', {}, 'POST', { id, ...b, ...m5Auth() }); saving(btn, false); if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err'); const i = AG_ALL.findIndex(x => String(x.id) === String(id)); if (i >= 0) AG_ALL[i] = r.card; closeLayer(); toast('Reunión actualizada', 'ok'); const d = parseFechaES(r.card.fecha); if (d) AG_CUR = d; agRender(); }
    catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}

/* ============================================================
   MÓDULO 6 · COMPROMISOS
   ============================================================ */
let CM_ALL = [], CM_FILT = [], CM_SHOWN = 0, CM_CONT = {}, CM_PLANT = '';
const CM_BATCH = 60;

function cmEstadoClass(e) {
  const x = String(e || '').toUpperCase();
  if (x === 'ASIGNADO') return 'cm-asgn';   // Lote B1
  if (x === 'CUMPLIDO') return 'cm-cump';
  if (x === 'DESCARTADO') return 'cm-desc';
  return 'cm-pend';
}

/* Texto listo para WhatsApp (plantilla del servidor).
   Igual que en Líderes: el %0A ya no se usa, el replace es red de seguridad. */
function cmWaText(c) {
  const t = CM_PLANT || '';
  return t.replace(/\[ASIGNADO\]/g, c.asignado || '')
    .replace(/\[COMPROMISO\]/g, c.compromiso || '')
    .replace(/\[NOMBRE\]/g, c.nombre || '')
    .replace(/\[CONTACTO\]/g, c.contacto || '')
    .replace(/%0A/g, '\n');
}

/* Antigüedad: días transcurridos desde la fecha del compromiso */
function cmDias(c) {
  if (!c.ts) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(c.ts); d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((hoy - d) / 86400000));
}
function cmAntigHtml(c) {
  const n = cmDias(c);
  if (n === null) return '';
  const txt = n === 0 ? 'hoy' : n === 1 ? 'hace 1 día' : `hace ${n.toLocaleString('es-CO')} días`;
  if (c.estado !== 'PENDIENTE') return `<span class="cm-antig">${I.clock} ${esc(txt)}</span>`;
  const nivel = n > 30 ? 'cm-a3' : n > 7 ? 'cm-a2' : 'cm-a1';
  return `<span class="cm-antig ${nivel}">${I.clock} ${esc(txt)}</span>`;
}

function cmCardHtml(c) {
  return `<article class="bd-card cm-card ${cmEstadoClass(c.estado)}" data-id="${esc(c.id)}">
    <div class="bd-top">
      <div class="bd-id">
        <b class="bd-nombre">${esc(c.nombre || 'Sin nombre')}</b>
        <span class="bd-doc">${esc(c.residencia || '—')}</span>
      </div>
      <span class="cm-badge ${cmEstadoClass(c.estado)}">${esc(c.estado)}</span>
    </div>
    <p class="cm-texto">${esc(c.compromiso || '—')}</p>
    ${cmSubHtml(c)}
    <div class="cm-foot">
      <span class="cm-asig">${I.star} <b>${esc(c.asignado || 'Sin asignar')}</b></span>
      ${cmAntigHtml(c)}
    </div>
    <div class="bd-acts cm-acts">
      <button class="bd-btn" data-a="estado">Estado</button>
      <button class="bd-btn" data-a="detalles">Detalles</button>
      <button class="bd-btn cm-btn-send" data-a="enviar" ${c.telefono ? '' : 'disabled'}>Enviar</button>
      <button class="bd-btn" data-a="editar">Editar</button>
      <button class="bd-btn bd-btn-danger" data-a="eliminar">Eliminar</button>
    </div>
  </article>`;
}

/* Lote B1: línea de creador + resumen de bitácora bajo el texto de la tarjeta */
function cmSubHtml(c) {
  const partes = [];
  if (c.usuarioNombre) partes.push(`<span class="cm-creador">${I.users} Creado por <b>${esc(c.usuarioNombre)}</b></span>`);
  const n = (c.traza || []).length;
  if (n) partes.push(`<span class="cm-tzcount" title="${esc(c.trazaResumen || '')}">${I.pencil} ${n} en bitácora</span>`);
  return partes.length ? `<div class="cm-sub">${partes.join('')}</div>` : '';
}

/* Lote B1: pinta el hilo de bitácora (entradas ya formateadas por el CORE) */
function cmTzListHtml(entries) {
  if (!entries || !entries.length) return `<p class="muted small tz-empty">Sin entradas en la bitácora todavía.</p>`;
  return entries.map(e => `<div class="tz-item ${e.origen === 'pub' ? 'tz-pub' : 'tz-priv'}">
    <div class="tz-meta"><b>${esc(e.autor || (e.origen === 'pub' ? 'Líder' : 'Panel'))}</b><span>${esc(e.fecha || '')}</span></div>
    <p class="tz-texto">${esc(e.texto || '')}</p>
  </div>`).join('');
}

function cmResumenHtml() {
  const a = CM_CONT.ASIGNADO || 0, p = CM_CONT.PENDIENTE || 0, cu = CM_CONT.CUMPLIDO || 0, d = CM_CONT.DESCARTADO || 0;
  const tot = a + p + cu + d;
  const pct = tot ? Math.round((cu / tot) * 100) : 0;
  return `<div class="cm-resumen">
    <div class="cm-kpis cm-kpis-4">
      <button class="cm-kpi cm-asgn" data-f="Asignado"><b>${a.toLocaleString('es-CO')}</b><span>Asignados</span></button>
      <button class="cm-kpi cm-pend" data-f="Pendiente"><b>${p.toLocaleString('es-CO')}</b><span>Pendientes</span></button>
      <button class="cm-kpi cm-cump" data-f="Cumplido"><b>${cu.toLocaleString('es-CO')}</b><span>Cumplidos</span></button>
      <button class="cm-kpi cm-desc" data-f="Descartado"><b>${d.toLocaleString('es-CO')}</b><span>Descartados</span></button>
    </div>
    <div class="cm-prog">
      <div class="cm-prog-top"><span>Cumplimiento</span><b>${pct}%</b></div>
      <div class="cm-bar"><i style="width:${pct}%"></i></div>
    </div>
  </div>`;
}

async function viewCompromisos(user) {
  M5_ME = user.documento; appWide(true);
  app.innerHTML = `${backbar('Compromisos')}
    <div class="pad">
      <div id="cm-resumen"></div>
      <div class="bd-toolbar">
        <div class="bd-search"><input class="input" id="cm-q" placeholder="Buscar por persona, compromiso, asignado, creador o zona…" autocomplete="off" /></div>
        <button class="btn btn-primary bd-add" id="cm-add">+ Agregar</button>
      </div>
      <div class="cm-nav-sol"><button class="btn btn-ghost btn-block" id="cm-ir-sol">${I.repeat} Ir a Solicitudes</button></div>
      <div class="bd-chips" id="cm-chips">
        ${['Todos', 'Asignado', 'Pendiente', 'Cumplido', 'Descartado'].map((t, i) => `<button class="bd-chip ${i === 0 ? 'active' : ''}" data-f="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
      <div class="bd-count" id="cm-count"></div>
      <div id="cm-body">${loadingBox('Cargando compromisos…')}</div>
      <div class="center" id="cm-more" style="margin-top:12px;"></div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('home');
  $('#cm-add').onclick = () => cmAgregar();
  const irSol = $('#cm-ir-sol'); if (irSol) irSol.onclick = () => go('solicitudes');
  try {
    const r = await api('priv.compromisos', m5Auth());
    if (!r.ok) { $('#cm-body').innerHTML = `<p class="muted center">No se pudo cargar.</p>`; return; }
    CM_ALL = r.items || []; CM_CONT = r.contadores || {}; CM_PLANT = r.plantilla || '';
    cmPintarResumen();
    cmApplyFilter();
  } catch (e) { $('#cm-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; return; }
  const q = $('#cm-q'); let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(cmApplyFilter, 160); };
  $$('#cm-chips .bd-chip').forEach(ch => ch.onclick = () => cmSetFilter(ch.dataset.f));

  vivoBind('compromisos', M5_ME, vivoCompromisos);   // EN VIVO
}

/* ---- EN VIVO · Compromisos ---- */
async function vivoCompromisos() {
  const r = await api('priv.compromisos', m5Auth(), 'GET', null, SILENCIO);
  if (!r.ok || !vivoCambio(JSON.stringify(r.items))) return;
  CM_ALL = r.items || []; CM_CONT = r.contadores || {}; CM_PLANT = r.plantilla || CM_PLANT;
  cmPintarResumen(); cmApplyFilter();
  /* Lote B1: si hay una bitácora abierta escribiéndose, NO se cierra la hoja
     (se perdería el borrador). El listado de abajo sí se refresca en silencio. */
  if (!document.querySelector('#cm-tz-in')) vivoCerrarHoja();
}

function cmPintarResumen() {
  const el = $('#cm-resumen'); if (!el) return;
  el.innerHTML = cmResumenHtml();
  el.querySelectorAll('.cm-kpi').forEach(k => k.onclick = () => cmSetFilter(k.dataset.f));
}
function cmSetFilter(f) {
  const chips = $$('#cm-chips .bd-chip');
  const activo = (($('#cm-chips .bd-chip.active') || {}).dataset || {}).f;
  const destino = (activo === f) ? 'Todos' : f;   // volver a tocar = quitar filtro
  chips.forEach(x => x.classList.toggle('active', x.dataset.f === destino));
  cmApplyFilter();
}
function cmActiveFilter() { const a = $('#cm-chips .bd-chip.active'); return a ? a.dataset.f : 'Todos'; }

function cmApplyFilter() {
  const q = (($('#cm-q') || {}).value || '').trim().toLowerCase();
  const f = cmActiveFilter().toUpperCase();
  CM_FILT = CM_ALL.filter(c => {
    if (f !== 'TODOS' && String(c.estado).toUpperCase() !== f) return false;
    if (!q) return true;
    const hay = ((c.nombre || '') + ' ' + (c.compromiso || '') + ' ' + (c.asignado || '') + ' ' + (c.residencia || '') + ' ' + (c.contacto || '') + ' ' + (c.usuarioNombre || '')).toLowerCase();
    return hay.includes(q);
  });
  CM_FILT.sort((a, b) => (b.ts || 0) - (a.ts || 0));   // más reciente primero
  CM_SHOWN = 0;
  const cEl = $('#cm-count'); if (cEl) cEl.textContent = `${CM_FILT.length.toLocaleString('es-CO')} compromiso(s) · del más reciente al más antiguo`;
  const body = $('#cm-body');
  if (body) body.innerHTML = CM_FILT.length ? `<div class="bd-grid" id="cm-grid"></div>` : `<p class="muted center" style="margin-top:20px;">Sin compromisos para este filtro.</p>`;
  cmRenderMore();
}
function cmRenderMore() {
  const grid = $('#cm-grid'); if (!grid) { const m = $('#cm-more'); if (m) m.innerHTML = ''; return; }
  const next = CM_FILT.slice(CM_SHOWN, CM_SHOWN + CM_BATCH);
  grid.insertAdjacentHTML('beforeend', next.map(cmCardHtml).join(''));
  CM_SHOWN += next.length;
  $$('#cm-grid .cm-card').forEach(card => {
    if (card._wired) return; card._wired = true;
    card.querySelectorAll('.bd-btn').forEach(b => b.onclick = () => cmAccion(b.dataset.a, card.dataset.id));
  });
  const more = $('#cm-more');
  if (CM_SHOWN < CM_FILT.length) { more.innerHTML = `<button class="btn btn-ghost" id="cm-more-btn">Ver más (${(CM_FILT.length - CM_SHOWN).toLocaleString('es-CO')} restantes)</button>`; $('#cm-more-btn').onclick = cmRenderMore; }
  else more.innerHTML = '';
}
function cmFind(id) { return CM_ALL.find(x => String(x.id) === String(id)); }
function cmRecontar() {
  CM_CONT = { ASIGNADO: 0, PENDIENTE: 0, CUMPLIDO: 0, DESCARTADO: 0 };
  CM_ALL.forEach(c => { CM_CONT[c.estado] = (CM_CONT[c.estado] || 0) + 1; });
  cmPintarResumen();
}
function cmUpsert(card) {
  const i = CM_ALL.findIndex(x => String(x.id) === String(card.id));
  if (i >= 0) CM_ALL[i] = card; else CM_ALL.push(card);
  CM_ALL.sort((a, b) => (a.ts || 0) - (b.ts || 0));   // más antiguo primero
  cmRecontar(); cmApplyFilter();
}
function cmAccion(a, id) {
  if (a === 'estado') return cmEstadoPicker(id);
  if (a === 'detalles') return cmDetalles(id);
  if (a === 'enviar') return cmEnviar(id);
  if (a === 'editar') return cmEditar(id);
  if (a === 'eliminar') return cmEliminar(id);
}

/* ---- Detalles (+ copiar) ---- */
function cmTextoCopia(c) {
  const L = [];
  L.push(`📌 COMPROMISO — ${c.estado}`);
  L.push(`Persona: ${c.nombre}`);
  if (c.residencia) L.push(`Zona: ${c.residencia}`);
  if (c.contacto) L.push(`Contacto: ${String(c.contacto).replace(/^57/, '')}`);
  L.push(`\n${c.compromiso}`);
  L.push(`\nAsignado: ${c.asignado || '—'}`);
  if (c.fecha) L.push(`Registrado: ${fmtCreada(c.fecha)}`);
  return L.join('\n');
}
async function cmDetalles(id) {
  openSheet(`<div class="grip"></div><h2 class="h2">Compromiso</h2>${loadingBox('Cargando…')}`);
  let c;
  try { const r = await api('priv.compromisoVer', { id, ...m5Auth() }); if (!r.ok) { closeLayer(); return toast(r.msg || 'No se pudo cargar', 'err'); } c = r.compromiso; }
  catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  const dias = cmDias(c);
  const rows = [
    ['Estado', c.estado],
    ['Persona', c.nombre || '—'],
    ['Zona', c.residencia || '—'],
    ['Contacto', c.contacto ? String(c.contacto).replace(/^57/, '') : '—'],
    ['Compromiso', c.compromiso || '—'],
    ['Asignado', c.asignado || '—'],
    ['Tel. asignado', c.telefono ? String(c.telefono).replace(/^57/, '') : '—'],
    ['Creado por', c.usuarioNombre || '—'],
    ['Registrado', c.fecha ? fmtCreada(c.fecha) : '—'],
    ['Antigüedad', dias === null ? '—' : (dias === 0 ? 'hoy' : dias + ' día(s)')],
    ['ID', c.id]
  ].map(([k, v]) => `<div class="det-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  openSheet(`<div class="grip"></div>
    <div class="det-head"><h2 class="h2">${esc(c.nombre)}</h2><span class="cm-badge ${cmEstadoClass(c.estado)}">${esc(c.estado)}</span></div>
    <div class="det-list">${rows}</div>
    <div class="tz-wrap" id="cm-tz">
      <div class="tz-head"><span>${I.pencil} Bitácora / trazabilidad</span><em id="cm-tz-res">${esc(c.trazaResumen || '')}</em></div>
      <div class="tz-list" id="cm-tz-list">${cmTzListHtml(c.traza)}</div>
      <textarea class="input ta" id="cm-tz-in" rows="2" placeholder="Escribe una entrada de la bitácora…"></textarea>
      <button class="btn btn-ghost btn-block" id="cm-tz-add">${I.plus} Agregar a la bitácora</button>
    </div>
    <div class="stack" style="margin-top:12px;">
      <button class="btn btn-ghost btn-block" id="cm-copy">${I.copy} Copiar en portapapeles</button>
      <button class="btn btn-primary btn-block" id="cm-edit">Editar</button>
    </div>`);
  $('#cm-copy').onclick = async () => { try { await navigator.clipboard.writeText(cmTextoCopia(c)); toast('Compromiso copiado', 'ok'); } catch { toast('No se pudo copiar', 'err'); } };
  $('#cm-edit').onclick = () => { closeLayer(); cmEditar(id); };
  $('#cm-tz-add').onclick = () => cmTzAgregar(id);
}

/* ---- Apendar una entrada a la bitácora (motor priv.compromisoTraza) · Lote B1 ---- */
async function cmTzAgregar(id) {
  const inp = $('#cm-tz-in'); if (!inp) return;
  const texto = (inp.value || '').trim();
  if (!texto) return toast('Escribe la entrada de la bitácora', 'err');
  const btn = $('#cm-tz-add'); if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-brand"></span>'; }
  try {
    const r = await api('priv.compromisoTraza', {}, 'POST', { id, texto, ...m5Auth() });
    if (!r.ok) { toast(r.msg || 'No se pudo guardar', 'err'); return; }
    inp.value = '';
    const list = $('#cm-tz-list'); if (list) list.innerHTML = cmTzListHtml(r.entries);
    const res = $('#cm-tz-res'); if (res) res.textContent = r.resumen || '';
    if (r.card) cmUpsert(r.card);   // refresca tarjeta/contadores por debajo (sin cerrar la hoja)
    toast('Bitácora actualizada', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
  finally { if ($('#cm-tz-add')) { const b = $('#cm-tz-add'); b.disabled = false; b.innerHTML = `${I.plus} Agregar a la bitácora`; } }
}

/* ---- Cambiar estado ---- */
function cmEstadoPicker(id) {
  const c = cmFind(id); if (!c) return toast('Compromiso no encontrado', 'err');
  const opts = [['ASIGNADO', 'cm-asgn'], ['PENDIENTE', 'cm-pend'], ['CUMPLIDO', 'cm-cump'], ['DESCARTADO', 'cm-desc']];
  openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:4px;">Cambiar estado</h2>
    <p class="muted small">${esc(c.nombre)} · ${esc((c.compromiso || '').slice(0, 60))}${(c.compromiso || '').length > 60 ? '…' : ''}</p>
    <div class="estado-opts">${opts.map(([e, cl]) => `<button class="estado-opt ${cl} ${String(c.estado).toUpperCase() === e ? 'sel' : ''}" data-e="${e}">${e}</button>`).join('')}</div>`);
  layer.querySelectorAll('.estado-opt').forEach(b => b.onclick = async () => {
    if (b.classList.contains('sel')) return closeLayer();
    layer.querySelectorAll('.estado-opt').forEach(x => x.disabled = true);
    try {
      const r = await api('priv.compromisoEstado', {}, 'POST', { id, estado: b.dataset.e, ...m5Auth() });
      if (!r.ok) { toast(r.msg || 'No se pudo cambiar', 'err'); layer.querySelectorAll('.estado-opt').forEach(x => x.disabled = false); return; }
      closeLayer(); toast('Estado actualizado', 'ok'); cmUpsert(r.card);
    } catch (e) { toast('Error de conexión', 'err'); layer.querySelectorAll('.estado-opt').forEach(x => x.disabled = false); }
  });
}

/* ---- Enviar al asignado (WhatsApp directo o bot), con vista previa editable ---- */
async function cmEnviar(id) {
  openSheet(`<div class="grip"></div><h2 class="h2">Enviar compromiso</h2>${loadingBox('Preparando mensaje…')}`);
  let c;
  try { const r = await api('priv.compromisoVer', { id, ...m5Auth() }); if (!r.ok) { closeLayer(); return toast(r.msg || 'No se pudo cargar', 'err'); } c = r.compromiso; }
  catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  if (!c.telefono) { closeLayer(); return toast('El asignado no tiene teléfono registrado', 'err'); }
  const texto = (c.mensaje ? c.mensaje.replace(/%0A/g, '\n') : cmWaText(c));
  openSheet(`<div class="grip"></div>
    <h2 class="h2" style="margin-bottom:4px;">Enviar compromiso</h2>
    <p class="muted small">Para <b>${esc(c.asignado)}</b> · ${esc(String(c.telefono).replace(/^57/, ''))}</p>
    ${field('Mensaje (puedes ajustarlo antes de enviar)', `<textarea class="input ta cm-prev" id="cm-msg" rows="9"></textarea>`)}
    <div class="ag-wa-row">
      <button class="btn btn-primary" id="cm-wa-dir">${I.wa} WhatsApp directo</button>
      <button class="btn btn-ghost" id="cm-wa-bot">Enviar por bot</button>
    </div>`);
  $('#cm-msg').value = texto;
  $('#cm-wa-dir').onclick = () => ldWaOpen(c.telefono, $('#cm-msg').value);
  $('#cm-wa-bot').onclick = () => cmWaBot(c);
}
/* Bot con doble toque de confirmación (mismo patrón que Líderes/Agenda) */
function cmWaBot(c) {
  const b = $('#cm-wa-bot'); if (!b || b.disabled) return;
  if (!b._armed) {
    b._armed = true; b.dataset.orig = b.innerHTML; b.classList.add('ld-armed'); b.textContent = '¿Confirmar envío?';
    b._t = setTimeout(() => { b._armed = false; b.classList.remove('ld-armed'); b.innerHTML = b.dataset.orig; }, 3500);
    return;
  }
  clearTimeout(b._t); b._armed = false; b.classList.remove('ld-armed'); b.disabled = true;
  b.innerHTML = '<span class="spinner spinner-brand"></span>';
  api('priv.compromisoWaBot', {}, 'POST', { id: c.id, texto: ($('#cm-msg') || {}).value || '', ...m5Auth() })
    .then(r => { toast(r.msg || (r.ok ? 'Enviado' : 'No se pudo enviar'), r.ok ? 'ok' : 'err'); if (r.ok) closeLayer(); })
    .catch(() => toast('Error de conexión', 'err'))
    .finally(() => { if ($('#cm-wa-bot')) { b.disabled = false; b.innerHTML = b.dataset.orig || 'Enviar por bot'; } });
}

/* ---- Combo de persona de PRINCIPAL que además guarda el DOCUMENTO ---- */
function cmPersonaCombo(idName, idInfo) {
  const input = $('#' + idName), list = $('#' + idName + '-list'); if (!input) return;
  let t = null;
  const info = idInfo ? $('#' + idInfo) : null;
  const paint = (items) => {
    list.innerHTML = items.length
      ? items.map(o => `<button type="button" class="combo-opt" data-doc="${esc(o.documento)}" data-nom="${esc(o.nombre)}" data-tel="${esc(o.contacto || '')}">${esc(o.nombre)} <span class="combo-sub">CC ${esc(o.documento)}</span></button>`).join('')
      : `<div class="combo-empty">Sin resultados en la base</div>`;
    list.querySelectorAll('.combo-opt').forEach(b => b.onclick = () => {
      input.value = b.dataset.nom; input.dataset.doc = b.dataset.doc; list.hidden = true;
      if (info) info.textContent = b.dataset.tel ? ('Tel. ' + b.dataset.tel) : 'Sin teléfono en la base';
    });
    list.hidden = false;
  };
  input.oninput = () => {
    input.dataset.doc = '';                       // al escribir libre se pierde el vínculo
    if (info) info.textContent = '';
    clearTimeout(t); const q = input.value.trim();
    if (q.length < 2) { list.hidden = true; return; }
    t = setTimeout(async () => {
      try { const r = await api('priv.contactoBuscar', { q, ...m5Auth() }); paint((r && r.items) || []); }
      catch (e) { list.hidden = true; }
    }, 240);
  };
  input.onfocus = () => { if (input.value.trim().length >= 2 && !input.dataset.doc) input.oninput(); };
}

/* ---- Formulario Agregar / Editar ---- */
function cmFormHtml(titulo, c) {
  c = c || {};
  return `<div class="grip"></div><h2 class="h2" style="margin-bottom:10px;">${esc(titulo)}</h2>
    <div class="stack">
      ${field('Nombre (de la base)', comboboxHtml('cm-fnom', 'Busca por nombre o documento…') + `<p class="muted small cm-hint" id="cm-fnom-info"></p>`)}
      ${field('Compromiso', `<textarea class="input ta" id="cm-fcomp" rows="4" placeholder="¿Qué se comprometió a hacer?"></textarea>`)}
      ${field('Asignado (de la base)', comboboxHtml('cm-fasig', 'Busca por nombre o documento…') + `<p class="muted small cm-hint" id="cm-fasig-info"></p>`)}
      ${c.id ? '' : `<p class="muted small">La fecha y la hora se registran automáticamente.</p>`}
      <button class="btn btn-primary btn-block" id="cm-save">${c.id ? 'Guardar cambios' : 'Crear compromiso'}</button>
    </div>`;
}
function cmFillForm(c) {
  $('#cm-fnom').value = c.nombre || '';
  $('#cm-fcomp').value = c.compromiso || '';
  $('#cm-fasig').value = c.asignado || '';
  if (c.contacto) $('#cm-fnom-info').textContent = 'Tel. ' + String(c.contacto).replace(/^57/, '');
  if (c.telefono) $('#cm-fasig-info').textContent = 'Tel. ' + String(c.telefono).replace(/^57/, '');
  cmPersonaCombo('cm-fnom', 'cm-fnom-info');
  cmPersonaCombo('cm-fasig', 'cm-fasig-info');
}
function cmReadForm() {
  return {
    nombre: val('cm-fnom'),
    nombreDoc: (($('#cm-fnom') || {}).dataset || {}).doc || '',
    compromiso: (($('#cm-fcomp') || {}).value || '').trim(),
    asignado: val('cm-fasig'),
    asignadoDoc: (($('#cm-fasig') || {}).dataset || {}).doc || ''
  };
}
function cmValidForm(b) {
  if (!b.nombre) { toast('Elige el nombre de la persona', 'err'); return false; }
  if (!b.compromiso) { toast('Escribe el compromiso', 'err'); return false; }
  if (!b.asignado) { toast('Elige el asignado', 'err'); return false; }
  return true;
}
function cmAgregar() {
  openSheet(cmFormHtml('Nuevo compromiso', {}));
  cmFillForm({});
  $('#cm-save').onclick = async () => {
    const b = cmReadForm(); if (!cmValidForm(b)) return;
    const btn = $('#cm-save'); saving(btn, true);
    try {
      const r = await api('priv.compromisoGuardar', {}, 'POST', { ...b, ...m5Auth() });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo crear', 'err');
      closeLayer(); toast('Compromiso creado', 'ok');
      if (($('#cm-q') || {}).value) $('#cm-q').value = '';
      $$('#cm-chips .bd-chip').forEach((x, i) => x.classList.toggle('active', i === 0));
      cmUpsert(r.card);
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}
async function cmEditar(id) {
  openSheet(`<div class="grip"></div><h2 class="h2">Editar compromiso</h2>${loadingBox('Cargando…')}`);
  let c;
  try { const r = await api('priv.compromisoVer', { id, ...m5Auth() }); if (!r.ok) { closeLayer(); return toast(r.msg, 'err'); } c = r.compromiso; }
  catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  openSheet(cmFormHtml('Editar compromiso', c));
  cmFillForm(c);
  $('#cm-save').onclick = async () => {
    const b = cmReadForm(); if (!cmValidForm(b)) return;
    const btn = $('#cm-save'); saving(btn, true);
    try {
      const r = await api('priv.compromisoEditar', {}, 'POST', { id, ...b, ...m5Auth() });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
      closeLayer(); toast('Compromiso actualizado', 'ok'); cmUpsert(r.card);
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}
async function cmEliminar(id) {
  const c = cmFind(id); if (!c) return toast('Compromiso no encontrado', 'err');
  const ok = await confirmar('¿Eliminar este compromiso?', crow('Persona', c.nombre) + crow('Compromiso', (c.compromiso || '').slice(0, 80)) + `<p class="muted small" style="margin-top:8px;">Esta acción no se puede deshacer.</p>`);
  if (!ok) return;
  try {
    const r = await api('priv.compromisoEliminar', {}, 'POST', { id, ...m5Auth() });
    if (!r.ok) return toast(r.msg || 'No se pudo eliminar', 'err');
    CM_ALL = CM_ALL.filter(x => String(x.id) !== String(id));
    cmRecontar(); cmApplyFilter(); toast('Compromiso eliminado', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
}

/* ============================================================
   SOLICITUDES (app privada · Lote B1·F)
   Gemela liviana de Compromisos: la crea el panel y va dirigida a un LÍDER.
   Reutiliza estilos cm-*, el hilo tz-* y el combo de la base.
   ============================================================ */
let SL_ALL = [], SL_FILT = [], SL_SHOWN = 0, SL_CONT = {}, SL_ME = '';
const SL_BATCH = 60;

function slResumenHtml() {
  const a = SL_CONT.ASIGNADO || 0, p = SL_CONT.PENDIENTE || 0, cu = SL_CONT.CUMPLIDO || 0, d = SL_CONT.DESCARTADO || 0;
  const tot = a + p + cu + d, pct = tot ? Math.round((cu / tot) * 100) : 0;
  return `<div class="cm-resumen">
    <div class="cm-kpis cm-kpis-4">
      <button class="cm-kpi cm-asgn" data-f="Asignado"><b>${a.toLocaleString('es-CO')}</b><span>Asignadas</span></button>
      <button class="cm-kpi cm-pend" data-f="Pendiente"><b>${p.toLocaleString('es-CO')}</b><span>Pendientes</span></button>
      <button class="cm-kpi cm-cump" data-f="Cumplido"><b>${cu.toLocaleString('es-CO')}</b><span>Cumplidas</span></button>
      <button class="cm-kpi cm-desc" data-f="Descartado"><b>${d.toLocaleString('es-CO')}</b><span>Descartadas</span></button>
    </div>
    <div class="cm-prog">
      <div class="cm-prog-top"><span>Cumplimiento</span><b>${pct}%</b></div>
      <div class="cm-bar"><i style="width:${pct}%"></i></div>
    </div>
  </div>`;
}

function slCardHtml(c) {
  const n = (c.traza || []).length;
  return `<article class="bd-card cm-card ${cmEstadoClass(c.estado)}" data-id="${esc(c.id)}">
    <div class="bd-top">
      <div class="bd-id"><b class="bd-nombre">${esc(c.asignado || 'Sin asignar')}</b><span class="bd-doc">Asignado</span></div>
      <span class="cm-badge ${cmEstadoClass(c.estado)}">${esc(c.estado)}</span>
    </div>
    <p class="cm-texto">${esc(c.solicitud || '—')}</p>
    <div class="cm-sub">
      ${c.usuarioNombre ? `<span class="cm-creador">${I.users} Creado por <b>${esc(c.usuarioNombre)}</b></span>` : ''}
      ${n ? `<span class="cm-tzcount" title="${esc(c.trazaResumen || '')}">${I.pencil} ${n} en bitácora</span>` : ''}
    </div>
    <div class="bd-acts cm-acts">
      <button class="bd-btn" data-a="estado">Estado</button>
      <button class="bd-btn" data-a="detalles">Detalles</button>
      <button class="bd-btn cm-btn-send" data-a="enviar" ${c.telefono ? '' : 'disabled'}>Enviar</button>
      <button class="bd-btn" data-a="editar">Editar</button>
      <button class="bd-btn bd-btn-danger" data-a="eliminar">Eliminar</button>
    </div>
  </article>`;
}

async function viewSolicitudes(user) {
  SL_ME = user.documento; appWide(true);
  app.innerHTML = `${backbar('Solicitudes')}
    <div class="pad">
      <div id="sl-resumen"></div>
      <div class="bd-toolbar">
        <div class="bd-search"><input class="input" id="sl-q" placeholder="Buscar por solicitud, asignado o creador…" autocomplete="off" /></div>
        <button class="btn btn-primary bd-add" id="sl-add">+ Nueva</button>
      </div>
      <div class="cm-nav-sol"><button class="btn btn-ghost btn-block" id="sl-ir-com">${I.repeat} Ir a Compromisos</button></div>
      <div class="bd-chips" id="sl-chips">
        ${['Todos', 'Asignado', 'Pendiente', 'Cumplido', 'Descartado'].map((t, i) => `<button class="bd-chip ${i === 0 ? 'active' : ''}" data-f="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
      <div class="bd-count" id="sl-count"></div>
      <div id="sl-body">${loadingBox('Cargando solicitudes…')}</div>
      <div class="center" id="sl-more" style="margin-top:12px;"></div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('compromisos');
  $('#sl-add').onclick = () => slAgregar();
  $('#sl-ir-com').onclick = () => go('compromisos');
  try {
    const r = await api('priv.solicitudes', m5Auth());
    if (!r.ok) { $('#sl-body').innerHTML = `<p class="muted center">No se pudo cargar.</p>`; return; }
    SL_ALL = r.items || []; SL_CONT = r.contadores || {};
    slPintarResumen(); slApplyFilter();
  } catch (e) { $('#sl-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; return; }
  const q = $('#sl-q'); let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(slApplyFilter, 160); };
  $$('#sl-chips .bd-chip').forEach(ch => ch.onclick = () => slSetFilter(ch.dataset.f));
  vivoBind('solicitudes', SL_ME, vivoSolicitudes);
}

async function vivoSolicitudes() {
  const r = await api('priv.solicitudes', m5Auth(), 'GET', null, SILENCIO);
  if (!r.ok || !vivoCambio(JSON.stringify(r.items))) return;
  SL_ALL = r.items || []; SL_CONT = r.contadores || {};
  slPintarResumen(); slApplyFilter();
  if (!document.querySelector('#sl-tz-in')) vivoCerrarHoja();
}

function slPintarResumen() {
  const el = $('#sl-resumen'); if (!el) return;
  el.innerHTML = slResumenHtml();
  el.querySelectorAll('.cm-kpi').forEach(k => k.onclick = () => slSetFilter(k.dataset.f));
}
function slSetFilter(f) {
  const chips = $$('#sl-chips .bd-chip');
  const activo = (($('#sl-chips .bd-chip.active') || {}).dataset || {}).f;
  const destino = (activo === f) ? 'Todos' : f;
  chips.forEach(x => x.classList.toggle('active', x.dataset.f === destino));
  slApplyFilter();
}
function slActiveFilter() { const a = $('#sl-chips .bd-chip.active'); return a ? a.dataset.f : 'Todos'; }
function slApplyFilter() {
  const q = (($('#sl-q') || {}).value || '').trim().toLowerCase();
  const f = slActiveFilter().toUpperCase();
  SL_FILT = SL_ALL.filter(c => {
    if (f !== 'TODOS' && String(c.estado).toUpperCase() !== f) return false;
    if (!q) return true;
    return ((c.solicitud || '') + ' ' + (c.asignado || '') + ' ' + (c.usuarioNombre || '')).toLowerCase().includes(q);
  });
  SL_FILT.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  SL_SHOWN = 0;
  const cEl = $('#sl-count'); if (cEl) cEl.textContent = `${SL_FILT.length.toLocaleString('es-CO')} solicitud(es) · de la más reciente a la más antigua`;
  const body = $('#sl-body');
  if (body) body.innerHTML = SL_FILT.length ? `<div class="bd-grid" id="sl-grid"></div>` : `<p class="muted center" style="margin-top:20px;">Sin solicitudes para este filtro.</p>`;
  slRenderMore();
}
function slRenderMore() {
  const grid = $('#sl-grid'); if (!grid) { const m = $('#sl-more'); if (m) m.innerHTML = ''; return; }
  const next = SL_FILT.slice(SL_SHOWN, SL_SHOWN + SL_BATCH);
  grid.insertAdjacentHTML('beforeend', next.map(slCardHtml).join(''));
  SL_SHOWN += next.length;
  $$('#sl-grid .cm-card').forEach(card => { if (card._wired) return; card._wired = true; card.querySelectorAll('.bd-btn').forEach(b => b.onclick = () => slAccion(b.dataset.a, card.dataset.id)); });
  const more = $('#sl-more');
  if (SL_SHOWN < SL_FILT.length) { more.innerHTML = `<button class="btn btn-ghost" id="sl-more-btn">Ver más (${(SL_FILT.length - SL_SHOWN).toLocaleString('es-CO')} restantes)</button>`; $('#sl-more-btn').onclick = slRenderMore; }
  else more.innerHTML = '';
}
function slFind(id) { return SL_ALL.find(x => String(x.id) === String(id)); }
function slRecontar() { SL_CONT = { ASIGNADO: 0, PENDIENTE: 0, CUMPLIDO: 0, DESCARTADO: 0 }; SL_ALL.forEach(c => { SL_CONT[c.estado] = (SL_CONT[c.estado] || 0) + 1; }); slPintarResumen(); }
function slUpsert(card) { const i = SL_ALL.findIndex(x => String(x.id) === String(card.id)); if (i >= 0) SL_ALL[i] = card; else SL_ALL.push(card); SL_ALL.sort((a, b) => (a.ts || 0) - (b.ts || 0)); slRecontar(); slApplyFilter(); }
function slAccion(a, id) {
  if (a === 'estado') return slEstadoPicker(id);
  if (a === 'detalles') return slDetalle(id);
  if (a === 'enviar') return slEnviar(id);
  if (a === 'editar') return slEditar(id);
  if (a === 'eliminar') return slEliminar(id);
}

/* Texto para copiar al portapapeles (gemelo de cmTextoCopia) */
function slTextoCopia(c) {
  const L = [];
  L.push(`📌 SOLICITUD — ${c.estado}`);
  L.push(`\n${c.solicitud}`);
  L.push(`\nAsignado: ${c.asignado || '—'}`);
  if (c.fecha) L.push(`Registrado: ${fmtCreada(c.fecha)}`);
  return L.join('\n');
}

/* ---- Enviar al asignado (WhatsApp directo o bot) · gemelo de cmEnviar ---- */
async function slEnviar(id) {
  openSheet(`<div class="grip"></div><h2 class="h2">Enviar solicitud</h2>${loadingBox('Preparando mensaje…')}`);
  let c;
  try { const r = await api('priv.solicitudVer', { id, ...m5Auth() }); if (!r.ok) { closeLayer(); return toast(r.msg || 'No se pudo cargar', 'err'); } c = r.solicitud; }
  catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  if (!c.telefono) { closeLayer(); return toast('El asignado no tiene teléfono registrado', 'err'); }
  const texto = (c.mensaje ? c.mensaje.replace(/%0A/g, '\n') : '');
  openSheet(`<div class="grip"></div>
    <h2 class="h2" style="margin-bottom:4px;">Enviar solicitud</h2>
    <p class="muted small">Para <b>${esc(c.asignado)}</b> · ${esc(String(c.telefono).replace(/^57/, ''))}</p>
    ${field('Mensaje (puedes ajustarlo antes de enviar)', `<textarea class="input ta cm-prev" id="sl-msg" rows="8"></textarea>`)}
    <div class="ag-wa-row">
      <button class="btn btn-primary" id="sl-wa-dir">${I.wa} WhatsApp directo</button>
      <button class="btn btn-ghost" id="sl-wa-bot">Enviar por bot</button>
    </div>`);
  $('#sl-msg').value = texto;
  $('#sl-wa-dir').onclick = () => ldWaOpen(c.telefono, $('#sl-msg').value);
  $('#sl-wa-bot').onclick = () => slWaBot(c);
}
/* Bot con doble toque de confirmación (mismo patrón que compromisos) */
function slWaBot(c) {
  const b = $('#sl-wa-bot'); if (!b || b.disabled) return;
  if (!b._armed) {
    b._armed = true; b.dataset.orig = b.innerHTML; b.classList.add('ld-armed'); b.textContent = '¿Confirmar envío?';
    b._t = setTimeout(() => { b._armed = false; b.classList.remove('ld-armed'); b.innerHTML = b.dataset.orig; }, 3500);
    return;
  }
  clearTimeout(b._t); b._armed = false; b.classList.remove('ld-armed'); b.disabled = true;
  b.innerHTML = '<span class="spinner spinner-brand"></span>';
  api('priv.solicitudWaBot', {}, 'POST', { id: c.id, texto: ($('#sl-msg') || {}).value || '', ...m5Auth() })
    .then(r => { toast(r.msg || (r.ok ? 'Enviado' : 'No se pudo enviar'), r.ok ? 'ok' : 'err'); if (r.ok) closeLayer(); })
    .catch(() => toast('Error de conexión', 'err'))
    .finally(() => { if ($('#sl-wa-bot')) { b.disabled = false; b.innerHTML = b.dataset.orig || 'Enviar por bot'; } });
}

async function slDetalle(id) {
  openSheet(`<div class="grip"></div><h2 class="h2">Solicitud</h2>${loadingBox('Cargando…')}`);
  let c;
  try { const r = await api('priv.solicitudVer', { id, ...m5Auth() }); if (!r.ok) { closeLayer(); return toast(r.msg || 'No se pudo cargar', 'err'); } c = r.solicitud; }
  catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  const rows = [
    ['Estado', c.estado],
    ['Solicitud', c.solicitud || '—'],
    ['Asignado', c.asignado || '—'],
    ['Tel. asignado', c.telefono ? String(c.telefono).replace(/^57/, '') : '—'],
    ['Creado por', c.usuarioNombre || '—'],
    ['Registrado', c.fecha ? fmtCreada(c.fecha) : '—'],
    ['ID', c.id]
  ].map(([k, v]) => `<div class="det-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  openSheet(`<div class="grip"></div>
    <div class="det-head"><h2 class="h2">Solicitud</h2><span class="cm-badge ${cmEstadoClass(c.estado)}">${esc(c.estado)}</span></div>
    <div class="det-list">${rows}</div>
    <div class="tz-wrap" id="sl-tz">
      <div class="tz-head"><span>${I.pencil} Bitácora / trazabilidad</span><em id="sl-tz-res">${esc(c.trazaResumen || '')}</em></div>
      <div class="tz-list" id="sl-tz-list">${cmTzListHtml(c.traza)}</div>
      <textarea class="input ta" id="sl-tz-in" rows="2" placeholder="Escribe una entrada de la bitácora…"></textarea>
      <button class="btn btn-ghost btn-block" id="sl-tz-add">${I.plus} Agregar a la bitácora</button>
    </div>
    <div class="stack" style="margin-top:12px;">
      <button class="btn btn-ghost btn-block" id="sl-copy">${I.copy} Copiar en portapapeles</button>
      <button class="btn btn-primary btn-block" id="sl-edit">Editar</button>
    </div>`);
  $('#sl-copy').onclick = async () => { try { await navigator.clipboard.writeText(slTextoCopia(c)); toast('Solicitud copiada', 'ok'); } catch { toast('No se pudo copiar', 'err'); } };
  $('#sl-edit').onclick = () => { closeLayer(); slEditar(id); };
  $('#sl-tz-add').onclick = () => slTzAgregar(id);
}

async function slTzAgregar(id) {
  const inp = $('#sl-tz-in'); if (!inp) return;
  const texto = (inp.value || '').trim();
  if (!texto) return toast('Escribe la entrada de la bitácora', 'err');
  const btn = $('#sl-tz-add'); if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-brand"></span>'; }
  try {
    const r = await api('priv.solicitudTraza', {}, 'POST', { id, texto, ...m5Auth() });
    if (!r.ok) { toast(r.msg || 'No se pudo guardar', 'err'); return; }
    inp.value = '';
    const list = $('#sl-tz-list'); if (list) list.innerHTML = cmTzListHtml(r.entries);
    const res = $('#sl-tz-res'); if (res) res.textContent = r.resumen || '';
    if (r.card) slUpsert(r.card);
    toast('Bitácora actualizada', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
  finally { if ($('#sl-tz-add')) { const b = $('#sl-tz-add'); b.disabled = false; b.innerHTML = `${I.plus} Agregar a la bitácora`; } }
}

function slEstadoPicker(id) {
  const c = slFind(id); if (!c) return toast('Solicitud no encontrada', 'err');
  const opts = [['ASIGNADO', 'cm-asgn'], ['PENDIENTE', 'cm-pend'], ['CUMPLIDO', 'cm-cump'], ['DESCARTADO', 'cm-desc']];
  openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:4px;">Cambiar estado</h2>
    <p class="muted small">${esc((c.solicitud || '').slice(0, 70))}${(c.solicitud || '').length > 70 ? '…' : ''}</p>
    <div class="estado-opts">${opts.map(([e, cl]) => `<button class="estado-opt ${cl} ${String(c.estado).toUpperCase() === e ? 'sel' : ''}" data-e="${e}">${e}</button>`).join('')}</div>`);
  layer.querySelectorAll('.estado-opt').forEach(b => b.onclick = async () => {
    if (b.classList.contains('sel')) return closeLayer();
    layer.querySelectorAll('.estado-opt').forEach(x => x.disabled = true);
    try {
      const r = await api('priv.solicitudEstado', {}, 'POST', { id, estado: b.dataset.e, ...m5Auth() });
      if (!r.ok) { toast(r.msg || 'No se pudo cambiar', 'err'); layer.querySelectorAll('.estado-opt').forEach(x => x.disabled = false); return; }
      closeLayer(); toast('Estado actualizado', 'ok'); slUpsert(r.card);
    } catch (e) { toast('Error de conexión', 'err'); layer.querySelectorAll('.estado-opt').forEach(x => x.disabled = false); }
  });
}

function slFormHtml(titulo, c) {
  c = c || {};
  return `<div class="grip"></div><h2 class="h2" style="margin-bottom:10px;">${esc(titulo)}</h2>
    <div class="stack">
      ${field('Solicitud', `<textarea class="input ta" id="sl-fsol" rows="4" placeholder="¿Qué le solicitas al líder?"></textarea>`)}
      ${field('Asignado (de la base)', comboboxHtml('sl-fasig', 'Busca por nombre o documento…') + `<p class="muted small cm-hint" id="sl-fasig-info"></p>`)}
      ${c.id ? '' : field('Bitácora (opcional)', `<textarea class="input ta" id="sl-fbita" rows="2" placeholder="Primera nota del hilo (opcional)"></textarea>`)}
      ${c.id ? '' : `<p class="muted small">La fecha y la hora se registran automáticamente.</p>`}
      <button class="btn btn-primary btn-block" id="sl-save">${c.id ? 'Guardar cambios' : 'Crear solicitud'}</button>
    </div>`;
}
function slFillForm(c) {
  $('#sl-fsol').value = c.solicitud || '';
  $('#sl-fasig').value = c.asignado || '';
  if (c.telefono) $('#sl-fasig-info').textContent = 'Tel. ' + String(c.telefono).replace(/^57/, '');
  cmPersonaCombo('sl-fasig', 'sl-fasig-info');
}
function slReadForm() {
  return {
    solicitud: (($('#sl-fsol') || {}).value || '').trim(),
    asignado: val('sl-fasig'),
    asignadoDoc: (($('#sl-fasig') || {}).dataset || {}).doc || '',
    bitacora: (($('#sl-fbita') || {}).value || '').trim()
  };
}
function slValidForm(b) {
  if (!b.solicitud) { toast('Escribe la solicitud', 'err'); return false; }
  if (!b.asignado) { toast('Elige el asignado', 'err'); return false; }
  return true;
}
function slAgregar() {
  openSheet(slFormHtml('Nueva solicitud', {}));
  slFillForm({});
  $('#sl-save').onclick = async () => {
    const b = slReadForm(); if (!slValidForm(b)) return;
    const btn = $('#sl-save'); saving(btn, true);
    try {
      const r = await api('priv.solicitudGuardar', {}, 'POST', { ...b, ...m5Auth() });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo crear', 'err');
      closeLayer(); toast('Solicitud creada', 'ok');
      if (($('#sl-q') || {}).value) $('#sl-q').value = '';
      $$('#sl-chips .bd-chip').forEach((x, i) => x.classList.toggle('active', i === 0));
      slUpsert(r.card);
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}
async function slEditar(id) {
  openSheet(`<div class="grip"></div><h2 class="h2">Editar solicitud</h2>${loadingBox('Cargando…')}`);
  let c;
  try { const r = await api('priv.solicitudVer', { id, ...m5Auth() }); if (!r.ok) { closeLayer(); return toast(r.msg, 'err'); } c = r.solicitud; }
  catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  openSheet(slFormHtml('Editar solicitud', c));
  slFillForm(c);
  $('#sl-save').onclick = async () => {
    const b = slReadForm(); if (!slValidForm(b)) return;
    const btn = $('#sl-save'); saving(btn, true);
    try {
      const r = await api('priv.solicitudEditar', {}, 'POST', { id, ...b, ...m5Auth() });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
      closeLayer(); toast('Solicitud actualizada', 'ok'); slUpsert(r.card);
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}
async function slEliminar(id) {
  const c = slFind(id); if (!c) return toast('Solicitud no encontrada', 'err');
  const ok = await confirmar('¿Eliminar esta solicitud?', crow('Asignado', c.asignado) + crow('Solicitud', (c.solicitud || '').slice(0, 80)) + `<p class="muted small" style="margin-top:8px;">Esta acción no se puede deshacer.</p>`);
  if (!ok) return;
  try {
    const r = await api('priv.solicitudEliminar', {}, 'POST', { id, ...m5Auth() });
    if (!r.ok) return toast(r.msg || 'No se pudo eliminar', 'err');
    SL_ALL = SL_ALL.filter(x => String(x.id) !== String(id));
    slRecontar(); slApplyFilter(); toast('Solicitud eliminada', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
}

/* ============================================================
   ARRANQUE  (gate de instalación como SEP-GROUP)
   ============================================================ */
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
async function initApp() {
  if (typeof APP_VERSION !== 'undefined' && APP_VERSION) { APP_VERSION_LOADED = String(APP_VERSION); paintVersion(APP_VERSION_LOADED); }
  checkVersion(); setInterval(checkVersion, 60000);
  const installed = await detectInstalled();
  const hash = location.hash || '';
  const arranqueLimpio = (hash === '' || hash === '#/' || hash.startsWith('#/login'));
  const yaContinuoWeb = sessionStorage.getItem('continuedWeb') === '1';
  if (!installed && !yaContinuoWeb && arranqueLimpio) { location.hash = '#/instalar'; }
  render();
}
initApp();

/* ============================================================
   MÓDULO 7 · NOTIFICACIONES
   Aquí se escriben las noticias que salen en "Ponte al día" de la
   app pública. Al enviar, el CORE dispara el push (FCM) y deja la
   señal en RTDB para quien tenga la app abierta.
   ============================================================ */
let NT_ALL = [], NT_FILT = [], NT_SHOWN = 0, NT_CONT = {}, NT_ALCANCE = 0, NT_PUSHTIT = '', NT_FBLISTO = true, NT_FBMSG = '';
const NT_BATCH = 40;

function ntEstadoClass(e) { return String(e || '').toUpperCase() === 'BORRADOR' ? 'nt-bor' : 'nt-pub'; }

/* El enlace puede ser cualquier URL, no solo una red social (formularios, mapas,
   documentos…). Esta detección debe ir igual que la de la app pública, que es
   donde se pinta el botón que ve la gente. */
const NT_REDES = {
  facebook: 'Facebook', instagram: 'Instagram', x: 'X',
  youtube: 'YouTube', tiktok: 'TikTok', whatsapp: 'WhatsApp',
  forms: 'Formulario', maps: 'Ubicación', doc: 'Documento', web: 'Enlace'
};
const NT_BOTON = {
  facebook: 'Ver en Facebook', instagram: 'Ver en Instagram', x: 'Ver en X',
  youtube: 'Ver el video', tiktok: 'Ver en TikTok', whatsapp: 'Abrir en WhatsApp',
  forms: 'Responder el formulario', maps: 'Ver la ubicación', doc: 'Abrir el documento',
  web: 'Abrir enlace'
};
function ntRedDe(url) {
  const u = String(url || '').trim().toLowerCase();
  if (!u) return '';
  if (/facebook\.com|fb\.watch|fb\.me/.test(u)) return 'facebook';
  if (/instagram\.com|instagr\.am/.test(u)) return 'instagram';
  if (/(^|\/\/)(www\.)?(x\.com|twitter\.com)/.test(u)) return 'x';
  if (/youtube\.com|youtu\.be/.test(u)) return 'youtube';
  if (/tiktok\.com/.test(u)) return 'tiktok';
  if (/wa\.me|whatsapp\.com/.test(u)) return 'whatsapp';
  if (/forms\.gle|docs\.google\.com\/forms|forms\.office\.com|typeform\.com/.test(u)) return 'forms';
  if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|waze\.com/.test(u)) return 'maps';
  if (/docs\.google\.com|drive\.google\.com|\.pdf($|\?)|sheets\.google\.com/.test(u)) return 'doc';
  return 'web';
}
function ntDominio(url) {
  try { return new URL(String(url)).hostname.replace(/^www\./, ''); } catch { return ''; }
}
/* El texto EXACTO que verá la gente en la app pública */
function ntBotonTxt(enlace) {
  const t = ntRedDe(enlace);
  if (t !== 'web') return NT_BOTON[t] || NT_BOTON.web;
  const d = ntDominio(enlace);
  return d ? `Ver en ${d}` : NT_BOTON.web;
}

/* Recorte del cuerpo para la tarjeta, respetando los saltos */
function ntResumen(txt, lineas) {
  const L = String(txt || '').split('\n');
  const corte = L.slice(0, lineas || 3).join('\n');
  return corte + (L.length > (lineas || 3) ? '…' : '');
}

function ntCardHtml(n) {
  const tipo = ntRedDe(n.enlace);
  const red = tipo ? (NT_REDES[tipo] || 'Enlace') : '';
  const envio = n.estado === 'BORRADOR'
    ? `<span class="nt-envio nt-envio-no">Sin enviar</span>`
    : (n.enviados
      ? `<span class="nt-envio">📤 ${n.enviados.toLocaleString('es-CO')} enviado(s)${n.fallidos ? ' · ' + n.fallidos.toLocaleString('es-CO') + ' fallido(s)' : ''}</span>`
      : `<span class="nt-envio nt-envio-no">Publicada · sin push</span>`);
  return `<article class="bd-card nt-card ${ntEstadoClass(n.estado)}" data-id="${esc(n.id)}">
    <div class="bd-top">
      <div class="bd-id">
        <b class="bd-nombre">${esc(n.titulo || 'Sin título')}</b>
        <span class="bd-doc">${esc(fmtCreada(n.fecha) || n.fecha || '—')}</span>
      </div>
      <span class="nt-badge ${ntEstadoClass(n.estado)}">${esc(n.estado)}</span>
    </div>
    <div class="nt-prev">${esc(ntResumen(n.cuerpo, 3))}</div>
    <div class="nt-foot">
      ${red ? `<span class="nt-red nt-red-${esc(tipo)}">${esc(red)}</span>` : ''}
      ${envio}
    </div>
    <div class="bd-acts nt-acts">
      <button class="bd-btn" data-a="detalles">Detalles</button>
      <button class="bd-btn" data-a="editar">Editar</button>
      <button class="bd-btn nt-btn-send" data-a="enviar">${n.estado === 'BORRADOR' ? 'Publicar y enviar' : 'Reenviar push'}</button>
      <button class="bd-btn bd-btn-danger" data-a="eliminar">Eliminar</button>
    </div>
  </article>`;
}

function ntResumenHtml() {
  const pu = NT_CONT.PUBLICADA || 0, bo = NT_CONT.BORRADOR || 0;
  return `<div class="nt-resumen">
    <div class="nt-kpis">
      <button class="nt-kpi nt-pub" data-f="Publicada"><b>${pu.toLocaleString('es-CO')}</b><span>Publicadas</span></button>
      <button class="nt-kpi nt-bor" data-f="Borrador"><b>${bo.toLocaleString('es-CO')}</b><span>Borradores</span></button>
      <div class="nt-kpi nt-alc"><b>${NT_ALCANCE.toLocaleString('es-CO')}</b><span>Dispositivos con avisos</span></div>
    </div>
    ${NT_FBLISTO ? '' : `<div class="nt-warn">${I.bell}<div><b>El push está apagado.</b> ${esc(NT_FBMSG || 'Falta la cuenta de servicio de Firebase.')}<br><span class="nt-warn-tip">Corre <code>probarFirebase()</code> en el editor de Apps Script: te dice paso por paso qué falta. Mientras tanto las noticias sí se guardan y sí se ven en la app pública.</span></div></div>`}
  </div>`;
}

async function viewNotificaciones(user) {
  M5_ME = user.documento; appWide(true);
  app.innerHTML = `${backbar('Notificaciones')}
    <div class="pad">
      <p class="nt-note">Lo que publiques aquí sale en <b>“Ponte al día”</b> de la app pública. Al enviar, avisamos a todos los que activaron las notificaciones.</p>
      <div id="nt-resumen"></div>
      <div class="bd-toolbar">
        <div class="bd-search"><input class="input" id="nt-q" placeholder="Buscar por título o contenido…" autocomplete="off" /></div>
        <button class="btn btn-primary bd-add" id="nt-add">+ Agregar</button>
      </div>
      <div class="bd-chips" id="nt-chips">
        ${['Todas', 'Publicada', 'Borrador'].map((t, i) => `<button class="bd-chip ${i === 0 ? 'active' : ''}" data-f="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
      <div class="bd-count" id="nt-count"></div>
      <div id="nt-body">${loadingBox('Cargando noticias…')}</div>
      <div class="center" id="nt-more" style="margin-top:12px;"></div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('home');
  $('#nt-add').onclick = () => ntAgregar();
  try {
    const r = await api('priv.notificaciones', m5Auth());
    if (!r.ok) { $('#nt-body').innerHTML = `<p class="muted center">No se pudo cargar.</p>`; return; }
    NT_ALL = (r.items || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));   // más reciente primero (el CORE ya ordena; esto lo blinda)
    NT_CONT = r.contadores || {};
    NT_ALCANCE = r.alcance || 0; NT_PUSHTIT = r.pushTitulo || '';
    NT_FBLISTO = r.firebaseListo !== false; NT_FBMSG = r.firebaseMsg || '';
    ntPintarResumen(); ntApplyFilter();
  } catch (e) { $('#nt-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; return; }
  const q = $('#nt-q'); let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(ntApplyFilter, 160); };
  $$('#nt-chips .bd-chip').forEach(ch => ch.onclick = () => ntSetFilter(ch.dataset.f));

  vivoBind('notificaciones', M5_ME, vivoNotificaciones);   // EN VIVO
}

/* ---- EN VIVO · Notificaciones ---- */
async function vivoNotificaciones() {
  const r = await api('priv.notificaciones', m5Auth(), 'GET', null, SILENCIO);
  if (!r.ok || !vivoCambio(JSON.stringify(r.items))) return;
  NT_ALL = (r.items || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  NT_CONT = r.contadores || {}; NT_ALCANCE = r.alcance || 0;
  ntPintarResumen(); ntApplyFilter(); vivoCerrarHoja();
}

function ntPintarResumen() {
  const el = $('#nt-resumen'); if (!el) return;
  el.innerHTML = ntResumenHtml();
  el.querySelectorAll('.nt-kpi[data-f]').forEach(k => k.onclick = () => ntSetFilter(k.dataset.f));
}
function ntSetFilter(f) {
  const chips = $$('#nt-chips .bd-chip');
  const activo = (($('#nt-chips .bd-chip.active') || {}).dataset || {}).f;
  const destino = (activo === f) ? 'Todas' : f;   // volver a tocar = quitar el filtro
  chips.forEach(x => x.classList.toggle('active', x.dataset.f === destino));
  ntApplyFilter();
}
function ntActiveFilter() { const a = $('#nt-chips .bd-chip.active'); return a ? a.dataset.f : 'Todas'; }

function ntApplyFilter() {
  const q = (($('#nt-q') || {}).value || '').trim().toLowerCase();
  const f = ntActiveFilter().toUpperCase();
  NT_FILT = NT_ALL.filter(n => {
    if (f !== 'TODAS' && String(n.estado).toUpperCase() !== f) return false;
    if (!q) return true;
    return ((n.titulo || '') + ' ' + (n.cuerpo || '') + ' ' + (n.enlace || '')).toLowerCase().includes(q);
  });
  NT_SHOWN = 0;
  const cEl = $('#nt-count'); if (cEl) cEl.textContent = `${NT_FILT.length.toLocaleString('es-CO')} noticia(s) · de la más reciente a la más antigua`;
  const body = $('#nt-body');
  if (body) body.innerHTML = NT_FILT.length ? `<div class="bd-grid" id="nt-grid"></div>` : `<p class="muted center" style="margin-top:20px;">Sin noticias para este filtro.</p>`;
  ntRenderMore();
}
function ntRenderMore() {
  const grid = $('#nt-grid'); if (!grid) { const m = $('#nt-more'); if (m) m.innerHTML = ''; return; }
  const next = NT_FILT.slice(NT_SHOWN, NT_SHOWN + NT_BATCH);
  grid.insertAdjacentHTML('beforeend', next.map(ntCardHtml).join(''));
  NT_SHOWN += next.length;
  $$('#nt-grid .nt-card').forEach(card => {
    if (card._wired) return; card._wired = true;
    card.querySelectorAll('.bd-btn').forEach(b => b.onclick = () => ntAccion(b.dataset.a, card.dataset.id));
  });
  const more = $('#nt-more');
  if (NT_SHOWN < NT_FILT.length) { more.innerHTML = `<button class="btn btn-ghost" id="nt-more-btn">Ver más (${(NT_FILT.length - NT_SHOWN).toLocaleString('es-CO')} restantes)</button>`; $('#nt-more-btn').onclick = ntRenderMore; }
  else more.innerHTML = '';
}
function ntFind(id) { return NT_ALL.find(x => String(x.id) === String(id)); }
function ntRecontar() {
  NT_CONT = { PUBLICADA: 0, BORRADOR: 0 };
  NT_ALL.forEach(n => { NT_CONT[n.estado] = (NT_CONT[n.estado] || 0) + 1; });
  ntPintarResumen();
}
function ntUpsert(card) {
  const i = NT_ALL.findIndex(x => String(x.id) === String(card.id));
  if (i >= 0) NT_ALL[i] = card; else NT_ALL.push(card);
  NT_ALL.sort((a, b) => (b.ts || 0) - (a.ts || 0));   // más reciente primero
  ntRecontar(); ntApplyFilter();
}
function ntAccion(a, id) {
  if (a === 'detalles') return ntDetalles(id);
  if (a === 'editar') return ntEditar(id);
  if (a === 'enviar') return ntEnviar(id);
  if (a === 'eliminar') return ntEliminar(id);
}

/* ---- Vista previa: así se ve la tarjeta en la app pública ---- */
function ntPreviewHtml(titulo, cuerpo, enlace) {
  const red = ntRedDe(enlace);
  return `<div class="nt-sim">
    <div class="nt-sim-h">Así se verá en “Ponte al día”</div>
    <div class="nt-sim-card">
      <b class="nt-sim-tit">${esc(titulo || 'Título de la noticia')}</b>
      <div class="nt-sim-cuerpo">${esc(cuerpo || 'El cuerpo de la noticia…')}</div>
      ${enlace ? `<span class="nt-sim-link nt-red-${esc(red)}">${esc(ntBotonTxt(enlace))}</span>` : ''}
    </div>
    <div class="nt-sim-h">Así se verá el aviso en el celular</div>
    <div class="nt-sim-push">
      <img src="${APP_ICON}" alt="" />
      <div><b>${esc(NT_PUSHTIT || 'Jhonny Perdomo publicó una noticia')}</b><span>${esc(titulo || 'Título de la noticia')}</span></div>
    </div>
  </div>`;
}

/* ---- Detalles (+ copiar) ---- */
function ntTextoCopia(n) {
  const L = [];
  L.push(`📰 ${n.titulo}`);
  L.push('');
  L.push(n.cuerpo || '');
  if (n.enlace) { L.push(''); L.push(n.enlace); }
  if (n.fecha) { L.push(''); L.push(`Publicada: ${fmtCreada(n.fecha) || n.fecha}`); }
  return L.join('\n');
}
async function ntDetalles(id) {
  openSheet(`<div class="grip"></div><h2 class="h2">Noticia</h2>${loadingBox('Cargando…')}`);
  let n;
  try { const r = await api('priv.notifVer', { id, ...m5Auth() }); if (!r.ok) { closeLayer(); return toast(r.msg || 'No se pudo cargar', 'err'); } n = r.noticia; }
  catch (e) { closeLayer(); return toast('Error de conexión', 'err'); }
  const rows = [
    ['Estado', n.estado],
    ['Publicada', n.fecha ? (fmtCreada(n.fecha) || n.fecha) : '—'],
    ['Actualizada', n.actualizada ? (fmtCreada(n.actualizada) || n.actualizada) : '—'],
    ['Enlace', n.enlace || '—'],
    ['Push enviados', n.enviados ? n.enviados.toLocaleString('es-CO') : '—'],
    ['Push fallidos', n.fallidos ? n.fallidos.toLocaleString('es-CO') : '—'],
    ['ID', n.id]
  ].map(([k, v]) => `<div class="det-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  openSheet(`<div class="grip"></div>
    <div class="det-head"><h2 class="h2">${esc(n.titulo)}</h2><span class="nt-badge ${ntEstadoClass(n.estado)}">${esc(n.estado)}</span></div>
    ${ntPreviewHtml(n.titulo, n.cuerpo, n.enlace)}
    <div class="det-list" style="margin-top:12px;">${rows}</div>
    <div class="stack" style="margin-top:12px;">
      <button class="btn btn-ghost btn-block" id="nt-copy">${I.copy} Copiar en portapapeles</button>
      <button class="btn btn-primary btn-block" id="nt-edit">Editar</button>
    </div>`);
  $('#nt-copy').onclick = async () => { try { await navigator.clipboard.writeText(ntTextoCopia(n)); toast('Noticia copiada', 'ok'); } catch { toast('No se pudo copiar', 'err'); } };
  $('#nt-edit').onclick = () => { closeLayer(); ntEditar(id); };
}

/* ---- Modal de registro / edición ---- */
function ntFormHtml(n, esNueva) {
  return `<div class="grip"></div>
    <h2 class="h2" style="margin-bottom:4px;">${esNueva ? 'Nueva noticia' : 'Editar noticia'}</h2>
    <p class="muted" style="margin-bottom:14px;">Los saltos de línea se respetan tal cual los escribas.</p>
    ${field('Título', inputEl('nt-f-tit', `maxlength="120" placeholder="Título de la noticia" value="${esc((n && n.titulo) || '')}"`))}
    <label class="field"><span>Cuerpo</span>
      <textarea class="input area" id="nt-f-cue" rows="7" placeholder="Escribe la noticia…">${esc((n && n.cuerpo) || '')}</textarea>
    </label>
    <div class="nt-cont" id="nt-cont"></div>
    ${field('Enlace de red social (opcional)', inputEl('nt-f-enl', `placeholder="https://facebook.com/… o el enlace que quieras" value="${esc((n && n.enlace) || '')}"`))}
    <div id="nt-prev"></div>
    ${esNueva ? `<label class="check nt-check"><input type="checkbox" id="nt-f-env" checked /><span>Enviar la notificación al guardar <b class="small muted">(a ${NT_ALCANCE.toLocaleString('es-CO')} dispositivo(s))</b></span></label>` : ''}
    <div class="stack" style="margin-top:16px;">
      <button class="btn btn-primary btn-block" id="nt-f-ok">${esNueva ? 'Guardar' : 'Guardar cambios'}</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`;
}
function ntBindForm() {
  const t = $('#nt-f-tit'), c = $('#nt-f-cue'), e = $('#nt-f-enl');
  const pintar = () => {
    const cont = $('#nt-cont');
    if (cont) cont.textContent = `${(c.value || '').length} caracteres · ${(c.value || '').split('\n').length} línea(s)`;
    const pv = $('#nt-prev');
    if (pv) pv.innerHTML = ntPreviewHtml(t.value.trim(), c.value, e.value.trim());
  };
  [t, c, e].forEach(el => { if (el) el.oninput = pintar; });
  pintar();
}
function ntLeerForm() {
  return { titulo: val('nt-f-tit'), cuerpo: ($('#nt-f-cue') || {}).value || '', enlace: val('nt-f-enl') };
}

function ntAgregar() {
  openSheet(ntFormHtml(null, true));
  ntBindForm();
  $('#nt-f-ok').onclick = async (ev) => {
    const btn = ev.currentTarget;
    const b = ntLeerForm();
    if (!b.titulo) return toast('Escribe el título', 'err');
    if (!b.cuerpo.trim()) return toast('Escribe el cuerpo', 'err');
    const enviar = !!($('#nt-f-env') || {}).checked;
    if (enviar) {
      const ok = await confirmar('Publicar y avisar', [
        crow('Título', b.titulo),
        crow('Enlace', b.enlace || 'Sin enlace'),
        crow('Aviso a', `${NT_ALCANCE.toLocaleString('es-CO')} dispositivo(s)`)
      ].join(''));
      if (!ok) { openSheet(ntFormHtml({ titulo: b.titulo, cuerpo: b.cuerpo, enlace: b.enlace }, true)); ntBindForm(); return; }
    }
    saving(btn, true);
    try {
      const r = await api('priv.notifGuardar', {}, 'POST', { ...b, enviar, ...m5Auth() });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
      closeLayer(); ntUpsert(r.card);
      if (r.push && r.push.msg) toast(r.push.msg, 'err');
      else if (enviar) { toast(`Publicada · push a ${(r.push && r.push.enviados) || 0} dispositivo(s)`, 'ok'); celebrarNt(); }
      else toast('Borrador guardado', 'ok');
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}

function ntEditar(id) {
  const n = ntFind(id); if (!n) return toast('No se encontró la noticia', 'err');
  openSheet(ntFormHtml(n, false));
  ntBindForm();
  $('#nt-f-ok').onclick = async (ev) => {
    const btn = ev.currentTarget;
    const b = ntLeerForm();
    if (!b.titulo) return toast('Escribe el título', 'err');
    if (!b.cuerpo.trim()) return toast('Escribe el cuerpo', 'err');
    saving(btn, true);
    try {
      const r = await api('priv.notifEditar', {}, 'POST', { id, ...b, ...m5Auth() });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
      closeLayer(); ntUpsert(r.card); toast('Noticia actualizada', 'ok');
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}

/* ---- Publicar / reenviar el push (doble toque, como en Líderes) ---- */
async function ntEnviar(id) {
  const n = ntFind(id); if (!n) return toast('No se encontró la noticia', 'err');
  const esBorrador = n.estado === 'BORRADOR';
  openSheet(`<div class="grip"></div>
    <h2 class="h2" style="margin-bottom:4px;">${esBorrador ? 'Publicar y avisar' : 'Reenviar el aviso'}</h2>
    <p class="muted" style="margin-bottom:12px;">${esBorrador
      ? 'La noticia quedará visible en la app pública y avisaremos a todos.'
      : 'Esta noticia ya está publicada. Se volverá a avisar a todos los dispositivos.'}</p>
    ${ntPreviewHtml(n.titulo, n.cuerpo, n.enlace)}
    <div class="det-list" style="margin-top:12px;">
      <div class="det-row"><span>Se avisa a</span><b>${NT_ALCANCE.toLocaleString('es-CO')} dispositivo(s)</b></div>
      ${n.enviados ? `<div class="det-row"><span>Último envío</span><b>${n.enviados.toLocaleString('es-CO')} enviado(s)</b></div>` : ''}
    </div>
    <div class="stack" style="margin-top:16px;">
      <button class="btn btn-primary btn-block" id="nt-go">${esBorrador ? 'Publicar y enviar' : 'Reenviar push'}</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);
  let armado = false;
  $('#nt-go').onclick = async (ev) => {
    const btn = ev.currentTarget;
    if (!armado) { armado = true; btn.textContent = 'Toca otra vez para confirmar'; btn.classList.add('nt-armed'); return; }
    saving(btn, true);
    try {
      const r = await api('priv.notifEnviar', {}, 'POST', { id, ...m5Auth() });
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo enviar', 'err');
      closeLayer(); ntUpsert(r.card);
      toast(r.msg || 'Push enviado', (r.push && r.push.enviados) ? 'ok' : 'err');
      if (r.push && r.push.enviados) celebrarNt();
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}

/* ---- Eliminar (borra de verdad) ---- */
async function ntEliminar(id) {
  const n = ntFind(id); if (!n) return toast('No se encontró la noticia', 'err');
  const ok = await confirmar('¿Eliminar la noticia?', [
    crow('Título', n.titulo),
    crow('Estado', n.estado),
    crow('Ojo', 'Se borra de la hoja y desaparece de la app pública')
  ].join(''));
  if (!ok) return;
  try {
    const r = await api('priv.notifEliminar', {}, 'POST', { id, ...m5Auth() });
    if (!r.ok) return toast(r.msg || 'No se pudo eliminar', 'err');
    NT_ALL = NT_ALL.filter(x => String(x.id) !== String(id));
    ntRecontar(); ntApplyFilter(); toast('Noticia eliminada', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
}

/* Pequeño gesto al publicar */
function celebrarNt() {
  const el = h('<div class="nt-celebra">🔔</div>');
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

/* ============================================================
   MÓDULO 8 · ANÁLISIS DE PROCESOS  (Servicios · Ideas · Comercio)
   ------------------------------------------------------------
   Tres pestañas, una vista. Cada pestaña carga su data la primera
   vez que se abre y queda en caché hasta salir de la vista.
   Backend: priv.an* (Analisis_Priv.gs).
   ============================================================ */

const AN_TABS = [
  { id: 'servicios', label: 'Servicios' },
  { id: 'ideas',     label: 'Ideas' },
  { id: 'comercio',  label: 'Comercio' }
];

let AN = null;      // estado de la vista (se reinicia en cada entrada)
let AN_ME = '';     // documento del usuario logueado (guard del CORE)

/* Cada módulo lleva su propio caller: el auth()/BD_ME global es solo de Base de Datos y
   queda vacío si se entra directo aquí desde el Home. Mismo patrón que ldAuth()/m5Auth(). */
function anAuth() { return { caller: AN_ME }; }

/* Colores por estado de SERVICIOS (clases an-e-*) */
const AN_SERV_EST = [
  { k: 'INGRESADA',   c: 'ing', label: 'Ingresada' },
  { k: 'PENDIENTE',   c: 'pen', label: 'Pendiente' },
  { k: 'SEGUIMIENTO', c: 'seg', label: 'Seguimiento' },
  { k: 'ATENDIDA',    c: 'ate', label: 'Atendida' },
  { k: 'RECURRENTE',  c: 'rec', label: 'Recurrente' }
];
const AN_SERV_CLS = {};
AN_SERV_EST.forEach(e => AN_SERV_CLS[e.k] = e.c);

/* Estados de IDEAS · colores del pliego:
   PENDIENTE=rojo · LEIDA=gris · A TENER EN CUENTA=verde · ANOTADA=azul */
const AN_IDEA_EST = [
  { k: 'PENDIENTE',         c: 'pend', label: 'Pendiente' },
  { k: 'LEIDA',             c: 'leida', label: 'Leída' },
  { k: 'A TENER EN CUENTA', c: 'cuenta', label: 'A tener en cuenta' },
  { k: 'ANOTADA',           c: 'anot', label: 'Anotada' }
];
const AN_IDEA_CLS = {};
AN_IDEA_EST.forEach(e => AN_IDEA_CLS[e.k] = e.c);
/* Solo estas dos se pueden seleccionar para un documento (decisión 15/07) */
const AN_SELECCIONABLES = new Set(['A TENER EN CUENTA', 'ANOTADA']);

function anLabelIdea(k) { const h = AN_IDEA_EST.find(e => e.k === k); return h ? h.label : k; }

/* ============================================================
   SHELL DE LA VISTA
   ============================================================ */
async function viewAnalisis(user) {
  AN_ME = user.documento;
  AN = {
    tab: 'servicios', user,
    serv: null, ideas: null, com: null,
    sFiltro: { est: new Set(), medio: new Set(), servicio: '', prof: '', q: '', eje: 'servicio' },
    iFiltro: { est: new Set(), cat: new Set(), q: '' },
    iSel: new Set(),
    cFiltro: { est: 'TODOS', cat: 'TODAS', q: '' }
  };
  app.innerHTML = `${backbar('Análisis de Procesos')}
    <div class="pad stack">
      <div class="an-tabs seg" id="an-tabs">
        ${AN_TABS.map((t, i) => `<button class="seg-b ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${esc(t.label)}</button>`).join('')}
      </div>
      <div id="an-body">${loadingBox('Cargando…')}</div>
    </div>`;
  app.hidden = false;
  appWide(true);
  $('#backbtn').onclick = () => go('home');
  $$('#an-tabs .seg-b').forEach(b => b.onclick = () => {
    if (AN.tab === b.dataset.tab) return;
    $$('#an-tabs .seg-b').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    AN.tab = b.dataset.tab;
    anPintarTab();
  });
  anPintarTab();

  vivoBind('analisis', AN_ME, vivoAnalisis);   // EN VIVO
}

/* ---- EN VIVO · Análisis de Procesos ----
   Solo se recarga la pestaña que se está mirando (las otras tres se guardan
   en caché y se vuelven a pedir al entrar). Lo que llega de la app pública —
   una idea nueva, una solicitud de servicio — aparece aquí sin refrescar. */
async function vivoAnalisis() {
  const tab = AN.tab;
  const accion = { servicios: 'priv.anServicios', ideas: 'priv.anIdeas', comercio: 'priv.anComercios' }[tab];
  const llave  = { servicios: 'serv', ideas: 'ideas', comercio: 'com' }[tab];
  if (!accion) return;
  const r = await api(accion, anAuth(), 'GET', null, SILENCIO);
  if (AN.tab !== tab) return;                       // cambió de pestaña mientras iba en vuelo
  if (!vivoCambio(tab + '|' + JSON.stringify(r))) return;
  AN[llave] = r;
  /* Las otras pestañas quedan marcadas para releerse al volver a entrar. */
  ['serv', 'ideas', 'com'].forEach(k => { if (k !== llave) AN[k] = null; });
  if (tab === 'servicios') anServPintar();
  else if (tab === 'ideas') anIdeasPintar();
  else anComPintar();
  vivoCerrarHoja();
}

async function anPintarTab() {
  const body = $('#an-body');
  if (!body) return;
  const tab = AN.tab;
  body.innerHTML = loadingBox('Cargando…');
  try {
    if (tab === 'servicios' && !AN.serv) AN.serv = await api('priv.anServicios', anAuth());
    if (tab === 'ideas' && !AN.ideas) AN.ideas = await api('priv.anIdeas', anAuth());
    if (tab === 'comercio' && !AN.com) AN.com = await api('priv.anComercios', anAuth());
  } catch (e) {
    if (AN.tab !== tab) return;
    body.innerHTML = `<p class="center muted" style="padding:26px 0;">No se pudo cargar. ${esc(e.message || '')}</p>`;
    return;
  }
  if (AN.tab !== tab) return; // el usuario cambió de pestaña mientras cargaba
  if (tab === 'servicios') return anServPintar();
  if (tab === 'ideas') return anIdeasPintar();
  return anComPintar();
}

/* Barras apiladas horizontales, hechas a mano (no hay librería de gráficos) */
function anBarras(filas, total, onClickAttr) {
  if (!filas.length) return `<p class="center muted" style="padding:18px 0;">Sin datos para estos filtros.</p>`;
  const max = Math.max(...filas.map(f => f.total), 1);
  return `<div class="an-bars">${filas.map(f => `
    <div class="an-bar-row" ${onClickAttr ? `${onClickAttr}="${esc(f.label)}" role="button" tabindex="0"` : ''}>
      <div class="an-bar-lbl" title="${esc(f.label)}">${esc(f.label)}</div>
      <div class="an-bar-track">
        <div class="an-bar-fill" style="width:${(f.total / max * 100).toFixed(1)}%;">
          ${f.partes.filter(p => p.n > 0).map(p => `<span class="an-seg an-e-${p.c}" style="flex:${p.n};" title="${esc(p.label)}: ${p.n}"></span>`).join('')}
        </div>
      </div>
      <div class="an-bar-num"><b>${f.total}</b>${total ? `<span>${(f.total / total * 100).toFixed(0)}%</span>` : ''}</div>
    </div>`).join('')}</div>`;
}

/* ============================================================
   PESTAÑA 1 · SERVICIOS  (solo lectura)
   ============================================================ */
function anServFiltradas() {
  const f = AN.sFiltro;
  const q = f.q.toLowerCase();
  return (AN.serv.items || []).filter(it => {
    if (f.est.size && !f.est.has(it.estado)) return false;
    if (f.medio.size && !f.medio.has(it.medio)) return false;
    if (f.servicio && (it.servicio || '(Sin servicio)') !== f.servicio) return false;
    if (f.prof && (it.responsable || '(Sin responsable)') !== f.prof) return false;
    if (q && !(`${it.nombre} ${it.solicitud} ${it.servicio} ${it.responsable} ${it.residencia} ${it.documento}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

function anServAgrupar(items, campo) {
  const map = new Map();
  items.forEach(it => {
    const k = (campo === 'servicio' ? it.servicio : it.responsable) || (campo === 'servicio' ? '(Sin servicio)' : '(Sin responsable)');
    if (!map.has(k)) map.set(k, { label: k, total: 0, est: {} });
    const g = map.get(k);
    g.total++;
    g.est[it.estado] = (g.est[it.estado] || 0) + 1;
  });
  return Array.from(map.values())
    .map(g => Object.assign(g, { partes: AN_SERV_EST.map(e => ({ c: e.c, label: e.label, n: g.est[e.k] || 0 })) }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'es'));
}

function anServPintar() {
  const f = AN.sFiltro;
  const todas = AN.serv.items || [];
  const items = anServFiltradas();
  const cuenta = (arr, k) => arr.filter(x => x.estado === k).length;
  const atendidas = cuenta(items, 'ATENDIDA');
  const proceso = items.length - atendidas;
  const pct = items.length ? Math.round(atendidas / items.length * 100) : 0;

  const servicios = Array.from(new Set(todas.map(i => i.servicio).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  const profs = Array.from(new Set(todas.map(i => i.responsable || '(Sin responsable)'))).sort((a, b) => a.localeCompare(b, 'es'));
  const medios = Array.from(new Set(todas.map(i => i.medio).filter(Boolean))).sort();

  const filas = anServAgrupar(items, f.eje);

  $('#an-body').innerHTML = `
    <div class="an-kpis">
      <div class="an-kpi an-k-tot"><b>${items.length}</b><span>Solicitudes</span></div>
      <div class="an-kpi an-k-ate"><b>${atendidas}</b><span>Atendidas</span></div>
      <div class="an-kpi an-k-pro"><b>${proceso}</b><span>En proceso</span></div>
      <div class="an-kpi an-k-pct"><b>${pct}%</b><span>Resolución</span></div>
    </div>

    <div class="an-card">
      <div class="an-card-h">
        <b>Distribución</b>
        <div class="seg an-eje">
          <button class="seg-b ${f.eje === 'servicio' ? 'active' : ''}" data-eje="servicio">Por servicio</button>
          <button class="seg-b ${f.eje === 'profesional' ? 'active' : ''}" data-eje="profesional">Por profesional</button>
        </div>
      </div>
      ${anBarras(filas, items.length, 'data-eje-pick')}
      <div class="an-key">${AN_SERV_EST.map(e => `<span><i class="an-e-${e.c}"></i>${esc(e.label)}</span>`).join('')}</div>
      <p class="small muted an-hint">Toca una barra para filtrar por ella.</p>
    </div>

    <div class="an-card">
      <div class="an-card-h"><b>Filtros</b><button class="link-quiet an-limpiar" id="an-s-limpiar" style="width:auto;margin:0;">Limpiar</button></div>
      <div class="an-filtros">
        <div class="chips an-chips">${AN_SERV_EST.map(e => {
          const n = todas.filter(x => x.estado === e.k).length;
          return `<button class="an-chip an-e-b-${e.c} ${f.est.has(e.k) ? 'on' : ''}" data-est="${e.k}">${esc(e.label)} <b>${n}</b></button>`;
        }).join('')}</div>
        <div class="chips an-chips">${medios.map(m => `<button class="an-chip an-chip-medio ${f.medio.has(m) ? 'on' : ''}" data-medio="${esc(m)}">${esc(m)} <b>${todas.filter(x => x.medio === m).length}</b></button>`).join('')}</div>
        <div class="an-selects">
          ${field('Servicio', `<select class="input" id="an-s-serv"><option value="">Todos</option>${servicios.map(s => `<option ${f.servicio === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>`)}
          ${field('Profesional', `<select class="input" id="an-s-prof"><option value="">Todos</option>${profs.map(s => `<option ${f.prof === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>`)}
        </div>
        ${field('Buscar', inputEl('an-s-q', `placeholder="Nombre, solicitud, zona…" value="${esc(f.q)}"`))}
      </div>
    </div>

    ${anServAlertas(todas)}

    <div class="an-card">
      <div class="an-card-h"><b>Solicitudes</b><span class="small muted">${items.length} de ${todas.length}</span></div>
      <div class="an-list" id="an-s-list">${anServLista(items)}</div>
    </div>`;

  /* ---- eventos ---- */
  $$('#an-body [data-eje]').forEach(b => b.onclick = () => { AN.sFiltro.eje = b.dataset.eje; anServPintar(); });
  $$('#an-body [data-eje-pick]').forEach(el => {
    const pick = () => {
      const v = el.getAttribute('data-eje-pick');
      if (AN.sFiltro.eje === 'servicio') AN.sFiltro.servicio = (AN.sFiltro.servicio === v ? '' : v);
      else AN.sFiltro.prof = (AN.sFiltro.prof === v ? '' : v);
      anServPintar();
    };
    el.onclick = pick;
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
  });
  $$('#an-body [data-est]').forEach(b => b.onclick = () => {
    const k = b.dataset.est;
    AN.sFiltro.est.has(k) ? AN.sFiltro.est.delete(k) : AN.sFiltro.est.add(k);
    anServPintar();
  });
  $$('#an-body [data-medio]').forEach(b => b.onclick = () => {
    const k = b.dataset.medio;
    AN.sFiltro.medio.has(k) ? AN.sFiltro.medio.delete(k) : AN.sFiltro.medio.add(k);
    anServPintar();
  });
  $('#an-s-serv').onchange = (e) => { AN.sFiltro.servicio = e.target.value; anServPintar(); };
  $('#an-s-prof').onchange = (e) => { AN.sFiltro.prof = e.target.value; anServPintar(); };
  $('#an-s-limpiar').onclick = () => {
    AN.sFiltro = { est: new Set(), medio: new Set(), servicio: '', prof: '', q: '', eje: AN.sFiltro.eje };
    anServPintar();
  };
  const q = $('#an-s-q');
  q.oninput = () => {
    AN.sFiltro.q = q.value.trim();
    const l = $('#an-s-list');
    if (l) l.innerHTML = anServLista(anServFiltradas());
    anServBindList();
  };
  anServBindList();
}

function anServLista(items) {
  if (!items.length) return `<p class="center muted" style="padding:22px 0;">Ninguna solicitud con estos filtros.</p>`;
  return items.slice(0, 200).map((it, i) => `
    <div class="an-row" data-ver="${i}">
      <div class="an-row-main">
        <div class="an-row-t"><b>${esc(it.nombre || '—')}</b><span class="an-pill an-e-b-${AN_SERV_CLS[it.estado] || 'ing'}">${esc(it.estado || '—')}</span></div>
        <div class="an-row-s">${esc(it.servicio || '—')}${it.responsable ? ' · ' + esc(it.responsable) : ' · <i>sin responsable</i>'}</div>
        <div class="an-row-x small muted">${esc((it.fecha || '').split(' ')[0] || 'sin fecha')}${it.residencia ? ' · ' + esc(it.residencia) : ''}${it.medio ? ' · ' + esc(it.medio) : ''}</div>
      </div>
      <span class="an-row-go">${I.chevR}</span>
    </div>`).join('') + (items.length > 200 ? `<p class="center small muted" style="padding:10px 0;">Se muestran las primeras 200. Afina los filtros para ver el resto.</p>` : '');
}

function anServBindList() {
  const items = anServFiltradas();
  $$('#an-s-list [data-ver]').forEach(el => el.onclick = () => anServVer(items[+el.dataset.ver]));
}

function anServVer(it) {
  if (!it) return;
  openSheet(`<div class="grip"></div>
    <h2 class="h2" style="margin-bottom:2px;">${esc(it.nombre || '—')}</h2>
    <p class="muted small" style="margin-bottom:14px;">${esc(it.documento || '')}${it.residencia ? ' · ' + esc(it.residencia) : ''}</p>
    <div class="confirm-list">
      ${crow('Servicio', it.servicio)}
      ${crow('Estado', it.estado)}
      ${crow('Profesional', it.responsable || 'Sin responsable')}
      ${crow('Medio', it.medio)}
      ${crow('Fecha', it.fecha ? fmtFechaLarga(it.fecha) : 'Sin fecha')}
      ${crow('Contacto', it.contacto)}
    </div>
    ${it.solicitud ? `<p class="eyebrow" style="margin-top:14px;">Solicitud</p><div class="an-texto">${esc(it.solicitud)}</div>` : ''}
    ${it.respuesta ? `<p class="eyebrow" style="margin-top:12px;">Respuesta</p><div class="an-texto">${esc(it.respuesta)}</div>` : ''}
    <button class="btn btn-quiet btn-block" data-close style="margin-top:16px;">Cerrar</button>`);
}

/* Cosas que saltan a la vista y sirven para decidir */
function anServAlertas(todas) {
  const sinResp = todas.filter(x => !x.responsable).length;
  const conCarga = new Set(todas.map(x => x.responsable).filter(Boolean));
  const norm = s => String(s || '').trim().toLowerCase();
  const sinCarga = (AN.serv.profesionales || []).filter(p => !Array.from(conCarga).some(c => norm(c) === norm(p.nombre)));
  const cat = new Set((AN.serv.profesionales || []).map(p => norm(p.servicio)));
  const huerfanos = Array.from(new Set(todas.map(x => x.servicio).filter(Boolean))).filter(s => !cat.has(norm(s)));
  if (!sinResp && !sinCarga.length && !huerfanos.length) return '';
  return `<div class="an-card an-alertas">
    <div class="an-card-h"><b>Puntos de atención</b></div>
    ${sinResp ? `<div class="an-alerta"><span class="an-al-n">${sinResp}</span><div>solicitud(es) <b>sin profesional asignado</b>.<br><span class="small muted">Se asignan desde Configuración.</span></div></div>` : ''}
    ${huerfanos.length ? `<div class="an-alerta"><span class="an-al-n">${huerfanos.length}</span><div>servicio(s) <b>sin profesional en el catálogo</b>: ${esc(huerfanos.join(', '))}.</div></div>` : ''}
    ${sinCarga.length ? `<div class="an-alerta"><span class="an-al-n">${sinCarga.length}</span><div>profesional(es) <b>sin ninguna solicitud</b>: ${esc(sinCarga.map(p => p.nombre).join(', '))}.</div></div>` : ''}
  </div>`;
}

/* ============================================================
   PESTAÑA 2 · IDEAS
   ============================================================ */
function anIdeasFiltradas() {
  const f = AN.iFiltro;
  const q = f.q.toLowerCase();
  return (AN.ideas.ideas || []).filter(it => {
    if (f.est.size && !f.est.has(it.estado)) return false;
    if (f.cat.size && !f.cat.has(it.cat)) return false;
    if (q && !(`${it.nombre} ${it.texto} ${it.residencia} ${it.catLabel}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

function anIdeasPintar() {
  const f = AN.iFiltro;
  const todas = AN.ideas.ideas || [];
  const cortes = AN.ideas.cortes || [];
  const items = anIdeasFiltradas();
  const n = k => todas.filter(x => x.estado === k).length;

  /* La selección solo puede tener ideas que sigan siendo seleccionables */
  const validos = new Set(todas.filter(x => AN_SELECCIONABLES.has(x.estado)).map(x => x.id));
  Array.from(AN.iSel).forEach(id => { if (!validos.has(id)) AN.iSel.delete(id); });

  $('#an-body').innerHTML = `
    <div class="an-kpis an-kpis-4">
      ${AN_IDEA_EST.map(e => `<button class="an-kpi an-i-${e.c} ${f.est.has(e.k) ? 'on' : ''}" data-iest="${e.k}"><b>${n(e.k)}</b><span>${esc(e.label)}</span></button>`).join('')}
    </div>

    <div class="an-card">
      <div class="an-card-h"><b>Filtros</b><button class="link-quiet" id="an-i-limpiar" style="width:auto;margin:0;">Limpiar</button></div>
      <div class="an-filtros">
        <div class="chips an-chips">${(AN.ideas.cats || []).map(c => {
          const t = todas.filter(x => x.cat === c.key).length;
          return `<button class="an-chip an-chip-cat ${f.cat.has(c.key) ? 'on' : ''}" data-icat="${c.key}" ${t ? '' : 'disabled'}>${esc(c.label)} <b>${t}</b></button>`;
        }).join('')}</div>
        ${field('Buscar', inputEl('an-i-q', `placeholder="Idea, persona, zona…" value="${esc(f.q)}"`))}
      </div>
    </div>

    <div class="an-card">
      <div class="an-card-h">
        <b>Documentos generados</b>
        <span class="small muted">${cortes.length} corte(s)</span>
      </div>
      ${cortes.length
        ? `<div class="an-cortes">${cortes.slice(0, 6).map(c => `
            <button class="an-corte" data-corte="${esc(c.id)}">
              <span class="an-corte-id">${esc(c.id)}</span>
              <span class="an-corte-m"><b>${c.total} idea(s)</b><span class="small muted">${esc((c.fecha || '').split(' ')[0])} · ${esc(c.autor || '')}</span></span>
              <span class="an-corte-dl">${I.download}</span>
            </button>`).join('')}
           </div>
           ${cortes.length > 6 ? `<button class="link-quiet" id="an-cortes-todos">Ver los ${cortes.length} cortes</button>` : ''}`
        : `<p class="center muted small" style="padding:16px 0;">Todavía no has generado ningún documento.</p>`}
    </div>

    <div class="an-card">
      <div class="an-card-h"><b>Ideas</b><span class="small muted">${items.length} de ${todas.length}</span></div>
      <div class="an-ideas" id="an-i-list">${anIdeasCards(items)}</div>
    </div>
    <div id="an-selbar"></div>`;

  $$('#an-body [data-iest]').forEach(b => b.onclick = () => {
    const k = b.dataset.iest;
    AN.iFiltro.est.has(k) ? AN.iFiltro.est.delete(k) : AN.iFiltro.est.add(k);
    anIdeasPintar();
  });
  $$('#an-body [data-icat]').forEach(b => b.onclick = () => {
    const k = b.dataset.icat;
    AN.iFiltro.cat.has(k) ? AN.iFiltro.cat.delete(k) : AN.iFiltro.cat.add(k);
    anIdeasPintar();
  });
  $('#an-i-limpiar').onclick = () => { AN.iFiltro = { est: new Set(), cat: new Set(), q: '' }; anIdeasPintar(); };
  const q = $('#an-i-q');
  q.oninput = () => {
    AN.iFiltro.q = q.value.trim();
    const l = $('#an-i-list');
    if (l) l.innerHTML = anIdeasCards(anIdeasFiltradas());
    anIdeasBind();
  };
  $$('#an-body [data-corte]').forEach(b => b.onclick = () => anCorteBajar(b.dataset.corte, b));
  const todos = $('#an-cortes-todos');
  if (todos) todos.onclick = anCortesTodos;
  anIdeasBind();
  anSelBar();
}

function anIdeasCards(items) {
  if (!items.length) return `<p class="center muted" style="padding:22px 0;">Ninguna idea con estos filtros.</p>`;
  return items.map(it => {
    const cls = AN_IDEA_CLS[it.estado] || 'pend';
    const sel = AN.iSel.has(it.id);
    const puede = AN_SELECCIONABLES.has(it.estado);
    const fija = it.estado === 'ANOTADA';
    return `<article class="an-idea an-i-${cls} ${sel ? 'sel' : ''}">
      <header class="an-idea-h">
        <div class="an-idea-who">
          <span class="an-av">${esc(iniciales(it.nombre))}</span>
          <div><b>${esc(it.nombre || 'Anónimo')}</b><span class="small muted">${esc(it.residencia || '')}</span></div>
        </div>
        ${puede ? `<label class="an-check"><input type="checkbox" data-sel="${esc(it.id)}" ${sel ? 'checked' : ''}><span></span></label>` : ''}
      </header>
      <div class="an-idea-cat"><span class="an-cat-tag">${esc(it.catLabel)}</span><span class="an-pill an-i-b-${cls}">${esc(anLabelIdea(it.estado))}</span></div>
      <div class="an-texto an-idea-txt">${esc(it.texto)}</div>
      <footer class="an-idea-f">
        <span class="small muted">${esc((it.fecha || '').split(' ')[0] || '')}</span>
        <div class="an-idea-btns">
          ${fija
            ? `<span class="small muted an-fija">Ya quedó en un documento</span>`
            : `<button class="an-mini an-i-b-leida ${it.estado === 'LEIDA' ? 'on' : ''}" data-est="LEIDA" data-id="${esc(it.id)}">Leída</button>
               <button class="an-mini an-i-b-cuenta ${it.estado === 'A TENER EN CUENTA' ? 'on' : ''}" data-est="A TENER EN CUENTA" data-id="${esc(it.id)}">A tener en cuenta</button>`}
        </div>
      </footer>
    </article>`;
  }).join('');
}

function anIdeasBind() {
  $$('#an-i-list [data-sel]').forEach(cb => cb.onchange = () => {
    cb.checked ? AN.iSel.add(cb.dataset.sel) : AN.iSel.delete(cb.dataset.sel);
    const card = cb.closest('.an-idea');
    if (card) card.classList.toggle('sel', cb.checked);
    anSelBar();
  });
  $$('#an-i-list [data-est][data-id]').forEach(b => b.onclick = () => anIdeaEstado(b.dataset.id, b.dataset.est, b));
}

async function anIdeaEstado(id, estado, btn) {
  const idea = (AN.ideas.ideas || []).find(x => x.id === id);
  if (idea && idea.estado === estado) return; // ya está así
  saving(btn, true);
  try {
    await api('priv.anIdeaEstado', {}, 'POST', Object.assign(anAuth(), { id, estado }));
    if (idea) idea.estado = estado;
    if (estado !== 'A TENER EN CUENTA') AN.iSel.delete(id);
    toast(estado === 'LEIDA' ? 'Marcada como leída' : 'Marcada para tener en cuenta');
    anIdeasPintar();
  } catch (e) {
    saving(btn, false);
    toast(e.message || 'No se pudo cambiar el estado', 'err');
  }
}

/* Barra flotante de selección */
function anSelBar() {
  const box = $('#an-selbar');
  if (!box) return;
  const n = AN.iSel.size;
  if (!n) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="an-selbar">
      <div class="an-selbar-t"><b>${n}</b> idea(s) seleccionada(s)</div>
      <div class="an-selbar-b">
        <button class="btn btn-quiet" id="an-sel-none">Quitar</button>
        <button class="btn btn-primary" id="an-sel-pdf">${I.pdf} Crear documento</button>
      </div>
    </div>`;
  $('#an-sel-none').onclick = () => { AN.iSel.clear(); anIdeasPintar(); };
  $('#an-sel-pdf').onclick = () => anIdeasPdf($('#an-sel-pdf'));
}

async function anIdeasPdf(btn) {
  const ids = Array.from(AN.iSel);
  if (!ids.length) return;
  const todas = AN.ideas.ideas || [];
  const sel = ids.map(id => todas.find(x => x.id === id)).filter(Boolean);
  const nuevas = sel.filter(x => x.estado === 'A TENER EN CUENTA').length;
  const yaAnot = sel.filter(x => x.estado === 'ANOTADA').length;

  const ok = await confirmar('Crear documento', `
    ${crow('Ideas', String(sel.length))}
    ${crow('Pasan a Anotada', String(nuevas))}
    ${yaAnot ? crow('Ya estaban anotadas', String(yaAnot)) : ''}
    ${crow('Aspectos', String(new Set(sel.map(x => x.catLabel)).size))}
    <p class="small muted" style="margin-top:10px;">Se guarda el corte para poder volver a descargarlo tal cual más adelante.</p>`);
  if (!ok) return;

  saving(btn, true);
  try {
    const body = Object.assign(anAuth(), { ids: ids.join(',') });
    const r = await api('priv.anIdeasPdf', {}, 'POST', body);
    if (!r || !r.base64) throw new Error('El documento llegó vacío');
    downloadB64(r.base64, r.mime, r.filename);
    AN.iSel.clear();
    AN.ideas = null;                       // recargar estados + cortes
    toast(`Corte ${(r.corte && r.corte.id) || ''} generado`);
    await anPintarTab();
  } catch (e) {
    saving(btn, false);
    toast(e.message || 'No se pudo crear el documento', 'err');
  }
}

async function anCorteBajar(id, btn) {
  saving(btn, true);
  try {
    const r = await api('priv.anCortePdf', Object.assign(anAuth(), { corte: id }));
    if (!r || !r.base64) throw new Error('El documento llegó vacío');
    downloadB64(r.base64, r.mime, r.filename);
    toast(`Corte ${id} descargado`);
  } catch (e) {
    toast(e.message || 'No se pudo regenerar el documento', 'err');
  }
  saving(btn, false);
}

function anCortesTodos() {
  const cortes = AN.ideas.cortes || [];
  openSheet(`<div class="grip"></div>
    <h2 class="h2" style="margin-bottom:2px;">Documentos generados</h2>
    <p class="muted small" style="margin-bottom:14px;">Cada corte se vuelve a armar con las ideas que llevaba.</p>
    <div class="an-cortes an-cortes-all">${cortes.map(c => `
      <button class="an-corte" data-corte-s="${esc(c.id)}">
        <span class="an-corte-id">${esc(c.id)}</span>
        <span class="an-corte-m"><b>${c.total} idea(s)</b><span class="small muted">${esc((c.fecha || '').split(' ')[0])} · ${esc(c.autor || '')}</span></span>
        <span class="an-corte-dl">${I.download}</span>
      </button>`).join('')}</div>
    <button class="btn btn-quiet btn-block" data-close style="margin-top:16px;">Cerrar</button>`);
  layer.querySelectorAll('[data-corte-s]').forEach(b => b.onclick = () => anCorteBajar(b.dataset.corteS, b));
}

/* ============================================================
   PESTAÑA 3 · COMERCIO
   ============================================================ */
function anComFiltrados() {
  const f = AN.cFiltro;
  const q = f.q.toLowerCase();
  return (AN.com.items || []).filter(it => {
    if (f.est === 'ACTIVOS' && !it.visible) return false;
    if (f.est === 'INACTIVOS' && it.visible) return false;
    if (f.cat !== 'TODAS' && it.categoria !== f.cat) return false;
    if (q && !(`${it.titulo} ${it.descripcion} ${it.categoria} ${it.premium} ${it.estandar} ${it.direccion}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

function anComPintar() {
  const f = AN.cFiltro;
  const todos = AN.com.items || [];
  const items = anComFiltrados();
  const activos = todos.filter(x => x.visible).length;
  const cats = Array.from(new Set(todos.map(x => x.categoria).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));

  $('#an-body').innerHTML = `
    <div class="an-kpis">
      <div class="an-kpi an-k-tot"><b>${todos.length}</b><span>Comercios</span></div>
      <div class="an-kpi an-k-ate"><b>${activos}</b><span>En la app</span></div>
      <div class="an-kpi an-k-off"><b>${todos.length - activos}</b><span>Ocultos</span></div>
      <div class="an-kpi an-k-pct"><b>${cats.length}</b><span>Categorías</span></div>
    </div>

    <div class="an-card">
      <div class="an-filtros">
        <div class="chips an-chips">
          ${['TODOS', 'ACTIVOS', 'INACTIVOS'].map(k => `<button class="an-chip an-chip-com ${f.est === k ? 'on' : ''}" data-cest="${k}">${k === 'TODOS' ? 'Todos' : k === 'ACTIVOS' ? 'En la app' : 'Ocultos'}</button>`).join('')}
        </div>
        <div class="an-selects">
          ${field('Categoría', `<select class="input" id="an-c-cat"><option value="TODAS">Todas</option>${cats.map(c => `<option ${f.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`)}
          ${field('Buscar', inputEl('an-c-q', `placeholder="Comercio, oferta, dirección…" value="${esc(f.q)}"`))}
        </div>
      </div>
    </div>

    <div class="an-grid" id="an-c-list">${anComCards(items)}</div>`;

  $$('#an-body [data-cest]').forEach(b => b.onclick = () => { AN.cFiltro.est = b.dataset.cest; anComPintar(); });
  $('#an-c-cat').onchange = (e) => { AN.cFiltro.cat = e.target.value; anComPintar(); };
  const q = $('#an-c-q');
  q.oninput = () => {
    AN.cFiltro.q = q.value.trim();
    const l = $('#an-c-list');
    if (l) l.innerHTML = anComCards(anComFiltrados());
    anComBind();
  };
  anComBind();
}

/* AJUSTES 16/07: la imagen ya no ocupa la primera visual de la tarjeta
   (se veían pocos comercios por pantalla). Ahora hay un botón "Ver imagen"
   que la abre con el mismo visor con zoom de la pública. */
function anComCards(items) {
  if (!items.length) return `<p class="center muted" style="padding:26px 0;grid-column:1/-1;">Ningún comercio con estos filtros.</p>`;
  return items.map(it => `
    <article class="an-com an-com-slim ${it.visible ? '' : 'off'}">
      <div class="an-com-body">
        <div class="an-com-toprow">
          <div class="an-com-cat">${esc(it.categoria || '—')}</div>
          <span class="an-com-est ${it.visible ? 'on' : ''}">${it.visible ? 'En la app' : 'Oculto'}</span>
        </div>
        <h3 class="an-com-t">${esc(it.titulo)}</h3>
        ${it.imagen ? `<button type="button" class="an-com-verimg" data-img="${esc(it.imagen)}">${I.eyeOn} Ver imagen</button>` : ''}
        ${it.descripcion ? `<div class="an-texto an-com-d">${esc(it.descripcion)}</div>` : ''}
        <div class="an-ofertas">
          ${it.premium ? `<div class="an-of an-of-p"><span>Premium ⭐</span>${esc(it.premium)}</div>` : ''}
          ${it.estandar ? `<div class="an-of an-of-e"><span>Estándar</span>${esc(it.estandar)}</div>` : ''}
          ${!it.premium && !it.estandar ? `<div class="small muted">Sin ofertas registradas.</div>` : ''}
        </div>
        ${it.direccion ? `<div class="an-com-dir small muted">${I.pin} ${esc(it.direccion)}</div>` : ''}
        <div class="an-com-links">
          ${anComLink(it.ubicacion, 'Ubicación')}${anComLink(it.facebook, 'Facebook')}${anComLink(it.instagram, 'Instagram')}
          ${anComLink(it.tiktok, 'TikTok')}${anComLink(it.reel, 'Video')}
          ${it.whatsapp ? `<a class="an-com-link" href="https://wa.me/${esc(it.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        </div>
      </div>
      <div class="an-com-f">
        <button class="btn ${it.visible ? 'btn-quiet' : 'btn-primary'} btn-block" data-com="${esc(it.nit)}" data-to="${it.visible ? 'INACTIVO' : 'ACTIVO'}">
          ${it.visible ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </article>`).join('');
}

function anComLink(url, label) {
  return url ? `<a class="an-com-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : '';
}

function anComBind() {
  $$('#an-c-list [data-img]').forEach(b => b.onclick = () => zoomImagen(b.dataset.img));
  $$('#an-c-list [data-com]').forEach(b => b.onclick = () => anComEstado(b.dataset.com, b.dataset.to, b));
}

async function anComEstado(nit, estado, btn) {
  const it = (AN.com.items || []).find(x => x.nit === nit);
  if (!it) return;
  const apagar = estado === 'INACTIVO';
  const ok = await confirmar(apagar ? 'Desactivar comercio' : 'Activar comercio', `
    ${crow('Comercio', it.titulo)}
    ${crow('Categoría', it.categoria)}
    <p class="small muted" style="margin-top:10px;">${apagar
      ? 'Dejará de verse en la app pública de inmediato. Puedes volver a activarlo cuando quieras.'
      : 'Volverá a verse en la app pública de inmediato.'}</p>`);
  if (!ok) return;
  saving(btn, true);
  try {
    const body = Object.assign(anAuth(), { nit, estado });
    const r = await api('priv.anComercioEstado', {}, 'POST', body);
    it.estado = r.estado; it.visible = !!r.visible;
    toast(apagar ? 'Comercio oculto de la app pública' : 'Comercio visible en la app pública');
    anComPintar();
  } catch (e) {
    saving(btn, false);
    toast(e.message || 'No se pudo cambiar el estado', 'err');
  }
}


/* ============================================================
   CONFIGURACIÓN  (Módulo 9 · entran DEV y ADMIN)
   Las pestañas Usuarios y Avanzado son solo del DEV. El backend
   también lo verifica: aquí solo se esconde el botón.
   ============================================================ */
let CF_ME = '', CF = null;

/* Cada módulo lleva su propio caller (auth()/BD_ME es solo de Base de Datos) */
function cfAuth() { return { caller: CF_ME }; }

/* Normaliza para comparar/buscar: sin acentos y en mayúsculas.
   (norm() no es global en esta app: es una const local de otro módulo.) */
const cfNorm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

const CF_TABS = [
  { k: 'general', label: 'General', dev: false },
  { k: 'casa', label: 'Casa social', dev: false },
  { k: 'emergencia', label: 'Emergencia', dev: false },
  { k: 'servicios', label: 'Servicios', dev: false },
  { k: 'profesionales', label: 'Profesionales', dev: false },
  { k: 'zonas', label: 'Zonas', dev: false },
  { k: 'plantillas', label: 'Plantillas', dev: false },
  /* 17/07/2026: Usuarios y Call Center también los ve el ADMIN (el backend
     los abrió a CF_ROLES). Avanzado sigue siendo SOLO del DESARROLLADOR. */
  { k: 'usuarios', label: 'Usuarios', dev: false },
  { k: 'call', label: 'Call Center', dev: false },
  { k: 'avanzado', label: 'Avanzado', dev: true }
];

/* Claves de CONFIG agrupadas para la pestaña General. Lo que no esté aquí
   (y no sea plantilla ni de Avanzado) cae en "Otros ajustes": así una clave
   nueva en la hoja nunca queda invisible. */
/* AJUSTE 17/07/2026 · LAS APPS EN UN SOLO BLOQUE (6 desde el call center).
   Cada fila es [clave, etiqueta, ayuda, NOMBRE]. El NOMBRE es el que entra en
   {nombreApp} del mensaje de "Compartir App" — son fijos, los cerró el
   usuario. APP_PRIVADA_URL se MUDÓ aquí desde "Avisos del bot": es la misma
   clave (el correo de aviso del bot la sigue leyendo igual), solo cambia
   dónde se edita. */
const CF_APPS = [
  ['APP_PUBLICA_URL', 'App pública', 'La de los líderes y la gente. Destino del push de "Ponte al día".', 'PÚBLICA'],
  ['APP_PRIVADA_URL', 'App privada', 'Esta misma. También es el destino del botón del correo de aviso del bot.', 'PRIVADA'],
  ['COMERCIO_URL', 'App de comerciantes', '', 'COMERCIANTES'],
  ['APP_ASISTENCIA_URL', 'App de asistencias', 'El escáner de kiosco de los eventos.', 'ASISTENCIA'],
  ['APP_VOTACION_URL', 'App de votación', 'El escáner de kiosco del día de elecciones.', 'VOTACIÓN'],
  /* 6ª app (17/07/2026): el call center. */
  ['APP_CENTER_URL', 'App del call center', 'La de los usuarios CALL. Su acceso se configura en la pestaña Call Center.', 'CALL CENTER']
];

/* AJUSTE 23/07/2026 · "Otros enlaces" e "Imágenes y marca" salieron de la
   pestaña General y viven ahora DENTRO de Avanzado → Infraestructura (solo
   DESARROLLADOR). Las claves son las mismas y se guardan igual: solo cambia
   dónde se editan. "Otros ajustes" (las claves de CONFIG sin sitio propio) se
   mudó al mismo lugar, se arma en cfPintaAvanzado. */
const CF_DEV_GRUPOS = [
  { titulo: 'Otros enlaces', sub: 'A dónde llevan otros botones de la app pública.', keys: [
    ['REGISTRADURIA_URL', 'Consultar puesto de votación', '']
  ] },
  { titulo: 'Imágenes y marca', sub: 'Pega la URL de la imagen.', keys: [
    ['APP_BANNER', 'Banner de la marca', 'Login y correos.'],
    ['APP_ICON', 'Ícono de la app', ''],
    ['FOTO_DEFAULT', 'Foto de perfil por defecto', 'Cuando la persona no ha subido la suya.']
  ] }
];

const CF_GENERAL = [
  { titulo: 'Correos', sub: '', keys: [
    ['CORREO_REMITENTE', 'Nombre del remitente', 'Lo que ve quien recibe el correo.'],
    ['CORREO_BANNER', 'Banner de los correos', '']
  ] },
  /* Módulo 10: a quién se le avisa si el bot de WhatsApp se cae. El aviso va
     por CORREO a propósito — si el bot está caído, avisar POR el bot no
     serviría de nada. Los textos se editan en la pestaña Plantillas. */
  { titulo: '🔔 Avisos del bot', sub: 'Quién recibe el correo si el bot de WhatsApp se desconecta. Se revisa cada hora y solo avisa tras dos chequeos caídos seguidos.', keys: [
    ['ALERTA_BOT_EMAIL_1', 'Correo 1', 'El principal.'],
    ['ALERTA_BOT_EMAIL_2', 'Correo 2', 'Opcional.'],
    ['ALERTA_BOT_EMAIL_3', 'Correo 3', 'Opcional.']
    /* 17/07: APP_PRIVADA_URL se mudó al bloque "Enlaces de las apps" (CF_APPS).
       La clave y su uso en el correo de aviso NO cambian. */
  ] }
];
const CF_CASA_KEYS = ['CASA_TITULO', 'CASA_INTRO', 'CASA_CIERRE', 'CASA_HASHTAGS', 'CASA_DIRECCION',
  'CASA_LAT', 'CASA_LNG', 'CASA_REDES_TITULO', 'CASA_REDES_SUB'];
const CF_EM_KEYS = ['EMERGENCIA_TITULO', 'EMERGENCIA_SUB'];
const CF_AV_KEYS = ['BB_API_URL', 'BB_API_KEY', 'BB_ENDPOINT_BASE', 'BB_BOT_ID',
  'BB_PROJECT_ID', 'BB_MANAGER_API',
  'DRIVE_QR_FOLDER', 'DRIVE_CASA_FOLDER', 'DRIVE_INICIO_FOLDER',
  'CAL_EVENTOS', 'CAL_AGENDA',
  'ELECCION_FECHA', 'ELECCION_HORA_INICIO', 'ELECCION_HORA_FIN',
  /* 23/07/2026: faltaba. Tiene tarjeta propia en Avanzado, así que no debe
     salir además como clave suelta en "Otros ajustes" (antes se duplicaba en
     General; ahora las dos estarían en la misma pestaña). */
  'CLAVE_ELIMINACION'];
/* La plantilla de "Compartir App" se edita en el bloque de Enlaces (es de ahí
   de donde se usa), NO en la pestaña Plantillas: por eso no está en
   CF_PLANTILLAS del backend y se declara aparte para que no caiga en "Otros
   ajustes". */
const CF_COMPARTIR_KEY = 'PLANTILLA_COMPARTIR';
/* AJUSTE 20/07: claves del candidato (sección Agenda del acordeón General). */
const CF_AGENDA_KEYS = ['AGENDA_CANDIDATO_NOMBRE', 'AGENDA_CANDIDATO_WA', 'AGENDA_MANEJO'];
/* Claves del inicio: tienen tarjeta propia en General (imagen + video). */
const CF_INICIO_KEYS = ['INICIO_IMAGEN_DRIVE', 'INICIO_REEL_URL'];
/* Claves que la app maneja sola: nunca se escriben a mano, no se muestran.
   INICIO_IMAGEN_ID lo pone la subida de la imagen y sirve para purgar la
   anterior de Drive. Si se mostrara, alguien la borraría sin querer y la
   imagen vieja quedaría de basura en Drive para siempre. */
/* Claves que la app maneja sola: no se muestran como campo editable.
   Las tres del bot las escribe el monitoreo (Módulo 10); editarlas a mano solo
   confundiría al contador de fallos. */
/* REFIERE_URL: 'Refiere por WhatsApp' se retiró el 20/07; se oculta para que
   no reaparezca en "Otros ajustes". La fila puede seguir en la hoja CONFIG. */
const CF_OCULTAS = ['INICIO_IMAGEN_ID', 'ALERTA_BOT_FALLOS', 'ALERTA_BOT_ULTIMA_ALERTA', 'BOT_SILENCIADO', 'REFIERE_URL'];

async function viewConfig(user) {
  CF_ME = user.documento;
  CF = { tab: 'general', user, d: null };
  appWide(true);
  app.innerHTML = `${backbar('Configuración')}<div class="pad stack" id="cf-root">${loadingBox('Cargando la configuración…')}</div>`;
  app.hidden = false; hideSplash();
  /* 17/07/2026 · El "atrás" de Configuración solo sale al inicio desde General.
     Estando en cualquier otro apartado (Casa social, Usuarios, Call Center…)
     devuelve a Configuración — que es esta misma vista en su pestaña de
     entrada, General. Antes se salía al inicio desde donde fuera y había que
     volver a entrar y a buscar la pestaña. */
  $('#backbtn').onclick = () => {
    if (CF.tab !== 'general') { CF.tab = 'general'; cfRender(); window.scrollTo(0, 0); return; }
    go('home');
  };
  await cfCargar();

  vivoBind('config', CF_ME, vivoConfig);   // EN VIVO
}

/* ---- EN VIVO · Configuración ----
   Se queda en la misma pestaña (CF.tab no se toca). Si el DEV está con una
   hoja abierta (usuario, servicio, zona…) y entra un cambio, se cierra: es la
   regla que pidió el usuario. */
async function vivoConfig() {
  const d = await api('priv.cfgTodo', {}, 'POST', cfAuth(), SILENCIO);
  if (!vivoCambio(JSON.stringify(d))) return;
  CF.d = d;
  cfRender(); vivoCerrarHoja();
}

async function cfCargar() {
  try {
    CF.d = await api('priv.cfgTodo', {}, 'POST', cfAuth());
    cfRender();
  } catch (e) {
    $('#cf-root').innerHTML = `<div class="card pad center"><p class="muted">${esc(String(e.message || e))}</p></div>`;
  }
}

function cfRender() {
  const tabs = CF_TABS.filter(t => !t.dev || CF.d.esDev);
  if (!tabs.some(t => t.k === CF.tab)) CF.tab = 'general';
  $('#cf-root').innerHTML = `
    <div class="cfg-tabs">${tabs.map(t => `<button class="cfg-tab${t.k === CF.tab ? ' active' : ''}" data-t="${t.k}">${esc(t.label)}</button>`).join('')}</div>
    <div id="cf-body"></div>`;
  $$('#cf-root .cfg-tab').forEach(b => b.onclick = () => { CF.tab = b.dataset.t; cfRender(); });
  ({
    general: cfPintaGeneral, casa: cfPintaCasa, emergencia: cfPintaEmergencia,
    servicios: cfPintaServicios, profesionales: cfPintaProfesionales, zonas: cfPintaZonas,
    plantillas: cfPintaPlantillas, usuarios: cfPintaUsuarios, call: cfPintaCall, avanzado: cfPintaAvanzado
  })[CF.tab]();
  cfAccBind();   // AJUSTE 20/07: acordeón en TODAS las vistas (una abierta a la vez)
}

/* ---------- Piezas ---------- */
/* AJUSTE 20/07: cada sección de Configuración es un acordeón (colapsable).
   Inicia CERRADA; el binding global (cfAccBind) deja solo UNA abierta a la vez
   dentro de su contenedor. Mismo markup que cfAcc para compartir estilo. */
function cfCard(titulo, sub, inner) {
  return `<section class="cfg-acc-sec">
    <button type="button" class="cfg-acc-h" aria-expanded="false">
      <span class="cfg-acc-t">${esc(titulo)}</span><span class="cfg-acc-ch">${I.chevR}</span>
    </button>
    <div class="cfg-acc-b">${sub ? `<p class="cfg-card__sub">${esc(sub)}</p>` : ''}${inner}</div>
  </section>`;
}
function cfField(id, label, val, hint, full) {
  return `<div class="cfg-field${full ? ' full' : ''}"><label>${esc(label)}</label>
    <input class="input" id="${id}" value="${esc(val == null ? '' : val)}" autocomplete="off" />
    ${hint ? `<div class="cfg-hint">${esc(hint)}</div>` : ''}</div>`;
}
function cfArea(id, label, val, hint, rows) {
  return `<div class="cfg-field full"><label>${esc(label)}</label>
    <textarea class="input area" id="${id}" rows="${rows || 3}">${esc(val == null ? '' : val)}</textarea>
    ${hint ? `<div class="cfg-hint">${esc(hint)}</div>` : ''}</div>`;
}
function cfSwitch(id, label, on) {
  return `<button class="cfg-sw${on ? ' on' : ''}" id="${id}" role="switch" aria-checked="${on ? 'true' : 'false'}"><span class="cfg-sw-k"></span><span>${esc(label)}</span></button>`;
}
function cfVacio(txt) { return `<p class="cfg-empty">${esc(txt)}</p>`; }

/* Guarda un lote de claves de CONFIG leyendo los inputs por id */
async function cfGuardarClaves(btn, keys) {
  const cambios = {};
  keys.forEach(k => { const el = $('#cf-k-' + k); if (el) cambios[k] = el.value; });
  saving(btn, true);
  try {
    const r = await api('priv.cfgGuardar', {}, 'POST', Object.assign(cfAuth(), { cambios }));
    saving(btn, false);
    if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
    Object.assign(CF.d.cfg, cambios);
    toast('Guardado', 'ok');
  } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
}

/* ============================================================
   GENERAL
   ============================================================ */
function cfPintaGeneral() {
  const cfg = CF.d.cfg;

  /* Grupos de CF_GENERAL como secciones (mismo contenido, sin tarjeta). */
  const gruposSec = CF_GENERAL.map(g => ({
    titulo: g.titulo, sub: g.sub,
    inner: `<div class="cfg-grid">${g.keys.map(k => cfField('cf-k-' + k[0], k[1], cfg[k[0]], k[2], true)).join('')}</div>`
  }));

  /* AJUSTE 23/07: "Otros ajustes" ya no se pinta aquí — se mudó a
     Avanzado → Infraestructura (solo DESARROLLADOR). */
  const extraSec = [];

  /* Orden pedido (20/07): Enlaces · Inicio · Agenda · (resto) · Compartir App. */
  const secciones = [
    { titulo: 'Enlaces de las apps', sub: 'Las 6 apps del proyecto. El botón Enviar abre WhatsApp con el mensaje para compartir esa app.', inner: cfAppsInner() },
    { titulo: 'Inicio de la app pública', sub: 'La imagen y el video que ve la gente al abrir la app.', inner: cfInicioInner() },
    { titulo: 'Agenda', sub: 'Datos del candidato para las notificaciones de la Agenda.', inner: cfAgendaInner() }
  ].concat(gruposSec, extraSec, [
    { titulo: 'Plantilla rápida · Compartir App', sub: '', inner: cfCompartirInner() }
  ]);

  const keys = CF_APPS.map(a => a[0])
    .concat([CF_COMPARTIR_KEY], CF_AGENDA_KEYS)
    .concat(CF_GENERAL.reduce((a, g) => a.concat(g.keys.map(k => k[0])), []))
    .concat(['INICIO_REEL_URL']);

  $('#cf-body').innerHTML = cfAcc(secciones) +
    `<div class="cfg-actions"><button class="btn btn-primary" id="cf-gen-save">Guardar cambios</button></div>`;
  $('#cf-gen-save').onclick = e => cfGuardarClaves(e.currentTarget, keys);
  cfAccBind();
  cfAppsBind();
  cfInicioBind();
  const wa = $('#cf-k-AGENDA_CANDIDATO_WA'); if (wa) onlyDigits(wa);
}

/* ---------- Enlaces de las apps + plantilla "Compartir App" (17/07 · Enviar 18/07) ----------
   Un botón Enviar por app: abre WhatsApp DIRECTO (no el bot) con el MENSAJE ya
   armado, sin número fijo, para que elijas a quién mandarlo. Lee lo que hay EN
   EL CAMPO, no lo guardado: si corriges un enlace y envías sin guardar, va lo
   que ves. Móvil: whatsapp://send?text= · Escritorio: api.whatsapp.com/send?text=. */
function cfAppsInner() {
  const cfg = CF.d.cfg;
  const filas = CF_APPS.map(a => `<div class="cfg-field full">
      <label>${esc(a[1])} <span class="cfg-appname">${esc(a[3])}</span></label>
      <div class="cfg-copyrow">
        <input class="input" id="cf-k-${a[0]}" value="${esc(cfg[a[0]] == null ? '' : cfg[a[0]])}" autocomplete="off" inputmode="url" />
        <button type="button" class="btn btn-quiet cfg-copy" id="cf-cp-${a[0]}" data-k="${a[0]}" data-n="${esc(a[3])}" title="Enviar por WhatsApp el mensaje para compartir esta app">Enviar</button>
      </div>
      ${a[2] ? `<div class="cfg-hint">${esc(a[2])}</div>` : ''}
    </div>`).join('');
  return `<div class="cfg-grid">${filas}</div>`;
}

/* Plantilla rápida · Compartir App (sección propia del acordeón). El campo
   sigue con el mismo id, así que los botones Enviar de Enlaces lo leen aunque
   su sección esté colapsada. */
function cfCompartirInner() {
  const cfg = CF.d.cfg;
  return `<div class="cfg-grid">
     ${cfArea('cf-k-' + CF_COMPARTIR_KEY, 'Mensaje para compartir', cfg[CF_COMPARTIR_KEY],
        'Variables: {nombreApp} y {enlaceApp}. Es lo que se envía con cada botón Enviar de Enlaces.', 4)}
   </div>`;
}

/* AJUSTE 20/07: datos del candidato para las notificaciones de Agenda. */
function cfAgendaInner() {
  const cfg = CF.d.cfg;
  return `<div class="cfg-grid">
     ${cfField('cf-k-AGENDA_CANDIDATO_NOMBRE', 'Nombre Candidato(a)', cfg.AGENDA_CANDIDATO_NOMBRE, 'De aquí sale el primer nombre que va en los mensajes.', true)}
     <div class="cfg-field full">
       <label>WhatsApp Candidato(a)</label>
       <input class="input" id="cf-k-AGENDA_CANDIDATO_WA" value="${esc(cfg.AGENDA_CANDIDATO_WA == null ? '' : cfg.AGENDA_CANDIDATO_WA)}" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="10 dígitos, sin el 57" />
       <div class="cfg-hint">10 dígitos, sin el 57. Destino del resumen del día y de los avisos.</div>
     </div>
     ${cfField('cf-k-AGENDA_MANEJO', 'Manejo de agenda', cfg.AGENDA_MANEJO, 'Nombre de quien maneja la agenda: es la firma de los mensajes.', true)}
   </div>`;
}

/* Acordeón: solo una sección abierta a la vez (la primera abierta por defecto). */
function cfAcc(secciones) {
  return `<div class="cfg-acc" id="cf-acc">${secciones.map(s => `
    <section class="cfg-acc-sec">
      <button type="button" class="cfg-acc-h" aria-expanded="false">
        <span class="cfg-acc-t">${esc(s.titulo)}</span><span class="cfg-acc-ch">${I.chevR}</span>
      </button>
      <div class="cfg-acc-b">${s.sub ? `<p class="cfg-card__sub">${esc(s.sub)}</p>` : ''}${s.inner}</div>
    </section>`).join('')}</div>`;
}
/* AJUSTE 20/07: genérico para TODA la Configuración. Enlaza cada cabecera del
   cuerpo (#cf-body), sea de cfAcc (General) o de cfCard (demás vistas). Al abrir
   una, cierra sus HERMANAS (mismo contenedor) → solo una abierta a la vez.
   Todas inician cerradas (incluida "Enlaces de las apps"). */
function cfAccBind() {
  $$('#cf-body .cfg-acc-h').forEach(h => h.onclick = () => {
    const sec = h.closest('.cfg-acc-sec');
    const abierta = sec.classList.contains('open');
    Array.from(sec.parentElement.children).forEach(s => {
      if (!s.classList || !s.classList.contains('cfg-acc-sec')) return;
      s.classList.remove('open');
      const b = s.querySelector('.cfg-acc-h'); if (b) b.setAttribute('aria-expanded', 'false');
    });
    if (!abierta) { sec.classList.add('open'); h.setAttribute('aria-expanded', 'true'); }
  });
}

/* Reemplaza {nombreApp} y {enlaceApp} en la plantilla (todas las veces que salgan) */
function cfCompartirTexto(nombre, enlace) {
  const tpl = String((($('#cf-k-' + CF_COMPARTIR_KEY) || {}).value) || '');
  return tpl.split('{nombreApp}').join(nombre).split('{enlaceApp}').join(enlace);
}

function cfAppsBind() {
  CF_APPS.forEach(a => {
    const b = $('#cf-cp-' + a[0]);
    if (!b) return;
    b.onclick = () => {
      const enlace = String((($('#cf-k-' + a[0]) || {}).value) || '').trim();
      if (!enlace) return toast('Esa app todavía no tiene enlace', 'err');
      const tpl = String((($('#cf-k-' + CF_COMPARTIR_KEY) || {}).value) || '').trim();
      if (!tpl) return toast('Escribe primero la plantilla "Compartir App"', 'err');
      /* WhatsApp DIRECTO sin número fijo: el usuario elige a quién enviarlo.
         Mismo reparto móvil/escritorio que ldWaOpen; NO pasa por el bot. */
      const msg = cfCompartirTexto(a[3], enlace);
      const url = esMovilPriv()
        ? ('whatsapp://send?text=' + encodeURIComponent(msg))
        : ('https://api.whatsapp.com/send?text=' + encodeURIComponent(msg));
      window.open(url, '_blank');
    };
  });
}

/* ============================================================
   INICIO de la app pública: imagen (archivo) + video (enlace)
   ------------------------------------------------------------
   La imagen se SUBE: al reemplazarla, la anterior se borra de Drive de
   forma definitiva. El video NO se sube: se pega el enlace de Google
   Drive o de YouTube, y la app pública sabe reproducir los dos.
   ============================================================ */
function cfInicioInner() {
  const cfg = CF.d.cfg;
  const img = cfg.INICIO_IMAGEN_DRIVE || '';
  return `<div class="cfg-grid">
       <div class="cfg-field full">
         <label>Imagen de inicio</label>
         <div class="cfg-img cfg-img-hero">
           ${img
             ? `<img src="${esc(img)}" alt="" class="cfg-img-prev" id="cf-ini-prev" onerror="this.style.display='none'" />`
             : '<div class="cfg-img-no" id="cf-ini-prev">Sin imagen</div>'}
           <div class="cfg-img-a">
             <button class="btn btn-quiet cfg-mini" id="cf-ini-img">${img ? 'Cambiar' : 'Subir'} imagen</button>
             ${img ? '<button class="btn btn-quiet cfg-mini cfg-danger" id="cf-ini-del">Quitar</button>' : ''}
           </div>
         </div>
         <div class="cfg-hint">JPG, PNG o WEBP, hasta 6 MB. Al cambiarla, la anterior se borra de Drive para siempre.</div>
       </div>
       ${cfField('cf-k-INICIO_REEL_URL', 'Video de inicio (enlace)', cfg.INICIO_REEL_URL,
         'Pega el enlace de Google Drive o de YouTube. Déjalo vacío para no mostrar video.', true)}
     </div>`;
}
function cfInicioCard() {
  return cfCard('Inicio de la app pública', 'La imagen y el video que ve la gente al abrir la app.', cfInicioInner());
}

function cfInicioBind() {
  const btn = $('#cf-ini-img');
  if (btn) btn.onclick = () => cfSubirInicio();
  const del = $('#cf-ini-del');
  if (del) del.onclick = () => cfQuitarInicio(del);
}

function cfSubirInicio() {
  const inp = h('<input type="file" accept="image/jpeg,image/png,image/webp" hidden />');
  document.body.appendChild(inp);
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    inp.remove();
    if (!f) return;
    const rd = new FileReader();
    rd.onload = async () => {
      toast('Subiendo la imagen…');
      try {
        const r = await api('priv.cfgInicioImagen', {}, 'POST', Object.assign(cfAuth(), { dataUrl: rd.result }));
        if (!r.ok) return toast(r.msg || 'No se pudo subir', 'err');
        CF.d.cfg.INICIO_IMAGEN_DRIVE = r.imagen;
        toast(r.purgada ? 'Imagen cambiada. La anterior se borró de Drive.' : 'Imagen subida', 'ok');
        cfPintaGeneral();
      } catch (e) { toast('Error de conexión', 'err'); }
    };
    rd.onerror = () => toast('No pude leer el archivo', 'err');
    rd.readAsDataURL(f);
  };
  inp.click();
}

async function cfQuitarInicio(btn) {
  if (!await confirmar('¿Quitar la imagen de inicio?',
    crow('El archivo', 'se borra de Drive') + crow('Se puede deshacer', 'No'))) return;
  saving(btn, true);
  try {
    const r = await api('priv.cfgInicioImagenQuitar', {}, 'POST', cfAuth());
    saving(btn, false);
    if (!r.ok) return toast(r.msg || 'No se pudo quitar', 'err');
    CF.d.cfg.INICIO_IMAGEN_DRIVE = '';
    toast('Imagen quitada', 'ok');
    cfPintaGeneral();
  } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
}

/* ============================================================
   UBICACIÓN · mapa con pin                            (Módulo 9.1)
   ------------------------------------------------------------
   Nadie escribe coordenadas a mano: se mueve el pin y se le da OK.
   El mapa del picker es Leaflet + OpenStreetMap, servido DESDE EL REPO
   (./vendor/): sin API key y sin depender de un CDN, que rompería la app
   cuando el service worker la sirva sin red. Se carga solo cuando abres
   el mapa, para no pesarle al arranque.
   La miniatura de la tarjeta es un embed de Google Maps: se ve igual que
   en la app pública, así compruebas de un vistazo a dónde apunta.
   ============================================================ */
const CF_MAPA_DEF = [4.289037, -74.814221];   // Casa Social: solo para centrar la 1ª vez
let CF_LEAFLET = null;

function cfCoordOk(lat, lng) {
  const a = Number(lat), b = Number(lng);
  if (!isFinite(a) || !isFinite(b)) return false;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return false;
  return !(a === 0 && b === 0);
}
const cfCoord6 = n => Number(Number(n).toFixed(6));

/* Campo de la tarjeta: miniatura + botón. Los valores viven en dos inputs
   ocultos con los ids de siempre (cf-k-CASA_LAT / cf-k-CASA_LNG), así
   "Guardar textos" los recoge sin saber que hay un mapa de por medio. */
function cfMapaField(lat, lng) {
  return `<div class="cfg-field full">
    <label>Ubicación de la casa social</label>
    <input type="hidden" id="cf-k-CASA_LAT" value="${esc(lat == null ? '' : lat)}" />
    <input type="hidden" id="cf-k-CASA_LNG" value="${esc(lng == null ? '' : lng)}" />
    <div class="cfg-mapa" id="cf-mapa-box">${cfMapaPrev(lat, lng)}</div>
    <div class="cfg-hint">Es el destino del botón “Iniciar recorrido” de la app pública.</div>
  </div>`;
}

function cfMapaPrev(lat, lng) {
  const ok = cfCoordOk(lat, lng);
  const q = ok ? encodeURIComponent(cfCoord6(lat) + ',' + cfCoord6(lng)) : '';
  return `${ok
      ? `<iframe class="cfg-mapa-prev" src="https://www.google.com/maps?q=${q}&z=17&hl=es&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Ubicación de la casa social"></iframe>`
      : '<div class="cfg-mapa-no">Todavía no has marcado la ubicación.</div>'}
    <div class="cfg-mapa-a">
      <button class="btn btn-quiet cfg-mini" id="cf-mapa-btn">${I.pin} ${ok ? 'Cambiar ubicación' : 'Marcar en el mapa'}</button>
      ${ok ? `<span class="cfg-mapa-txt">${esc(cfCoord6(lat) + ', ' + cfCoord6(lng))}</span>` : ''}
    </div>`;
}

function cfMapaBind() {
  const b = $('#cf-mapa-btn');
  if (b) b.onclick = () => cfMapaAbrir();
}

/* Carga Leaflet del repo, una sola vez */
function cfLeaflet() {
  if (CF_LEAFLET) return CF_LEAFLET;
  CF_LEAFLET = new Promise((res, rej) => {
    if (window.L) return res(window.L);
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = './vendor/leaflet.css';
    document.head.appendChild(css);
    const sc = document.createElement('script');
    sc.src = './vendor/leaflet.js';
    sc.onload = () => window.L ? res(window.L) : rej(new Error('leaflet'));
    sc.onerror = () => { CF_LEAFLET = null; rej(new Error('leaflet')); };
    document.head.appendChild(sc);
  });
  return CF_LEAFLET;
}

async function cfMapaAbrir() {
  let lat = Number($('#cf-k-CASA_LAT').value), lng = Number($('#cf-k-CASA_LNG').value);
  if (!cfCoordOk(lat, lng)) { lat = CF_MAPA_DEF[0]; lng = CF_MAPA_DEF[1]; }

  openSheet(`<div class="grip"></div>
    <h2 class="h2" style="margin-bottom:4px;">Ubicación de la casa social</h2>
    <p class="muted small" style="margin-bottom:10px;">Arrastra el pin —o toca el mapa— hasta la puerta. Después dale Listo.</p>
    <div class="cfg-map-search">
      <input class="input" id="cf-map-q" placeholder="Buscar una dirección o un lugar" autocomplete="off" />
      <button class="btn btn-quiet" id="cf-map-go">Buscar</button>
    </div>
    <div id="cf-map-res" class="cfg-map-res" hidden></div>
    <div id="cf-map" class="cfg-map">${loadingBox('Abriendo el mapa…')}</div>
    <div class="cfg-map-foot">
      <button class="btn btn-quiet btn-block" id="cf-map-yo">${I.pin} Usar mi ubicación</button>
      <span class="cfg-map-co" id="cf-map-co"></span>
    </div>
    <div class="stack" style="margin-top:12px;">
      <button class="btn btn-primary btn-block" id="cf-map-ok">Listo</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);

  let L;
  try { L = await cfLeaflet(); }
  catch (e) { $('#cf-map').innerHTML = '<p class="muted center small">No pude cargar el mapa. Revisa que la carpeta <b>vendor</b> esté subida al repo.</p>'; return; }
  if (!$('#cf-map')) return;   // cerró la hoja mientras cargaba

  $('#cf-map').innerHTML = '';
  const map = L.map($('#cf-map'), { zoomControl: true, attributionControl: true }).setView([lat, lng], 17);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap'
  }).addTo(map);

  /* Pin dibujado con CSS: así no hace falta subir los PNG de Leaflet
     y además queda del azul de la marca. */
  const pin = L.divIcon({ className: 'cfg-pin', html: '<span></span>', iconSize: [26, 34], iconAnchor: [13, 34] });
  const mk = L.marker([lat, lng], { draggable: true, icon: pin, autoPan: true }).addTo(map);

  const co = $('#cf-map-co');
  const pinta = () => { const p = mk.getLatLng(); co.textContent = cfCoord6(p.lat) + ', ' + cfCoord6(p.lng); };
  pinta();
  mk.on('drag', pinta);
  map.on('click', e => { mk.setLatLng(e.latlng); pinta(); });
  setTimeout(() => map.invalidateSize(), 180);   // la hoja entra animada

  $('#cf-map-yo').onclick = (e) => {
    if (!navigator.geolocation) return toast('Tu dispositivo no comparte la ubicación', 'err');
    const btn = e.currentTarget; saving(btn, true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        saving(btn, false);
        const c = [pos.coords.latitude, pos.coords.longitude];
        mk.setLatLng(c); map.setView(c, 18); pinta();
      },
      err => { saving(btn, false); toast(err.code === 1 ? 'No diste permiso de ubicación' : 'No pude ubicarte', 'err'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const buscar = async () => {
    const q = val('cf-map-q');
    if (!q) return;
    const res = $('#cf-map-res');
    res.hidden = false; res.innerHTML = '<p class="muted small">Buscando…</p>';
    try {
      const u = 'https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=co&q=' + encodeURIComponent(q);
      const r = await fetch(u, { headers: { 'Accept': 'application/json' } });
      const lista = await r.json();
      if (!lista.length) { res.innerHTML = '<p class="muted small">Sin resultados. Mueve el pin a mano.</p>'; return; }
      res.innerHTML = lista.map((x, i) => `<button class="cfg-map-hit" data-i="${i}">${esc(x.display_name)}</button>`).join('');
      res.querySelectorAll('.cfg-map-hit').forEach(b => b.onclick = () => {
        const x = lista[Number(b.dataset.i)];
        const c = [Number(x.lat), Number(x.lon)];
        mk.setLatLng(c); map.setView(c, 18); pinta();
        res.hidden = true;
      });
    } catch (e) { res.innerHTML = '<p class="muted small">No pude buscar. Mueve el pin a mano.</p>'; }
  };
  $('#cf-map-go').onclick = buscar;
  $('#cf-map-q').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } };

  $('#cf-map-ok').onclick = async (e) => {
    const p = mk.getLatLng();
    const lat2 = String(cfCoord6(p.lat)), lng2 = String(cfCoord6(p.lng));
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgGuardar', {}, 'POST',
        Object.assign(cfAuth(), { cambios: { CASA_LAT: lat2, CASA_LNG: lng2 } }));
      if (!r.ok) { saving(e.currentTarget, false); return toast(r.msg || 'No se pudo guardar', 'err'); }
      CF.d.cfg.CASA_LAT = lat2; CF.d.cfg.CASA_LNG = lng2;
      closeLayer();
      const box = $('#cf-mapa-box');
      if (box) { box.innerHTML = cfMapaPrev(lat2, lng2); cfMapaBind(); }
      const li = $('#cf-k-CASA_LAT'), lo = $('#cf-k-CASA_LNG');
      if (li) li.value = lat2; if (lo) lo.value = lng2;
      toast('Ubicación guardada', 'ok');
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };
}

/* ============================================================
   CASA SOCIAL
   ============================================================ */
function cfPintaCasa() {
  const cfg = CF.d.cfg, dias = CF.d.casa.dias, redes = CF.d.casa.redes;

  const textos = cfCard('Textos de la vista', 'Lo que lee la gente en la app pública.',
    `<div class="cfg-grid">
      ${cfField('cf-k-CASA_TITULO', 'Título', cfg.CASA_TITULO, '', true)}
      ${cfArea('cf-k-CASA_INTRO', 'Bienvenida', cfg.CASA_INTRO, '', 2)}
      ${cfArea('cf-k-CASA_CIERRE', 'Cierre', cfg.CASA_CIERRE, 'Va después de la programación.', 2)}
      ${cfField('cf-k-CASA_HASHTAGS', 'Hashtags', cfg.CASA_HASHTAGS, '', true)}
      ${cfField('cf-k-CASA_DIRECCION', 'Dirección visible', cfg.CASA_DIRECCION, '', true)}
      ${cfMapaField(cfg.CASA_LAT, cfg.CASA_LNG)}
      ${cfField('cf-k-CASA_REDES_TITULO', 'Título del bloque de redes', cfg.CASA_REDES_TITULO, '', true)}
      ${cfField('cf-k-CASA_REDES_SUB', 'Subtítulo del bloque de redes', cfg.CASA_REDES_SUB, '', true)}
     </div>
     <div class="cfg-actions"><button class="btn btn-primary" id="cf-casa-save">Guardar textos</button></div>`);

  const prog = cfCard('Programación', 'Enciende el día, ponle sus ítems y, si quieres, una imagen. Un día sin ítems no se muestra.',
    dias.map(d => `
      <div class="cfg-day${d.activo ? ' on' : ''}">
        <div class="cfg-day-h">
          ${cfSwitch('cf-dia-' + d.dia, d.label, d.activo)}
          <button class="btn btn-quiet cfg-mini" data-add="${d.dia}">${I.plus} Ítem</button>
        </div>
        <div class="cfg-day-b">
          ${d.items.length ? `<ul class="cfg-items">${d.items.map(i => `
            <li class="cfg-item">
              <div class="cfg-item-t"><b>${esc(i.item)}</b>${i.horario ? `<span class="cfg-item-h">${I.clock} ${esc(i.horario)}</span>` : ''}${i.descripcion ? `<span class="cfg-item-d">${esc(i.descripcion)}</span>` : ''}</div>
              <div class="cfg-item-a">
                <button class="bd-btn" data-edit="${esc(i.id)}" data-dia="${d.dia}" title="Editar">${I.pencil}</button>
                <button class="bd-btn bd-btn-danger" data-del="${esc(i.id)}" title="Eliminar">${I.trash}</button>
              </div>
            </li>`).join('')}</ul>` : cfVacio('Sin ítems todavía.')}
          <div class="cfg-img">
            ${d.imagen ? `<img src="${esc(d.imagen)}" alt="" class="cfg-img-prev" onerror="this.style.display='none'" />` : '<div class="cfg-img-no">Sin imagen</div>'}
            <div class="cfg-img-a">
              <button class="btn btn-quiet cfg-mini" data-img="${d.dia}">${d.imagen ? 'Cambiar' : 'Subir'} imagen</button>
              ${d.imagen ? `<button class="btn btn-quiet cfg-mini cfg-danger" data-imgdel="${d.dia}">Quitar</button>` : ''}
            </div>
          </div>
        </div>
      </div>`).join(''));

  const redesHtml = cfCard('Redes sociales', 'Se muestran dentro de la casa social.',
    (redes.length ? `<ul class="cfg-list">${redes.map(r => `
      <li class="cfg-row${r.activo ? '' : ' off'}">
        <div class="cfg-row-t"><b>${esc(r.nombre)}</b><span class="cfg-row-s">${esc(r.enlace)}</span></div>
        <div class="cfg-row-a">
          ${r.activo ? '' : '<span class="cfg-pill">Oculta</span>'}
          <button class="bd-btn" data-red="${esc(r.id)}" title="Editar">${I.pencil}</button>
          <button class="bd-btn bd-btn-danger" data-reddel="${esc(r.id)}" title="Eliminar">${I.trash}</button>
        </div>
      </li>`).join('')}</ul>` : cfVacio('Sin redes.')) +
    `<div class="cfg-actions"><button class="btn btn-quiet" id="cf-red-add">${I.plus} Agregar red</button></div>`);

  $('#cf-body').innerHTML = textos + prog + redesHtml;

  $('#cf-casa-save').onclick = e => cfGuardarClaves(e.currentTarget, CF_CASA_KEYS);
  cfMapaBind();
  dias.forEach(d => { const s = $('#cf-dia-' + d.dia); if (s) s.onclick = () => cfDiaToggle(d); });
  $$('#cf-body [data-add]').forEach(b => b.onclick = () => cfItemSheet(b.dataset.add, null));
  $$('#cf-body [data-edit]').forEach(b => b.onclick = () => {
    const dia = CF.d.casa.dias.filter(x => x.dia === b.dataset.dia)[0];
    cfItemSheet(b.dataset.dia, dia.items.filter(i => i.id === b.dataset.edit)[0]);
  });
  $$('#cf-body [data-del]').forEach(b => b.onclick = () => cfItemBorrar(b.dataset.del));
  $$('#cf-body [data-img]').forEach(b => b.onclick = () => cfImgSubir(b.dataset.img));
  $$('#cf-body [data-imgdel]').forEach(b => b.onclick = () => cfImgQuitar(b.dataset.imgdel));
  $('#cf-red-add').onclick = () => cfRedSheet(null);
  $$('#cf-body [data-red]').forEach(b => b.onclick = () => cfRedSheet(redes.filter(r => r.id === b.dataset.red)[0]));
  $$('#cf-body [data-reddel]').forEach(b => b.onclick = () => cfRedBorrar(redes.filter(r => r.id === b.dataset.reddel)[0]));
}

async function cfDiaToggle(d) {
  try {
    const r = await api('priv.cfgCasaDia', {}, 'POST', Object.assign(cfAuth(), { dia: d.dia, activo: !d.activo }));
    if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
    CF.d.casa.dias = r.dias; cfPintaCasa();
  } catch (e) { toast('Error de conexión', 'err'); }
}

function cfItemSheet(dia, item) {
  const d = CF.d.casa.dias.filter(x => x.dia === dia)[0];
  openSheet(`<div class="grip"></div>
    <h2 class="h2">${item ? 'Editar ítem' : 'Nuevo ítem'} · ${esc(d.label)}</h2>
    <div class="stack" style="margin-top:14px;">
      ${field('Ítem', inputEl('cf-it-txt', `value="${esc(item ? item.item : '')}" placeholder="Ej. Clases de Inglés"`))}
      ${field('Horario', inputEl('cf-it-hor', `value="${esc(item ? item.horario : '')}" placeholder="Ej. 3:00 PM - 5:00 PM"`))}
      ${field('Descripción del ítem', `<textarea class="input ta" id="cf-it-desc" rows="3" placeholder="De qué se trata. Esto lo lee la gente en la app pública.">${esc(item ? (item.descripcion || '') : '')}</textarea>`)}
      <p class="small muted">Horario y descripción son texto libre y pueden quedar vacíos. La descripción también se ve en <b>Nuestra casa social</b> de la app pública.</p>
      <button class="btn btn-primary btn-block" id="cf-it-save">Guardar</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);
  $('#cf-it-save').onclick = async e => {
    const item2 = val('cf-it-txt');
    if (!item2) return toast('Escribe el ítem', 'err');
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgCasaItem', {}, 'POST', Object.assign(cfAuth(), {
        id: item ? item.id : '', dia, item: item2, horario: val('cf-it-hor'), descripcion: val('cf-it-desc')
      }));
      saving(e.currentTarget, false);
      if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
      CF.d.casa.dias = r.dias; closeLayer(); cfPintaCasa(); toast('Guardado', 'ok');
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };
}

async function cfItemBorrar(id) {
  if (!await confirmar('¿Eliminar el ítem?', crow('Acción', 'No se puede deshacer'))) return;
  try {
    const r = await api('priv.cfgCasaItemEliminar', {}, 'POST', Object.assign(cfAuth(), { id }));
    if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
    CF.d.casa.dias = r.dias; cfPintaCasa(); toast('Eliminado', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
}

/* La imagen anterior se BORRA DE VERDAD de Drive: se avisa antes. */
function cfImgSubir(dia) {
  const d = CF.d.casa.dias.filter(x => x.dia === dia)[0];
  const inp = h('<input type="file" accept="image/jpeg,image/png,image/webp" hidden />');
  document.body.appendChild(inp);
  inp.onchange = async () => {
    const f = inp.files[0]; inp.remove();
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) return toast('La imagen supera 6 MB', 'err');
    if (d.imagen && !await confirmar('¿Reemplazar la imagen de ' + d.label + '?',
      crow('La imagen actual', 'se borra de Drive') + crow('Se puede deshacer', 'No'))) return;
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const r = await api('priv.cfgCasaImagen', {}, 'POST', Object.assign(cfAuth(), { dia, dataUrl: rd.result }));
        if (!r.ok) return toast(r.msg || 'No se pudo subir', 'err');
        CF.d.casa.dias = r.dias; cfPintaCasa(); toast('Imagen actualizada', 'ok');
      } catch (e) { toast('Error de conexión', 'err'); }
    };
    rd.readAsDataURL(f);
  };
  inp.click();
}

async function cfImgQuitar(dia) {
  const d = CF.d.casa.dias.filter(x => x.dia === dia)[0];
  if (!await confirmar('¿Quitar la imagen de ' + d.label + '?',
    crow('El archivo', 'se borra de Drive') + crow('Se puede deshacer', 'No'))) return;
  try {
    const r = await api('priv.cfgCasaImagenQuitar', {}, 'POST', Object.assign(cfAuth(), { dia }));
    if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
    CF.d.casa.dias = r.dias; cfPintaCasa(); toast('Imagen quitada', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
}

function cfRedSheet(red) {
  openSheet(`<div class="grip"></div>
    <h2 class="h2">${red ? 'Editar red' : 'Nueva red'}</h2>
    <div class="stack" style="margin-top:14px;">
      ${field('Nombre', inputEl('cf-rd-n', `value="${esc(red ? red.nombre : '')}" placeholder="Ej. Facebook"`))}
      ${field('Enlace', inputEl('cf-rd-e', `value="${esc(red ? red.enlace : '')}" placeholder="https://…"`))}
      <label class="check-row"><input type="checkbox" id="cf-rd-a" ${!red || red.activo ? 'checked' : ''} /><span>Visible en la app pública</span></label>
      <button class="btn btn-primary btn-block" id="cf-rd-save">Guardar</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);
  $('#cf-rd-save').onclick = async e => {
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgRed', {}, 'POST', Object.assign(cfAuth(), {
        id: red ? red.id : '', nombre: val('cf-rd-n'), enlace: val('cf-rd-e'), activo: $('#cf-rd-a').checked
      }));
      saving(e.currentTarget, false);
      if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
      CF.d.casa.redes = r.redes; closeLayer(); cfPintaCasa(); toast('Guardado', 'ok');
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };
}

async function cfRedBorrar(red) {
  if (!await confirmar('¿Eliminar ' + red.nombre + '?', crow('Enlace', red.enlace))) return;
  try {
    const r = await api('priv.cfgRedEliminar', {}, 'POST', Object.assign(cfAuth(), { id: red.id }));
    if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
    CF.d.casa.redes = r.redes; cfPintaCasa(); toast('Eliminada', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
}

/* ============================================================
   NÚMEROS DE EMERGENCIA
   ============================================================ */
const CF_TEL_TIPOS = [['POLICIA', 'Policía'], ['BOMBEROS', 'Bomberos'], ['SALUD', 'Salud'], ['OTRO', 'Otro']];
function cfTipoLabel(t) { const x = CF_TEL_TIPOS.filter(a => a[0] === t)[0]; return x ? x[1] : 'Otro'; }

function cfPintaEmergencia() {
  const cfg = CF.d.cfg, items = CF.d.emergencia;
  const textos = cfCard('Textos de la vista', '',
    `<div class="cfg-grid">
      ${cfField('cf-k-EMERGENCIA_TITULO', 'Título', cfg.EMERGENCIA_TITULO, '', true)}
      ${cfArea('cf-k-EMERGENCIA_SUB', 'Subtítulo', cfg.EMERGENCIA_SUB, '', 2)}
     </div>
     <div class="cfg-actions"><button class="btn btn-primary" id="cf-em-save">Guardar textos</button></div>`);

  const lista = cfCard('Contactos', 'Salen en este orden. Un contacto sin número no se muestra.',
    (items.length ? `<ul class="cfg-list">${items.map(i => `
      <li class="cfg-row">
        <div class="cfg-row-t">
          <b>${esc(i.nombre)}</b>
          <span class="cfg-row-s">${esc(cfTipoLabel(i.tipo))} · ${i.whatsapp ? 'WhatsApp ' + esc(i.whatsapp) : 'sin WhatsApp'}${i.fijo ? ' · Fijo ' + esc(i.fijo) : ''}</span>
        </div>
        <div class="cfg-row-a">
          <button class="bd-btn" data-tel="${esc(i.id)}" title="Editar">${I.pencil}</button>
          <button class="bd-btn bd-btn-danger" data-teldel="${esc(i.id)}" title="Eliminar">${I.trash}</button>
        </div>
      </li>`).join('')}</ul>` : cfVacio('Sin contactos.')) +
    `<div class="cfg-actions"><button class="btn btn-quiet" id="cf-tel-add">${I.plus} Agregar contacto</button></div>`);

  $('#cf-body').innerHTML = textos + lista;
  $('#cf-em-save').onclick = e => cfGuardarClaves(e.currentTarget, CF_EM_KEYS);
  $('#cf-tel-add').onclick = () => cfTelSheet(null);
  $$('#cf-body [data-tel]').forEach(b => b.onclick = () => cfTelSheet(items.filter(i => i.id === b.dataset.tel)[0]));
  $$('#cf-body [data-teldel]').forEach(b => b.onclick = () => cfTelBorrar(items.filter(i => i.id === b.dataset.teldel)[0]));
}

function cfTelSheet(tel) {
  openSheet(`<div class="grip"></div>
    <h2 class="h2">${tel ? 'Editar contacto' : 'Nuevo contacto'}</h2>
    <div class="stack" style="margin-top:14px;">
      ${field('Nombre', inputEl('cf-tl-n', `value="${esc(tel ? tel.nombre : '')}" placeholder="Ej. Bomberos Flandes"`))}
      ${field('Tipo', `<select class="input" id="cf-tl-t">${CF_TEL_TIPOS.map(t => `<option value="${t[0]}"${tel && tel.tipo === t[0] ? ' selected' : ''}>${esc(t[1])}</option>`).join('')}</select>`)}
      ${field('WhatsApp', inputEl('cf-tl-w', `value="${esc(tel ? tel.whatsapp : '')}" inputmode="numeric" placeholder="10 dígitos"`))}
      ${field('Fijo', inputEl('cf-tl-f', `value="${esc(tel ? tel.fijo : '')}" inputmode="numeric" placeholder="Opcional"`))}
      <p class="small muted">Con al menos uno de los dos basta.</p>
      <button class="btn btn-primary btn-block" id="cf-tl-save">Guardar</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);
  onlyDigits($('#cf-tl-w')); onlyDigits($('#cf-tl-f'));
  $('#cf-tl-save').onclick = async e => {
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgTel', {}, 'POST', Object.assign(cfAuth(), {
        id: tel ? tel.id : '', nombre: val('cf-tl-n'), tipo: val('cf-tl-t'),
        whatsapp: val('cf-tl-w'), fijo: val('cf-tl-f')
      }));
      saving(e.currentTarget, false);
      if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
      CF.d.emergencia = r.emergencia; closeLayer(); cfPintaEmergencia(); toast('Guardado', 'ok');
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };
}

async function cfTelBorrar(tel) {
  if (!await confirmar('¿Eliminar ' + tel.nombre + '?', crow('Se quita de', 'Números de emergencia'))) return;
  try {
    const r = await api('priv.cfgTelEliminar', {}, 'POST', Object.assign(cfAuth(), { id: tel.id }));
    if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
    CF.d.emergencia = r.emergencia; cfPintaEmergencia(); toast('Eliminado', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
}

/* ============================================================
   SERVICIOS  (catálogo + solicitudes sin responsable)
   ============================================================ */
function cfPintaServicios() {
  const s = CF.d.servicios, hu = CF.d.huerfanas;

  const lista = cfCard('Catálogo de servicios',
    'INTERNO = no se ofrece en "Realiza tu solicitud" de la app pública, pero el profesional sí lo puede registrar.',
    (s.length ? `<ul class="cfg-list">${s.map(x => `
      <li class="cfg-row${x.activo ? '' : ' off'}">
        <div class="cfg-row-t">
          <b>${esc(x.servicio)}</b>
          <span class="cfg-row-s">${x.solicitudes} solicitud${x.solicitudes === 1 ? '' : 'es'} · ${x.profesionales} profesional${x.profesionales === 1 ? '' : 'es'}</span>
        </div>
        <div class="cfg-row-a">
          ${x.interno ? '<span class="cfg-pill cfg-pill-int">Interno</span>' : ''}
          ${x.activo ? '' : '<span class="cfg-pill">Inactivo</span>'}
          <button class="bd-btn" data-sv="${esc(x.id)}" title="Editar">${I.pencil}</button>
          <button class="bd-btn bd-btn-danger" data-svdel="${esc(x.id)}" title="Eliminar">${I.trash}</button>
        </div>
      </li>`).join('')}</ul>` : cfVacio('Sin servicios. ¿Corriste setupModulo9()?')) +
    `<div class="cfg-actions"><button class="btn btn-quiet" id="cf-sv-add">${I.plus} Agregar servicio</button></div>`);

  const huer = cfCard('Solicitudes sin responsable',
    hu.length ? 'Estas solicitudes no tienen profesional asignado. Asígnalo aquí.' : 'Todas las solicitudes tienen responsable.',
    hu.length ? `<ul class="cfg-list">${hu.map(x => `
      <li class="cfg-row">
        <div class="cfg-row-t">
          <b>${esc(x.nombre || x.documento)}</b>
          <span class="cfg-row-s">${esc(x.servicio || 'sin servicio')} · ${esc(x.fecha || '—')}</span>
          <span class="cfg-row-x">${esc(x.solicitud || '')}</span>
        </div>
        <div class="cfg-row-a"><button class="btn btn-quiet cfg-mini" data-hu="${x.fila}">Asignar</button></div>
      </li>`).join('')}</ul>` : cfVacio('Nada pendiente.'));

  $('#cf-body').innerHTML = lista + huer;
  $('#cf-sv-add').onclick = () => cfServSheet(null);
  $$('#cf-body [data-sv]').forEach(b => b.onclick = () => cfServSheet(s.filter(x => x.id === b.dataset.sv)[0]));
  $$('#cf-body [data-svdel]').forEach(b => b.onclick = () => cfServBorrar(s.filter(x => x.id === b.dataset.svdel)[0]));
  $$('#cf-body [data-hu]').forEach(b => b.onclick = () => cfAsignarSheet(hu.filter(x => String(x.fila) === b.dataset.hu)[0]));
}

function cfServSheet(sv) {
  openSheet(`<div class="grip"></div>
    <h2 class="h2">${sv ? 'Editar servicio' : 'Nuevo servicio'}</h2>
    <div class="stack" style="margin-top:14px;">
      ${field('Nombre', inputEl('cf-sv-n', `value="${esc(sv ? sv.servicio : '')}" placeholder="Ej. Asesoría Jurídica"`))}
      <label class="check-row"><input type="checkbox" id="cf-sv-a" ${!sv || sv.activo ? 'checked' : ''} /><span>Activo</span></label>
      <label class="check-row"><input type="checkbox" id="cf-sv-i" ${sv && sv.interno ? 'checked' : ''} /><span>Interno (no se ofrece en la app pública)</span></label>
      ${sv && (sv.solicitudes || sv.profesionales) ? `<p class="small muted">Si le cambias el nombre, se actualizan ${sv.solicitudes} solicitud(es) y ${sv.profesionales} profesional(es).</p>` : ''}
      <button class="btn btn-primary btn-block" id="cf-sv-save">Guardar</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);
  $('#cf-sv-save').onclick = async e => {
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgServ', {}, 'POST', Object.assign(cfAuth(), {
        id: sv ? sv.id : '', servicio: val('cf-sv-n'), activo: $('#cf-sv-a').checked, interno: $('#cf-sv-i').checked
      }));
      saving(e.currentTarget, false);
      if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
      CF.d.servicios = r.servicios;
      if (r.profesionales) CF.d.profesionales = r.profesionales;
      if (r.huerfanas) CF.d.huerfanas = r.huerfanas;
      closeLayer(); cfPintaServicios();
      toast(r.filas ? 'Guardado · ' + r.filas + ' registro(s) actualizados' : 'Guardado', 'ok');
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };
}

async function cfServBorrar(sv) {
  if (!await confirmar('¿Eliminar ' + sv.servicio + '?', crow('Solicitudes', String(sv.solicitudes)) + crow('Profesionales', String(sv.profesionales)))) return;
  try {
    const r = await api('priv.cfgServEliminar', {}, 'POST', Object.assign(cfAuth(), { id: sv.id }));
    if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
    CF.d.servicios = r.servicios; cfPintaServicios(); toast('Eliminado', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
}

function cfAsignarSheet(h2) {
  const profs = CF.d.profesionales;
  const delServicio = profs.filter(p => cfNorm(p.servicio) === cfNorm(h2.servicio));
  const lista = (delServicio.length ? delServicio : profs);
  openSheet(`<div class="grip"></div>
    <h2 class="h2">Asignar responsable</h2>
    <div class="confirm-list" style="margin-top:10px;">
      ${crow('Persona', h2.nombre || h2.documento)}${crow('Servicio', h2.servicio)}
    </div>
    ${h2.solicitud ? `<p class="cfg-quote">${esc(h2.solicitud)}</p>` : ''}
    <div class="stack" style="margin-top:14px;">
      ${field('Profesional', `<select class="input" id="cf-hu-p"><option value="">Selecciona</option>${lista.map(p => `<option value="${esc(p.nombre)}">${esc(p.nombre)} — ${esc(p.servicio)}</option>`).join('')}</select>`)}
      ${delServicio.length ? '' : '<p class="small muted">Ningún profesional tiene ese servicio: se muestran todos.</p>'}
      <button class="btn btn-primary btn-block" id="cf-hu-save">Asignar</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);
  $('#cf-hu-save').onclick = async e => {
    if (!val('cf-hu-p')) return toast('Elige el profesional', 'err');
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgServAsignar', {}, 'POST', Object.assign(cfAuth(), { fila: h2.fila, responsable: val('cf-hu-p') }));
      saving(e.currentTarget, false);
      if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
      CF.d.huerfanas = r.huerfanas; closeLayer(); cfPintaServicios(); toast('Responsable asignado', 'ok');
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };
}

/* ============================================================
   PROFESIONALES
   ============================================================ */
function cfPintaProfesionales() {
  const p = CF.d.profesionales;
  $('#cf-body').innerHTML = cfCard('Profesionales', 'Quién atiende cada servicio.',
    (p.length ? `<ul class="cfg-list">${p.map(x => `
      <li class="cfg-row">
        <div class="cfg-row-t">
          <b>${esc(x.nombre)}</b>
          <span class="cfg-row-s">${esc(x.servicio)} · doc. ${esc(x.documento)} · ${x.atendidas} atendida${x.atendidas === 1 ? '' : 's'}</span>
        </div>
        <div class="cfg-row-a">
          <button class="bd-btn" data-pf="${esc(x.documento)}" title="Editar">${I.pencil}</button>
          <button class="bd-btn bd-btn-danger" data-pfdel="${esc(x.documento)}" title="Eliminar">${I.trash}</button>
        </div>
      </li>`).join('')}</ul>` : cfVacio('Sin profesionales.')) +
    `<div class="cfg-actions"><button class="btn btn-quiet" id="cf-pf-add">${I.plus} Agregar profesional</button></div>`);
  $('#cf-pf-add').onclick = () => cfProfSheet(null);
  $$('#cf-body [data-pf]').forEach(b => b.onclick = () => cfProfSheet(p.filter(x => x.documento === b.dataset.pf)[0]));
  $$('#cf-body [data-pfdel]').forEach(b => b.onclick = () => cfProfBorrar(p.filter(x => x.documento === b.dataset.pfdel)[0]));
}

function cfProfSheet(pf) {
  const servicios = CF.d.servicios.filter(s => s.activo).map(s => s.servicio);
  if (pf && servicios.indexOf(pf.servicio) === -1 && pf.servicio) servicios.unshift(pf.servicio);
  openSheet(`<div class="grip"></div>
    <h2 class="h2">${pf ? 'Editar profesional' : 'Nuevo profesional'}</h2>
    <div class="stack" style="margin-top:14px;">
      ${field('Documento', inputEl('cf-pf-d', `value="${esc(pf ? pf.documento : '')}" inputmode="numeric"`))}
      ${field('Nombre', inputEl('cf-pf-n', `value="${esc(pf ? pf.nombre : '')}"`))}
      ${field('WhatsApp', inputEl('cf-pf-c', `value="${esc(pf ? pf.contacto : '')}" inputmode="numeric" placeholder="10 dígitos"`))}
      ${field('Servicio', `<select class="input" id="cf-pf-s"><option value="">Selecciona</option>${servicios.map(s => `<option value="${esc(s)}"${pf && pf.servicio === s ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select>`)}
      ${pf && pf.atendidas ? `<p class="small muted">Si le cambias el nombre, se actualiza en sus ${pf.atendidas} solicitud(es).</p>` : ''}
      <button class="btn btn-primary btn-block" id="cf-pf-save">Guardar</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);
  onlyDigits($('#cf-pf-d')); onlyDigits($('#cf-pf-c'));
  $('#cf-pf-save').onclick = async e => {
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgProf', {}, 'POST', Object.assign(cfAuth(), {
        docOriginal: pf ? pf.documento : '', documento: val('cf-pf-d'), nombre: val('cf-pf-n'),
        contacto: val('cf-pf-c'), servicio: val('cf-pf-s')
      }));
      saving(e.currentTarget, false);
      if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
      CF.d.profesionales = r.profesionales; CF.d.servicios = r.servicios;
      closeLayer(); cfPintaProfesionales(); toast('Guardado', 'ok');
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };
}

async function cfProfBorrar(pf) {
  if (!await confirmar('¿Eliminar a ' + pf.nombre + '?',
    crow('Servicio', pf.servicio) + crow('Solicitudes atendidas', String(pf.atendidas)) +
    (pf.atendidas ? crow('Ojo', 'su nombre queda en el historial') : ''))) return;
  try {
    const r = await api('priv.cfgProfEliminar', {}, 'POST', Object.assign(cfAuth(), { documento: pf.documento }));
    if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
    CF.d.profesionales = r.profesionales; CF.d.servicios = r.servicios;
    cfPintaProfesionales(); toast('Eliminado', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
}

/* ============================================================
   ZONAS  (agregar y renombrar · no se borran)
   ============================================================ */
let CF_ZQ = '';
function cfPintaZonas() {
  const q = cfNorm(CF_ZQ);
  const z = CF.d.zonas.filter(x => !q || cfNorm(x.residencia).indexOf(q) >= 0);
  $('#cf-body').innerHTML = cfCard('Zonas', 'Se guardan sin acento y en mayúsculas. Renombrar una zona la cambia en todos los registros para no dejar datos mixtos.',
    `<div class="bd-search"><input class="input" id="cf-z-q" placeholder="Buscar zona…" value="${esc(CF_ZQ)}" autocomplete="off" /></div>
     <p class="cfg-count">${z.length} de ${CF.d.zonas.length} zonas</p>
     ${z.length ? `<ul class="cfg-list">${z.map(x => `
      <li class="cfg-row">
        <div class="cfg-row-t"><b>${esc(x.residencia)}</b><span class="cfg-row-s">${esc(x.id)}</span></div>
        <div class="cfg-row-a"><button class="bd-btn" data-z="${esc(x.id)}" title="Renombrar">${I.pencil}</button></div>
      </li>`).join('')}</ul>` : cfVacio('Ninguna zona con ese nombre.')}
     <div class="cfg-actions"><button class="btn btn-quiet" id="cf-z-add">${I.plus} Agregar zona</button></div>`);
  const inp = $('#cf-z-q');
  inp.oninput = () => { CF_ZQ = inp.value; const s = inp.selectionStart; cfPintaZonas(); const i2 = $('#cf-z-q'); i2.focus(); i2.setSelectionRange(s, s); };
  $('#cf-z-add').onclick = () => cfZonaSheet(null);
  $$('#cf-body [data-z]').forEach(b => b.onclick = () => cfZonaSheet(CF.d.zonas.filter(x => x.id === b.dataset.z)[0]));
}

function cfZonaSheet(z) {
  openSheet(`<div class="grip"></div>
    <h2 class="h2">${z ? 'Renombrar zona' : 'Nueva zona'}</h2>
    <div class="stack" style="margin-top:14px;">
      ${field('Nombre', inputEl('cf-z-n', `value="${esc(z ? z.residencia : '')}" placeholder="Ej. VILLA CAFE"`))}
      <p class="small muted">Se guarda sin acento y en mayúsculas. La Ñ sí se respeta.</p>
      <div id="cf-z-imp"></div>
      <button class="btn btn-primary btn-block" id="cf-z-save">${z ? 'Renombrar' : 'Agregar'}</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);
  if (z) api('priv.cfgZonaImpacto', Object.assign(cfAuth(), { id: z.id })).then(r => {
    const box = $('#cf-z-imp'); if (!box || !r.ok) return;
    box.innerHTML = r.total
      ? `<div class="cfg-warn">Renombrarla cambia <b>${r.total}</b> registro(s): ${r.detalle.map(d => esc(d.hoja) + ' (' + d.filas + ')').join(', ')}.</div>`
      : `<div class="cfg-hint">Ningún registro usa esta zona todavía.</div>`;
  }).catch(() => {});
  $('#cf-z-save').onclick = async e => {
    const nombre = val('cf-z-n');
    if (!nombre) return toast('Escribe el nombre', 'err');
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgZona', {}, 'POST', Object.assign(cfAuth(), { id: z ? z.id : '', residencia: nombre }));
      saving(e.currentTarget, false);
      if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
      CF.d.zonas = r.zonas; closeLayer(); cfPintaZonas();
      toast(r.filas ? r.nombre + ' · ' + r.filas + ' registro(s) actualizados' : 'Guardada como ' + r.nombre, 'ok');
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };
}

/* ============================================================
   PLANTILLAS
   ============================================================ */
function cfPintaPlantillas() {
  $('#cf-body').innerHTML = CF.d.plantillas.map((p, i) => cfCard(p.titulo,
    p.modulo + ' · toca una variable para insertarla donde tengas el cursor.',
    `<div class="cfg-chips">${p.vars.map(v => `<button class="cfg-chip" data-v="${esc(v)}" data-i="${i}">${esc(v)}</button>`).join('')}</div>
     <textarea class="input area cfg-tpl" id="cf-tpl-${i}" rows="7">${esc(p.cuerpo)}</textarea>
     <div class="cfg-hint">${p.sintaxis === 'corchetes'
        ? 'Las variables van entre corchetes. Para bajar de línea, dale Enter: se manda tal cual lo escribes.'
        : 'Las variables van entre llaves. Para bajar de línea, dale Enter: se manda tal cual lo escribes.'}</div>
     <div id="cf-tpl-prev-${i}" class="cfg-prev"></div>
     <div class="cfg-actions">
       <button class="btn btn-quiet cfg-mini" data-prev="${i}">Vista previa</button>
       <button class="btn btn-primary" data-save="${i}">Guardar</button>
     </div>`)).join('');

  $$('#cf-body .cfg-chip').forEach(b => b.onclick = () => {
    const ta = $('#cf-tpl-' + b.dataset.i);
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + b.dataset.v + ta.value.slice(e);
    ta.focus(); ta.setSelectionRange(s + b.dataset.v.length, s + b.dataset.v.length);
  });
  $$('#cf-body [data-prev]').forEach(b => b.onclick = () => cfTplPrev(+b.dataset.prev));
  $$('#cf-body [data-save]').forEach(b => b.onclick = e => cfTplGuardar(e.currentTarget, +b.dataset.save));
}

/* Muestra el mensaje como le llega a la persona. Desde el Módulo 9.1 lo que
   se escribe es lo que se manda: los saltos de línea ya son de verdad, así
   que aquí no hay nada que traducir. */
function cfTplPrev(i) {
  const p = CF.d.plantillas[i], txt = $('#cf-tpl-' + i).value;
  const ejemplo = { '[NOMBRE]': 'MARÍA GÓMEZ', '[CODIGO]': 'LD-014', '[REFERIDOS]': '12',
    '[ASIGNADO]': 'CARLOS RUIZ', '[COMPROMISO]': 'Arreglo del parque', '[CONTACTO]': '3001234567',
    '[USUARIO]': 'Oscar Polania', '[SOLICITUD]': 'Informe de la sede',
    '{nombre}': 'MARÍA GÓMEZ', '{clave}': '4821', '{codigo}': 'LD-014',
    '{servicio}': 'Asesoría Jurídica', '{respuesta}': 'Tu caso quedó radicado.',
    '{p_nombre}': 'Carlos', '{compromiso}': 'Arreglo del parque',
    '{tiempo}': 'buenos días', '{jornada}': 'la mañana', '{pn_candidato}': 'Jhonny', '{n_candidato}': 'Jhonny Perdomo',
    '{u_agenda}': 'Oscar Polania', '{contacto}': 'Oscar Polania',
    '{lista_reuniones}': '1. 8:30 AM – 10:00 AM · Visita a líderes — TRIANA\n2. 11:00 AM – 12:00 M · Reunión JAC — LA CAPILLA',
    '{bloque_aviso}': 'Visita a líderes\n🗓️ 21 de julio de 2026 · 8:30 AM – 10:00 AM\n📍 TRIANA\nDetalles: Calle 27 # 8 - 26',
    '{fecha_larga}': '21 de julio de 2026', '{hora_inicio}': '8:30 AM', '{hora_fin}': '10:00 AM',
    '{lugar}': 'TRIANA', '{detalles}': 'Detalles: Calle 27 # 8 - 26 cerca tingo pollo',
    '{mensaje}': 'Trae el listado de asistentes impreso, por favor.' };
  let out = txt;
  p.vars.forEach(v => { out = out.split(v).join(ejemplo[v] || v); });
  $('#cf-tpl-prev-' + i).innerHTML = `<div class="cfg-prev-b">${esc(out)}</div>`;
}

async function cfTplGuardar(btn, i) {
  const p = CF.d.plantillas[i], txt = $('#cf-tpl-' + i).value;
  if (!txt.trim() && !await confirmar('¿Dejar la plantilla vacía?',
    crow('Si la dejas vacía', 'se usa el texto original de fábrica'))) return;
  const faltan = p.vars.filter(v => txt.indexOf(v) === -1);
  if (faltan.length && !await confirmar('Faltan variables',
    crow('Sin usar', faltan.join(' ')) + crow('¿Guardar igual?', 'Sí, si es a propósito'))) return;
  saving(btn, true);
  try {
    const cambios = {}; cambios[p.clave] = txt;
    const r = await api('priv.cfgGuardar', {}, 'POST', Object.assign(cfAuth(), { cambios }));
    saving(btn, false);
    if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
    p.cuerpo = txt; CF.d.cfg[p.clave] = txt;
    toast('Plantilla guardada', 'ok');
  } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
}

/* ============================================================
   USUARIOS  (DEV + ADMIN · el DESARROLLADOR lleva candado)
   ------------------------------------------------------------
   17/07/2026: el ADMIN entra aquí, se edita a sí mismo, agrega usuarios y
   edita a los ADMIN/SEDE. Lo que NO puede es ELIMINAR: ese botón es del
   DESARROLLADOR y el backend lo vuelve a exigir (que el botón no se pinte
   es comodidad, no seguridad).
   ============================================================ */
function cfPintaUsuarios() {
  const u = CF.d.usuarios;
  const puedeBorrar = !!CF.d.esDev;
  $('#cf-body').innerHTML = cfCard('Usuarios de la app privada', 'Quién entra al panel y con qué rol. El PIN es la única llave: no puede repetirse entre usuarios.',
    `<ul class="cfg-list">${u.map(x => `
      <li class="cfg-row">
        <img class="cfg-av" src="${esc(x.foto)}" alt="" onerror="this.style.visibility='hidden'" />
        <div class="cfg-row-t">
          <b>${esc(x.nombre)} ${x.esDev ? I.lock : ''}</b>
          <span class="cfg-row-s">${esc(x.rol)} · doc. ${esc(x.documento)} · ${esc(x.correo || 'sin correo')}</span>
          ${x.esDev ? '' : `<span class="cfg-row-s">${x.whatsapp ? '📱 ' + esc(x.whatsapp) : '📱 sin WhatsApp'}${x.bienvenida ? ' · ✅ Bienvenida enviada el ' + esc(x.bienvenida) : ''}</span>`}
        </div>
        <div class="cfg-row-a">
          ${x.estado === 'ACTIVO' ? '' : '<span class="cfg-pill">Inactivo</span>'}
          ${x.esDev ? '<span class="cfg-pill cfg-pill-dev">Protegido</span>' : `
            <button class="bd-btn" data-usbien="${esc(x.documento)}" title="${x.bienvenida ? 'Reenviar la bienvenida' : 'Enviar la bienvenida'}">${x.bienvenida ? I.repeat : I.wa}</button>
            <button class="bd-btn" data-us="${esc(x.documento)}" title="Editar">${I.pencil}</button>
            ${puedeBorrar ? `<button class="bd-btn bd-btn-danger" data-usdel="${esc(x.documento)}" title="Eliminar">${I.trash}</button>` : ''}`}
        </div>
      </li>`).join('')}</ul>
     <div class="cfg-actions"><button class="btn btn-quiet" id="cf-us-add">${I.plus} Agregar usuario</button></div>`)
    /* 17/07: los usuarios de la app CENTER viven aquí mismo, debajo. */
    + cfCallUsuariosCard();
  $('#cf-us-add').onclick = () => cfUserSheet(null);
  cfCallUsuariosBind();
  $$('#cf-body [data-us]').forEach(b => b.onclick = () => cfUserSheet(u.filter(x => x.documento === b.dataset.us)[0]));
  $$('#cf-body [data-usdel]').forEach(b => b.onclick = () => cfUserBorrar(u.filter(x => x.documento === b.dataset.usdel)[0]));
  $$('#cf-body [data-usbien]').forEach(b => b.onclick = () => cfUserBienvenida(u.filter(x => x.documento === b.dataset.usbien)[0]));
  cfZoomFotos();
}

/* ============================================================
   BIENVENIDA por WhatsApp (17/07/2026)
   ------------------------------------------------------------
   Botón en la tarjeta (NO se envía solo al crear el usuario: así lo pidió).
   Dos vías, mismo texto, el del CORE (Configuración → Plantillas es la única
   fuente de verdad; aquí NO se escribe el mensaje):
     · WhatsApp directo → abre el chat con el texto listo. No necesita llaves.
     · Por el bot       → lo manda BuilderBot solo.
   ============================================================ */
function cfUserBienvenida(us) {
  if (!us) return;
  if (!us.whatsapp) return toast('Ese usuario no tiene WhatsApp. Edítalo y agrégale el número.', 'err');
  openSheet(`<div class="grip"></div>
    <h2 class="h2">${us.bienvenida ? 'Reenviar bienvenida' : 'Enviar bienvenida'}</h2>
    <p class="muted small">A <b>${esc(us.nombre)}</b> · ${esc(us.whatsapp)}${us.bienvenida ? `<br>Ya se le envió el ${esc(us.bienvenida)}.` : ''}</p>
    <div class="stack" style="margin-top:14px;">
      <button class="btn btn-primary btn-block" id="cf-bien-wa">Abrir WhatsApp con el mensaje</button>
      <button class="btn btn-quiet btn-block" id="cf-bien-bot">Enviarlo por el bot</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);

  $('#cf-bien-wa').onclick = async e => {
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgUsuarioBienvenida', {}, 'POST', Object.assign(cfAuth(), { documento: us.documento, medio: 'wa' }));
      saving(e.currentTarget, false);
      if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
      CF.d.usuarios = r.usuarios || CF.d.usuarios;
      closeLayer(); cfPintaUsuarios();
      ldWaOpen(r.numero, r.texto);   // mismo abridor que usa Líderes (móvil vs PC)
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };

  $('#cf-bien-bot').onclick = async e => {
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgUsuarioBienvenida', {}, 'POST', Object.assign(cfAuth(), { documento: us.documento, medio: 'bot' }));
      saving(e.currentTarget, false);
      if (!r.ok) return toast(r.msg || 'No se pudo enviar', 'err');
      CF.d.usuarios = r.usuarios || CF.d.usuarios;
      closeLayer(); cfPintaUsuarios(); toast(r.msg || 'Bienvenida enviada', 'ok');
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };
}

function cfUserSheet(us) {
  const roles = [['ADMIN', 'ADMIN — ve todo el panel'], ['SEDE', 'SEDE — solo Mi Bot']];
  openSheet(`<div class="grip"></div>
    <h2 class="h2">${us ? 'Editar usuario' : 'Nuevo usuario'}</h2>
    <div class="stack" style="margin-top:14px;">
      ${us ? `<div class="cfg-foto">
        <img class="cfg-foto-img" id="cf-us-prev" src="${esc(us.foto)}" alt="" onerror="this.style.visibility='hidden'" />
        <div class="stack">
          <button class="btn btn-quiet cfg-mini" id="cf-us-foto">Cambiar foto</button>
          <button class="btn btn-quiet cfg-mini cfg-danger" id="cf-us-fotodel">Quitar foto</button>
        </div></div>` : ''}
      ${field('Documento', inputEl('cf-us-d', `value="${esc(us ? us.documento : '')}" inputmode="numeric"`))}
      ${field('Nombre', inputEl('cf-us-n', `value="${esc(us ? us.nombre : '')}"`))}
      ${field('Correo', inputEl('cf-us-c', `value="${esc(us ? us.correo : '')}" inputmode="email"`))}
      ${field('WhatsApp (obligatorio)', inputEl('cf-us-w', `value="${esc(us ? us.whatsapp : '')}" inputmode="numeric" maxlength="12" placeholder="3001234567"`))}
      ${field('Rol', `<select class="input" id="cf-us-r">${roles.map(r => `<option value="${r[0]}"${us && us.rol === r[0] ? ' selected' : ''}>${esc(r[1])}</option>`).join('')}</select>`)}
      ${field('PIN (4 dígitos)', inputEl('cf-us-p', `inputmode="numeric" maxlength="4" placeholder="${us ? 'Déjalo vacío para no cambiarlo' : '0000'}"`))}
      ${field('Estado', `<select class="input" id="cf-us-e"><option value="ACTIVO"${!us || us.estado === 'ACTIVO' ? ' selected' : ''}>Activo</option><option value="INACTIVO"${us && us.estado === 'INACTIVO' ? ' selected' : ''}>Inactivo</option></select>`)}
      <button class="btn btn-primary btn-block" id="cf-us-save">Guardar</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);
  onlyDigits($('#cf-us-d')); onlyDigits($('#cf-us-p')); onlyDigits($('#cf-us-w'));
  if (us) {
    $('#cf-us-foto').onclick = () => cfUserFoto(us);
    $('#cf-us-fotodel').onclick = () => cfUserFotoQuitar(us);
    /* Fase 9.2: mismo visor con zoom que en el Inicio y en Detalles */
    cfZoomFotos();
  }
  $('#cf-us-save').onclick = async e => {
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgUsuario', {}, 'POST', Object.assign(cfAuth(), {
        docOriginal: us ? us.documento : '', documento: val('cf-us-d'), nombre: val('cf-us-n'),
        correo: val('cf-us-c'), whatsapp: val('cf-us-w'), rol: val('cf-us-r'), pin: val('cf-us-p'), estado: val('cf-us-e')
      }));
      saving(e.currentTarget, false);
      if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
      CF.d.usuarios = r.usuarios; closeLayer(); cfPintaUsuarios(); toast('Guardado', 'ok');
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };
}

function cfUserFoto(us) {
  const inp = h('<input type="file" accept="image/jpeg,image/png,image/webp" hidden />');
  document.body.appendChild(inp);
  inp.onchange = () => {
    const f = inp.files[0]; inp.remove();
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) return toast('La imagen supera 6 MB', 'err');
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const r = await api('priv.cfgUsuarioFoto', {}, 'POST', Object.assign(cfAuth(), { documento: us.documento, dataUrl: rd.result }));
        if (!r.ok) return toast(r.msg || 'No se pudo subir', 'err');
        CF.d.usuarios = r.usuarios; us.foto = r.foto;
        const p = $('#cf-us-prev'); if (p) { p.src = r.foto; p.style.visibility = 'visible'; }
        toast('Foto actualizada', 'ok');
      } catch (e) { toast('Error de conexión', 'err'); }
    };
    rd.readAsDataURL(f);
  };
  inp.click();
}

/* Engancha el zoom a TODA foto pintada en Configuración → Usuarios: la lista
   (.cfg-av) y el detalle (.cfg-foto-img). Se llama tras cada repintado. Se
   salta las que no cargaron (visibility oculta) y la imagen por defecto. */
function cfZoomFotos() {
  $$('#cf-body .cfg-av, #cf-body .cfg-foto-img').forEach(img => {
    const src = img.getAttribute('src') || '';
    if (!src || src.toLowerCase().indexOf(FOTO_DEFAULT_PRIV) !== -1) return;
    img.classList.add('zoomable');
    img.onclick = e => { e.stopPropagation(); zoomImagen(src); };
  });
}

async function cfUserFotoQuitar(us) {
  if (!await confirmar('¿Quitar la foto?', crow('El archivo', 'se borra de Drive'))) return;
  try {
    const r = await api('priv.cfgUsuarioFotoQuitar', {}, 'POST', Object.assign(cfAuth(), { documento: us.documento }));
    if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
    CF.d.usuarios = r.usuarios; us.foto = r.foto;
    const p = $('#cf-us-prev'); if (p) p.src = r.foto;
    toast('Foto quitada', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
}

async function cfUserBorrar(us) {
  if (!await confirmar('¿Eliminar a ' + us.nombre + '?', crow('Rol', us.rol) + crow('Pierde el acceso', 'Sí'))) return;
  try {
    const r = await api('priv.cfgUsuarioEliminar', {}, 'POST', Object.assign(cfAuth(), { documento: us.documento }));
    if (!r.ok) return toast(r.msg || 'No se pudo', 'err');
    CF.d.usuarios = r.usuarios; cfPintaUsuarios(); toast('Eliminado', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
}

/* ============================================================
   AVANZADO  (solo DEV)
   ============================================================ */
/* ============================================================
   CALL CENTER (17/07/2026) — configuración de la app JHONNY CENTER
   ------------------------------------------------------------
   Dos piezas, las dos solo del DEV:
     · Usuarios → tarjeta "Usuarios de la App Call Center" (Nombre + PIN).
       Se guarda de a uno, al instante (igual que los del panel).
     · Call Center → días de activación, horario y quién entra cada día a
       qué líderes. Esto se edita en LOTE y se guarda con un botón: son
       datos que se cambian juntos y a medias no significan nada.
   El estado editable vive en CFCALL; CF.d.call es lo último confirmado por
   el servidor. Al guardar, el servidor devuelve el estado real y se repinta
   con eso (no con lo que uno cree que mandó).
   ============================================================ */
const CFCALL_DIAS = [
  ['LUNES', 'Lunes'], ['MARTES', 'Martes'], ['MIERCOLES', 'Miércoles'], ['JUEVES', 'Jueves'],
  ['VIERNES', 'Viernes'], ['SABADO', 'Sábado'], ['DOMINGO', 'Domingo']
];
const CFCALL_TODOS = 'TODOS', CFCALL_SIN = 'SIN';
let CFCALL = null;

function cfCallD() { return (CF.d && CF.d.call) || { usuarios: [], dias: [], lideres: [] }; }
function cfCallLabel(k) { const h = CFCALL_DIAS.filter(d => d[0] === k)[0]; return h ? h[1] : k; }
function cfCallNombre(id) { const u = cfCallD().usuarios.filter(x => x.id === id)[0]; return u ? u.nombre : '(usuario borrado)'; }

/* Copia profunda para editar sin tocar lo confirmado */
function cfCallCargar() {
  CFCALL = { dias: cfCallD().dias.map(d => ({ dia: d.dia, inicio: d.inicio, fin: d.fin, usuarios: (d.usuarios || []).map(u => ({ id: u.id, lideres: (u.lideres || []).slice() })) })) };
}

/* ---------- Tarjeta dentro de la pestaña Usuarios ---------- */
function cfCallUsuariosCard() {
  const us = cfCallD().usuarios;
  const filas = us.length ? `<ul class="cfg-list">${us.map(x => `
    <li class="cfg-row">
      <div class="cfg-av cfg-av-txt">${esc(String(x.nombre || '?').trim().charAt(0).toUpperCase())}</div>
      <div class="cfg-row-t">
        <b>${esc(x.nombre)}</b>
        <span class="cfg-row-s">PIN ${esc(x.pin || '····')}${x.creado ? ' · desde el ' + esc(String(x.creado).slice(0, 10)) : ''}</span>
      </div>
      <div class="cfg-row-a">
        ${x.estado === 'ACTIVO' ? '' : '<span class="cfg-pill">Inactivo</span>'}
        <button class="cc-ico" data-cu="${esc(x.id)}" title="Editar" aria-label="Editar">${I.pencil}</button>
        <button class="cc-ico cc-ico-danger" data-cudel="${esc(x.id)}" title="Eliminar" aria-label="Eliminar">${I.trash}</button>
      </div>
    </li>`).join('')}</ul>` : cfVacio('Todavía no hay usuarios del call center.');

  return cfCard('Usuarios de la App Call Center',
    'Entran a la app CENTER solo con el PIN. Qué día y a qué líderes trabajan se define en la pestaña Call Center.',
    filas + `<div class="cfg-actions"><button class="btn btn-quiet" id="cf-cu-add">${I.plus} Agregar usuario CENTER</button></div>`);
}

function cfCallUsuariosBind() {
  const b = $('#cf-cu-add'); if (b) b.onclick = () => cfCallUserSheet(null);
  $$('#cf-body [data-cu]').forEach(x => x.onclick = () => cfCallUserSheet(cfCallD().usuarios.filter(u => u.id === x.dataset.cu)[0]));
  $$('#cf-body [data-cudel]').forEach(x => x.onclick = () => cfCallUserBorrar(cfCallD().usuarios.filter(u => u.id === x.dataset.cudel)[0]));
}

function cfCallUserSheet(u) {
  openSheet(`<div class="grip"></div>
    <h2 class="h2">${u ? 'Editar usuario CENTER' : 'Nuevo usuario CENTER'}</h2>
    <p class="muted small">El PIN es su única credencial: no se puede repetir.</p>
    <div class="stack" style="margin-top:12px;">
      <div class="cfg-field full"><label>Nombre</label><input class="input" id="cu-nombre" value="${esc(u ? u.nombre : '')}" autocomplete="off" /></div>
      <div class="cfg-field full"><label>PIN (4 dígitos)</label>
        <input class="input" id="cu-pin" inputmode="numeric" maxlength="4" value="${esc(u ? u.pin : '')}" autocomplete="off" placeholder="${u ? 'Déjalo igual o escribe uno nuevo' : '4 dígitos'}" /></div>
      ${u ? cfSwitch('cu-activo', 'Usuario activo', u.estado === 'ACTIVO') : ''}
      <button class="btn btn-primary btn-block" id="cu-save">Guardar</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);

  const pin = $('#cu-pin');
  pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 4); });
  if (u) { const sw = $('#cu-activo'); sw.onclick = () => sw.classList.toggle('on'); }

  $('#cu-save').onclick = async e => {
    const nombre = ($('#cu-nombre').value || '').trim();
    const p = ($('#cu-pin').value || '').trim();
    if (!nombre) return toast('Falta el nombre', 'err');
    if (!u && p.length !== 4) return toast('El PIN es de 4 dígitos', 'err');
    if (p && p.length !== 4) return toast('El PIN es de 4 dígitos', 'err');
    const body = Object.assign(cfAuth(), { id: u ? u.id : '', nombre, pin: p, estado: (u && !$('#cu-activo').classList.contains('on')) ? 'INACTIVO' : 'ACTIVO' });
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgCallUsuario', {}, 'POST', body);
      saving(e.currentTarget, false);
      if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
      CF.d.call = r.call; CFCALL = null;
      closeLayer(); cfPintaUsuarios(); toast('Guardado', 'ok');
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };
}

async function cfCallUserBorrar(u) {
  if (!u) return;
  const enDias = cfCallD().dias.filter(d => (d.usuarios || []).some(x => x.id === u.id)).map(d => d.label);
  const ok = await confirmar('Eliminar a ' + u.nombre,
    `<div class="crow"><span>Usuario</span><b>${esc(u.nombre)}</b></div>
     <div class="crow"><span>PIN</span><b>${esc(u.pin)}</b></div>
     ${enDias.length ? `<div class="crow"><span>Turnos</span><b>Pierde el acceso de ${esc(enDias.join(', '))}</b></div>` : ''}
     <p class="muted small" style="margin-top:8px;">Lo ya marcado por esta persona en la base de datos NO se borra.</p>`);
  if (!ok) return;
  try {
    const r = await api('priv.cfgCallUsuarioEliminar', {}, 'POST', Object.assign(cfAuth(), { id: u.id }));
    if (!r.ok) return toast(r.msg || 'No se pudo eliminar', 'err');
    CF.d.call = r.call; CFCALL = null; cfPintaUsuarios(); toast('Eliminado', 'ok');
  } catch (e) { toast('Error de conexión', 'err'); }
}

/* ---------- Pestaña Call Center ---------- */
function cfCallResumenLideres(ls) {
  if (!ls || !ls.length) return '<span class="cc-warn">sin líderes</span>';
  const todos = ls.indexOf(CFCALL_TODOS) >= 0, sin = ls.indexOf(CFCALL_SIN) >= 0;
  const n = ls.filter(x => x !== CFCALL_TODOS && x !== CFCALL_SIN).length;
  const p = [];
  if (todos) p.push('Todos los líderes'); else if (n) p.push(n + ' líder' + (n === 1 ? '' : 'es'));
  if (sin) p.push('Sin líder');
  return esc(p.join(' · '));
}

function cfPintaCall() {
  if (!CFCALL) cfCallCargar();
  const us = cfCallD().usuarios.filter(u => u.estado === 'ACTIVO');

  const cuerpo = CFCALL.dias.length ? CFCALL.dias.map(d => `
    <div class="cc-dia" data-d="${esc(d.dia)}">
      <div class="cc-dia-h">
        <b>${esc(cfCallLabel(d.dia))}</b>
        <button class="cc-ico cc-ico-danger" data-ddel="${esc(d.dia)}" title="Quitar el día" aria-label="Quitar el día">${I.trash}</button>
      </div>
      <div class="cc-horas">
        <div class="cfg-field"><label>Hora de inicio</label><input class="input" type="time" data-hi="${esc(d.dia)}" value="${esc(d.inicio || '')}" /></div>
        <div class="cfg-field"><label>Hora de término</label><input class="input" type="time" data-hf="${esc(d.dia)}" value="${esc(d.fin || '')}" /></div>
      </div>
      ${d.usuarios.length ? `<ul class="cfg-list">${d.usuarios.map(u => `
        <li class="cfg-row">
          <div class="cfg-row-t">
            <b>${esc(cfCallNombre(u.id))}</b>
            <span class="cfg-row-s">${cfCallResumenLideres(u.lideres)}</span>
          </div>
          <div class="cfg-row-a">
            <button class="cc-ico" data-uld="${esc(d.dia)}" data-ulu="${esc(u.id)}" title="Líderes que trabajará" aria-label="Líderes que trabajará">${I.sliders}</button>
            <button class="cc-ico cc-ico-danger" data-udel="${esc(d.dia)}" data-uduu="${esc(u.id)}" title="Quitar del día" aria-label="Quitar del día">${I.x}</button>
          </div>
        </li>`).join('')}</ul>` : cfVacio('Nadie tiene acceso este día.')}
      <div class="cfg-actions"><button class="btn btn-quiet" data-uadd="${esc(d.dia)}">${I.plus} Agregar usuario</button></div>
    </div>`).join('') : cfVacio('Todavía no has agregado días de activación.');

  const aviso = !us.length ? `<p class="cfg-hint" style="margin-bottom:10px;">⚠ No hay usuarios CENTER activos. Créalos primero en la pestaña <b>Usuarios</b>.</p>` : '';

  $('#cf-body').innerHTML = cfCard('Días de Activación',
    'Los días que opera el call center, su horario y quién entra cada día. Fuera de esa franja el PIN no abre la app.',
    aviso + cuerpo + `<div class="cfg-actions"><button class="btn btn-quiet" id="cc-dia-add">${I.plus} Agregar día</button></div>`) +
    `<div class="cfg-actions"><button class="btn btn-primary" id="cc-save">Guardar configuración</button></div>`;

  $('#cc-dia-add').onclick = () => cfCallDiaAgregar();
  $$('#cf-body [data-ddel]').forEach(b => b.onclick = () => { CFCALL.dias = CFCALL.dias.filter(d => d.dia !== b.dataset.ddel); cfPintaCall(); });
  $$('#cf-body [data-hi]').forEach(i => i.onchange = () => { const d = CFCALL.dias.filter(x => x.dia === i.dataset.hi)[0]; if (d) d.inicio = i.value; });
  $$('#cf-body [data-hf]').forEach(i => i.onchange = () => { const d = CFCALL.dias.filter(x => x.dia === i.dataset.hf)[0]; if (d) d.fin = i.value; });
  $$('#cf-body [data-uadd]').forEach(b => b.onclick = () => cfCallUsuarioAgregar(b.dataset.uadd));
  $$('#cf-body [data-uld]').forEach(b => b.onclick = () => cfCallLideresSheet(b.dataset.uld, b.dataset.ulu));
  $$('#cf-body [data-udel]').forEach(b => b.onclick = () => {
    const d = CFCALL.dias.filter(x => x.dia === b.dataset.udel)[0];
    if (d) d.usuarios = d.usuarios.filter(u => u.id !== b.dataset.uduu);
    cfPintaCall();
  });
  $('#cc-save').onclick = e => cfCallGuardar(e.currentTarget);
}

function cfCallDiaAgregar() {
  const libres = CFCALL_DIAS.filter(d => !CFCALL.dias.some(x => x.dia === d[0]));
  if (!libres.length) return toast('Ya están los siete días', 'err');
  openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:12px;">Agregar día</h2>
    <div class="stack">${libres.map(d => `<button class="opt-row" data-v="${d[0]}">${d[1]}</button>`).join('')}
    <button class="btn btn-quiet btn-block" data-close>Cancelar</button></div>`);
  layer.querySelectorAll('.opt-row').forEach(b => b.onclick = () => {
    CFCALL.dias.push({ dia: b.dataset.v, inicio: '08:00', fin: '17:00', usuarios: [] });
    CFCALL.dias.sort((a, z) => CFCALL_DIAS.findIndex(d => d[0] === a.dia) - CFCALL_DIAS.findIndex(d => d[0] === z.dia));
    closeLayer(); cfPintaCall();
  });
}

function cfCallUsuarioAgregar(dia) {
  const d = CFCALL.dias.filter(x => x.dia === dia)[0]; if (!d) return;
  const libres = cfCallD().usuarios.filter(u => u.estado === 'ACTIVO' && !d.usuarios.some(x => x.id === u.id));
  if (!libres.length) return toast('No quedan usuarios CENTER activos por agregar a este día', 'err');
  openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:12px;">Agregar usuario · ${esc(cfCallLabel(dia))}</h2>
    <div class="stack">${libres.map(u => `<button class="opt-row" data-v="${esc(u.id)}">${esc(u.nombre)}</button>`).join('')}
    <button class="btn btn-quiet btn-block" data-close>Cancelar</button></div>`);
  layer.querySelectorAll('.opt-row').forEach(b => b.onclick = () => {
    d.usuarios.push({ id: b.dataset.v, lideres: [] });
    closeLayer(); cfPintaCall();
    cfCallLideresSheet(dia, b.dataset.v);   // sin líderes no vería nada: se pregunta de una
  });
}

/* Checks de líderes. "Todos" y "Sin líder" son opciones aparte:
   "Todos" = todos los líderes creados (hoy y los que se creen después);
   "Sin líder" = los registros que nadie refirió. Se pueden combinar. */
function cfCallLideresSheet(dia, idUsuario) {
  const d = CFCALL.dias.filter(x => x.dia === dia)[0]; if (!d) return;
  const u = d.usuarios.filter(x => x.id === idUsuario)[0]; if (!u) return;
  const lideres = cfCallD().lideres;
  const sel = {}; u.lideres.forEach(l => sel[l] = 1);

  openSheet(`<div class="grip"></div>
    <h2 class="h2">Líderes que trabajará</h2>
    <p class="muted small">${esc(cfCallNombre(idUsuario))} · ${esc(cfCallLabel(dia))}</p>
    <div class="stack" style="margin-top:12px;">
      <label class="check cc-chk"><input type="checkbox" data-l="${CFCALL_TODOS}" ${sel[CFCALL_TODOS] ? 'checked' : ''} /><span><b>Todos los líderes</b></span></label>
      <label class="check cc-chk"><input type="checkbox" data-l="${CFCALL_SIN}" ${sel[CFCALL_SIN] ? 'checked' : ''} /><span><b>Sin líder</b> <span class="muted">(registros que nadie refirió)</span></span></label>
      <input class="input" id="cc-q" placeholder="Buscar líder…" autocomplete="off" />
      <div class="cc-lista" id="cc-lista">
        ${lideres.map(l => `<label class="check cc-chk cc-l" data-s="${esc((l.nombre + ' ' + l.codigo).toLowerCase())}">
            <input type="checkbox" data-l="${esc(l.codigo)}" ${sel[l.codigo] ? 'checked' : ''} />
            <span>${esc(l.nombre)} <span class="muted">· N° ${esc(l.codigo)}</span></span></label>`).join('')}
      </div>
      <button class="btn btn-primary btn-block" id="cc-l-ok">Listo</button>
    </div>`);

  const todosChk = layer.querySelector('[data-l="' + CFCALL_TODOS + '"]');
  const marcaUno = () => layer.querySelectorAll('#cc-lista input').forEach(i => { i.disabled = todosChk.checked; });
  marcaUno(); todosChk.onchange = marcaUno;

  $('#cc-q').addEventListener('input', e => {
    const q = String(e.target.value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    layer.querySelectorAll('.cc-l').forEach(el => {
      const hay = el.dataset.s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
      el.style.display = hay ? '' : 'none';
    });
  });

  $('#cc-l-ok').onclick = () => {
    const out = [];
    layer.querySelectorAll('input[data-l]').forEach(i => { if (i.checked) out.push(i.dataset.l); });
    /* Con "Todos" marcado, los códigos sueltos sobran: se guardaría una lista
       que miente sobre lo que se ve. */
    u.lideres = out.indexOf(CFCALL_TODOS) >= 0 ? [CFCALL_TODOS].concat(out.indexOf(CFCALL_SIN) >= 0 ? [CFCALL_SIN] : []) : out;
    closeLayer(); cfPintaCall();
  };
}

async function cfCallGuardar(btn) {
  /* Se valida aquí lo mismo que valida el backend: así el error sale antes
     de gastar el viaje y dice exactamente qué día está mal. */
  for (const d of CFCALL.dias) {
    const L = cfCallLabel(d.dia);
    if (!d.inicio || !d.fin) return toast(L + ': faltan las horas', 'err');
    if (d.fin <= d.inicio) return toast(L + ': la hora de término debe ser mayor que la de inicio', 'err');
    if (!d.usuarios.length) return toast(L + ': no has agregado usuarios', 'err');
    for (const u of d.usuarios) if (!u.lideres.length) return toast(L + ' · ' + cfCallNombre(u.id) + ': no tiene líderes', 'err');
  }
  saving(btn, true);
  try {
    const r = await api('priv.cfgCallGuardar', {}, 'POST', Object.assign(cfAuth(), { dias: CFCALL.dias }));
    saving(btn, false);
    if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
    CF.d.call = r.call; cfCallCargar(); cfPintaCall(); toast('Configuración guardada', 'ok');
  } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
}

function cfPintaAvanzado() {
  const a = CF.d.avanzado, cfg = CF.d.cfg;
  const est = (ok2, si, no) => `<span class="cfg-est ${ok2 ? 'ok' : 'no'}">${ok2 ? I.check + ' ' + esc(si) : esc(no)}</span>`;

  const bot = cfCard('🔐 BuilderBot / API (solo DESARROLLADOR)',
    'El bot de WhatsApp que usan Líderes, Compromisos, Agenda y Servicios. Mismos nombres que en SEP-GROUP.',
    `<div class="cfg-estados">${est(a.bot.url, 'Endpoint configurado', 'Falta el endpoint')}${est(a.bot.apikey, 'API key guardada', 'FALTA la API key: sin ella el bot no envía')}</div>
     <div class="cfg-grid">
      ${cfField('cf-k-BB_API_URL', 'BB_API_URL', cfg.BB_API_URL, 'Endpoint POST. https://app.builderbot.cloud/api/v2/…/messages', true)}
      ${cfField('cf-k-BB_API_KEY', 'BB_API_KEY', cfg.BB_API_KEY, 'Se manda en el header x-api-builderbot.', true)}
      ${cfField('cf-k-BB_ENDPOINT_BASE', 'BB_ENDPOINT_BASE', cfg.BB_ENDPOINT_BASE, 'Base del API, sin la ruta.', true)}
      ${cfField('cf-k-BB_BOT_ID', 'BB_BOT_ID', cfg.BB_BOT_ID, '')}
      ${cfField('cf-k-BB_PROJECT_ID', 'BB_PROJECT_ID', cfg.BB_PROJECT_ID, '')}
      ${cfField('cf-k-BB_MANAGER_API', 'BB_MANAGER_API', cfg.BB_MANAGER_API, 'Llave del Manager API.', true)}
     </div>
     <div class="cfg-actions">
       <button class="btn btn-quiet" id="cf-bot-test">Probar envío</button>
       <button class="btn btn-primary" id="cf-bot-save">Guardar</button>
     </div>`);

  /* AJUSTE 23/07/2026 · aquí bajaron "Otros enlaces", "Imágenes y marca" y
     "Otros ajustes", que antes estaban en la pestaña General. Van como
     sub-bloques de esta misma tarjeta y los salva su botón Guardar. El cálculo
     de "otras" (claves de la hoja CONFIG que no tienen sitio propio) se hace
     aquí para que una clave nueva nunca quede invisible — ahora solo la ve el
     DESARROLLADOR. */
  const usadas = {};
  CF_GENERAL.concat(CF_DEV_GRUPOS).forEach(g => g.keys.forEach(k => usadas[k[0]] = 1));
  CF_APPS.forEach(x => usadas[x[0]] = 1);
  usadas[CF_COMPARTIR_KEY] = 1;
  CF_AGENDA_KEYS.forEach(k => usadas[k] = 1);
  CF_CASA_KEYS.concat(CF_EM_KEYS, CF_AV_KEYS, CF_INICIO_KEYS, CF_OCULTAS).forEach(k => usadas[k] = 1);
  (CF.d.plantillas || []).forEach(p => usadas[p.clave] = 1);
  const otras = Object.keys(cfg).filter(k => !usadas[k]).sort();

  const infraSub = CF_DEV_GRUPOS.map(g => `
     <div class="cfg-sub">
       <h4 class="cfg-sub-h">${esc(g.titulo)}</h4>
       ${g.sub ? `<p class="cfg-hint">${esc(g.sub)}</p>` : ''}
       <div class="cfg-grid">${g.keys.map(k => cfField('cf-k-' + k[0], k[1], cfg[k[0]], k[2], true)).join('')}</div>
     </div>`).join('') + (otras.length ? `
     <div class="cfg-sub">
       <h4 class="cfg-sub-h">Otros ajustes</h4>
       <p class="cfg-hint">Claves de la hoja CONFIG que no tienen un sitio propio.</p>
       <div class="cfg-grid">${otras.map(k => cfField('cf-k-' + k, k, cfg[k], (CF.d.meta[k] || {}).descripcion, true)).join('')}</div>
     </div>` : '');

  const infra = cfCard('Infraestructura', 'Solo el desarrollador ve esto.',
    `<div class="cfg-estados">${est(a.firebase.cuentaServicio, 'Firebase: cuenta de servicio puesta', 'Firebase: falta la cuenta de servicio (los push no salen)')}</div>
     <p class="cfg-hint">La cuenta de servicio de Firebase vive en las Propiedades del Script, no en la hoja. No se puede ver ni editar desde aquí.</p>
     <div class="cfg-grid">
      ${cfField('cf-k-DRIVE_QR_FOLDER', 'Carpeta Drive · QR', cfg.DRIVE_QR_FOLDER, '', true)}
      ${cfField('cf-k-DRIVE_CASA_FOLDER', 'Carpeta Drive · Casa social', cfg.DRIVE_CASA_FOLDER, 'La crea setupModulo9().', true)}
      ${cfField('cf-k-DRIVE_INICIO_FOLDER', 'Carpeta Drive · Inicio', cfg.DRIVE_INICIO_FOLDER, 'La crea setupModulo91().', true)}
      ${cfField('cf-k-CAL_EVENTOS', 'Calendario · Eventos', cfg.CAL_EVENTOS, '', true)}
      ${cfField('cf-k-CAL_AGENDA', 'Calendario · Agenda', cfg.CAL_AGENDA, '', true)}
     </div>
     ${infraSub}
     <div class="cfg-hint" style="margin-top:10px;">Hoja de cálculo: <code>${esc(a.spreadsheetId)}</code></div>
     <div class="cfg-actions"><button class="btn btn-primary" id="cf-inf-save">Guardar</button></div>`);

  const elim = cfCard('🗑️ Clave de eliminación',
    'Clave de 6 dígitos que se pide para ELIMINAR un registro en Base de Datos → Detalles → Eliminar. Solo el desarrollador la ve y la edita. Déjala vacía para bloquear la eliminación.',
    `<div class="cfg-grid">
      ${cfField('cf-k-CLAVE_ELIMINACION', 'Clave de eliminación', cfg.CLAVE_ELIMINACION, '6 dígitos numéricos.', true)}
     </div>
     <div class="cfg-actions"><button class="btn btn-primary" id="cf-elim-save">Guardar</button></div>`);

  $('#cf-body').innerHTML = cfEleccionCard() + bot + infra + elim;
  const elimInp = $('#cf-k-CLAVE_ELIMINACION');
  if (elimInp) { elimInp.setAttribute('inputmode', 'numeric'); elimInp.setAttribute('maxlength', '6'); onlyDigits(elimInp); }
  $('#cf-elim-save').onclick = async e => {
    const v = String((elimInp && elimInp.value) || '').replace(/\D/g, '');
    if (v && !/^\d{6}$/.test(v)) return toast('La clave debe ser de 6 dígitos (o vacía para bloquear)', 'err');
    const btn = e.currentTarget; saving(btn, true);
    try {
      const r = await api('priv.cfgGuardar', {}, 'POST', Object.assign(cfAuth(), { cambios: { CLAVE_ELIMINACION: v } }));
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
      CF.d.cfg.CLAVE_ELIMINACION = v;
      toast(v ? 'Clave guardada' : 'Clave borrada: eliminación bloqueada', 'ok');
    } catch (err) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
  $('#cf-bot-save').onclick = e => cfGuardarClaves(e.currentTarget,
    ['BB_API_URL', 'BB_API_KEY', 'BB_ENDPOINT_BASE', 'BB_BOT_ID', 'BB_PROJECT_ID', 'BB_MANAGER_API']);
  $('#cf-inf-save').onclick = e => cfGuardarClaves(e.currentTarget,
    ['DRIVE_QR_FOLDER', 'DRIVE_CASA_FOLDER', 'DRIVE_INICIO_FOLDER', 'CAL_EVENTOS', 'CAL_AGENDA']
      .concat(CF_DEV_GRUPOS.reduce((acc, g) => acc.concat(g.keys.map(k => k[0])), []), otras));
  $('#cf-bot-test').onclick = () => cfBotProbar();
  cfEleccionBind();
}

/* ---------- ELECCIONES (17/07/2026) ----------
   El día y las horas que alimentan los dos conteos regresivos. La fecha usa
   la MISMA rueda iOS de Agenda/Eventos, con dos diferencias necesarias: mira
   HACIA ADELANTE (de este año hasta +10) y no tiene tope de "hoy" al revés.
   Las horas usan el mismo <input type="time"> de Agenda.
   NO bloquea el registro de votos: es solo información. */
const CF_ELEC_ANIOS = 10;
function cfEleccionCard() {
  const cfg = CF.d.cfg;
  const hoy = new Date().getFullYear();
  return cfCard('🗳️ Elecciones', 'El día y las horas de la votación. De aquí salen el conteo regresivo del Simulador y el de la vista Votación. No bloquea nada: los votos se pueden registrar cuando sea (pruebas).',
    `<div class="cfg-grid">
       <div class="cfg-field full">
         ${campoFecha('cf-elec-fecha', 'Día de las elecciones', { anios: true, anioMin: hoy, anioMax: hoy + CF_ELEC_ANIOS })}
         <div class="cfg-hint">Empieza y termina el mismo día.</div>
       </div>
       <div class="cfg-field"><label>Hora de inicio</label>
         <input class="input" id="cf-elec-ini" type="time" value="${esc(cfg.ELECCION_HORA_INICIO || '')}" /></div>
       <div class="cfg-field"><label>Hora de finalización</label>
         <input class="input" id="cf-elec-fin" type="time" value="${esc(cfg.ELECCION_HORA_FIN || '')}" /></div>
     </div>
     <div class="cfg-actions">
       <button class="btn btn-quiet cfg-danger" id="cf-elec-clr">Borrar fecha</button>
       <button class="btn btn-primary" id="cf-elec-save">Guardar</button>
     </div>`);
}

function cfEleccionBind() {
  const f = $('#cf-elec-fecha');
  if (!f) return;
  /* CONFIG guarda dd/MM/yyyy (como toda fecha del proyecto); la rueda habla
     ISO. Se traduce en los dos sentidos aquí y en ningún otro lado. */
  f.value = ddmmToInput(CF.d.cfg.ELECCION_FECHA || '');
  bindCampoFecha('cf-elec-fecha');
  $('#cf-elec-clr').onclick = () => { f.value = ''; fechaSync('cf-elec-fecha'); };
  $('#cf-elec-save').onclick = async e => {
    const btn = e.currentTarget;
    const cambios = {
      ELECCION_FECHA: inputToDDMM(f.value),
      ELECCION_HORA_INICIO: val('cf-elec-ini'),
      ELECCION_HORA_FIN: val('cf-elec-fin')
    };
    saving(btn, true);
    try {
      const r = await api('priv.cfgGuardar', {}, 'POST', Object.assign(cfAuth(), { cambios }));
      saving(btn, false);
      if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
      Object.assign(CF.d.cfg, cambios);
      toast(cambios.ELECCION_FECHA ? 'Guardado' : 'Fecha borrada: los conteos quedan en ceros', 'ok');
    } catch (err) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}

function cfBotProbar() {
  openSheet(`<div class="grip"></div>
    <h2 class="h2">Probar el bot</h2>
    <p class="small muted" style="margin-top:6px;">Se manda un WhatsApp de prueba. Guarda los cambios antes de probar.</p>
    <div class="stack" style="margin-top:14px;">
      ${field('Número', inputEl('cf-bot-n', 'inputmode="numeric" maxlength="10" placeholder="10 dígitos"'))}
      <button class="btn btn-primary btn-block" id="cf-bot-go">Enviar prueba</button>
      <button class="btn btn-quiet btn-block" data-close>Cancelar</button>
    </div>`);
  onlyDigits($('#cf-bot-n'));
  $('#cf-bot-go').onclick = async e => {
    saving(e.currentTarget, true);
    try {
      const r = await api('priv.cfgBotProbar', {}, 'POST', Object.assign(cfAuth(), { numero: val('cf-bot-n') }));
      saving(e.currentTarget, false);
      toast(r.msg || (r.ok ? 'Enviado' : 'No se pudo'), r.ok ? 'ok' : 'err');
      if (r.ok) closeLayer();
    } catch (err) { saving(e.currentTarget, false); toast('Error de conexión', 'err'); }
  };
}

/* ============================================================
   MÓDULO 10 · MI BOT  (control del bot de WhatsApp)
   ------------------------------------------------------------
   Lo mismo que el "Mi Bot" de SEP-GROUP, adaptado a esta app: estado de la
   conexión, QR para vincular, reiniciar, silenciar, eliminar sesión, y por
   contacto bloquear/desbloquear/limpiar. Dos diferencias a propósito:
     • ACCESO: aquí lo usan TODOS los roles (DEV, ADMIN y SEDE) — el rol SEDE
       existe justo para que la casa social reconecte el bot sin llamar a nadie.
       En SEP-GROUP está reservado a SUPERUSUARIO/DESARROLLADOR.
     • LISTA DE BLOQUEADOS: aquí se MUESTRA. SEP-GROUP tiene el endpoint pero su
       vista nunca lo llama, así que allá se bloquea a ciegas.
   NO hay difusión masiva: mandar en lote por un WhatsApp personal es la vía
   rápida al baneo del número. Los envíos siguen siendo 1:1 desde cada módulo.
   Las llaves NUNCA llegan aquí: todo el fetch a BuilderBot lo hace el CORE.
   Prefijo CSS: bot-
   ============================================================ */
const MB = { user: null, silenciado: false, poll: null, cargando: false };

function mbAuth() { return { caller: MB.user ? MB.user.documento : '' }; }

async function viewMiBot(user) {
  MB.user = user;
  mbPollStop();
  appWide(true);   /* AJUSTES 16/07: en PC las tarjetas se reparten a 2 columnas */
  app.innerHTML = `${backbar('Mi Bot')}
    <div class="pad stack">
      <div>
        <p class="eyebrow">Tu asistente de WhatsApp</p>
        <h1 class="h1">Mi Bot</h1>
      </div>
      <div id="bot-status" class="bot-status bot-unknown">
        <div class="bot-status-ico"><span class="spinner spinner-brand"></span></div>
        <div class="bot-status-tx"><b>Consultando el estado…</b><span>Un momento</span></div>
      </div>
      <div id="bot-body" class="bot-body">${loadingBox('Cargando…')}</div>
    </div>`;
  app.hidden = false; hideSplash();
  /* Si el usuario se va con el QR abierto, el intervalo debe morir. Se usa el
     mismo gancho que ya tiene la app para la vista de Votación. */
  window.__votoTeardown = mbPollStop;
  $('#backbtn').onclick = () => { mbPollStop(); window.__votoTeardown = null; go('home'); };
  mbPintaCuerpo();
  await mbEstado();
}

/* ---------- Estado ---------- */
async function mbEstado(silencioso) {
  const box = $('#bot-status'); if (!box) return;
  try {
    const r = await api('priv.botEstado', {}, 'POST', mbAuth());
    if (!r) return;
    MB.silenciado = !!r.silenciado;
    const lbl = $('#bot-mute-lbl'); if (lbl) lbl.textContent = MB.silenciado ? 'Activar' : 'Silenciar';

    if (r.configurado === false) {
      const faltan = (r.faltantes || []).join(', ');
      mbPintaEstado('bot-unknown', '⚙️', 'El bot no está configurado',
        faltan ? `Faltan las llaves: ${faltan}. Se cargan en Configuración → Avanzado.`
               : 'El desarrollador debe cargar las llaves en Configuración → Avanzado.');
      return;
    }
    const st = String(r.status || 'UNKNOWN').toUpperCase();
    if (st === 'ONLINE') mbPintaEstado('bot-online', '🟢', 'Tu bot está conectado', 'Funcionando y respondiendo mensajes.');
    else if (st === 'READY_TO_SCAN') mbPintaEstado('bot-scan', '🟡', 'Esperando que escanees el QR', 'Genera el código aquí abajo y escanéalo.');
    else if (st === 'OFFLINE' || st === 'FAILED') mbPintaEstado('bot-offline', '🔴', 'Tu bot está desconectado', 'Genera el QR para reconectarlo.');
    else mbPintaEstado('bot-unknown', '⚪', `Estado: ${esc(st)}`, 'Toca Actualizar para reintentar.');
  } catch (e) {
    if (!silencioso) mbPintaEstado('bot-unknown', '⚪', 'No se pudo consultar', 'Revisa tu conexión y toca Actualizar.');
  }
}
function mbPintaEstado(cls, ico, titulo, sub) {
  const box = $('#bot-status'); if (!box) return;
  box.className = 'bot-status ' + cls;
  box.innerHTML = `<div class="bot-status-ico">${ico}</div>
    <div class="bot-status-tx"><b>${esc(titulo)}</b><span>${esc(sub)}</span></div>
    <button class="icon-btn" id="bot-refresh" title="Actualizar">${I.reload}</button>`;
  const rf = $('#bot-refresh'); if (rf) rf.onclick = () => mbEstado();
}

/* ---------- Cuerpo: las 3 secciones ---------- */
function mbPintaCuerpo() {
  $('#bot-body').innerHTML = `
    <div class="bot-card">
      <h3 class="bot-card-t">📱 Conectar WhatsApp</h3>
      <p class="bot-card-s">Escanea el código desde WhatsApp → Dispositivos vinculados. Si el bot ya estuvo vinculado, <b>elimina primero la sesión</b> aquí abajo: escanear encima de una sesión vieja deja la vinculación en bucle.</p>
      <button class="btn btn-primary btn-block" id="bot-qr-btn">⚡ Inicializar conexión</button>
      <div id="bot-qr-box" class="bot-qr-box"></div>
    </div>

    <div class="bot-card">
      <h3 class="bot-card-t">🛠 Controles del bot</h3>
      <div class="bot-grid">
        <button class="bot-act" id="bot-reboot"><span class="bot-act-i">🔄</span>Reiniciar</button>
        <button class="bot-act" id="bot-mute"><span class="bot-act-i">🔇</span><span id="bot-mute-lbl">Silenciar</span></button>
      </div>
      <button class="bot-act bot-act-danger bot-act-full" id="bot-logout"><span class="bot-act-i">🗑️</span>Eliminar sesión</button>
    </div>

    <div class="bot-card">
      <h3 class="bot-card-t">👤 Gestionar un contacto</h3>
      <p class="bot-card-s">Escribe el número con código de país (ej. 573001234567).</p>
      <input id="bot-num" class="input" inputmode="numeric" placeholder="573001234567" />
      <div class="bot-grid" style="margin-top:10px;">
        <button class="bot-act" id="bot-block"><span class="bot-act-i">🚫</span>Bloquear</button>
        <button class="bot-act" id="bot-unblock"><span class="bot-act-i">✅</span>Desbloquear</button>
      </div>
      <button class="bot-act bot-act-full" id="bot-clear"><span class="bot-act-i">🧹</span>Limpiar conversación</button>
    </div>

    <div class="bot-card">
      <h3 class="bot-card-t">🚫 Números bloqueados</h3>
      <p class="bot-card-s">A estos el bot no les responde.</p>
      <div id="bot-bl">${loadingBox('Cargando…')}</div>
    </div>`;

  $('#bot-qr-btn').onclick = mbQR;
  $('#bot-reboot').onclick = mbReiniciar;
  $('#bot-mute').onclick = mbMute;
  $('#bot-logout').onclick = mbEliminarSesion;
  $('#bot-block').onclick = () => mbContacto('priv.botBloquear', 'Bloquear número', 'El bot dejará de responderle.');
  $('#bot-unblock').onclick = () => mbContacto('priv.botDesbloquear', 'Desbloquear número', 'El bot volverá a responderle.');
  $('#bot-clear').onclick = () => mbContacto('priv.botLimpiar', 'Limpiar conversación', 'Se borra el historial de esa conversación en el bot.');
  $('#bot-num').oninput = e => { e.target.value = e.target.value.replace(/\D/g, ''); };
  mbBlacklist();
}

/* ---------- QR ---------- */
async function mbQR() {
  const box = $('#bot-qr-box'), btn = $('#bot-qr-btn');
  saving(btn, true);
  box.innerHTML = loadingBox('Preparando la conexión… si el bot estaba apagado puede tardar unos segundos.');
  try {
    const r = await api('priv.botQR', {}, 'POST', mbAuth());
    saving(btn, false);
    const qr = r && r.qr ? String(r.qr) : '';
    if (!qr) {
      btn.textContent = '📲 Generar QR';
      box.innerHTML = `<p class="small muted center">${esc((r && r.error) || 'Conexión inicializada. Toca Generar QR para ver el código.')}</p>`;
      return;
    }
    const src = qr.indexOf('data:') === 0 ? qr : (/^https?:\/\//.test(qr) ? qr : 'data:image/png;base64,' + qr);
    box.innerHTML = `<img class="bot-qr" id="bot-qr-img" src="${esc(src)}" alt="Código QR de WhatsApp" />
      <p class="small muted center">Escanéalo desde WhatsApp → <b>Dispositivos vinculados</b>. El código se renueva cada cierto tiempo.</p>
      <button class="bot-act bot-act-full" id="bot-qr-regen"><span class="bot-act-i">🔄</span>Regenerar QR</button>`;
    btn.textContent = '📲 Generar QR';
    $('#bot-qr-regen').onclick = mbQR;
    mbPollStart();
  } catch (e) {
    saving(btn, false);
    box.innerHTML = `<p class="small muted center">No se pudo generar el QR. Revisa tu conexión.</p>`;
  }
}

/* Mientras el QR está en pantalla, se revisa el estado cada 60s. Al conectar,
   se detiene y se marca el QR como usado. */
function mbPollStart() {
  mbPollStop();
  MB.poll = setInterval(async () => {
    const img = $('#bot-qr-img');
    if (!img) return mbPollStop();
    await mbEstado(true);
    const st = $('#bot-status');
    if (st && st.classList.contains('bot-online')) {
      mbPollStop();
      img.classList.add('bot-qr-ok');
      if (!$('#bot-qr-msg')) img.insertAdjacentHTML('afterend',
        `<div class="bot-qr-done" id="bot-qr-msg">🟢 <b>WhatsApp conectado</b><br><span class="small">Ya puedes salir de esta vista.</span></div>`);
      mbBlacklist();
    }
  }, 60000);
}
function mbPollStop() { if (MB.poll) { clearInterval(MB.poll); MB.poll = null; } }

/* ---------- Controles ---------- */
async function mbReiniciar() {
  if (!await confirmar('¿Reiniciar el bot?', crow('Qué pasa', 'Se reinicia y tarda unos segundos') + crow('La sesión de WhatsApp', 'NO se pierde'))) return;
  const b = $('#bot-reboot'); saving(b, true);
  try {
    const r = await api('priv.botReiniciar', {}, 'POST', mbAuth());
    saving(b, false);
    toast(r.msg || (r.ok ? 'Bot reiniciado' : 'No se confirmó'), r.ok ? 'ok' : 'err');
    setTimeout(() => mbEstado(), 2500);
  } catch (e) { saving(b, false); toast('Error de conexión', 'err'); }
}

async function mbMute() {
  const nuevo = !MB.silenciado;
  const ok = await confirmar(nuevo ? '¿Silenciar el bot?' : '¿Activar el bot?',
    nuevo ? crow('Qué pasa', 'Deja de responder mensajes') + crow('Se revierte', 'Sí, cuando quieras')
          : crow('Qué pasa', 'Vuelve a responder mensajes'));
  if (!ok) return;
  const b = $('#bot-mute'); saving(b, true);
  try {
    const r = await api('priv.botMute', {}, 'POST', Object.assign(mbAuth(), { flag: nuevo }));
    saving(b, false);
    if (r.ok) {
      MB.silenciado = nuevo;
      const l = $('#bot-mute-lbl'); if (l) l.textContent = nuevo ? 'Activar' : 'Silenciar';
    }
    toast(r.msg || 'Listo', r.ok ? 'ok' : 'err');
  } catch (e) { saving(b, false); toast('Error de conexión', 'err'); }
}

async function mbEliminarSesion() {
  const ok = await confirmar('¿Eliminar la sesión de WhatsApp?',
    crow('Qué pasa', 'El bot se desconecta') +
    crow('Para volver', 'Hay que escanear un QR nuevo') +
    crow('Mientras tanto', 'El bot NO responde a nadie'));
  if (!ok) return;
  const b = $('#bot-logout'); saving(b, true);
  try {
    const r = await api('priv.botEliminarSesion', {}, 'POST', mbAuth());
    saving(b, false);
    toast(r.msg || 'Listo', r.ok ? 'ok' : 'err');
    setTimeout(() => mbEstado(), 2500);
  } catch (e) { saving(b, false); toast('Error de conexión', 'err'); }
}

/* ---------- Por contacto ---------- */
async function mbContacto(accion, titulo, queHace) {
  const num = String($('#bot-num').value || '').replace(/\D/g, '');
  if (num.length < 8) return toast('Escribe el número con código de país (ej. 573001234567)', 'err');
  if (!await confirmar(titulo + '?', crow('Número', num) + crow('Qué pasa', queHace))) return;
  try {
    const r = await api(accion, {}, 'POST', Object.assign(mbAuth(), { numero: num }));
    toast(r.msg || 'Listo', r.ok ? 'ok' : 'err');
    if (r.ok && accion !== 'priv.botLimpiar') { $('#bot-num').value = ''; mbBlacklist(); }
  } catch (e) { toast('Error de conexión', 'err'); }
}

/* ---------- Lista de bloqueados ---------- */
async function mbBlacklist() {
  const box = $('#bot-bl'); if (!box) return;
  try {
    const r = await api('priv.botBlacklist', {}, 'POST', mbAuth());
    if (!r || r.configurado === false) { box.innerHTML = `<p class="small muted">Se ve cuando el bot esté configurado.</p>`; return; }
    const ph = r.phones || [];
    if (!ph.length) { box.innerHTML = `<p class="small muted">No hay ningún número bloqueado.</p>`; return; }
    box.innerHTML = `<ul class="bot-bl">${ph.map(n => `<li class="bot-bl-row">
        <span class="bot-bl-n">${esc(n)}</span>
        <button class="bd-btn" data-unb="${esc(n)}" title="Desbloquear">${I.check}</button>
      </li>`).join('')}</ul>`;
    $$('#bot-bl [data-unb]').forEach(b => b.onclick = async () => {
      const n = b.dataset.unb;
      if (!await confirmar('¿Desbloquear ' + n + '?', crow('Qué pasa', 'El bot vuelve a responderle'))) return;
      try {
        const r2 = await api('priv.botDesbloquear', {}, 'POST', Object.assign(mbAuth(), { numero: n }));
        toast(r2.msg || 'Listo', r2.ok ? 'ok' : 'err');
        if (r2.ok) mbBlacklist();
      } catch (e) { toast('Error de conexión', 'err'); }
    });
  } catch (e) { box.innerHTML = `<p class="small muted">No se pudo cargar la lista.</p>`; }
}

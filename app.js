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
async function api(action, params = {}, method = 'GET', body = null) {
  if (API_URL.startsWith('PEGA_AQUI')) { toast('Falta configurar la URL del backend', 'err'); throw new Error('API_URL sin configurar'); }
  const qs = new URLSearchParams(Object.assign({ action }, params)).toString();
  const opts = { method };
  if (method === 'POST') { opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' }; opts.body = JSON.stringify(body || {}); }
  loaderOn();
  try {
    const res = await fetch(`${API_URL}?${qs}`, opts);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error del servidor');
    return json.data;
  } finally { loaderOff(); }
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
window.addEventListener('appinstalled', () => { markInstalled(); deferredPrompt = null; toast('¡App instalada!', 'ok'); });

function updateInstallSection() {
  const and = $('#install-android'), ios = $('#install-ios'); if (!and || !ios) return;
  and.classList.add('hidden'); ios.classList.add('hidden');
  if (isIOS()) { ios.classList.remove('hidden'); return; }
  and.classList.remove('hidden');
  const b = $('#btn-install'), man = $('#install-manual');
  if (deferredPrompt) { if (b) b.style.display = ''; if (man) man.classList.add('hidden'); }
  else { if (b) b.style.display = 'none'; if (man) man.classList.remove('hidden'); }
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

/* Entrada manual a la vista Instalar desde el login (ver nota en la app pública:
   una vez instalada, el gate del arranque no vuelve a mostrarla nunca). */
function linkInstalar() { return `<button class="link-quiet" id="btn-ir-instalar">📲 Instalar la app</button>`; }
document.addEventListener('click', (e) => {
  const b = e.target && e.target.closest ? e.target.closest('#btn-ir-instalar') : null;
  if (b) { try { sessionStorage.removeItem('continuedWeb'); } catch {} go('instalar'); }
});

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
const READY = new Set(['bd', 'lideres', 'eventos', 'agenda', 'compromisos', 'notificaciones']);
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
  const route = (location.hash.replace(/^#\//, '') || '').split('?')[0];
  const user = getActive();
  appWide(false); // ancho normal por defecto; las vistas de grid lo reactivan
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
    case 'notificaciones': return viewNotificaciones(user);
    default: return viewHome(user);
  }
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

      <div id="install-android" class="hidden" style="margin-top:16px;">
        <button id="btn-install" class="btn btn-primary btn-block" style="display:none;">📲 Instalar aplicación</button>
        <div id="install-manual" class="hidden ios-steps-wrap">
          <p class="small" style="text-align:left;color:var(--muted);">Para instalarla en tu equipo:</p>
          <ol class="ios-steps">
            <li>Abre el menú <b>⋮</b> del navegador (arriba a la derecha).</li>
            <li>Elige <b>“Instalar aplicación”</b> o <b>“Añadir a la pantalla de inicio”</b>.</li>
            <li>Confirma con <b>“Instalar”</b>.</li>
          </ol>
        </div>
        <button id="btn-cont-web" class="btn btn-ghost btn-block" style="margin-top:10px;">🌐 Continuar en el navegador</button>
      </div>
      <div id="install-ios" class="hidden" style="margin-top:16px;">
        <p class="small" style="text-align:left;color:var(--muted);">En tu iPhone o iPad:</p>
        <ol class="ios-steps"><li>Pulsa <b>Compartir</b> en Safari.</li><li>Elige <b>“Añadir a pantalla de inicio”</b>.</li><li>Pulsa <b>“Añadir”</b>.</li></ol>
        <button id="btn-cont-web-ios" class="btn btn-ghost btn-block" style="margin-top:8px;">🌐 Continuar en el navegador</button>
      </div>

      ${footBrand()}
    </div></div>`;
  app.hidden = false; hideSplash(); paintVersion(APP_VERSION_LOADED || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''));
  updateInstallSection();
  const cont = () => { sessionStorage.setItem('continuedWeb', '1'); go('login'); };
  const bi = $('#btn-install');
  if (bi) bi.onclick = async () => {
    if (!deferredPrompt) { toast('La instalación aún no está disponible. Usa el menú del navegador.'); return; }
    const dp = deferredPrompt; dp.prompt(); try { await dp.userChoice; } catch {} deferredPrompt = null; updateInstallSection();
  };
  const cw = $('#btn-cont-web'); if (cw) cw.onclick = cont;
  const cwi = $('#btn-cont-web-ios'); if (cwi) cwi.onclick = cont;
}

/* ============================================================
   LOGIN  (réplica de la referencia pública: PIN pad primero,
   Documento como alterna en DOS pasos — nunca documento+PIN juntos)
   El PIN se valida contra USUARIOS (priv.login). Longitud configurable.
   ============================================================ */
const PRIV_PIN_LEN = 4; // longitud del PIN de USUARIOS: el pad auto-envía al completarla. Si tu PIN tiene otra longitud, cámbiala aquí (o usa el botón Entrar).
let pinBuffer = '';     // dígitos tecleados en el pad
let pinDocSel = '';     // documento de la cuenta elegida para el pad
let loginMode = 'pin';  // 'pin' | 'doc' — un solo método visible a la vez
let docStep = 1;        // método Documento: 1=documento · 2=PIN
let docBuffer = '';     // documento capturado en el paso 1

function viewLogin() {
  const sesiones = getSessions();
  // Sin cuentas guardadas el pad no tiene contra qué resolver → arranca en Documento.
  loginMode = sesiones.length ? 'pin' : 'doc';
  pinBuffer = ''; docStep = 1; docBuffer = '';
  pinDocSel = sesiones.length ? (getActive()?.documento || sesiones[0].documento) : '';
  renderLogin();
}

function renderLogin() {
  app.innerHTML = `
    <div class="login-wrap"><div class="login-card">
      <img class="login-logo" src="${APP_ICON}" alt="Jhonny Perdomo" />
      <h1 class="login-title">Panel privado</h1>
      <p class="login-sub">Acceso del equipo · Jhonny Perdomo</p>
      <div id="login-body"></div>
      ${linkInstalar()}
      ${footBrand()}
    </div></div>`;
  app.hidden = false; hideSplash(); paintVersion(APP_VERSION_LOADED || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''));
  if (loginMode === 'pin') renderLoginPin(); else renderLoginDoc();
}

/* ---- Método PIN rápido (pad de puntos + teclado, como la referencia) ---- */
function renderLoginPin() {
  const sesiones = getSessions();
  if (!sesiones.length) { loginMode = 'doc'; return renderLoginDoc(); }
  const sel = sesiones.find(s => s.documento === pinDocSel) || sesiones[0];
  pinDocSel = sel.documento;
  $('#login-body').innerHTML = `
    ${sesiones.length > 1 ? `
      <p class="eyebrow" style="margin:14px 0 6px;">Cuenta de este equipo</p>
      <div class="acc-row" id="acc-row">
        ${sesiones.map(s => `<button class="acc-mini ${s.documento === pinDocSel ? 'sel' : ''}" data-doc="${esc(s.documento)}" title="${esc(s.nombre)}">
            <span class="av">${esc(iniciales(s.nombre))}</span><span class="acc-mini-name">${esc(primerNombre(s.nombre))}</span>
            <span class="acc-x" data-forget="${esc(s.documento)}" title="Quitar de este equipo">${I.x}</span>
          </button>`).join('')}
      </div>` : `
      <div class="acc-solo">
        <span class="av">${esc(iniciales(sel.nombre))}</span>
        <div><b>${esc(sel.nombre)}</b><span class="small muted">${esc(rolLabel(sel.rol))}</span></div>
      </div>`}
    <p class="pin-hint" id="pin-hint">Ingresa tu PIN de acceso</p>
    <div class="pin-pad" id="pin-pad">${pinDotsHtml()}</div>
    <div class="pin-keypad">
      ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pin-key" data-key="${n}">${n}</button>`).join('')}
      <button class="pin-key action" data-key="clear">Borrar</button>
      <button class="pin-key" data-key="0">0</button>
      <button class="pin-key action" data-key="back">⌫</button>
    </div>
    <button class="btn btn-primary btn-block" id="pin-enter" style="margin-top:4px;">${I.lock} Entrar</button>
    <button class="btn btn-quiet btn-block" id="to-doc" style="margin-top:8px;">Entrar con documento</button>`;
  paintPin();
  $$('#acc-row .acc-mini').forEach(c => c.onclick = (ev) => {
    const fx = ev.target.closest('.acc-x');
    if (fx) { forgetSession(fx.dataset.forget); return viewLogin(); }
    pinDocSel = c.dataset.doc; pinBuffer = '';
    $$('#acc-row .acc-mini').forEach(x => x.classList.toggle('sel', x.dataset.doc === pinDocSel));
    paintPin();
  });
  $$('.pin-key').forEach(k => k.onclick = () => onPinKey(k.dataset.key));
  $('#pin-enter').onclick = () => submitPin();
  $('#to-doc').onclick = () => { loginMode = 'doc'; docStep = 1; renderLogin(); };
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
  if (!pinDocSel) return toast('Elige una cuenta', 'err');
  if (pinBuffer.length < 3) return toast('Ingresa tu PIN', 'err');
  loginCon(pinDocSel, pinBuffer, $('#pin-enter'));
}

/* ---- Método Documento (dos pasos: documento → luego PIN) ---- */
function renderLoginDoc() {
  const sesiones = getSessions();
  const body = $('#login-body');
  if (docStep === 1) {
    body.innerHTML = `
      <label class="field" style="margin-top:16px;"><span>Número de documento</span>
        <input class="input" id="login-doc" inputmode="numeric" placeholder="Sin puntos ni espacios" autocomplete="off" /></label>
      <button class="btn btn-primary btn-block" id="doc-next" style="margin-top:8px;">Continuar</button>
      ${sesiones.length ? `<button class="btn btn-quiet btn-block" id="to-pin" style="margin-top:8px;">Usar PIN rápido</button>` : ''}`;
    const doc = $('#login-doc'); onlyDigits(doc); doc.focus();
    doc.addEventListener('keydown', e => { if (e.key === 'Enter') $('#doc-next').click(); });
    $('#doc-next').onclick = () => {
      const d = onlyDig(doc.value);
      if (!/^\d{5,10}$/.test(d)) return toast('Documento inválido', 'err');
      docBuffer = d; docStep = 2; renderLoginDoc();
    };
    const tp = $('#to-pin'); if (tp) tp.onclick = () => { loginMode = 'pin'; pinBuffer = ''; renderLogin(); };
  } else {
    body.innerHTML = `
      <div class="acc-solo" style="margin-top:14px;"><span class="av">CC</span><div><b>${esc(docBuffer)}</b><span class="small muted">Ingresa tu PIN</span></div></div>
      <label class="field"><span>PIN de acceso</span>
        <div class="pinbox">
          <input class="input" id="login-pin" type="password" inputmode="numeric" placeholder="Tu PIN" autocomplete="off" />
          <button class="pin-eye" id="pin-eye" type="button" aria-label="Ver PIN">${I.eyeOn}</button>
        </div></label>
      <button class="btn btn-primary btn-block" id="doc-login" style="margin-top:4px;">${I.lock} Iniciar sesión</button>
      <button class="btn btn-quiet btn-block" id="doc-back" style="margin-top:8px;">← Cambiar documento</button>`;
    const pin = $('#login-pin'), eye = $('#pin-eye'); pin.focus();
    eye.onclick = () => { const showing = pin.type === 'text'; pin.type = showing ? 'password' : 'text'; eye.innerHTML = showing ? I.eyeOn : I.eyeOff; };
    pin.addEventListener('keydown', e => { if (e.key === 'Enter') $('#doc-login').click(); });
    $('#doc-login').onclick = () => {
      const p = pin.value.trim();
      if (!p) return toast('Ingresa tu PIN', 'err');
      loginCon(docBuffer, p, $('#doc-login'));
    };
    $('#doc-back').onclick = () => { docStep = 1; renderLoginDoc(); };
  }
}

async function loginCon(documento, pin, btn) {
  saving(btn, true);
  try {
    const r = await api('priv.login', {}, 'POST', { documento: onlyDig(documento), pin });
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
  app.hidden = false; hideSplash(); bindAppbar(user);
  app.querySelectorAll('.tile:not(.soon)').forEach(t => t.onclick = () => openModulo(t.dataset.id, user));
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
    default: toast('Este módulo se activa en el próximo build.');
  }
}
/* Ensancha el contenedor en vistas con grid/tarjetas (PC sin desborde) */
function appWide(on) { document.body.classList.toggle('wide', !!on); }

/* ============================================================
   BASE DE DATOS  (Nuestros registros · hoja PRINCIPAL)
   ============================================================ */
let BD_ALL = [], BD_ME = '', BD_REG_URL = '', BD_SHOWN = 0, BD_FILT = [];
const BD_INT = new Set(); // intenciones seleccionadas (multi, combinables con municipio)
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
    BD_INT.clear(); bdBuildIntChips();
    bdApplyFilter();
  } catch (e) { $('#bd-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; }

  const q = $('#bd-q'); let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(bdApplyFilter, 160); };
  $$('#bd-chips .bd-chip').forEach(ch => ch.onclick = () => { $$('#bd-chips .bd-chip').forEach(x => x.classList.remove('active')); ch.classList.add('active'); bdApplyFilter(); });
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
    if (q) {
      const hay = (String(c.nombre||'') + ' ' + String(c.documento||'') + ' ' + String(c.residencia||'')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
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
function bdUpsertCard(card, prepend) {
  const i = BD_ALL.findIndex(x => normDocJs(x.documento) === normDocJs(card.documento));
  if (i >= 0) BD_ALL[i] = card; else if (prepend) BD_ALL.unshift(card); else BD_ALL.push(card);
  const node = $(`#bd-grid .bd-card[data-doc="${cssq(card.documento)}"]`);
  if (node) { const nn = h(bdCardHtml(card)); nn._wired = true; nn.querySelectorAll('.bd-btn').forEach(b => b.onclick = () => bdAccion(b.dataset.a, card.documento)); node.replaceWith(nn); }
  else if (prepend) bdApplyFilter();
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
      </div>`);
    $('#det-edit').onclick = () => { closeLayer(); bdEditar(doc); };
    $('#det-inact').onclick = () => { closeLayer(); bdInactivar(doc, BD_ALL.find(x => normDocJs(x.documento) === normDocJs(doc))); };
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

function ldColor(ref) {
  const n = Number(ref) || 0;
  if (n >= 50) return 'ld-verde';
  if (n >= 10) return 'ld-azul';
  return 'ld-rojo';
}
const esMovilPriv = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

/* Texto de una ACCIÓN listo para WhatsApp (decodifica %0A → salto real) */
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
  try {
    const r = await api('priv.lideres', ldAuth());
    if (!r.ok) { $('#ld-body').innerHTML = `<p class="muted center">No se pudo cargar.</p>`; return; }
    LD_ALL = r.items || []; LD_PLANT = r.plantillas || null;
    ldApplyFilter();
  } catch (e) { $('#ld-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; }
  const q = $('#ld-q'); let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(ldApplyFilter, 160); };
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
      ['En base de datos', c.enPrincipal ? 'Sí' : 'No'],
      ['Municipio', c.municipio || '—'],
      ['Puesto', c.puesto || '—'],
      ['Mesa', c.mesa || '—']
    ].map(([k, v]) => `<div class="det-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
    openSheet(`<div class="grip"></div>
      <div class="det-head"><h2 class="h2">#${esc(c.codigo)} · ${esc(c.nombre)}</h2><span class="ld-refs ${ldColor(c.referidos)}">${Number(c.referidos || 0).toLocaleString('es-CO')} ref.</span></div>
      <div class="det-list">${rows}</div>
      <div class="ld-ver-acts">
        <button class="btn btn-ghost" id="v-wa" ${c.contacto ? '' : 'disabled'}>${I.wa} WhatsApp</button>
        ${esMovilPriv() ? `<button class="btn btn-ghost" id="v-tel" ${tel ? '' : 'disabled'}>${I.phone} Llamar</button>` : ''}
      </div>
      <div class="stack" style="margin-top:12px;">
        <button class="btn btn-primary btn-block" id="v-edit">Editar</button>
        <button class="btn btn-quiet btn-block" id="v-acc">Acciones (mensajes)</button>
      </div>`);
    $('#v-wa').onclick = () => ldWaOpen(c.contacto, '');
    if ($('#v-tel')) $('#v-tel').onclick = () => { location.href = 'tel:+' + String(c.contacto || '').replace(/\D/g, ''); };
    $('#v-edit').onclick = () => { closeLayer(); ldEditar(cod); };
    $('#v-acc').onclick = () => { closeLayer(); ldAcciones(cod); };
  } catch (e) { closeLayer(); toast('Error de conexión', 'err'); }
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
    SIM = r; simRender();
  } catch (e) { $('#sim-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; }
}
function simRender() {
  const t = SIM.totales;
  const q = SIM_Q.trim().toLowerCase();
  const puestos = q ? SIM.puestos.filter(p => String(p.puesto).toLowerCase().includes(q)) : SIM.puestos;
  const maxPot = SIM.puestos.reduce((m, x) => Math.max(m, x.potencial), 1);
  const bars = puestos.map((x, i) => {
    const pw = Math.round(x.potencial / maxPot * 100);
    const rw = x.potencial ? Math.round(x.real / x.potencial * pw) : 0;
    const mesas = x.mesas.map(m => `<tr><td>Mesa ${esc(m.mesa)}</td><td>${m.potencial}</td><td>${m.real}</td><td>${m.potencial ? Math.round(m.real * 100 / m.potencial) : 0}%</td></tr>`).join('');
    return `<div class="sbar" data-i="${i}">
      <div class="sbar-head"><span class="sbar-p" title="${esc(x.puesto)}">${esc(x.puesto)}</span><span class="sbar-n">${x.real} / ${x.potencial} · <b>${x.pct}%</b></span></div>
      <div class="sbar-track"><div class="sbar-pot" style="width:${pw}%"></div><div class="sbar-real" style="width:${rw}%"></div></div>
      <button class="sbar-toggle" data-t="${i}">Ver mesas (${x.mesas.length})</button>
      <div class="sbar-mesas hidden" id="sm-${i}"><table class="sim-table"><tr><th>Mesa</th><th>Potencial</th><th>Real</th><th>%</th></tr>${mesas}</table></div>
    </div>`;
  }).join('') || `<p class="muted center" style="padding:20px 0;">Sin puestos para mostrar.</p>`;

  $('#sim-body').innerHTML = `
    <div class="dash-kpis">
      <div class="dk"><b>${t.potencial.toLocaleString('es-CO')}</b><span>Potencial (Flandes)</span></div>
      <div class="dk"><b>${t.real.toLocaleString('es-CO')}</b><span>Votos reales</span></div>
      <div class="dk"><b>${t.pct}%</b><span>Conversión</span></div>
      <div class="dk"><b>${SIM.puestos.length.toLocaleString('es-CO')}</b><span>Puestos</span></div>
    </div>
    <p class="small muted" style="margin:2px 0 8px;">Barra clara = potencial (registros con municipio Flandes) · barra verde = votos reales cargados en VOTOS.</p>
    <div class="bd-search" style="margin-bottom:10px;"><input class="input" id="sim-q" placeholder="Buscar puesto…" autocomplete="off" value="${esc(SIM_Q)}" /></div>
    <div class="sim-list">${bars}</div>
    <button class="btn btn-primary btn-block" id="sim-pdf" style="margin-top:14px;">${I.pdf} Generar informe PDF</button>`;
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
  VOTO_poll = setInterval(() => votoLoad(false), 7000); // refresco en vivo desde la hoja
  votoInitFirebase();                                    // + señal instantánea si Firebase está disponible
}

async function votoLoad(manual) {
  try {
    const r = await api('voto.contadores', { caller: VOTO_ME });
    if (r.ok) { VOTO_TALLY = r.tally; VOTO_last = Date.now(); votoRenderCounters(); if (manual) toast('Actualizado', 'ok'); }
  } catch (e) { if (manual) toast('No se pudo actualizar', 'err'); }
}

/* Firebase RTDB como SEÑAL de cambio: cuando la app de escaneo escribe en
   /votacion, refrescamos al instante desde VOTOS (la fuente de verdad). */
function votoInitFirebase() {
  loadFirebase().then(fb => {
    VOTO_fb = fb;
    (fb.apps && fb.apps.length) ? fb.app() : fb.initializeApp(VOTO_FBCFG);
    VOTO_ref = fb.database().ref('votacion');
    VOTO_onVal = VOTO_ref.on('value', () => {
      if (VOTO_reloadT) return;
      VOTO_reloadT = setTimeout(() => { VOTO_reloadT = null; votoLoad(false); }, 600);
    }, () => {});
  }).catch(() => {});
}

function votoRenderCounters() {
  const totEl = $('#voto-total'); if (!totEl) return;
  const hora = VOTO_last ? new Date(VOTO_last).toLocaleTimeString('es-CO') : '';
  totEl.innerHTML = `<div class="voto-total-n">${(VOTO_TALLY.total || 0).toLocaleString('es-CO')}</div>
    <div class="voto-total-l"><span class="voto-live">● EN VIVO</span> votos registrados${hora ? ' · ' + hora : ''}</div>`;
  let list = VOTO_TALLY[VOTO_TAB] || [];
  const q = VOTO_Q.trim().toLowerCase();
  if (q) list = list.filter(x => String(x.label).toLowerCase().includes(q));
  const max = list.reduce((m, x) => Math.max(m, x.n), 1);
  $('#voto-counters').innerHTML = list.map(x => `<div class="vc-row">
      <div class="vc-head"><span class="vc-lbl" title="${esc(x.label)}">${esc(x.label)}</span><span class="vc-n">${x.n.toLocaleString('es-CO')}</span></div>
      <div class="vc-track"><div class="vc-fill" style="width:${Math.round(x.n / max * 100)}%"></div></div>
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

/* ---------- Barra superior con avatar/rol y salir ---------- */
function appbar(user, titulo) {
  return `<div class="appbar">
    <div class="mark">${esc(iniciales(user.nombre))}</div>
    <div class="who"><b>${esc(titulo || primerNombre(user.nombre))}</b><span>${esc(rolLabel(user.rol))} · CC ${esc(user.documento)}</span></div>
    ${getSessions().length > 1 ? `<button class="icon-btn" id="btnSwap" title="Cambiar de cuenta">${I.swap}</button>` : ''}
    <button class="icon-btn" id="btnOut" title="Salir">${I.logout}</button>
  </div>`;
}
function bindAppbar(user) {
  const out = $('#btnOut'); if (out) out.onclick = () => logout();
  const swap = $('#btnSwap');
  if (swap) swap.onclick = () => {
    const sesiones = getSessions();
    openSheet(`<div class="grip"></div><h2 class="h2">¿Con cuál cuenta sigues?</h2><div class="stack" style="margin-top:12px;">${sesiones.map(s => `<button class="acc-chip" data-doc="${esc(s.documento)}"><span class="av">${esc(iniciales(s.nombre))}</span><span class="acc-meta"><b>${esc(primerNombre(s.nombre))}</b><span>${esc(rolLabel(s.rol))}</span></span></button>`).join('')}</div>`);
    layer.querySelectorAll('.acc-chip').forEach(c => c.onclick = () => { setActive(c.dataset.doc); closeLayer(); go('home'); });
  };
}

/* ---------- Hojas inferiores (modales) ---------- */
function openSheet(html) {
  closeLayer();
  const bd = h('<div class="backdrop"></div>');
  const sh = h(`<div class="sheet">${html}</div>`);
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
function rangoHoras(a, b) { if (a && b) return `${a} – ${b}`; return a || b || ''; }

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
      <span class="ev-badge ${evEstadoClass(c.estado)}">${esc(evEstadoLabel(c.estado))}</span>
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
    <div class="stack" style="margin-top:12px;">
      <button class="btn btn-ghost btn-block" id="ev-copy">${I.copy} Copiar en portapapeles</button>
      <button class="btn btn-primary btn-block" id="ev-edit">Editar</button>
    </div>`);
  $('#ev-copy').onclick = async () => { try { await navigator.clipboard.writeText(evTextoCopia(c)); toast('Evento copiado', 'ok'); } catch { toast('No se pudo copiar', 'err'); } };
  $('#ev-edit').onclick = () => { closeLayer(); evEditar(id); };
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
function evFormHtml(titulo, c) {
  c = c || {};
  return `<div class="grip"></div><h2 class="h2" style="margin-bottom:10px;">${esc(titulo)}</h2>
    <div class="stack">
      ${field('ID del evento', inputEl('ev-fid', 'disabled'))}
      ${field('Nombre del evento', inputEl('ev-fnombre', 'placeholder="Ej. Reunión de líderes N° 5"'))}
      ${field('Fecha', `<input class="input" id="ev-ffecha" type="date" />`)}
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
  return AG_ALL.filter(r => r.fecha === key && agMatchesQ(r)).sort((a, b) => (a.inicia || '99').localeCompare(b.inicia || '99'));
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
      <div class="ag-search"><input class="input" id="ag-q" placeholder="Buscar reunión por título, lugar o contacto…" autocomplete="off" /></div>
      <div id="ag-cal">${loadingBox('Cargando agenda…')}</div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('home');
  $('#ag-add').onclick = () => agAgregar(AG_CUR);
  $('#ag-prev').onclick = () => { agShift(-1); };
  $('#ag-next').onclick = () => { agShift(1); };
  $('#ag-today').onclick = () => { AG_CUR = new Date(); agRender(); };
  $$('#ag-seg .ag-seg-btn').forEach(b => b.onclick = () => { AG_VIEW = b.dataset.v === 'año' ? 'anio' : b.dataset.v === 'día' ? 'dia' : 'mes'; $$('#ag-seg .ag-seg-btn').forEach(x => x.classList.toggle('active', x === b)); agRender(); });
  const q = $('#ag-q'); let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => { AG_Q = q.value.trim().toLowerCase(); agRender(); }, 180); };
  try { const r = await api('priv.agenda', m5Auth()); AG_ALL = (r && r.items) || []; }
  catch (e) { $('#ag-cal').innerHTML = `<p class="muted center">Error de conexión.</p>`; return; }
  agRender();
}

function agShift(dir) {
  const d = new Date(AG_CUR);
  if (AG_VIEW === 'anio') d.setFullYear(d.getFullYear() + dir);
  else if (AG_VIEW === 'dia') d.setDate(d.getDate() + dir);
  else d.setMonth(d.getMonth() + dir);
  AG_CUR = d; agRender();
}

function agRender() {
  const cal = $('#ag-cal'); if (!cal) return;
  const title = $('#ag-title');
  if (AG_VIEW === 'anio') { if (title) title.textContent = AG_CUR.getFullYear(); cal.innerHTML = agRenderAnio(); agWireYear(); }
  else if (AG_VIEW === 'dia') { if (title) title.textContent = `${AG_CUR.getDate()} de ${BD_MESES[AG_CUR.getMonth()]} de ${AG_CUR.getFullYear()}`; cal.innerHTML = agRenderDia(); agWireChips(); }
  else { if (title) title.textContent = `${BD_MESES[AG_CUR.getMonth()][0].toUpperCase() + BD_MESES[AG_CUR.getMonth()].slice(1)} ${AG_CUR.getFullYear()}`; cal.innerHTML = agRenderMes(); agWireMonth(); }
}

/* semana empieza lunes; devuelve índice 0..6 (Lun..Dom) */
function dowMon(d) { return (d.getDay() + 6) % 7; }

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
    const rs = agReunionesDia(d);
    const chips = rs.slice(0, 3).map(r => `<button class="ag-chip ${agEstadoClass(r.estado)}" data-id="${esc(r.id)}" title="${esc(r.titulo)}">${r.inicia ? `<span class="ag-chip-h">${esc(r.inicia)}</span> ` : ''}${esc(r.titulo)}</button>`).join('');
    const extra = rs.length > 3 ? `<button class="ag-more" data-day="${dateToDDMM(d)}">+${rs.length - 3} más</button>` : '';
    cells += `<div class="ag-cell ${inMonth ? '' : 'ag-out'} ${isToday ? 'ag-today-cell' : ''}" data-day="${dateToDDMM(d)}">
      <div class="ag-cell-h"><span class="ag-dnum">${d.getDate()}</span></div>
      <div class="ag-cell-body">${chips}${extra}</div>
    </div>`;
  }
  return `<div class="ag-monthwrap">
    <div class="ag-dow">${AG_DOW.map(x => `<span>${x}</span>`).join('')}</div>
    <div class="ag-grid">${cells}</div>
  </div>`;
}
function agWireMonth() {
  $$('#ag-cal .ag-chip').forEach(b => b.onclick = (e) => { e.stopPropagation(); agVer(b.dataset.id); });
  $$('#ag-cal .ag-more').forEach(b => b.onclick = (e) => { e.stopPropagation(); const d = parseFechaES(b.dataset.day); if (d) { AG_CUR = d; AG_VIEW = 'dia'; $$('#ag-seg .ag-seg-btn').forEach(x => x.classList.toggle('active', x.dataset.v === 'día')); agRender(); } });
  $$('#ag-cal .ag-cell').forEach(c => c.onclick = () => { const d = parseFechaES(c.dataset.day); if (d) agAgregar(d); });
}

function agRenderDia() {
  const rs = agReunionesDia(AG_CUR);
  if (!rs.length) return `<div class="ag-daywrap"><p class="muted center" style="margin:30px 0;">Sin reuniones este día.<br><button class="btn btn-ghost" id="ag-day-add" style="margin-top:12px;">${I.plus} Agregar reunión</button></p></div>`;
  const items = rs.map(r => `<button class="ag-day-item ${agEstadoClass(r.estado)}" data-id="${esc(r.id)}">
    <div class="ag-day-time">${esc(r.inicia || '—')}${r.termina ? `<span>${esc(r.termina)}</span>` : ''}</div>
    <div class="ag-day-main"><b>${esc(r.titulo)}</b><span>${esc([r.lugar, r.contacto].filter(Boolean).join(' · ') || '—')}</span></div>
    <span class="ag-badge ${agEstadoClass(r.estado)}">${esc(r.estado)}</span>
  </button>`).join('');
  return `<div class="ag-daywrap">${items}</div>`;
}

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
      const has = inMonth && agReunionesDia(d).length > 0;
      cells += `<span class="ag-y-d ${inMonth ? '' : 'ag-out'} ${has ? 'ag-y-has' : ''}">${inMonth ? d.getDate() : ''}</span>`;
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
  $$('#ag-cal .ag-day-item').forEach(b => b.onclick = () => agVer(b.dataset.id));
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
      <button class="btn btn-primary" id="ag-wa-dir" ${c.telefono ? '' : 'disabled'}>${I.wa} WhatsApp directo</button>
      <button class="btn btn-ghost" id="ag-wa-bot" ${c.telefono ? '' : 'disabled'}>Enviar por bot</button>
    </div>
    <button class="btn btn-ghost btn-block" id="ag-copy" style="margin-top:8px;">${I.copy} Copiar bitácora a grupo</button>
    <div class="ag-ver-grid">
      <button class="btn btn-quiet" id="ag-edit">${I.pencil} Editar</button>
      <button class="btn btn-quiet" id="ag-repro">${I.repeat} A reprogramar</button>
      <button class="btn btn-quiet" id="ag-real">${I.check} Realizada</button>
      <button class="btn btn-quiet ag-del" id="ag-del">${I.trash} Eliminar</button>
    </div>`);
  $('#ag-wa-dir').onclick = () => { if (c.telefono) ldWaOpen(c.telefono, c.mensaje || ''); else toast('Sin teléfono', 'err'); };
  $('#ag-wa-bot').onclick = () => agWaBot(c);
  $('#ag-copy').onclick = async () => { try { await navigator.clipboard.writeText(agTextoBitacora(c)); toast('Bitácora copiada', 'ok'); } catch { toast('No se pudo copiar', 'err'); } };
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
function agFormHtml(titulo, c) {
  c = c || {};
  return `<div class="grip"></div><h2 class="h2" style="margin-bottom:10px;">${esc(titulo)}</h2>
    <div class="stack">
      ${field('ID de reunión', inputEl('ag-fid', 'disabled'))}
      ${field('Título de la reunión', inputEl('ag-ftit', 'placeholder="Ej. Visita a líderes de Topacio"'))}
      ${field('Fecha', `<input class="input" id="ag-ffecha" type="date" />`)}
      ${field('Lugar (zona)', comboboxHtml('ag-flugar', 'Escribe para buscar…'))}
      ${field('Contacto (de la base o libre)', comboboxHtml('ag-fcont', 'Busca en la base o escríbelo…'))}
      ${field('Teléfono', inputEl('ag-ftel', 'inputmode="numeric" maxlength="10" placeholder="10 dígitos (opcional)"'))}
      <div class="ev-hrow">
        ${field('Hora inicio', `<input class="input" id="ag-fini" type="time" />`)}
        ${field('Hora fin', `<input class="input" id="ag-ffin" type="time" />`)}
      </div>
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
  $('#ag-fcont').value = c.contacto || '';
  $('#ag-ftel').value = c.telefono ? String(c.telefono).replace(/^57/, '') : '';
  $('#ag-fini').value = c.inicia || '';
  $('#ag-ffin').value = c.termina || '';
  $('#ag-fmsg').value = c.mensaje || '';
  $('#ag-fbit').value = c.bitacora || '';
  onlyDigits($('#ag-ftel'));
  getResidencias().then(l => { bindCombobox('ag-flugar', l); $('#ag-flugar').value = c.lugar || ''; });
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
  if (x === 'CUMPLIDO') return 'cm-cump';
  if (x === 'DESCARTADO') return 'cm-desc';
  return 'cm-pend';
}

/* Texto listo para WhatsApp (plantilla del servidor, %0A → salto real) */
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

function cmResumenHtml() {
  const p = CM_CONT.PENDIENTE || 0, cu = CM_CONT.CUMPLIDO || 0, d = CM_CONT.DESCARTADO || 0;
  const tot = p + cu + d;
  const pct = tot ? Math.round((cu / tot) * 100) : 0;
  return `<div class="cm-resumen">
    <div class="cm-kpis">
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
        <div class="bd-search"><input class="input" id="cm-q" placeholder="Buscar por persona, compromiso, asignado o zona…" autocomplete="off" /></div>
        <button class="btn btn-primary bd-add" id="cm-add">+ Agregar</button>
      </div>
      <div class="bd-chips" id="cm-chips">
        ${['Todos', 'Pendiente', 'Cumplido', 'Descartado'].map((t, i) => `<button class="bd-chip ${i === 0 ? 'active' : ''}" data-f="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
      <div class="bd-count" id="cm-count"></div>
      <div id="cm-body">${loadingBox('Cargando compromisos…')}</div>
      <div class="center" id="cm-more" style="margin-top:12px;"></div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('home');
  $('#cm-add').onclick = () => cmAgregar();
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
    const hay = ((c.nombre || '') + ' ' + (c.compromiso || '') + ' ' + (c.asignado || '') + ' ' + (c.residencia || '') + ' ' + (c.contacto || '')).toLowerCase();
    return hay.includes(q);
  });
  CM_SHOWN = 0;
  const cEl = $('#cm-count'); if (cEl) cEl.textContent = `${CM_FILT.length.toLocaleString('es-CO')} compromiso(s) · del más antiguo al más reciente`;
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
  CM_CONT = { PENDIENTE: 0, CUMPLIDO: 0, DESCARTADO: 0 };
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
    ['Registrado', c.fecha ? fmtCreada(c.fecha) : '—'],
    ['Antigüedad', dias === null ? '—' : (dias === 0 ? 'hoy' : dias + ' día(s)')],
    ['ID', c.id]
  ].map(([k, v]) => `<div class="det-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  openSheet(`<div class="grip"></div>
    <div class="det-head"><h2 class="h2">${esc(c.nombre)}</h2><span class="cm-badge ${cmEstadoClass(c.estado)}">${esc(c.estado)}</span></div>
    <div class="det-list">${rows}</div>
    <div class="stack" style="margin-top:12px;">
      <button class="btn btn-ghost btn-block" id="cm-copy">${I.copy} Copiar en portapapeles</button>
      <button class="btn btn-primary btn-block" id="cm-edit">Editar</button>
    </div>`);
  $('#cm-copy').onclick = async () => { try { await navigator.clipboard.writeText(cmTextoCopia(c)); toast('Compromiso copiado', 'ok'); } catch { toast('No se pudo copiar', 'err'); } };
  $('#cm-edit').onclick = () => { closeLayer(); cmEditar(id); };
}

/* ---- Cambiar estado ---- */
function cmEstadoPicker(id) {
  const c = cmFind(id); if (!c) return toast('Compromiso no encontrado', 'err');
  const opts = [['PENDIENTE', 'cm-pend'], ['CUMPLIDO', 'cm-cump'], ['DESCARTADO', 'cm-desc']];
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
  const texto = cmWaText(c);
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

const NT_REDES = {
  facebook: 'Facebook', instagram: 'Instagram', x: 'X',
  youtube: 'YouTube', tiktok: 'TikTok', whatsapp: 'WhatsApp', web: 'Enlace'
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
  return 'web';
}

/* Recorte del cuerpo para la tarjeta, respetando los saltos */
function ntResumen(txt, lineas) {
  const L = String(txt || '').split('\n');
  const corte = L.slice(0, lineas || 3).join('\n');
  return corte + (L.length > (lineas || 3) ? '…' : '');
}

function ntCardHtml(n) {
  const red = n.red ? (NT_REDES[n.red] || 'Enlace') : '';
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
      ${red ? `<span class="nt-red nt-red-${esc(n.red)}">${esc(red)}</span>` : ''}
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
      ${enlace ? `<span class="nt-sim-link nt-red-${esc(red)}">${esc(NT_REDES[red] || 'Enlace')}</span>` : ''}
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

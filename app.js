/* ============================================================
   JHONNY PRIV — App Privada · app.js
   Fase 2 · Módulo 1: Shell PWA + Login (documento + PIN) + Home por rol.
   Misma arquitectura y patrón que la app pública (SEP-GROUP):
   helpers api()/go()/$, gate de Instalar, auto-versión, PWA nativa.
   Backend: JHONNY CORE (mismo /exec), namespace priv.*
   ============================================================ */

/* URL del Web App del backend JHONNY CORE (/exec) — el MISMO de la pública */
const API_URL = 'https://script.google.com/macros/s/AKfycbxXlxYzr6cTilsvSTGH6l0CGjLb35a7xyvgFgd5EMnLtWIfR8isHiSGSqCdNqlUYE2P/exec';

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
  bot:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M8 4h8"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M2 13v3M22 13v3"/></svg>'
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
const READY = new Set(['bd']);
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
  const route = (location.hash.replace(/^#\//, '') || '').split('?')[0];
  const user = getActive();
  appWide(false); // ancho normal por defecto; las vistas de grid lo reactivan
  if (route === 'instalar') return viewInstalar();
  if (!user && route !== 'login') return go('login');
  if (route === 'login' || !user) return viewLogin();
  switch (route) {
    case 'bd': return viewBaseDatos(user);
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
   LOGIN  (pestañas: PIN inicial · Documento — contra USUARIOS con rol)
   Nunca muestra documento y PIN a la vez.
   ============================================================ */
let pinDocSel = ''; // documento (de una cuenta guardada) elegido en la pestaña PIN
function viewLogin() {
  const sesiones = getSessions();
  const startTab = sesiones.length ? 'pin' : 'doc';
  pinDocSel = sesiones.length ? (getActive()?.documento || sesiones[0].documento) : '';
  app.innerHTML = `
    <div class="login-wrap"><div class="login-card">
      <img class="login-logo" src="${APP_ICON}" alt="Jhonny Perdomo" />
      <h1 class="login-title">Panel privado</h1>
      <p class="login-sub">Acceso del equipo · Jhonny Perdomo</p>

      <div class="login-tabs">
        <button class="login-tab ${startTab === 'pin' ? 'active' : ''}" data-tab="pin">PIN</button>
        <button class="login-tab ${startTab === 'doc' ? 'active' : ''}" data-tab="doc">Documento</button>
      </div>

      <!-- PESTAÑA PIN -->
      <div id="tab-pin" class="${startTab === 'pin' ? '' : 'hidden'}">
        ${sesiones.length ? `
          <p class="eyebrow" style="margin:12px 0 6px;">Cuenta de este equipo</p>
          <div class="acc-list" id="acc-list">
            ${sesiones.map(s => `<button class="acc-chip ${s.documento === pinDocSel ? 'sel' : ''}" data-doc="${esc(s.documento)}">
                <span class="av">${esc(iniciales(s.nombre))}</span>
                <span class="acc-meta"><b>${esc(primerNombre(s.nombre))}</b><span>${esc(rolLabel(s.rol))}</span></span>
                <span class="acc-x" data-forget="${esc(s.documento)}" title="Quitar de este equipo">${I.x}</span>
              </button>`).join('')}
          </div>
          <label class="field" style="margin-top:12px;"><span>PIN</span>
            <div class="pinbox">
              <input class="input" id="pin-only" type="password" inputmode="numeric" placeholder="Tu PIN de acceso" autocomplete="off" />
              <button class="pin-eye" id="pin-only-eye" type="button" aria-label="Ver PIN">${I.eyeOn}</button>
            </div></label>
          <button class="btn btn-primary btn-block" id="btn-pin" style="margin-top:8px;">${I.lock} Entrar</button>
        ` : `<p class="pin-hint" style="margin-top:16px;">Para tu primer ingreso en este equipo, usa la pestaña <b>Documento</b>.</p>`}
      </div>

      <!-- PESTAÑA DOCUMENTO -->
      <div id="tab-doc" class="${startTab === 'doc' ? '' : 'hidden'}">
        <label class="field" style="margin-top:12px;"><span>Número de documento</span>
          <input class="input" id="login-doc" inputmode="numeric" placeholder="Sin puntos ni espacios" autocomplete="off" /></label>
        <label class="field"><span>PIN</span>
          <div class="pinbox">
            <input class="input" id="login-pin" type="password" inputmode="numeric" placeholder="Tu PIN de acceso" autocomplete="off" />
            <button class="pin-eye" id="pin-eye" type="button" aria-label="Ver PIN">${I.eyeOn}</button>
          </div></label>
        <button class="btn btn-primary btn-block" id="btn-login" style="margin-top:8px;">${I.lock} Iniciar sesión</button>
      </div>

      ${footBrand()}
    </div></div>`;
  app.hidden = false; hideSplash(); paintVersion(APP_VERSION_LOADED || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''));

  // Alternar pestañas (nunca ambas a la vez)
  $$('.login-tab').forEach(tab => tab.onclick = () => {
    $$('.login-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active');
    const w = tab.dataset.tab;
    $('#tab-doc').classList.toggle('hidden', w !== 'doc');
    $('#tab-pin').classList.toggle('hidden', w !== 'pin');
  });

  // --- Pestaña PIN ---
  const eyeToggle = (inp, btn) => { const showing = inp.type === 'text'; inp.type = showing ? 'password' : 'text'; btn.innerHTML = showing ? I.eyeOn : I.eyeOff; };
  const pinOnly = $('#pin-only'), pinOnlyEye = $('#pin-only-eye');
  if (pinOnly) {
    pinOnlyEye.onclick = () => eyeToggle(pinOnly, pinOnlyEye);
    pinOnly.addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-pin').click(); });
    $$('#acc-list .acc-chip').forEach(c => c.onclick = (ev) => {
      const fx = ev.target.closest('.acc-x');
      if (fx) { forgetSession(fx.dataset.forget); return viewLogin(); }
      pinDocSel = c.dataset.doc;
      $$('#acc-list .acc-chip').forEach(x => x.classList.toggle('sel', x.dataset.doc === pinDocSel));
      pinOnly.focus();
    });
    $('#btn-pin').onclick = () => {
      if (!pinDocSel) return toast('Elige una cuenta', 'err');
      const p = pinOnly.value.trim();
      if (!p) return toast('Ingresa tu PIN', 'err');
      loginCon(pinDocSel, p, $('#btn-pin'));
    };
  }

  // --- Pestaña Documento ---
  const doc = $('#login-doc'), pin = $('#login-pin'), eye = $('#pin-eye');
  onlyDigits(doc);
  eye.onclick = () => eyeToggle(pin, eye);
  pin.addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-login').click(); });
  $('#btn-login').onclick = () => {
    const d = onlyDig(doc.value), p = pin.value.trim();
    if (!/^\d{5,10}$/.test(d)) return toast('Documento inválido', 'err');
    if (!p) return toast('Ingresa tu PIN', 'err');
    loginCon(d, p, $('#btn-login'));
  };
}

async function loginCon(documento, pin, btn) {
  saving(btn, true);
  try {
    const r = await api('priv.login', {}, 'POST', { documento: onlyDig(documento), pin });
    saving(btn, false);
    if (!r.ok) return toast(r.msg || 'No se pudo iniciar sesión', 'err');
    saveSession(r.user);
    go('home');
  } catch (e) { toast('Error de conexión', 'err'); saving(btn, false); }
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
    default: toast('Este módulo se activa en el próximo build.');
  }
}
/* Ensancha el contenedor en vistas con grid/tarjetas (PC sin desborde) */
function appWide(on) { document.body.classList.toggle('wide', !!on); }

/* ============================================================
   BASE DE DATOS  (Nuestros registros · hoja PRINCIPAL)
   ============================================================ */
let BD_ALL = [], BD_ME = '', BD_REG_URL = '', BD_SHOWN = 0, BD_FILT = [];
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
      ${inact ? '<span class="bd-pill-inact">Inactivo</span>' : `<span class="bd-mun">${esc(c.municipio || '—')}</span>`}
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
      <div class="bd-chips" id="bd-chips">
        ${['Todos','Flandes','Sin consultar','A la espera','Por confirmar','Otros','Inactivos'].map((t,i)=>`<button class="bd-chip ${i===0?'active':''}" data-f="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
      <div class="bd-count" id="bd-count"></div>
      <div id="bd-body">${loadingBox('Cargando registros…')}</div>
      <div class="center" id="bd-more" style="margin-top:12px;"></div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('home');
  $('#bd-add').onclick = () => bdAgregar();

  try {
    const r = await api('priv.baseDatos', { caller: BD_ME });
    if (!r.ok) { $('#bd-body').innerHTML = `<p class="muted center">No se pudo cargar.</p>`; return; }
    BD_ALL = r.items || []; BD_REG_URL = r.registraduriaUrl || '';
    bdApplyFilter();
  } catch (e) { $('#bd-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; }

  const q = $('#bd-q'); let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(bdApplyFilter, 160); };
  $$('#bd-chips .bd-chip').forEach(ch => ch.onclick = () => { $$('#bd-chips .bd-chip').forEach(x => x.classList.remove('active')); ch.classList.add('active'); bdApplyFilter(); });
}

function bdActiveFilter() { const a = $('#bd-chips .bd-chip.active'); return a ? a.dataset.f : 'Todos'; }
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
    const keys = orden.filter(k => k in p).concat(Object.keys(p).filter(k => orden.indexOf(k) === -1));
    const rows = keys.map(k => `<div class="det-row"><span>${esc(k.replace(/_/g,' '))}</span><b>${esc(p[k] || '—')}</b></div>`).join('');
    openSheet(`<div class="grip"></div>
      <div class="det-head"><h2 class="h2">${r.esLider ? '★ ' : ''}${esc(p['NOMBRE'] || 'Detalles')}</h2><span class="bd-mun ${bdColor(p['MUNICIPIO'])}">${esc(p['MUNICIPIO'] || '—')}</span></div>
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

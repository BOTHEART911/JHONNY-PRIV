/* ============================================================================
 * NAVEGACIÓN RÁPIDA ENTRE VISTAS (19/11/2026) — pareja de css/nav-rapida.css
 * ----------------------------------------------------------------------------
 * Botón redondo encima del robot de Insights (.ia-fab). Al tocarlo abre una
 * hoja inferior (celular) o un panel junto al botón (PC) con Inicio, los
 * módulos del menú y un segundo grupo (Dashboard, Simulador, Votación,
 * Tablero de líderes). La vista actual sale marcada.
 *
 * - Solo lista lo que el usuario puede ver: menuParaRol(rol) + READY y
 *   permRuta() (INVITADO con sus pastillas). La lista se arma CADA vez que se
 *   abre y se rehace si permSet() cambia las pastillas con el panel abierto.
 * - Cero viajes al servidor: todo sale de MENU, READY, I y permisos.js.
 * - Sigue al robot cuando se arrastra (observa su estilo); si la vista no
 *   tiene robot, se queda en la esquina del robot.
 * - Se encoge al bajar la pantalla y vuelve al subir.
 * - Se cierra tocando fuera, arrastrando la hoja hacia abajo o con Esc.
 * - No sale en login, instalar ni en el Inicio.
 * - Medición: window.NAVR_MED guarda los ms de abrir el panel (pintado).
 * ========================================================================== */
(function () {
  'use strict';

  var SIN_BOTON = { '': 1, home: 1, login: 1, instalar: 1 };
  var EXTRA = [
    { id: 'dashboard',  title: 'Dashboard',          ic: 'dash' },
    { id: 'simulador',  title: 'Simulador',          ic: 'sliders' },
    { id: 'votacion',   title: 'Votación',           ic: 'vote' },
    { id: 'lidtablero', title: 'Tablero de líderes', ic: 'trend' }
  ];
  /* Íconos propios (los demás salen de I de app.js) */
  var SVG = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
    dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/></svg>'
  };

  var btn = null, wrap = null, abierto = false, obsFab = null, fabVisto = null;

  function ruta() { return (location.hash.replace(/^#\//, '') || '').split('?')[0]; }
  function usuario() { try { return typeof getActive === 'function' ? getActive() : null; } catch (e) { return null; } }
  function ico(k) {
    if (SVG[k]) return SVG[k];
    try { if (typeof I !== 'undefined' && I[k]) return I[k]; } catch (e) {}
    return SVG.grid;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pc() { return window.matchMedia('(min-width: 641px)').matches; }
  function reducido() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ---------- lo que puede ver (sin servidor) ---------- */
  function puede(id) { return typeof permRuta !== 'function' || permRuta(id); }
  function grupos() {
    var u = usuario() || {};
    var menu = [];
    try { menu = typeof menuParaRol === 'function' ? menuParaRol(u.rol) : []; } catch (e) { menu = []; }
    var listo = function (id) { try { return typeof READY === 'undefined' || READY.has(id); } catch (e) { return true; } };
    var g1 = [{ id: '', title: 'Inicio', ic: 'home' }];
    menu.forEach(function (m) { if (listo(m.id) && puede(m.id)) g1.push({ id: m.id, title: m.title, ic: m.icon }); });
    var g2 = EXTRA.filter(function (x) { return puede(x.id); });
    return [g1, g2];
  }

  /* ---------- botón ---------- */
  function montar() {
    var r = ruta();
    if (SIN_BOTON[r] || !usuario()) return quitar();
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'navr-fab';
      btn.setAttribute('aria-label', 'Ir a otra vista');
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.setAttribute('aria-expanded', 'false');
      btn.title = 'Ir a otra vista';
      btn.innerHTML = SVG.grid;
      btn.addEventListener('click', function () { abierto ? cerrar() : abrir(); });
      document.body.appendChild(btn);
    }
    seguirFab();
    if (abierto) pintar();
  }
  function quitar() { cerrar(true); if (btn) { btn.remove(); btn = null; } }

  /* ---------- seguir al robot ---------- */
  function fabActual() { return document.querySelector('.ia-fab'); }
  function colocar() {
    if (!btn) return;
    var f = fabActual();
    var tam = f ? Math.max(44, Math.round(f.offsetHeight)) : 50;
    btn.style.width = btn.style.height = tam + 'px';
    var m = 10;
    if (f && f.style.left) {           /* el robot fue arrastrado: ir encima de él */
      var c = f.getBoundingClientRect();
      var top = c.top - tam - m;
      if (top < 8) top = c.bottom + m;   /* sin espacio arriba: debajo */
      var left = c.left + (c.width - tam) / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - tam - 8));
      btn.style.left = left + 'px'; btn.style.top = top + 'px';
      btn.style.right = 'auto'; btn.style.bottom = 'auto';
    } else {                           /* esquina del robot (o la suya si no hay robot) */
      var fw = f ? f.offsetWidth : tam;
      btn.style.left = 'auto'; btn.style.top = 'auto';
      btn.style.right = (16 + Math.max(0, (fw - tam) / 2)) + 'px';
      btn.style.bottom = 'calc(' + (18 + (f ? f.offsetHeight + m : 0)) + 'px + env(safe-area-inset-bottom, 0px))';
    }
    if (abierto && pc()) ubicarPanel();
  }
  function seguirFab() {
    var f = fabActual();
    if (f === fabVisto) { colocar(); return; }
    if (obsFab) { obsFab.disconnect(); obsFab = null; }
    fabVisto = f;
    if (f && typeof MutationObserver !== 'undefined') {
      obsFab = new MutationObserver(function () { colocar(); });
      obsFab.observe(f, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    colocar();
  }
  /* el robot nace y muere con cada vista (y llega tarde: espera su estado) */
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function (lista) {
      if (!btn) return;
      for (var i = 0; i < lista.length; i++) {
        var l = lista[i], ns = [].concat([].slice.call(l.addedNodes), [].slice.call(l.removedNodes));
        for (var j = 0; j < ns.length; j++) if (ns[j].classList && ns[j].classList.contains('ia-fab')) { seguirFab(); return; }
      }
    }).observe(document.body || document.documentElement, { childList: true });
  }

  /* ---------- encogerse al bajar ---------- */
  var yAnt = 0, rafS = 0;
  window.addEventListener('scroll', function () {
    if (rafS) return;
    rafS = requestAnimationFrame(function () {
      rafS = 0;
      var y = window.scrollY || 0;
      if (btn && !abierto) btn.classList.toggle('navr-chico', y > yAnt + 2 && y > 80);
      if (y < yAnt - 2 && btn) btn.classList.remove('navr-chico');
      yAnt = y;
    });
  }, { passive: true });

  /* ---------- panel / hoja ---------- */
  function abrir() {
    if (abierto || !btn) return;
    var t0 = performance.now();
    abierto = true;
    btn.classList.remove('navr-chico');
    btn.setAttribute('aria-expanded', 'true');
    if (!pc()) btn.classList.add('navr-tapado');   /* en celular la hoja tapa la esquina: se cierra con Esc, fuera o arrastrando */
    wrap = document.createElement('div');
    wrap.className = 'navr-wrap ' + (pc() ? 'navr-pc' : 'navr-movil');
    wrap.innerHTML = '<div class="navr-fondo"></div>' +
      '<section class="navr-hoja" role="dialog" aria-modal="true" aria-label="Ir a otra vista">' +
      '<div class="navr-asa" aria-hidden="true"></div><div class="navr-cuerpo"></div></section>';
    document.body.appendChild(wrap);
    pintar();
    if (pc()) ubicarPanel();
    wrap.querySelector('.navr-fondo').addEventListener('click', function () { cerrar(); });
    arrastrarHoja(wrap.querySelector('.navr-hoja'));
    requestAnimationFrame(function () {
      if (!wrap) return;
      wrap.classList.add('navr-on');
      var act = wrap.querySelector('[aria-current="page"]') || wrap.querySelector('.navr-it');
      try { act && act.focus({ preventScroll: true }); } catch (e) {}
      window.NAVR_MED = { abrirMs: Math.round(performance.now() - t0), viajes: 0, items: wrap.querySelectorAll('.navr-it').length };
    });
  }
  function pintar() {
    if (!wrap) return;
    var r = ruta() || '';
    var g = grupos();
    var html = '<p class="navr-tit">Ir a</p>';
    g.forEach(function (lista, k) {
      if (!lista.length) return;
      if (k === 1) html += '<p class="navr-sub">Tableros y herramientas</p>';
      html += '<div class="navr-grid">' + lista.map(function (x) {
        var aqui = (x.id === r) || (x.id === '' && (r === '' || r === 'home'));
        return '<button type="button" class="navr-it' + (aqui ? ' navr-aqui' : '') + '" data-r="' + esc(x.id) + '"' +
          (aqui ? ' aria-current="page"' : '') + '><span class="navr-ic">' + ico(x.ic) + '</span><span class="navr-tx">' + esc(x.title) + '</span></button>';
      }).join('') + '</div>';
    });
    var c = wrap.querySelector('.navr-cuerpo');
    c.innerHTML = html;
    c.querySelectorAll('.navr-it').forEach(function (b) {
      b.addEventListener('click', function () {
        var dest = b.getAttribute('data-r');
        cerrar();
        if (dest === ruta()) return;
        location.hash = '#/' + dest;
      });
    });
  }
  function ubicarPanel() {
    if (!wrap || !btn) return;
    var h = wrap.querySelector('.navr-hoja');
    var c = btn.getBoundingClientRect();
    var f = fabActual(), cf = f ? f.getBoundingClientRect() : c;
    var w = h.offsetWidth, alto = h.offsetHeight, m = 10, W = window.innerWidth, H = window.innerHeight;
    var left, top;
    if (c.top - alto - m >= 8) {                 /* cabe encima del botón */
      top = c.top - alto - m;
      left = c.right - w; if (left < 8) left = c.left;
    } else {                                     /* al lado del botón y del robot, sin taparlos */
      var der = Math.max(c.right, cf.right) + m, izq = Math.min(c.left, cf.left) - m - w;
      left = (der + w <= W - 8) ? der : (izq >= 8 ? izq : der);
      top = c.top;
    }
    left = Math.max(8, Math.min(left, W - w - 8));
    top = Math.max(8, Math.min(top, H - alto - 8));
    h.style.left = left + 'px'; h.style.top = top + 'px';
  }
  function cerrar(inmediato) {
    if (!abierto) return;
    abierto = false;
    if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.classList.remove('navr-tapado'); }
    var w = wrap; wrap = null;
    if (!w) return;
    if (inmediato || reducido()) { w.remove(); return; }
    w.classList.remove('navr-on');
    setTimeout(function () { w.remove(); }, 220);
  }
  /* arrastrar la hoja hacia abajo la cierra (celular) */
  function arrastrarHoja(h) {
    var y0 = null, dy = 0, pid = null;
    h.addEventListener('pointerdown', function (ev) {
      if (pc()) return;
      var asa = ev.target.closest('.navr-asa, .navr-tit');
      if (!asa && h.querySelector('.navr-cuerpo').scrollTop > 0) return;
      y0 = ev.clientY; dy = 0; pid = ev.pointerId;
    });
    h.addEventListener('pointermove', function (ev) {
      if (y0 == null || ev.pointerId !== pid) return;
      dy = Math.max(0, ev.clientY - y0);
      if (dy > 6) { h.style.transition = 'none'; h.style.transform = 'translateY(' + dy + 'px)'; }
    });
    function fin() {
      if (y0 == null) return;
      h.style.transition = ''; h.style.transform = '';
      if (dy > 70) cerrar();
      y0 = null; dy = 0;
    }
    h.addEventListener('pointerup', fin);
    h.addEventListener('pointercancel', fin);
  }

  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && abierto) { cerrar(); if (btn) btn.focus(); } });
  window.addEventListener('hashchange', function () { cerrar(true); setTimeout(montar, 0); });
  window.addEventListener('resize', function () { if (abierto) { cerrar(true); } colocar(); });

  /* permisos que cambian (INVITADO con pastillas nuevas): se rehace la lista */
  if (typeof window.permSet === 'function') {
    var orig = window.permSet;
    window.permSet = function () { var x = orig.apply(this, arguments); if (abierto) pintar(); return x; };
  }

  window.NAVR = { montar: montar, abrir: abrir, cerrar: cerrar };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();

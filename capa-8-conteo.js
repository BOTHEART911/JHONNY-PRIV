/* ============================================================
 * CAPA 8 · CONTEO DE NÚMEROS (JS) — app PRIVADA (JHONNY PRIV)
 * ------------------------------------------------------------
 * QUÉ HACE
 *   Los totales / KPIs que cambian no saltan: suben (o bajan) del
 *   valor viejo al nuevo. Al entrar a una vista cuentan desde cero.
 *   Con EN VIVO esto se nota de verdad: cuando otro equipo registra
 *   a alguien, el número "camina" solo.
 *
 * INSTALACIÓN (al final del <body>, DESPUÉS de <script src="app.js">)
 *   <script src="capa-8-conteo.js"></script>
 *
 * PAREJA
 *   Ninguna. Es autónoma (solo JS).
 *
 * QUÉ VIGILA (y nada más)
 *   .dash-kpis .dk > b      → Dashboard y Simulador
 *   .nt-kpi > b             → Noticias
 *   .an-kpi > b             → Análisis de procesos
 *   .cm-kpi > b             → Compromisos
 *   .voto-total-n           → total grande de Votación (EN VIVO)
 *
 * NOTAS
 *   - Formato: usa el mismo de la app, toLocaleString('es-CO')
 *     (esta app no maneja moneda; son enteros y porcentajes).
 *     Conserva el "%" final si lo traía.
 *   - Anti-bucle: marca sus propios elementos (__npCount) y levanta
 *     una bandera mientras escribe, así el observador no se muerde la cola.
 *   - La memoria de valores se borra al cambiar de pantalla.
 *   - Respeta prefers-reduced-motion: escribe el valor final y ya.
 * ============================================================ */

(function () {
  'use strict';

  if (window.__np8Conteo) return;          // guardia anti-doble-instalación
  window.__np8Conteo = true;

  var SEL = '.dash-kpis .dk > b, .nt-kpi > b, .an-kpi > b, .cm-kpi > b, .voto-total-n';
  var DUR = 520;

  var previos = Object.create(null);       // etiqueta → último valor visto
  var escribiendo = false;

  function reducido() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  /* Texto "1.234" / "45%" → { n: 1234, pct: false } */
  function leer(txt) {
    var t = String(txt == null ? '' : txt).trim();
    if (!t) return null;
    var pct = /%\s*$/.test(t);
    var limpio = t.replace(/[^0-9-]/g, '');
    if (!limpio || !/^-?\d+$/.test(limpio)) return null;
    var n = parseInt(limpio, 10);
    if (!isFinite(n)) return null;
    return { n: n, pct: pct };
  }

  function pintar(el, n, pct) {
    escribiendo = true;
    try { el.textContent = n.toLocaleString('es-CO') + (pct ? '%' : ''); }
    finally { escribiendo = false; }
  }

  /* Etiqueta estable del KPI: el <span> hermano, o su clase */
  function clave(el) {
    if (el.classList && el.classList.contains('voto-total-n')) return '__voto_total';
    var p = el.parentElement;
    var s = p && p.querySelector ? p.querySelector('span') : null;
    var txt = s ? String(s.textContent || '').trim() : '';
    return (p && p.className ? p.className : '') + '|' + txt;
  }

  function animar(el, desde, hasta, pct) {
    if (el.__npRaf) cancelAnimationFrame(el.__npRaf);
    var t0 = 0;
    function paso(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / DUR);
      var e = 1 - Math.pow(1 - p, 3);                  // easeOutCubic
      pintar(el, Math.round(desde + (hasta - desde) * e), pct);
      if (p < 1) el.__npRaf = requestAnimationFrame(paso);
      else el.__npRaf = 0;
    }
    el.__npRaf = requestAnimationFrame(paso);
  }

  function tratar(el) {
    if (!el || el.__npCount) return;
    el.__npCount = true;

    var v = leer(el.textContent);
    if (!v) return;

    var k = clave(el);
    var antes = (k in previos) ? previos[k] : 0;
    previos[k] = v.n;

    if (reducido() || antes === v.n) return;
    if (Math.abs(v.n - antes) < 2) return;             // no vale la pena animar 1 unidad

    pintar(el, antes, v.pct);
    animar(el, antes, v.n, v.pct);
  }

  function barrer(raiz) {
    if (!raiz || raiz.nodeType !== 1) return;
    if (raiz.matches && raiz.matches(SEL)) { tratar(raiz); return; }
    if (!raiz.querySelectorAll) return;
    var l = raiz.querySelectorAll(SEL);
    for (var i = 0; i < l.length; i++) tratar(l[i]);
  }

  function arrancar() {
    var app = document.getElementById('app');
    if (!app) return;

    /* Cambio de pantalla = hijos directos de #app → se olvida lo anterior */
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes && muts[i].addedNodes.length) {
          previos = Object.create(null);
          return;
        }
      }
    }).observe(app, { childList: true, subtree: false });

    new MutationObserver(function (muts) {
      if (escribiendo) return;
      for (var i = 0; i < muts.length; i++) {
        var add = muts[i].addedNodes;
        for (var j = 0; j < add.length; j++) barrer(add[j]);
      }
    }).observe(app, { childList: true, subtree: true });

    barrer(app);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();

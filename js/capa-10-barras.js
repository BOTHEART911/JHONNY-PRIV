/* ============================================================
 * CAPA 10 · BARRAS QUE CRECEN (JS) — app PRIVADA (JHONNY PRIV)
 * ------------------------------------------------------------
 * QUÉ HACE
 *   Al ENTRAR a una pantalla con gráficas —o cuando EN VIVO trae
 *   datos nuevos— las barras arrancan en cero y suben en cascada
 *   hasta su valor real.
 *
 * INSTALACIÓN (al final del <body>, DESPUÉS de <script src="app.js">)
 *   <script src="capa-10-barras.js"></script>
 *
 * PAREJA
 *   capa-10-barras.css (obligatoria).
 *
 * QUÉ BARRAS
 *   Dashboard  .dbar-g .dbar-r .ibar-fill
 *   Simulador  .sbar-pot .sbar-real
 *   Votación   .vc-fill
 *   Líderes    .ld-bar-in
 *   Análisis   .an-bar-fill
 *
 * DECISIÓN DE INGENIERÍA (importante)
 *   En app.js, dashRender() y simRender() se vuelven a ejecutar con
 *   CADA TECLA del buscador (debounce de 160 ms) y con cada filtro.
 *   Animar ahí marearía. Por eso la capa solo anima cuando está
 *   "armada", y solo se arma en dos momentos honestos:
 *     1) al pintarse una vista nueva (hijos directos de #app), y
 *     2) cuando EN VIVO refresca de verdad — envuelvo window.vivoCorrer,
 *        que es la única puerta por la que pasa un refresco en vivo.
 *   Al animar el primer grupo, se desarma. Filtrar y teclear no anima:
 *   las barras usan su transición normal de .3s, como hoy.
 *
 * NOTAS
 *   - Lee el ancho objetivo del style inline que ya escribe app.js:
 *     no calcula nada por su cuenta ni cambia ningún dato.
 *   - Los contadores de Votación en vivo (que llegan por Firebase, no
 *     por vivoCorrer) NO animan desde cero: se mueven con su
 *     transición de siempre. Es lo correcto: ahí el número cambia
 *     cada pocos segundos.
 *   - Respeta prefers-reduced-motion: no toca nada.
 * ============================================================ */

(function () {
  'use strict';

  if (window.__np10Barras) return;         // guardia anti-doble-instalación
  window.__np10Barras = true;

  var SEL = '.dbar-g, .dbar-r, .ibar-fill, .sbar-pot, .sbar-real, .vc-fill, .ld-bar-in, .an-bar-fill';
  var ESCALON = 45;                        // ms entre barra y barra
  var TOPE_ESCALON = 420;                  // ms: nadie espera más que esto
  var DUR = 620;                           // debe casar con el CSS (.62s)
  var VIDA_ARMADO = 10000;                 // si la vista no pinta barras, se desarma sola

  var armado = 0;                          // marca de tiempo del armado
  var lote = [];
  var timer = null;

  function reducido() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  function armar() { armado = Date.now(); }
  function estaArmado() { return armado && (Date.now() - armado) < VIDA_ARMADO; }

  function encolar(el) {
    if (!el || el.__npBar) return;
    el.__npBar = true;

    var destino = el.style && el.style.width;
    if (!destino) return;                  // sin ancho inline no hay nada que animar

    el.style.width = '0%';                 // en cero ANTES de que el navegador pinte
    lote.push({ el: el, w: destino });

    if (timer) clearTimeout(timer);
    timer = setTimeout(soltar, 30);        // agrupa todas las barras del mismo render
  }

  function soltar() {
    timer = null;
    var grupo = lote;
    lote = [];
    if (!grupo.length) return;

    armado = 0;                            // un grupo por armado

    grupo.forEach(function (b, i) {
      var d = Math.min(i * ESCALON, TOPE_ESCALON);
      setTimeout(function () {
        if (!b.el.isConnected) return;
        b.el.classList.add('np-bar-anim');
        b.el.style.width = b.w;
        setTimeout(function () { b.el.classList.remove('np-bar-anim'); }, DUR + 80);
      }, d);
    });
  }

  function barrer(raiz) {
    if (!raiz || raiz.nodeType !== 1) return;
    if (!estaArmado()) return;
    if (raiz.matches && raiz.matches(SEL)) { encolar(raiz); return; }
    if (!raiz.querySelectorAll) return;
    var l = raiz.querySelectorAll(SEL);
    for (var i = 0; i < l.length; i++) encolar(l[i]);
  }

  function arrancar() {
    var app = document.getElementById('app');
    if (!app) return;
    if (reducido()) return;

    /* 1) Vista nueva = hijos directos de #app */
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes && muts[i].addedNodes.length) { armar(); return; }
      }
    }).observe(app, { childList: true, subtree: false });

    /* 2) Refresco EN VIVO: envuelvo la única puerta de entrada */
    if (typeof window.vivoCorrer === 'function' && !window.vivoCorrer.__np10) {
      var orig = window.vivoCorrer;
      var envuelto = function () { armar(); return orig.apply(this, arguments); };
      envuelto.__np10 = true;
      window.vivoCorrer = envuelto;
    }

    /* 3) Las barras, cuando aparezcan */
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var add = muts[i].addedNodes;
        for (var j = 0; j < add.length; j++) barrer(add[j]);
      }
    }).observe(app, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();

/* ============================================================
 * CAPA 5 · ESQUELETOS DE CARGA (JS) — app PRIVADA (JHONNY PRIV)
 * ------------------------------------------------------------
 * QUÉ HACE
 *   Cuando una LISTA se está cargando, cambia el girador por una
 *   silueta gris con brillo con la forma real de lo que va a llegar
 *   (personas, tarjetas, barras, KPIs…).
 *
 * INSTALACIÓN (al final del <body>, DESPUÉS de <script src="app.js">)
 *   <script src="capa-5-esqueletos.js"></script>
 *
 * PAREJA
 *   capa-5-esqueletos.css (obligatoria).
 *
 * CÓMO SE ENGANCHA
 *   En app.js, `loadingBox(text)` es la ÚNICA fuente de
 *   `<div class="loadbox">`. Vigilo con un MutationObserver la
 *   aparición de .loadbox DENTRO de #app y la sustituyo por la
 *   silueta que toca según el id del contenedor.
 *
 * LO QUE NO TOCA (a propósito)
 *   - #ios-loader (girador global de guardar / login).
 *   - El spinner que saving() mete dentro de los botones.
 *   - Los .loadbox que salen DENTRO de las hojas (#layer): ahí el
 *     girador es correcto, la hoja es pequeña y dura un instante.
 *
 * NOTAS
 *   - Prefijo np- (nt- ya es del módulo Noticias en esta app).
 *   - Si el contenedor no está en el mapa, cae en una silueta de
 *     texto genérica: nunca deja la pantalla en blanco.
 * ============================================================ */

(function () {
  'use strict';

  if (window.__np5Esqueletos) return;      // guardia anti-doble-instalación
  window.__np5Esqueletos = true;

  /* ---------- piezas ---------- */
  function linea(w) { return '<span class="np-sk np-sk-line ' + (w || 'np-w90') + '"></span>'; }

  function persona() {
    return '<div class="np-sk-card">' +
             '<span class="np-sk np-sk-round"></span>' +
             '<span class="np-sk-col">' + linea('np-w70') + linea('np-w40') + '</span>' +
           '</div>';
  }

  function tarjeta() {
    return '<div class="np-sk-card np-col">' +
             '<span class="np-sk np-sk-title"></span>' +
             linea('np-w90') + linea('np-w55') +
           '</div>';
  }

  function noticia() {
    return '<div class="np-sk-card np-col">' +
             '<span class="np-sk np-sk-media"></span>' +
             '<span class="np-sk np-sk-title"></span>' +
             linea('np-w70') +
           '</div>';
  }

  function media() {
    return '<div class="np-sk-card">' +
             '<span class="np-sk np-sk-sq"></span>' +
             '<span class="np-sk-col">' + linea('np-w70') + linea('np-w40') + '</span>' +
           '</div>';
  }

  function barra() {
    return '<div class="np-sk-barrow">' +
             linea('np-w40') +
             '<span class="np-sk np-sk-bar"></span>' +
           '</div>';
  }

  function kpis() {
    return '<div class="np-sk-kpis">' +
             '<span class="np-sk np-sk-kpi"></span><span class="np-sk np-sk-kpi"></span>' +
             '<span class="np-sk np-sk-kpi"></span><span class="np-sk np-sk-kpi"></span>' +
           '</div>';
  }

  function repetir(fn, n) { var s = ''; for (var i = 0; i < n; i++) s += fn(); return s; }

  /* ---------- recetas por contenedor real de app.js ---------- */
  var RECETAS = {
    'bd-body':      function () { return repetir(persona, 4); },                        // Base de Datos
    'ld-body':      function () { return repetir(persona, 4); },                        // Líderes
    'ev-asis-body': function () { return repetir(persona, 5); },                        // Asistentes de un evento
    'ev-body':      function () { return repetir(tarjeta, 3); },                        // Eventos
    'cm-body':      function () { return repetir(tarjeta, 3); },                        // Compromisos
    'nt-body':      function () { return repetir(noticia, 3); },                        // Noticias
    'dash-body':    function () { return kpis() + repetir(barra, 5); },                 // Dashboard
    'sim-body':     function () { return kpis() + repetir(barra, 4); },                 // Simulador
    'an-body':      function () { return kpis() + repetir(barra, 4); },                 // Análisis
    'voto-counters':function () { return repetir(barra, 5); },                          // Votación
    'ag-cal':       function () { return '<span class="np-sk np-sk-block"></span>'; },  // Agenda (calendario)
    'cf-map':       function () { return '<span class="np-sk np-sk-block"></span>'; },  // Mapa de Configuración
    'cf-root':      function () { return repetir(tarjeta, 3); },                        // Configuración
    'bot-body':     function () { return repetir(media, 3); },                          // Mi Bot
    'bot-bl':       function () { return repetir(persona, 3); }                         // Bot · bloqueados
  };

  function generica() { return repetir(tarjeta, 3); }

  function receta(el) {
    var n = el.parentElement;
    for (var i = 0; i < 4 && n; i++) {
      if (n.id && RECETAS[n.id]) return RECETAS[n.id];
      n = n.parentElement;
    }
    return generica;
  }

  function sustituir(box) {
    if (!box || box.__npHecho) return;
    box.__npHecho = true;
    var wrap = document.createElement('div');
    wrap.className = 'np-sk-wrap';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = receta(box)();
    if (box.parentNode) box.parentNode.replaceChild(wrap, box);
  }

  function barrer(raiz) {
    if (raiz.nodeType !== 1) return;
    if (raiz.classList && raiz.classList.contains('loadbox')) { sustituir(raiz); return; }
    if (!raiz.querySelectorAll) return;
    var l = raiz.querySelectorAll('.loadbox');
    for (var i = 0; i < l.length; i++) sustituir(l[i]);
  }

  function arrancar() {
    var app = document.getElementById('app');
    if (!app) return;

    barrer(app);   // por si ya había uno pintado

    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var add = muts[i].addedNodes;
        for (var j = 0; j < add.length; j++) barrer(add[j]);
      }
    });

    obs.observe(app, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();

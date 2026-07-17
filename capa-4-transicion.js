/* ============================================================
 * CAPA 4 · TRANSICIÓN LATERAL ENTRE PANTALLAS (JS)
 * app PRIVADA (JHONNY PRIV)
 * ------------------------------------------------------------
 * QUÉ HACE
 *   Detecta cada cambio de pantalla y le pone la animación lateral:
 *   adelante = entra desde la derecha, atrás = entra desde la izquierda.
 *
 * INSTALACIÓN (al final del <body>, DESPUÉS de <script src="app.js">)
 *   <script src="capa-4-transicion.js"></script>
 *
 * PAREJA
 *   capa-4-transicion.css (obligatoria).
 *
 * POR QUÉ ASÍ (y no envolviendo la función de vista)
 *   En app.js el router es `render()` y el enganche es
 *   `window.addEventListener('hashchange', render)`: ese listener ya
 *   guardó la referencia ORIGINAL, así que reemplazar window.render NO
 *   intercepta la navegación. Además varias pantallas se pintan sin
 *   tocar el hash. Por eso vigilo los HIJOS DIRECTOS de #app con un
 *   MutationObserver: cada vez que una vista se pinta entera
 *   (app.innerHTML = ...) hay cambio de hijos directos, y los
 *   repintados internos (listas, EN VIVO, #dash-body…) NO disparan nada.
 *
 * NOTAS
 *   - "Atrás" se detecta por el botón real de la app: #backbtn
 *     (ventana de 1500 ms) y, como respaldo, por la pila de hashes.
 *   - No toca app.js ni style.css. Para quitarla: borra la línea.
 *   - Respeta prefers-reduced-motion (no anima).
 * ============================================================ */

(function () {
  'use strict';

  if (window.__np4Transicion) return;      // guardia anti-doble-instalación
  window.__np4Transicion = true;

  var DUR = 300;                            // debe casar con el CSS (.30s)
  var ANTIRREBOTE = 90;                     // agrupa mutaciones seguidas
  var VENTANA_ATRAS = 1500;                 // ms de validez del toque en "atrás"

  function reducido() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  function arrancar() {
    var app = document.getElementById('app');
    if (!app) return;

    document.documentElement.classList.add('np-tx');   // apaga el fade de la capa 1

    var ultimoAtras = 0;
    var pilaHashes = [location.hash || ''];
    var timer = null;
    var limpiar = null;

    /* --- Señal de "atrás": el botón real de la app --- */
    document.addEventListener('pointerdown', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('#backbtn')) ultimoAtras = Date.now();
    }, true);

    /* --- Respaldo: pila de hashes --- */
    window.addEventListener('hashchange', function () {
      var h = location.hash || '';
      if (pilaHashes.length > 1 && pilaHashes[pilaHashes.length - 2] === h) {
        pilaHashes.pop();
        ultimoAtras = Date.now();
      } else {
        pilaHashes.push(h);
        if (pilaHashes.length > 12) pilaHashes.shift();
      }
    });

    function esAtras() {
      return (Date.now() - ultimoAtras) < VENTANA_ATRAS;
    }

    function animar() {
      if (reducido()) return;
      if (app.hidden) return;               // el splash sigue arriba: aún no hay vista

      var clase = esAtras() ? 'np-view-back' : 'np-view-in';
      ultimoAtras = 0;

      var html = document.documentElement;
      app.classList.remove('np-view-in', 'np-view-back');
      void app.offsetWidth;                 // reinicia la animación
      html.classList.add('np-tx-anim');
      app.classList.add(clase);

      if (limpiar) clearTimeout(limpiar);
      limpiar = setTimeout(function () {
        app.classList.remove('np-view-in', 'np-view-back');
        html.classList.remove('np-tx-anim');
        limpiar = null;
      }, DUR + 60);
    }

    var obs = new MutationObserver(function (muts) {
      var hay = false;
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes && muts[i].addedNodes.length) { hay = true; break; }
      }
      if (!hay) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { timer = null; animar(); }, ANTIRREBOTE);
    });

    obs.observe(app, { childList: true, subtree: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();

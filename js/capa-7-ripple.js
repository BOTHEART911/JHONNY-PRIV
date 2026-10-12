/* ============================================================
 * CAPA 7 · ONDA AL TOCAR / RIPPLE (JS) — app PRIVADA (JHONNY PRIV)
 * ------------------------------------------------------------
 * QUÉ HACE
 *   Escucha el toque (pointerdown) en todo el documento y, si cayó
 *   sobre un control de la lista curada, dibuja la onda desde ese punto.
 *
 * INSTALACIÓN (al final del <body>, DESPUÉS de <script src="app.js">)
 *   <script src="capa-7-ripple.js"></script>
 *
 * PAREJA
 *   capa-7-ripple.css (obligatoria).
 *
 * NOTAS
 *   - Delegación en captura sobre document: funciona también con los
 *     controles que la app pinta después (listas, hojas, EN VIVO).
 *   - Nunca hace preventDefault ni stopPropagation: los onclick de
 *     app.js siguen exactamente igual.
 *   - Una sola onda por toque: gana el control más interno (closest),
 *     así el botón de una tarjeta no dispara también la tarjeta.
 *   - Salta los controles deshabilitados y los .tile.soon.
 *   - Red de seguridad: la onda se borra a los 700 ms aunque el
 *     navegador no dispare animationend.
 * ============================================================ */

(function () {
  'use strict';

  if (window.__np7Ripple) return;          // guardia anti-doble-instalación
  window.__np7Ripple = true;

  var SEL = '.btn, .tile, .chip, .bd-chip, .seg-b, .icon-btn, .pin-key, ' +
            '.bd-btn, .acc-chip, .estado-opt, .combo-opt, .sbar-toggle, ' +
            'button.nt-kpi, .cm-kpi';

  function reducido() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  function onda(e) {
    if (reducido()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    var t = e.target;
    if (!t || !t.closest) return;

    var el = t.closest(SEL);
    if (!el) return;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    if (el.classList.contains('soon')) return;

    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;

    // Que la posición sea relativa SOLO si era estática (no piso estilos propios)
    var pos = '';
    try { pos = window.getComputedStyle(el).position; } catch (err) { pos = ''; }
    if (pos === 'static' || pos === '') el.style.position = 'relative';

    var x = (e.clientX != null ? e.clientX : r.left + r.width / 2) - r.left;
    var y = (e.clientY != null ? e.clientY : r.top + r.height / 2) - r.top;

    // Diámetro = 2 × la distancia a la esquina más lejana
    var dx = Math.max(x, r.width - x);
    var dy = Math.max(y, r.height - y);
    var d = 2 * Math.sqrt(dx * dx + dy * dy);

    var s = document.createElement('span');
    s.className = 'np-ripple';
    s.setAttribute('aria-hidden', 'true');
    s.style.width = s.style.height = d + 'px';
    s.style.left = (x - d / 2) + 'px';
    s.style.top = (y - d / 2) + 'px';
    el.appendChild(s);

    var fuera = function () { if (s.parentNode) s.parentNode.removeChild(s); };
    s.addEventListener('animationend', fuera);
    setTimeout(fuera, 700);                // red de seguridad
  }

  document.addEventListener('pointerdown', onda, true);
})();

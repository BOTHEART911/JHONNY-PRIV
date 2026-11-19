/* ============================================================================
 * ARRASTRE HORIZONTAL CON EL MOUSE (19/11/2026)
 * ----------------------------------------------------------------------------
 * En PC, las filas que se desbordan a lo ancho (filtros de Base de datos,
 * Actividad, pastillas de Líderes, pestañas de Configuración, tablas y
 * gráficas anchas…) se corren arrastrando con clic sostenido, como con el
 * dedo en el celular. Sirve para cualquier contenedor con overflow-x
 * auto/scroll que de verdad se desborde: no hay que marcar nada en el HTML.
 * - Solo mouse (en celular y tableta manda el dedo, que ya funciona).
 * - Un clic normal sigue siendo clic: el arrastre arranca después de 6 px y,
 *   si hubo arrastre, el clic que lo cierra se anula.
 * - No se mete con campos de texto, listas, ni con el robot / botones flotantes.
 * Sin viajes al servidor; sin librerías.
 * ========================================================================== */
(function () {
  'use strict';
  if (window.ARRASTRE_X) return;
  var UMBRAL = 6;
  var NO = 'input, textarea, select, [contenteditable="true"], .ia-fab, .navr-fab, .navr-hoja, [draggable="true"]';
  var act = null;   /* { el, x0, s0, movido, id } */

  function desborda(el) {
    if (!el || el.nodeType !== 1 || el === document.body || el === document.documentElement) return false;
    if (el.scrollWidth <= el.clientWidth + 2) return false;
    var ox = getComputedStyle(el).overflowX;
    return ox === 'auto' || ox === 'scroll';
  }
  function contenedor(t) {
    for (var el = t; el && el !== document.body; el = el.parentElement) if (desborda(el)) return el;
    return null;
  }

  document.addEventListener('pointerdown', function (ev) {
    if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
    if (ev.target.closest && ev.target.closest(NO)) return;
    var el = contenedor(ev.target);
    if (!el) return;
    act = { el: el, x0: ev.clientX, s0: el.scrollLeft, movido: false, id: ev.pointerId };
  }, true);

  document.addEventListener('pointermove', function (ev) {
    if (!act || ev.pointerId !== act.id) return;
    if (!(ev.buttons & 1)) { soltar(); return; }
    var dx = ev.clientX - act.x0;
    if (!act.movido) {
      if (Math.abs(dx) < UMBRAL) return;
      act.movido = true;
      act.el.classList.add('ax-arrastrando');
      document.documentElement.classList.add('ax-arrastre');
      try { act.el.setPointerCapture(ev.pointerId); } catch (e) {}
    }
    act.el.scrollLeft = act.s0 - dx;
    ev.preventDefault();
  }, true);

  function soltar() {
    if (!act) return;
    var a = act; act = null;
    a.el.classList.remove('ax-arrastrando');
    document.documentElement.classList.remove('ax-arrastre');
    try { a.el.releasePointerCapture(a.id); } catch (e) {}
    if (a.movido) {
      /* el clic que cierra el arrastre no debe activar la pastilla de abajo */
      var anular = function (e) { e.stopPropagation(); e.preventDefault(); };
      document.addEventListener('click', anular, { capture: true, once: true });
      setTimeout(function () { document.removeEventListener('click', anular, true); }, 0);
    }
  }
  document.addEventListener('pointerup', soltar, true);
  document.addEventListener('pointercancel', soltar, true);
  /* el navegador no debe arrastrar imágenes/enlaces mientras se corre la fila */
  document.addEventListener('dragstart', function (ev) { if (act && act.movido) ev.preventDefault(); }, true);

  /* mano de agarrar sobre lo que se puede correr (se calcula al pasar, barato) */
  var ultimo = null, raf = 0;
  document.addEventListener('mouseover', function (ev) {
    if (raf) return;
    var t = ev.target;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var el = (t && t.closest && t.closest(NO)) ? null : contenedor(t);
      if (el === ultimo) return;
      if (ultimo) ultimo.classList.remove('ax-puede');
      ultimo = el;
      if (el) el.classList.add('ax-puede');
    });
  }, { passive: true });

  window.ARRASTRE_X = { contenedor: contenedor };
})();

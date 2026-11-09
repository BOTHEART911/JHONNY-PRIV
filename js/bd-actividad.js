/* ============================================================================
 * JHONNY PRIV · BASE DE DATOS — FILTROS POR ACTIVIDAD (09/11/2026)
 * ----------------------------------------------------------------------------
 * Fila de pastillas: Servicios · Compromisos · Eventos · Formularios. Cada una
 * cuenta las personas de la lista que tienen al menos uno, respetando los
 * demás filtros (municipio/estado, intención, líder y búsqueda).
 *
 *  · Servicios, Eventos y Formularios abren una 2.ª fila con una pastilla por
 *    servicio / evento creado / formulario creado y cuántas personas tiene.
 *    Tocar una deja en la lista solo esas personas; tocarla otra vez la quita.
 *  · Compromisos solo filtra (sin 2.ª fila).
 *  · Tocar de nuevo la pastilla activa la quita y cierra la 2.ª fila.
 *
 * El dato viaja CON la lista (priv.baseDatos act=1 → r.act, ver
 * BD_Actividad.gs): cero viajes extra. Conteos en el teléfono; las reglas del
 * filtro las usa también bdPasaResto (app.js), así lista, conteos y tendencia
 * cuadran. Sin r.act (CORE anterior) la fila no se muestra.
 * Tiempo de pantalla: RED.pantalla('bd.actividad').
 * ============================================================================ */
(function () {
  'use strict';

  var CAT = [
    { k: 's', t: 'Servicios', sub: true },
    { k: 'c', t: 'Compromisos', sub: false },
    { k: 'e', t: 'Eventos', sub: true },
    { k: 'f', t: 'Formularios', sub: true }
  ];
  var A = null;          // { s:{n,d:Map}, c:{d:Map}, e:{n,d:Map}, f:{n,d:Map} }
  var SEL = '';          // categoría elegida ('' = ninguna)
  var ITEM = -1;         // pastilla de la 2.ª fila elegida (-1 = todas)
  var DOCS = new WeakMap();

  function n(x) { return Number(x || 0).toLocaleString('es-CO'); }
  function e(s) { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); }
  function docDe(c) {
    var d = DOCS.get(c);
    if (d === undefined) { d = String(c && c.documento != null ? c.documento : '').replace(/\D/g, ''); DOCS.set(c, d); }
    return d;
  }
  function mapa(o) { var m = new Map(); if (o) Object.keys(o).forEach(function (k) { m.set(k, o[k]); }); return m; }

  /* ---------- dato ---------- */
  window.bdActDato = function (act) {
    if (!act || typeof act !== 'object' || !act.c) { A = null; SEL = ''; ITEM = -1; return; }
    A = {
      s: { n: (act.s && act.s.n) || [], d: mapa(act.s && act.s.d) },
      c: { d: mapa(act.c && act.c.d) },
      e: { n: ((act.e && act.e.n) || []).map(function (x) { return { id: x[0], t: x[1], f: x[2] || '' }; }), d: mapa(act.e && act.e.d) },
      f: { n: ((act.f && act.f.n) || []).map(function (x) { return { id: x[0], t: x[1] }; }), d: mapa(act.f && act.f.d) }
    };
    var nombres = A.s.n.map(String);
    A.s.n = nombres.map(function (t) { return { t: t }; });
    /* lo elegido se conserva si sigue existiendo (refresco de fondo) */
    if (SEL && ITEM >= 0 && A[SEL].n && ITEM >= A[SEL].n.length) ITEM = -1;
  };

  /* ¿la persona pasa el filtro de actividad? (sin categoría = sí) */
  window.bdActPasa = function (c) {
    if (!A || !SEL) return true;
    var v = A[SEL].d.get(docDe(c));
    if (v == null) return false;
    if (ITEM < 0 || SEL === 'c') return true;
    return v.indexOf(ITEM) !== -1;
  };
  window.bdActTxt = function () {
    if (!A || !SEL) return '';
    var cat = CAT.filter(function (x) { return x.k === SEL; })[0];
    var it = (ITEM >= 0 && A[SEL].n) ? A[SEL].n[ITEM] : null;
    return cat.t + (it ? ': ' + it.t : '');
  };

  /* ---------- conteos (respetan los demás filtros) ---------- */
  function contar() {
    var q = bdQ(), f = bdActiveFilter();
    var cat = { s: 0, c: 0, e: 0, f: 0 }, sub = null;
    if (SEL && A[SEL].n) sub = A[SEL].n.map(function () { return 0; });
    for (var i = 0; i < BD_ALL.length; i++) {
      var c = BD_ALL[i];
      if (!bdPasaChip(c, f) || !bdPasaResto(c, q, false, true)) continue;
      var d = docDe(c);
      if (A.s.d.has(d)) cat.s++;
      if (A.c.d.has(d)) cat.c++;
      if (A.e.d.has(d)) cat.e++;
      if (A.f.d.has(d)) cat.f++;
      if (sub) { var v = A[SEL].d.get(d); if (v) for (var j = 0; j < v.length; j++) sub[v[j]]++; }
    }
    return { cat: cat, sub: sub };
  }

  /* ---------- pintar ---------- */
  function fila1(r) {
    return '<span class="bd-chips-lbl">Actividad:</span>' + CAT.map(function (x) {
      var v = r.cat[x.k];
      return '<button type="button" class="bd-chip bd-chip-act' + (SEL === x.k ? ' active' : '') + (!v && SEL !== x.k ? ' bd-chip-cero' : '') +
        '" data-act="' + x.k + '" aria-pressed="' + (SEL === x.k) + '">' + x.t + ' <span class="bd-chip-n">' + n(v) + '</span>' +
        (x.sub ? '<i class="bda-car" aria-hidden="true"></i>' : '') + '</button>';
    }).join('');
  }
  function fila2(r) {
    var lista = A[SEL].n || [];
    if (!lista.length) return '<span class="bd-chips-lbl">' + e(CAT.filter(function (x) { return x.k === SEL; })[0].t) + ':</span><span class="muted small bda-vacio">Todavía no hay ' + (SEL === 'e' ? 'eventos creados' : SEL === 'f' ? 'formularios creados' : 'servicios') + '.</span>';
    return lista.map(function (it, i) {
      var v = r.sub[i];
      var tip = it.t + (it.f ? ' · ' + it.f : '');
      return '<button type="button" class="bd-chip bd-chip-act2' + (ITEM === i ? ' active' : '') + (!v && ITEM !== i ? ' bd-chip-cero' : '') +
        '" data-i="' + i + '" title="' + e(tip) + '"><span class="bda-t">' + e(it.t) + '</span>' +
        (it.f ? '<span class="bda-f">' + e(fechaCorta(it.f)) + '</span>' : '') +
        ' <span class="bd-chip-n">' + n(v) + '</span></button>';
    }).join('');
  }
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fechaCorta(f) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(f || ''); return m ? (+m[3]) + ' ' + MES[+m[2] - 1] + ' ' + m[1].slice(2) : ''; }

  function asegurarCajas() {
    var c1 = document.getElementById('bd-chips-act');
    if (c1) return true;
    var ancla = document.getElementById('bd-chips-int'); if (!ancla) return false;
    ancla.insertAdjacentHTML('afterend', '<div class="bd-chips bd-chips-act" id="bd-chips-act" hidden></div><div class="bd-chips bd-chips-act2" id="bd-chips-act2" hidden></div>');
    document.getElementById('bd-chips-act').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return;
      var k = b.dataset.act;
      if (SEL === k) { SEL = ''; ITEM = -1; } else { SEL = k; ITEM = -1; }
      bdApplyFilter();
      if (SEL) { var c2 = document.getElementById('bd-chips-act2'); if (c2) c2.scrollLeft = 0; }
    });
    document.getElementById('bd-chips-act2').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-i]'); if (!b) return;
      var i = +b.dataset.i;
      ITEM = (ITEM === i) ? -1 : i;
      bdApplyFilter();
    });
    return true;
  }

  window.bdActPintar = function () {
    var t0 = performance.now();
    try {
      if (!asegurarCajas()) return;
      var c1 = document.getElementById('bd-chips-act'), c2 = document.getElementById('bd-chips-act2');
      if (!A) { c1.hidden = true; c2.hidden = true; c1.innerHTML = ''; c2.innerHTML = ''; return; }
      var r = contar();
      var h1 = fila1(r);
      if (c1.__h !== h1) { c1.innerHTML = h1; c1.__h = h1; }
      c1.hidden = false;
      var sub = SEL && CAT.filter(function (x) { return x.k === SEL; })[0].sub;
      if (sub) {
        var h2 = fila2(r);
        if (c2.__h !== h2) { var sl = c2.scrollLeft; c2.innerHTML = h2; c2.__h = h2; c2.scrollLeft = sl; }
        c2.hidden = false;
      } else { c2.hidden = true; c2.innerHTML = ''; c2.__h = ''; }
    } catch (err) { try { console.warn('bdActPintar', err); } catch (x) {} }
    try { window.RED && RED.pantalla && RED.pantalla('bd.actividad', performance.now() - t0); } catch (x) {}
  };

  /* Al entrar de nuevo a la vista se empieza sin filtro de actividad */
  window.bdActReiniciar = function () { SEL = ''; ITEM = -1; };
  window.bdActEstado = function () { return { sel: SEL, item: ITEM, hay: !!A }; };   // para verificar desde la consola
})();

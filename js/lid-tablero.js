/* ============================================================================
 * JHONNY PRIV · LÍDERES → TABLERO (13/11/2026)
 * ----------------------------------------------------------------------------
 * Crecimiento y tipificación de cada líder, mes a mes, con vista general
 * (comparativo / ranking del mes) y detalle por líder.
 *
 *  · UNA ruta, UN viaje: priv.lideresTablero (Lideres_Tablero.gs) trae los
 *    agregados ya armados (nuevos por mes, tipificación del mes en vivo,
 *    meses cerrados de BALANCES, validaciones, bitácoras, actualizaciones,
 *    estados de consulta, nombres y fotos). Caché de sesión (RAP) con rv:
 *    reabrir es instantáneo y solo vuelve a pedir si cambió algo.
 *  · Todo lo demás (puntaje, niveles, ranking, variaciones, gráficas) se
 *    calcula y dibuja AQUÍ, sin librerías: barras en HTML, líneas en SVG.
 *  · El mes en curso va EN VIVO (no espera el cierre del día 1).
 *
 * PUNTAJE DE GESTIÓN (decisión de Oss, 13/11/2026), 0–100:
 *    75 × (intención registrada ÷ referidos)
 *  + 25 × (contacto efectivo ÷ referidos)
 *    contacto efectivo = tipificados que NO quedaron en "No contactado".
 *  Escala: Excelente ≥ 80 · Bueno 60–79 · Regular 40–59 · Bajo < 40.
 *
 * Medición: RED.pantalla('lid.tablero') (pintura completa) y
 * RED.pantalla('lid.tablero.det') (detalle de un líder).
 * Sin CORE nuevo: la vista avisa que falta desplegar y no rompe nada.
 * ============================================================================ */
(function () {
  'use strict';

  var MES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MES_L = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var NIVELES = [
    { k: 'exc', min: 80, t: 'Excelente' },
    { k: 'bue', min: 60, t: 'Bueno' },
    { k: 'reg', min: 40, t: 'Regular' },
    { k: 'baj', min: 0, t: 'Bajo' }
  ];
  /* Tipificación: mismo orden y colores que la ficha del líder (li-*) */
  var TIPOS = [
    { i: 1, t: 'Firme con el voto', c: 'li-firme' },
    { i: 2, t: 'No vota con nosotros', c: 'li-novota' },
    { i: 3, t: 'No está seguro(a)', c: 'li-duda' },
    { i: 4, t: 'No sabe votar', c: 'li-nosabe' },
    { i: 5, t: 'No contactado', c: 'li-nocont' },
    { i: 6, t: 'Otra', c: 'li-otra' }
  ];
  var ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>';

  var LT = { d: null, mes: '', orden: 'pts', nivel: '', q: '', me: '', det: '', tabla: false, firma: '' };

  /* ------------------------------------------------------------ utilidades */
  function e(s) { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); }
  function n(x) { return Number(x || 0).toLocaleString('es-CO'); }
  function pc(a, b) { return b ? Math.round(a * 100 / b) : 0; }
  function kCorto(k) { return MES_C[+k.slice(5, 7) - 1] + ' ' + k.slice(2, 4); }
  /* Etiqueta de eje en dos renglones: el mes y, debajo, el año solo en enero
     o en la primera columna (así 17 meses caben sin pisarse). */
  function kEje(k, i) { var m = +k.slice(5, 7); return e(MES_C[m - 1]) + ((m === 1 || i === 0) ? '<small>' + k.slice(0, 4) + '</small>' : '<small>&nbsp;</small>'); }
  function kLargo(k) { return MES_L[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4); }
  function nivel(p) {
    if (p == null) return { k: 'sin', t: 'Sin datos' };
    for (var i = 0; i < NIVELES.length; i++) if (p >= NIVELES[i].min) return NIVELES[i];
    return NIVELES[NIVELES.length - 1];
  }
  function puntaje(t) {
    if (!t || !t.ref) return null;
    return Math.round(75 * t.trab / t.ref + 25 * Math.max(0, t.trab - t.noCont) / t.ref);
  }
  function varHtml(a, b, suf, vs) {
    if (b == null) return '';
    var d = a - b;
    var cls = d > 0 ? 'up' : d < 0 ? 'down' : 'eq';
    var fl = d > 0 ? '▲' : d < 0 ? '▼' : '＝';
    var p = b ? ' (' + (d > 0 ? '+' : '') + Math.round(d * 100 / b) + '%)' : '';
    return '<span class="lt-var ' + cls + '">' + fl + ' ' + (d > 0 ? '+' : '') + n(d) + (suf || '') + p + (vs ? ' vs ' + e(vs) : '') + '</span>';
  }
  function medir(nombre, t0) { try { if (window.RED && RED.pantalla) RED.pantalla(nombre, performance.now() - t0); } catch (x) {} }
  function claseInfo(v) { try { return (typeof ldClaseInfo === 'function') ? ldClaseInfo(v) : null; } catch (x) { return null; } }

  /* --------------------------------------------- datos → estructura de vista */
  function tipVivo(t) {
    var trab = t[1] + t[2] + t[3] + t[4] + t[5] + t[6];
    return { ref: t[0], firme: t[1], noVota: t[2], noSeguro: t[3], noSabe: t[4], noCont: t[5], otra: t[6], trab: trab, noFid: Math.max(0, t[0] - trab), vivo: true };
  }
  function tipBal(a) {
    var suma = a[1] + a[2] + a[3] + a[4] + a[5];
    return { ref: a[0], firme: a[1], noVota: a[2], noSeguro: a[3], noSabe: a[4], noCont: a[5], otra: Math.max(0, a[7] - suma), trab: a[7], noFid: a[6], vivo: false };
  }
  function sumarTip(acc, t) {
    ['ref', 'firme', 'noVota', 'noSeguro', 'noSabe', 'noCont', 'otra', 'trab', 'noFid'].forEach(function (k) { acc[k] = (acc[k] || 0) + (t[k] || 0); });
    return acc;
  }

  function preparar(r) {
    var M = r.meses || [], hoy = r.hoy, ix = {};
    M.forEach(function (m, i) { ix[m] = i; });
    var bal = r.bal || {}, val = r.val || {}, bit = r.bit || {};
    var conTip = {};               // meses con tipificación guardada o en vivo
    conTip[hoy] = 1;
    Object.keys(bal).forEach(function (c) { Object.keys(bal[c]).forEach(function (m) { if (ix[m] != null) conTip[m] = 1; }); });
    var mesesTip = M.filter(function (m) { return conTip[m]; });

    var G = { nuevos: M.map(function () { return 0; }), acum: [], al: M.map(function () { return 0; }), ae: M.map(function () { return 0; }),
              val: M.map(function () { return 0; }), bit: M.map(function () { return 0; }), tip: {}, pts: {} };
    var lideres = Object.keys(r.lid || {}).map(function (cod) {
      var o = r.lid[cod];
      var acum = [], s = o.sf || 0;
      M.forEach(function (m, i) { s += o.n[i] || 0; acum.push(s); G.nuevos[i] += o.n[i] || 0; G.al[i] += o.al[i] || 0; G.ae[i] += o.ae[i] || 0; });
      var tip = {}, pts = {};
      mesesTip.forEach(function (m) {
        var t = null;
        if (m === hoy) t = tipVivo(o.t || [0, 0, 0, 0, 0, 0, 0]);
        else if (bal[cod] && bal[cod][m]) t = tipBal(bal[cod][m]);
        if (!t) return;
        tip[m] = t; pts[m] = puntaje(t);
        G.tip[m] = sumarTip(G.tip[m] || {}, t);
      });
      var v = val[cod] || {}, b = bit[cod] || {};
      var va = M.map(function (m, i) { G.val[i] += v[m] || 0; return v[m] || 0; });
      var bi = M.map(function (m, i) { G.bit[i] += b[m] || 0; return b[m] || 0; });
      return { cod: cod, nom: o.nom, foto: o.foto, cl: o.cl, on: o.on, n: o.n, acum: acum, al: o.al, ae: o.ae,
               tip: tip, pts: pts, st: o.st || [0, 0, 0, 0], as: o.as || 0, inac: o.inac || 0, val: va, bit: bi };
    });
    var s = 0; G.nuevos.forEach(function (x) { s += x; G.acum.push(s); });
    var sf = 0; lideres.forEach(function (l) { sf += (l.acum[0] || 0) - (l.n[0] || 0); });
    if (sf) G.acum = G.acum.map(function (x) { return x + sf; });
    mesesTip.forEach(function (m) { G.pts[m] = puntaje(G.tip[m]); });
    return { M: M, ix: ix, hoy: hoy, mesesTip: mesesTip, L: lideres, G: G, generado: r.generado };
  }

  /* Ranking del mes elegido (con filtro de nivel y búsqueda) */
  function filasMes(D, m) {
    var i = D.ix[m];
    return D.L.map(function (l) {
      var t = l.tip[m] || null, p = l.pts[m];
      return { l: l, t: t, p: (p == null ? null : p), nuevos: l.n[i] || 0, prev: i > 0 ? (l.n[i - 1] || 0) : null,
               acum: l.acum[i] || 0, tipPct: t ? pc(t.trab, t.ref) : null };
    });
  }
  function ordenar(F, orden) {
    var k = { pts: 'p', nuevos: 'nuevos', acum: 'acum', tip: 'tipPct' }[orden] || 'p';
    return F.slice().sort(function (a, b) {
      var va = a[k], vb = b[k];
      if (va == null && vb == null) return b.acum - a.acum;
      if (va == null) return 1; if (vb == null) return -1;
      return (vb - va) || (b.acum - a.acum) || (Number(a.l.cod) - Number(b.l.cod));
    });
  }

  /* ---------------------------------------------------------- gráficas */
  /* Barras verticales en HTML (texto nítido, toque fácil, cero librerías).
     it: {k, x (etiqueta), v, cls, tip, on, alto(0-100)} */
  function barras(items, op) {
    op = op || {};
    var max = 0; items.forEach(function (it) { if (it.v > max) max = it.v; });
    var iMax = -1; items.forEach(function (it, i) { if (it.v === max && max > 0) iMax = i; });
    return '<div class="lt-bars' + (op.cls ? ' ' + op.cls : '') + '" role="img" aria-label="' + e(op.aria || '') + '">' +
      items.map(function (it, i) {
        var h = it.alto != null ? it.alto : (max ? it.v * 100 / max : 0);
        var ver = it.on || i === iMax || i === items.length - 1;
        return '<button type="button" class="lt-b' + (it.on ? ' on' : '') + (it.vacio ? ' vacio' : '') + '"' +
          (it.k ? ' data-mes="' + e(it.k) + '"' : '') + ' data-tip="' + e(it.tip || '') + '">' +
          '<span class="lt-bv">' + (ver && !it.vacio ? e(it.lbl != null ? it.lbl : n(it.v)) : '') + '</span>' +
          '<span class="lt-bcol"><span class="lt-bin ' + (it.cls || '') + '" style="height:' + (it.vacio ? 0 : Math.max(it.v ? 3 : 0, h)).toFixed(1) + '%"></span></span>' +
          '<span class="lt-bx">' + kEje(it.k, i) + '</span></button>';
      }).join('') + '</div>';
  }
  /* Columnas 100 % apiladas (tipificación). it: {k, x, segs:[{v,c,t}], tot, tip, on, vacio} */
  function apiladas(items) {
    return '<div class="lt-bars lt-stk" role="img" aria-label="Tipificación por mes">' + items.map(function (it, i) {
      var segs = it.vacio ? '' : it.segs.filter(function (s) { return s.v > 0; }).map(function (s) {
        return '<i class="' + s.c + '" style="height:' + (s.v * 100 / (it.tot || 1)).toFixed(2) + '%"></i>';
      }).join('');
      return '<button type="button" class="lt-b' + (it.on ? ' on' : '') + (it.vacio ? ' vacio' : '') + '"' + (it.k ? ' data-mes="' + e(it.k) + '"' : '') + ' data-tip="' + e(it.tip || '') + '">' +
        '<span class="lt-bv">' + (it.on && !it.vacio ? e(it.lbl || '') : '') + '</span>' +
        '<span class="lt-bcol lt-stk-col">' + segs + '</span><span class="lt-bx">' + kEje(it.k, i) + '</span></button>';
    }).join('') + '</div>';
  }
  /* Línea (acumulado). Trazo en SVG que se estira; los puntos tocables son
     columnas HTML encima (el texto no se deforma). */
  function linea(items, op) {
    op = op || {};
    var max = 0, min = Infinity;
    items.forEach(function (it) { if (it.v > max) max = it.v; if (it.v < min) min = it.v; });
    if (!isFinite(min)) min = 0;
    var base = Math.max(0, min - (max - min) * 0.15), rango = (max - base) || 1;
    var N = items.length, W = 100, H = 100;
    var pts = items.map(function (it, i) { return [N > 1 ? i * W / (N - 1) : W / 2, H - (it.v - base) * H / rango]; });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join(' ');
    var area = d + ' L' + W + ' ' + H + ' L0 ' + H + ' Z';
    var ult = items[N - 1] || { v: 0 };
    return '<div class="lt-line' + (op.cls ? ' ' + op.cls : '') + '" role="img" aria-label="' + e(op.aria || '') + '">' +
      '<div class="lt-line-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="lt-area" d="' + area + '"/><path class="lt-trazo" d="' + d + '" vector-effect="non-scaling-stroke"/></svg>' +
      (N ? '<span class="lt-dot" style="left:' + pts[N - 1][0] + '%;top:' + pts[N - 1][1] + '%"></span>' : '') +
      '<div class="lt-line-hit">' + items.map(function (it) {
        return '<button type="button" class="lt-lh' + (it.on ? ' on' : '') + '"' + (it.k ? ' data-mes="' + e(it.k) + '"' : '') + ' data-tip="' + e(it.tip || '') + '"></button>';
      }).join('') + '</div>' +
      '<span class="lt-line-ult">' + n(ult.v) + '</span></div>' +
      '<div class="lt-line-x">' + items.map(function (it, i) {
        var paso = Math.max(1, Math.ceil(N / 6));
        var ver = (i % paso === 0 && (N - 1 - i >= paso / 2 || i === N - 1)) || i === N - 1;
        return '<span>' + (ver ? e(it.x) : '') + '</span>'; }).join('') + '</div></div>';
  }
  function sparkline(vals) {
    var v = vals.filter(function (x) { return x != null; });
    if (v.length < 2) return '<span class="lt-spark" aria-hidden="true"></span>';
    var N = v.length, pts = v.map(function (x, i) { return (i * 100 / (N - 1)).toFixed(1) + ',' + (30 - x * 0.28).toFixed(1); }).join(' ');
    return '<svg class="lt-spark" viewBox="0 -1 100 32" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts + '" vector-effect="non-scaling-stroke"/></svg>';
  }
  function leyendaTip() {
    return '<div class="lt-ley">' + TIPOS.map(function (t) { return '<span><i class="' + t.c + '"></i>' + e(t.t) + '</span>'; }).join('') +
      '<span><i class="li-nofid"></i>Sin tipificar</span></div>';
  }
  function segsDe(t) {
    var segs = TIPOS.map(function (x) { return { v: [0, t.firme, t.noVota, t.noSeguro, t.noSabe, t.noCont, t.otra][x.i], c: x.c, t: x.t }; });
    segs.push({ v: t.noFid, c: 'li-nofid', t: 'Sin tipificar' });
    return segs;
  }
  function tipTxt(m, t) {
    if (!t) return kLargo(m) + ': sin tipificación guardada';
    return kLargo(m) + (t.vivo ? ' (en vivo)' : '') + ' · ' + n(t.ref) + ' ref. · tipificados ' + pc(t.trab, t.ref) + '% · firmes ' + n(t.firme) +
      ' · no vota ' + n(t.noVota) + ' · no seguro ' + n(t.noSeguro) + ' · no sabe ' + n(t.noSabe) + ' · no contactado ' + n(t.noCont) + ' · sin tipificar ' + n(t.noFid);
  }

  /* ---------------------------------------------------- tooltip (uno solo) */
  var tipEl = null;
  function tipMostrar(el, x, y) {
    var t = el.getAttribute('data-tip'); if (!t) return;
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'lt-tip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
    tipEl.textContent = t; tipEl.hidden = false;
    var r = tipEl.getBoundingClientRect(), vw = window.innerWidth;
    var left = Math.min(vw - r.width - 8, Math.max(8, x - r.width / 2));
    var top = y - r.height - 14; if (top < 8) top = y + 18;
    tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
  }
  function tipOcultar() { if (tipEl) tipEl.hidden = true; }
  function tipEnganchar(raiz) {
    if (!raiz || raiz._ltTip) return; raiz._ltTip = true;
    raiz.addEventListener('pointerover', function (ev) { var b = ev.target.closest && ev.target.closest('[data-tip]'); if (b && ev.pointerType === 'mouse') tipMostrar(b, ev.clientX, ev.clientY); });
    raiz.addEventListener('pointermove', function (ev) { var b = ev.target.closest && ev.target.closest('[data-tip]'); if (b && ev.pointerType === 'mouse') tipMostrar(b, ev.clientX, ev.clientY); else if (ev.pointerType === 'mouse') tipOcultar(); });
    raiz.addEventListener('pointerleave', tipOcultar);
    raiz.addEventListener('pointerdown', function (ev) { var b = ev.target.closest && ev.target.closest('[data-tip]'); if (b && ev.pointerType !== 'mouse') { var r = b.getBoundingClientRect(); tipMostrar(b, r.left + r.width / 2, r.top); } });
  }
  window.addEventListener('scroll', tipOcultar, { passive: true });

  /* ------------------------------------------------------------ la vista */
  async function viewLidTablero(user) {
    var t0 = performance.now();
    LT.me = user.documento; LT.det = '';
    appWide(true, true);
    app.innerHTML = backbar('Tablero de líderes') +
      '<div class="pad lt" id="lt-root">' +
      '<div class="lt-bar">' +
        '<label class="lt-sel"><span class="small muted">Mes</span><select id="lt-mes" class="input" disabled><option>…</option></select></label>' +
        '<div class="lt-gen small muted" id="lt-gen"></div>' +
      '</div>' +
      '<div id="lt-body">' + esqueleto() + '</div></div>';
    app.hidden = false; hideSplash();
    $('#backbtn').onclick = function () { go('lideres'); };
    tipEnganchar($('#lt-root'));
    var primera = true;
    try {
      await rapCargar('priv.lideresTablero', { caller: LT.me }, function (r) {
        if (!$('#lt-body')) return;
        if (!r || r.ok === false) {
          if (primera) $('#lt-body').innerHTML = '<p class="muted center lt-vacio">' + e(noCore(r)) + '</p>';
          return;
        }
        primera = false;
        LT.firma = JSON.stringify([r.rv, r.generado]);
        LT.d = preparar(r);
        if (!LT.mes || LT.d.ix[LT.mes] == null) LT.mes = LT.d.hoy;
        pintar();
        medir('lid.tablero', t0);
      });
    } catch (err) {
      if ($('#lt-body') && primera) {
        $('#lt-body').innerHTML = /no reconocida|desconocida/i.test(String((err && err.message) || ''))
          ? '<p class="muted center lt-vacio">' + e(noCore({ msg: err.message })) + '</p>'
          : ((typeof fallaHtml === 'function') ? fallaHtml(err) : '<p class="muted center">No se pudo cargar.</p>');
      }
    }
    if (typeof vivoBind === 'function') vivoBind('bd', LT.me, vivoTablero);
  }
  window.viewLidTablero = viewLidTablero;

  function noCore(r) {
    var m = String((r && (r.msg || r.error)) || '');
    if (/no reconocida|desconocida|unknown/i.test(m)) return 'El tablero necesita la versión nueva del CORE. Cuando se despliegue, esta vista se llena sola.';
    return m || 'No se pudo cargar el tablero.';
  }

  async function vivoTablero(rev) {
    try {
      var r = await api('priv.lideresTablero', Object.assign({ caller: LT.me }, RAP.params()), 'GET', null, SILENCIO);
      if (!r || r.ok === false || !$('#lt-body')) return;
      RAP.guardar('priv.lideresTablero', r, r.__rapCrudo || r);
      var f = JSON.stringify([r.rv, r.generado]);
      if (f === LT.firma) return;
      LT.firma = f; LT.d = preparar(r);
      if (LT.d.ix[LT.mes] == null) LT.mes = LT.d.hoy;
      pintar();
      if (LT.det && $('#lt-det')) detalle(LT.det, true);   // la ficha abierta se repinta en su sitio
    } catch (x) {}
  }

  function esqueleto() {
    var k = ''; for (var i = 0; i < 6; i++) k += '<div class="lt-kpi lt-sk"></div>';
    return '<div class="lt-kpis">' + k + '</div><div class="lt-grid"><div class="lt-card lt-sk lt-sk-g"></div><div class="lt-card lt-sk lt-sk-g"></div></div>';
  }

  function selectorMeses() {
    var D = LT.d, sel = $('#lt-mes'); if (!sel) return;
    sel.innerHTML = D.M.slice().reverse().map(function (m) {
      return '<option value="' + m + '"' + (m === LT.mes ? ' selected' : '') + '>' + kLargo(m) + (m === D.hoy ? ' · en vivo' : '') + '</option>';
    }).join('');
    sel.disabled = false;
    sel.onchange = function () { LT.mes = sel.value; pintar(); };
    var g = $('#lt-gen'); if (g) g.textContent = D.generado ? 'Datos de ' + D.generado.slice(11) + (LT.mes === D.hoy ? ' · el mes en curso se cierra el 1º' : '') : '';
  }

  function kpi(lbl, val, sub, cls, tip) {
    return '<div class="lt-kpi ' + (cls || '') + '"' + (tip ? ' data-tip="' + e(tip) + '"' : '') + '><span class="lt-kl">' + e(lbl) + '</span><b>' + val + '</b>' + (sub ? '<span class="lt-ks">' + sub + '</span>' : '') + '</div>';
  }
  function insignia(p) {
    var nv = nivel(p);
    return '<span class="lt-pts lt-n-' + nv.k + '" title="' + e(nv.t) + '"><b>' + (p == null ? '—' : p) + '</b><em>' + e(nv.t) + '</em></span>';
  }

  function pintar() {
    var t0 = performance.now();
    var D = LT.d, m = LT.mes, i = D.ix[m], G = D.G, body = $('#lt-body');
    if (!body || !D) return;
    selectorMeses();
    var t = G.tip[m] || null, p = G.pts[m];
    var conRef = D.L.filter(function (l) { return (l.acum[i] || 0) > 0; }).length;
    var pend = 0; D.L.forEach(function (l) { pend += l.st[0] || 0; });
    var esHoy = m === D.hoy;
    var nv = nivel(p);

    var kpis = '<div class="lt-kpis">' +
      kpi('Puntaje de gestión', p == null ? '—' : String(p), '<span class="lt-dot-n lt-n-' + nv.k + '"></span>' + e(nv.t), 'lt-k-pts', '75 % tipificación + 25 % contacto efectivo, sobre los referidos') +
      kpi('Referidos', n(G.acum[i]), '+' + n(G.nuevos[i]) + ' nuevos ' + varHtml(G.nuevos[i], i > 0 ? G.nuevos[i - 1] : null, '', i > 0 ? MES_C[+D.M[i - 1].slice(5, 7) - 1] : ''), '', 'Referidos activos acumulados al cierre del mes') +
      kpi('Tipificados', t ? pc(t.trab, t.ref) + '%' : '—', t ? n(t.trab) + ' de ' + n(t.ref) : 'sin cierre guardado', '', 'Intención registrada ÷ referidos') +
      kpi('Contacto efectivo', t ? pc(Math.max(0, t.trab - t.noCont), t.ref) + '%' : '—', t ? n(t.noCont) + ' no contactados' : '', '', 'Tipificados que no quedaron en "No contactado"') +
      kpi('Líderes con referidos', n(conRef), n(D.L.length) + ' en total', '') +
      kpi(esHoy ? 'Por confirmar (hoy)' : 'Actualizados por líderes', esHoy ? n(pend) : n(G.al[i]), esHoy ? n(G.val[i]) + ' validados este mes' : n(G.bit[i]) + ' bitácoras', esHoy && pend ? 'lt-k-alerta' : '') +
      '</div>';

    /* Crecimiento */
    var itN = D.M.map(function (k, j) { return { k: k, x: kCorto(k), v: G.nuevos[j], on: k === m, cls: 'lt-c-new',
      tip: kLargo(k) + ': ' + n(G.nuevos[j]) + ' nuevos · acumulado ' + n(G.acum[j]) + (j > 0 ? ' · mes anterior ' + n(G.nuevos[j - 1]) : '') }; });
    var itA = D.M.map(function (k, j) { return { k: k, x: kCorto(k), v: G.acum[j], on: k === m, tip: kLargo(k) + ': ' + n(G.acum[j]) + ' referidos acumulados' }; });
    var crec = '<section class="lt-card"><header class="lt-ch"><h3>Crecimiento de la red</h3><span class="small muted">Referidos nuevos por mes · toca un mes para verlo</span></header>' +
      barras(itN, { aria: 'Referidos nuevos por mes' }) + '</section>' +
      '<section class="lt-card"><header class="lt-ch"><h3>Acumulado</h3><span class="small muted">Referidos activos al cierre de cada mes</span></header>' +
      linea(itA, { aria: 'Referidos acumulados por mes' }) + '</section>';

    /* Puntaje y tipificación (solo meses con datos) */
    var itP = D.mesesTip.map(function (k) { var pp = G.pts[k]; return { k: k, x: kCorto(k), v: pp || 0, alto: pp || 0, lbl: pp == null ? '' : String(pp), on: k === m,
      cls: 'lt-n-' + nivel(pp).k, tip: kLargo(k) + (k === D.hoy ? ' (en vivo)' : '') + ': puntaje ' + (pp == null ? '—' : pp) + ' · ' + nivel(pp).t }; });
    var itT = D.mesesTip.map(function (k) { var tt = G.tip[k]; return { k: k, x: kCorto(k), on: k === m, vacio: !tt, tot: tt ? tt.ref : 0,
      segs: tt ? segsDe(tt) : [], lbl: tt ? pc(tt.trab, tt.ref) + '%' : '', tip: tipTxt(k, tt) }; });
    var tip = '<section class="lt-card"><header class="lt-ch"><h3>Puntaje de gestión mes a mes</h3><span class="small muted">Todos los líderes · desde que se guarda la memoria mensual</span></header>' +
      barras(itP, { cls: 'lt-bars-pts', aria: 'Puntaje de gestión por mes' }) + escala() + '</section>' +
      '<section class="lt-card"><header class="lt-ch"><h3>Tipificación mes a mes</h3><span class="small muted">Cómo quedaron los referidos de todos los líderes</span></header>' +
      apiladas(itT) + leyendaTip() + '</section>';

    body.innerHTML = kpis + '<div class="lt-grid">' + crec + tip + '</div>' + ranking();
    enganchar(body);
    medir('lid.tablero.pintar', t0);
  }

  function escala() {
    return '<div class="lt-escala">' + NIVELES.map(function (x, i) {
      var hasta = i ? NIVELES[i - 1].min - 1 : 100;
      return '<span><i class="lt-dot-n lt-n-' + x.k + '"></i>' + e(x.t) + ' <em>' + x.min + '–' + hasta + '</em></span>';
    }).join('') + '</div>';
  }

  function ranking() {
    var D = LT.d, m = LT.mes;
    var F = filasMes(D, m);
    var cuenta = { exc: 0, bue: 0, reg: 0, baj: 0, sin: 0 };
    F.forEach(function (f) { cuenta[nivel(f.p).k]++; });
    var q = (LT.q || '').toLowerCase();
    var vis = ordenar(F, LT.orden).filter(function (f) {
      if (LT.nivel && nivel(f.p).k !== LT.nivel) return false;
      if (q && (('#' + f.l.cod + ' ' + f.l.nom).toLowerCase().indexOf(q) < 0)) return false;
      return true;
    });
    var pos = {}; ordenar(F, LT.orden).forEach(function (f, j) { pos[f.l.cod] = j + 1; });
    var chips = '<div class="lt-niv">' +
      '<button type="button" class="lt-nchip' + (LT.nivel ? '' : ' on') + '" data-niv="">Todos <b>' + n(F.length) + '</b></button>' +
      NIVELES.concat([{ k: 'sin', t: 'Sin datos' }]).map(function (x) {
        return '<button type="button" class="lt-nchip' + (LT.nivel === x.k ? ' on' : '') + '" data-niv="' + x.k + '"><i class="lt-dot-n lt-n-' + x.k + '"></i>' + e(x.t) + ' <b>' + n(cuenta[x.k]) + '</b></button>';
      }).join('') + '</div>';
    var orden = '<div class="lt-ord" role="tablist">' + [['pts', 'Puntaje'], ['tip', 'Tipificación'], ['nuevos', 'Nuevos'], ['acum', 'Referidos']].map(function (o) {
      return '<button type="button" class="lt-ob' + (LT.orden === o[0] ? ' on' : '') + '" data-ord="' + o[0] + '">' + o[1] + '</button>';
    }).join('') + '</div>';
    var lista = vis.length ? vis.map(function (f) { return filaHtml(f, pos[f.l.cod], D, m); }).join('') : '<p class="muted center lt-vacio">Ningún líder con ese filtro.</p>';
    return '<section class="lt-card lt-rank"><header class="lt-ch lt-rank-h"><div><h3>Ranking · ' + e(kLargo(m)) + (m === D.hoy ? ' <span class="lt-vivo">en vivo</span>' : '') + '</h3>' +
      '<span class="small muted">Toca un líder para ver su detalle mes a mes</span></div>' +
      '<input class="input lt-q" id="lt-q" placeholder="Buscar líder…" autocomplete="off" value="' + e(LT.q) + '"/></header>' +
      chips + orden + '<div class="lt-lista" id="lt-lista">' + lista + '</div></section>';
  }

  function filaHtml(f, puesto, D, m) {
    var l = f.l, t = f.t;
    var ci = claseInfo(l.cl);
    var barra = t && t.ref ? '<div class="lt-mbar" aria-hidden="true">' + segsDe(t).filter(function (s) { return s.v > 0; }).map(function (s) {
      return '<i class="' + s.c + '" style="flex:' + s.v + '"></i>'; }).join('') + '</div>' : '<div class="lt-mbar lt-mbar-0"></div>';
    var serie = D.mesesTip.map(function (k) { return l.pts[k]; });
    return '<button type="button" class="lt-row" data-cod="' + e(l.cod) + '">' +
      '<span class="lt-pos">' + puesto + '</span>' +
      (typeof avatarHtml === 'function' ? avatarHtml(l.nom, l.foto) : '') +
      '<span class="lt-id"><b>' + e(l.nom) + '</b><span class="small muted"><span class="ld-cod">#' + e(l.cod) + '</span>' + (ci ? ' · ' + ci.emoji + ' ' + e(ci.etiqueta) : '') + '</span>' + barra + '</span>' +
      '<span class="lt-cifras">' +
        '<span class="lt-c"><b>' + (f.tipPct == null ? '—' : f.tipPct + '%') + '</b><em>tipif.</em></span>' +
        '<span class="lt-c"><b>+' + n(f.nuevos) + '</b><em>' + varHtml(f.nuevos, f.prev).replace(/ \(.*?\)/, '') + '</em></span>' +
        '<span class="lt-c lt-c-ref"><b>' + n(f.acum) + '</b><em>ref.</em></span>' +
      '</span>' + sparkline(serie) + insignia(f.p) + '</button>';
  }

  /* En el celular las barras se desplazan: el mes elegido queda a la vista */
  function alMes(raiz) {
    (raiz || document).querySelectorAll('.lt-bars').forEach(function (bx) {
      if (bx.scrollWidth <= bx.clientWidth + 2) return;
      var on = bx.querySelector('.lt-b.on'); if (!on) { bx.scrollLeft = bx.scrollWidth; return; }
      bx.scrollLeft = Math.max(0, on.offsetLeft - bx.clientWidth + on.offsetWidth * 2);
    });
  }
  function enganchar(body) {
    alMes(body);
    body.querySelectorAll('[data-mes]').forEach(function (b) { b.onclick = function () { LT.mes = b.dataset.mes; pintar(); }; });
    body.querySelectorAll('[data-niv]').forEach(function (b) { b.onclick = function () { LT.nivel = b.dataset.niv; repintarRanking(); }; });
    body.querySelectorAll('[data-ord]').forEach(function (b) { b.onclick = function () { LT.orden = b.dataset.ord; repintarRanking(); }; });
    var q = $('#lt-q'), tm;
    if (q) q.oninput = function () { clearTimeout(tm); tm = setTimeout(function () { LT.q = q.value.trim(); repintarRanking(true); }, 160); };
    body.querySelectorAll('.lt-row').forEach(function (b) { b.onclick = function (ev) { if (ev.target.closest('.av[data-zoom]')) return; detalle(b.dataset.cod); }; });
  }
  function repintarRanking(mantenerFoco) {
    var sec = document.querySelector('.lt-rank'); if (!sec) return;
    var pos = mantenerFoco ? ($('#lt-q') || {}).selectionStart : null;
    var tmp = document.createElement('div'); tmp.innerHTML = ranking();
    sec.replaceWith(tmp.firstChild);
    enganchar($('#lt-body'));
    if (mantenerFoco) { var q = $('#lt-q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (x) {} } }
  }

  /* ------------------------------------------------- detalle de un líder */
  function detalle(cod, enSitio) {
    var t0 = performance.now();
    var D = LT.d, l = D.L.filter(function (x) { return String(x.cod) === String(cod); })[0];
    if (!l) return;
    LT.det = cod;
    var m = LT.mes, i = D.ix[m], t = l.tip[m], p = l.pts[m], nv = nivel(p);
    var F = ordenar(filasMes(D, m), 'pts'), puesto = 0, conPts = 0;
    F.forEach(function (f, j) { if (f.p != null) conPts++; if (f.l.cod === l.cod) puesto = j + 1; });
    var ci = claseInfo(l.cl);
    var esHoy = m === D.hoy;

    var kp = '<div class="lt-kpis lt-kpis-det">' +
      kpi('Puntaje', p == null ? '—' : String(p), '<span class="lt-dot-n lt-n-' + nv.k + '"></span>' + e(nv.t) + (p != null ? ' · puesto ' + puesto + ' de ' + conPts : ''), 'lt-k-pts') +
      kpi('Referidos', n(l.acum[i]), '+' + n(l.n[i]) + ' nuevos ' + varHtml(l.n[i] || 0, i > 0 ? (l.n[i - 1] || 0) : null, '', i > 0 ? MES_C[+D.M[i - 1].slice(5, 7) - 1] : '')) +
      kpi('Tipificados', t ? pc(t.trab, t.ref) + '%' : '—', t ? n(t.trab) + ' de ' + n(t.ref) : 'sin cierre guardado') +
      kpi('Contacto efectivo', t ? pc(Math.max(0, t.trab - t.noCont), t.ref) + '%' : '—', t ? n(t.noCont) + ' no contactados' : '') +
      kpi('Firmes con el voto', t ? n(t.firme) : '—', t ? pc(t.firme, t.ref) + '% de sus referidos' : '') +
      kpi('Actualizó datos', n(l.al[i]), n(l.ae[i]) + ' por el equipo', '', 'Referidos cuya última actualización cayó en este mes') +
      kpi('Validaciones', n(l.val[i]), 'en la zona de líderes') +
      kpi(esHoy ? 'Por confirmar (hoy)' : 'Bitácoras', esHoy ? n(l.st[0]) : n(l.bit[i]), esHoy ? n(l.st[1]) + ' a la espera · ' + n(l.st[3]) + ' consultados' : 'del mes', esHoy && l.st[0] ? 'lt-k-alerta' : '') +
      '</div>';

    var itN = D.M.map(function (k, j) { return { k: k, x: kCorto(k), v: l.n[j] || 0, on: k === m, cls: 'lt-c-new',
      tip: kLargo(k) + ': ' + n(l.n[j]) + ' nuevos · acumulado ' + n(l.acum[j]) }; });
    var itA = D.M.map(function (k, j) { return { k: k, x: kCorto(k), v: l.acum[j] || 0, on: k === m, tip: kLargo(k) + ': ' + n(l.acum[j]) + ' referidos' }; });
    var itP = D.mesesTip.map(function (k) { var pp = l.pts[k]; return { k: k, x: kCorto(k), v: pp || 0, alto: pp || 0, lbl: pp == null ? '' : String(pp), on: k === m, vacio: pp == null,
      cls: 'lt-n-' + nivel(pp).k, tip: kLargo(k) + ': ' + (pp == null ? 'sin datos' : 'puntaje ' + pp + ' · ' + nivel(pp).t) }; });
    var itT = D.mesesTip.map(function (k) { var tt = l.tip[k]; return { k: k, x: kCorto(k), on: k === m, vacio: !tt || !tt.ref, tot: tt ? tt.ref : 0,
      segs: tt ? segsDe(tt) : [], lbl: tt ? pc(tt.trab, tt.ref) + '%' : '', tip: tipTxt(k, tt) }; });
    var desde = D.mesesTip[0] ? D.ix[D.mesesTip[0]] : 0;
    var itU = D.M.slice(desde).map(function (k, j) { var jj = j + desde; return { k: k, x: kCorto(k), v: (l.al[jj] || 0), on: k === m, cls: 'lt-c-act',
      tip: kLargo(k) + ': ' + n(l.al[jj]) + ' actualizados por el líder · ' + n(l.ae[jj]) + ' por el equipo · ' + n(l.val[jj]) + ' validaciones · ' + n(l.bit[jj]) + ' bitácoras' }; });

    var html = '<div class="grip"></div><div class="lt-det" id="lt-det" data-cod="' + e(l.cod) + '">' +
      '<header class="lt-dh">' + (typeof avatarHtml === 'function' ? avatarHtml(l.nom, l.foto, 'av-lg') : '') +
        '<div class="lt-did"><h2 class="h2">' + e(l.nom) + '</h2>' +
        '<div class="small muted"><span class="ld-cod">#' + e(l.cod) + '</span>' + (ci ? ' · ' + ci.emoji + ' ' + e(ci.etiqueta) : '') + ' · ' + (l.on ? 'Activado' : 'No activado') + '</div>' +
        '<div class="small lt-dmes">' + e(kLargo(m)) + (esHoy ? ' <span class="lt-vivo">en vivo</span>' : '') + '</div></div>' + insignia(p) +
        '<button class="icon-btn lt-x" data-close aria-label="Cerrar">' + ((typeof I !== 'undefined' && I.x) ? I.x : '✕') + '</button></header>' +
      kp +
      '<div class="lt-grid lt-grid-det">' +
        '<section class="lt-card"><header class="lt-ch"><h3>Referidos nuevos por mes</h3></header>' + barras(itN, { aria: 'Nuevos por mes' }) + '</section>' +
        '<section class="lt-card"><header class="lt-ch"><h3>Acumulado</h3></header>' + linea(itA, { aria: 'Acumulado por mes' }) + '</section>' +
        '<section class="lt-card"><header class="lt-ch"><h3>Puntaje mes a mes</h3></header>' + barras(itP, { cls: 'lt-bars-pts', aria: 'Puntaje por mes' }) + escala() + '</section>' +
        '<section class="lt-card"><header class="lt-ch"><h3>Tipificación mes a mes</h3></header>' + apiladas(itT) + leyendaTip() + '</section>' +
        '<section class="lt-card lt-span2"><header class="lt-ch"><h3>Datos actualizados por el líder</h3><span class="small muted">Referidos cuya última actualización la hizo él o su padrino, por mes</span></header>' + barras(itU, { aria: 'Actualizaciones por mes' }) + '</section>' +
      '</div>' +
      '<div class="lt-tabla-act"><button type="button" class="btn btn-ghost" id="lt-vtabla">' + (LT.tabla ? 'Ocultar tabla' : 'Ver en tabla') + '</button></div>' +
      (LT.tabla ? tablaDet(l, D) : '') +
      '</div>';

    if (enSitio && $('#lt-det')) {
      var sh = $('#lt-det').closest('.sheet'), sc = sh ? sh.scrollTop : 0;
      if (sh) { sh.innerHTML = html; sh.scrollTop = sc; sh.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = cerrarDet; }); }
    } else {
      openSheet(html, 'sheet-xl lt-sheet');
      var bd = document.querySelector('#layer .backdrop'); if (bd) bd.onclick = cerrarDet;
      document.querySelectorAll('#layer [data-close]').forEach(function (b) { b.onclick = cerrarDet; });
    }
    var raiz = $('#lt-det');
    tipEnganchar(raiz && raiz.closest('.sheet'));
    alMes(raiz);
    if (raiz) {
      raiz.querySelectorAll('[data-mes]').forEach(function (b) { b.onclick = function () { LT.mes = b.dataset.mes; pintar(); detalle(l.cod, true); }; });
      var bt = $('#lt-vtabla'); if (bt) bt.onclick = function () { LT.tabla = !LT.tabla; detalle(l.cod, true); };
    }
    medir('lid.tablero.det', t0);
  }
  function cerrarDet() { LT.det = ''; tipOcultar(); closeLayer(); }

  function tablaDet(l, D) {
    var filas = D.M.slice().reverse().map(function (k) {
      var j = D.ix[k], t = l.tip[k], pp = l.pts[k];
      return '<tr><td>' + e(kLargo(k)) + (k === D.hoy ? ' ·<i> vivo</i>' : '') + '</td><td>' + n(l.n[j]) + '</td><td>' + n(l.acum[j]) + '</td>' +
        '<td>' + (t ? n(t.ref) : '—') + '</td><td>' + (t ? pc(t.trab, t.ref) + '%' : '—') + '</td><td>' + (t ? pc(Math.max(0, t.trab - t.noCont), t.ref) + '%' : '—') + '</td>' +
        '<td><b>' + (pp == null ? '—' : pp) + '</b></td><td>' + n(l.al[j]) + '</td><td>' + n(l.val[j]) + '</td><td>' + n(l.bit[j]) + '</td></tr>';
    }).join('');
    return '<div class="lt-tabla"><table class="sim-table"><thead><tr><th>Mes</th><th>Nuevos</th><th>Acum.</th><th>Ref. tipif.</th><th>Tipif.</th><th>Contacto</th><th>Puntaje</th><th>Actualizó</th><th>Valid.</th><th>Bitác.</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
  }

  /* Botón en Líderes (lo pinta viewLideres con este ícono) */
  window.LT_ICO = ICO;
  /* Para las pruebas del banco */
  window.__lt = { preparar: preparar, puntaje: puntaje, nivel: nivel, filasMes: filasMes, ordenar: ordenar, estado: LT };
})();

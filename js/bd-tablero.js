/* ============================================================================
 * JHONNY PRIV · BASE DE DATOS — CONTEOS EN LOS FILTROS + CRECIMIENTO POR MES
 * (08/11/2026)
 * ----------------------------------------------------------------------------
 * Todo sale de BD_ALL, la lista que ya está en memoria (carga única fmt=2):
 * cero viajes al servidor. Usa las MISMAS reglas que la lista (bdPasaChip y
 * bdPasaResto, en app.js), así que los números cuadran con "N registro(s)".
 *
 *  · Pastillas de municipio/estado: cada una cuenta lo que mostraría al
 *    tocarla con la búsqueda, el líder y las intenciones elegidas.
 *  · Pastillas de intención: cada una cuenta lo que mostraría con la
 *    pastilla de municipio/estado, la búsqueda y el líder elegidos.
 *  · Tendencia: registros por mes (FECHA_REGISTRO) de lo que se ve en la
 *    lista (todos los filtros). Franja compacta + hoja ampliada.
 *
 * Se llama desde bdApplyFilter, bdBuildIntChips y el parche de fila
 * (bdUpsertCard): agregar, editar, inactivar, eliminar y EN VIVO quedan al
 * día sin recargar. Tiempo de pantalla: RED.pantalla('bd.tablero').
 * ============================================================================ */
(function () {
  'use strict';

  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MES_L = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var ULT = null;   // último cálculo (la hoja ampliada lo reutiliza)

  function n(x) { return Number(x || 0).toLocaleString('es-CO'); }
  function e(s) { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); }

  /* dd/mm/aaaa → { k: 'aaaa-mm', d: día } ; sin fecha → null */
  function mesDe(c) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String((c && c.fechaRegistro) || '').trim());
    if (!m) return null;
    return { k: m[3] + '-' + m[2], d: +m[1] };
  }
  function kDe(fecha) { return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0'); }
  function kSig(k) { var y = +k.slice(0, 4), m = +k.slice(5, 7); m++; if (m > 12) { m = 1; y++; } return y + '-' + String(m).padStart(2, '0'); }
  function kCorto(k) { return MES[+k.slice(5, 7) - 1] + ' ' + k.slice(2, 4); }
  function kLargo(k) { return MES_L[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4); }

  /* ---------- cálculo (una pasada por BD_ALL) ---------- */
  function calcular() {
    var q = bdQ(), f = bdActiveFilter();
    var chips = {}, ints = {}, visibles = [];
    var etiquetas = [];
    document.querySelectorAll('#bd-chips .bd-chip').forEach(function (b) { etiquetas.push(b.dataset.f); chips[b.dataset.f] = 0; });
    for (var i = 0; i < BD_ALL.length; i++) {
      var c = BD_ALL[i];
      var resto = bdPasaResto(c, q, true);            // búsqueda + líder (sin intención)
      if (!resto) continue;
      var conInt = !BD_INT.size || BD_INT.has(String(c.intencion || '').trim());
      if (conInt) for (var j = 0; j < etiquetas.length; j++) if (bdPasaChip(c, etiquetas[j])) chips[etiquetas[j]]++;
      if (bdPasaChip(c, f)) {
        var v = String(c.intencion || '').trim();
        if (v) ints[v] = (ints[v] || 0) + 1;
        if (conInt) visibles.push(c);
      }
    }
    return { chips: chips, ints: ints, tend: tendencia(visibles) };
  }

  function tendencia(lista) {
    var hoy = new Date(), kHoy = kDe(hoy), diaHoy = hoy.getDate();
    var por = {}, corte = {}, sinFecha = 0, kMin = null;
    lista.forEach(function (c) {
      var m = mesDe(c);
      if (!m) { sinFecha++; return; }
      por[m.k] = (por[m.k] || 0) + 1;
      if (m.d <= diaHoy) corte[m.k] = (corte[m.k] || 0) + 1;   // para comparar el mes en curso al mismo día
      if (!kMin || m.k < kMin) kMin = m.k;
    });
    var meses = [], acum = 0;
    if (kMin) {
      var kFin = kHoy;
      Object.keys(por).forEach(function (k) { if (k > kFin) kFin = k; });   // fecha futura mal digitada: igual se muestra
      for (var k = kMin, guard = 0; k <= kFin && guard < 600; k = kSig(k), guard++) {
        var nuevos = por[k] || 0; acum += nuevos;
        var prev = meses.length ? meses[meses.length - 1].nuevos : null;
        meses.push({ k: k, nuevos: nuevos, acum: acum, prev: prev, enCurso: k === kHoy });
      }
    }
    var actual = meses.length ? meses[meses.length - 1] : null;
    var anterior = meses.length > 1 ? meses[meses.length - 2] : null;
    return {
      total: lista.length, sinFecha: sinFecha, meses: meses, kHoy: kHoy, diaHoy: diaHoy,
      actual: actual, anterior: anterior,
      anteriorAlCorte: anterior ? (corte[anterior.k] || 0) : 0
    };
  }

  /* ---------- variación ---------- */
  function variacion(act, ant) {
    if (ant == null) return { cls: 'eq', txt: '—', tip: 'Sin mes anterior' };
    var d = act - ant;
    if (d === 0) return { cls: 'eq', txt: '= 0', tip: 'Igual que el mes anterior' };
    var pct = ant > 0 ? n(Math.round(Math.abs(d) * 100 / ant)) + ' %' : 'nuevo';
    return { cls: d > 0 ? 'up' : 'down', txt: (d > 0 ? '▲ +' : '▼ ') + n(d) + ' (' + pct + ')', tip: '' };
  }

  /* ---------- pintar pastillas ---------- */
  function pintarChips(r) {
    document.querySelectorAll('#bd-chips .bd-chip').forEach(function (b) {
      var s = b.querySelector('.bd-chip-n'); if (!s) return;
      var t = n(r.chips[b.dataset.f]); if (s.textContent !== t) s.textContent = t;
    });
    document.querySelectorAll('#bd-chips-int .bd-chip-int').forEach(function (b) {
      var s = b.querySelector('.bd-chip-n'); if (!s) return;
      var v = r.ints[b.dataset.int] || 0, t = n(v);
      if (s.textContent !== t) s.textContent = t;
      b.classList.toggle('bd-chip-cero', !v && !b.classList.contains('active'));
    });
  }

  /* ---------- franja compacta ---------- */
  function barrasMini(meses) {
    var ult = meses.slice(-12); if (!ult.length) return '';
    var max = Math.max.apply(null, ult.map(function (m) { return m.nuevos; })) || 1;
    var W = 12 * 10, H = 34, bw = 7;
    var x0 = W - ult.length * 10;
    return '<svg class="bdt-mini" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      ult.map(function (m, i) {
        var hh = Math.max(m.nuevos ? 2 : 1, Math.round(m.nuevos * (H - 2) / max));
        return '<rect x="' + (x0 + i * 10) + '" y="' + (H - hh) + '" width="' + bw + '" height="' + hh + '" rx="1.5" class="' + (m.enCurso ? 'cur' : '') + '"><title>' + e(kLargo(m.k)) + ': ' + n(m.nuevos) + '</title></rect>';
      }).join('') + '</svg>';
  }

  function pintarFranja(t) {
    var box = document.getElementById('bd-tend'); if (!box) return;
    if (!t.meses.length) { box.hidden = true; box.innerHTML = ''; return; }
    var a = t.actual, ant = t.anterior;
    var v, vLbl;
    if (a.enCurso && ant) { v = variacion(a.nuevos, t.anteriorAlCorte); vLbl = 'vs. ' + MES[+ant.k.slice(5, 7) - 1] + ' al día ' + t.diaHoy; }
    else { v = variacion(a.nuevos, ant ? ant.nuevos : null); vLbl = ant ? 'vs. ' + kCorto(ant.k) : 'mes anterior'; }
    var html =
      '<button type="button" class="bdt-strip" id="bdt-open" title="Ver la tendencia completa">' +
        '<span class="bdt-k"><span class="bdt-lbl">Total</span><b>' + n(t.total) + '</b></span>' +
        '<span class="bdt-k"><span class="bdt-lbl">' + e(kCorto(a.k)) + (a.enCurso ? ' · en curso' : '') + '</span><b>+' + n(a.nuevos) + '</b></span>' +
        '<span class="bdt-k bdt-v ' + v.cls + '"><span class="bdt-lbl">' + e(vLbl) + '</span><b>' + e(v.txt) + '</b></span>' +
        barrasMini(t.meses) +
        '<span class="bdt-mas">Ampliar</span>' +
      '</button>';
    if (box.__html !== html) { box.innerHTML = html; box.__html = html; var b = document.getElementById('bdt-open'); if (b) b.onclick = abrir; }
    box.hidden = false;
  }

  /* ---------- hoja ampliada ---------- */
  function filtrosTxt() {
    var p = [], f = bdActiveFilter();
    if (f && f !== 'Todos') p.push(f);
    if (BD_INT.size) p.push('Intención: ' + Array.from(BD_INT).join(', '));
    if (BD_LID === 'SIN') p.push('Sin líder');
    else if (BD_LID) { var l = (BD_LIDERES || []).find(function (x) { return String(x.codigo) === String(BD_LID); }); p.push('Líder: ' + (l ? l.nombre : '#' + BD_LID)); }
    var q = bdQ(); if (q) p.push('Búsqueda: "' + q + '"');
    return p.length ? p.join(' · ') : 'Todos los registros activos';
  }

  function grafica(meses) {
    if (!meses.length) return '';
    var W = Math.max(320, meses.length * 46), H = 190, pl = 34, pr = 40, pt = 14, pb = 28;
    var cw = W - pl - pr, ch = H - pt - pb, paso = cw / meses.length, bw = Math.min(22, paso * .62);
    var maxN = Math.max.apply(null, meses.map(function (m) { return m.nuevos; })) || 1;
    var maxA = meses[meses.length - 1].acum || 1;
    var y = function (v, max) { return pt + ch - v * ch / max; };
    var barras = meses.map(function (m, i) {
      var x = pl + i * paso + (paso - bw) / 2, yy = y(m.nuevos, maxN);
      return '<rect class="bdt-bar' + (m.enCurso ? ' cur' : '') + '" x="' + x.toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (pt + ch - yy).toFixed(1) + '" rx="3"><title>' + e(kLargo(m.k)) + ': +' + n(m.nuevos) + ' · acumulado ' + n(m.acum) + '</title></rect>' +
        (m.nuevos ? '<text class="bdt-bv" x="' + (x + bw / 2).toFixed(1) + '" y="' + (yy - 3).toFixed(1) + '">' + n(m.nuevos) + '</text>' : '') +
        '<text class="bdt-x" x="' + (pl + i * paso + paso / 2).toFixed(1) + '" y="' + (H - 9) + '">' + e(kCorto(m.k)) + '</text>';
    }).join('');
    var linea = meses.map(function (m, i) { return (i ? 'L' : 'M') + (pl + i * paso + paso / 2).toFixed(1) + ' ' + y(m.acum, maxA).toFixed(1); }).join(' ');
    var puntos = meses.map(function (m, i) { return '<circle class="bdt-pt" cx="' + (pl + i * paso + paso / 2).toFixed(1) + '" cy="' + y(m.acum, maxA).toFixed(1) + '" r="2.6"><title>' + e(kLargo(m.k)) + ': acumulado ' + n(m.acum) + '</title></circle>'; }).join('');
    return '<div class="bdt-graf"><svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Registros nuevos por mes y acumulado">' +
      '<line class="bdt-eje" x1="' + pl + '" y1="' + (pt + ch) + '" x2="' + (W - pr) + '" y2="' + (pt + ch) + '"/>' +
      '<text class="bdt-yl" x="' + (pl - 6) + '" y="' + (pt + 4) + '">' + n(maxN) + '</text>' +
      '<text class="bdt-yr" x="' + (W - pr + 6) + '" y="' + (pt + 4) + '">' + n(maxA) + '</text>' +
      barras + '<path class="bdt-acum" d="' + linea + '"/>' + puntos + '</svg></div>';
  }

  function cuerpoHoja(t) {
    var filas = t.meses.slice().reverse().map(function (m) {
      var v = variacion(m.nuevos, m.prev);
      return '<div class="bdt-fila"><span class="bdt-mes">' + e(kLargo(m.k)) + (m.enCurso ? ' <i>en curso</i>' : '') + '</span>' +
        '<span class="bdt-num">+' + n(m.nuevos) + '</span><span class="bdt-num bdt-ac">' + n(m.acum) + '</span>' +
        '<span class="bdt-var ' + v.cls + '">' + e(v.txt) + '</span></div>';
    }).join('');
    var nota = t.actual && t.actual.enCurso && t.anterior
      ? '<p class="muted small bdt-nota">El mes en curso va en +' + n(t.actual.nuevos) + '; al día ' + t.diaHoy + ' de ' + e(kLargo(t.anterior.k).toLowerCase()) + ' iban +' + n(t.anteriorAlCorte) + '.</p>' : '';
    return '<p class="muted small bdt-filtros">' + e(filtrosTxt()) + ' · ' + n(t.total) + ' registro(s)</p>' +
      '<div class="bdt-ley"><span><i class="bdt-sw-bar"></i>Nuevos del mes</span><span><i class="bdt-sw-lin"></i>Acumulado</span></div>' +
      grafica(t.meses) + nota +
      '<div class="bdt-tabla"><div class="bdt-fila bdt-cab"><span>Mes</span><span class="bdt-num">Nuevos</span><span class="bdt-num">Acumulado</span><span>Vs. mes anterior</span></div>' + filas + '</div>' +
      (t.sinFecha ? '<p class="muted small">Sin fecha de registro: ' + n(t.sinFecha) + ' (no entran en la tendencia).</p>' : '');
  }

  function abrir() {
    if (!ULT) return;
    openSheet('<div class="grip"></div><div class="bdt-head"><h2 class="h2">Crecimiento por mes</h2><button class="btn btn-ghost" data-close>Cerrar</button></div><div id="bdt-hoja">' + cuerpoHoja(ULT.tend) + '</div>', 'bdt-sheet');
    var g = document.querySelector('#bdt-hoja .bdt-graf'); if (g) g.scrollLeft = g.scrollWidth;   // los meses recientes a la vista
  }

  /* ---------- entrada ---------- */
  window.bdTablero = function () {
    if (!document.getElementById('bd-chips') || typeof BD_ALL === 'undefined') return;
    var t0 = performance.now();
    try {
      ULT = calcular();
      pintarChips(ULT);
      pintarFranja(ULT.tend);
      var hoja = document.getElementById('bdt-hoja');
      if (hoja) { var sl = (hoja.querySelector('.bdt-graf') || {}).scrollLeft; hoja.innerHTML = cuerpoHoja(ULT.tend); var g = hoja.querySelector('.bdt-graf'); if (g && sl != null) g.scrollLeft = sl; }
    } catch (err) { try { console.warn('bdTablero', err); } catch (x) {} }
    try { window.RED && RED.pantalla && RED.pantalla('bd.tablero', performance.now() - t0); } catch (x) {}
  };
  window.bdTableroUltimo = function () { return ULT; };   // para medir/verificar desde la consola
})();

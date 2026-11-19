/* ============================================================================
 * JHONNY PRIV · MARCADOR DEL INICIO (18/11/2026 · DESIGN.md «Marcador»)
 * ----------------------------------------------------------------------------
 * Análisis a primera vista en el Inicio, sin quitar nada de lo que había:
 *   · Marcador: firmes con el voto sobre los activos, barra por intención,
 *     no seguros, no contactados, sin preguntar y nuevos del mes.
 *     Botón «Preguntar intención a N» → Base de datos con «Sin preguntar».
 *   · Piden tu acción: por validar con la Registraduría, líderes sin
 *     activar y líderes con menos de 10 referidos (cada fila abre su vista).
 *   · Debajo de los módulos: por puesto, registros por mes y líderes que
 *     más suman.
 *
 * CERO RUTAS NUEVAS. Usa las MISMAS lecturas y la MISMA caché de sesión que
 * Base de datos (priv.baseDatos act=1) y Líderes (priv.lideres): si ya
 * están en caché pinta al instante; si no, las pide de fondo (cola de
 * lecturas, silenciosas) y de paso deja lista la Base de datos para cuando
 * la abran. La navegación (módulos) se pinta antes y nunca espera.
 * Tiempo de pantalla: RED.pantalla('inicio.marcador').
 * ============================================================================ */
(function () {
  'use strict';

  var MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var FIRME = 'Firme con el voto', DUDA = 'No está seguro(a)', NOCONT = 'No contactado';
  var YA_RODO = false;   // las cifras ruedan una vez por sesión de la página

  function n(x) { return Number(x || 0).toLocaleString('es-CO'); }
  function e(s) { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); }
  function ic(k) { return (typeof I !== 'undefined' && I[k]) ? I[k] : ''; }
  function pct(a, b) { return b ? Math.round(a * 1000 / b) / 10 : 0; }
  function nombreCorto(s) {
    var p = String(s || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    var t = p.slice(0, 3).join(' ');
    return t.replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
  }

  var SVG = {
    tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    escudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    encender: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/></svg>',
    sube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
    sig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>'
  };

  /* ---------- cálculo (una pasada por cada lista) ---------- */
  function calcBd(items) {
    var r = { act: 0, firme: 0, duda: 0, nocont: 0, sinPreg: 0, porConf: 0, motivos: {}, puestos: {}, meses: {}, mesHoy: 0, mesAnt: 0 };
    var hoy = new Date(), kHoy = hoy.getFullYear() * 12 + hoy.getMonth(), dHoy = hoy.getDate(), mesAntCorte = 0;
    for (var i = 0; i < items.length; i++) {
      var c = items[i];
      if (c.estado === 'INACTIVO') continue;
      r.act++;
      var v = String(c.intencion || '').trim();
      if (v === FIRME) r.firme++; else if (v === DUDA) r.duda++; else if (v === NOCONT) r.nocont++; else if (!v) r.sinPreg++;
      var mun = String(c.municipio || '').trim().toUpperCase();
      if (mun === 'POR CONFIRMAR') { r.porConf++; var m = String(c.motivo || '').trim().toUpperCase(); if (m) r.motivos[m] = (r.motivos[m] || 0) + 1; }
      var pu = String(c.puesto || '').trim() || '(Sin puesto)';
      r.puestos[pu] = (r.puestos[pu] || 0) + 1;
      var f = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(c.fechaRegistro || ''));
      if (f) {
        var k = (+f[3]) * 12 + (+f[2] - 1);
        r.meses[k] = (r.meses[k] || 0) + 1;
        if (k === kHoy - 1 && +f[1] <= dHoy) mesAntCorte++;
      }
    }
    r.kHoy = kHoy; r.mesHoy = r.meses[kHoy] || 0; r.mesAntCorte = mesAntCorte;
    return r;
  }
  function calcLid(items) {
    var r = { total: 0, sinAct: 0, menos10: 0, mas50: 0, top: [] };
    (items || []).forEach(function (l) {
      r.total++;
      var ref = +l.referidos || 0;
      if (!l.activado || l.activado === 'NO' || l.activado === false) r.sinAct++;
      if (ref < 10) r.menos10++; else if (ref >= 50) r.mas50++;
    });
    r.top = (items || []).slice().sort(function (a, b) { return (+b.referidos || 0) - (+a.referidos || 0); }).slice(0, 5);
    return r;
  }

  /* ---------- pintar ---------- */
  function rueda(cls) { return YA_RODO ? '' : ' ' + (cls || 'mc-rueda'); }

  function htmlMarcador(b) {
    var muni = (window.MV && MV.municipio) || '';
    var w = function (x) { return Math.max(x ? 0.6 : 0, pct(x, b.act)); };
    var dif = b.mesHoy - b.mesAntCorte;
    var difTxt = b.mesAntCorte || b.mesHoy ? (dif >= 0 ? '+' : '') + n(dif) + ' frente al mes pasado a esta fecha' : '';
    return '<section class="mc-marcador" aria-label="Marcador de la campaña">' +
      '<div class="mc-m-cab"><span class="mc-eyebrow">Camino al voto' + (muni ? ' · ' + e(muni) : '') + '</span>' +
      '<button class="mc-m-mas" data-mc="dashboard">Ver tablero ' + SVG.sig + '</button></div>' +
      '<div class="mc-m-cifra"><b class="mc-n mc-n-xl' + rueda() + '">' + n(b.firme) + '</b>' +
      '<span class="' + rueda('mc-rueda mc-r2') + '">firmes con el voto<br>de ' + n(b.act) + ' activos · ' + String(pct(b.firme, b.act)).replace('.', ',') + ' %</span></div>' +
      '<div class="mc-barra" role="img" aria-label="' + n(b.firme) + ' firmes, ' + n(b.duda) + ' no seguros, ' + n(b.nocont) + ' no contactados, ' + n(b.sinPreg) + ' sin preguntar">' +
        '<i class="mc-b-firme' + rueda('mc-avanza') + '" style="width:' + w(b.firme) + '%"></i>' +
        '<i class="mc-b-duda' + rueda('mc-avanza') + '" style="width:' + w(b.duda) + '%"></i>' +
        '<i class="mc-b-nocont' + rueda('mc-avanza') + '" style="width:' + w(b.nocont) + '%"></i></div>' +
      '<div class="mc-m-datos">' +
        '<button class="mc-dato" data-mc="int" data-int="' + e(DUDA) + '"><i class="mc-pt mc-pt-duda"></i><b class="mc-n' + rueda('mc-rueda mc-r2') + '">' + n(b.duda) + '</b><span>No está seguro</span></button>' +
        '<button class="mc-dato" data-mc="int" data-int="' + e(NOCONT) + '"><i class="mc-pt mc-pt-nocont"></i><b class="mc-n' + rueda('mc-rueda mc-r2') + '">' + n(b.nocont) + '</b><span>No contactado</span></button>' +
        '<button class="mc-dato" data-mc="int" data-int=""><i class="mc-pt"></i><b class="mc-n' + rueda('mc-rueda mc-r3') + '">' + n(b.sinPreg) + '</b><span>Sin preguntar</span></button>' +
        '<button class="mc-dato" data-mc="bd"><i class="mc-pt mc-pt-nuevo"></i><b class="mc-n' + rueda('mc-rueda mc-r3') + '">+' + n(b.mesHoy) + '</b><span>Nuevos del mes</span></button>' +
      '</div>' +
      (difTxt ? '<p class="mc-m-nota">' + e(difTxt) + '</p>' : '') +
      (b.sinPreg ? '<button class="mc-cta" data-mc="int" data-int="">' + SVG.tel + 'Preguntar intención a ' + n(b.sinPreg) + '</button>' : '') +
    '</section>';
  }

  function fila(clave, ico, tono, titulo, sub, num) {
    return '<button class="mc-fila" data-mc="' + clave + '"><span class="mc-f-ic mc-t-' + tono + '">' + ico + '</span>' +
      '<span class="mc-f-tx"><b>' + e(titulo) + '</b><span>' + e(sub) + '</span></span>' +
      '<b class="mc-f-n mc-tn-' + tono + '">' + n(num) + '</b>' + SVG.sig + '</button>';
  }
  function htmlAccion(b, l) {
    var filas = [];
    if (b && b.porConf) {
      var mot = Object.keys(b.motivos).sort(function (x, y) { return b.motivos[y] - b.motivos[x]; }).slice(0, 2)
        .map(function (k) { return n(b.motivos[k]) + ' ' + k.toLowerCase(); }).join(' · ');
      filas.push(fila('validar', SVG.escudo, 'pend', 'Validar con la Registraduría', mot || 'Por confirmar', b.porConf));
    }
    if (l && l.sinAct) filas.push(fila('lideres', SVG.encender, 'azul', 'Líderes sin activar', 'Aún no entran a su zona', l.sinAct));
    if (l && l.menos10) filas.push(fila('lideres', SVG.sube, 'azul', 'Líderes con menos de 10', 'De ' + n(l.total) + ' · ' + n(l.mas50) + ' ya pasan de 50', l.menos10));
    if (!filas.length) return '';
    return '<section class="mc-accion"><h2 class="mc-h">Piden tu acción</h2><div class="mc-lista">' + filas.join('') + '</div></section>';
  }

  function htmlAnalisis(b, l) {
    var partes = [];
    if (b) {
      var pu = Object.keys(b.puestos).sort(function (x, y) { return b.puestos[y] - b.puestos[x]; }).slice(0, 6);
      var max = pu.length ? b.puestos[pu[0]] : 1;
      partes.push('<section class="mc-card"><h2 class="mc-h">Por puesto de votación</h2>' + pu.map(function (k) {
        var otro = /^\(sin puesto\)$/i.test(k) ? ' mc-bar-pend' : (/otro municipio/i.test(k) ? ' mc-bar-gris' : '');
        return '<div class="mc-pu"><span><span>' + e(k) + '</span><b>' + n(b.puestos[k]) + '</b></span><i class="mc-pu-t"><i class="mc-pu-b' + otro + rueda('mc-avanza') + '" style="width:' + Math.max(1, Math.round(b.puestos[k] * 100 / max)) + '%"></i></i></div>';
      }).join('') + '</section>');

      var ks = []; for (var k = b.kHoy - 8; k <= b.kHoy; k++) ks.push(k);
      var mx = Math.max.apply(null, ks.map(function (x) { return b.meses[x] || 0; })) || 1;
      partes.push('<section class="mc-card"><h2 class="mc-h">Registros nuevos por mes</h2><div class="mc-cols">' + ks.map(function (x) {
        var v = b.meses[x] || 0, cur = x === b.kHoy;
        return '<div class="mc-col' + (cur ? ' mc-col-hoy' : '') + '"><b>' + n(v) + '</b><i class="' + rueda('mc-crece') + '" style="height:' + Math.max(v ? 4 : 2, Math.round(v * 120 / mx)) + 'px"></i><span>' + MES[x % 12] + '</span></div>';
      }).join('') + '</div></section>');
    }
    if (l && l.top.length) {
      partes.push('<section class="mc-card"><div class="mc-card-cab"><h2 class="mc-h">Líderes que más suman</h2><button class="mc-link" data-mc="lideres">Ver los ' + n(l.total) + '</button></div>' +
        l.top.map(function (x, i) {
          var t = Math.max(0, Math.min(100, +x.pctTrabajo || 0));
          return '<button class="mc-lid" data-mc="lideres"><span class="mc-lid-i">' + (i + 1) + '</span>' +
            '<span class="mc-lid-tx"><b>' + e(nombreCorto(x.nombre)) + '</b><i class="mc-lid-t"><i class="' + rueda('mc-avanza') + '" style="width:' + t + '%"></i></i><span>' + n(t) + ' % trabajado</span></span>' +
            '<b class="mc-lid-n">' + n(x.referidos) + '</b></button>';
        }).join('') + '</section>');
    }
    return partes.length ? '<div class="mc-analisis">' + partes.join('') + '</div>' : '';
  }

  function skTop() {
    return '<section class="mc-marcador mc-sk-m" aria-busy="true" aria-label="Cargando el marcador"><span class="mc-sk" style="width:46%;height:12px"></span><span class="mc-sk" style="width:38%;height:52px"></span><span class="mc-sk" style="width:100%;height:12px"></span><span class="mc-sk" style="width:100%;height:46px"></span></section>';
  }

  /* ---------- acciones ---------- */
  function abrir(el) {
    var a = el.dataset.mc;
    if (a === 'int') { window.BD_PRESET = { int: [el.dataset.int || ''] }; return go('bd'); }
    if (a === 'validar') { window.BD_PRESET = { chip: 'Por confirmar' }; return go('bd'); }
    if (a === 'bd' || a === 'lideres' || a === 'dashboard') return go(a);
  }
  function enganchar(cont) {
    if (!cont || cont._mc) return; cont._mc = true;
    cont.addEventListener('click', function (ev) { var b = ev.target.closest('[data-mc]'); if (b && cont.contains(b)) abrir(b); });
  }

  /* ---------- entrada ---------- */
  var ULT = { bd: null, lid: null };
  function pintar(top, an) {
    if (!document.body.contains(top)) return;
    var b = ULT.bd ? calcBd(ULT.bd) : null, l = ULT.lid ? calcLid(ULT.lid) : null;
    if (b) top.innerHTML = htmlMarcador(b) + htmlAccion(b, l);
    if (an) an.innerHTML = htmlAnalisis(b, l);
    if (b) YA_RODO = true;
  }

  async function inicio(user) {
    var top = document.getElementById('mc-top'), an = document.getElementById('mc-an');
    if (!top) return;
    var verBd = typeof permRuta !== 'function' || permRuta('bd');
    var verLid = typeof permRuta !== 'function' || permRuta('lideres');
    if (!verBd) { top.remove(); if (an && !verLid) an.remove(); }
    enganchar(top); enganchar(an);
    var t0 = performance.now(), medido = false;
    function medir(origen) {
      if (medido) return; medido = true;
      try { window.RED && RED.pantalla && RED.pantalla('inicio.marcador' + (origen ? '.' + origen : ''), performance.now() - t0); } catch (x) {}
    }
    if (verBd && !(window.RAP && RAP.tomar('priv.baseDatos'))) top.innerHTML = skTop();
    var tareas = [];
    if (verBd) tareas.push(rapCargar('priv.baseDatos', { caller: user.documento, act: '1' }, function (r, deCache) {
      if (!r || r.ok === false || !r.items) return;
      ULT.bd = r.items; pintar(top, an); medir(deCache ? 'cache' : 'red');
    }, null, SILENCIO).catch(function () { if (document.body.contains(top) && !ULT.bd) top.innerHTML = ''; }));
    if (verLid) tareas.push(rapCargar('priv.lideres', { caller: user.documento }, function (r) {
      if (!r || r.ok === false || !r.items) return;
      ULT.lid = r.items; pintar(top, an);
    }, null, SILENCIO).catch(function () {}));
    await Promise.all(tareas);
  }

  window.MARCADOR = { inicio: inicio, _calcBd: calcBd, _calcLid: calcLid };
})();

/* ============================================================================
 * lid-eliminar.js — PRIV › Líderes › ELIMINAR LÍDER Y TRASPASAR (17/11/2026)
 * ----------------------------------------------------------------------------
 * · Botón Eliminar en la tarjeta y en la ficha del líder (pastilla bd.eliminar
 *   para INVITADO, la misma de Eliminar en Base de datos; candado "Sin eliminar").
 * · La hoja se pinta AL INSTANTE con lo que ya trae la tarjeta; el resumen
 *   completo (priv.liderEliminarPrevia, lectura con caché en el CORE) llega de
 *   fondo y completa: referidos (incluidos inactivos), ahijados, delegaciones,
 *   compromisos y solicitudes donde es responsable, bitácoras, y qué líderes
 *   NO pueden recibir (INACTIVOS).
 * · Buscador local por nombre o número (sin viajes): no deja elegir al mismo
 *   ni a uno inactivo.
 * · Confirmar = UN viaje (priv.liderEliminar) con la clave de eliminación y un
 *   rid fijo: el reintento por red reusa el rid y el CORE no repite nada.
 *   Botón ocupado + escudo desde el primer toque. Al volver se parcha la lista
 *   de Líderes y la Base de datos en memoria (sin recargar todo).
 * · Depende de app.js: api, openSheet, closeLayer, toast, esc, avatarHtml,
 *   onlyDigits, saving, fallaRed, ldFind, ldAuth, LD_ALL, ldClfilRender,
 *   ldApplyFilter, RAP, BD_ALL, BD_LIDERES, normDocJs, I, SILENCIO.
 * ============================================================================ */
(function () {
  'use strict';
  var LE = { cod: '', dest: '', previa: null, inact: {}, enVuelo: false, rid: '', med: [] };

  function nf(n) { return Number(n || 0).toLocaleString('es-CO'); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim(); }
  function nuevoRid() { return 'le-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

  /* Inactivos conocidos sin viajar: la Base de datos de la sesión (si está) */
  function inactivosLocales() {
    var out = {};
    try {
      var bd = (typeof BD_ALL !== 'undefined' && BD_ALL.length) ? BD_ALL : (((RAP.tomar('priv.baseDatos') || {}).data || {}).items || []);
      if (!bd.length) return out;
      var est = {};
      bd.forEach(function (x) { est[normDocJs(x.documento)] = String(x.estado || 'ACTIVO').toUpperCase(); });
      LD_ALL.forEach(function (l) {
        var d = normDocJs(l.documento);
        if (!d || !(d in est) || est[d] === 'INACTIVO') out[String(l.codigo)] = true;
      });
    } catch (e) {}
    return out;
  }

  function ahijadosLocales(c) {
    var n = norm(c.nombre);
    return n ? LD_ALL.filter(function (x) { return String(x.codigo) !== String(c.codigo) && norm(x.padrino) === n; }).length : 0;
  }

  function resumenHtml(c) {
    var p = LE.previa, d = LE.dest ? ldFind(LE.dest) : null;
    var refs = p ? p.referidos : Number(c.referidos || 0);
    var act = p ? p.activos : Number(c.referidos || 0);
    var fila = function (k, v, cls) { return '<div class="le-r ' + (cls || '') + '"><span>' + esc(k) + '</span><b>' + v + '</b></div>'; };
    var cuenta = function (n, ab) { return p ? (nf(n) + (ab ? ' <em>(' + nf(ab) + ' abiertos)</em>' : '')) : '<i class="le-sk"></i>'; };
    var html = '';
    html += fila('Referidos que pasan', nf(refs) + (p && refs !== act ? ' <em>(' + nf(act) + ' activos)</em>' : ''), 'le-r-main');
    html += fila('Pasan a', d ? '#' + esc(d.codigo) + ' ' + esc(d.nombre) : '<em>elige abajo</em>', d ? 'le-r-dest' : '');
    html += fila('Ahijados que pasan', p ? nf(p.ahijados) : nf(ahijadosLocales(c)));
    html += fila('Delegaciones que pasan', p ? nf(p.delegados) : '<i class="le-sk"></i>');
    html += fila('Bitácoras (se conservan)', p ? nf(p.bitacoras) : '<i class="le-sk"></i>');
    html += fila('Compromisos a su cargo (quedan igual)', cuenta(p && p.compromisos, p && p.compromisosAbiertos));
    html += fila('Solicitudes a su cargo (quedan igual)', cuenta(p && p.solicitudes, p && p.solicitudesAbiertas));
    var aviso = '';
    if (p && (p.compromisosAbiertos || p.solicitudesAbiertas)) aviso = '<p class="le-aviso">Tiene ' +
      [p.compromisosAbiertos ? nf(p.compromisosAbiertos) + ' compromiso(s)' : '', p.solicitudesAbiertas ? nf(p.solicitudesAbiertas) + ' solicitud(es)' : ''].filter(Boolean).join(' y ') +
      ' abiertos a su nombre. Quedan como están: reasígnalos desde Compromisos o Solicitudes si hace falta.</p>';
    if (p && p.hayClave === false) aviso += '<p class="le-aviso le-aviso-mal">No hay clave de eliminación configurada (Configuración → Avanzado).</p>';
    return html + aviso;
  }

  function pintarResumen(c) { var b = document.getElementById('le-res'); if (b) b.innerHTML = resumenHtml(c); botonEstado(); }

  function candidatos(q) {
    var t = norm(q).replace(/^#/, ''), num = /^\d+$/.test(t);
    return LD_ALL.filter(function (x) {
      if (String(x.codigo) === String(LE.cod)) return false;
      if (!t) return true;
      return num ? String(x.codigo).indexOf(t) === 0 : norm(x.nombre).indexOf(t) >= 0 || String(x.codigo) === t;
    }).sort(function (a, b) {
      if (num) return String(a.codigo).length - String(b.codigo).length || Number(a.codigo) - Number(b.codigo);
      return (Number(b.referidos || 0) - Number(a.referidos || 0));
    }).slice(0, 40);
  }

  function pintarLista() {
    var box = document.getElementById('le-list'); if (!box) return;
    var q = (document.getElementById('le-q') || {}).value || '';
    var l = candidatos(q);
    box.innerHTML = l.length ? l.map(function (x) {
      var no = !!LE.inact[String(x.codigo)], on = String(x.codigo) === String(LE.dest);
      return '<button type="button" class="le-op' + (on ? ' on' : '') + (no ? ' no' : '') + '" data-cod="' + esc(x.codigo) + '"' + (no ? ' disabled' : '') + '>' +
        avatarHtml(x.nombre, x.foto) + '<span class="le-op-t"><b>#' + esc(x.codigo) + ' ' + esc(x.nombre || '') + '</b>' +
        '<em>' + (no ? 'Inactivo · no puede recibir' : nf(x.referidos) + ' referidos') + '</em></span></button>';
    }).join('') : '<p class="muted small center" style="margin:10px 0;">Ningún líder coincide.</p>';
    box.querySelectorAll('.le-op:not([disabled])').forEach(function (b) {
      b.onclick = function () { LE.dest = b.dataset.cod; pintarLista(); pintarResumen(ldFind(LE.cod)); var k = document.getElementById('le-clave'); if (k) k.focus(); };
    });
  }

  function botonEstado() {
    var b = document.getElementById('le-go'); if (!b || LE.enVuelo) return;
    var k = ((document.getElementById('le-clave') || {}).value || '').replace(/\D/g, '');
    var ok = !!LE.dest && !LE.inact[String(LE.dest)] && /^\d{6}$/.test(k) && !(LE.previa && LE.previa.hayClave === false) && !LE.sinCore;
    b.disabled = !ok;
    var d = LE.dest ? ldFind(LE.dest) : null, c = ldFind(LE.cod);
    var n = LE.previa ? LE.previa.referidos : Number((c || {}).referidos || 0);
    b.innerHTML = I.trash + ' ' + (d ? 'Eliminar #' + esc(LE.cod) + ' y pasar ' + nf(n) + ' referido(s) a #' + esc(d.codigo) : 'Elige quién recibe');
  }

  async function cargarPrevia(cod) {
    var t0 = performance.now();
    try {
      var r = await api('priv.liderEliminarPrevia', Object.assign({ codigo: cod }, ldAuth()), 'GET', null, SILENCIO);
      if (LE.cod !== cod || !document.getElementById('le-root')) return;
      LE.med.push(['previa', Math.round(performance.now() - t0)]);
      if (!r || r.ok === false) {
        if (r && /no reconocida|desconocida|unknown/i.test(r.msg || r.error || '')) { LE.sinCore = true; avisoCore(); }
        else if (r && r.msg) toast(r.msg, 'err');
        return;
      }
      LE.previa = r;
      (r.inactivos || []).forEach(function (k) { LE.inact[String(k)] = true; });
      if (LE.dest && LE.inact[String(LE.dest)]) LE.dest = '';
      pintarLista(); pintarResumen(ldFind(cod));
    } catch (e) {
      if (e && e.servidor && /no reconocida|Acción/i.test(e.message || '')) { LE.sinCore = true; avisoCore(); }
    }
  }
  function avisoCore() {
    var b = document.getElementById('le-res');
    if (b) b.insertAdjacentHTML('beforebegin', '<p class="le-aviso le-aviso-mal">Eliminar líder necesita la versión nueva del CORE. Pídela al desarrollador.</p>');
    botonEstado();
  }

  function abrir(cod) {
    var c = ldFind(cod);
    if (!c) return toast('Líder no encontrado', 'err');
    if (String(cod) === '1') return toast('El Líder Principal (código 1) no se puede eliminar.', 'err');
    LE = { cod: String(cod), dest: '', previa: null, inact: inactivosLocales(), enVuelo: false, rid: '', med: [] };
    openSheet('<div class="grip"></div><div class="le" id="le-root">' +
      '<header class="le-head">' + avatarHtml(c.nombre, c.foto, 'av-lg') +
      '<div><h2 class="h2">Eliminar líder</h2><div class="le-sub"><span class="ld-cod">#' + esc(c.codigo) + '</span> ' + esc(c.nombre || '') + '</div></div></header>' +
      '<p class="small muted le-nota">Sus referidos pasan al líder que elijas y él deja de ser líder. La persona sigue en la Base de datos; su clave de la zona de líderes deja de servir al momento.</p>' +
      '<div class="le-res" id="le-res"></div>' +
      '<label class="field le-buscar"><span>¿Quién recibe los referidos?</span>' +
      '<input class="input" id="le-q" placeholder="Busca por nombre o número" autocomplete="off" /></label>' +
      '<div class="le-list" id="le-list"></div>' +
      '<label class="field" style="margin-top:12px;"><span>Clave de eliminación</span>' +
      '<input class="input" id="le-clave" type="password" inputmode="numeric" maxlength="6" placeholder="6 dígitos" autocomplete="off" /></label>' +
      '<div class="stack" style="margin-top:14px;">' +
      '<button class="btn btn-primary btn-block bd-btn-danger" id="le-go" disabled></button>' +
      '<button class="btn btn-quiet btn-block" data-close>Cancelar</button></div></div>', 'sheet-xl le-sheet');
    pintarResumen(c); pintarLista();
    var q = document.getElementById('le-q'), t;
    q.oninput = function () { clearTimeout(t); t = setTimeout(pintarLista, 120); };
    var k = document.getElementById('le-clave'); onlyDigits(k); k.addEventListener('input', botonEstado);
    document.getElementById('le-go').onclick = confirmar;
    cargarPrevia(LE.cod);
  }

  async function confirmar() {
    var b = document.getElementById('le-go');
    if (LE.enVuelo || !b || b.disabled) return;           // escudo: un solo envío
    var clave = (document.getElementById('le-clave').value || '').replace(/\D/g, '');
    var cod = LE.cod, dest = LE.dest, d = ldFind(dest);
    if (!d || !/^\d{6}$/.test(clave)) return;
    LE.enVuelo = true; LE.rid = nuevoRid();
    saving(b, true);
    document.querySelectorAll('#le-root input, #le-root .le-op').forEach(function (x) { x.disabled = true; });
    var t0 = performance.now(), r;
    try {
      r = await api('priv.liderEliminar', {}, 'POST', Object.assign({ codigo: cod, destino: dest, clave: clave }, ldAuth()), { rid: LE.rid });
    } catch (e) {
      LE.enVuelo = false; saving(b, false);
      document.querySelectorAll('#le-root input, #le-root .le-op').forEach(function (x) { x.disabled = false; });
      pintarLista(); botonEstado();
      return fallaRed(e);
    }
    LE.med.push(['eliminar', Math.round(performance.now() - t0)]);
    if (!r || r.ok === false) {
      LE.enVuelo = false; saving(b, false);
      document.querySelectorAll('#le-root input, #le-root .le-op').forEach(function (x) { x.disabled = false; });
      pintarLista(); botonEstado();
      if (r && r.clave === false) { var k = document.getElementById('le-clave'); if (k) { k.value = ''; k.focus(); } botonEstado(); }
      if (r && r.yaNoEsta) { parcharLideres({ origen: { codigo: cod }, destino: { codigo: dest }, activosMovidos: 0, docs: [] }); closeLayer(); }
      return toast((r && r.msg) || 'No se pudo eliminar', 'err');
    }
    var tp = performance.now();
    parcharLideres(r); parcharBd(r);
    LE.med.push(['parche', Math.round(performance.now() - tp)]);
    try { if (window.RED && RED.pantalla) LE.med.forEach(function (m) { RED.pantalla('lid.eliminar.' + m[0], m[1]); }); } catch (e) {}
    window.__LE_MED = LE.med.slice();
    closeLayer();
    var abiertos = (r.compromisosAbiertos || 0) + (r.solicitudesAbiertas || 0);
    toast('Listo: ' + nf(r.movidos) + ' referido(s) pasaron a #' + r.destino.codigo + '. #' + r.origen.codigo + ' ya no es líder.' +
      (abiertos ? ' Ojo: tiene ' + nf(abiertos) + ' compromiso(s)/solicitud(es) abiertos a su nombre.' : ''), 'ok');
  }

  /* Lista de Líderes en memoria: quita al eliminado, suma al que recibe y
     mueve ahijados (mismo criterio del CORE). Sin recargar la lista. */
  function parcharLideres(r) {
    var cod = String(r.origen.codigo), dest = String(r.destino.codigo);
    var o = ldFind(cod), d = ldFind(dest);
    var nomO = o ? norm(o.nombre) : '';
    for (var i = LD_ALL.length - 1; i >= 0; i--) if (String(LD_ALL[i].codigo) === cod) LD_ALL.splice(i, 1);
    if (d) {
      d.referidos = Number(d.referidos || 0) + Number(r.activosMovidos || 0);
      LD_ALL.forEach(function (x) { if (nomO && norm(x.padrino) === nomO) x.padrino = String(x.codigo) === dest ? '' : d.nombre; });
    }
    try { RAP.tocar('priv.lideres'); RAP.olvidar('priv.liderReferidos:' + cod); RAP.olvidar('priv.liderReferidos:' + dest); } catch (e) {}
    try { ldClfilRender(); ldApplyFilter(); } catch (e) {}
  }

  /* Base de datos de la sesión (si está cargada): referencia y líder de los
     movidos, y el eliminado deja de tener la estrella. */
  function parcharBd(r) {
    try {
      var lista = (typeof BD_ALL !== 'undefined' && BD_ALL.length) ? BD_ALL : (((RAP.tomar('priv.baseDatos') || {}).data || {}).items || []);
      if (!lista.length) return;
      var set = {}; (r.docs || []).forEach(function (d) { set[d] = 1; });
      var docO = normDocJs(r.origen.documento || '');
      lista.forEach(function (x) {
        var d = normDocJs(x.documento);
        if (set[d]) { x.referencia = String(r.destino.codigo); x.lider = r.destino.nombre; }
        if (docO && d === docO) x.esLider = false;
      });
      if (typeof BD_LIDERES !== 'undefined') for (var i = BD_LIDERES.length - 1; i >= 0; i--) if (String(BD_LIDERES[i].codigo) === String(r.origen.codigo)) BD_LIDERES.splice(i, 1);
      if (r.muchos) RAP.olvidar('priv.baseDatos'); else RAP.tocar('priv.baseDatos');
    } catch (e) {}
  }

  window.ldEliminar = abrir;
})();

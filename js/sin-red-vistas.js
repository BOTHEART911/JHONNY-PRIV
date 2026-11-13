/* ============================================================================
 * sin-red-vistas.js — PRIV SIN CONEXIÓN EN TODAS LAS VISTAS (10/11/2026)
 * ----------------------------------------------------------------------------
 * Se carga después de falla-red.js y antes de app.js. app.js lo usa desde api().
 *
 *  1 · COPIA EN EL TELÉFONO. Cada lectura de vista que sale bien se guarda
 *      (IndexedDB, por usuario, tal como llegó del CORE). Sin señal, api()
 *      devuelve esa copia y la vista se pinta como siempre; la tira dice la
 *      hora del corte ("Sin conexión · datos de las 3:40 p. m."). Al cerrar
 *      sesión se borra todo (puede ser un celular compartido).
 *  2 · AVISO POR VISTA. Al entrar a una vista sin señal sale UNA vez una
 *      tarjeta con lo que se puede hacer ahí; "¿Qué puedo hacer?" de la tira
 *      abre la explicación completa de la vista.
 *  3 · PENDIENTES POR SUBIR. Crear reunión / compromiso / solicitud / evento,
 *      cambiar estados y escribir la bitácora del líder quedan guardados en
 *      este equipo con un rid FIJO. Nada se sube solo: el usuario los revisa
 *      y toca Subir (un reintento nunca duplica: el CORE responde lo mismo
 *      al mismo rid).
 * ============================================================================ */
(function (raiz) {
  'use strict';
  if (raiz.SRV) return;

  var NS = (raiz.STORAGE_NS || (raiz.MARCA && raiz.MARCA.STORAGE_NS) || 'jp');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ruta() { try { return (location.hash.replace(/^#\//, '') || '').split('?')[0]; } catch (e) { return ''; } }
  function enLinea() { try { return !raiz.SINRED || raiz.SINRED.enLinea(); } catch (e) { return true; } }
  function yo() {
    try { var d = localStorage.getItem(NS + ':jpriv_active'); return d || ''; } catch (e) { return ''; }
  }
  function nrid() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function hora(t) {
    var d = new Date(t), hoy = new Date();
    var h = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === hoy.toDateString()) return 'de las ' + h;
    var ay = new Date(); ay.setDate(ay.getDate() - 1);
    if (d.toDateString() === ay.toDateString()) return 'de ayer, ' + h;
    return 'del ' + d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) + ', ' + h;
  }

  /* ============================================================ 1 · COPIA */
  var COPIA = {};
  ('priv.baseDatos priv.bdCard priv.persona priv.trazabilidad priv.dashboard priv.simulador ' +
   'priv.lideres priv.lideresTablero priv.liderVer priv.liderReferidos priv.liderMeses priv.liderAhijados priv.balances priv.balanceVer ' +
   'priv.agenda priv.agendaMeta priv.reunionVer priv.reunionMeta ' +
   'priv.eventos priv.eventoVer priv.eventoMeta priv.eventoAsistentes ' +
   'priv.compromisos priv.compromisoVer priv.solicitudes priv.solicitudVer ' +
   'priv.notificaciones priv.notifVer priv.formularios priv.formRegistros ' +
   'priv.analisis priv.anServicios priv.anIdeas priv.anResenas priv.anComercios ' +
   'priv.miPerfil voto.contadores pub.residencias')
    .split(/\s+/).forEach(function (a) { if (a) COPIA[a] = true; });
  /* Lo que no cambia qué datos llegan (sesión, formato, quién llama) */
  var FUERA = { tk: 1, dev: 1, rid: 1, fmt: 1, gz: 1, caller: 1, _: 1 };
  function llave(u, accion, params) {
    var p = params || {}, ks = Object.keys(p).filter(function (k) { return !FUERA[k] && p[k] !== undefined && p[k] !== ''; }).sort();
    return u + '|' + accion + '|' + ks.map(function (k) { return k + '=' + p[k]; }).join('&');
  }

  var dbProm = null;
  function db() {
    if (dbProm) return dbProm;
    dbProm = new Promise(function (res, rej) {
      if (!raiz.indexedDB) return rej(new Error('sin indexedDB'));
      var r = indexedDB.open(NS + '-copias', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('c'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    dbProm.catch(function () { dbProm = null; });
    return dbProm;
  }
  function tx(modo, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction('c', modo), st = t.objectStore('c'), out = fn(st);
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error); };
      });
    });
  }
  var memCopia = {};   // llave → {t, d, v} (lo último leído o guardado en esta pestaña)
  function copiaGuardar(u, accion, params, data, v) {
    if (!u || !COPIA[accion] || data == null) return;
    var k = llave(u, accion, params), reg = { t: Date.now(), d: data, v: v || '' };
    memCopia[k] = reg;
    setTimeout(function () { tx('readwrite', function (st) { return st.put(reg, k); }).catch(function () {}); }, 0);
  }
  function copiaTomar(u, accion, params) {
    if (!u || !COPIA[accion]) return Promise.resolve(null);
    var k = llave(u, accion, params);
    if (memCopia[k]) return Promise.resolve(memCopia[k]);
    return tx('readonly', function (st) { return st.get(k); }).then(function (r) { return r || null; }).catch(function () { return null; });
  }
  function copiaBorrarTodo() {
    memCopia = {}; locales = null;
    return tx('readwrite', function (st) { return st.clear(); }).catch(function () {});
  }
  /* La copia vuelve a ser lo que api() devuelve (se abre igual que lo fresco) */
  async function desdeCopia(c) {
    var data = c.d;
    try { if (raiz.RAP && data && data.fmt === 2) data = await raiz.RAP.abrir(data); } catch (e) {}
    if (data && typeof data === 'object') { try { Object.defineProperty(data, '__copia', { value: c.t, enumerable: false, configurable: true }); } catch (e) {} }
    marcarCorte(c.t);
    /* Con señal pero sin respuesta (red caída a medias): que no parezca dato fresco */
    if (enLinea() && raiz.toast) raiz.toast('El servidor no respondió: ves lo guardado en este equipo ' + hora(c.t) + '.', 'err');
    return data;
  }

  /* Buscar personas sin señal (compromisos / solicitudes): en la copia de la base */
  var locales = null;
  async function buscarLocal(u, q) {
    q = String(q || '').trim();
    if (q.length < 2) return { items: [] };
    if (!locales) {
      var c = await copiaTomar(u, 'priv.baseDatos', { act: '1' });
      if (!c) c = await copiaTomar(u, 'priv.baseDatos', {});
      if (!c) return null;
      var d = c.d;
      try { if (raiz.RAP && d && d.fmt === 2) d = await raiz.RAP.abrir(d); } catch (e) { return null; }
      locales = ((d && d.items) || []).map(function (x) {
        return { documento: String(x.documento || ''), nombre: String(x.nombre || ''), contacto: String(x.contacto || x.whatsapp || x.celular || x.telefono || ''),
          k: (String(x.nombre || '') + ' ' + String(x.documento || '')).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase() };
      });
    }
    var ws = q.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/\s+/).filter(Boolean);
    var out = [];
    for (var i = 0; i < locales.length && out.length < 12; i++) {
      var p = locales[i];
      if (ws.every(function (w) { return p.k.indexOf(w) >= 0; })) out.push({ documento: p.documento, nombre: p.nombre, contacto: p.contacto });
    }
    return { items: out, local: true };
  }

  /* Precarga de lo que necesitan los formularios sin señal: una vez al día por vista */
  var PRECARGA = {
    agenda: [['priv.reunionMeta', {}]],
    eventos: [['priv.eventoMeta', {}]],
    compromisos: [['priv.baseDatos', { act: '1' }]],
    solicitudes: [['priv.baseDatos', { act: '1' }]]
  };
  function precargar(r) {
    var lista = PRECARGA[r], u = yo();
    if (!lista || !u || !enLinea() || typeof raiz.api !== 'function') return;
    lista.forEach(function (x) {
      copiaTomar(u, x[0], x[1]).then(function (c) {
        if (c && Date.now() - c.t < 864e5) return;
        var p = Object.assign({ caller: u }, x[1], x[0] === 'priv.baseDatos' && raiz.RAP ? raiz.RAP.params() : {});
        raiz.api(x[0], p, 'GET', null, { silent: true }).then(function () { locales = null; }, function () {});
      });
    });
  }

  /* ---- corte en la tira ---- */
  var corteRuta = '', corteT = 0, textoPuesto = 'Sin conexión';
  function marcarCorte(t) {
    var r = ruta();
    if (corteRuta === r && corteT && corteT <= t) return;   // ya se dice el corte más viejo de la vista
    corteRuta = r; corteT = t;
    pintarCorte();
  }
  function pintarCorte() {
    if (!raiz.SINRED || !raiz.SINRED.montar) return;
    var txt = (corteT && corteRuta === ruta()) ? 'Sin conexión · datos ' + hora(corteT) : 'Sin conexión';
    if (txt === textoPuesto) return;   /* montar() también sondea la red: solo si cambia el texto */
    textoPuesto = txt;
    raiz.SINRED.montar({ textoSin: txt });
  }

  /* ============================================================ 3 · PENDIENTES */
  function resReunion(b) { return [b.titulo, [b.fecha, b.inicia].filter(Boolean).join(' · ')].filter(Boolean).join(' — '); }
  var PEND = {
    'priv.reunionGuardar': { g: 'agenda', que: 'La reunión', res: resReunion },
    'priv.reunionEstado': { g: 'agenda', que: 'El cambio de estado de la reunión', res: function (b) { return 'Reunión ' + (b.id || '') + ' → ' + (b.estado || ''); } },
    'priv.reunionEstadoBulk': { g: 'agenda', que: 'El cambio de estado de las reuniones', res: function (b) { return ((b.ids || []).length) + ' reuniones → ' + (b.estado || ''); } },
    'priv.compromisoGuardar': { g: 'compromisos', que: 'El compromiso', hora: true, res: function (b) { return [b.compromiso, b.nombre && ('de ' + b.nombre), b.asignado && ('asignado a ' + b.asignado)].filter(Boolean).join(' · '); } },
    'priv.compromisoEstado': { g: 'compromisos', que: 'El cambio de estado del compromiso', res: function (b) { return 'Compromiso ' + (b.id || '') + ' → ' + (b.estado || ''); } },
    'priv.solicitudGuardar': { g: 'solicitudes', que: 'La solicitud', hora: true, res: function (b) { return [b.solicitud, b.asignado && ('asignada a ' + b.asignado)].filter(Boolean).join(' · '); } },
    'priv.solicitudEstado': { g: 'solicitudes', que: 'El cambio de estado de la solicitud', res: function (b) { return 'Solicitud ' + (b.id || '') + ' → ' + (b.estado || ''); } },
    'priv.eventoGuardar': { g: 'eventos', que: 'El evento', res: function (b) { return [b.evento, [b.fecha, b.inicia].filter(Boolean).join(' · ')].filter(Boolean).join(' — '); } },
    'priv.liderBitacoraGuardar': { g: 'lideres', que: 'La bitácora', res: function (b) { return 'Líder ' + (b.codigo || '') + ' · ' + (b.mes || '') + (b.refiere ? ' · ' + b.refiere : (b.compromiso ? ' · ' + b.compromiso : '')); } }
  };
  var GRUPOS = { agenda: 'Agenda', compromisos: 'Compromisos', solicitudes: 'Solicitudes', eventos: 'Eventos', lideres: 'Líderes (bitácora)' };
  function pClave(u) { return NS + ':pendw:' + (u || yo() || 'anon'); }
  function pLista(u) { try { var a = JSON.parse(localStorage.getItem(pClave(u)) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function pGuardar(arr, u) {
    try { if (arr.length) localStorage.setItem(pClave(u), JSON.stringify(arr)); else localStorage.removeItem(pClave(u)); } catch (e) { return false; }
    pintarExtras();
    return true;
  }
  function pContar(g, u) { return pLista(u).filter(function (x) { return !g || x.g === g; }).length; }
  function pendAgregar(u, accion, params, metodo, body) {
    var def = PEND[accion]; if (!def) return null;
    var b = Object.assign({}, body || {});
    var t = Date.now();
    if (def.hora) b.creadoSinRed = t;   /* el CORE (10/11/2026) conserva la hora en que se anotó */
    var it = { id: 'w' + t.toString(36) + Math.random().toString(36).slice(2, 6), a: accion, g: def.g, p: params || {}, m: metodo || 'POST', b: b, rid: nrid(), t: t, st: 'nuevo' };
    var s = JSON.stringify(it);
    if (s.length > 700000) return null;   // demasiado pesado para guardarlo aquí
    var arr = pLista(u); arr.push(it);
    return pGuardar(arr, u) ? it : null;
  }
  function firma(it) { var b = Object.assign({}, it.b); delete b.creadoSinRed; return it.a + '|' + JSON.stringify(b); }

  function hojaPendientes(soloG) {
    if (typeof raiz.openSheet !== 'function') return;
    var arr = pLista(), vistos = {};
    var lista = arr.filter(function (x) { return !soloG || x.g === soloG; });
    var red = enLinea();
    var filas = lista.map(function (it) {
      var def = PEND[it.a] || {}, f = firma(it), rep = vistos[f]; vistos[f] = 1;
      var estado = it.st === 'error'
        ? '<span class="srv-chip srv-chip--mal">Por corregir: ' + esc(it.msg || 'no se pudo') + '</span>'
        : (rep ? '<span class="srv-chip srv-chip--rep">Parece repetido</span>' : '<span class="srv-chip">Listo para subir</span>');
      return '<div class="srv-item" data-id="' + esc(it.id) + '">' +
        '<div class="srv-item-tx"><b>' + esc(def.que || it.a) + '</b><span>' + esc((def.res ? def.res(it.b) : '') || '') + '</span>' +
        '<small class="muted">' + esc(GRUPOS[it.g] || '') + ' · anotado ' + esc(hora(it.t).replace(/^de las/, 'a las').replace(/^de ayer/, 'ayer').replace(/^del /, 'el ')) + '</small>' + estado + '</div>' +
        '<div class="srv-item-bt"><button type="button" class="btn btn-ghost srv-sub" data-id="' + esc(it.id) + '"' + (red ? '' : ' disabled') + '>Subir</button>' +
        '<button type="button" class="btn btn-ghost srv-des" data-id="' + esc(it.id) + '">Descartar</button></div></div>';
    }).join('');
    raiz.openSheet('<div class="grip"></div><h2 class="h2" style="margin-bottom:4px;">Pendientes por subir' + (soloG ? ' · ' + esc(GRUPOS[soloG] || '') : '') + '</h2>' +
      '<p class="muted small">Se guardaron en este equipo sin señal. Revísalos: nada se sube solo.' + (red ? '' : ' <b>Ahora no hay internet:</b> podrás subirlos cuando vuelva.') + '</p>' +
      (lista.length ? '<div class="srv-lista">' + filas + '</div>' : '<p class="muted center">No hay pendientes.</p>') +
      (lista.length > 1 ? '<button type="button" class="btn btn-primary btn-block" id="srv-todos"' + (red ? '' : ' disabled') + '>Subir todos (' + lista.length + ')</button>' : '') +
      '<button type="button" class="btn btn-ghost btn-block" data-close style="margin-top:8px;">Cerrar</button>');
    var capa = document.getElementById('layer'); if (!capa) return;
    capa.querySelectorAll('.srv-sub').forEach(function (b) { b.onclick = function () { subir([b.dataset.id], soloG); }; });
    capa.querySelectorAll('.srv-des').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = '¿Seguro? Toca otra vez'; return; }
        pGuardar(pLista().filter(function (x) { return x.id !== b.dataset.id; }));
        hojaPendientes(soloG);
      };
    });
    var todos = document.getElementById('srv-todos');
    if (todos) todos.onclick = function () { subir(lista.map(function (x) { return x.id; }), soloG); };
  }

  var subiendo = false;
  async function subir(ids, soloG) {
    if (subiendo || typeof raiz.api !== 'function') return;
    if (!enLinea()) { if (raiz.toast) raiz.toast('Todavía no hay internet: tus pendientes siguen guardados.', 'err'); return; }
    subiendo = true;
    var capa = document.getElementById('layer');
    if (capa) capa.querySelectorAll('.srv-sub, #srv-todos, .srv-des').forEach(function (b) { b.disabled = true; });
    var bien = 0, mal = 0, cortado = false;
    for (var i = 0; i < ids.length; i++) {
      var it = pLista().filter(function (x) { return x.id === ids[i]; })[0];
      if (!it) continue;
      var btn = capa && capa.querySelector('.srv-sub[data-id="' + it.id + '"]'); if (btn) btn.textContent = 'Subiendo…';
      try {
        var r = await raiz.api(it.a, it.p, it.m, it.b, { rid: it.rid, sinPend: true });
        if (r && r.ok === false) throw Object.assign(new Error(r.msg || 'No se pudo'), { negado: true });
        pGuardar(pLista().filter(function (x) { return x.id !== it.id; }));
        bien++;
      } catch (e) {
        if (e && (e.red || e.tiempo)) { cortado = true; break; }
        var a = pLista(); a.forEach(function (x) { if (x.id === it.id) { x.st = 'error'; x.msg = String((e && e.message) || 'No se pudo'); x.rid = nrid(); } }); pGuardar(a);
        mal++;
      }
    }
    subiendo = false;
    var msg = (bien ? bien + ' subido' + (bien === 1 ? '' : 's') : '') + (mal ? (bien ? ' · ' : '') + mal + ' por corregir' : '') + (cortado ? ((bien || mal) ? ' · ' : '') + 'se fue la señal: lo demás sigue guardado' : '');
    if (raiz.toast) raiz.toast(msg || 'Nada que subir', mal || cortado ? 'err' : 'ok');
    if (pContar(soloG)) hojaPendientes(soloG);
    else { if (raiz.closeLayer) raiz.closeLayer(); }
    if (bien) {
      try { if (raiz.RAP) raiz.RAP.olvidar(); } catch (e) {}
      if (typeof raiz.render === 'function' && !(document.getElementById('layer') || {}).children.length) raiz.render();
    }
  }

  /* ============================================================ 2 · AVISO POR VISTA */
  var TEXTOS = {
    '': { n: 'Inicio', ver: 'Las vistas que ya abriste con señal se ven con lo último guardado en este equipo.',
      puede: ['Anotar contactos en Base de datos (quedan en Pendientes).', 'Crear reuniones, compromisos, solicitudes y eventos, y cambiar su estado: quedan como pendientes por subir.', 'Escribir la bitácora del mes de un líder.'],
      nec: 'Configuración, Mi Bot, enviar por WhatsApp, editar, eliminar y descargar Excel o PDF.' },
    bd: { n: 'Base de datos', ver: 'Ves la base de datos guardada en este equipo; buscar y filtrar funciona igual.',
      puede: ['Anotar contactos nuevos con + Agregar: quedan en Pendientes.', 'Pegar varios registros que tengas en WhatsApp o en notas.', 'Abrir Detalles de las personas que ya habías abierto con señal.'],
      nec: 'Revisar documentos, subir los pendientes, editar, eliminar y descargar Excel o PDF.' },
    dashboard: { n: 'Tablero', ver: 'Ves el tablero con la última copia de la base de datos.', puede: [], nec: 'Descargar Excel o PDF.' },
    lideres: { n: 'Líderes', ver: 'Ves la lista de líderes y las fichas que ya abriste con señal.',
      puede: ['Escribir la bitácora del mes de un líder: queda como pendiente por subir.'],
      nec: 'Agregar, editar, activar o delegar líderes y descargar Excel o PDF.' },
    agenda: { n: 'Agenda', ver: 'Ves la agenda guardada en este equipo.',
      puede: ['Crear reuniones con + Reunión: quedan como pendientes por subir.', 'Marcar reuniones como realizadas o canceladas (también quedan pendientes).'],
      nec: 'Editar, eliminar, enviar por WhatsApp y el resumen al candidato.' },
    compromisos: { n: 'Compromisos', ver: 'Ves los compromisos guardados en este equipo.',
      puede: ['Crear compromisos (las personas se buscan en la copia de la base): quedan como pendientes por subir.', 'Cambiar el estado de un compromiso (queda pendiente).'],
      nec: 'Editar, eliminar, enviar por WhatsApp y agregar al historial.' },
    solicitudes: { n: 'Solicitudes', ver: 'Ves las solicitudes guardadas en este equipo.',
      puede: ['Crear solicitudes: quedan como pendientes por subir.', 'Cambiar el estado de una solicitud (queda pendiente).'],
      nec: 'Editar, eliminar, enviar por WhatsApp y agregar al historial.' },
    eventos: { n: 'Eventos', ver: 'Ves los eventos guardados en este equipo.',
      puede: ['Crear eventos: quedan como pendientes por subir.'],
      nec: 'Editar, eliminar, cambiar el estado y descargar asistentes.' },
    formularios: { n: 'Formularios', ver: 'Ves los formularios y los registros que ya abriste con señal.', puede: [], nec: 'Crear, editar, encender o apagar formularios y pasar registros a la base.' },
    notificaciones: { n: 'Notificaciones', ver: 'Ves las notificaciones guardadas en este equipo.', puede: [], nec: 'Crear, editar y enviar notificaciones.' },
    analisis: { n: 'Análisis', ver: 'Ves el último análisis guardado en este equipo.', puede: [], nec: 'Cambiar estados, ocultar reseñas, el análisis con IA y los PDF.' },
    simulador: { n: 'Simulador', ver: 'Ves el último cálculo guardado en este equipo.', puede: [], nec: 'Recalcular con datos nuevos y el PDF.' },
    votacion: { n: 'Votación', ver: 'Ves el último conteo guardado: NO está en vivo.', puede: [], nec: 'El conteo en vivo y los informes.' },
    config: { n: 'Configuración', ver: '', puede: [], nec: 'Toda la configuración necesita señal (para no pisar cambios de otros).' },
    mibot: { n: 'Mi Bot', ver: '', puede: [], nec: 'Mi Bot necesita señal (estado, QR y mensajes).' }
  };
  TEXTOS.home = TEXTOS[''];
  function texto(r) { return TEXTOS[r] || null; }

  function cuerpoAyuda(r, corto) {
    var t = texto(r) || TEXTOS[''];
    var li = t.puede.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    return (t.ver ? '<p>' + esc(t.ver) + '</p>' : '') +
      (li ? '<p class="srv-sub"><b>Puedes hacer aquí:</b></p><ul>' + li + '</ul>' : (corto ? '' : '<p class="muted">En esta vista no se puede crear nada sin señal.</p>')) +
      '<p class="srv-nec"><b>Necesita señal:</b> ' + esc(t.nec) + '</p>';
  }
  function explicar() {
    if (typeof raiz.openSheet !== 'function') return;
    var r = ruta(), t = texto(r) || TEXTOS[''];
    var nBd = 0; try { nBd = raiz.SINRED ? raiz.SINRED.contar() : 0; } catch (e) {}
    var nW = pContar('');
    raiz.openSheet('<div class="grip"></div><h2 class="h2" style="margin-bottom:6px;">Sin conexión · ' + esc(t.n) + '</h2>' +
      '<div class="sr-ayuda">' + cuerpoAyuda(r) +
      (corteT && corteRuta === r ? '<p class="muted small">Lo que ves es lo guardado ' + esc(hora(corteT)) + '.</p>' : '') +
      '<p class="muted small">Las vistas que nunca abriste con señal en este equipo todavía no tienen copia. Al volver la conexión no se sube nada solo: revisas y tocas Subir.</p></div>' +
      ((nBd || nW) ? '<p class="small" style="margin-top:8px;">En este equipo tienes ' + [nBd ? '<b>' + nBd + '</b> contacto' + (nBd === 1 ? '' : 's') + ' en Pendientes' : '', nW ? '<b>' + nW + '</b> pendiente' + (nW === 1 ? '' : 's') + ' por subir' : ''].filter(Boolean).join(' y ') + '.</p>' : '') +
      (nW ? '<button type="button" class="btn btn-ghost btn-block" id="srv-ver-pend" style="margin-top:8px;">Ver pendientes por subir</button>' : '') +
      '<button class="btn btn-primary btn-block" data-close style="margin-top:12px;">Entendido</button>');
    var b = document.getElementById('srv-ver-pend'); if (b) b.onclick = function () { hojaPendientes(''); };
  }

  /* Tarjeta al entrar sin señal (una vez por vista mientras dure el corte de red) */
  var vistasAvisadas = {}, cartaRuta = null;
  var GRUPO_RUTA = { agenda: 'agenda', compromisos: 'compromisos', solicitudes: 'solicitudes', eventos: 'eventos', lideres: 'lideres' };
  function htmlExtras() {
    var r = ruta(), out = '';
    if (!enLinea() && !vistasAvisadas[r] && texto(r)) {
      var t = texto(r); cartaRuta = r;
      out += '<div class="srv-aviso" role="status"><div class="srv-aviso-tx"><b>Sin señal en ' + esc(t.n) + '</b>' + cuerpoAyuda(r, true) + '</div>' +
        '<button type="button" class="btn btn-ghost srv-ok" data-srv="ok">Entendido</button></div>';
    }
    var g = GRUPO_RUTA[r], n = g ? pContar(g) : ((r === '' || r === 'home') ? pContar('') : 0);
    if (n) {
      out += '<button type="button" class="srv-barra" data-srv="pend" data-g="' + (g || '') + '"><span class="srv-pt"></span><b>' + n + ' pendiente' + (n === 1 ? '' : 's') + ' por subir</b>' +
        '<span class="srv-mas">' + (enLinea() ? 'Revisar y subir' : 'Ver') + '</span></button>';
    }
    return out;
  }
  function pintarExtras() {
    if (typeof document === 'undefined') return;
    var app = document.getElementById('app'); if (!app) return;
    var html = htmlExtras();
    var w = app.querySelector(':scope > .srv-wrap');
    if (!html) { if (w) w.remove(); return; }
    var antes = app.querySelector(':scope > .sr-tira-wrap') || app.querySelector(':scope > .appbar');
    if (!w) { w = document.createElement('div'); w.className = 'srv-wrap'; }
    if (antes) { if (antes.nextElementSibling !== w) antes.insertAdjacentElement('afterend', w); }
    else if (app.firstChild !== w) app.insertBefore(w, app.firstChild);
    if (w.__h !== html) { w.innerHTML = html; w.__h = html; }
  }
  var obs = null;
  function vigilar() {
    var app = document.getElementById('app');
    if (!app || obs || typeof MutationObserver !== 'function') return;
    obs = new MutationObserver(function () {
      var w = app.querySelector(':scope > .srv-wrap');
      var antes = app.querySelector(':scope > .sr-tira-wrap') || app.querySelector(':scope > .appbar');
      if (!w || (antes && antes.nextElementSibling !== w)) pintarExtras();
    });
    obs.observe(app, { childList: true });
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest && ev.target.closest('[data-srv]');
      if (!b) return;
      if (b.dataset.srv === 'ok') { vistasAvisadas[ruta()] = 1; pintarExtras(); }
      if (b.dataset.srv === 'pend') hojaPendientes(b.dataset.g || '');
    });
    raiz.addEventListener('hashchange', function () {
      if (cartaRuta !== null && cartaRuta !== ruta()) { vistasAvisadas[cartaRuta] = 1; cartaRuta = null; }   /* la tarjeta sale una vez por vista */
      corteRuta = ''; corteT = 0; pintarCorte();
      setTimeout(function () { pintarExtras(); precargar(ruta()); }, 0);
    });
    var arrancar = function () { vigilar(); pintarExtras(); setTimeout(function () { precargar(ruta()); }, 2500); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
  }
  if (raiz.SINRED && raiz.SINRED.al) raiz.SINRED.al(function (nuevo, antes, que) {
    if (!que && nuevo === 'en' && antes === 'sin') { vistasAvisadas = {}; corteT = 0; pintarCorte(); }
    pintarExtras();
  });

  /* Cerrar sesión: copias fuera; ¿cuántos pendientes de escritura hay? */
  function salir() { copiaBorrarTodo(); }
  function borrarPendientes(u) { pGuardar([], u); }

  raiz.SRV = {
    copiaAplica: function (a) { return !!COPIA[a]; },
    copiaGuardar: copiaGuardar, copiaTomar: copiaTomar, desdeCopia: desdeCopia, copiaBorrarTodo: copiaBorrarTodo,
    buscarLocal: buscarLocal, marcarCorte: marcarCorte,
    pendAplica: function (a) { return !!PEND[a]; }, pendQue: function (a) { return (PEND[a] || {}).que || ''; },
    pendAgregar: pendAgregar, pendContar: pContar, pendLista: pLista, hojaPendientes: hojaPendientes, borrarPendientes: borrarPendientes,
    explicar: explicar, texto: texto, pintarExtras: pintarExtras, salir: salir, yo: yo
  };
})(typeof self !== 'undefined' ? self : this);

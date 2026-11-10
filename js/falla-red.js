/* ============================================================================
 * falla-red.js — AVISOS CLAROS CUANDO ALGO NO CARGA O NO SE GUARDA (10/11/2026)
 * ----------------------------------------------------------------------------
 * Reemplaza el "Error de conexión" genérico. Separa tres casos:
 *   · SIN INTERNET  → "No tienes acceso a internet; por eso no se pudo cargar
 *                      la agenda." (o "…no se pudo crear la reunión.")
 *   · RED MUY LENTA → se agotó el tiempo con señal.
 *   · SERVIDOR      → hay señal pero el servidor respondió con error o Google
 *                      devolvió una página en vez de datos.
 *
 * La frase sale de la ACCIÓN que falló (api() la pega al error: e.accion).
 * Si un catch no tiene el error a mano, se usa la última falla anotada.
 *
 *   FALLA.txt(e)      → texto del aviso
 *   fallaRed(e)       → toast con el aviso (reemplaza toast('Error de conexión'))
 *   fallaHtml(e)      → bloque para el cuerpo de una vista que no cargó, con
 *                       "Reintentar"; vuelve a cargar SOLO al volver la señal.
 *   FALLA.anotar(e, accion) → lo llama api() en cada falla.
 *
 * Sin dependencias de app.js en la carga: usa window.toast / window.render
 * cuando existen. Se carga después de sin-red.js y antes de app.js.
 * ============================================================================ */
(function (raiz) {
  'use strict';
  if (raiz.FALLA) return;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ------------------------------------------------------------ frases */
  /* Exactas: lo que se ve en pantalla. Lo que no esté aquí se arma por partes. */
  var EXACTAS = {
    'priv.login': 'ingresar', 'priv.rev': 'revisar los cambios', 'priv.agenda': 'cargar la agenda',
    'priv.agendaMeta': 'cargar los datos de la agenda', 'priv.agendaBotEnviar': 'enviar el resumen de la agenda',
    'priv.baseDatos': 'cargar la base de datos', 'priv.bdCard': 'abrir la tarjeta', 'priv.bdVivo': 'actualizar la base de datos',
    'priv.bdExcel': 'descargar el Excel de la base de datos', 'priv.bdPdf': 'generar el PDF de la base de datos',
    'priv.bdPendRevisar': 'revisar los pendientes', 'priv.bdNuevoLote': 'subir los pendientes', 'priv.bdReiniciarAsis': 'reiniciar las asistencias',
    'priv.persona': 'abrir la persona', 'priv.personaAgregar': 'agregar la persona', 'priv.personaEditar': 'guardar los cambios de la persona',
    'priv.personaEliminar': 'eliminar la persona', 'priv.personaInactivar': 'inactivar la persona', 'priv.personaReasignarLote': 'reasignar las personas',
    'priv.validarDoc': 'validar el documento', 'priv.trazabilidad': 'cargar los detalles', 'priv.trazabilidadLote': 'cargar los detalles',
    'priv.lideres': 'cargar los líderes', 'priv.liderVer': 'abrir el líder', 'priv.liderReferidos': 'cargar los referidos del líder',
    'priv.liderNuevoMeta': 'preparar el formulario del líder', 'priv.liderBuscarDoc': 'buscar el documento', 'priv.liderAhijados': 'cargar los líderes a cargo',
    'priv.liderMeses': 'cargar el trabajo por mes', 'priv.liderBitacoraInforme': 'generar el informe de bitácoras',
    'priv.liderBitacoraGuardar': 'guardar la bitácora', 'priv.liderBitacoraEditar': 'guardar los cambios de la bitácora',
    'priv.liderDelegar': 'delegar el líder', 'priv.liderClasificacion': 'cambiar la clasificación del líder', 'priv.liderAccion': 'aplicar la acción al líder',
    'priv.liderActivarInfo': 'cargar los datos para activar el líder',
    'priv.dashboard': 'cargar el tablero', 'priv.simulador': 'cargar el simulador', 'priv.simuladorPdf': 'generar el PDF del simulador',
    'priv.eventos': 'cargar los eventos', 'priv.eventoGuardar': 'crear el evento', 'priv.eventoAsistentes': 'cargar los asistentes',
    'priv.eventoAsistentesExcel': 'descargar el Excel de asistentes',
    'priv.reunionGuardar': 'crear la reunión', 'priv.reunionEstadoBulk': 'cambiar el estado de las reuniones', 'priv.reunionWaBot': 'enviar la reunión por WhatsApp',
    'priv.compromisos': 'cargar los compromisos', 'priv.compromisoGuardar': 'crear el compromiso', 'priv.compromisoWaBot': 'enviar el compromiso por WhatsApp',
    'priv.compromisoTraza': 'cargar el historial del compromiso',
    'priv.solicitudes': 'cargar las solicitudes', 'priv.solicitudGuardar': 'crear la solicitud', 'priv.solicitudWaBot': 'enviar la solicitud por WhatsApp',
    'priv.solicitudTraza': 'cargar el historial de la solicitud',
    'priv.notificaciones': 'cargar las notificaciones', 'priv.notifGuardar': 'crear la notificación', 'priv.notifEnviar': 'enviar la notificación',
    'priv.formularios': 'cargar los formularios', 'priv.formRegistros': 'cargar los registros del formulario', 'priv.formImagen': 'subir la imagen',
    'priv.analisis': 'cargar el análisis', 'priv.anServicios': 'cargar los servicios', 'priv.anIdeas': 'cargar las ideas', 'priv.anIdeasPdf': 'generar el PDF de ideas',
    'priv.anIdeaEstado': 'cambiar el estado de la idea', 'priv.anCortePdf': 'generar el PDF del corte', 'priv.anResenas': 'cargar las reseñas',
    'priv.anResenaOcultar': 'ocultar la reseña', 'priv.anComercios': 'cargar los comercios', 'priv.anComercioEstado': 'cambiar el estado del comercio',
    'priv.iaAnalizar': 'hacer el análisis con IA', 'priv.iaPdf': 'generar el PDF del análisis', 'priv.iaEstado': 'consultar la IA', 'priv.iaModelos': 'cargar los modelos de IA', 'priv.iaClave': 'guardar la clave de IA',
    'priv.vozEstado': 'consultar la voz', 'priv.vozVoces': 'cargar las voces', 'priv.vozHablar': 'probar la voz', 'priv.vozClave': 'guardar la clave de voz',
    'priv.balances': 'cargar los balances', 'priv.balanceVer': 'abrir el balance', 'priv.balancePdf': 'generar el PDF del balance', 'priv.balanceXlsx': 'descargar el Excel del balance',
    'priv.miPerfil': 'cargar tu perfil', 'priv.miFoto': 'cambiar tu foto', 'priv.miFotoQuitar': 'quitar tu foto',
    'priv.cfgTodo': 'cargar la configuración', 'priv.cfgGuardar': 'guardar la configuración', 'priv.configList': 'cargar la configuración',
    'priv.cfgPuestos': 'cargar los puestos', 'priv.puestoGuardar': 'guardar el puesto', 'priv.puestoLote': 'guardar los puestos',
    'priv.permCatalogo': 'cargar los permisos', 'priv.vistasPub': 'cambiar las vistas públicas', 'priv.contactoBuscar': 'buscar el contacto',
    'priv.botEstado': 'consultar Mi Bot', 'priv.botQR': 'generar el código QR del bot', 'priv.botReiniciar': 'reiniciar el bot', 'priv.botMute': 'silenciar el bot',
    'priv.botEliminarSesion': 'cerrar la sesión del bot', 'priv.botBlacklist': 'cargar la lista bloqueada', 'priv.botDesbloquear': 'desbloquear el número',
    'priv.cfgBotProbar': 'probar el bot',
    'voto.contadores': 'cargar la votación', 'voto.excel': 'descargar el Excel de la votación', 'voto.informePdf': 'generar el informe de la votación',
    'priv.cfgUsuarioFotoQuitar': 'quitar la foto del usuario', 'priv.lideresExcel': 'descargar el Excel de los líderes', 'priv.lideresPdf': 'generar el PDF de los líderes',
    'priv.liderReferidosExcel': 'descargar el Excel de los referidos', 'priv.botBloquear': 'bloquear el número', 'priv.botLimpiar': 'limpiar el bot',
    'priv.dashExcel': 'descargar el Excel del tablero', 'priv.dashPdf': 'generar el PDF del tablero', 'priv.formAgregarBd': 'pasar los registros a la base de datos',
    'priv.formApagar': 'apagar el formulario', 'priv.formEncender': 'encender el formulario', 'priv.formReusar': 'reutilizar el formulario',
    'voto.pdf': 'generar el PDF de la votación', 'voto.ver': 'cargar la votación',
    'pub.residencias': 'cargar los barrios'
  };
  /* Por partes: priv.<cosa><Verbo> */
  var COSAS = {
    reunion: 'la reunión', evento: 'el evento', compromiso: 'el compromiso', solicitud: 'la solicitud', notif: 'la notificación',
    persona: 'la persona', lider: 'el líder', balance: 'el balance', puesto: 'el puesto', agenda: 'la agenda',
    cfgUsuario: 'el usuario', cfgTel: 'el teléfono', cfgServ: 'el servicio', cfgRed: 'la red social', cfgPuesto: 'el puesto',
    cfgProf: 'el profesional', cfgInicioImagen: 'la imagen de inicio', cfgCasaItem: 'el elemento de la casa', cfgCasaImagen: 'la imagen de la casa',
    cfgCasaDia: 'el día de la casa', cfgCallUsuario: 'el usuario del call center', cfgCall: 'la configuración del call center',
    cfgZona: 'la zona', cfg: 'la configuración', form: 'el formulario', bot: 'el bot'
  };
  var VERBOS = [
    ['EstadoBulk', 'cambiar el estado de'], ['Estado', 'cambiar el estado de'], ['Guardar', 'guardar'], ['Editar', 'guardar los cambios de'],
    ['Eliminar', 'eliminar'], ['Quitar', 'quitar'], ['Ver', 'abrir'], ['Meta', 'preparar los datos de'], ['Excel', 'descargar el Excel de'],
    ['Xlsx', 'descargar el Excel de'], ['Pdf', 'generar el PDF de'], ['Agregar', 'agregar'], ['Activar', 'activar'], ['Inactivar', 'inactivar'],
    ['Asignar', 'asignar'], ['Impacto', 'calcular el impacto de'], ['Bienvenida', 'enviar la bienvenida a'], ['Foto', 'cambiar la foto de'],
    ['Enviar', 'enviar'], ['WaBot', 'enviar por WhatsApp'], ['Traza', 'cargar el historial de'], ['Lote', 'guardar en bloque']
  ];
  function frase(accion) {
    accion = String(accion || '');
    if (EXACTAS[accion]) return EXACTAS[accion];
    var m = accion.match(/^[a-z]+\.(.+)$/);
    if (!m) return '';
    var resto = m[1];
    for (var i = 0; i < VERBOS.length; i++) {
      var suf = VERBOS[i][0];
      if (resto.length > suf.length && resto.slice(-suf.length) === suf) {
        var base = resto.slice(0, -suf.length).replace(/Foto$/, '');
        var cosa = COSAS[base] || COSAS[base.replace(/s$/, '')] || '';
        if (!cosa) { var k = Object.keys(COSAS).filter(function (c) { return base.indexOf(c) === 0; }).sort(function (a, b) { return b.length - a.length; })[0]; cosa = k ? COSAS[k] : ''; }
        if (!cosa) return '';
        /* "cambiar la foto de el usuario" → "del usuario" */
        return (VERBOS[i][1] + ' ' + cosa).replace(/ de el /g, ' del ').replace(/ a el /g, ' al ');
      }
    }
    var sola = COSAS[resto] || COSAS[resto.replace(/s$/, '')];
    if (sola) return (RED_LECTURA(accion) ? 'cargar ' : 'guardar ') + sola;
    return '';
  }
  function RED_LECTURA(accion) { try { return !!(raiz.RED && raiz.RED.esLectura(accion)); } catch (e) { return true; } }

  /* Vista actual → frase de respaldo (cuando la acción no se conoce) */
  var VISTAS = {
    '': 'cargar el inicio', home: 'cargar el inicio', bd: 'cargar la base de datos', lideres: 'cargar los líderes', dashboard: 'cargar el tablero',
    simulador: 'cargar el simulador', votacion: 'cargar la votación', eventos: 'cargar los eventos', agenda: 'cargar la agenda',
    compromisos: 'cargar los compromisos', solicitudes: 'cargar las solicitudes', formularios: 'cargar los formularios',
    notificaciones: 'cargar las notificaciones', analisis: 'cargar el análisis', config: 'cargar la configuración', mibot: 'cargar Mi Bot'
  };
  function vista() { try { return (location.hash.replace(/^#\//, '') || '').split('?')[0]; } catch (e) { return ''; } }

  /* ------------------------------------------------------------ última falla */
  var ultima = null;   // {e, accion, t}
  function anotar(e, accion) {
    if (e && typeof e === 'object' && accion && !e.accion) { try { e.accion = accion; } catch (x) {} }
    ultima = { e: e, accion: accion || (e && e.accion) || '', t: Date.now() };
  }
  function tomar(e) {
    if (e && typeof e === 'object') return e;
    if (ultima && Date.now() - ultima.t < 15000) return ultima.e;
    return null;
  }

  /* ------------------------------------------------------------ clasificar */
  function sinSenal() {
    try { if (raiz.SINRED && !raiz.SINRED.enLinea()) return true; } catch (e) {}
    try { if (typeof navigator !== 'undefined' && navigator.onLine === false) return true; } catch (e) {}
    return false;
  }
  var RAW_RED = /^(sin conexi[oó]n|failed to fetch|load failed|networkerror|network request failed|typeerror: failed to fetch)/i;
  /* 'red' | 'lenta' | 'servidor' | 'app' */
  function tipo(e) {
    if (sinSenal()) return 'red';
    if (!e) return 'red';
    if (e.red || RAW_RED.test(String(e.message || ''))) return 'red';
    if (e.tiempo) return 'lenta';
    if (e.eco || e.servidor) return 'servidor';
    return e.accion ? 'servidor' : 'app';
  }

  function txt(e, accionDada) {
    e = tomar(e);
    if (e && e.pendiente) return 'No tienes internet: ' + (e.que || 'el cambio').replace(/^./, function (c) { return c.toLowerCase(); }) + ' se guardó en este equipo. Queda en «Pendientes por subir» hasta que vuelva la señal.';
    var accion = accionDada || (e && e.accion) || '';
    var lectura = accion ? RED_LECTURA(accion) : true;
    var f = frase(accion) || (lectura ? (VISTAS[vista()] || 'cargar esta información') : 'guardar el cambio');
    var t = tipo(e);
    if (t === 'red') return 'No tienes acceso a internet; por eso no se pudo ' + f + '.' + (lectura ? '' : ' Inténtalo cuando vuelva la señal.');
    if (t === 'lenta') return 'La conexión está muy lenta y no se pudo ' + f + '. Intenta de nuevo.';
    if (e && e.eco) return 'El servidor no respondió bien y no se pudo ' + f + '. Intenta de nuevo en un momento.';
    var msg = String((e && e.message) || '').trim();
    if (!msg || /^(error del servidor|respuesta no v[aá]lida)/i.test(msg)) return 'El servidor tuvo un problema y no se pudo ' + f + '. Intenta de nuevo.';
    return 'No se pudo ' + f + ': ' + msg.replace(/\.$/, '') + '.';
  }

  /* ------------------------------------------------------------ pintar */
  var IC_RED = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 2l20 20"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.8"/><path d="M19 12.9a10 10 0 0 0-2.3-1.6"/><path d="M2 8.8a15 15 0 0 1 4.2-2.6"/><path d="M22 8.8A15 15 0 0 0 11 5"/><path d="M12 20h.01"/></svg>';
  var IC_SRV = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';

  function html(e, accion) {
    e = tomar(e);
    var t = tipo(e);
    var red = t === 'red';
    return '<div class="fr-caja fr-caja--' + (red ? 'red' : 'srv') + '" role="status" data-falla="' + (red ? 'red' : 'srv') + '">' +
      '<span class="fr-ic">' + (red ? IC_RED : IC_SRV) + '</span>' +
      '<p class="fr-txt">' + esc(txt(e, accion)) + '</p>' +
      (red ? '<p class="fr-sub">' + (sinCopia(e, accion) ? 'Esta vista todavía no está guardada en este equipo: ábrela una vez con señal y quedará disponible sin internet. ' : '') + 'Se vuelve a cargar sola cuando regrese la señal.</p>' : '') +
      '<button type="button" class="btn btn-ghost fr-btn" data-falla-reintentar>Reintentar</button>' +
      '</div>';
  }

  function sinCopia(e, accion) {
    var a = accion || (e && e.accion) || '';
    return !!(a && raiz.SRV && raiz.SRV.copiaAplica(a) && RED_LECTURA(a));
  }
  function aviso(e, accion) {
    var m = txt(e, accion);
    var pe = tomar(e);
    if (pe && pe.pendiente) {
      /* Quedó guardado: se cierra la hoja del formulario y se avisa (no es un error) */
      if (typeof raiz.closeLayer === 'function') raiz.closeLayer();
      if (typeof raiz.toast === 'function') raiz.toast(m, 'ok');
      return m;
    }
    if (typeof raiz.toast === 'function') raiz.toast(m, 'err');
    return m;
  }

  /* Reintentar = volver a pintar la vista (las listas con caché salen al instante) */
  function reintentar() {
    if (sinSenal()) {
      try { if (raiz.SINRED) raiz.SINRED.revisarAhora(); } catch (e) {}
      if (typeof raiz.toast === 'function') raiz.toast('Todavía no hay internet. Se recarga sola cuando vuelva.', 'err');
      return;
    }
    if (typeof raiz.render === 'function') raiz.render();
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest && ev.target.closest('[data-falla-reintentar]');
      if (b) { ev.preventDefault(); reintentar(); }
    });
  }
  /* Al volver la señal: si la vista quedó en un aviso de "sin internet", se recarga sola
     (solo si no hay una hoja abierta, para no cerrar nada que se esté escribiendo). */
  function alVolver(nuevo, antes, que) {
    if (que || nuevo !== 'en' || antes !== 'sin') return;
    setTimeout(function () {
      var app = document.getElementById('app');
      var capa = document.getElementById('layer');
      if (!app || !app.querySelector('[data-falla="red"]')) return;
      if (capa && Array.prototype.some.call(capa.children, function (c) { return !c.classList.contains('toast'); })) return;
      if (typeof raiz.render === 'function') raiz.render();
    }, 400);
  }
  if (raiz.SINRED && raiz.SINRED.al) raiz.SINRED.al(alVolver);

  raiz.FALLA = { txt: txt, html: html, aviso: aviso, anotar: anotar, tipo: tipo, frase: frase, RAW_RED: RAW_RED, ultima: function () { return ultima; } };
  raiz.fallaRed = aviso;
  raiz.fallaHtml = html;
})(typeof self !== 'undefined' ? self : this);

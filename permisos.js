/* ============================================================
   PERMISOS DEL ROL INVITADO · lado del navegador  (06/08/2026)
   ------------------------------------------------------------
   ESTO ES SOLO COSMÉTICA. Aquí se ESCONDE lo que el invitado no puede
   hacer, para que no vea botones muertos. Quien NIEGA de verdad es el
   CORE (Permisos.gs · permExigir_) en cada llamada: si alguien borra un
   atributo desde el inspector, el servidor le sigue diciendo que no.

   CÓMO FUNCIONA
     1. Al entrar (y en cada repintado del Inicio) se guardan las pastillas
        que el CORE mandó con el usuario → PERM.claves.
     2. PERM_SEL es un mapa selector → pastilla. Un vigía (MutationObserver)
        pasa por el DOM cada vez que algo se pinta y quita lo que no está
        permitido. Así cubre también las hojas y modales, que se arman
        después y no existen cuando se monta la vista.
     3. permRutaClave() protege las rutas: escribir #/lideres a mano no
        sirve de nada si no tiene lid.ver.

   PARA LOS DEMÁS ROLES (DEV, ADMIN, SEDE) ESTE ARCHIVO NO HACE NADA:
   PERM.on queda en false, el vigía ni se enciende y permOk() dice que sí
   a todo. Riesgo cero sobre lo que ya funcionaba.
   ============================================================ */
(function () {
  'use strict';

  var PERM = { on: false, claves: Object.create(null), rol: '' };
  window.PERM = PERM;

  /* Mapa selector → pastilla. Los selectores van anclados al contenedor de
     su vista (#bd-body, #ev-body, …) porque varios módulos comparten las
     mismas clases de tarjeta (.bd-acts, data-a="editar"). */
  var PERM_SEL = [
    /* ---- Base de Datos ---- */
    ['#bd-add', 'bd.agregar'],
    ['#bd-excel', 'bd.excel'],
    ['#bd-pdf', 'bd.pdf'],
    ['#bd-subir', 'bd.puestoLote'],
    ['#bd-reset', 'bd.reiniciar'],          /* no existe en el catálogo = nunca */
    ['#bd-dashboard', 'dash.ver'],
    ['#bd-simulador', 'sim.ver'],
    ['#bd-votacion', 'voto.ver'],
    ['#bd-body [data-a="detalles"]', 'bd.detalles'],
    ['#bd-body [data-a="editar"]', 'bd.editar'],
    ['#bd-body [data-a="consultar"]', 'bd.consultar'],
    ['#bd-body [data-a="inactivar"]', 'bd.inactivar'],
    ['#det-edit', 'bd.editar'],
    ['#det-inact', 'bd.inactivar'],
    ['#det-elim', 'bd.eliminar'],
    /* ---- Dashboard · Simulador · Votación ---- */
    ['#dash-xls', 'dash.excel'],
    ['#dash-pdf', 'dash.pdf'],
    ['#sim-pdf', 'sim.pdf'],
    ['#voto-xls', 'voto.excel'],
    ['#voto-pdf', 'voto.pdf'],
    /* ---- Líderes ---- */
    ['#ld-add', 'lid.agregar'],
    ['#ld-memoria', 'lid.mem.ver'],
    ['#ld-exp', 'lid.exportar'],
    ['#ld-body [data-a="ver"]', 'lid.ficha'],
    ['#ld-body [data-a="editar"]', 'lid.editar'],
    ['#ld-body [data-a="wa"]', 'lid.wa'],
    ['#ld-body [data-a="acciones"]', 'lid.acciones'],   /* virtual: ver permOk */
    ['#v-refs', 'lid.ref.ver'],
    ['#v-edit', 'lid.editar'],
    ['#v-acc', 'lid.acciones'],
    ['#v-wa', 'lid.wa'],
    ['#rf-xls', 'lid.ref.excel'],
    ['#rf-sel', 'bd.reasignar'],
    ['#rf-asig', 'bd.reasignar'],
    ['.ld-acc-list [data-perm-wa]', 'lid.wa'],
    ['.ld-acc-list [data-perm-clas]', 'lid.clasificacion'],
    ['.ld-mes-acts [data-ver]', 'lid.mem.mes'],
    ['.ld-mes-acts [data-exp]', 'lid.mem.exportar'],    /* virtual */
    ['.ld-mes-acts [data-pdf]', 'lid.mem.pdf'],
    ['.ld-mes-acts [data-xlsx]', 'lid.mem.excel'],
    ['#ld-mes-pdf', 'lid.mem.pdf'],
    ['#ld-mes-xlsx', 'lid.mem.excel'],
    /* ---- Eventos ---- */
    ['#ev-add', 'ev.crear'],
    ['#ev-body [data-a="estado"]', 'ev.estado'],
    ['#ev-body [data-a="editar"]', 'ev.editar'],
    ['#ev-body [data-a="eliminar"]', 'ev.eliminar'],
    ['#ev-edit', 'ev.editar'],
    ['#ev-asis-sec', 'ev.asis.ver'],
    ['#ev-asis-xls', 'ev.asis.excel'],
    /* ---- Agenda ---- */
    ['#ag-add', 'ag.crear'],
    ['#ag-selmode', 'ag.lote'],
    ['#ag-notif', 'ag.wa'],
    ['#ag-edit', 'ag.editar'],
    ['#ag-repro', 'ag.estado'],
    ['#ag-real', 'ag.estado'],
    ['#ag-del', 'ag.eliminar'],
    ['#ag-wa-dir', 'ag.directo'],
    ['#ag-wa-bot', 'ag.wa'],
    ['#ag-avisar', 'ag.wa'],
    /* ---- Compromisos ---- */
    ['#cm-add', 'cm.crear'],
    ['#cm-body [data-a="estado"]', 'cm.estado'],
    ['#cm-body [data-a="editar"]', 'cm.editar'],
    ['#cm-body [data-a="eliminar"]', 'cm.eliminar'],
    ['#cm-body [data-a="enviar"]', 'cm.wa'],
    ['#cm-edit', 'cm.editar'],
    ['#cm-tz', 'cm.traza'],
    /* ---- Solicitudes ---- */
    ['#sl-add', 'sl.crear'],
    ['#sl-body [data-a="estado"]', 'sl.estado'],
    ['#sl-body [data-a="editar"]', 'sl.editar'],
    ['#sl-body [data-a="eliminar"]', 'sl.eliminar'],
    ['#sl-body [data-a="enviar"]', 'sl.wa'],
    ['#sl-edit', 'sl.editar'],
    ['#sl-tz', 'sl.traza'],
    /* ---- Notificaciones ---- */
    ['#nt-add', 'nt.crear'],
    ['#nt-body [data-a="editar"]', 'nt.editar'],
    ['#nt-body [data-a="eliminar"]', 'nt.eliminar'],
    ['#nt-edit', 'nt.editar'],
    ['#nt-go', 'nt.enviar'],                /* no existe en el catálogo = nunca */
    /* ---- Análisis de Procesos ---- */
    ['#an-tabs [data-tab="servicios"]', 'an.serv.ver'],
    ['#an-tabs [data-tab="ideas"]', 'an.ideas.ver'],
    ['#an-tabs [data-tab="comercio"]', 'an.com.ver'],
    ['.an-mini[data-est]', 'an.ideas.estado'],   /* .an-mini = solo los de Ideas: el
                                                    filtro de Servicios usa el mismo
                                                    data-est y NO se puede tocar */
    ['#an-sel-pdf', 'an.ideas.pdf'],
    ['.an-corte[data-corte]', 'an.ideas.corte'],
    ['[data-com]', 'an.com.estado'],
    ['.an-res-btn', 'an.res.ver'],
    ['[data-ocultar]', 'an.res.ocultar'],
    /* ---- Atajo general: cualquier cosa marcada a mano en el HTML ---- */
    ['[data-perm]', null]
  ];

  /* Pastillas "virtuales": no existen en el catálogo del CORE porque no son
     una acción sino una PUERTA a varias. Se abren si el invitado tiene al
     menos una de las de dentro. */
  var PERM_VIRTUAL = {
    'lid.acciones': ['lid.wa', 'lid.clasificacion'],
    'lid.mem.exportar': ['lid.mem.pdf', 'lid.mem.excel']
  };

  /* Ruta del front → pastilla que la abre. '' = cerrada para el invitado. */
  var PERM_RUTAS = {
    bd: 'bd.ver', dashboard: 'dash.ver', simulador: 'sim.ver', votacion: 'voto.ver',
    lideres: 'lid.ver', eventos: 'ev.ver', agenda: 'ag.ver', compromisos: 'cm.ver',
    solicitudes: 'sl.ver', notificaciones: 'nt.ver', analisis: 'an.ver',
    config: '', mibot: ''
  };

  /* ------------------------------------------------------------
     API
     ------------------------------------------------------------ */

  /* ¿Puede? Para todo rol que no sea INVITADO, siempre sí. */
  function permOk(k) {
    if (!PERM.on) return true;
    if (!k) return true;
    var v = PERM_VIRTUAL[k];
    if (v) { for (var i = 0; i < v.length; i++) if (PERM.claves[v[i]]) return true; return false; }
    return !!PERM.claves[k];
  }

  /* Guarda las pastillas del usuario que entró. */
  function permSet(user) {
    var rol = String((user && user.rol) || '').toUpperCase();
    PERM.rol = rol;
    PERM.on = rol === 'INVITADO';
    PERM.claves = Object.create(null);
    var lista = (user && user.permisos) || [];
    if (Object.prototype.toString.call(lista) === '[object Array]')
      lista.forEach(function (k) { PERM.claves[String(k)] = true; });
    /* Un invitado al que le quitaron todo no puede quedar con el vigía
       apagado: se queda sin pastillas y el barrido lo deja sin nada. */
    if (PERM.on) permVigia();
    permBarrer(document);
  }

  /* ¿Puede entrar a esta ruta? */
  function permRuta(route) {
    if (!PERM.on) return true;
    var r = String(route || '');
    if (!(r in PERM_RUTAS)) return true;    // home, login, instalar…
    var k = PERM_RUTAS[r];
    return k ? permOk(k) : false;
  }

  /* Primera ruta a la que sí puede entrar (para rebotarlo con sentido). */
  function permPrimeraRuta() {
    var orden = ['bd', 'lideres', 'eventos', 'agenda', 'compromisos', 'solicitudes', 'notificaciones', 'analisis'];
    for (var i = 0; i < orden.length; i++) if (permRuta(orden[i])) return orden[i];
    return '';
  }

  /* Esconde lo que no está permitido. Se llama sola desde el vigía.

     NO se borra el nodo del DOM A PROPÓSITO: varias vistas enganchan sus
     botones DESPUÉS de un await (viewBaseDatos hace $('#bd-excel').onclick
     al terminar de cargar), y si el nodo ya no estuviera, esa línea reventaría
     y se caería la vista entera. Escondido y deshabilitado: el usuario no lo
     ve ni lo puede pulsar, el código que lo engancha sigue encontrándolo, y
     quien de verdad niega es el CORE en cada llamada. */
  function permBarrer(root) {
    if (!PERM.on || !root || !root.querySelectorAll) return;
    for (var i = 0; i < PERM_SEL.length; i++) {
      var sel = PERM_SEL[i][0], clave = PERM_SEL[i][1];
      var nodos;
      try { nodos = root.querySelectorAll(sel); } catch (e) { continue; }
      for (var j = 0; j < nodos.length; j++) {
        var n = nodos[j];
        var k = clave || n.getAttribute('data-perm');
        if (permOk(k)) continue;
        if (n.hasAttribute('data-perm-off')) continue;
        n.setAttribute('data-perm-off', '');   /* el CSS lo oculta de verdad */
        n.hidden = true;
        try { n.disabled = true; } catch (e) {}
        n.setAttribute('aria-hidden', 'true');
        n.tabIndex = -1;
      }
    }
  }

  /* ¿Está escondido por permisos? (lo usan las pruebas y el propio front) */
  function permOculto(el) { return !!(el && el.getAttribute && el.getAttribute('data-perm-off') !== null); }

  /* Vigía: cada vez que se pinta algo (vista, hoja, modal) se vuelve a
     barrer. Se enciende UNA vez y solo para el invitado. */
  var vigiaOn = false, pendiente = null;
  function permVigia() {
    if (vigiaOn || typeof MutationObserver === 'undefined') return;
    vigiaOn = true;
    var obs = new MutationObserver(function () {
      /* Se agrupa en el siguiente cuadro: pintar una lista larga dispara
         cientos de mutaciones y no hace falta barrer en cada una. */
      if (pendiente) return;
      pendiente = requestAnimationFrame(function () { pendiente = null; permBarrer(document); });
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  window.permOk = permOk;
  window.permSet = permSet;
  window.permRuta = permRuta;
  window.permPrimeraRuta = permPrimeraRuta;
  window.permBarrer = permBarrer;
  window.permOculto = permOculto;
})();

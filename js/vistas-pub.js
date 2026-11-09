/* ============================================================================
 * vistas-pub.js — VISTAS DE LA APP PÚBLICA ENCENDIBLES (08/11/2026)
 * ----------------------------------------------------------------------------
 * Configuración → General → "Vistas de la app pública": un interruptor por
 * cada vista de JHONNY-PERDOMO. Solo ADMIN y DESARROLLADOR ven la pestaña
 * General; el CORE además lo exige (Vistas_Pub.gs · priv.vistasPub).
 *
 *  · Apagada = no sale en el Inicio de la app pública y por enlace directo no
 *    abre (vuelve al Inicio con un aviso). Apagar NO borra datos.
 *  · El estado llega con priv.cfgTodo (CONFIG · PUB_VISTAS_*): pintar es
 *    instantáneo, sin viaje extra. Guardar es UN viaje (priv.vistasPub, con
 *    rid y botón ocupado) y deja registrado quién y cuándo.
 *  · Los ids deben ser los mismos de PERDOMO (js/vistas-pub.js, MENU) y del
 *    CORE (PV_CATALOGO). Una vista nueva se agrega en los tres.
 * ============================================================================ */
(function (raiz) {
  'use strict';

  var CATALOGO = [
    ['tarjeta', 'Mi tarjeta', 'Carné digital con QR.'],
    ['misdatos', 'Mis Datos', 'Revisar y actualizar sus datos.'],
    ['solicitud', 'Solicitudes y Gestiones', 'Pedir o consultar un servicio.'],
    ['ideas', 'Suma tus ideas', 'Propuestas para el municipio.'],
    ['noticias', 'Ponte al día', 'Noticias y avisos al teléfono.'],
    ['casa', 'Nuestra casa social', 'Programación y redes.'],
    ['emergencia', 'Números de emergencia', 'Contactos útiles.'],
    ['comercio', 'Comerciantes amigos', 'Directorio de comercios.'],
    ['lideres', 'Líderes', 'Zona de líderes y anotador sin conexión.']
  ];

  function lista(v) {
    var set = {};
    String(v == null ? '' : v).split(/[,;\s]+/).forEach(function (x) { x = x.trim().toLowerCase(); if (x) set[x] = true; });
    return CATALOGO.map(function (c) { return c[0]; }).filter(function (id) { return set[id]; });
  }
  function ultimoTxt(cfg) {
    var por = String(cfg.PUB_VISTAS_POR || '').trim(), f = String(cfg.PUB_VISTAS_FECHA || '').trim();
    return por || f ? 'Último cambio: ' + (por || '—') + (f ? ' · ' + f : '') : 'Sin cambios todavía: todas encendidas.';
  }

  /* HTML de la sección (va dentro del acordeón de General). */
  function inner(cfg) {
    var off = lista(cfg.PUB_VISTAS_APAGADAS);
    var filas = CATALOGO.map(function (c) {
      var on = off.indexOf(c[0]) < 0;
      return '<div class="cfg-vp-fila' + (on ? '' : ' off') + '">' +
        '<button type="button" class="cfg-sw' + (on ? ' on' : '') + '" data-vp="' + c[0] + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '">' +
        '<span class="cfg-sw-k"></span><span>' + esc(c[1]) + '</span></button>' +
        '<span class="cfg-vp-d">' + esc(c[2]) + '</span></div>';
    }).join('');
    return '<div class="cfg-vp" id="cf-vp">' + filas + '</div>' +
      '<p class="cfg-hint" id="cf-vp-ult">' + esc(ultimoTxt(cfg)) + '</p>' +
      '<div class="cfg-actions"><button type="button" class="btn btn-primary" id="cf-vp-save">Guardar vistas</button></div>';
  }

  function bind() {
    var caja = document.getElementById('cf-vp');
    if (!caja) return;
    caja.querySelectorAll('[data-vp]').forEach(function (b) {
      b.onclick = function () {
        var on = !b.classList.contains('on');
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.parentNode.classList.toggle('off', !on);
      };
    });
    var btn = document.getElementById('cf-vp-save');
    if (btn) btn.onclick = guardar;
  }

  var enCurso = false;
  async function guardar(e) {
    if (enCurso) return;                       /* escudo: nada de doble envío */
    var btn = e && e.currentTarget || document.getElementById('cf-vp-save');
    var apagadas = [].slice.call(document.querySelectorAll('#cf-vp [data-vp]'))
      .filter(function (b) { return !b.classList.contains('on'); })
      .map(function (b) { return b.getAttribute('data-vp'); });
    enCurso = true; saving(btn, true);
    var t0 = performance.now();
    try {
      var r = await api('priv.vistasPub', {}, 'POST', Object.assign(cfAuth(), { apagadas: apagadas }));
      if (!r || !r.ok) { toast((r && r.msg) || 'No se pudo guardar', 'err'); return; }
      /* Parche en memoria: sin recargar la configuración. */
      if (CF && CF.d && CF.d.cfg) {
        CF.d.cfg.PUB_VISTAS_APAGADAS = (r.apagadas || []).join(',');
        CF.d.cfg.PUB_VISTAS_POR = r.por || '';
        CF.d.cfg.PUB_VISTAS_FECHA = r.fecha || '';
        var u = document.getElementById('cf-vp-ult'); if (u) u.textContent = ultimoTxt(CF.d.cfg);
      }
      toast(r.apagadas && r.apagadas.length ? 'Vistas guardadas · ' + r.apagadas.length + ' apagada(s) en la app pública' : 'Vistas guardadas · todas encendidas', 'ok');
    } catch (err) {
      toast('Error de conexión', 'err');
    } finally {
      enCurso = false; saving(btn, false);
      if (raiz.RED && RED.pantalla) RED.pantalla('cfg.vistasGuardar', performance.now() - t0);
    }
  }

  raiz.VISTAS_PUB = { CATALOGO: CATALOGO, inner: inner, bind: bind, lista: lista };
})(typeof self !== 'undefined' ? self : this);

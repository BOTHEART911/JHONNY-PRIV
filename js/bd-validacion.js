/* ============================================================================
 * bd-validacion.js · PRIV · Base de datos → botón VALIDACIÓN (09/11/2026)
 * ----------------------------------------------------------------------------
 * Muestra cuántos registros ACTIVOS están POR CONFIRMAR (de la lista ya
 * cargada: cero viajes) y abre WhatsApp nativo, sin número fijo, con la
 * plantilla PLANTILLA_VALIDACION (Configuración → Plantillas). {enlace} sale de
 * CONFIG POSTCONSULTA_URL (Configuración → Enlaces) o, de respaldo, de
 * marca.js; {nombre_candidato} de MARCA_CANDIDATO_NOMBRE. Marca blanca.
 * La plantilla, el enlace y el candidato llegan dentro de priv.baseDatos (pc).
 * ============================================================================ */
(function () {
  'use strict';
  var DEF = 'Buen día estimados lideres:\n\nLa base de dato se ha actualizado y tenemos algunos documentos por validar, por favor ingresar a revisar si tienes alguno a alguno de tus ahijados.\n\nIngresa aquí: {enlace}\n\nCordialmente,\n\n*Consultorio Externa*\n{nombre_candidato}';

  function pendientes() {
    if (typeof BD_ALL === 'undefined') return 0;
    var n = 0;
    for (var i = 0; i < BD_ALL.length; i++) {
      var c = BD_ALL[i];
      if (String(c.municipio || '').trim().toUpperCase() === 'POR CONFIRMAR' && String(c.estado || 'ACTIVO').toUpperCase() !== 'INACTIVO') n++;
    }
    return n;
  }

  window.bdValContar = function () {
    var n = pendientes();
    var el = document.querySelector('[data-val-n]');
    if (el) { el.textContent = n.toLocaleString('es-CO'); el.classList.toggle('cero', !n); }
    return n;
  };

  window.bdValTexto = function (n) {
    var pc = window.BD_PC || {};
    var M = window.MARCA || {};
    var enlace = String(pc.url || M.POSTCONSULTA_URL || '').trim();
    var cand = String(pc.candidato || (window.MV && MV.candidato) || M.CANDIDATO || '').trim();
    var tpl = String(pc.plantilla || DEF);
    return { enlace: enlace, texto: tpl.replace(/\{enlace\}/g, enlace).replace(/\{nombre_candidato\}/g, cand).replace(/\{n\}/g, String(n)) };
  };

  window.bdValEnviar = function () {
    var n = window.bdValContar();
    if (!n) { if (window.toast) toast('No hay registros POR CONFIRMAR para validar', 'ok'); return; }
    var t = window.bdValTexto(n);
    if (!t.enlace) { if (window.toast) toast('Falta el enlace de "Validación de registros" en Configuración → Enlaces', 'err'); return; }
    var movil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var url = movil ? ('whatsapp://send?text=' + encodeURIComponent(t.texto)) : ('https://api.whatsapp.com/send?text=' + encodeURIComponent(t.texto));
    window.open(url, '_blank');
  };
})();

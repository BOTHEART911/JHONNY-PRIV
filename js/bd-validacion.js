/* ============================================================================
 * bd-validacion.js · PRIV · Base de datos → botón VALIDACIÓN (09/11/2026)
 * ----------------------------------------------------------------------------
 * Muestra cuántos registros ACTIVOS están POR CONFIRMAR (de la lista ya
 * cargada: cero viajes) y abre WhatsApp nativo, sin número fijo, con la
 * plantilla PLANTILLA_VALIDACION (Configuración → Plantillas): {n} = cuántos
 * POR CONFIRMAR, {nombre_candidato} = MARCA_CANDIDATO_NOMBRE. Marca blanca.
 * La plantilla y el candidato llegan dentro de priv.baseDatos (pc).
 * 12/11/2026 · Sin enlace: los líderes validan en PERDOMO → Mis referidos
 * (la app JHONNY-POSTCONSULTA se retiró). Si una plantilla vieja trae
 * {enlace}, esa línea se quita del mensaje.
 * ============================================================================ */
(function () {
  'use strict';
  var DEF = 'Buen día estimados líderes:\n\nLa base de datos se actualizó y hay {n} documentos por validar. Por favor revisen si tienen alguno ustedes o sus ahijados en la app: zona de líderes → Mis referidos.\n\nCordialmente,\n\n*Consultorio Externa*\n{nombre_candidato}';

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
    var cand = String(pc.candidato || (window.MV && MV.candidato) || M.CANDIDATO || '').trim();
    var tpl = String(pc.plantilla || DEF);
    var texto = tpl.replace(/^[^\n]*\{enlace\}[^\n]*(\n|$)/gm, '').replace(/\n{3,}/g, '\n\n')
      .replace(/\{nombre_candidato\}/g, cand).replace(/\{n\}/g, String(n));
    return { texto: texto };
  };

  window.bdValEnviar = function () {
    var n = window.bdValContar();
    if (!n) { if (window.toast) toast('No hay registros POR CONFIRMAR para validar', 'ok'); return; }
    var t = window.bdValTexto(n);
    var movil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var url = movil ? ('whatsapp://send?text=' + encodeURIComponent(t.texto)) : ('https://api.whatsapp.com/send?text=' + encodeURIComponent(t.texto));
    window.open(url, '_blank');
  };
})();

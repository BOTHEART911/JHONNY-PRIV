/* ============================================================
 * CAPA 11 · INSIGHTS CON IA (Gemini) — app PRIVADA (JHONNY PRIV)
 * ------------------------------------------------------------
 * QUÉ HACE
 *   Pone un botón robot flotante en Base de Datos, Dashboard,
 *   Simulador, Votación, Líderes, Agenda y Análisis de Procesos.
 *   Al tocarlo abre una hoja con el análisis de esa vista hecho por
 *   Gemini, y debajo un chat para seguir preguntando.
 *
 * POR QUÉ ES UNA CAPA Y NO UN PARCHE A app.js
 *   app.js son 7.865 líneas. Esta capa se instala sola escuchando los
 *   cambios de vista, igual que capa-4, capa-5, capa-7, capa-8 y
 *   capa-10. app.js NO SE TOCA.
 *
 * INSTALACIÓN (al final del <body>, DESPUÉS de <script src="app.js">)
 *   <script src="capa-11-insights.js"></script>
 * PAREJA
 *   capa-11-insights.css (obligatoria, en el <head> tras style.css).
 *
 * DE DÓNDE SALEN LOS DATOS
 *   De ningún lado del navegador: la app manda solo el nombre de la
 *   vista. El CORE arma los agregados y llama a Gemini. Aquí no se
 *   toca ni un documento.
 *
 * TAMBIÉN
 *   Inyecta la tarjeta "Análisis con IA" dentro de
 *   Configuración → Avanzado (solo DESARROLLADOR) para cargar la clave.
 *
 * NO INCLUYE VOZ
 *   Decisión del 26/07/2026: por ahora solo se escribe. El dictado del
 *   navegador no existe en iPhone y se dejó para una tanda aparte.
 * ============================================================ */

(function () {
  'use strict';

  if (window.__np11Insights) return;              // guardia anti-doble-instalación
  window.__np11Insights = true;

  /* Rutas donde vive el robot y cómo se llama cada una en la hoja */
  var VISTAS = {
    bd:        'Base de Datos',
    dashboard: 'Dashboard',
    simulador: 'Simulador',
    votacion:  'Votación',
    lideres:   'Líderes',
    agenda:    'Agenda',
    analisis:  'Análisis de Procesos',
    /* Ítem 10 (26/07): hoy estas hojas están casi vacías. El backend le
       declara a Gemini cuántas filas reales hay, así que el robot dirá
       "está vacío" en vez de inventar. */
    eventos:       'Eventos',
    compromisos:   'Compromisos',
    solicitudes:   'Solicitudes',
    notificaciones:'Notificaciones'
  };

  var ROBOT = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="4" y="8" width="16" height="11" rx="3.5"/><path d="M12 8V4.5"/><circle cx="12" cy="3.2" r="1.3"/>' +
    '<path d="M1.8 12.5v3M22.2 12.5v3"/><circle cx="9" cy="13" r="1.15" fill="currentColor" stroke="none"/>' +
    '<circle cx="15" cy="13" r="1.15" fill="currentColor" stroke="none"/><path d="M9.5 16.3h5"/></svg>';

  var CERRAR = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var PDF = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v11"/><path d="M8.5 10.5L12 14l3.5-3.5"/><path d="M4.5 17.5v1.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-1.5"/></svg>';
  var WA = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.42 1.32 4.9L2 22l5.4-1.42a9.8 9.8 0 0 0 4.64 1.18h.01c5.43 0 9.84-4.4 9.84-9.84C21.89 6.4 17.48 2 12.04 2zm0 17.96h-.01a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.09.81.82-3.01-.2-.31a8.14 8.14 0 0 1-1.25-4.35c0-4.51 3.67-8.18 8.19-8.18 2.19 0 4.24.85 5.79 2.4a8.13 8.13 0 0 1 2.4 5.79c0 4.51-3.68 8.17-8.19 8.17z"/></svg>';
  var ENVIAR = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12h13M12.5 6.5L18.5 12l-6 5.5"/></svg>';

  /* Estado de la capa */
  var estado = null;          // {configurada, modelo} — se pide una sola vez
  var pidiendoEstado = null;  // promesa en vuelo
  var hilos = {};             // historial de chat por vista, mientras dure la sesión
  var abierta = false;
  var fab = null;

  /* ---------- utilidades mínimas ---------- */
  function ruta() {
    return (location.hash.replace(/^#\//, '') || '').split('?')[0];
  }
  function yo() {
    try { var u = getActive(); return u ? u.documento : ''; } catch (e) { return ''; }
  }
  function esDev() {
    try { var u = getActive(); return u && String(u.rol || '').toUpperCase() === 'DESARROLLADOR'; }
    catch (e) { return false; }
  }
  function limpio(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function nodo(html) {
    var t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  }
  function reducido() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  /* El backend devuelve texto corrido con viñetas de guion. Se convierte a
     HTML mínimo: párrafos, listas y **negrita**. Nada de innerHTML crudo. */
  function aHtml(txt) {
    var lineas = String(txt || '').split(/\r?\n/);
    var out = [], lista = [];
    function cerrarLista() {
      if (lista.length) { out.push('<ul>' + lista.join('') + '</ul>'); lista = []; }
    }
    for (var i = 0; i < lineas.length; i++) {
      var l = lineas[i].trim();
      if (!l) { cerrarLista(); continue; }
      var m = /^[-*•]\s+(.*)$/.exec(l);
      if (m) { lista.push('<li>' + negrita(limpio(m[1])) + '</li>'); continue; }
      cerrarLista();
      l = l.replace(/^#{1,6}\s*/, '');
      out.push('<p>' + negrita(limpio(l)) + '</p>');
    }
    cerrarLista();
    return out.join('') || '<p class="ia-muted">Sin respuesta.</p>';
  }
  function negrita(s) {
    return s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }

  /* ---------- estado del módulo (¿hay clave?) ---------- */
  function pedirEstado() {
    if (estado) return Promise.resolve(estado);
    if (pidiendoEstado) return pidiendoEstado;
    pidiendoEstado = api('priv.iaEstado', { caller: yo() }, 'GET', null, { silent: true })
      .then(function (r) { estado = (r && r.ok !== false) ? r : { configurada: false }; return estado; })
      .catch(function () { estado = { configurada: false, error: true }; return estado; })
      .then(function (e) { pidiendoEstado = null; return e; });
    return pidiendoEstado;
  }

  /* ============================================================
     BOTÓN FLOTANTE
     ============================================================ */
  function montarFab() {
    var r = ruta();
    if (!VISTAS[r] || !yo()) return quitarFab();

    pedirEstado().then(function (e) {
      if (ruta() !== r) return;                       // se cambió de vista mientras respondía
      if (!e.configurada && !esDev()) return quitarFab();  // sin clave, solo el DEV lo ve
      if (fab) { fab.dataset.vista = r; return; }

      fab = nodo(
        '<button class="ia-fab" type="button" aria-label="Analizar con IA" title="Analizar esta vista con IA">' +
        '<span class="ia-fab-ring" aria-hidden="true"></span>' +
        '<span class="ia-fab-ic">' + ROBOT + '</span>' +
        '<span class="ia-fab-tx">Analizar</span>' +
        '</button>'
      );
      fab.dataset.vista = r;
      if (reducido()) fab.classList.add('ia-sin-motor');
      fab.addEventListener('click', function () { abrir(fab.dataset.vista); });
      document.body.appendChild(fab);
    });
  }
  function quitarFab() { if (fab) { fab.remove(); fab = null; } }

  /* ============================================================
     HOJA DE ANÁLISIS
     ============================================================ */
  function abrir(vista) {
    if (abierta) return;
    abierta = true;
    if (!hilos[vista]) hilos[vista] = [];

    var capa = document.getElementById('layer') || document.body;
    var hoja = nodo(
      '<div class="ia-wrap" role="dialog" aria-modal="true" aria-label="Análisis con IA">' +
      '  <div class="ia-fondo"></div>' +
      '  <section class="ia-hoja" data-vista="' + limpio(vista) + '">' +
      '    <header class="ia-h">' +
      '      <span class="ia-h-ic">' + ROBOT + '</span>' +
      '      <div class="ia-h-tx"><b>Análisis con IA</b><small>' + limpio(VISTAS[vista] || '') + '</small></div>' +
      '      <button class="ia-x" type="button" aria-label="Cerrar">' + CERRAR + '</button>' +
      '    </header>' +
      '    <div class="ia-body" id="ia-body"></div>' +
      '    <form class="ia-pie" autocomplete="off">' +
      '      <input class="ia-in" id="ia-in" placeholder="Pregunta lo que quieras de esta vista…" />' +
      '      <button class="ia-send" type="submit" aria-label="Enviar">' + ENVIAR + '</button>' +
      '    </form>' +
      '  </section>' +
      '</div>'
    );
    capa.appendChild(hoja);
    requestAnimationFrame(function () { hoja.classList.add('ia-on'); });

    var body = hoja.querySelector('#ia-body');
    var input = hoja.querySelector('#ia-in');

    function cerrar() {
      abierta = false;
      hoja.classList.remove('ia-on');
      setTimeout(function () { hoja.remove(); }, reducido() ? 0 : 220);
      document.removeEventListener('keydown', esc);
    }
    function esc(ev) { if (ev.key === 'Escape') cerrar(); }
    document.addEventListener('keydown', esc);
    hoja.querySelector('.ia-x').addEventListener('click', cerrar);
    hoja.querySelector('.ia-fondo').addEventListener('click', cerrar);

    /* Repinta el hilo guardado, o lanza el análisis de entrada */
    if (hilos[vista].length) {
      hilos[vista].forEach(function (m) { pintar(body, m.rol, m.texto, m.meta); });
      irAbajo(body);
    } else {
      consultar(vista, body, '', input);
    }

    hoja.querySelector('.ia-pie').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      input.value = '';
      pintar(body, 'user', q);
      hilos[vista].push({ rol: 'user', texto: q });
      consultar(vista, body, q, input);
    });

    setTimeout(function () { try { input.focus(); } catch (e) {} }, 260);
  }

  function irAbajo(body) { body.scrollTop = body.scrollHeight; }

  function pintar(body, rol, texto, meta) {
    var cls = rol === 'user' ? 'ia-msg ia-yo' : 'ia-msg ia-bot';
    var el = nodo('<div class="' + cls + '"></div>');
    if (rol === 'user') el.textContent = texto;
    else {
      el.innerHTML = aHtml(texto);
      if (meta) {
        var pie = nodo('<div class="ia-meta"></div>');
        var sello = nodo('<span class="ia-meta-tx"></span>');
        sello.textContent = meta;
        pie.appendChild(sello);
        pie.appendChild(botonera(texto, vistaDe(body)));
        el.appendChild(pie);
      }
    }
    body.appendChild(el);
    irAbajo(body);
    return el;
  }

  /* La hoja guarda su vista en un data-* para que la botonera sepa
     qué título ponerle al PDF sin arrastrar variables por todos lados. */
  function vistaDe(body) {
    var h = body && body.closest ? body.closest('.ia-hoja') : null;
    return (h && h.dataset.vista) || '';
  }

  /* Ítem 7 (26/07): sacar el análisis de la hoja. Copiar, PDF de marca
     (lo arma el CORE con la misma plantilla de los demás informes) y
     WhatsApp (abre el selector de contacto, sin número preescrito). */
  function botonera(texto, vista) {
    var caja = nodo('<span class="ia-acts"></span>');

    var cop = nodo('<button class="ia-act" type="button">Copiar</button>');
    cop.addEventListener('click', function () {
      try {
        navigator.clipboard.writeText(texto);
        cop.textContent = 'Copiado';
        setTimeout(function () { cop.textContent = 'Copiar'; }, 1600);
      } catch (e) { toast('No se pudo copiar.', 'err'); }
    });
    caja.appendChild(cop);

    var pdf = nodo('<button class="ia-act" type="button">' + PDF + ' PDF</button>');
    pdf.addEventListener('click', function () {
      if (pdf.disabled) return;
      pdf.disabled = true;
      var antes = pdf.innerHTML;
      pdf.textContent = 'Generando…';
      api('priv.iaPdf', {}, 'POST', { caller: yo(), vista: vista, texto: texto }, { silent: true })
        .then(function (r) {
          pdf.disabled = false; pdf.innerHTML = antes;
          if (!r || r.ok === false) return toast((r && r.msg) || 'No se pudo generar el PDF.', 'err');
          downloadB64(r.base64, r.mime, r.filename);
          toast('PDF generado', 'ok');
        })
        .catch(function (err) {
          pdf.disabled = false; pdf.innerHTML = antes;
          toast((err && err.message) || 'No se pudo generar el PDF.', 'err');
        });
    });
    caja.appendChild(pdf);

    var wa = nodo('<button class="ia-act" type="button">' + WA + ' WhatsApp</button>');
    wa.addEventListener('click', function () { waCompartir(texto, vista); });
    caja.appendChild(wa);

    return caja;
  }

  /* WhatsApp sin número: abre el selector de contacto del propio WhatsApp.
     Se recorta porque una URL gigante no la abren ni el móvil ni el web. */
  function waCompartir(texto, vista) {
    var cab = 'Análisis con IA · ' + (VISTAS[vista] || '') + '\n\n';
    var cuerpo = String(texto || '');
    var TOPE = 1500;
    if (cab.length + cuerpo.length > TOPE) {
      cuerpo = cuerpo.slice(0, TOPE - cab.length - 30).replace(/\s+\S*$/, '') + '…\n\n(recortado, mira el PDF)';
    }
    var t = encodeURIComponent(cab + cuerpo);
    var movil = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    window.open((movil ? 'whatsapp://send?text=' : 'https://api.whatsapp.com/send?text=') + t, '_blank');
  }

  function pintarError(body, msg) {
    var el = nodo('<div class="ia-msg ia-err"></div>');
    el.textContent = msg;
    body.appendChild(el);
    irAbajo(body);
  }

  function consultar(vista, body, pregunta, input) {
    var cargando = nodo(
      '<div class="ia-msg ia-bot ia-cargando">' +
      '<span class="ia-pts"><i></i><i></i><i></i></span>' +
      '<span class="ia-carga-tx">' + (pregunta ? 'Pensando…' : 'Leyendo los datos de la vista…') + '</span>' +
      '</div>'
    );
    body.appendChild(cargando);
    irAbajo(body);
    if (input) input.disabled = true;

    var cuerpo = {
      caller: yo(),
      vista: vista,
      pregunta: pregunta || '',
      historial: hilos[vista].slice(-8),
      contexto: contextoDe(vista)
    };

    api('priv.iaAnalizar', {}, 'POST', cuerpo, { silent: true })
      .then(function (r) {
        cargando.remove();
        if (input) { input.disabled = false; try { input.focus(); } catch (e) {} }
        if (!r || r.ok === false) {
          pintarError(body, (r && r.msg) || 'No se pudo generar el análisis.');
          return;
        }
        var meta = r.modelo ? (r.modelo + ' · ' + (r.generado || '')) : '';
        pintar(body, 'ia', r.texto, meta);
        hilos[vista].push({ rol: 'ia', texto: r.texto });
      })
      .catch(function (err) {
        /* api() LANZA cuando el CORE responde {ok:false}: ahí viene el motivo
           real (p. ej. "No autorizado"). Mostrarlo es más útil que un genérico. */
        cargando.remove();
        if (input) { input.disabled = false; }
        pintarError(body, (err && err.message) ? err.message : 'Error de conexión con el backend.');
      });
  }

  /* Qué está mirando el usuario ahora mismo: filtros y pestañas.
     Se lee del DOM porque es donde vive la verdad de la vista. */
  function contextoDe(vista) {
    var c = {};
    try {
      if (vista === 'bd') {
        var chip = document.querySelector('#bd-chips .bd-chip.active');
        var q = document.querySelector('#bd-q');
        var partes = [];
        if (chip && chip.dataset.f && chip.dataset.f !== 'Todos') partes.push('filtro: ' + chip.dataset.f);
        if (q && q.value.trim()) partes.push('búsqueda: ' + q.value.trim());
        var cuenta = document.querySelector('#bd-count');
        if (cuenta && cuenta.textContent.trim()) partes.push('en pantalla: ' + cuenta.textContent.trim());
        if (partes.length) c.filtro = partes.join(' · ');
      }
      if (vista === 'analisis') {
        var tab = document.querySelector('#an-tabs .seg-b.active');
        if (tab && tab.dataset.tab) c.tab = tab.dataset.tab;
      }
      if (vista === 'agenda') {
        var t = document.querySelector('#ag-title');
        if (t && t.textContent.trim()) c.filtro = 'periodo en pantalla: ' + t.textContent.trim();
      }
    } catch (e) {}
    return c;
  }

  /* ============================================================
     CONFIGURACIÓN → AVANZADO · tarjeta de la clave (solo DEV)
     ============================================================ */
  function montarConfig() {
    if (ruta() !== 'config' || !esDev()) return;
    var cuerpo = document.getElementById('cf-body');
    if (!cuerpo) return;
    if (typeof CF === 'undefined' || !CF || CF.tab !== 'avanzado') return;
    if (cuerpo.querySelector('#ia-cfg-sec')) return;

    pedirEstado().then(function (e) {
      if (!document.getElementById('cf-body') || document.getElementById('ia-cfg-sec')) return;
      var html =
        '<div class="cfg-estados">' +
        '<span class="cfg-est ' + (e.configurada ? 'ok' : 'no') + '">' +
        (e.configurada ? 'Clave de Gemini guardada' : 'FALTA la clave de Gemini: el botón robot no funciona') +
        '</span></div>' +
        '<p class="cfg-hint">La clave vive en las Propiedades del Script, no en la hoja CONFIG. Se guarda una vez y no se puede volver a ver desde aquí, igual que la cuenta de servicio de Firebase.</p>' +
        '<p class="cfg-hint ia-cfg-aviso"><b>Importante:</b> usa una clave de un proyecto de Google <b>con facturación vinculada</b>. En el plan gratuito, Google puede usar lo que se le manda para mejorar sus productos, y aquí viajan datos de la campaña.</p>' +
        '<div class="cfg-grid">' +
        '<div class="cfg-field full"><label>Clave de Gemini</label>' +
        '<input class="input" id="ia-cfg-key" type="password" placeholder="' + (e.configurada ? '•••••••• (ya guardada)' : 'Pega aquí la clave') + '" autocomplete="off" /></div>' +
        '<div class="cfg-field full"><label>Modelo</label>' +
        '<input class="input" id="ia-cfg-modelo" value="' + limpio(e.modelo || 'gemini-2.5-flash') + '" autocomplete="off" />' +
        '<div class="cfg-hint">Por defecto gemini-2.5-flash: rápido y barato. Cámbialo solo si sabes lo que haces.</div></div>' +
        '<div class="cfg-field full"><label>Texto que escribe la gente</label>' +
        '<select class="input" id="ia-cfg-texto">' +
        '<option value="SI"' + (e.textoLibre === false ? '' : ' selected') + '>SÍ enviarlo (con números y nombres tapados)</option>' +
        '<option value="NO"' + (e.textoLibre === false ? ' selected' : '') + '>NO enviarlo, solo conteos</option>' +
        '</select>' +
        '<div class="cfg-hint">Las solicitudes, compromisos e ideas van con las cédulas y los nombres conocidos tapados. Aun así puede colarse el nombre de alguien que no esté registrado: si eso no te sirve, ponlo en NO.</div></div>' +
        '<div class="cfg-field full"><label>Enfoque del análisis</label>' +
        '<textarea class="input area" id="ia-cfg-enfoque" rows="4" placeholder="Ej: prioriza los barrios del sur y el trabajo de los líderes nuevos.">' + limpio(e.enfoque || '') + '</textarea>' +
        '<div class="cfg-hint">Se le suma al robot en todas las vistas. Sirve para el tono y para qué mirar primero. Las reglas de "no inventes números" van fijas en el código y esto no las puede desactivar.</div></div>' +
        '</div>' +
        '<div class="cfg-actions">' +
        (e.configurada ? '<button class="btn btn-quiet" id="ia-cfg-del">Borrar clave</button>' : '') +
        '<button class="btn btn-primary" id="ia-cfg-save">Guardar</button>' +
        '</div>';

      var sec = nodo(typeof cfCard === 'function'
        ? cfCard('🤖 Análisis con IA (solo DESARROLLADOR)', 'La clave de Gemini que usa el botón robot de BD, Líderes, Agenda y Análisis.', html)
        : '<section class="cfg-acc-sec"><div class="cfg-acc-b">' + html + '</div></section>');
      sec.id = 'ia-cfg-sec';
      cuerpo.appendChild(sec);
      try { if (typeof cfAccBind === 'function') cfAccBind(); } catch (er) {}

      var guardar = sec.querySelector('#ia-cfg-save');
      if (guardar) guardar.addEventListener('click', function () {
        var k = sec.querySelector('#ia-cfg-key').value.trim();
        var m = sec.querySelector('#ia-cfg-modelo').value.trim();
        var enf = sec.querySelector('#ia-cfg-enfoque').value;
        var tl = sec.querySelector('#ia-cfg-texto').value;
        guardar.disabled = true;
        api('priv.iaClave', {}, 'POST', { caller: yo(), clave: k, modelo: m, enfoque: enf, textoLibre: tl }, { silent: true })
          .then(function (r) {
            guardar.disabled = false;
            toast((r && r.msg) || 'Listo.', (r && r.ok) ? '' : 'err');
            if (r && r.ok) { estado = null; sec.querySelector('#ia-cfg-key').value = ''; }
          })
          .catch(function (err) { guardar.disabled = false; toast((err && err.message) || 'Error de conexión.', 'err'); });
      });

      var borrar = sec.querySelector('#ia-cfg-del');
      if (borrar) borrar.addEventListener('click', function () {
        borrar.disabled = true;
        api('priv.iaClave', {}, 'POST', { caller: yo(), borrar: true }, { silent: true })
          .then(function (r) {
            borrar.disabled = false;
            toast((r && r.msg) || 'Listo.');
            estado = null;
          })
          .catch(function (err) { borrar.disabled = false; toast((err && err.message) || 'Error de conexión.', 'err'); });
      });
    });
  }

  /* ============================================================
     ENGANCHE — se entera de los cambios de vista sin tocar app.js
     ============================================================ */
  function repasar() { montarFab(); montarConfig(); }

  window.addEventListener('hashchange', function () {
    quitarFab();          // la vista cambió: el robot se vuelve a montar si toca
    setTimeout(repasar, 60);
  });

  var appEl = document.getElementById('app');
  if (appEl) {
    var pendiente = null;
    new MutationObserver(function () {
      clearTimeout(pendiente);
      pendiente = setTimeout(repasar, 90);
    }).observe(appEl, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', repasar);
  else setTimeout(repasar, 300);
})();

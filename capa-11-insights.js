/* ============================================================
 * CAPA 11 · INSIGHTS CON IA (Gemini) + VOZ (Inworld) — app PRIVADA
 * ------------------------------------------------------------
 * QUÉ HACE
 *   Pone un botón robot flotante en Base de Datos, Dashboard,
 *   Simulador, Votación, Líderes, Agenda, Análisis de Procesos,
 *   Eventos, Compromisos, Solicitudes y Notificaciones.
 *   Al tocarlo abre una hoja de chat con la palabra "Iniciar" ya
 *   escrita: si la envías, hace el análisis completo de la vista; si
 *   la borras y escribes otra cosa, responde a eso.
 *
 * CAMBIOS DEL 27/07/2026
 *   1. El botón se MUEVE con clic sostenido (unos 0,4 s) y se suelta
 *      donde quieras. Al salir de la vista y volver, regresa a su
 *      esquina: la posición es de la sesión de esa pantalla, no se
 *      guarda en ningún lado (el nodo se destruye al cambiar de ruta).
 *   2. Ya NO analiza de una al abrir. Abre con "Iniciar" escrito.
 *   3. VOZ: cada respuesta del robot se puede escuchar, y si la
 *      lectura automática está encendida arranca sola.
 *
 * POR QUÉ ES UNA CAPA Y NO UN PARCHE A app.js
 *   app.js son 7.865 líneas. Esta capa se instala sola escuchando los
 *   cambios de vista, igual que capa-4, capa-5, capa-7, capa-8 y
 *   capa-10. app.js NO SE TOCA.
 *
 * CÓMO SUENA SIN STREAMING
 *   Apps Script no sabe devolver una respuesta por trozos. Así que el
 *   troceado se hace AQUÍ: el texto se parte por frases, se pide el
 *   MP3 del trozo 1, y mientras suena ya se está pidiendo el 2. La
 *   clave de Inworld nunca baja al navegador: la usa el CORE.
 *
 * OJO CON iPhone
 *   Safari solo deja sonar audio si el usuario tocó algo antes. Por eso
 *   el <audio> se "desbloquea" en el mismo gesto en que se envía el
 *   mensaje. Si algún día se vuelve a analizar automáticamente al
 *   abrir, la lectura automática dejará de funcionar en iOS.
 *
 * INSTALACIÓN (al final del <body>, DESPUÉS de <script src="app.js">)
 *   <script src="capa-11-insights.js"></script>
 * PAREJA
 *   capa-11-insights.css (obligatoria, en el <head> tras style.css).
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
  var BOCINA = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9.5h3l4-3v11l-4-3H5z"/><path d="M16 9.2a4 4 0 0 1 0 5.6"/><path d="M18.6 6.8a7.5 7.5 0 0 1 0 10.4"/></svg>';
  var STOP = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>';

  /* WAV mudo de 172 bytes. Único uso: dejar el <audio> "activado" dentro
     del gesto del usuario, que es lo que exige Safari en iPhone. */
  var SILENCIO = 'data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

  /* Estado de la capa */
  var estado = null;          // {configurada, modelo…} — se pide una sola vez
  var pidiendoEstado = null;
  var vozCfg = null;          // {configurada, auto, voz…}
  var pidiendoVoz = null;
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
  /* Sin tildes y en minúscula: para reconocer "Iniciar", "iniciar", "INICIAR". */
  function plano(s) {
    var t = String(s || '').trim().toLowerCase();
    try { return t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { return t; }
  }
  function esIniciar(q) { return plano(q) === 'iniciar'; }

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

  /* Estado de la voz. Se pide aparte y tarde: si nunca abres el robot,
     no se gasta ni una llamada. */
  function pedirVoz() {
    if (vozCfg) return Promise.resolve(vozCfg);
    if (pidiendoVoz) return pidiendoVoz;
    pidiendoVoz = api('priv.vozEstado', { caller: yo() }, 'GET', null, { silent: true })
      .then(function (r) { vozCfg = (r && r.ok !== false) ? r : { configurada: false }; return vozCfg; })
      .catch(function () { vozCfg = { configurada: false, error: true }; return vozCfg; })
      .then(function (v) { pidiendoVoz = null; mostrarBotonesVoz(); return v; });
    return pidiendoVoz;
  }

  /* La respuesta puede pintarse antes de saber si hay voz configurada */
  function mostrarBotonesVoz() {
    var hay = !!(vozCfg && vozCfg.configurada);
    var bs = document.querySelectorAll('.ia-voz');
    for (var k = 0; k < bs.length; k++) bs[k].style.display = hay ? '' : 'none';
  }

  /* ============================================================
     REPRODUCTOR — trocea, pide y encadena
     ------------------------------------------------------------
     Un solo <audio> para toda la app: es el que se desbloquea en el
     gesto del usuario y hay que conservarlo. Se pide el MP3 del trozo
     que suena y se adelanta el siguiente, para que no haya silencio
     entre frases.
     ============================================================ */
  var Repro = (function () {
    var audio = null, cola = [], i = 0, sig = null, activo = false, dueno = null, onFin = null;

    function el() {
      if (!audio) {
        audio = document.createElement('audio');
        audio.setAttribute('playsinline', '');   /* iPhone: que no abra el reproductor a pantalla completa */
        audio.preload = 'auto';
        audio.style.display = 'none';
        /* Colgado del documento a proposito: un <audio> suelto en memoria
           da problemas de reproduccion en algunas versiones de iOS. */
        document.body.appendChild(audio);
      }
      return audio;
    }

    /* Debe llamarse DENTRO de un clic o un submit, o iOS no dejará sonar
       nada después. Falla en silencio: no es motivo para romper nada. */
    function desbloquear() {
      var a = el();
      try {
        if (!a.dataset.libre) {
          a.src = SILENCIO;
          var p = a.play();
          if (p && p.then) p.then(function () { a.dataset.libre = '1'; }).catch(function () {});
          else a.dataset.libre = '1';
        }
      } catch (e) {}
    }

    /* Corta en frases SIN lookbehind a proposito: Safari por debajo de 16.4
       no lo entiende y un SyntaxError aqui tumbaria la capa entera al
       cargar, no solo la voz. */
    function frasear(t) {
      var out = [], act = '';
      for (var k = 0; k < t.length; k++) {
        var c = t.charAt(k);
        act += c;
        if ('.!?\u2026:;\n'.indexOf(c) >= 0) {
          while (k + 1 < t.length && /[\s"\u201d\u00bb)]/.test(t.charAt(k + 1))) { act += t.charAt(++k); }
          out.push(act); act = '';
        }
      }
      if (act.trim()) out.push(act);
      return out.length ? out : [t];
    }

    /* Trozos de ~420 caracteres cortados en punto, signo o coma. El
       proveedor admite 2.000 por petición; se usa mucho menos para que
       la primera frase suene rápido. */
    function trocear(txt) {
      var t = String(txt || '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/^\s*#{1,6}\s*/gm, '')
        .replace(/^\s*[-*•]\s+/gm, '')
        .replace(/[ \t]+/g, ' ')
        .trim();
      if (!t) return [];
      var frases = frasear(t);
      var out = [], act = '';
      for (var k = 0; k < frases.length; k++) {
        var f = frases[k].trim();
        if (!f) continue;
        while (f.length > 900) {                 /* una frase kilométrica: se parte a la fuerza */
          out.push(f.slice(0, 900)); f = f.slice(900);
        }
        if ((act + ' ' + f).trim().length > 420 && act) { out.push(act.trim()); act = f; }
        else { act = (act ? act + ' ' : '') + f; }
      }
      if (act.trim()) out.push(act.trim());
      return out;
    }

    function pedir(txt) {
      return api('priv.vozHablar', {}, 'POST', { caller: yo(), texto: txt }, { silent: true })
        .then(function (r) {
          if (!r || r.ok === false) throw new Error((r && r.msg) || 'No se pudo generar la voz.');
          return 'data:' + (r.mime || 'audio/mpeg') + ';base64,' + r.base64;
        });
    }

    function siguiente() {
      if (!activo) return;
      if (i >= cola.length) return parar();
      var p = sig || pedir(cola[i]);
      sig = null;
      p.then(function (src) {
        if (!activo) return;
        var a = el();
        a.src = src;
        var pl = a.play();
        if (pl && pl.catch) pl.catch(function () { parar(); });   /* iOS lo bloqueó: no insistir */
        if (i + 1 < cola.length) sig = pedir(cola[i + 1]).catch(function () { return null; });
        i++;
      }).catch(function (err) {
        parar();
        if (typeof toast === 'function') toast((err && err.message) || 'No se pudo generar la voz.', 'err');
      });
    }

    function hablar(txt, quien, fin) {
      parar();
      cola = trocear(txt);
      if (!cola.length) return;
      i = 0; sig = null; activo = true; dueno = quien || null; onFin = fin || null;
      var a = el();
      a.onended = function () { if (activo) siguiente(); };
      a.onerror = function () { parar(); };
      siguiente();
      avisar();
    }

    function parar() {
      activo = false; cola = []; i = 0; sig = null;
      try { if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); } } catch (e) {}
      avisar();
      dueno = null;
      if (onFin) { var f = onFin; onFin = null; try { f(); } catch (e) {} }
    }

    function avisar() {
      /* Repinta los botones de todas las respuestas de la hoja abierta */
      var bs = document.querySelectorAll('.ia-voz');
      for (var k = 0; k < bs.length; k++) {
        var on = activo && bs[k] === dueno;
        bs[k].classList.toggle('on', on);
        bs[k].innerHTML = on ? (STOP + ' Detener') : (BOCINA + ' Escuchar');
        bs[k].setAttribute('aria-label', on ? 'Detener la lectura' : 'Escuchar la respuesta');
      }
    }

    return {
      desbloquear: desbloquear, hablar: hablar, parar: parar,
      trocear: trocear,
      suena: function () { return activo; },
      dueno: function () { return dueno; }
    };
  })();

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
        '<button class="ia-fab" type="button" aria-label="Analizar con IA" title="Tócalo para analizar. Mantenlo pulsado para moverlo.">' +
        '<span class="ia-fab-ring" aria-hidden="true"></span>' +
        '<span class="ia-fab-ic">' + ROBOT + '</span>' +
        '<span class="ia-fab-tx">Analizar</span>' +
        '</button>'
      );
      fab.dataset.vista = r;
      if (reducido()) fab.classList.add('ia-sin-motor');
      fab.addEventListener('click', function (ev) {
        /* Si acaba de arrastrarse, ese clic es basura del gesto */
        if (fab.dataset.arrastro === '1') { fab.dataset.arrastro = ''; ev.preventDefault(); return; }
        Repro.desbloquear();                       // aprovechar el gesto para iOS
        abrir(fab.dataset.vista);
      });
      arrastrable(fab);
      document.body.appendChild(fab);
    });
  }
  function quitarFab() { if (fab) { fab.remove(); fab = null; } }

  /* ------------------------------------------------------------
     CLIC SOSTENIDO PARA MOVER
     ------------------------------------------------------------
     No se guarda la posición a propósito: al cambiar de vista el nodo
     se destruye (quitarFab en hashchange) y el siguiente nace otra vez
     en su esquina, que es justo lo pedido.
     ------------------------------------------------------------ */
  function arrastrable(el) {
    var ESPERA = 420;      // ms de clic sostenido
    var TOLERA = 10;       // px que se perdonan antes de considerarlo scroll
    var temp = null, listo = false, x0 = 0, y0 = 0, dx = 0, dy = 0, pid = null;

    function fijar(izq, arr) {
      var w = el.offsetWidth, h = el.offsetHeight, m = 8;
      izq = Math.max(m, Math.min(izq, window.innerWidth - w - m));
      arr = Math.max(m, Math.min(arr, window.innerHeight - h - m));
      el.style.left = izq + 'px';
      el.style.top = arr + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    }

    function soltar() {
      clearTimeout(temp); temp = null;
      if (listo) {
        el.classList.remove('ia-fab-mov');
        try { el.releasePointerCapture(pid); } catch (e) {}
      }
      listo = false; pid = null;
    }

    el.addEventListener('pointerdown', function (ev) {
      if (ev.button != null && ev.button > 0) return;
      pid = ev.pointerId;
      x0 = ev.clientX; y0 = ev.clientY;
      el.dataset.arrastro = '';
      temp = setTimeout(function () {
        var c = el.getBoundingClientRect();
        dx = x0 - c.left; dy = y0 - c.top;
        listo = true;
        el.classList.add('ia-fab-mov');
        try { el.setPointerCapture(pid); } catch (e) {}
        try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
        fijar(c.left, c.top);                    // pasa de right/bottom a left/top
      }, ESPERA);
    });

    el.addEventListener('pointermove', function (ev) {
      if (!listo) {
        /* se movió antes de tiempo: era un scroll o un roce, no un arrastre */
        if (temp && (Math.abs(ev.clientX - x0) > TOLERA || Math.abs(ev.clientY - y0) > TOLERA)) {
          clearTimeout(temp); temp = null;
        }
        return;
      }
      ev.preventDefault();
      el.dataset.arrastro = '1';
      fijar(ev.clientX - dx, ev.clientY - dy);
    });

    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', function () { el.dataset.arrastro = ''; soltar(); });
    el.__fijar = fijar;   /* lo usa el listener global de resize */
  }

  /* Un solo listener para toda la app: el FAB se crea y se destruye en
     cada cambio de vista, y uno por FAB seria una fuga silenciosa. */
  window.addEventListener('resize', function () {
    if (!fab || !fab.parentNode || !fab.__fijar || !fab.style.left) return;
    fab.__fijar(parseFloat(fab.style.left) || 0, parseFloat(fab.style.top) || 0);
  });

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
      Repro.parar();                         // que no siga hablando con la hoja cerrada
      hoja.classList.remove('ia-on');
      setTimeout(function () { hoja.remove(); }, reducido() ? 0 : 220);
      document.removeEventListener('keydown', esc);
    }
    function esc(ev) { if (ev.key === 'Escape') cerrar(); }
    document.addEventListener('keydown', esc);
    hoja.querySelector('.ia-x').addEventListener('click', cerrar);
    hoja.querySelector('.ia-fondo').addEventListener('click', cerrar);

    /* Se conoce el estado de la voz desde ya, para que los botones de
       Escuchar aparezcan sin esperar a la primera respuesta. */
    pedirVoz();

    /* CAMBIO 27/07: ya no se analiza al abrir. Se deja "Iniciar" escrito
       y el usuario decide si lo envía o pregunta otra cosa. */
    if (hilos[vista].length) {
      hilos[vista].forEach(function (m) { pintar(body, m.rol, m.texto, m.meta); });
      irAbajo(body);
    } else {
      pintarAviso(body, 'Envía «Iniciar» para el análisis completo de ' + (VISTAS[vista] || 'esta vista') +
                        ', o borra la palabra y pregunta lo que necesites.');
      input.value = 'Iniciar';
    }

    hoja.querySelector('.ia-pie').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      Repro.desbloquear();                   // el gesto que iOS exige para poder hablar después
      input.value = '';
      if (esIniciar(q)) {                    // palabra clave: análisis de la vista, sin burbuja
        consultar(vista, body, '', input);
        return;
      }
      pintar(body, 'user', q);
      hilos[vista].push({ rol: 'user', texto: q });
      consultar(vista, body, q, input);
    });

    setTimeout(function () {
      try { input.focus(); if (input.value) input.select(); } catch (e) {}
    }, 260);
  }

  function irAbajo(body) { body.scrollTop = body.scrollHeight; }

  function pintarAviso(body, txt) {
    var el = nodo('<div class="ia-hint"></div>');
    el.textContent = txt;
    body.appendChild(el);
    return el;
  }

  function pintar(body, rol, texto, meta) {
    var cls = rol === 'user' ? 'ia-msg ia-yo' : 'ia-msg ia-bot';
    var el = nodo('<div class="' + cls + '"></div>');
    if (rol === 'user') el.textContent = texto;
    else {
      el.innerHTML = aHtml(texto);
      var pie = nodo('<div class="ia-meta"></div>');
      if (meta) {
        var sello = nodo('<span class="ia-meta-tx"></span>');
        sello.textContent = meta;
        pie.appendChild(sello);
      }
      pie.appendChild(botonera(texto, vistaDe(body)));
      el.appendChild(pie);
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
     WhatsApp (abre el selector de contacto, sin número preescrito).
     27/07: se suma Escuchar. */
  function botonera(texto, vista) {
    var caja = nodo('<span class="ia-acts"></span>');

    /* Se crea siempre y se esconde si aun no hay clave de voz: el estado
       de la voz llega por red y puede tardar mas que el primer pintado. */
    var voz = nodo('<button class="ia-act ia-voz" type="button" aria-label="Escuchar la respuesta">' + BOCINA + ' Escuchar</button>');
    if (!(vozCfg && vozCfg.configurada)) voz.style.display = 'none';
    voz.addEventListener('click', function () {
      if (Repro.suena() && Repro.dueno() === voz) return Repro.parar();
      Repro.desbloquear();
      Repro.hablar(texto, voz);
    });
    caja.appendChild(voz);

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
        var burbuja = pintar(body, 'ia', r.texto, meta);
        hilos[vista].push({ rol: 'ia', texto: r.texto });
        leerSiToca(burbuja, r.texto);
      })
      .catch(function (err) {
        /* api() LANZA cuando el CORE responde {ok:false}: ahí viene el motivo
           real (p. ej. "No autorizado"). Mostrarlo es más útil que un genérico. */
        cargando.remove();
        if (input) { input.disabled = false; }
        pintarError(body, (err && err.message) ? err.message : 'Error de conexión con el backend.');
      });
  }

  /* Lectura automática: TODAS las respuestas del robot, si el interruptor
     de Configuración está en SÍ y hay clave de Inworld. */
  function leerSiToca(burbuja, texto) {
    pedirVoz().then(function (v) {
      if (!v || !v.configurada || !v.auto) return;
      if (!burbuja || !burbuja.parentNode) return;      // cerró la hoja mientras respondía
      var boton = burbuja.querySelector('.ia-voz');
      Repro.hablar(texto, boton);
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
     CONFIGURACIÓN → AVANZADO · tarjetas (solo DEV)
     ============================================================ */
  function montarConfig() {
    if (ruta() !== 'config' || !esDev()) return;
    var cuerpo = document.getElementById('cf-body');
    if (!cuerpo) return;
    if (typeof CF === 'undefined' || !CF || CF.tab !== 'avanzado') return;
    montarConfigVoz(cuerpo);
    if (cuerpo.querySelector('#ia-cfg-sec')) return;

    pedirEstado().then(function (e) {
      if (!document.getElementById('cf-body') || document.getElementById('ia-cfg-sec')) return;
      var pens = String(e.pensar || 'BAJO').toUpperCase();
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
        '<input class="input" id="ia-cfg-modelo" value="' + limpio(e.modelo || '') + '" autocomplete="off" />' +
        '<div class="ia-cfg-fila"><button class="btn btn-quiet" id="ia-cfg-mods" type="button">Ver disponibles</button>' +
        '<select class="input" id="ia-cfg-mods-sel" style="display:none"></select></div>' +
        '<div class="cfg-hint">Google retira nombres de modelo cada tanto. Si el robot contesta con un error 404, pulsa "Ver disponibles" y elige otro de los que acepta tu clave.</div></div>' +
        '<div class="cfg-field full"><label>Cuánto piensa antes de responder</label>' +
        '<select class="input" id="ia-cfg-pensar">' +
        '<option value="BAJO"' + (pens === 'BAJO' ? ' selected' : '') + '>Bajo (recomendado)</option>' +
        '<option value="MEDIO"' + (pens === 'MEDIO' ? ' selected' : '') + '>Medio</option>' +
        '<option value="ALTO"' + (pens === 'ALTO' ? ' selected' : '') + '>Alto</option>' +
        '<option value="AUTO"' + (pens === 'AUTO' ? ' selected' : '') + '>Que decida el modelo</option>' +
        '</select>' +
        '<div class="cfg-hint">Las cuentas se las damos hechas, así que pensar más no mejora el análisis: solo tarda y cuesta más. Si las respuestas salen vacías o cortadas, déjalo en Bajo.</div></div>' +
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

      /* Lista de modelos: NO se pide al abrir Configuración, solo al pulsar.
         Cada visita gastaría una llamada a Google para nada. */
      var mods = sec.querySelector('#ia-cfg-mods');
      var modsSel = sec.querySelector('#ia-cfg-mods-sel');
      if (mods) mods.addEventListener('click', function () {
        mods.disabled = true; mods.textContent = 'Consultando…';
        api('priv.iaModelos', { caller: yo() }, 'GET', null, { silent: true })
          .then(function (r) {
            mods.disabled = false; mods.textContent = 'Ver disponibles';
            if (!r || r.ok === false) return toast((r && r.msg) || 'No se pudo consultar.', 'err');
            modsSel.innerHTML = (r.modelos || []).map(function (m) {
              return '<option value="' + limpio(m.id) + '">' + limpio(m.nombre) + '</option>';
            }).join('');
            modsSel.style.display = '';
            modsSel.addEventListener('change', function () {
              sec.querySelector('#ia-cfg-modelo').value = modsSel.value;
            });
          })
          .catch(function (err) {
            mods.disabled = false; mods.textContent = 'Ver disponibles';
            toast((err && err.message) || 'No se pudo consultar.', 'err');
          });
      });

      var guardar = sec.querySelector('#ia-cfg-save');
      if (guardar) guardar.addEventListener('click', function () {
        var k = sec.querySelector('#ia-cfg-key').value.trim();
        var m = sec.querySelector('#ia-cfg-modelo').value.trim();
        var enf = sec.querySelector('#ia-cfg-enfoque').value;
        var tl = sec.querySelector('#ia-cfg-texto').value;
        var pn = sec.querySelector('#ia-cfg-pensar').value;
        guardar.disabled = true;
        api('priv.iaClave', {}, 'POST', { caller: yo(), clave: k, modelo: m, enfoque: enf, textoLibre: tl, pensar: pn }, { silent: true })
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

  /* ---------- tarjeta de la voz ---------- */
  function montarConfigVoz(cuerpo) {
    if (document.getElementById('voz-cfg-sec')) return;
    pedirVoz().then(function (v) {
      if (!document.getElementById('cf-body') || document.getElementById('voz-cfg-sec')) return;
      var ent = String(v.entrega || 'BALANCED').toUpperCase();
      var html =
        '<div class="cfg-estados">' +
        '<span class="cfg-est ' + (v.configurada ? 'ok' : 'no') + '">' +
        (v.configurada ? 'Clave de Inworld guardada' : 'FALTA la clave de Inworld: el robot no habla') +
        '</span></div>' +
        '<p class="cfg-hint">Igual que la de Gemini: se guarda en las Propiedades del Script y no se vuelve a ver. El texto del análisis viaja a Inworld para convertirse en audio, así que es un proveedor más que ve lo que dice el robot.</p>' +
        '<div class="cfg-grid">' +
        '<div class="cfg-field full"><label>Clave de Inworld</label>' +
        '<input class="input" id="voz-cfg-key" type="password" placeholder="' + (v.configurada ? '•••••••• (ya guardada)' : 'Pega aquí la clave') + '" autocomplete="off" /></div>' +
        '<div class="cfg-field full"><label>Lectura automática</label>' +
        '<select class="input" id="voz-cfg-auto">' +
        '<option value="SI"' + (v.auto === false ? '' : ' selected') + '>SÍ, leer cada respuesta al llegar</option>' +
        '<option value="NO"' + (v.auto === false ? ' selected' : '') + '>NO, solo con el botón Escuchar</option>' +
        '</select></div>' +
        '<div class="cfg-field full"><label>Voz</label>' +
        '<input class="input" id="voz-cfg-voz" value="' + limpio(v.voz || 'Cuauhtemoc') + '" autocomplete="off" />' +
        '<div class="ia-cfg-fila"><button class="btn btn-quiet" id="voz-cfg-ver" type="button">Ver disponibles</button>' +
        '<select class="input" id="voz-cfg-sel" style="display:none"></select></div></div>' +
        '<div class="cfg-field"><label>Modelo de voz</label>' +
        '<input class="input" id="voz-cfg-modelo" value="' + limpio(v.modelo || 'inworld-tts-2') + '" autocomplete="off" /></div>' +
        '<div class="cfg-field"><label>Idioma</label>' +
        '<input class="input" id="voz-cfg-idioma" value="' + limpio(v.idioma || 'es-ES') + '" autocomplete="off" />' +
        '<div class="cfg-hint">es-ES, es-MX… o AUTO.</div></div>' +
        '<div class="cfg-field"><label>Velocidad</label>' +
        '<input class="input" id="voz-cfg-vel" type="number" step="0.1" min="0.5" max="1.5" value="' + limpio(v.velocidad == null ? 1 : v.velocidad) + '" />' +
        '<div class="cfg-hint">Entre 0.5 y 1.5.</div></div>' +
        '<div class="cfg-field"><label>Expresividad</label>' +
        '<select class="input" id="voz-cfg-ent">' +
        '<option value="STABLE"' + (ent === 'STABLE' ? ' selected' : '') + '>Plana</option>' +
        '<option value="BALANCED"' + (ent === 'BALANCED' ? ' selected' : '') + '>Equilibrada</option>' +
        '<option value="CREATIVE"' + (ent === 'CREATIVE' ? ' selected' : '') + '>Expresiva</option>' +
        '</select></div>' +
        '</div>' +
        '<div class="cfg-actions">' +
        (v.configurada ? '<button class="btn btn-quiet" id="voz-cfg-del">Borrar clave</button>' : '') +
        (v.configurada ? '<button class="btn btn-quiet" id="voz-cfg-test">Probar voz</button>' : '') +
        '<button class="btn btn-primary" id="voz-cfg-save">Guardar</button>' +
        '</div>';

      var sec = nodo(typeof cfCard === 'function'
        ? cfCard('🔊 Voz del robot · Inworld (solo DESARROLLADOR)', 'Lee en voz alta las respuestas del análisis con IA.', html)
        : '<section class="cfg-acc-sec"><div class="cfg-acc-b">' + html + '</div></section>');
      sec.id = 'voz-cfg-sec';
      cuerpo.appendChild(sec);
      try { if (typeof cfAccBind === 'function') cfAccBind(); } catch (er) {}

      var ver = sec.querySelector('#voz-cfg-ver');
      var sel = sec.querySelector('#voz-cfg-sel');
      if (ver) ver.addEventListener('click', function () {
        ver.disabled = true; ver.textContent = 'Consultando…';
        api('priv.vozVoces', { caller: yo() }, 'GET', null, { silent: true })
          .then(function (r) {
            ver.disabled = false; ver.textContent = 'Ver disponibles';
            if (!r || r.ok === false) return toast((r && r.msg) || 'No se pudo consultar.', 'err');
            sel.innerHTML = (r.voces || []).map(function (x) {
              var et = x.nombre + (x.idioma ? ' · ' + x.idioma : '') + (x.genero ? ' · ' + x.genero : '');
              return '<option value="' + limpio(x.id) + '">' + limpio(et) + '</option>';
            }).join('');
            sel.style.display = '';
            sel.addEventListener('change', function () { sec.querySelector('#voz-cfg-voz').value = sel.value; });
            if (!r.filtradas) toast('No hay voces de ese idioma: se listan todas.', '');
          })
          .catch(function (err) {
            ver.disabled = false; ver.textContent = 'Ver disponibles';
            toast((err && err.message) || 'No se pudo consultar.', 'err');
          });
      });

      var probar = sec.querySelector('#voz-cfg-test');
      if (probar) probar.addEventListener('click', function () {
        Repro.desbloquear();
        Repro.hablar('Hola. Así se escucha el análisis del robot en esta configuración.', null);
      });

      var guardar = sec.querySelector('#voz-cfg-save');
      if (guardar) guardar.addEventListener('click', function () {
        guardar.disabled = true;
        api('priv.vozClave', {}, 'POST', {
          caller: yo(),
          clave:     sec.querySelector('#voz-cfg-key').value.trim(),
          auto:      sec.querySelector('#voz-cfg-auto').value,
          voz:       sec.querySelector('#voz-cfg-voz').value.trim(),
          modelo:    sec.querySelector('#voz-cfg-modelo').value.trim(),
          idioma:    sec.querySelector('#voz-cfg-idioma').value.trim(),
          velocidad: sec.querySelector('#voz-cfg-vel').value,
          entrega:   sec.querySelector('#voz-cfg-ent').value
        }, { silent: true })
          .then(function (r) {
            guardar.disabled = false;
            toast((r && r.msg) || 'Listo.', (r && r.ok) ? '' : 'err');
            if (r && r.ok) { vozCfg = null; sec.querySelector('#voz-cfg-key').value = ''; }
          })
          .catch(function (err) { guardar.disabled = false; toast((err && err.message) || 'Error de conexión.', 'err'); });
      });

      var borrar = sec.querySelector('#voz-cfg-del');
      if (borrar) borrar.addEventListener('click', function () {
        borrar.disabled = true;
        api('priv.vozClave', {}, 'POST', { caller: yo(), borrar: true }, { silent: true })
          .then(function (r) {
            borrar.disabled = false;
            toast((r && r.msg) || 'Listo.');
            vozCfg = null;
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
    Repro.parar();        // cambiar de vista calla al robot
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

  /* Puerta para las pruebas automáticas. No la usa la app. */
  window.__np11 = { trocear: Repro.trocear, esIniciar: esIniciar, VISTAS: VISTAS };
})();

async function viewBaseDatos(user) {
  BD_ME = user.documento;
  appWide(true, true);
  app.innerHTML = `${backbar('Base de Datos')}
    <div class="pad">
      <div class="bd-toolbar">
        <div class="bd-search">
          <input class="input" id="bd-q" placeholder="Buscar por nombre, documento o residencia…" autocomplete="off" />
        </div>
        <button class="btn btn-primary bd-add" id="bd-add">+ Agregar</button>
        <button class="btn btn-ghost bd-add bd-pend" id="bd-pend" title="Lo anotado sin señal o pegado, para revisar y subir">${I.upload} Pendientes <span class="sr-badge" data-pend-n ${window.SINRED && SINRED.contar(user.documento) ? '' : 'hidden'}>${window.SINRED ? (SINRED.contar(user.documento) || '') : ''}</span></button>
      </div>
      <div class="bd-nav">
        <button class="btn btn-ghost bd-nav-btn" id="bd-dashboard">${I.chart} Dashboard</button>
        <button class="btn btn-ghost bd-nav-btn" id="bd-simulador">${I.sliders} Simulador</button>
        <button class="btn btn-ghost bd-nav-btn bd-nav-vote" id="bd-votacion">${I.vote} Votación</button>
        <button class="btn btn-ghost bd-nav-btn bd-nav-val" id="bd-validacion" title="Enviar a los líderes el enlace para validar los documentos POR CONFIRMAR">${I.wa} Validación <span class="bd-val-n" data-val-n>0</span></button>
      </div>
      <div class="bd-chips" id="bd-chips">
        ${['Todos',MV.municipio,'Sin consultar','A la espera','Por confirmar','Otros','Inactivos'].map((t,i)=>`<button class="bd-chip ${i===0?'active':''}" data-f="${esc(t)}">${esc(t)} <span class="bd-chip-n" data-n></span></button>`).join('')}
        <button class="bd-chip bd-chip-elim" data-f="Por eliminar" hidden title="Fallecidos confirmados por el líder: revisa y elimina">Por eliminar <span class="bd-chip-n" data-n></span></button>
      </div>
      <div class="bd-chips bd-chips-int" id="bd-chips-int"></div>
      <div class="bd-lidbar">
        <div class="bd-lidsel">
          <span class="bd-chips-lbl">Líder:</span>
          ${comboboxHtml('bd-lid', 'Todos los líderes…')}
        </div>
        <div class="bd-exp">
          <button class="btn btn-ghost" id="bd-excel">${I.download} Excel</button>
          <button class="btn btn-ghost" id="bd-pdf">${I.download} PDF</button>
          <button class="btn btn-ghost" id="bd-subir">${I.upload} Subir</button>
        </div>
      </div>
      <div class="bd-tend" id="bd-tend" hidden></div>
      <div class="bd-count" id="bd-count"></div>
      <div id="bd-body">${loadingBox('Cargando registros…')}</div>
      <div class="center" id="bd-more" style="margin-top:12px;"></div>
    </div>`;
  app.hidden = false; hideSplash();
  $('#backbtn').onclick = () => go('home');
  $('#bd-add').onclick = () => bdAgregar();
  { const bp = $('#bd-pend'); if (bp) bp.onclick = () => window.PEND && PEND.bdPendientes(user); }   /* 08/11/2026 */
  $('#bd-dashboard').onclick = () => go('dashboard');
  $('#bd-simulador').onclick = () => go('simulador');
  $('#bd-votacion').onclick = () => go('votacion');
  { const bv = $('#bd-validacion'); if (bv) bv.onclick = () => window.bdValEnviar && bdValEnviar(); }   /* 09/11/2026 */

  /* 13/10/2026 · carga única por sesión: la segunda visita pinta al instante
     desde la caché y solo vuelve al servidor si /meta dice que algo cambió. */
  let primera = true;
  /* 18/11/2026 · al entrar (o volver) TODOS los filtros arrancan en blanco,
     igual que lo que se ve: antes BD_LID guardaba el líder elegido en la
     visita anterior mientras la casilla decía "Todos" (filtro escondido). */
  BD_INT.clear(); BD_LID = '';
  if (window.bdActReiniciar) bdActReiniciar();
  try {
    /* act=1 (09/11/2026): la lista trae quién tiene servicios, compromisos,
       eventos y formularios (fila de filtros por actividad, bd-actividad.js) */
    await rapCargar('priv.baseDatos', { caller: BD_ME, act: '1' }, (r) => {
      if (!$('#bd-body')) return;                         // ya salió de la vista
      if (!r || r.ok === false) { if (primera) $('#bd-body').innerHTML = `<p class="muted center">No se pudo cargar.</p>`; return; }
      BD_ALL = r.items || []; BD_REG_URL = r.registraduriaUrl || ''; if (r.pc) window.BD_PC = r.pc;
      BD_LIDERES = r.lideres || []; BD_COLS = r.columnas || []; BD_DASH = r.dash || BD_DASH;
      if (window.bdActDato) bdActDato(r.act);
      bdBuildIntChips();
      if (primera) bdBindLiderCombo();                    // el combo solo se arma una vez (no pierde lo elegido)
      primera = false;
      bdApplyFilter();
    });
  } catch (e) { if ($('#bd-body') && primera) $('#bd-body').innerHTML = `${fallaHtml(e)}`; }

  const q = $('#bd-q'); let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(bdApplyFilter, 160); };
  $$('#bd-chips .bd-chip').forEach(ch => ch.onclick = () => { $$('#bd-chips .bd-chip').forEach(x => x.classList.remove('active')); ch.classList.add('active'); bdApplyFilter(); });
  $('#bd-excel').onclick = () => bdExportar('excel');
  $('#bd-pdf').onclick = () => bdExportar('pdf');
  $('#bd-subir').onclick = () => bdSubir();

  vivoBind('bd', BD_ME, vivoBd);   // EN VIVO
}
function bdPasaLid(c, lid) {
  if (lid === 'SIN') return !String(c.referencia || '');
  if (lid) return String(c.referencia || '') === String(lid);
  return true;
}
function bdLidTexto(lid) {
  if (lid === 'SIN') return 'Sin líder asignado';
  if (!lid) return '';
  const l = BD_LIDERES.find(x => String(x.codigo) === String(lid));
  return l ? bdLiderLabel(l) : '#' + lid;
}
function bdLidDeTexto(v) {
  v = String(v || '').trim();
  if (!v || /^todos los l/i.test(v)) return '';
  if (/^sin l[ií]der asignado$/i.test(v)) return 'SIN';
  const m = v.match(/^#(\d+) · /); if (!m) return null;
  const l = BD_LIDERES.find(x => String(x.codigo) === m[1]);
  return l && bdLiderLabel(l).toLowerCase() === v.toLowerCase() ? m[1] : null;
}
function bdBindLiderCombo() {
  const lista = ['Todos los líderes', 'Sin líder asignado'].concat(BD_LIDERES.map(bdLiderLabel));
  bindCombobox('bd-lid', lista);
  const inp = $('#bd-lid'), list = $('#bd-lid-list'); if (!inp) return;
  inp.value = bdLidTexto(BD_LID);   // la casilla SIEMPRE dice lo que se filtra
  const leer = () => {
    if (!$('#bd-count')) return;   // se salió de la vista con el debounce en vuelo
    const nuevo = bdLidDeTexto(inp.value);
    if (nuevo === null || nuevo === BD_LID) return;   // a medio escribir o sin cambio
    BD_LID = nuevo;
    bdApplyFilter();
  };
  /* Al salir de la casilla con texto a medias se devuelve el líder vigente:
     nunca queda escrito algo distinto de lo que filtra la lista. */
  inp.addEventListener('blur', () => setTimeout(() => {
    if (document.activeElement === inp) return;
    const v = bdLidDeTexto(inp.value);
    if (v === null) inp.value = bdLidTexto(BD_LID);

  }, 200));
  /* bindCombobox pisa .oninput y NO dispara 'change' al elegir una opción:
     por eso se escucha el clic en la lista (delegado, así corre DESPUÉS de
     que la opción escribe el valor) y el tecleo con addEventListener. */
  if (list) list.addEventListener('click', () => setTimeout(leer, 0));
  let t = null;
  inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(leer, 250); });
}
function bdFiltroTxt() {
  const p = [];
  const f = bdActiveFilter(); if (f && f !== 'Todos') p.push(f);
  if (BD_LID === 'SIN') p.push('Sin líder asignado');
  else if (BD_LID) p.push('Líder: ' + bdLidTexto(BD_LID));
  if (BD_INT.size) p.push('Intención: ' + Array.from(BD_INT).join(', '));
  if (window.bdActTxt && bdActTxt()) p.push('Con ' + bdActTxt());
  const q = (($('#bd-q') || {}).value || '').trim(); if (q) p.push('Búsqueda: “' + q + '”');
  return p.length ? p.join(' · ') : 'Todos los registros';
}
function bdPasaResto(c, q, sinInt, sinAct, sinLid) {
  if (!sinAct && window.bdActPasa && !bdActPasa(c)) return false;   /* 09/11/2026 · Servicios/Compromisos/Eventos/Formularios */
  if (!sinInt && BD_INT.size && !BD_INT.has(String(c.intencion || '').trim())) return false;
  if (!sinLid && !bdPasaLid(c, BD_LID)) return false;   /* 18/11/2026 · sinLid: la gráfica por líder */
  if (q) {
    const hay = (String(c.nombre||'') + ' ' + String(c.documento||'') + ' ' + String(c.residencia||'')).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}
function bdBuildIntChips() {
  const cont = $('#bd-chips-int'); if (!cont) return;
  const conteo = {};
  BD_ALL.forEach(c => {
    if (c.estado === 'INACTIVO') return;
    const v = String(c.intencion || '').trim();
    if (v) conteo[v] = (conteo[v] || 0) + 1;
  });
  /* 18/11/2026 · una intención MARCADA se queda en pantalla aunque ya no
     tenga registros (EN VIVO): si desapareciera, filtraría sin verse. */
  BD_INT.forEach(v => { if (!(v in conteo)) conteo[v] = 0; });
  const valores = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a]);
  if (!valores.length) { cont.innerHTML = ''; return; }
  cont.innerHTML = `<span class="bd-chips-lbl">Intención:</span>` +
    valores.map(v => `<button class="bd-chip bd-chip-int" data-int="${esc(v)}">${esc(v)} <span class="bd-chip-n">${conteo[v].toLocaleString('es-CO')}</span></button>`).join('');
  $$('#bd-chips-int .bd-chip-int').forEach(ch => ch.onclick = () => {
    const v = ch.dataset.int;
    if (BD_INT.has(v)) BD_INT.delete(v); else BD_INT.add(v);
    ch.classList.toggle('active', BD_INT.has(v));
    bdApplyFilter();
  });
  /* EN VIVO: al repintar las pastillas hay que devolverles lo que el usuario
     tenía marcado; si no, un refresco de fondo le borraría el filtro de la
     pantalla (BD_INT sí lo conserva, pero el botón se veía apagado). */
  $$('#bd-chips-int .bd-chip-int').forEach(ch => ch.classList.toggle('active', BD_INT.has(ch.dataset.int)));
  if (window.bdTablero) bdTablero();   // 08/11/2026 · el número de cada intención respeta los demás filtros
}
/* ============================================================================
 * JHONNY PRIV · BASE DE DATOS — CONTEOS EN LOS FILTROS + CRECIMIENTO POR MES
 * (08/11/2026)
 * ----------------------------------------------------------------------------
 * Todo sale de BD_ALL, la lista que ya está en memoria (carga única fmt=2):
 * cero viajes al servidor. Usa las MISMAS reglas que la lista (bdPasaChip y
 * bdPasaResto, en app.js), así que los números cuadran con "N registro(s)".
 *
 *  · Pastillas de municipio/estado: cada una cuenta lo que mostraría al
 *    tocarla con la búsqueda, el líder y las intenciones elegidas.
 *  · Pastillas de intención: cada una cuenta lo que mostraría con la
 *    pastilla de municipio/estado, la búsqueda y el líder elegidos.
 *  · Tendencia: registros por mes (FECHA_REGISTRO) de lo que se ve en la
 *    lista (todos los filtros). Franja compacta + hoja ampliada.
 *
 *  · 18/11/2026 · La hoja ampliada trae su propio selector de líder (Todos,
 *    Sin líder o uno, con buscador por nombre o número) y la pestaña
 *    «Líderes», que los clasifica por crecimiento. Sale de la misma lista
 *    (ULT.base = todos los filtros MENOS el líder): cero viajes. Elegir un
 *    líder en la hoja NO cambia la lista de atrás.
 *
 * Se llama desde bdApplyFilter, bdBuildIntChips y el parche de fila
 * (bdUpsertCard): agregar, editar, inactivar, eliminar y EN VIVO quedan al
 * día sin recargar. Tiempo de pantalla: RED.pantalla('bd.tablero').
 * ============================================================================ */
(function () {
  'use strict';

  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MES_L = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var ULT = null;   // último cálculo (la hoja ampliada lo reutiliza)
  /* estado de la hoja ampliada: líder propio, pestaña y orden de la clasificación */
  var M = { lid: '', tab: 'graf', ord: 'mes', ceros: false };

  function n(x) { return Number(x || 0).toLocaleString('es-CO'); }
  function e(s) { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); }

  /* dd/mm/aaaa → { k: 'aaaa-mm', d: día } ; sin fecha → null */
  function mesDe(c) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String((c && c.fechaRegistro) || '').trim());
    if (!m) return null;
    return { k: m[3] + '-' + m[2], d: +m[1] };
  }
  function kDe(fecha) { return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0'); }
  function kSig(k) { var y = +k.slice(0, 4), m = +k.slice(5, 7); m++; if (m > 12) { m = 1; y++; } return y + '-' + String(m).padStart(2, '0'); }
  function kCorto(k) { return MES[+k.slice(5, 7) - 1] + ' ' + k.slice(2, 4); }
  function kLargo(k) { return MES_L[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4); }

  /* ---------- cálculo (una pasada por BD_ALL) ---------- */
  function calcular() {
    var q = bdQ(), f = bdActiveFilter();
    var chips = {}, ints = {}, visibles = [];
    var etiquetas = [];
    document.querySelectorAll('#bd-chips .bd-chip').forEach(function (b) { etiquetas.push(b.dataset.f); chips[b.dataset.f] = 0; });
    var base = [];                                    // 18/11 · todo menos el líder (hoja ampliada)
    for (var i = 0; i < BD_ALL.length; i++) {
      var c = BD_ALL[i];
      if (!bdPasaResto(c, q, true, false, true)) continue;   // búsqueda + actividad (sin intención ni líder)
      var okLid = bdPasaLid(c, BD_LID);
      var conInt = !BD_INT.size || BD_INT.has(String(c.intencion || '').trim());
      if (okLid && conInt) for (var j = 0; j < etiquetas.length; j++) if (bdPasaChip(c, etiquetas[j])) chips[etiquetas[j]]++;
      if (bdPasaChip(c, f)) {
        if (okLid) { var v = String(c.intencion || '').trim(); if (v) ints[v] = (ints[v] || 0) + 1; }
        if (conInt) { base.push(c); if (okLid) visibles.push(c); }
      }
    }
    return { chips: chips, ints: ints, tend: tendencia(visibles), base: base };
  }

  function tendencia(lista) {
    var hoy = new Date(), kHoy = kDe(hoy), diaHoy = hoy.getDate();
    var por = {}, corte = {}, sinFecha = 0, kMin = null;
    lista.forEach(function (c) {
      var m = mesDe(c);
      if (!m) { sinFecha++; return; }
      por[m.k] = (por[m.k] || 0) + 1;
      if (m.d <= diaHoy) corte[m.k] = (corte[m.k] || 0) + 1;   // para comparar el mes en curso al mismo día
      if (!kMin || m.k < kMin) kMin = m.k;
    });
    var meses = [], acum = 0;
    if (kMin) {
      var kFin = kHoy;
      Object.keys(por).forEach(function (k) { if (k > kFin) kFin = k; });   // fecha futura mal digitada: igual se muestra
      for (var k = kMin, guard = 0; k <= kFin && guard < 600; k = kSig(k), guard++) {
        var nuevos = por[k] || 0; acum += nuevos;
        var prev = meses.length ? meses[meses.length - 1].nuevos : null;
        meses.push({ k: k, nuevos: nuevos, acum: acum, prev: prev, enCurso: k === kHoy });
      }
    }
    var actual = meses.length ? meses[meses.length - 1] : null;
    var anterior = meses.length > 1 ? meses[meses.length - 2] : null;
    return {
      total: lista.length, sinFecha: sinFecha, meses: meses, kHoy: kHoy, diaHoy: diaHoy,
      actual: actual, anterior: anterior,
      anteriorAlCorte: anterior ? (corte[anterior.k] || 0) : 0
    };
  }

  /* ---------- variación ---------- */
  function variacion(act, ant) {
    if (ant == null) return { cls: 'eq', txt: '—', tip: 'Sin mes anterior' };
    var d = act - ant;
    if (d === 0) return { cls: 'eq', txt: '= 0', tip: 'Igual que el mes anterior' };
    var pct = ant > 0 ? n(Math.round(Math.abs(d) * 100 / ant)) + ' %' : 'nuevo';
    return { cls: d > 0 ? 'up' : 'down', txt: (d > 0 ? '▲ +' : '▼ ') + n(d) + ' (' + pct + ')', tip: '' };
  }

  /* ---------- pintar pastillas ---------- */
  function pintarChips(r) {
    document.querySelectorAll('#bd-chips .bd-chip').forEach(function (b) {
      var s = b.querySelector('.bd-chip-n'); if (!s) return;
      var t = n(r.chips[b.dataset.f]); if (s.textContent !== t) s.textContent = t;
      /* 12/11/2026 · «Por eliminar» solo se ve si hay alguno (o si está marcada) */
      if (b.dataset.f === 'Por eliminar') b.hidden = !r.chips[b.dataset.f] && !b.classList.contains('active');
    });
    document.querySelectorAll('#bd-chips-int .bd-chip-int').forEach(function (b) {
      var s = b.querySelector('.bd-chip-n'); if (!s) return;
      var v = r.ints[b.dataset.int] || 0, t = n(v);
      if (s.textContent !== t) s.textContent = t;
      b.classList.toggle('bd-chip-cero', !v && !b.classList.contains('active'));
    });
  }

  /* ---------- franja compacta ---------- */
  function barrasMini(meses) {
    var ult = meses.slice(-12); if (!ult.length) return '';
    var max = Math.max.apply(null, ult.map(function (m) { return m.nuevos; })) || 1;
    var W = 12 * 10, H = 34, bw = 7;
    var x0 = W - ult.length * 10;
    return '<svg class="bdt-mini" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      ult.map(function (m, i) {
        var hh = Math.max(m.nuevos ? 2 : 1, Math.round(m.nuevos * (H - 2) / max));
        return '<rect x="' + (x0 + i * 10) + '" y="' + (H - hh) + '" width="' + bw + '" height="' + hh + '" rx="1.5" class="' + (m.enCurso ? 'cur' : '') + '"><title>' + e(kLargo(m.k)) + ': ' + n(m.nuevos) + '</title></rect>';
      }).join('') + '</svg>';
  }

  function pintarFranja(t) {
    var box = document.getElementById('bd-tend'); if (!box) return;
    if (!t.meses.length) { box.hidden = true; box.innerHTML = ''; return; }
    var a = t.actual, ant = t.anterior;
    var v, vLbl;
    if (a.enCurso && ant) { v = variacion(a.nuevos, t.anteriorAlCorte); vLbl = 'vs. ' + MES[+ant.k.slice(5, 7) - 1] + ' al día ' + t.diaHoy; }
    else { v = variacion(a.nuevos, ant ? ant.nuevos : null); vLbl = ant ? 'vs. ' + kCorto(ant.k) : 'mes anterior'; }
    var html =
      '<button type="button" class="bdt-strip" id="bdt-open" title="Ver la tendencia completa">' +
        '<span class="bdt-k"><span class="bdt-lbl">Total</span><b>' + n(t.total) + '</b></span>' +
        '<span class="bdt-k"><span class="bdt-lbl">' + e(kCorto(a.k)) + (a.enCurso ? ' · en curso' : '') + '</span><b>+' + n(a.nuevos) + '</b></span>' +
        '<span class="bdt-k bdt-v ' + v.cls + '"><span class="bdt-lbl">' + e(vLbl) + '</span><b>' + e(v.txt) + '</b></span>' +
        barrasMini(t.meses) +
        '<span class="bdt-mas">Ampliar</span>' +
      '</button>';
    if (box.__html !== html) { box.innerHTML = html; box.__html = html; var b = document.getElementById('bdt-open'); if (b) b.onclick = abrir; }
    box.hidden = false;
  }

  /* ---------- hoja ampliada ---------- */
  /* filtros de la lista que también aplican en la hoja (el líder va aparte) */
  function filtrosTxt() {
    var p = [], f = bdActiveFilter();
    if (f && f !== 'Todos') p.push(f);
    if (BD_INT.size) p.push('Intención: ' + Array.from(BD_INT).join(', '));
    if (window.bdActTxt && bdActTxt()) p.push('Con ' + bdActTxt());
    var q = bdQ(); if (q) p.push('Búsqueda: "' + q + '"');
    return p.join(' · ');
  }
  function lidTxt(lid) { return lid === 'SIN' ? 'Sin líder asignado' : lid ? bdLidTexto(lid) : 'Todos los líderes'; }

  function grafica(meses) {
    if (!meses.length) return '';
    var W = Math.max(320, meses.length * 46), H = 190, pl = 34, pr = 40, pt = 14, pb = 28;
    var cw = W - pl - pr, ch = H - pt - pb, paso = cw / meses.length, bw = Math.min(22, paso * .62);
    var maxN = Math.max.apply(null, meses.map(function (m) { return m.nuevos; })) || 1;
    var maxA = meses[meses.length - 1].acum || 1;
    var y = function (v, max) { return pt + ch - v * ch / max; };
    var barras = meses.map(function (m, i) {
      var x = pl + i * paso + (paso - bw) / 2, yy = y(m.nuevos, maxN);
      return '<rect class="bdt-bar' + (m.enCurso ? ' cur' : '') + '" x="' + x.toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (pt + ch - yy).toFixed(1) + '" rx="3"><title>' + e(kLargo(m.k)) + ': +' + n(m.nuevos) + ' · acumulado ' + n(m.acum) + '</title></rect>' +
        (m.nuevos ? '<text class="bdt-bv" x="' + (x + bw / 2).toFixed(1) + '" y="' + (yy - 3).toFixed(1) + '">' + n(m.nuevos) + '</text>' : '') +
        '<text class="bdt-x" x="' + (pl + i * paso + paso / 2).toFixed(1) + '" y="' + (H - 9) + '">' + e(kCorto(m.k)) + '</text>';
    }).join('');
    var linea = meses.map(function (m, i) { return (i ? 'L' : 'M') + (pl + i * paso + paso / 2).toFixed(1) + ' ' + y(m.acum, maxA).toFixed(1); }).join(' ');
    var puntos = meses.map(function (m, i) { return '<circle class="bdt-pt" cx="' + (pl + i * paso + paso / 2).toFixed(1) + '" cy="' + y(m.acum, maxA).toFixed(1) + '" r="2.6"><title>' + e(kLargo(m.k)) + ': acumulado ' + n(m.acum) + '</title></circle>'; }).join('');
    return '<div class="bdt-graf"><svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Registros nuevos por mes y acumulado">' +
      '<line class="bdt-eje" x1="' + pl + '" y1="' + (pt + ch) + '" x2="' + (W - pr) + '" y2="' + (pt + ch) + '"/>' +
      '<text class="bdt-yl" x="' + (pl - 6) + '" y="' + (pt + 4) + '">' + n(maxN) + '</text>' +
      '<text class="bdt-yr" x="' + (W - pr + 6) + '" y="' + (pt + 4) + '">' + n(maxA) + '</text>' +
      barras + '<path class="bdt-acum" d="' + linea + '"/>' + puntos + '</svg></div>';
  }

  function cuerpoHoja(t) {
    var filas = t.meses.slice().reverse().map(function (m) {
      var v = variacion(m.nuevos, m.prev);
      return '<div class="bdt-fila"><span class="bdt-mes">' + e(kLargo(m.k)) + (m.enCurso ? ' <i>en curso</i>' : '') + '</span>' +
        '<span class="bdt-num">+' + n(m.nuevos) + '</span><span class="bdt-num bdt-ac">' + n(m.acum) + '</span>' +
        '<span class="bdt-var ' + v.cls + '">' + e(v.txt) + '</span></div>';
    }).join('');
    var nota = t.actual && t.actual.enCurso && t.anterior
      ? '<p class="muted small bdt-nota">El mes en curso va en +' + n(t.actual.nuevos) + '; al día ' + t.diaHoy + ' de ' + e(kLargo(t.anterior.k).toLowerCase()) + ' iban +' + n(t.anteriorAlCorte) + '.</p>' : '';
    var ft = filtrosTxt();
    return '<p class="muted small bdt-filtros"><b>' + e(lidTxt(M.lid)) + '</b>' + (ft ? ' · ' + e(ft) : (M.lid ? '' : ' · toda la base activa')) + ' · ' + n(t.total) + ' registro(s)</p>' +
      (!t.meses.length ? '<p class="muted center bdt-vacio">Sin registros con fecha para esta selección.</p>' : '') +
      '<div class="bdt-ley"><span><i class="bdt-sw-bar"></i>Nuevos del mes</span><span><i class="bdt-sw-lin"></i>Acumulado</span></div>' +
      grafica(t.meses) + nota +
      '<div class="bdt-tabla"><div class="bdt-fila bdt-cab"><span>Mes</span><span class="bdt-num">Nuevos</span><span class="bdt-num">Acumulado</span><span>Vs. mes anterior</span></div>' + filas + '</div>' +
      (t.sinFecha ? '<p class="muted small">Sin fecha de registro: ' + n(t.sinFecha) + ' (no entran en la tendencia).</p>' : '');
  }

  /* ================= 18/11/2026 · por líder + clasificación ================= */
  function tendLid() { return M.lid ? tendencia(ULT.base.filter(function (c) { return bdPasaLid(c, M.lid); })) : tendencia(ULT.base); }

  /* Clasificación: una pasada por ULT.base agrupando por REFERENCIA. */
  function ranking() {
    var hoy = new Date(), kHoy = kDe(hoy), dia = hoy.getDate();
    var k1 = kAnt(kHoy), k2 = kAnt(k1), ks = [kHoy], i;
    for (i = 0; i < 5; i++) ks.unshift(kAnt(ks[0]));   // 6 meses para la mini gráfica
    var g = {};
    function grupo(cod) {
      if (!g[cod]) g[cod] = { cod: cod, total: 0, mes: 0, ant: 0, antCorte: 0, tri: 0, seis: ks.map(function () { return 0; }) };
      return g[cod];
    }
    (BD_LIDERES || []).forEach(function (l) { grupo(String(l.codigo)); });
    ULT.base.forEach(function (c) {
      var x = grupo(String(c.referencia || '') || 'SIN'); x.total++;
      var m = mesDe(c); if (!m) return;
      if (m.k === kHoy) { x.mes++; x.tri++; }
      else if (m.k === k1) { x.ant++; x.tri++; if (m.d <= dia) x.antCorte++; }
      else if (m.k === k2) x.tri++;
      var j = ks.indexOf(m.k); if (j >= 0) x.seis[j]++;
    });
    var lista = Object.keys(g).map(function (k) { var x = g[k]; x.dif = x.mes - x.antCorte; return x; });
    var clave = { mes: 'mes', tri: 'tri', dif: 'dif', total: 'total' }[M.ord] || 'mes';
    lista.sort(function (a, b) { return (b[clave] - a[clave]) || (b.mes - a.mes) || (b.total - a.total) || (String(a.cod) < String(b.cod) ? -1 : 1); });
    return { lista: lista, ks: ks, kHoy: kHoy, k1: k1, dia: dia };
  }
  function kAnt(k) { var y = +k.slice(0, 4), m = +k.slice(5, 7) - 1; if (m < 1) { m = 12; y--; } return y + '-' + String(m).padStart(2, '0'); }

  function seisMini(v) {
    var max = Math.max.apply(null, v) || 1;
    return '<svg class="bdr-mini" viewBox="0 0 60 20" preserveAspectRatio="none" aria-hidden="true">' + v.map(function (x, i) {
      var hh = Math.max(x ? 2 : 1, Math.round(x * 19 / max));
      return '<rect x="' + (i * 10) + '" y="' + (20 - hh) + '" width="7" height="' + hh + '" rx="1"' + (i === 5 ? ' class="cur"' : '') + '/>';
    }).join('') + '</svg>';
  }

  function cuerpoRank() {
    var t0 = performance.now();
    var R = ranking(), clave = { mes: 'mes', tri: 'tri', dif: 'dif', total: 'total' }[M.ord] || 'mes';
    var conDato = R.lista.filter(function (x) { return x.total > 0; });
    var ceros = R.lista.length - conDato.length;
    var lista = M.ceros ? R.lista : conDato;
    var max = Math.max.apply(null, lista.map(function (x) { return Math.abs(x[clave]); }).concat([1]));
    var lideres = conDato.filter(function (x) { return x.cod !== 'SIN'; });
    var crecen = lideres.filter(function (x) { return x.mes > 0; }).length;
    var top = lideres.slice().sort(function (a, b) { return b.mes - a.mes || b.total - a.total; })[0];
    var ft = filtrosTxt();
    var ords = [['mes', 'Este mes'], ['dif', 'Vs. mes anterior'], ['tri', 'Últimos 3 meses'], ['total', 'Total']];
    var pos = 0;
    var filas = lista.map(function (x) {
      var sin = x.cod === 'SIN';
      if (!sin) pos++;
      var v = variacion(x.mes, x.antCorte);
      var w = Math.round(Math.abs(x[clave]) * 100 / max);
      return '<button type="button" class="bdr-fila' + (sin ? ' bdr-sin' : '') + (String(M.lid) === String(x.cod) ? ' sel' : '') + '" data-lid="' + e(x.cod) + '" title="Ver su crecimiento por mes">' +
        '<span class="bdr-pos">' + (sin ? '—' : pos) + '</span>' +
        '<span class="bdr-nom"><b>' + e(sin ? 'Sin líder asignado' : lidTxt(x.cod)) + '</b>' +
          '<span class="bdr-barra"><i class="' + (clave === 'dif' && x.dif < 0 ? 'neg' : '') + '" style="width:' + w + '%"></i></span></span>' +
        seisMini(x.seis) +
        '<span class="bdr-n"><b>+' + n(x.mes) + '</b><span class="bdt-var ' + v.cls + '">' + e(v.txt) + '</span></span>' +
        '<span class="bdr-n bdr-o"><b>' + n(x.tri) + '</b><span>3 meses</span></span>' +
        '<span class="bdr-n bdr-o"><b>' + n(x.total) + '</b><span>total</span></span>' +
      '</button>';
    }).join('');
    var html =
      '<p class="muted small bdt-filtros">' + (ft ? e(ft) + ' · ' : '') + n(lideres.length) + ' líder(es) con registros · <b>' + n(crecen) + '</b> sumaron este mes' +
        (top && top.mes ? ' · más creció: <b>' + e(lidTxt(top.cod)) + '</b> (+' + n(top.mes) + ')' : '') + '</p>' +
      '<div class="bdr-ord"><span class="bd-chips-lbl">Ordenar:</span>' + ords.map(function (o) {
        return '<button type="button" class="bd-chip' + (M.ord === o[0] ? ' active' : '') + '" data-ord="' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div>' +
      '<p class="muted small bdr-nota">Este mes = ' + e(kLargo(R.kHoy).toLowerCase()) + ' en curso; la variación lo compara con ' + e(kLargo(R.k1).toLowerCase()) + ' hasta el día ' + R.dia + '. Toca un líder para ver su gráfica.</p>' +
      '<div class="bdr-lista">' + (filas || '<p class="muted center">Sin registros para esta selección.</p>') + '</div>' +
      (ceros ? '<button type="button" class="btn btn-ghost bdr-ceros" data-ceros>' + (M.ceros ? 'Ocultar' : 'Mostrar') + ' líderes sin registros (' + n(ceros) + ')</button>' : '');
    try { window.RED && RED.pantalla && RED.pantalla('bd.tendRank', performance.now() - t0); } catch (x) {}
    return html;
  }

  function pintarHoja(alInicio) {
    var hoja = document.getElementById('bdt-hoja'); if (!hoja || !ULT) return;
    var t0 = performance.now();
    var sel = document.getElementById('bdt-lidbox'); if (sel) sel.hidden = M.tab !== 'graf';
    document.querySelectorAll('.bdt-tabs [data-tab]').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === M.tab); b.setAttribute('aria-selected', b.dataset.tab === M.tab); });
    if (M.tab === 'rank') {
      var lst = hoja.querySelector('.bdr-lista'), top = lst ? lst.scrollTop : 0;
      hoja.innerHTML = cuerpoRank();
      if (!alInicio) { lst = hoja.querySelector('.bdr-lista'); if (lst) lst.scrollTop = top; }
    } else {
      var g0 = hoja.querySelector('.bdt-graf'), sl = g0 ? g0.scrollLeft : null;
      hoja.innerHTML = cuerpoHoja(tendLid());
      var g = hoja.querySelector('.bdt-graf');
      if (g) g.scrollLeft = (alInicio || sl == null) ? g.scrollWidth : sl;   // los meses recientes a la vista
      try { window.RED && RED.pantalla && RED.pantalla('bd.tendHoja', performance.now() - t0); } catch (x) {}
    }
  }

  function ponerLid(lid) {
    M.lid = lid || '';
    var inp = document.getElementById('bdt-lid'); if (inp) inp.value = M.lid ? lidTxt(M.lid) : '';
  }

  function abrir() {
    if (!ULT) return;
    M.lid = BD_LID || ''; M.tab = 'graf';   // abre con lo mismo que filtra la lista ('' = toda la base)
    openSheet('<div class="grip"></div><div class="bdt-head"><h2 class="h2">Crecimiento por mes</h2><button class="btn btn-ghost" data-close>Cerrar</button></div>' +
      '<div class="bdt-tabs" role="tablist"><button type="button" class="bd-chip active" data-tab="graf" role="tab">Gráfica</button><button type="button" class="bd-chip" data-tab="rank" role="tab">Clasificación de líderes</button></div>' +
      '<div class="bdt-lidbox" id="bdt-lidbox"><span class="bd-chips-lbl">Líder:</span>' + comboboxHtml('bdt-lid', 'Todos los líderes · busca por nombre o número') + '</div>' +
      '<div id="bdt-hoja"></div>', 'bdt-sheet');
    var lista = ['Todos los líderes', 'Sin líder asignado'].concat((BD_LIDERES || []).map(bdLiderLabel));
    bindCombobox('bdt-lid', lista);
    var inp = document.getElementById('bdt-lid'), ll = document.getElementById('bdt-lid-list');
    ponerLid(M.lid);
    function leer() {
      var v = bdLidDeTexto(inp.value);
      if (v === null || v === M.lid) return;
      M.lid = v; pintarHoja(true);
    }
    if (ll) ll.addEventListener('click', function () { setTimeout(function () { leer(); inp.blur(); }, 0); });
    var tt = null;
    inp.addEventListener('input', function () { clearTimeout(tt); tt = setTimeout(leer, 250); });
    inp.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== inp && bdLidDeTexto(inp.value) !== M.lid) ponerLid(M.lid); }, 200); });
    document.querySelector('.bdt-tabs').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-tab]'); if (!b || b.dataset.tab === M.tab) return;
      M.tab = b.dataset.tab; pintarHoja(true);
    });
    document.getElementById('bdt-hoja').addEventListener('click', function (ev) {
      var o = ev.target.closest('[data-ord]'); if (o) { M.ord = o.dataset.ord; pintarHoja(true); return; }
      if (ev.target.closest('[data-ceros]')) { M.ceros = !M.ceros; pintarHoja(false); return; }
      var f = ev.target.closest('[data-lid]'); if (f) { ponerLid(f.dataset.lid === 'SIN' ? 'SIN' : f.dataset.lid); M.tab = 'graf'; pintarHoja(true); }
    });
    pintarHoja(true);
  }

  /* ---------- entrada ---------- */
  window.bdTablero = function () {
    if (!document.getElementById('bd-chips') || typeof BD_ALL === 'undefined') return;
    var t0 = performance.now();
    try {
      ULT = calcular();
      pintarChips(ULT);
      pintarFranja(ULT.tend);
      if (window.bdActPintar) bdActPintar();   /* 09/11/2026 · fila de actividad (bd-actividad.js) */
      if (document.getElementById('bdt-hoja')) pintarHoja(false);   // EN VIVO con la hoja abierta
    } catch (err) { try { console.warn('bdTablero', err); } catch (x) {} }
    try { window.RED && RED.pantalla && RED.pantalla('bd.tablero', performance.now() - t0); } catch (x) {}
  };
  window.bdTableroUltimo = function () { return ULT; };   // para medir/verificar desde la consola
  window.bdTableroHoja = function () { return { lid: M.lid, tab: M.tab, ord: M.ord }; };
})();

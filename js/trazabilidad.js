/* ============================================================================
 * trazabilidad.js — PRIV · Base de datos → Detalles = TRAZABILIDAD (07/11/2026)
 * ----------------------------------------------------------------------------
 *  · Cabecera antes que datos: al tocar "Detalles" se pinta YA lo que la
 *    tarjeta sabe (nombre, documento, municipio, residencia, intención) y la
 *    línea de tiempo llega en UN viaje (priv.trazabilidad: persona + hitos).
 *  · Carga única por sesión por documento (rapCargar): reabrir es instantáneo
 *    y se revalida de fondo.
 *  · Pestañas: Trazabilidad (línea de tiempo con filtro por tipo) · Datos
 *    (lo de siempre: foto, columnas, Editar / Inactivar / Eliminar).
 *  · "Constancia de gestión": PDF de UNA hoja armado en el navegador (jsPDF
 *    local): nada viaja al servidor ni queda publicado. Se comparte por
 *    WhatsApp con el menú nativo del teléfono; en PC se descarga y se abre el
 *    chat de la persona.
 *  · Respaldo: si el CORE desplegado aún no tiene la ruta, Detalles funciona
 *    como antes (priv.persona) y avisa.
 * Depende de app.js (api, rapCargar, openSheet, closeLayer, esc, $, $$, toast,
 *   bdColor, bdFotoUrl, zoomImagen, bdEditar, bdInactivar, bdEliminar,
 *   ldiCargarPdf, ldiLogo, ldiHex, ldiPdfTx, BD_ALL, normDocJs, auth).
 * ============================================================================ */
(function () {
  'use strict';

  const TZ_TIPOS = {
    alta:        { t: 'Base de datos',  c: 'tz-c-base',  i: '<path d="M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Z"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>' },
    datos:       { t: 'Base de datos',  c: 'tz-c-base',  i: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
    lider:       { t: 'Liderazgo',      c: 'tz-c-lider', i: '<path d="m12 2 3 6.5 7 .8-5.2 4.7 1.5 7L12 17.4 5.7 21l1.5-7L2 9.3l7-.8Z"/>' },
    servicio:    { t: 'Servicios',      c: 'tz-c-serv',  i: '<path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3Z"/><path d="m9 12-4-4V5l3 3h3"/>' },
    compromiso:  { t: 'Compromisos',    c: 'tz-c-comp',  i: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
    tarea:       { t: 'A su cargo',     c: 'tz-c-tarea', i: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/>' },
    evento:      { t: 'Eventos',        c: 'tz-c-ev',    i: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>' },
    idea:        { t: 'Ideas',          c: 'tz-c-idea',  i: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z"/>' },
    formulario:  { t: 'Formularios',    c: 'tz-c-form',  i: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>' },
    voto:        { t: 'Votación',       c: 'tz-c-voto',  i: '<path d="m9 12 2 2 4-4"/><path d="M5 7h14l-1 13H6Z"/><path d="M8 7V4h8v3"/>' },
    comercio:    { t: 'Comercios',      c: 'tz-c-com',   i: '<path d="M3 9 5 4h14l2 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>' },
    resena:      { t: 'Reseñas',        c: 'tz-c-res',   i: '<path d="m12 2 3 6.5 7 .8-5.2 4.7 1.5 7L12 17.4 5.7 21l1.5-7L2 9.3l7-.8Z"/>' },
    seguimiento: { t: 'Seguimiento',    c: 'tz-c-seg',   i: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>' }
  };
  const tzIco = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${(TZ_TIPOS[k] || TZ_TIPOS.alta).i}</svg>`;
  const TZ_MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const TZ_MESESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function tzFecha(f) {
    const m = String(f || '').match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/);
    if (!m) return '';
    let t = `${+m[3]} ${TZ_MESES[+m[2] - 1]} ${m[1]}`;
    if (m[4] && !(m[4] === '00' && m[5] === '00')) { const hh = +m[4]; t += ` · ${((hh + 11) % 12) + 1}:${m[5]} ${hh < 12 ? 'a. m.' : 'p. m.'}`; }
    return t;
  }
  function tzEstCls(e) {
    e = String(e || '');
    if (/CUMPLID|ATENDID|RESUELT|CERRAD|FINALIZ|ENTREGAD|ASISTI|VOT|VALIDAD/.test(e)) return 'tz-e-ok';
    if (/DESCART|RECHAZ|CANCEL|ANULAD/.test(e)) return 'tz-e-no';
    if (/ESPERA|PENDIENT|ASIGNAD|PROCESO|CURSO/.test(e)) return 'tz-e-pend';
    return '';
  }

  let TZ = null;   // { doc, data, filtro }
  /* Medición de pantalla (regla 15): window.TZ_TIEMPOS() en la consola */
  const TZ_MED = [];
  function tzMedir(n, t0) { TZ_MED.push({ n, ms: Math.round(performance.now() - t0), t: Date.now() }); if (TZ_MED.length > 60) TZ_MED.shift(); }
  window.TZ_TIEMPOS = () => TZ_MED.slice();

  async function tzDetalles(doc) {
    const card = (typeof BD_ALL !== 'undefined' ? BD_ALL : []).find(x => normDocJs(x.documento) === normDocJs(doc)) || { documento: doc };
    TZ = { doc: String(doc), card, data: null, filtro: 'todos', tab: 'traza' };
    const yo = TZ;
    openSheet(`<div class="grip"></div>
      <div class="det-head tz-head">
        <div class="tz-quien">${avatarHtml(card.nombre || '', card.foto)}
          <div><h2 class="h2">${card.esLider ? '★ ' : ''}${esc(card.nombre || 'Detalles')}</h2>
          <span class="muted small">CC ${esc(doc)}${card.residencia ? ' · ' + esc(card.residencia) : ''}${card.intencion ? ' · ' + esc(card.intencion) : ''}</span></div></div>
        <span class="bd-mun ${bdColor(card.municipio)}">${esc(card.municipio || '—')}</span>
      </div>
      <div class="tz-tabs" role="tablist">
        <button class="tz-tab on" data-tab="traza" role="tab">Trazabilidad</button>
        <button class="tz-tab" data-tab="datos" role="tab">Datos</button>
        <button class="btn btn-primary tz-const" id="tz-const" disabled>${I.download} Constancia de gestión</button>
      </div>
      <div id="tz-body"><div class="tz-kpis">${Array(4).fill('<div class="tz-skel"></div>').join('')}</div>
        <div class="tz-line">${Array(4).fill('<div class="tz-item tz-skel-i"><i></i><div><b></b><span></span></div></div>').join('')}</div></div>`, 'sheet-xl tz-sheet');
    $$('.tz-tab').forEach(b => b.onclick = () => { if (!TZ.data) return; TZ.tab = b.dataset.tab; $$('.tz-tab').forEach(x => x.classList.toggle('on', x === b)); tzPintar(); });
    $('#tz-const').onclick = () => tzConstancia();
    const t0 = performance.now();
    try {
      await rapCargar('priv.trazabilidad', Object.assign({ documento: String(doc) }, auth()), (r) => {
        if (TZ !== yo || !$('#tz-body')) return;
        if (!r || r.ok === false) { if (!yo.data) $('#tz-body').innerHTML = `<p class="muted center">${esc((r && r.msg) || 'No se pudo cargar.')}</p>`; return; }
        yo.data = r; tzPintar();
        tzMedir('trazabilidad', t0);
      }, 'priv.trazabilidad:' + normDocJs(doc));
    } catch (e) {
      if (TZ !== yo) return;
      if (/no reconocida/i.test(String(e && e.message))) return tzRespaldo(doc, yo);   // CORE viejo desplegado
      if (!yo.data && $('#tz-body')) $('#tz-body').innerHTML = `<p class="muted center">Error de conexión.</p>`;
    }
  }
  window.tzDetalles = tzDetalles;

  /* CORE sin la ruta nueva: Detalles como antes (solo Datos) */
  async function tzRespaldo(doc, yo) {
    try {
      const r = await api('priv.persona', { documento: doc, ...auth() });
      if (TZ !== yo) return;
      if (!r.ok) return $('#tz-body').innerHTML = `<p class="muted center">${esc(r.msg || 'No se pudo cargar')}</p>`;
      yo.data = { ok: true, persona: r.persona, esLider: r.esLider, items: [], resumen: {}, viejo: true };
      yo.tab = 'datos'; $$('.tz-tab').forEach(x => x.classList.toggle('on', x.dataset.tab === 'datos'));
      tzPintar();
    } catch (e) { if ($('#tz-body')) $('#tz-body').innerHTML = `<p class="muted center">Error de conexión.</p>`; }
  }

  function tzPintar() {
    const body = $('#tz-body'); if (!body || !TZ || !TZ.data) return;
    const d = TZ.data, p = d.persona || {};
    const cb = $('#tz-const'); if (cb) cb.disabled = !!d.viejo;
    if (TZ.tab === 'datos') return tzDatos(body, p, d);
    const items = d.items || [];
    const R = d.resumen || {};
    const kpis = [
      ['Servicios', R.servicios || 0, R.serviciosAtendidos ? `${R.serviciosAtendidos} atendido(s)` : ''],
      ['Compromisos', R.compromisos || 0, R.compromisosCumplidos ? `${R.compromisosCumplidos} cumplido(s)` : ''],
      ['Eventos', R.eventos || 0, ''],
      ['Formularios', R.formularios || 0, ''],
      ['Ideas', R.ideas || 0, ''],
      ['Comercios', R.comercios || 0, ''],
      ['A su cargo', R.tareas || 0, '']
    ].filter((k, i) => k[1] || i < 4);
    const tipos = [...new Set(items.map(x => x.k))];
    const lista = items.filter(x => TZ.filtro === 'todos' || x.k === TZ.filtro);
    body.innerHTML = `
      <div class="tz-kpis">${kpis.map(k => `<div><b>${Number(k[1]).toLocaleString('es-CO')}</b><span>${k[0]}</span>${k[2] ? `<i>${esc(k[2])}</i>` : ''}</div>`).join('')}
        ${R.voto ? '<div class="tz-k-voto"><b>✓</b><span>Votó</span></div>' : ''}</div>
      ${d.viejo ? '<p class="muted small">El servidor desplegado aún no tiene Trazabilidad.</p>' : ''}
      ${tipos.length > 1 ? `<div class="bd-chips tz-chips">${['todos'].concat(tipos).map(k => `<button class="bd-chip ${TZ.filtro === k ? 'active' : ''}" data-k="${k}">${k === 'todos' ? 'Todo' : esc((TZ_TIPOS[k] || {}).t || k)} <i>${k === 'todos' ? items.length : items.filter(x => x.k === k).length}</i></button>`).join('')}</div>` : ''}
      ${lista.length ? `<ol class="tz-line">${lista.map(tzItem).join('')}</ol>` : `<p class="muted center" style="margin:18px 0;">${items.length ? 'Nada de este tipo.' : 'Todavía no hay gestiones registradas para esta persona.'}</p>`}
      ${d.total > items.length ? `<p class="muted small center">Se muestran los ${items.length} hitos más recientes de ${d.total}.</p>` : ''}`;
    $$('.tz-chips .bd-chip', body).forEach(b => b.onclick = () => { TZ.filtro = b.dataset.k; tzPintar(); });
  }
  function tzItem(x) {
    const tp = TZ_TIPOS[x.k] || TZ_TIPOS.alta;
    return `<li class="tz-item ${tp.c}">
      <i class="tz-ico">${tzIco(x.k)}</i>
      <div class="tz-c">
        <div class="tz-r1"><b>${esc(x.tit)}</b>${x.est ? `<span class="tz-est ${tzEstCls(x.est)}">${esc(x.est.charAt(0) + x.est.slice(1).toLowerCase())}</span>` : ''}</div>
        ${x.det ? `<p>${esc(x.det)}</p>` : ''}
        <span class="tz-f">${esc(tzFecha(x.f) || (x.k === 'lider' ? 'Vigente' : ''))} · ${esc(tp.t)}</span>
      </div></li>`;
  }

  /* Pestaña Datos = el Detalles de siempre */
  function tzDatos(body, p, d) {
    const orden = ['NOMBRE', 'DOCUMENTO', 'CONTACTO', 'RESIDENCIA', 'REFERENCIA', 'LIDER', 'DEPARTAMENTO', 'MUNICIPIO', 'PUESTO', 'DIRECCION', 'MESA', 'ESTADO', 'INTENCION', 'ASISTENCIA', 'FECHA_REGISTRO', 'FECHA_ACTUALIZACION', 'ID_USUARIO'];
    const ocultas = ['FOTO', 'QR_FILE'];
    const keys = orden.filter(k => (k in p) && ocultas.indexOf(k) === -1).concat(Object.keys(p).filter(k => orden.indexOf(k) === -1 && ocultas.indexOf(k) === -1));
    const fotoUrl = bdFotoUrl(p['FOTO']);
    const doc = TZ.doc;
    body.innerHTML = `${fotoUrl ? `<div class="det-foto"><img src="${esc(fotoUrl)}" alt="Foto" class="zoomable" onerror="this.closest('.det-foto').remove()" /></div>` : ''}
      <div class="det-list">${keys.map(k => `<div class="det-row"><span>${esc(k.replace(/_/g, ' '))}</span><b>${esc(p[k] || '—')}</b></div>`).join('')}</div>
      <div class="stack" style="margin-top:16px;">
        <button class="btn btn-primary btn-block" id="det-edit">Editar</button>
        <button class="btn btn-quiet btn-block bd-btn-danger" id="det-inact" ${String(p['ESTADO']).toUpperCase() === 'INACTIVO' ? 'disabled' : ''}>Inactivar</button>
        <button class="btn btn-quiet btn-block bd-btn-danger" id="det-elim">Eliminar</button>
      </div>`;
    const fz = body.querySelector('.det-foto img'); if (fz) fz.onclick = () => zoomImagen(fotoUrl);
    const fila = () => BD_ALL.find(x => normDocJs(x.documento) === normDocJs(doc));
    $('#det-edit').onclick = () => { closeLayer(); bdEditar(doc); };
    $('#det-inact').onclick = () => { closeLayer(); bdInactivar(doc, fila()); };
    $('#det-elim').onclick = () => { closeLayer(); bdEliminar(doc, fila()); };
    if (window.permBarrer) try { permBarrer(document); } catch (e) {}
  }

  /* ===================================================== CONSTANCIA (PDF)
     Una hoja A4: lo que se le ha brindado (servicios, compromisos, eventos,
     inscripciones, beneficios), con su estado. Se arma en el navegador. */
  const TZ_BRINDADO = ['servicio', 'compromiso', 'evento', 'formulario', 'comercio'];
  async function tzConstancia() {
    if (!TZ || !TZ.data || TZ.data.viejo) return;
    const b = $('#tz-const'); if (b.dataset.ocupado) return;
    b.dataset.ocupado = '1'; saving(b, true);
    const t0 = performance.now(), yo = TZ;
    try {
      const blob = await tzPdf(yo.data, yo.doc);
      tzMedir('constancia', t0);
      const p = yo.data.persona || {};
      const nombreArch = `Constancia_${String(p['NOMBRE'] || yo.doc).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').slice(0, 40)}.pdf`;
      tzCompartir(blob, nombreArch, p);
    } catch (e) { toast('No se pudo generar la constancia', 'err'); }
    finally { if (b.isConnected) { saving(b, false); delete b.dataset.ocupado; } }
  }
  function tzCompartir(blob, nombre, p) {
    const tel = String(p['CONTACTO'] || '').replace(/\D/g, '');
    const wa = tel ? (tel.length === 10 ? '57' + tel : tel) : '';
    const primer = String(p['NOMBRE'] || '').split(' ')[0];
    const texto = `Hola ${primer ? primer.charAt(0) + primer.slice(1).toLowerCase() : ''}, te comparto la constancia de las gestiones que hemos realizado contigo. ${((window.MARCA || {}).EQUIPO || '')}`.trim();
    const file = new File([blob], nombre, { type: 'application/pdf' });
    const ov = h(`<div class="fmd-ov"><div class="fmd-dlg">
      <h2 class="h2">Constancia lista</h2>
      <p class="muted small" style="margin:-2px 0 12px;">${esc(nombre)} · ${(blob.size / 1024).toFixed(0)} KB · una hoja</p>
      <div class="stack">
        ${navigator.canShare && navigator.canShare({ files: [file] }) ? `<button class="btn btn-wa btn-block" id="tzc-sh">${I.wa} Enviar por WhatsApp</button>` : (wa ? `<button class="btn btn-wa btn-block" id="tzc-wa">${I.wa} Descargar y abrir su WhatsApp</button>` : '')}
        <button class="btn btn-ghost btn-block" id="tzc-dl">${I.download} Descargar PDF</button>
        <button class="btn btn-quiet btn-block" id="tzc-no">Cerrar</button>
      </div></div></div>`);
    $('.tz-sheet').appendChild(ov);
    const bajar = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); };
    $('#tzc-no').onclick = () => ov.remove();
    $('#tzc-dl').onclick = () => { bajar(); ov.remove(); };
    const sh = $('#tzc-sh'); if (sh) sh.onclick = () => navigator.share({ files: [file], text: texto }).then(() => ov.remove()).catch(() => {});
    const w = $('#tzc-wa'); if (w) w.onclick = () => { bajar(); window.open(`https://wa.me/${wa}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener'); ov.remove(); };
  }
  window.tzCompartir = tzCompartir;

  async function tzPdf(d, doc) {
    const [jsPDF, logo] = await Promise.all([ldiCargarPdf(), ldiLogo()]);
    const brindado = (d.items || []).filter(x => TZ_BRINDADO.indexOf(x.k) >= 0);
    /* Se arma con todas las filas que quepan en UNA hoja: si se pasa, se
       vuelve a armar con menos (y se dice cuántas más hay). */
    let n = Math.min(brindado.length, 24), pdf = null;
    while (true) {
      pdf = tzPdfArmar(jsPDF, logo, d, doc, brindado, n);
      if (pdf.internal.getNumberOfPages() <= 1 || n <= 1) break;
      n = Math.max(1, n - (n > 10 ? 3 : 1));
    }
    while (pdf.internal.getNumberOfPages() > 1) pdf.deletePage(pdf.internal.getNumberOfPages());
    return pdf.output('blob');
  }
  function tzPdfArmar(jsPDF, logo, d, doc, brindado, nFilas) {
    const M = window.MARCA || {}, p = d.persona || {}, R = d.resumen || {};
    const azul = ldiHex(M.COLOR), azul7 = ldiHex(M.COLOR_700 || '#0056B3');
    const tinta = [33, 37, 41], gris = [108, 117, 125], linea = [222, 226, 230], suave = [244, 247, 251], verde = [21, 128, 61], ambar = [180, 83, 9];
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), mg = 14;
    const T = s => ldiPdfTx(s);
    const hoy = new Date();
    const hoyTx = `${hoy.getDate()} de ${TZ_MESESL[hoy.getMonth()]} de ${hoy.getFullYear()}`;
    const quien = (window.getActive && (getActive() || {}).nombre) || '';
    const pie = 24;

    /* Encabezado */
    pdf.setFillColor(...azul); pdf.rect(0, 0, W, 32, 'F');
    pdf.setFillColor(...azul7); pdf.rect(0, 32, W, 1.4, 'F');
    let x0 = mg;
    if (logo) { try { pdf.setFillColor(255, 255, 255); pdf.roundedRect(mg, 6, 20, 20, 3, 3, 'F'); pdf.addImage(logo, 'PNG', mg + 1.5, 7.5, 17, 17); x0 = mg + 25; } catch (e) {} }
    pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18);
    pdf.text(T('Constancia de gestión'), x0, 15.5);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
    pdf.text(T(`${M.CANDIDATO || ''}${M.MUNICIPIO ? ' · ' + M.MUNICIPIO : ''}${M.EQUIPO ? ' · ' + M.EQUIPO : ''}`), x0, 22);
    pdf.text(T(`Expedida el ${hoyTx}`), x0, 27.5);

    /* Persona */
    let y = 42;
    pdf.setTextColor(...tinta); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14);
    pdf.text(T(p['NOMBRE'] || ''), mg, y);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(...gris);
    pdf.text(T([`CC ${doc}`, p['RESIDENCIA'], p['MUNICIPIO'] && p['MUNICIPIO'] !== 'SIN CONSULTAR' ? p['MUNICIPIO'] : ''].filter(Boolean).join(' · ')), mg, y + 5.5);
    y += 11;
    pdf.setFontSize(10); pdf.setTextColor(...tinta);
    const intro = pdf.splitTextToSize(T(`Hacemos constar que a ${String(p['NOMBRE'] || '').split(' ').slice(0, 2).join(' ')} se le ha brindado el acompañamiento que se relaciona a continuación, según los registros de nuestro equipo.`), W - mg * 2);
    pdf.text(intro, mg, y); y += intro.length * 4.6 + 3;

    /* Indicadores */
    const kpis = [[R.servicios || 0, 'Servicios', R.serviciosAtendidos ? `${R.serviciosAtendidos} atendidos` : ''], [R.compromisos || 0, 'Compromisos', R.compromisosCumplidos ? `${R.compromisosCumplidos} cumplidos` : ''],
                  [R.eventos || 0, 'Eventos', ''], [R.formularios || 0, 'Inscripciones', ''], [R.comercios || 0, 'Beneficios', '']].filter((k, i) => k[0] || i < 3);
    const kw = (W - mg * 2 - (kpis.length - 1) * 4) / kpis.length;
    kpis.forEach((k, i) => {
      const kx = mg + i * (kw + 4);
      pdf.setFillColor(...suave); pdf.setDrawColor(...linea); pdf.roundedRect(kx, y, kw, 18, 2.5, 2.5, 'FD');
      pdf.setTextColor(...azul7); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15);
      pdf.text(String(k[0]), kx + kw / 2, y + 8.5, { align: 'center' });
      pdf.setTextColor(...gris); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
      pdf.text(T(k[1] + (k[2] ? ' · ' + k[2] : '')), kx + kw / 2, y + 14, { align: 'center' });
    });
    y += 24;

    /* Lo brindado */
    const filas = brindado.slice(0, nFilas), resto = brindado.length - filas.length;
    const tipo = k => (TZ_TIPOS[k] || {}).t || k;
    if (filas.length) {
      pdf.autoTable({
        startY: y, margin: { left: mg, right: mg, bottom: pie + 8 },
        head: [['Fecha', 'Tipo', 'Gestión', 'Estado']],
        body: filas.map(x => [T(tzFecha(x.f).split(' · ')[0] || '—'), T(tipo(x.k)), T(x.tit.replace(/^(Solicitud de servicio|Compromiso): /, '') + (x.det ? '\n' + x.det.slice(0, 110) : '')), T(x.est ? x.est.charAt(0) + x.est.slice(1).toLowerCase() : '')]),
        styles: { font: 'helvetica', fontSize: 8.3, cellPadding: 1.8, textColor: tinta, lineColor: linea, lineWidth: 0.1, overflow: 'linebreak' },
        headStyles: { fillColor: azul, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 251, 253] },
        columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 26 }, 3: { cellWidth: 24, fontStyle: 'bold' } },
        didParseCell: c => { if (c.section === 'body' && c.column.index === 3) { const e = String(c.cell.raw || '').toUpperCase(); c.cell.styles.textColor = /CUMPLID|ATENDID|ASISTI|VALIDAD|RESUELT|CERRAD/.test(e) ? verde : /PENDIENT|ASIGNAD|ESPERA|PROCESO/.test(e) ? ambar : tinta; } }
      });
      y = pdf.lastAutoTable.finalY + 4;
      if (resto > 0) { pdf.setFontSize(8.5); pdf.setTextColor(...gris); pdf.text(T(`Y ${resto} gestión(es) más, registradas en el sistema.`), mg, y + 2); }
    } else {
      pdf.setFontSize(10); pdf.setTextColor(...gris); pdf.text(T('Aún no hay gestiones registradas.'), mg, y + 4);
    }

    /* Pie (en la primera hoja) */
    pdf.setPage(1);
    pdf.setDrawColor(...linea); pdf.line(mg, H - pie + 4, W - mg, H - pie + 4);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.3); pdf.setTextColor(...gris);
    const nota = pdf.splitTextToSize(T(`Documento informativo generado el ${hoyTx}${quien ? ' por ' + quien : ''}. Los datos personales se tratan conforme a la Ley 1581 de 2012 y solo se comparten con su titular.`), W - mg * 2);
    pdf.text(nota, mg, H - pie + 9);
    pdf.setTextColor(...azul7); pdf.setFont('helvetica', 'bold');
    pdf.text(T(M.CANDIDATO || ''), W - mg, H - 8, { align: 'right' });
    return pdf;
  }
  window.__tzPdf = tzPdf;   // banco de pruebas
})();

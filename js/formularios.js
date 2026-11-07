/* ============================================================================
 * formularios.js — PRIV · vista FORMULARIOS (07/11/2026 · Entrega 1)
 * ----------------------------------------------------------------------------
 * Formularios de inscripción que se llenan en la web INSCRIPCIONES-JHONNY.
 *
 *  · Una vista, un viaje: priv.formularios trae todo (carga única por sesión
 *    con rapCargar; tras guardar se parcha la tarjeta en memoria).
 *  · Inscritos EN VIVO: Firebase /meta/form_n (lo escribe el CORE en cada
 *    inscripción). Sin sondeo.
 *  · Estados: CREADO (editar · eliminar · encender) → ENCENDIDO (enviar ·
 *    apagar) → APAGADO (reusar). Encender y apagar piden confirmación.
 *  · Constructor: campos fijos (DOCUMENTO, NOMBRE, WHATSAPP, RESIDENCIA) +
 *    campos configurables con validaciones, condiciones y orden arrastrando.
 *    Vista previa con las condiciones funcionando.
 *  · Toda escritura: botón ocupado desde el primer toque y rid (red.js).
 *
 * Depende de app.js (api, rapCargar, openSheet, toast, I, esc, $, $$ …).
 * ============================================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- estado */
  let FM_ALL = [], FM_ME = '', FM_N = {}, FM_FB = null;
  const FM_URL = () => String((window.MARCA && MARCA.INSCRIPCIONES_URL) || 'https://botheart911.github.io/INSCRIPCIONES-JHONNY/').replace(/\/?$/, '/');
  const fmAuth = () => ({ caller: FM_ME });

  const TIPOS = [
    { t: 'texto', n: 'Texto', d: 'Respuesta corta o párrafo', ic: '<path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M9 19h6"/>' },
    { t: 'numero', n: 'Número', d: 'Edad, cantidad, peso…', ic: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>' },
    { t: 'unica', n: 'Selección única', d: 'Una sola opción', ic: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/>' },
    { t: 'multiple', n: 'Selección múltiple', d: 'Varias opciones', ic: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>' },
    { t: 'fecha', n: 'Fecha', d: 'Con rueda', ic: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
    { t: 'imagen', n: 'Imagen', d: 'Foto desde el teléfono', ic: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>' },
    { t: 'archivo', n: 'Archivo', d: 'Cualquier tipo · máx. 2 MB', ic: '<path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>' }
  ];
  const TIPO = Object.fromEntries(TIPOS.map(x => [x.t, x]));
  const svgT = t => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${(TIPO[t] || TIPOS[0]).ic}</svg>`;
  const ICO_FORM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><path d="M9 10h6M9 14h6M9 18h3"/></svg>';
  const ICO_DRAG = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
  const ICO_POWER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><path d="M12 2v10"/></svg>';
  const ICO_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  window.ICO_FORM = ICO_FORM;

  /* Rótulos de los campos fijos (cambian con "Registro de menores") */
  function fmFijos(menores) {
    const s = menores ? ' DEL ADULTO RESPONSABLE DEL(LA) MENOR' : '';
    return [
      { k: 'documento', t: 'DOCUMENTO' + s, d: 'Número, 5 a 10 dígitos' },
      { k: 'nombre', t: 'NOMBRE' + s, d: 'Nombre completo' },
      { k: 'whatsapp', t: 'WHATSAPP' + s, d: 'Celular de 10 dígitos' },
      { k: 'residencia', t: 'RESIDENCIA', d: 'Barrio, vereda o conjunto' }
    ];
  }
  window.fmFijos = fmFijos;

  /* =========================================================== LA VISTA */
  async function viewFormularios(user) {
    FM_ME = user.documento; appWide(true, true);
    app.innerHTML = `${backbar('Formularios')}
      <div class="pad">
        <div class="bd-toolbar">
          <div class="bd-search"><input class="input" id="fm-q" placeholder="Buscar formulario…" autocomplete="off" /></div>
          <button class="btn btn-primary bd-add" id="fm-add">+ Crear formulario</button>
        </div>
        <div class="bd-chips" id="fm-chips">
          ${['Todos', 'Creados', 'Encendidos', 'Apagados'].map((t, i) => `<button class="bd-chip ${i === 0 ? 'active' : ''}" data-f="${t}">${t}</button>`).join('')}
        </div>
        <div class="bd-count" id="fm-count"></div>
        <div id="fm-body">${fmEsqueleto()}</div>
      </div>`;
    app.hidden = false; hideSplash();
    $('#backbtn').onclick = () => go('home');
    $('#fm-add').onclick = () => fmEditor(null);
    let t; $('#fm-q').oninput = () => { clearTimeout(t); t = setTimeout(fmPintar, 140); };
    $$('#fm-chips .bd-chip').forEach(ch => ch.onclick = () => {
      $$('#fm-chips .bd-chip').forEach(x => x.classList.toggle('active', x === ch)); fmPintar();
    });
    fmVivoN();
    let primera = true;
    try {
      await rapCargar('priv.formularios', fmAuth(), (r) => {
        if (!$('#fm-body')) return;
        if (!r || r.ok === false) { if (primera) $('#fm-body').innerHTML = `<p class="muted center">${esc((r && r.msg) || 'No se pudo cargar.')}</p>`; return; }
        primera = false;
        FM_ALL = r.items || [];
        fmPintar();
      });
    } catch (e) { if ($('#fm-body') && primera) $('#fm-body').innerHTML = `<p class="muted center">${/no reconocida/i.test(String(e && e.message)) ? 'El servidor todavía no tiene Formularios: falta desplegar la versión nueva del CORE.' : 'Error de conexión.'}</p>`; return; }
    vivoBind('formularios', FM_ME, fmVivo);
  }
  window.viewFormularios = viewFormularios;

  function fmEsqueleto() {
    return `<div class="fm-grid">${Array(3).fill('<div class="fm-card fm-skel"><div class="fm-img"></div><div class="fm-in"><i></i><i></i><i></i></div></div>').join('')}</div>`;
  }

  async function fmVivo() {
    const r = await api('priv.formularios', Object.assign(fmAuth(), RAP.params()), 'GET', null, SILENCIO);
    if (!r || r.ok === false) return;
    RAP.guardar('priv.formularios', r, r.__rapCrudo || r);
    if (!vivoCambio(JSON.stringify(r.items))) return;
    FM_ALL = r.items || []; fmPintar();
  }

  /* Inscritos EN VIVO (Firebase /meta/form_n). Sin sondeo. */
  function fmVivoN() {
    try {
      loadFirebase().then(fb => {
        if (!$('#fm-body')) return;
        (fb.apps && fb.apps.length) ? fb.app() : fb.initializeApp(VOTO_FBCFG);
        const ref = fb.database().ref('meta/form_n');
        const on = s => { FM_N = s.val() || {}; fmPintarConteos(); };
        ref.on('value', on, () => {});
        FM_FB = () => { try { ref.off('value', on); } catch (e) {} };
        const previo = window.__votoTeardown;
        window.__votoTeardown = () => { if (FM_FB) FM_FB(); FM_FB = null; if (previo) try { previo(); } catch (e) {} };
      }).catch(() => {});
    } catch (e) {}
  }
  function fmN(it) { return (it.id in FM_N) ? Math.max(Number(FM_N[it.id]) || 0, 0) : (it.n || 0); }
  function fmPintarConteos() {
    $$('#fm-body .fm-card[data-id]').forEach(c => {
      const it = fmFind(c.dataset.id); if (!it) return;
      const el = c.querySelector('.fm-n b'); if (!el) return;
      const n = fmN(it).toLocaleString('es-CO');
      if (el.textContent !== n) { el.textContent = n; el.parentElement.classList.remove('fm-pulso'); void el.offsetWidth; el.parentElement.classList.add('fm-pulso'); }
    });
  }

  function fmFind(id) { return FM_ALL.find(x => x.id === id); }

  function fmPintar() {
    const body = $('#fm-body'); if (!body) return;
    const q = (($('#fm-q') || {}).value || '').trim().toLowerCase();
    const f = (($('#fm-chips .bd-chip.active') || {}).dataset || {}).f || 'Todos';
    const est = { Creados: 'CREADO', Encendidos: 'ENCENDIDO', Apagados: 'APAGADO' }[f];
    const lista = FM_ALL.filter(x => (!est || x.estado === est) && (!q || (x.nombre || '').toLowerCase().includes(q)))
      .sort((a, b) => (a.creado < b.creado ? 1 : a.creado > b.creado ? -1 : 0));
    const cnt = $('#fm-count');
    if (cnt) cnt.textContent = `${lista.length.toLocaleString('es-CO')} formulario(s) · del más reciente al más antiguo`;
    if (!lista.length) {
      body.innerHTML = FM_ALL.length ? `<p class="muted center" style="margin-top:20px;">Sin formularios para este filtro.</p>`
        : `<div class="fm-vacio">${ICO_FORM}<b>Aún no hay formularios</b><span>Crea el primero: una jornada, un curso, una inscripción…</span><button class="btn btn-primary" id="fm-add2">+ Crear formulario</button></div>`;
      const b2 = $('#fm-add2'); if (b2) b2.onclick = () => fmEditor(null);
      return;
    }
    body.innerHTML = `<div class="fm-grid">${lista.map(fmCardHtml).join('')}</div>`;
    body.querySelectorAll('.fm-card [data-a]').forEach(b => b.onclick = () => fmAccion(b.dataset.a, b.closest('.fm-card').dataset.id, b));
    body.querySelectorAll('.fm-card .fm-img img').forEach(im => im.onclick = () => zoomImagen(im.src));
  }

  function fmEstadoHtml(it) {
    if (it.estado === 'ENCENDIDO' && it.cerrado) return '<span class="fm-est fm-est-cer">Cerrado por fecha</span>';
    return `<span class="fm-est fm-est-${it.estado.toLowerCase()}">${esc(it.estado)}</span>`;
  }
  function fmFechaCorta(s) {
    const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/);
    if (!m) return '';
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    let t = `${+m[3]} ${meses[+m[2] - 1]} ${m[1]}`;
    if (m[4]) { const hh = +m[4]; t += ` · ${((hh + 11) % 12) + 1}:${m[5]} ${hh < 12 ? 'a. m.' : 'p. m.'}`; }
    return t;
  }

  function fmCardHtml(it) {
    const n = fmN(it);
    const cupo = it.cupo ? ` / ${Number(it.cupo).toLocaleString('es-CO')}` : '';
    const meta = [
      `${(it.campos || []).length + 4} campos`,
      it.menores ? 'Registro de menores' : '',
      it.cupo ? `Cupo ${Number(it.cupo).toLocaleString('es-CO')}` : 'Sin cupo',
      it.cierre ? `Cierra ${fmFechaCorta(it.cierre)}` : '',
      it.varios ? 'Varios por documento' : ''
    ].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('');
    const btn = (a, t, cls) => `<button class="bd-btn ${cls || ''}" data-a="${a}">${t}</button>`;
    let acts = '';
    if (it.estado === 'CREADO') acts = btn('editar', 'Editar') + btn('previa', 'Vista previa') + btn('encender', `${ICO_POWER} Encender`, 'fm-btn-on') + btn('eliminar', 'Eliminar', 'bd-btn-danger');
    else if (it.estado === 'ENCENDIDO') acts = btn('enviar', `${I.wa} Enviar`, 'fm-btn-wa') + btn('previa', 'Vista previa') + btn('apagar', `${ICO_POWER} Apagar`, 'fm-btn-off');
    else acts = btn('previa', 'Vista previa') + btn('reusar', `${I.repeat} Reusar`);
    return `<article class="fm-card fm-${it.estado.toLowerCase()}" data-id="${esc(it.id)}">
      <div class="fm-img">${it.imagen ? `<img src="${esc(it.imagen)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ICO_FORM}${fmEstadoHtml(it)}</div>
      <div class="fm-in">
        <b class="fm-nom">${esc(it.nombre)}</b>
        <div class="fm-n ${it.estado === 'CREADO' ? 'fm-n-off' : ''}"><b>${n.toLocaleString('es-CO')}</b><span>inscrito(s)${cupo}${it.espera ? ` · ${it.espera} en espera` : ''}</span>${it.estado === 'ENCENDIDO' && !it.cerrado ? '<i class="fm-vivo">EN VIVO</i>' : ''}</div>
        <div class="fm-meta">${meta}</div>
        <p class="fm-sub">${it.estado === 'CREADO' ? 'Creado' : it.estado === 'ENCENDIDO' ? 'Encendido' : 'Apagado'} ${esc(fmFechaCorta(it.estado === 'CREADO' ? it.creado : it.estado === 'ENCENDIDO' ? it.encendido : it.apagado))}${it.autor ? ` · por ${esc(it.autor)}` : ''}</p>
        <div class="bd-acts fm-acts">${acts}</div>
      </div>
    </article>`;
  }

  function fmUpsert(it) {
    const i = FM_ALL.findIndex(x => x.id === it.id);
    if (i >= 0) { it.n = FM_ALL[i].n; it.espera = FM_ALL[i].espera; FM_ALL[i] = it; } else FM_ALL.unshift(it);
    rapSync('priv.formularios', FM_ALL);
    fmPintar();
  }

  function fmAccion(a, id, btn) {
    const it = fmFind(id); if (!it) return;
    if (a === 'editar') return fmEditor(it);
    if (a === 'previa') return fmPrevia(it);
    if (a === 'encender') return fmEncender(it, btn);
    if (a === 'apagar') return fmApagar(it, btn);
    if (a === 'eliminar') return fmEliminar(it, btn);
    if (a === 'reusar') return fmReusar(it);
    if (a === 'enviar') return fmEnviar(it);
  }

  /* Escritura común: botón ocupado desde el primer toque, un solo envío */
  async function fmEscribir(btn, accion, cuerpo) {
    if (btn && btn.dataset.ocupado) return null;
    if (btn) { btn.dataset.ocupado = '1'; saving(btn, true); }
    try {
      const r = await api(accion, {}, 'POST', Object.assign(cuerpo, fmAuth()));
      if (!r || r.ok === false) { toast((r && r.msg) || 'No se pudo guardar', 'err'); return null; }
      return r;
    } catch (e) { toast(String(e && e.message || 'Error de conexión'), 'err'); return null; }
    finally { if (btn && btn.isConnected) { saving(btn, false); delete btn.dataset.ocupado; } }
  }

  async function fmEncender(it, btn) {
    const ok = await confirmar('¿Encender este formulario?', crow('Formulario', it.nombre) + crow('Campos', String((it.campos || []).length + 4)) +
      `<p class="muted small" style="margin-top:8px;">Queda visible en la web para inscribirse. <b>Desde ese momento ya no se puede editar</b>: si hace falta cambiar algo, se apaga y se reusa.</p>`);
    if (!ok) return;
    const b = $(`.fm-card[data-id="${CSS.escape(it.id)}"] [data-a="encender"]`) || btn;
    const r = await fmEscribir(b, 'priv.formEncender', { id: it.id });
    if (!r) return;
    fmUpsert(r.item);
    toast(r.fb === false ? 'Encendido. La web lo verá en unos segundos.' : 'Formulario encendido', 'ok');
  }

  async function fmApagar(it, btn) {
    const ok = await confirmar('¿Apagar este formulario?', crow('Formulario', it.nombre) + crow('Inscritos', fmN(it).toLocaleString('es-CO')) +
      `<p class="muted small" style="margin-top:8px;">Deja de recibir inscripciones. <b>No se puede volver a encender</b>; luego podrás reusarlo con otro nombre.</p>`);
    if (!ok) return;
    const b = $(`.fm-card[data-id="${CSS.escape(it.id)}"] [data-a="apagar"]`) || btn;
    const r = await fmEscribir(b, 'priv.formApagar', { id: it.id });
    if (!r) return;
    fmUpsert(r.item); toast('Formulario apagado', 'ok');
  }

  async function fmEliminar(it, btn) {
    const ok = await confirmar('¿Eliminar este formulario?', crow('Formulario', it.nombre) + `<p class="muted small" style="margin-top:8px;">Está en estado CREADO (nadie se ha inscrito). Esta acción no se puede deshacer.</p>`);
    if (!ok) return;
    const b = $(`.fm-card[data-id="${CSS.escape(it.id)}"] [data-a="eliminar"]`) || btn;
    const r = await fmEscribir(b, 'priv.formEliminar', { id: it.id });
    if (!r) return;
    FM_ALL = FM_ALL.filter(x => x.id !== it.id);
    rapSync('priv.formularios', FM_ALL); fmPintar(); toast('Formulario eliminado', 'ok');
  }

  function fmReusar(it) {
    openSheet(`<div class="grip"></div><h2 class="h2">Reusar formulario</h2>
      <p class="muted small" style="margin:4px 0 12px;">Se copian los campos y la imagen de <b>${esc(it.nombre)}</b> en un formulario nuevo, en estado CREADO, para que lo ajustes y lo enciendas.</p>
      <div class="stack">
        ${field('Nombre del formulario nuevo', `<input class="input" id="fm-rn" maxlength="120" value="${esc(it.nombre)}" />`)}
        <p class="fm-err" id="fm-rn-err"></p>
        <button class="btn btn-primary btn-block" id="fm-rgo">Crear copia</button>
      </div>`);
    const inp = $('#fm-rn'); inp.focus(); inp.select();
    $('#fm-rgo').onclick = async () => {
      const nombre = inp.value.replace(/\s+/g, ' ').trim();
      const err = fmNombreError(nombre, '');
      $('#fm-rn-err').textContent = err;
      if (err) return;
      const r = await fmEscribir($('#fm-rgo'), 'priv.formReusar', { id: it.id, nombre });
      if (!r) return;
      closeLayer(); fmUpsert(r.item); toast('Copia creada. Revísala y enciéndela.', 'ok');
      fmEditor(r.item);
    };
  }

  function fmClave(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim(); }
  function fmNombreError(nombre, id) {
    if (!nombre) return 'Escribe el nombre del formulario';
    if (nombre.length > 120) return 'El nombre pasa de 120 caracteres';
    const k = fmClave(nombre);
    if (FM_ALL.some(x => x.id !== id && fmClave(x.nombre) === k)) return 'Ya existe un formulario con ese nombre';
    return '';
  }

  function fmEnviar(it) {
    const url = FM_URL() + '#' + it.slug;
    const txt = `📋 *${it.nombre}*\n\nInscríbete aquí 👉 ${url}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
  }

  /* ======================================================= EL CONSTRUCTOR */
  let ED = null;

  function fmEditor(it) {
    const c = it || {};
    const cierre = String(c.cierre || '').match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/);
    ED = {
      id: c.id || '', nombre: c.nombre || '', imagen: c.imagen || '', imgNueva: '', imgQuitar: false, imgId: '', imgSubida: null,
      campos: JSON.parse(JSON.stringify(c.campos || [])), menores: !!c.menores,
      cupo: c.cupo || '', cierreF: cierre ? cierre[1] : '', cierreH: cierre ? cierre[2] : '', varios: !!c.varios,
      abierto: null, sec: 0
    };
    ED.campos.forEach(x => { if (!x.id) x.id = fmNuevoId(); });
    openSheet(`<div class="grip"></div>
      <div class="fm-ed-head"><h2 class="h2">${c.id ? 'Editar formulario' : 'Crear formulario'}</h2>
        <button class="btn btn-quiet fm-ed-prev" id="fm-ed-prev">${ICO_EYE} Vista previa</button></div>
      <div class="fm-ed" id="fm-ed"></div>
      <div class="fm-ed-foot"><p class="fm-err" id="fm-ed-err"></p>
        <button class="btn btn-primary btn-block" id="fm-ed-save">${c.id ? 'Guardar cambios' : 'Crear formulario'}</button></div>`, 'sheet-xl fm-sheet');
    $('#fm-ed-prev').onclick = () => fmPrevia(fmLeerED(), true);
    $('#fm-ed-save').onclick = fmGuardar;
    fmEdPintar();
    document.addEventListener('paste', fmPegar);
  }

  function fmNuevoId() {
    let i = 1; const usados = new Set((ED ? ED.campos : []).map(x => x.id));
    while (usados.has('c' + i)) i++;
    return 'c' + i;
  }

  function fmEdPintar() {
    const box = $('#fm-ed'); if (!box) { document.removeEventListener('paste', fmPegar); return; }
    const img = ED.imgNueva || (ED.imgQuitar ? '' : ED.imagen);
    box.innerHTML = `
      <section class="fm-sec">
        <h3 class="fm-h3">1 · Identificación</h3>
        ${field('Nombre del formulario *', `<input class="input" id="fm-nom" maxlength="120" placeholder="Ej.: Jornada de esterilización canina" value="${esc(ED.nombre)}" />`)}
        <div class="field"><span>Imagen del formulario</span>
          <div class="fm-drop ${img ? 'tiene' : ''} ${ED.subiendo ? 'subiendo' : ''}" id="fm-drop" tabindex="0">
            ${img ? `<img src="${esc(img)}" alt="" /><div class="fm-drop-acts"><button type="button" class="btn btn-quiet" id="fm-img-camb">Cambiar</button><button type="button" class="btn btn-quiet" id="fm-img-quit">Quitar</button></div>`
              : `<div class="fm-drop-tx">${I.upload}<b>Adjunta, arrastra o pega (Ctrl+V) la imagen</b><span>JPG, PNG o WEBP · se optimiza sola</span></div>`}
          </div>
          <input type="file" id="fm-img-in" accept="image/jpeg,image/png,image/webp" hidden />
        </div>
      </section>

      <section class="fm-sec">
        <h3 class="fm-h3">2 · Campos fijos</h3>
        <div class="fm-fijos">${fmFijos(ED.menores).map(f => `<div class="fm-fijo"><b>${esc(f.t)}</b><span>${esc(f.d)} · obligatorio</span></div>`).join('')}</div>
        <label class="fm-check"><input type="checkbox" id="fm-men" ${ED.menores ? 'checked' : ''}/> <span><b>Registro de menores</b><small>Los datos de arriba pasan a ser los del adulto responsable.</small></span></label>
        ${ED.menores ? `<div class="fm-aviso">${I.bell}<div><b>Configura los campos del menor</b><span>Agrega abajo los datos del niño o la niña (nombre, documento, fecha de nacimiento…).</span>
          ${fmTieneCamposMenor() ? '' : '<button type="button" class="btn btn-quiet" id="fm-men-add">Agregar campos del menor</button>'}</div></div>` : ''}
      </section>

      <section class="fm-sec">
        <h3 class="fm-h3">3 · Preguntas del formulario <small>${ED.campos.length} de 40</small></h3>
        <div class="fm-campos" id="fm-campos">${ED.campos.map((x, i) => fmCampoHtml(x, i)).join('') || '<p class="muted small fm-sin">Aún no hay preguntas propias. Agrega las que necesites.</p>'}</div>
        <button type="button" class="btn btn-ghost btn-block fm-addc" id="fm-addc" ${ED.campos.length >= 40 ? 'disabled' : ''}>${I.plus} Agregar pregunta</button>
      </section>

      <section class="fm-sec">
        <h3 class="fm-h3">4 · Configuración</h3>
        <div class="fm-conf">
          ${field('Cupo máximo', `<input class="input" id="fm-cupo" inputmode="numeric" placeholder="Sin límite" value="${esc(ED.cupo)}" />`)}
          <div class="field"><span>Cierre automático</span>
            <div class="fm-cierre">
              <button type="button" class="input datebtn" id="fm-cf-btn"><span class="datebtn-tx">Sin cierre</span><span class="datebtn-ic">📅</span></button>
              <input class="input" type="time" id="fm-ch" value="${esc(ED.cierreH)}" ${ED.cierreF ? '' : 'disabled'} />
              ${ED.cierreF ? '<button type="button" class="icon-btn fm-x" id="fm-cf-x" aria-label="Quitar cierre">' + I.x + '</button>' : ''}
            </div>
          </div>
        </div>
        <p class="muted small">Con cupo, quien llegue después de llenarse queda en <b>lista de espera</b>.</p>
        <label class="fm-check"><input type="checkbox" id="fm-var" ${ED.varios ? 'checked' : ''}/> <span><b>Permitir varios registros por documento</b><small>Apagado: un documento se inscribe una sola vez en este formulario.</small></span></label>
        <div class="fm-ley">${I.lock}<span>Al final de cada formulario va siempre la casilla obligatoria de <b>autorización de tratamiento de datos (Ley 1581 de 2012)</b>.</span></div>
      </section>`;
    fmEdEnganchar();
  }

  function fmTieneCamposMenor() { return ED.campos.some(x => /menor/i.test(x.etiqueta || '')); }

  function fmCampoHtml(x, i) {
    const t = TIPO[x.tipo] || TIPOS[0];
    const err = fmCampoError(x, i);
    const abierto = ED.abierto === x.id;
    const madre = x.cond ? ED.campos.find(y => y.id === x.cond.campo) : null;
    const resumen = [
      x.req ? '<i class="fm-tag fm-tag-req">Obligatoria</i>' : '',
      x.cond && madre ? `<i class="fm-tag fm-tag-cond">Si «${esc((madre.etiqueta || '').slice(0, 26))}» = ${esc((x.cond.valores || []).join(' / '))}</i>` : '',
      err ? `<i class="fm-tag fm-tag-err">${esc(err)}</i>` : ''
    ].join('');
    return `<div class="fm-campo ${abierto ? 'abierto' : ''} ${err ? 'con-error' : ''} ${x.cond ? 'hija' : ''}" data-id="${esc(x.id)}">
      <div class="fm-c-top">
        <span class="fm-c-drag" title="Arrastra para ordenar" aria-label="Arrastrar">${ICO_DRAG}</span>
        <span class="fm-c-ico">${svgT(x.tipo)}</span>
        <button type="button" class="fm-c-tit" data-c="abrir"><b>${esc(x.etiqueta || 'Pregunta sin título')}</b><span>${esc(t.n)} ${resumen}</span></button>
        <div class="fm-c-ord"><button type="button" class="icon-btn" data-c="sube" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>▲</button><button type="button" class="icon-btn" data-c="baja" aria-label="Bajar" ${i === ED.campos.length - 1 ? 'disabled' : ''}>▼</button></div>
      </div>
      ${abierto ? fmCampoEditor(x, i) : ''}
    </div>`;
  }

  function fmCampoEditor(x, i) {
    const opts = (x.opciones || []);
    const madres = ED.campos.slice(0, i).filter(y => y.tipo === 'unica' || y.tipo === 'multiple');
    const madre = x.cond ? madres.find(y => y.id === x.cond.campo) : null;
    let extra = '';
    if (x.tipo === 'texto') extra = `<label class="fm-check fm-check-s"><input type="checkbox" data-k="largo" ${x.largo ? 'checked' : ''}/> <span>Respuesta larga (párrafo)</span></label>
      <div class="fm-dos">${field('Mínimo de caracteres', `<input class="input" data-k="minLen" inputmode="numeric" value="${esc(x.minLen || '')}" placeholder="—" />`)}${field('Máximo de caracteres', `<input class="input" data-k="maxLen" inputmode="numeric" value="${esc(x.maxLen || '')}" placeholder="—" />`)}</div>`;
    else if (x.tipo === 'numero') extra = `<div class="fm-dos">${field('Valor mínimo', `<input class="input" data-k="min" inputmode="decimal" value="${esc(x.min ?? '')}" placeholder="—" />`)}${field('Valor máximo', `<input class="input" data-k="max" inputmode="decimal" value="${esc(x.max ?? '')}" placeholder="—" />`)}</div>
      <label class="fm-check fm-check-s"><input type="checkbox" data-k="entero" ${x.entero ? 'checked' : ''}/> <span>Solo números enteros</span></label>`;
    else if (x.tipo === 'unica' || x.tipo === 'multiple') extra = `<div class="field"><span>Opciones</span>
        <div class="fm-opts">${opts.map((o, k) => `<div class="fm-opt"><span class="fm-opt-ic">${x.tipo === 'unica' ? '○' : '☐'}</span><input class="input" data-opt="${k}" value="${esc(o)}" maxlength="120" placeholder="Opción ${k + 1}" /><button type="button" class="icon-btn" data-optx="${k}" aria-label="Quitar opción">${I.x}</button></div>`).join('')}</div>
        <button type="button" class="btn btn-quiet fm-opt-add" data-c="opt">${I.plus} Agregar opción</button></div>
      ${x.tipo === 'multiple' ? `<div class="fm-dos">${field('Mínimo a marcar', `<input class="input" data-k="minSel" inputmode="numeric" value="${esc(x.minSel || '')}" placeholder="—" />`)}${field('Máximo a marcar', `<input class="input" data-k="maxSel" inputmode="numeric" value="${esc(x.maxSel || '')}" placeholder="—" />`)}</div>` : ''}`;
    else if (x.tipo === 'fecha') extra = `<div class="fm-dos">${['min', 'max'].map(k => `<div class="field"><span>${k === 'min' ? 'Desde (opcional)' : 'Hasta (opcional)'}</span><div class="fm-cierre"><button type="button" class="input datebtn ${x[k] ? '' : 'vacio'}" data-fk="${k}"><span class="datebtn-tx">${x[k] ? esc(fechaLargaISO(x[k])) : 'Sin límite'}</span><span class="datebtn-ic">📅</span></button>${x[k] ? `<button type="button" class="icon-btn fm-x" data-fkx="${k}" aria-label="Quitar">${I.x}</button>` : ''}</div></div>`).join('')}</div>
      <p class="muted small">Quien llena el formulario la elige con la rueda (día, mes y año con flechas).</p>`;
    else if (x.tipo === 'imagen') extra = `<p class="muted small">La foto se comprime en el teléfono antes de subir y queda en la carpeta de Drive del formulario.</p>`;
    else if (x.tipo === 'archivo') extra = `<p class="muted small">Cualquier tipo de archivo, máximo 2 MB. Queda en la carpeta de Drive del formulario.</p>`;

    return `<div class="fm-c-ed">
      <div class="fm-tipos-mini">${TIPOS.map(t => `<button type="button" class="fm-tm ${t.t === x.tipo ? 'on' : ''}" data-tipo="${t.t}" title="${esc(t.n)}">${svgT(t.t)}<span>${esc(t.n)}</span></button>`).join('')}</div>
      ${field('Pregunta *', `<input class="input" data-k="etiqueta" maxlength="200" value="${esc(x.etiqueta || '')}" placeholder="Ej.: Raza de la mascota" />`)}
      ${field('Ayuda (opcional)', `<input class="input" data-k="ayuda" maxlength="300" value="${esc(x.ayuda || '')}" placeholder="Texto pequeño debajo de la pregunta" />`)}
      ${extra}
      <label class="fm-check fm-check-s"><input type="checkbox" data-k="req" ${x.req ? 'checked' : ''}/> <span>Obligatoria</span></label>
      <div class="fm-cond">
        <label class="fm-check fm-check-s"><input type="checkbox" data-c="cond" ${x.cond ? 'checked' : ''} ${madres.length ? '' : 'disabled'}/> <span>Mostrar solo según una respuesta anterior${madres.length ? '' : ' <small>(primero agrega arriba una pregunta de selección)</small>'}</span></label>
        ${x.cond ? `<div class="fm-cond-box">
          ${field('Si la pregunta…', `<select class="input" data-c="condCampo">${madres.map(y => `<option value="${esc(y.id)}" ${madre && madre.id === y.id ? 'selected' : ''}>${esc(y.etiqueta || 'Pregunta sin título')}</option>`).join('')}</select>`)}
          <div class="field"><span>…tiene como respuesta</span><div class="fm-cond-vals">${((madre || madres[0] || {}).opciones || []).map(o => `<label class="fm-pill"><input type="checkbox" data-cv="${esc(o)}" ${(x.cond.valores || []).includes(o) ? 'checked' : ''}/> ${esc(o)}</label>`).join('')}</div></div>
        </div>` : ''}
      </div>
      <div class="fm-c-acts"><button type="button" class="btn btn-quiet" data-c="dup">Duplicar</button><button type="button" class="btn btn-quiet fm-del" data-c="del">${I.trash} Quitar pregunta</button><button type="button" class="btn btn-primary" data-c="listo">Listo</button></div>
    </div>`;
  }

  /* Error de un campo (mismas reglas que el CORE) */
  function fmCampoError(x, i) {
    if (!String(x.etiqueta || '').trim()) return 'Falta la pregunta';
    if (x.tipo === 'unica' || x.tipo === 'multiple') {
      const o = (x.opciones || []).map(s => String(s).trim()).filter(Boolean);
      if (o.length < (x.tipo === 'unica' ? 2 : 1)) return x.tipo === 'unica' ? 'Necesita 2 opciones' : 'Necesita 1 opción';
      if (new Set(o.map(fmClave)).size !== o.length) return 'Opción repetida';
    }
    const num = v => (v === '' || v == null) ? null : Number(String(v).replace(',', '.'));
    if (x.tipo === 'numero' && num(x.min) != null && num(x.max) != null && num(x.min) > num(x.max)) return 'Mínimo mayor que máximo';
    if (x.tipo === 'texto' && num(x.minLen) && num(x.maxLen) && num(x.minLen) > num(x.maxLen)) return 'Largo mínimo mayor';
    if (x.tipo === 'fecha' && x.min && x.max && x.min > x.max) return 'Fechas al revés';
    if (x.cond) {
      const k = ED.campos.findIndex(y => y.id === x.cond.campo);
      if (k < 0 || k >= i) return 'Condición: la pregunta debe estar arriba';
      const m = ED.campos[k];
      if (!(m.tipo === 'unica' || m.tipo === 'multiple')) return 'Condición inválida';
      if (!(x.cond.valores || []).filter(v => (m.opciones || []).includes(v)).length) return 'Condición sin respuesta';
    }
    return '';
  }

  function fmEdEnganchar() {
    const box = $('#fm-ed');
    $('#fm-nom').oninput = e => { ED.nombre = e.target.value; };
    /* Imagen: adjuntar, arrastrar o pegar */
    const drop = $('#fm-drop'), inp = $('#fm-img-in');
    drop.onclick = e => { if (e.target.closest('#fm-img-quit')) return; inp.click(); };
    drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('sobre'); };
    drop.ondragleave = () => drop.classList.remove('sobre');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('sobre'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) fmTomarImagen(f); };
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) fmTomarImagen(f); inp.value = ''; };
    const q = $('#fm-img-quit'); if (q) q.onclick = e => { e.stopPropagation(); ED.imgNueva = ''; ED.imgQuitar = true; fmEdPintar(); };
    $('#fm-men').onchange = e => { ED.menores = e.target.checked; fmEdPintar(); };
    const ma = $('#fm-men-add'); if (ma) ma.onclick = fmCamposMenor;
    $('#fm-var').onchange = e => { ED.varios = e.target.checked; };
    $('#fm-cupo').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); ED.cupo = e.target.value; };
    /* Cierre: rueda de fecha + hora */
    const cfb = $('#fm-cf-btn');
    const pintaF = () => { $('.datebtn-tx', cfb).textContent = ED.cierreF ? fechaLargaISO(ED.cierreF) : 'Sin cierre'; cfb.classList.toggle('vacio', !ED.cierreF); };
    pintaF();
    cfb.onclick = () => abrirRuedaFecha(ED.cierreF, iso => { ED.cierreF = iso; if (!ED.cierreH) ED.cierreH = '18:00'; fmEdPintar(); }, { minHoy: true, anios: true });
    $('#fm-ch').onchange = e => { ED.cierreH = e.target.value; };
    const cx = $('#fm-cf-x'); if (cx) cx.onclick = () => { ED.cierreF = ''; ED.cierreH = ''; fmEdPintar(); };
    $('#fm-addc').onclick = fmTipoPicker;

    /* Campos */
    box.querySelectorAll('.fm-campo').forEach(el => {
      const id = el.dataset.id, x = ED.campos.find(y => y.id === id), i = ED.campos.indexOf(x);
      el.querySelectorAll('[data-c]').forEach(b => {
        const c = b.dataset.c;
        if (c === 'cond') return b.onchange = () => { if (b.checked) { const m = ED.campos.slice(0, i).find(y => y.tipo === 'unica' || y.tipo === 'multiple'); if (m) x.cond = { campo: m.id, valores: [] }; } else delete x.cond; fmEdPintar(); };
        if (c === 'condCampo') return b.onchange = () => { x.cond = { campo: b.value, valores: [] }; fmEdPintar(); };
        b.onclick = () => {
          if (c === 'abrir' || c === 'listo') { ED.abierto = (c === 'listo' || ED.abierto === id) ? null : id; return fmEdPintar(); }
          if (c === 'sube' && i > 0) { [ED.campos[i - 1], ED.campos[i]] = [ED.campos[i], ED.campos[i - 1]]; return fmEdPintar(); }
          if (c === 'baja' && i < ED.campos.length - 1) { [ED.campos[i + 1], ED.campos[i]] = [ED.campos[i], ED.campos[i + 1]]; return fmEdPintar(); }
          if (c === 'opt') { x.opciones = (x.opciones || []).concat(''); fmEdPintar(); const ins = $$(`.fm-campo[data-id="${CSS.escape(id)}"] [data-opt]`); if (ins.length) ins[ins.length - 1].focus(); return; }
          if (c === 'dup') { const n = JSON.parse(JSON.stringify(x)); n.id = fmNuevoId(); n.etiqueta = (x.etiqueta || '') + ' (copia)'; ED.campos.splice(i + 1, 0, n); ED.abierto = n.id; return fmEdPintar(); }
          if (c === 'del') {
            const hijas = ED.campos.filter(y => y.cond && y.cond.campo === id);
            if (hijas.length && !confirm(`${hijas.length} pregunta(s) dependen de esta. Se les quitará la condición. ¿Quitar la pregunta?`)) return;
            hijas.forEach(y => delete y.cond);
            ED.campos.splice(i, 1); if (ED.abierto === id) ED.abierto = null; return fmEdPintar();
          }
        };
      });
      el.querySelectorAll('[data-k]').forEach(inp => {
        const k = inp.dataset.k;
        const ev = inp.type === 'checkbox' ? 'onchange' : 'oninput';
        inp[ev] = () => {
          if (inp.type === 'checkbox') { if (inp.checked) x[k] = true; else delete x[k]; }
          else {
            if (inp.inputMode === 'numeric') inp.value = inp.value.replace(/\D/g, '');
            if (inp.value === '') delete x[k]; else x[k] = inp.value;
          }
          if (k === 'etiqueta') { const tb = el.querySelector('.fm-c-tit b'); if (tb) tb.textContent = inp.value || 'Pregunta sin título'; }
          fmRefrescarError(el, x);
        };
      });
      el.querySelectorAll('[data-fk]').forEach(bt => bt.onclick = () => abrirRuedaFecha(x[bt.dataset.fk] || '', iso => { x[bt.dataset.fk] = iso; fmEdPintar(); }, { anios: true }));
      el.querySelectorAll('[data-fkx]').forEach(bt => bt.onclick = () => { delete x[bt.dataset.fkx]; fmEdPintar(); });
      el.querySelectorAll('[data-opt]').forEach(inp => inp.oninput = () => { x.opciones[+inp.dataset.opt] = inp.value; fmRefrescarError(el, x); });
      el.querySelectorAll('[data-opt]').forEach(inp => inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const b = el.querySelector('[data-c="opt"]'); if (b) b.click(); } });
      el.querySelectorAll('[data-optx]').forEach(b => b.onclick = () => {
        const k = +b.dataset.optx, quitada = x.opciones[k];
        x.opciones.splice(k, 1);
        ED.campos.forEach(y => { if (y.cond && y.cond.campo === id) y.cond.valores = (y.cond.valores || []).filter(v => v !== quitada); });
        fmEdPintar();
      });
      el.querySelectorAll('[data-cv]').forEach(cb => cb.onchange = () => {
        const v = cb.dataset.cv; const s = new Set(x.cond.valores || []);
        cb.checked ? s.add(v) : s.delete(v); x.cond.valores = [...s]; fmRefrescarError(el, x);
      });
      el.querySelectorAll('[data-tipo]').forEach(b => b.onclick = () => {
        const nt = b.dataset.tipo; if (nt === x.tipo) return;
        const eraSel = x.tipo === 'unica' || x.tipo === 'multiple', esSel = nt === 'unica' || nt === 'multiple';
        ['largo', 'minLen', 'maxLen', 'min', 'max', 'entero', 'minSel', 'maxSel'].forEach(k => delete x[k]);
        if (!esSel) { delete x.opciones; if (eraSel) ED.campos.forEach(y => { if (y.cond && y.cond.campo === id) delete y.cond; }); }
        else if (!x.opciones) x.opciones = ['', ''];
        x.tipo = nt; fmEdPintar();
      });
      fmArrastre(el);
    });
  }

  function fmRefrescarError(el, x) {
    const i = ED.campos.indexOf(x), err = fmCampoError(x, i);
    el.classList.toggle('con-error', !!err);
    const span = el.querySelector('.fm-c-tit span');
    if (span) {
      const viejo = span.querySelector('.fm-tag-err'); if (viejo) viejo.remove();
      if (err) span.insertAdjacentHTML('beforeend', `<i class="fm-tag fm-tag-err">${esc(err)}</i>`);
    }
  }

  /* Ordenar arrastrando (ratón y dedo) desde la manija */
  function fmArrastre(el) {
    const asa = el.querySelector('.fm-c-drag'); if (!asa) return;
    asa.onpointerdown = e => {
      e.preventDefault();
      const lista = $('#fm-campos'); if (!lista) return;
      /* Escucha en window: mover el nodo en el DOM suelta la captura del puntero */
      el.classList.add('arrastrando'); lista.classList.add('ordenando');
      const mover = ev => {
        const y = ev.clientY;
        const otros = [...lista.querySelectorAll('.fm-campo:not(.arrastrando)')];
        let antes = null;
        for (const o of otros) { const r = o.getBoundingClientRect(); if (y < r.top + r.height / 2) { antes = o; break; } }
        if (antes) { if (el.nextElementSibling !== antes) lista.insertBefore(el, antes); }
        else if (lista.lastElementChild !== el) lista.appendChild(el);
        const sh = el.closest('.sheet'); if (sh) { const r = sh.getBoundingClientRect(); if (y < r.top + 60) sh.scrollTop -= 12; else if (y > r.bottom - 60) sh.scrollTop += 12; }
      };
      const soltar = () => {
        window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); window.removeEventListener('pointercancel', soltar);
        el.classList.remove('arrastrando'); lista.classList.remove('ordenando');
        const orden = [...lista.querySelectorAll('.fm-campo')].map(n => n.dataset.id);
        ED.campos.sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id));
        fmEdPintar();
      };
      window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar); window.addEventListener('pointercancel', soltar);
    };
  }

  function fmTipoPicker() {
    const ov = h(`<div class="fm-picker"><div class="fm-picker-box"><b>¿Qué tipo de pregunta?</b>
      <div class="fm-picker-grid">${TIPOS.map(t => `<button type="button" data-tipo="${t.t}">${svgT(t.t)}<b>${esc(t.n)}</b><span>${esc(t.d)}</span></button>`).join('')}</div>
      <button type="button" class="btn btn-quiet btn-block" data-x>Cancelar</button></div></div>`);
    const sh = $('.sheet.fm-sheet'); (sh || document.body).appendChild(ov);
    ov.onclick = e => { if (e.target === ov || e.target.closest('[data-x]')) ov.remove(); };
    ov.querySelectorAll('[data-tipo]').forEach(b => b.onclick = () => {
      const t = b.dataset.tipo, n = { id: fmNuevoId(), tipo: t, etiqueta: '', req: false };
      if (t === 'unica' || t === 'multiple') n.opciones = ['', ''];
      ED.campos.push(n); ED.abierto = n.id; ov.remove(); fmEdPintar();
      const nuevo = $(`.fm-campo[data-id="${CSS.escape(n.id)}"]`);
      if (nuevo) { nuevo.scrollIntoView({ block: 'center', behavior: 'smooth' }); const inp = nuevo.querySelector('[data-k="etiqueta"]'); if (inp) setTimeout(() => inp.focus(), 250); }
    });
  }

  function fmCamposMenor() {
    const base = [
      { tipo: 'texto', etiqueta: 'NOMBRE COMPLETO DEL(LA) MENOR', req: true },
      { tipo: 'numero', etiqueta: 'DOCUMENTO DEL(LA) MENOR', req: false, entero: true },
      { tipo: 'fecha', etiqueta: 'FECHA DE NACIMIENTO DEL(LA) MENOR', req: true },
      { tipo: 'unica', etiqueta: 'PARENTESCO CON EL(LA) MENOR', req: true, opciones: ['Madre', 'Padre', 'Abuelo(a)', 'Tío(a)', 'Hermano(a)', 'Otro'] }
    ];
    base.forEach(b => { b.id = fmNuevoId(); ED.campos.push(b); });
    fmEdPintar();
    toast('Campos del menor agregados. Ajústalos si hace falta.', 'ok');
  }

  /* Imagen: se comprime aquí (máx. 1600 px, JPEG) antes de viajar */
  function fmPegar(e) {
    if (!$('#fm-ed')) { document.removeEventListener('paste', fmPegar); return; }
    const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => /^image\//.test(x.type));
    if (!it) return;
    e.preventDefault(); fmTomarImagen(it.getAsFile());
  }
  async function fmTomarImagen(f) {
    if (!f || !/^image\/(jpeg|png|webp)$/.test(f.type)) return toast('Usa una imagen JPG, PNG o WEBP', 'err');
    if (f.size > 15 * 1024 * 1024) return toast('La imagen pasa de 15 MB', 'err');
    try { ED.imgNueva = await fmComprimir(f, 1600, 0.85); ED.imgQuitar = false; ED.imgId = ''; fmEdPintar(); }
    catch (e) { return toast('No se pudo leer la imagen', 'err'); }
    fmSubirDeFondo();
  }
  /* La imagen viaja a Drive APENAS se elige: al guardar ya está arriba y el
     guardado no la espera (subirla tarda 2 a 5 s en Google). */
  function fmSubirDeFondo() {
    const ed = ED, dataUrl = ed.imgNueva;
    ed.subiendo = true; const drop = $('#fm-drop'); if (drop) drop.classList.add('subiendo');
    ed.imgSubida = api('priv.formImagen', {}, 'POST', Object.assign({ imagen: dataUrl }, fmAuth()), SILENCIO)
      .then(r => { if (ed.imgNueva !== dataUrl) return ''; ed.imgId = (r && r.ok && r.id) || ''; return ed.imgId; })
      .catch(() => '')
      .finally(() => { if (ed.imgNueva === dataUrl) ed.subiendo = false; const d = $('#fm-drop'); if (d && ED === ed && !ed.subiendo) d.classList.remove('subiendo'); });
  }
  function fmComprimir(file, max, q) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', q));
      };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
      im.src = url;
    });
  }

  /* Lo que hay en el constructor → definición (para guardar y para la vista previa) */
  function fmLeerED() {
    const n = $('#fm-nom'); if (n) ED.nombre = n.value;
    const limpio = ED.campos.map(x => {
      const o = Object.assign({}, x);
      if (o.opciones) o.opciones = o.opciones.map(s => String(s).trim()).filter(Boolean);
      if (o.cond && !(o.cond.valores || []).length) delete o.cond;
      return o;
    });
    return {
      id: ED.id, nombre: String(ED.nombre || '').replace(/\s+/g, ' ').trim(),
      imagen: ED.imgNueva || (ED.imgQuitar ? '' : ED.imagen), campos: limpio, menores: ED.menores,
      cupo: ED.cupo, cierre: ED.cierreF ? `${ED.cierreF} ${ED.cierreH || '23:59'}` : '', varios: ED.varios
    };
  }

  async function fmGuardar() {
    const btn = $('#fm-ed-save'); if (!btn || btn.dataset.ocupado) return;
    const d = fmLeerED(), errEl = $('#fm-ed-err');
    let err = fmNombreError(d.nombre, ED.id);
    if (!err) { const k = ED.campos.findIndex((x, i) => fmCampoError(x, i)); if (k >= 0) { err = `Pregunta ${k + 1}: ${fmCampoError(ED.campos[k], k)}`; ED.abierto = ED.campos[k].id; fmEdPintar(); } }
    if (!err && d.cierre) { const ms = new Date(d.cierre.replace(' ', 'T') + ':00-05:00').getTime(); if (!(ms > Date.now())) err = 'La fecha de cierre ya pasó'; }
    errEl.textContent = err;
    if (err) { const c = $('.fm-campo.con-error') || $('#fm-nom'); if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    const cuerpo = { id: d.id, nombre: d.nombre, campos: d.campos, menores: d.menores, cupo: d.cupo, cierre: d.cierre, varios: d.varios,
      imagen: ED.imgQuitar && !ED.imgNueva ? 'QUITAR' : '' };
    if (ED.imgNueva) {
      /* Normalmente ya subió mientras se armaba el formulario. Si aún va en
         camino, el botón queda ocupado hasta que llegue; si falló, la imagen
         viaja con el guardado (camino de siempre). */
      btn.dataset.ocupado = '1'; saving(btn, true);
      const id = ED.imgId || (ED.imgSubida ? await ED.imgSubida : '');
      saving(btn, false); delete btn.dataset.ocupado;
      if (id) cuerpo.imagenId = id; else cuerpo.imagen = ED.imgNueva;
    }
    const r = await fmEscribir(btn, 'priv.formGuardar', cuerpo);
    if (!r) return;
    document.removeEventListener('paste', fmPegar);
    closeLayer(); fmUpsert(r.item);
    toast(ED.id ? 'Cambios guardados' : 'Formulario creado. Revísalo y enciéndelo cuando esté listo.', 'ok');
    ED = null;
  }

  /* ========================================================= VISTA PREVIA */
  function fmPrevia(def, desdeEditor) {
    const ov = h(`<div class="fm-prev-ov"><div class="fm-prev">
      <div class="fm-prev-bar"><b>Vista previa</b><span>Así se verá en la web</span><button type="button" class="icon-btn" data-x aria-label="Cerrar">${I.x}</button></div>
      <div class="fm-prev-body" id="fm-prev-body"></div></div></div>`);
    (desdeEditor && $('.sheet.fm-sheet') ? $('.sheet.fm-sheet') : document.body).appendChild(ov);
    ov.onclick = e => { if (e.target === ov || e.target.closest('[data-x]')) ov.remove(); };
    FMR.pintar($('#fm-prev-body', ov), def, { previa: true });
  }

  /* =================================================== RENDERIZADOR (web)
     El mismo que usa la web pública: pinta el formulario y aplica las
     condiciones en vivo. Aquí solo se usa en modo vista previa. */
  const FMR = {
    pintar(root, def, op) {
      op = op || {};
      const fijos = fmFijos(def.menores);
      root.innerHTML = `
        ${def.imagen ? `<img class="fmr-img" src="${esc(def.imagen)}" alt="" />` : ''}
        <h2 class="fmr-tit">${esc(def.nombre || 'Formulario sin nombre')}</h2>
        ${def.cupo ? `<p class="fmr-cupo">Cupo: ${Number(def.cupo).toLocaleString('es-CO')} personas</p>` : ''}
        <form class="fmr-form" novalidate>
          ${fijos.map(f => `<label class="fmr-f"><span>${esc(f.t)} *</span>${f.k === 'residencia' ? `<select class="input"><option>Selecciona tu barrio, vereda o conjunto</option></select>` : `<input class="input" ${f.k === 'nombre' ? '' : 'inputmode="numeric"'} placeholder="${esc(f.d)}" />`}</label>`).join('')}
          ${(def.campos || []).map(c => FMR.campo(c)).join('')}
          <label class="fmr-ley"><input type="checkbox" /> <span>Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012. *</span></label>
          <button type="button" class="btn btn-primary btn-block" ${op.previa ? 'disabled' : ''}>Inscribirme</button>
          ${op.previa ? '<p class="muted small center">En la vista previa no se envía nada.</p>' : ''}
        </form>`;
      const form = root.querySelector('form');
      const aplicar = () => FMR.condiciones(form, def.campos || []);
      form.addEventListener('change', aplicar); form.addEventListener('input', aplicar);
      aplicar();
    },
    campo(c) {
      const req = c.req ? ' *' : '';
      const ay = c.ayuda ? `<small>${esc(c.ayuda)}</small>` : '';
      let inp = '';
      if (c.tipo === 'texto') inp = c.largo ? `<textarea class="input" rows="3" ${c.maxLen ? `maxlength="${c.maxLen}"` : ''}></textarea>` : `<input class="input" ${c.maxLen ? `maxlength="${c.maxLen}"` : ''} />`;
      else if (c.tipo === 'numero') inp = `<input class="input" inputmode="${c.entero ? 'numeric' : 'decimal'}" ${c.min != null ? `data-min="${c.min}"` : ''} ${c.max != null ? `data-max="${c.max}"` : ''} placeholder="${c.min != null || c.max != null ? `Entre ${c.min ?? '…'} y ${c.max ?? '…'}` : ''}" />`;
      else if (c.tipo === 'unica') inp = `<div class="fmr-ops">${(c.opciones || []).map(o => `<label class="fmr-op"><input type="radio" name="${esc(c.id)}" value="${esc(o)}" /> <span>${esc(o)}</span></label>`).join('')}</div>`;
      else if (c.tipo === 'multiple') inp = `<div class="fmr-ops">${(c.opciones || []).map(o => `<label class="fmr-op"><input type="checkbox" name="${esc(c.id)}" value="${esc(o)}" /> <span>${esc(o)}</span></label>`).join('')}</div>`;
      else if (c.tipo === 'fecha') inp = `<button type="button" class="input datebtn vacio"><span class="datebtn-tx">Selecciona la fecha</span><span class="datebtn-ic">📅</span></button>`;
      else if (c.tipo === 'imagen') inp = `<div class="fmr-file">${I.upload}<span>Tomar o subir foto</span></div>`;
      else if (c.tipo === 'archivo') inp = `<div class="fmr-file">${I.upload}<span>Subir archivo (máx. 2 MB)</span></div>`;
      return `<div class="fmr-f" data-campo="${esc(c.id)}"><span>${esc(c.etiqueta)}${req}</span>${ay}${inp}</div>`;
    },
    /* Muestra u oculta cada pregunta según su condición (en cadena) */
    condiciones(form, campos) {
      const visible = {};
      campos.forEach(c => {
        let ver = true;
        if (c.cond) {
          if (!visible[c.cond.campo]) ver = false;
          else {
            const marc = [...form.querySelectorAll(`[name="${CSS.escape(c.cond.campo)}"]:checked`)].map(x => x.value);
            ver = marc.some(v => (c.cond.valores || []).includes(v));
          }
        }
        visible[c.id] = ver;
        const el = form.querySelector(`[data-campo="${CSS.escape(c.id)}"]`);
        if (el) el.hidden = !ver;
      });
      return visible;
    }
  };
  window.FMR = FMR;
})();

/* ============================================================================
 * pendientes.js — MODO SIN CONEXIÓN del PANEL (Base de datos) · 08/11/2026
 * ----------------------------------------------------------------------------
 * Pegamento de PRIV con la pieza común js/sin-red.js (idéntica en PERDOMO).
 * Se carga DESPUÉS de app.js y usa sus utilidades (api, openSheet, BD_*…).
 *
 *  · Tira de conexión bajo el encabezado de cada vista.
 *  · Pendientes por subir amarrados al usuario del panel. Si el celular se
 *    comparte, al cerrar sesión se avisa y se borran.
 *  · Revisar (UNA consulta) y subir por lotes con rid fijo al LÍDER DESTINO
 *    elegido antes de subir (priv.bdNuevoLote · pastilla bd.cargaMasiva).
 * ============================================================================ */
(function () {
  'use strict';
  if (!window.SINRED) return;
  const SR = window.SINRED;
  const OFF_RESI = nsKey('jpriv_off_resi');
  const DEST_KEY = nsKey('jpriv_pend_lider');

  function yo() { const u = getActive(); return (u && u.documento) || ''; }
  async function barrios() {
    /* 08/11/2026 · sin señal no se espera a la red (reintentos): la copia del teléfono de una vez */
    if (SR.enLinea()) try { const l = await getResidencias(); if (l && l.length) { try { localStorage.setItem(OFF_RESI, JSON.stringify(l)); } catch (e) {} return l; } } catch (e) {}
    try { return JSON.parse(localStorage.getItem(OFF_RESI) || '[]'); } catch (e) { return []; }
  }
  function guardadosSet() {
    /* Base de datos completa en memoria (si se abrió): sin señal ya avisa duplicados */
    const s = new Set();
    try { (BD_ALL || []).forEach(c => s.add(String(c.documento).replace(/\D/g, ''))); } catch (e) {}
    return s;
  }

  /* 08/11/2026 · la lista de barrios queda en el teléfono desde que se abre
     con señal (una vez al día, de fondo): así el anotador sirve sin red aunque
     nunca se haya abierto antes. */
  setTimeout(function () {
    try {
      const t = Number(localStorage.getItem(OFF_RESI + ':t') || 0);
      if (!SR.enLinea() || !getActive() || Date.now() - t < 864e5) return;
      barrios().then(l => { if (l && l.length) try { localStorage.setItem(OFF_RESI + ':t', String(Date.now())); } catch (e) {} });
    } catch (e) {}
  }, 4000);
  SR.montar({
    dueno: () => yo() || 'anon',
    textoSin: 'Sin conexión',
    explicar: function () {
      const n = SR.contar();
      openSheet(`<div class="grip"></div><h2 class="h2" style="margin-bottom:6px;">Estás sin conexión</h2>
        <div class="sr-ayuda">
          <p><b>Puedes seguir trabajando en Base de datos:</b></p>
          <ul>
            <li>Anotar contactos nuevos con <b>+ Agregar</b>: quedan en <b>Pendientes</b> en este equipo.</li>
            <li>Pegar varios registros que tengas en WhatsApp o en notas.</li>
            <li>Ver lo que ya estaba cargado en pantalla.</li>
          </ul>
          <p><b>Necesita señal:</b> revisar documentos, subir, editar, eliminar y las demás vistas que leen del servidor.</p>
          <p class="muted small">Al volver la conexión no se sube nada solo: entra a Pendientes, revisa, elige el líder destino y toca <b>Subir</b>.</p>
        </div>
        ${n ? `<p class="small" style="margin-top:8px;">Tienes <b>${n}</b> pendiente${n === 1 ? '' : 's'} en este equipo.</p>` : ''}
        <button class="btn btn-primary btn-block" data-close style="margin-top:12px;">Entendido</button>`);
    },
    abrirPendientes: function () { const u = getActive(); if (u) bdPendientes(u); }
  });
  SR.al(function () { $$('[data-pend-n]').forEach(el => { const n = SR.contar(); el.textContent = n ? String(n) : ''; el.hidden = !n; }); });

  /* ---------- formulario de anotar (sin servidor) ---------- */
  async function anotar(cfg) {
    const lista = await barrios();
    openSheet(`<div class="grip"></div>
      <h2 class="h2" style="margin-bottom:4px;">${esc(cfg.titulo || 'Anotar contacto')}</h2>
      <p class="muted small">${SR.enLinea() ? 'Queda en Pendientes; lo revisas y lo subes al líder que elijas.' : 'Sin señal: queda guardado en este equipo en Pendientes.'}</p>
      <div class="stack" style="margin-top:10px;">
        ${field('Documento', inputEl('pa-doc', 'inputmode="numeric" maxlength="10"'))}
        ${field('Nombre completo', inputEl('pa-nom', 'placeholder="Nombres y apellidos"'))}
        ${field('WhatsApp', inputEl('pa-tel', 'inputmode="numeric" maxlength="10" placeholder="10 dígitos"'))}
        ${field('Barrio', comboboxHtml('pa-resi', 'Escribe para buscar…'))}
        <div class="sr-sugs" id="pa-sugs"></div>
        <p class="small" id="pa-msg" style="color:#B42318;min-height:1em;margin:0;"></p>
        <button class="btn btn-primary btn-block" id="pa-ok">Guardar en pendientes</button>
        <button class="btn btn-quiet btn-block" data-close>Terminar</button>
        <p class="center small muted" id="pa-cuenta"></p>
      </div>`);
    onlyDigits($('#pa-doc')); onlyDigits($('#pa-tel'));
    bindCombobox('pa-resi', lista);
    const sugs = $('#pa-sugs'), msg = $('#pa-msg'), resi = $('#pa-resi');
    const pintarSug = () => {
      const r = SR.barrio(resi.value, lista);
      sugs.innerHTML = r.ok ? '' : r.sug.map(s => `<button type="button" class="sr-sug" data-v="${esc(s)}">${esc(s)}</button>`).join('');
      sugs.querySelectorAll('.sr-sug').forEach(b => b.onclick = () => { resi.value = b.dataset.v; sugs.innerHTML = ''; });
    };
    resi.addEventListener('input', pintarSug);
    resi.addEventListener('blur', () => setTimeout(pintarSug, 150));
    const cuenta = () => { const n = SR.contar(cfg.dueno); $('#pa-cuenta').textContent = n ? `${n} en pendientes` : ''; };
    cuenta();
    $('#pa-ok').onclick = () => {
      msg.textContent = '';
      const it = { d: onlyDig(val('pa-doc')), n: val('pa-nom'), t: onlyDig(val('pa-tel')), b: val('pa-resi') };
      const v = SR.validar(it, { barrios: lista, docMin: 5 });
      if (v.errores.length) { msg.textContent = 'Falta: ' + v.errores.join(' · '); if (!v.barrio.ok) pintarSug(); return; }
      it.b = v.barrio.b;
      if (SR.lista(cfg.dueno).some(x => x.d === it.d)) { msg.textContent = 'Ese documento ya está en tus pendientes.'; return; }
      if (guardadosSet().has(it.d)) { msg.textContent = 'Ese documento ya está en la Base de datos.'; return; }
      SR.agregar(it, cfg.dueno);
      toast('Guardado en pendientes', 'ok');
      ['pa-doc', 'pa-nom', 'pa-tel', 'pa-resi'].forEach(id => { const i = $('#' + id); if (i) i.value = ''; });
      sugs.innerHTML = ''; cuenta(); $('#pa-doc').focus();
      if (cfg.alGuardar) cfg.alGuardar();
    };
  }

  /* ---------- PENDIENTES (Base de datos) ---------- */
  function lideres() {
    let l = [];
    try { l = (BD_LIDERES || []).slice(); } catch (e) {}
    if (!l.length) { try { l = JSON.parse(localStorage.getItem(nsKey('jpriv_pend_lideres')) || '[]'); } catch (e) {} }
    else { try { localStorage.setItem(nsKey('jpriv_pend_lideres'), JSON.stringify(l.map(x => ({ codigo: x.codigo, nombre: x.nombre })))); } catch (e) {} }
    return l.sort((a, b) => Number(a.codigo) - Number(b.codigo));
  }
  async function bdPendientes(user) {
    if (RED.nuevaVista) RED.nuevaVista();
    app.innerHTML = `${backbar('Pendientes por subir')}<div class="pad stack" id="pd-body">${loadingBox('Abriendo tus pendientes…')}</div>`;
    app.hidden = false; hideSplash(); appWide(true, true);
    /* Pendientes no es ruta propia: la dirección sigue en #/bd y go('bd') no
       dispara hashchange (no pasaba nada). Se repinta Base de datos a mano. */
    $('#backbtn').onclick = () => { if ((location.hash || '').replace(/^#\//, '').split('?')[0] === 'bd') render(); else go('bd'); };
    SR.pintarTira();
    let elegido = '';
    try { elegido = localStorage.getItem(DEST_KEY) || ''; } catch (e) {}
    const rev = new SR.Revision({
      el: $('#pd-body'),
      dueno: user.documento,
      docMin: 5,
      barrios: barrios,
      guardados: guardadosSet,
      textoGuardado: 'Ya está en la Base de datos',
      hoja: (html) => { openSheet('<div class="grip"></div>' + html); return layer.querySelector('.sheet'); },
      cerrarHoja: closeLayer,
      aviso: toast,
      anotar: (luego) => anotar({ dueno: user.documento, alGuardar: luego }),
      revisar: async (docs) => {
        const r = await api('priv.bdPendRevisar', { ...auth(), docs: docs.join(',') });
        if (r && r.ok === false) throw new Error(r.msg || 'No se pudo revisar');
        return r;
      },
      destino: () => {
        const l = lideres();
        return `<label class="field"><span>Líder destino (a quién quedan asignados)</span>
          <select class="input" id="pd-lider"><option value="">Elige el líder…</option>${l.map(x => `<option value="${esc(x.codigo)}" ${String(x.codigo) === String(elegido) ? 'selected' : ''}>#${esc(x.codigo)} · ${esc(x.nombre)}</option>`).join('')}</select></label>
          ${l.length ? '' : '<p class="small muted" style="margin:0;">Abre Base de datos con señal para cargar la lista de líderes.</p>'}`;
      },
      destinoValor: () => {
        const s = $('#pd-lider'); elegido = s ? s.value : '';
        try { localStorage.setItem(DEST_KEY, elegido); } catch (e) {}
        return elegido ? { lider: elegido } : null;
      },
      subir: async (filas, rid, dv) => {
        const t0 = performance.now();
        const json = await RED.pedir(API_URL, 'priv.bdNuevoLote', { dev: VIVO_DEV }, { metodo: 'POST', cuerpo: { ...auth(), lider: dv.lider, filas: filas }, rid: rid });
        PD_MED.push({ accion: 'lote', filas: filas.length, ms: Math.round(performance.now() - t0), t: Date.now() });
        if (!json.ok) { if (json.error === 'SESION_VENCIDA') { sesionVencida(); throw Object.assign(new Error('cortado'), { cortado: true }); } throw new Error(json.error || 'Error del servidor'); }
        if (json.data && json.data.ok === false) throw new Error(json.data.msg || 'No se pudo subir');
        return json.data;
      },
      alSubir: (resps, subidos, malos) => {
        /* La lista de Base de datos se parcha en memoria (sin volver a pedirla) */
        const e = RAP.tomar('priv.baseDatos');
        resps.forEach(r => (r && r.cards || []).forEach(c => {
          try { bdCompletarCard(c); } catch (x) {}
          const ix = (BD_ALL || []).findIndex(x => normDocJs(x.documento) === normDocJs(c.documento));
          if (ix >= 0) BD_ALL[ix] = c; else BD_ALL.push(c);
          if (e && e.data && Array.isArray(e.data.items) && e.data.items !== BD_ALL) {
            const j = e.data.items.findIndex(x => normDocJs(x.documento) === normDocJs(c.documento));
            if (j >= 0) e.data.items[j] = c; else e.data.items.push(c);
          }
        }));
        try { RAP.tocar('priv.baseDatos'); } catch (x) {}
        const lid = resps.find(r => r && r.lider);
        toast(subidos ? `${subidos} subido${subidos === 1 ? '' : 's'}${lid ? ' a #' + lid.lider.codigo + ' · ' + lid.lider.nombre : ''}${malos ? ` · ${malos} por revisar` : ''}` : (malos ? `${malos} quedaron por revisar` : 'Nada para subir'), subidos ? 'ok' : 'err');
      }
    });
    rev.abrir();
    SR.al(function (st, antes, tipo) { if (!tipo && $('#pd-body') && st !== antes) { rev.pintar(); if (st === 'en') rev.revisarServidor(true); } });
  }
  const PD_MED = (window.PD_MED = window.PD_MED || []);

  /* ---------- cerrar sesión con pendientes (celular compartido) ---------- */
  async function logoutConPendientes() {
    const d = yo(), n = d ? SR.contar(d) : 0;
    if (n) {
      const ok = await confirmar('Tienes pendientes sin subir',
        crow('En este equipo', `${n} registro${n === 1 ? '' : 's'} sin subir`) +
        crow('Si sales', 'Se borran de este equipo (puede ser un celular compartido)'));
      if (!ok) return;
      SR.borrar(d);
    }
    logoutDirecto();
  }

  window.PEND = { bdPendientes, anotar, barrios, guardadosSet, logout: logoutConPendientes };
})();

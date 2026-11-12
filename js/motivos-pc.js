/* ============================================================================
 * motivos-pc.js — MOTIVOS DE «POR CONFIRMAR» (11/11/2026)
 * ----------------------------------------------------------------------------
 * Una sola fuente: CONFIG · PC_MOTIVOS_CFG en el CORE (Motivos_PC.gs). Llegan
 * dentro de priv.baseDatos (BD_PC.motivos) y de priv.cfgTodo (cfg): cero
 * viajes extra. Si no llegan, quedan los 4 de fábrica (DEF), los mismos del
 * CORE.
 *
 *   MOTIVOS_PC.lista()    todos (también los apagados: para leer lo viejo)
 *   MOTIVOS_PC.activos()  los que se ofrecen para marcar y en la plantilla
 *   MOTIVOS_PC.de(texto)  el motivo de un texto guardado (por texto o alias)
 *   MOTIVOS_PC.norm(t)    carga masiva: '' | texto canónico | '?'
 *   MOTIVOS_PC.inner(cfg) / bind()  tarjeta de Configuración → Avanzado (DEV)
 *
 * Guardar = UN viaje (priv.pcMotivos, rid, botón ocupado + escudo). Nunca se
 * borra un motivo: se desactiva. Editar el texto deja el anterior como alias
 * en el CORE, así los registros que ya lo tienen no quedan huérfanos.
 * ============================================================================ */
(function (raiz) {
  'use strict';

  var DEF = [
    { id: 'censo', v: 'NO APARECE EN CENSO', t: 'No aparece en censo', ic: 'censo', muerte: false, on: true, alias: [],
      d: 'La Registraduría no lo encontró: puede estar mal escrito',
      l: 'Al consultarlo en la Registraduría no salió. Casi siempre es un número mal escrito: compáralo con la cédula.' },
    { id: 'muerte', v: 'MUERTE', t: 'Posible fallecimiento', ic: 'cruz', muerte: true, on: true, alias: [],
      d: 'La Registraduría lo reporta como fallecido',
      l: 'La Registraduría lo reporta como fallecido. Confírmalo con su familia o corrige el número si está mal escrito.' },
    { id: 'derechos', v: 'VIGENTE CON PERDIDA O SUSPENSION DE LOS DERECHOS POLITICOS', t: 'Derechos políticos perdidos o suspendidos', ic: 'derechos', muerte: false, on: true, alias: [],
      d: 'La cédula está vigente, pero tiene los derechos políticos perdidos o suspendidos: no puede votar',
      l: 'La cédula está vigente, pero la Registraduría la reporta con los derechos políticos perdidos o suspendidos: no puede votar. Revisa que el número esté bien escrito.' },
    { id: 'habilitado', v: 'NO SE ENCUENTRA HABILITADO PARA VOTAR', t: 'No habilitado para votar', ic: 'urna', muerte: false, on: true, alias: [],
      d: 'La Registraduría lo reporta como no habilitado para votar',
      l: 'La Registraduría lo reporta como no habilitado para votar. Revisa que el número esté bien escrito; si está bien, confírmalo.' }
  ];
  var MAX = 20;

  var S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  /* Mismos nombres que PCM_ICONOS (CORE) e I de POSTCONSULTA */
  var ICONOS = {
    censo: ['Cédula', '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M15 10h3M15 14h3M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2"/>'],
    cruz: ['Cruz (fallecimiento)', '<path d="M12 3v18M7 8h10"/>'],
    derechos: ['Escudo tachado', '<path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6Z"/><path d="m9 9 6 6M15 9l-6 6"/>'],
    urna: ['Urna tachada', '<path d="M4 12h16v8H4Z"/><path d="M8 12V5h8v7"/><path d="M10 8h4"/><path d="M3 3l18 18"/>'],
    info: ['Información', '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'],
    alerta: ['Alerta', '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>'],
    documento: ['Documento', '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'],
    persona: ['Persona', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'],
    reloj: ['Reloj', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    candado: ['Candado', '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>']
  };
  function svg(ic) { var x = ICONOS[ic] || ICONOS.info; return '<svg viewBox="0 0 24 24" ' + S + '>' + x[1] + '</svg>'; }

  function tx(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function clave(v) { return tx(v).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function copia(a) { return JSON.parse(JSON.stringify(a)); }

  function lista() {
    var pc = raiz.BD_PC;
    if (pc && Array.isArray(pc.motivos) && pc.motivos.length) return pc.motivos;
    return DEF;
  }
  function activos() { return lista().filter(function (m) { return m.on !== false; }); }
  function de(txt) {
    var c = clave(txt); if (!c) return null;
    var l = lista();
    for (var i = 0; i < l.length; i++) {
      if (clave(l[i].v) === c) return l[i];
      var al = l[i].alias || [];
      for (var j = 0; j < al.length; j++) if (clave(al[j]) === c) return l[i];
    }
    return null;
  }
  /* Igual que pcMotivoNorm_ del CORE */
  var PALABRAS = [['derechos', /DERECHOS|SUSPENSI|PERDIDA/], ['habilitado', /HABILITAD/], ['censo', /CENSO/], ['muerte', /MUERT|FALLEC/]];
  function norm(v) {
    var s = clave(v); if (!s) return '';
    var act = activos();
    for (var i = 0; i < act.length; i++) {
      var m = act[i];
      if (clave(m.v) === s || clave(m.t) === s) return m.v;
      var al = m.alias || [];
      for (var j = 0; j < al.length; j++) if (clave(al[j]) === s) return m.v;
    }
    for (var k = 0; k < PALABRAS.length; k++) {
      if (!PALABRAS[k][1].test(s)) continue;
      for (var q = 0; q < act.length; q++) if (act[q].id === PALABRAS[k][0]) return act[q].v;
    }
    return '?';
  }

  /* ------------------------------------------------ Configuración → Avanzado */
  var ED = null;   /* copia de trabajo del editor */
  function desdeCfg(cfg) {
    try { var a = JSON.parse(String((cfg && cfg.PC_MOTIVOS_CFG) || '')); if (Array.isArray(a) && a.length) return copia(a); } catch (e) {}
    return copia(DEF);
  }
  function ultimoTxt(cfg) {
    var por = tx(cfg && cfg.PC_MOTIVOS_POR), f = tx(cfg && cfg.PC_MOTIVOS_FECHA);
    return por || f ? 'Último cambio: ' + (por || '—') + (f ? ' · ' + f : '') : 'Sin cambios todavía: están los 4 de fábrica.';
  }
  var ABIERTOS = {};   /* qué motivos están desplegados (por posición) */
  function filaHtml(m, i, n) {
    var opts = Object.keys(ICONOS).map(function (k) { return '<option value="' + k + '"' + (m.ic === k ? ' selected' : '') + '>' + esc(ICONOS[k][0]) + '</option>'; }).join('');
    var on = m.on !== false;
    return '<div class="pcm-fila' + (on ? '' : ' off') + (ABIERTOS[i] ? ' abierto' : '') + '" data-i="' + i + '">' +
      '<div class="pcm-cab">' +
        '<button type="button" class="pcm-abrir" aria-expanded="' + !!ABIERTOS[i] + '">' +
          '<span class="pcm-ic" aria-hidden="true">' + svg(m.ic) + '</span>' +
          '<span class="pcm-txt"><b class="pcm-tit">' + esc(m.t || m.v || 'Motivo nuevo') + '</b><small class="pcm-sub">' + esc(m.v || '') + (m.muerte ? ' · fallecimiento' : '') + '</small></span>' +
        '</button>' +
        '<button type="button" class="pcm-mv" data-mv="-1" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="pcm-mv" data-mv="1" aria-label="Bajar"' + (i === n - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" class="cfg-sw' + (on ? ' on' : '') + '" data-on role="switch" aria-checked="' + on + '"><span class="cfg-sw-k"></span><span>' + (on ? 'Activo' : 'Desactivado') + '</span></button>' +
      '</div>' +
      '<div class="pcm-cuerpo"><div class="cfg-grid">' +
        '<div class="cfg-field full"><label>Texto que se guarda (MAYÚSCULAS)</label><input class="input pcm-v" data-k="v" value="' + esc(m.v || '') + '" maxlength="120" autocomplete="off" />' +
          (m.alias && m.alias.length ? '<div class="cfg-hint">Antes: ' + esc(m.alias.join(' · ')) + ' (los registros con ese texto se siguen leyendo).</div>' : '') + '</div>' +
        '<div class="cfg-field"><label>Título corto</label><input class="input" data-k="t" value="' + esc(m.t || '') + '" maxlength="70" autocomplete="off" /><div class="cfg-hint">Pastilla y sello.</div></div>' +
        '<div class="cfg-field"><label>Ícono</label><select class="input" data-k="ic">' + opts + '</select></div>' +
        '<div class="cfg-field full"><label>Explicación para el equipo</label><input class="input" data-k="d" value="' + esc(m.d || '') + '" maxlength="300" autocomplete="off" /><div class="cfg-hint">Sale en Base de datos → Consultar.</div></div>' +
        '<div class="cfg-field full"><label>Explicación para el líder</label><textarea class="input area" rows="2" data-k="l" maxlength="400">' + esc(m.l || '') + '</textarea><div class="cfg-hint">Sale en Validación de registros.</div></div>' +
      '</div>' +
      '<label class="pcm-muerte"><input type="checkbox" data-muerte' + (m.muerte ? ' checked' : '') + ' /> Tiene la acción «Confirmar fallecimiento» (inactiva el registro). Solo uno.</label>' +
    '</div></div>';
  }
  function inner(cfg) {
    ED = desdeCfg(cfg); ABIERTOS = {};
    return '<div id="pcm-lista" class="pcm-lista">' + ED.map(function (m, i) { return filaHtml(m, i, ED.length); }).join('') + '</div>' +
      '<p class="cfg-hint" id="pcm-ult">' + esc(ultimoTxt(cfg)) + '</p>' +
      '<div class="cfg-actions"><button type="button" class="btn btn-quiet" id="pcm-add">+ Agregar motivo</button><button type="button" class="btn btn-primary" id="pcm-save">Guardar motivos</button></div>';
  }
  /* Lo escrito en pantalla → ED (antes de repintar o guardar) */
  function leer() {
    var cj = document.getElementById('pcm-lista'); if (!cj || !ED) return;
    [].forEach.call(cj.querySelectorAll('.pcm-fila'), function (f) {
      var m = ED[+f.getAttribute('data-i')]; if (!m) return;
      [].forEach.call(f.querySelectorAll('[data-k]'), function (el) { m[el.getAttribute('data-k')] = el.value; });
      m.v = tx(m.v).toUpperCase();
      m.muerte = !!f.querySelector('[data-muerte]').checked;
      m.on = f.querySelector('[data-on]').classList.contains('on');
    });
  }
  function repintar() {
    var cj = document.getElementById('pcm-lista'); if (!cj) return;
    cj.innerHTML = ED.map(function (m, i) { return filaHtml(m, i, ED.length); }).join('');
    enganchar();
  }
  function enganchar() {
    var cj = document.getElementById('pcm-lista'); if (!cj) return;
    [].forEach.call(cj.querySelectorAll('.pcm-fila'), function (f) {
      var i = +f.getAttribute('data-i');
      var v = f.querySelector('.pcm-v');
      f.querySelector('.pcm-abrir').onclick = function (e) {
        var ab = !f.classList.contains('abierto');
        f.classList.toggle('abierto', ab); e.currentTarget.setAttribute('aria-expanded', ab);
        if (ab) ABIERTOS[i] = 1; else delete ABIERTOS[i];
      };
      v.oninput = function () { var p = v.selectionStart; v.value = v.value.toUpperCase(); try { v.setSelectionRange(p, p); } catch (e) {} f.querySelector('.pcm-sub').textContent = v.value; };
      var t = f.querySelector('[data-k="t"]');
      t.oninput = function () { f.querySelector('.pcm-tit').textContent = t.value || v.value || 'Motivo nuevo'; };
      f.querySelector('[data-k="ic"]').onchange = function (e) { f.querySelector('.pcm-ic').innerHTML = svg(e.target.value); };
      f.querySelector('[data-on]').onclick = function (e) {
        var b = e.currentTarget, on = !b.classList.contains('on');
        b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
        b.lastChild.textContent = on ? 'Activo' : 'Desactivado';
        f.classList.toggle('off', !on);
      };
      f.querySelector('[data-muerte]').onchange = function (e) {
        if (!e.target.checked) return;
        [].forEach.call(cj.querySelectorAll('[data-muerte]'), function (x) { if (x !== e.target) x.checked = false; });
      };
      [].forEach.call(f.querySelectorAll('[data-mv]'), function (b) {
        b.onclick = function () {
          leer();
          var j = i + (+b.getAttribute('data-mv'));
          if (j < 0 || j >= ED.length) return;
          var x = ED[i]; ED[i] = ED[j]; ED[j] = x;
          var ai = !!ABIERTOS[i], aj = !!ABIERTOS[j];
          if (aj) ABIERTOS[i] = 1; else delete ABIERTOS[i];
          if (ai) ABIERTOS[j] = 1; else delete ABIERTOS[j];
          repintar();
        };
      });
    });
  }
  function bind() {
    if (!document.getElementById('pcm-lista')) return;
    enganchar();
    var add = document.getElementById('pcm-add');
    add.onclick = function () {
      leer();
      if (ED.filter(function (m) { return m.on !== false; }).length >= MAX) return toast('Máximo ' + MAX + ' motivos activos', 'err');
      ED.push({ v: '', t: '', d: '', l: '', ic: 'info', muerte: false, on: true, alias: [] });
      ABIERTOS[ED.length - 1] = 1;
      repintar();
      var ult = document.querySelector('#pcm-lista .pcm-fila:last-child .pcm-v'); if (ult) ult.focus();
    };
    document.getElementById('pcm-save').onclick = guardar;
  }
  /* Revisión local (el CORE vuelve a revisar todo) */
  function revisar() {
    var vistos = {}, muertes = 0, act = 0;
    for (var i = 0; i < ED.length; i++) {
      var m = ED[i], c = clave(m.v);
      if (!c) { ABIERTOS[i] = 1; repintar(); return 'El motivo ' + (i + 1) + ' no tiene texto.'; }
      if (vistos[c]) return 'El motivo «' + m.v + '» está repetido.';
      vistos[c] = 1;
      if (m.muerte) muertes++;
      if (m.on !== false) act++;
    }
    if (muertes > 1) return 'Solo un motivo puede tener la acción «Confirmar fallecimiento».';
    if (!act) return 'Deja al menos un motivo activo.';
    if (act > MAX) return 'Máximo ' + MAX + ' motivos activos.';
    return '';
  }
  var enCurso = false;
  async function guardar(e) {
    if (enCurso) return;                         /* escudo: nada de doble envío */
    leer();
    var malo = revisar(); if (malo) return toast(malo, 'err');
    var btn = (e && e.currentTarget) || document.getElementById('pcm-save');
    enCurso = true; saving(btn, true);
    var t0 = performance.now();
    try {
      var r = await api('priv.pcMotivos', {}, 'POST', Object.assign(cfAuth(), { motivos: ED }));
      if (!r || !r.ok) { toast((r && r.msg) || 'No se pudo guardar', 'err'); return; }
      ED = copia(r.motivos || ED);
      /* Parche en memoria: Configuración y Base de datos sin recargar */
      if (typeof CF !== 'undefined' && CF && CF.d && CF.d.cfg) { CF.d.cfg.PC_MOTIVOS_CFG = JSON.stringify(r.motivos); CF.d.cfg.PC_MOTIVOS_POR = r.por || ''; CF.d.cfg.PC_MOTIVOS_FECHA = r.fecha || ''; }
      if (raiz.BD_PC) raiz.BD_PC.motivos = copia(r.motivos);
      repintar();
      var u = document.getElementById('pcm-ult'); if (u) u.textContent = ultimoTxt({ PC_MOTIVOS_POR: r.por, PC_MOTIVOS_FECHA: r.fecha });
      toast('Motivos guardados · ' + ED.filter(function (m) { return m.on !== false; }).length + ' activo(s)', 'ok');
    } catch (err) {
      fallaRed(err);
    } finally {
      enCurso = false; saving(btn, false);
      if (raiz.RED && RED.pantalla) RED.pantalla('cfg.motivosGuardar', performance.now() - t0);
    }
  }

  raiz.MOTIVOS_PC = { DEF: DEF, ICONOS: ICONOS, svg: svg, lista: lista, activos: activos, de: de, norm: norm, clave: clave, inner: inner, bind: bind };
})(typeof self !== 'undefined' ? self : this);

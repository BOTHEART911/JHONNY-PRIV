/* ============================================================================
 * an-gestiones.js — PRIV · Análisis de procesos → pestaña RESEÑAS (07/11/2026)
 * ----------------------------------------------------------------------------
 *  Las calificaciones (1 a 5) y reseñas que la gente deja en PERDOMO →
 *  "Solicitudes y Gestiones" sobre servicios atendidos y compromisos cerrados.
 *  Llegan en el MISMO viaje de priv.analisis (pieza "gest"), así que abrir la
 *  pestaña no va al servidor; EN VIVO por el canal 'analisis'.
 *  Promedio, reparto de estrellas, por servicio y por responsable (tocar una
 *  barra filtra la lista), filtro por estrellas y buscador locales.
 *  Depende de app.js (AN, esc, $, $$, I, anAtajo).
 * ============================================================================ */
(function () {
  'use strict';
  const EST = '<svg viewBox="0 0 24 24"><path d="m12 2.6 2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5-4.9-4.6 6.6-.8Z"/></svg>';
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fecha = f => { const m = String(f || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${+m[3]} ${MES[+m[2] - 1]} ${m[1]}` : ''; };
  const estrellas = n => `<span class="rsg-st">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}">${EST}</i>`).join('')}</span>`;
  const coma = n => String(n).replace('.', ',');

  /* Tarjeta para el Resumen (usa el mismo armador de tarjetas del Resumen) */
  window.anGestArea = function (tarjeta) {
    const g = AN && AN.gest; if (!g) return '';
    const bajas = (g.dist[0] || 0) + (g.dist[1] || 0), altas = (g.dist[3] || 0) + (g.dist[4] || 0);
    return tarjeta('gestiones', 'Reseñas de gestiones', g.n, g.n ? `calificaciones · ${coma(g.prom)} ★ promedio` : 'aún sin calificaciones', [
      { n: altas, l: '4 y 5 estrellas', fx: 'galtas', cls: 'an-st-ok' },
      { n: g.dist[2] || 0, l: '3 estrellas', fx: 'g3' },
      { n: bajas, l: '1 y 2 estrellas', fx: 'gbajas', cls: bajas ? 'an-st-bad' : '' }
    ]);
  };

  window.anGestPintar = function () {
    const body = $('#an-body'); if (!body || !AN) return;
    const g = AN.gest;
    if (!g) { body.innerHTML = `<p class="center muted" style="padding:26px 0;">Las reseñas llegan cuando se despliegue la versión nueva del CORE.</p>`; return; }
    if (!AN.gFiltro) AN.gFiltro = { e: new Set(), q: '', k: '' };
    const F = AN.gFiltro;
    const q = (F.q || '').toLowerCase();
    const lista = (g.items || []).filter(x => !x.oculta && (!F.e.size || F.e.has(x.e)) && (!F.k || (x.tipo === 'COMPROMISO' ? 'Compromisos' : x.titulo) === F.k || x.resp === F.k) &&
      (!q || [x.nombre, x.titulo, x.resp, x.texto].join(' ').toLowerCase().includes(q)));
    const max = Math.max(1, ...g.dist);
    const barras = (arr, titulo) => arr.length ? `<section class="an-card"><div class="an-card-h"><b>${titulo}</b></div>
        <div class="rsg-bars">${arr.slice(0, 12).map(f => `<button type="button" class="rsg-bar ${F.k === f.k ? 'on' : ''}" data-k="${esc(f.k)}"><span class="rsg-bl" title="${esc(f.k)}">${esc(f.k)}</span>
          <span class="rsg-bt"><i style="width:${(f.prom / 5 * 100).toFixed(0)}%"></i></span><b>${coma(f.prom)} ★</b><em>${f.n}</em></button>`).join('')}</div></section>` : '';
    body.innerHTML = `
      <div class="rsg-top">
        <section class="an-card rsg-prom"><b>${g.n ? coma(g.prom) : '—'}</b>${estrellas(Math.round(g.prom))}<span>${g.n.toLocaleString('es-CO')} calificación${g.n === 1 ? '' : 'es'}</span></section>
        <section class="an-card rsg-dist">${[5, 4, 3, 2, 1].map(e => `<button type="button" class="rsg-drow ${F.e.has(e) ? 'on' : ''}" data-e="${e}"><span>${e} ★</span><span class="rsg-bt"><i style="width:${(g.dist[e - 1] / max * 100).toFixed(0)}%"></i></span><em>${g.dist[e - 1]}</em></button>`).join('')}</section>
      </div>
      <div class="an-res-cols">${barras(g.porServicio || [], 'Por servicio')}${barras(g.porResponsable || [], 'Por responsable')}</div>
      <div class="bd-search" style="margin:4px 0 10px;"><input class="input" id="rsg-q" placeholder="Buscar por persona, servicio, responsable o texto…" value="${esc(F.q || '')}" autocomplete="off" /></div>
      ${F.e.size || F.k ? `<p class="small muted">Filtro: ${[...F.e].sort().map(e => e + '★').join(', ')}${F.k ? ' · ' + esc(F.k) : ''} · <button type="button" class="rsg-limpiar" id="rsg-limpiar">Quitar filtro</button></p>` : ''}
      ${lista.length ? `<div class="rsg-grid">${lista.map(x => `<article class="rsg-card ${x.e <= 2 ? 'rsg-baja' : ''}">
          <div class="rsg-r1">${estrellas(x.e)}<span class="small muted">${esc(fecha(x.f))}</span></div>
          ${x.texto ? `<p>“${esc(x.texto)}”</p>` : '<p class="muted small">Sin comentario</p>'}
          <span class="rsg-meta"><b>${esc(x.nombre || '—')}</b> · ${esc(x.tipo === 'COMPROMISO' ? 'Compromiso' : 'Servicio')}: ${esc(x.titulo)}${x.resp ? ' · ' + esc(x.resp) : ''}</span>
        </article>`).join('')}</div>${g.totalItems > (g.items || []).length ? `<p class="small muted center">Se muestran las ${(g.items || []).length} reseñas más recientes de ${g.totalItems}.</p>` : ''}`
        : `<p class="center muted" style="padding:20px 0;">${g.n ? 'Ninguna reseña con este filtro.' : 'Todavía nadie ha calificado. Las reseñas llegan desde Solicitudes y Gestiones en la app pública.'}</p>`}`;
    $$('.rsg-drow', body).forEach(b => b.onclick = () => { const e = +b.dataset.e; F.e.has(e) ? F.e.delete(e) : F.e.add(e); anGestPintar(); });
    $$('.rsg-bar', body).forEach(b => b.onclick = () => { F.k = F.k === b.dataset.k ? '' : b.dataset.k; anGestPintar(); });
    const lim = $('#rsg-limpiar'); if (lim) lim.onclick = () => { AN.gFiltro = { e: new Set(), q: F.q, k: '' }; anGestPintar(); };
    const inp = $('#rsg-q'); let t;
    if (inp) inp.oninput = () => { clearTimeout(t); t = setTimeout(() => { F.q = inp.value; const pos = inp.selectionStart; anGestPintar(); const n = $('#rsg-q'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }, 180); };
  };

  /* Atajos del Resumen (altas / 3 estrellas / bajas) */
  const atajoViejo = window.anAtajo;
  window.anAtajo = function (tab, fx) {
    if (tab === 'gestiones') {
      AN.gFiltro = { e: new Set(fx === 'gbajas' ? [1, 2] : fx === 'galtas' ? [4, 5] : fx === 'g3' ? [3] : []), q: '', k: '' };
      if (AN.tab === tab) return anGestPintar();
      return anIrTab(tab);
    }
    return atajoViejo(tab, fx);
  };
})();

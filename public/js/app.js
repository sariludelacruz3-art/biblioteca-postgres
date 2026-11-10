import { api } from './api.js';
import { ENTITIES, fmtDate } from './entities.js';

const $ = (s) => document.querySelector(s);
const main = $('#main'), dialog = $('#dialog'), form = $('#form');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Las columnas usan HTML propio; los datos del usuario se escapan antes de insertarse
const safe = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === 'string' ? esc(v) : v]));

let toastTimer;
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg; t.className = `toast show${isError ? ' error' : ''}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = 'toast'), 3500);
}

/* ---------------- Panel ---------------- */
async function renderPanel() {
  const s = await api('/estadisticas');
  const stat = (n, label, alert) => `<div class="stat${alert && n ? ' alert' : ''}"><b>${n}</b><span>${label}</span></div>`;
  main.innerHTML = `
    <div class="page-head"><h1>Panel</h1></div>
    <div class="stats">
      ${stat(s.libros, 'títulos en catálogo')}${stat(s.ejemplares, 'ejemplares')}${stat(s.autores, 'autores')}
      ${stat(s.socios_activos, 'socios activos')}${stat(s.prestamos_activos, 'préstamos abiertos')}${stat(s.prestamos_vencidos, 'préstamos vencidos', true)}
    </div>
    <div class="panels">
      <section class="panel"><h2>Libros más prestados</h2>
        ${s.mas_prestados.length ? `<ol>${s.mas_prestados.map((b) => `<li>${esc(b.titulo)} <span class="muted">(${b.veces})</span></li>`).join('')}</ol>` : '<p class="muted">Aún no hay préstamos registrados.</p>'}
      </section>
      <section class="panel"><h2>Préstamos vencidos</h2>
        ${s.vencidos.length ? `<ul>${s.vencidos.map((p) => `<li>${esc(p.titulo)}<br><span class="muted">${esc(p.socio)} · venció el ${fmtDate(p.fecha_limite)} (${p.dias_retraso} días)</span></li>`).join('')}</ul>` : '<p class="muted">No hay préstamos vencidos.</p>'}
      </section>
    </div>`;
}

/* ---------------- Tablas CRUD ---------------- */
async function renderEntity(name, filter = '') {
  const cfg = ENTITIES[name];
  const rows = await api(`/${name}${filter ? `?estado=${filter}` : ''}`);
  main.innerHTML = `
    <div class="page-head"><h1>${cfg.title}</h1>
      <div class="tools"><input class="search" type="search" placeholder="Buscar en ${cfg.title.toLowerCase()}…" aria-label="Buscar"><button class="btn btn-primary" data-act="new">${cfg.addLabel}</button></div>
    </div>
    ${cfg.filters ? `<div class="tabs">${cfg.filters.map(([v, l]) => `<button data-filter="${v}" aria-pressed="${v === filter}">${l}</button>`).join('')}</div>` : ''}
    <div class="table-wrap">${rows.length ? `<table><thead><tr>${cfg.columns.map((c) => `<th>${c.label}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows.map((r) => {
        const s = safe(r);
        const edit = !cfg.canEdit || cfg.canEdit(r);
        return `<tr data-id="${r.id}">${cfg.columns.map((c) => `<td>${c.render ? c.render(s) : s[c.key]}</td>`).join('')}
          <td class="actions">${cfg.extraActions ? cfg.extraActions(r) : ''}${edit ? `<button class="btn btn-sm" data-act="edit" data-id="${r.id}">Editar</button>` : ''}<button class="btn btn-sm btn-danger" data-act="delete" data-id="${r.id}">Eliminar</button></td></tr>`;
      }).join('')}</tbody></table>` : `<p class="empty">No hay ${cfg.title.toLowerCase()} para mostrar. Usa «${cfg.addLabel}» para crear el primero.</p>`}</div>`;

  main.querySelector('.search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    main.querySelectorAll('tbody tr').forEach((tr) => (tr.hidden = !tr.textContent.toLowerCase().includes(q)));
  });
  main.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => renderEntity(name, b.dataset.filter)));
  main.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => handleAction(name, b.dataset.act, rows.find((r) => String(r.id) === b.dataset.id), filter)));
}

async function handleAction(name, act, row, filter) {
  const cfg = ENTITIES[name];
  try {
    if (act === 'new') return await openForm(name, null, filter);
    if (act === 'edit') return await openForm(name, row, filter);
    if (act === 'delete') {
      if (!confirm(`¿Eliminar este ${cfg.singular}? Esta acción no se puede deshacer.`)) return;
      await api(`/${name}/${row.id}`, { method: 'DELETE' });
      toast('Eliminado correctamente');
    }
    if (act === 'devolver') {
      await api(`/prestamos/${row.id}/devolver`, { method: 'PUT' });
      toast('Devolución registrada');
    }
    await renderEntity(name, filter);
  } catch (err) { toast(err.message, true); }
}

/* ---------------- Formulario ---------------- */
async function openForm(name, row, filter) {
  const cfg = ENTITIES[name];
  const fields = row && cfg.editFields ? cfg.editFields : cfg.fields;
  const sources = {};
  await Promise.all([...new Set(fields.filter((f) => f.source).map((f) => f.source))].map(async (s) => (sources[s] = await api(`/${s}`))));

  $('#dialog-title').textContent = row ? `Editar ${cfg.singular}` : cfg.addLabel;
  $('#form-error').hidden = true;
  $('#form-fields').innerHTML = fields.map((f) => {
    const val = row ? row[f.name] : f.value;
    let input;
    if (f.type === 'select') {
      const opts = sources[f.source].filter((o) => !f.filter || f.filter(o));
      input = `<select id="f-${f.name}" name="${f.name}"><option value="">Selecciona…</option>${opts.map((o) => `<option value="${o.id}" ${String(o.id) === String(val) ? 'selected' : ''}>${esc(f.option(o))}</option>`).join('')}</select>`;
    } else if (f.type === 'checkbox') {
      input = `<label><input type="checkbox" id="f-${f.name}" name="${f.name}" ${val ? 'checked' : ''}> ${f.label}</label>`;
    } else {
      input = `<input id="f-${f.name}" name="${f.name}" type="${f.type}" value="${esc(val ?? '')}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} ${f.hint ? `placeholder="${esc(f.hint)}"` : ''} autocomplete="off">`;
    }
    return `<div class="field ${f.type === 'checkbox' ? 'check' : ''}">${f.type === 'checkbox' ? '' : `<label for="f-${f.name}">${f.label}${f.required ? ' *' : ''}</label>`}${input}<div class="err" data-err="${f.name}"></div></div>`;
  }).join('');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const body = {};
    for (const f of fields) {
      const el = form.elements[f.name];
      body[f.name] = f.type === 'checkbox' ? el.checked : el.value;
    }
    form.querySelectorAll('.err').forEach((n) => (n.textContent = ''));
    form.querySelectorAll('.invalid').forEach((n) => n.classList.remove('invalid'));
    $('#save').disabled = true;
    try {
      await api(row ? `/${name}/${row.id}` : `/${name}`, { method: row ? 'PUT' : 'POST', body });
      dialog.close();
      toast(row ? 'Cambios guardados' : 'Creado correctamente');
      await renderEntity(name, filter);
    } catch (err) {
      if (err.details) {
        for (const [k, msg] of Object.entries(err.details)) {
          const n = form.querySelector(`[data-err="${k}"]`); if (n) n.textContent = msg;
          form.elements[k]?.classList.add('invalid');
        }
      } else { const fe = $('#form-error'); fe.textContent = err.message; fe.hidden = false; }
    } finally { $('#save').disabled = false; }
  };
  dialog.showModal();
  form.querySelector('input, select')?.focus();
}
$('#cancel').addEventListener('click', () => dialog.close());

/* ---------------- Navegación ---------------- */
async function route() {
  const name = location.hash.slice(1) || 'panel';
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${name}`));
  try {
    if (name === 'panel') await renderPanel();
    else if (ENTITIES[name]) await renderEntity(name);
    else { location.hash = '#panel'; return; }
  } catch (err) {
    main.innerHTML = `<div class="page-head"><h1>No se pudo cargar</h1></div><p class="form-error">${esc(err.message)}</p>`;
  }
}
window.addEventListener('hashchange', route);
route();

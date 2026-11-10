/** Configuración de cada sección: columnas de la tabla y campos del formulario. */
export const badge = (text, cls) => `<span class="badge ${cls}">${text}</span>`;
export const fmtDate = (d) => (d ? d.split('-').reverse().join('/') : '—');

export const ENTITIES = {
  libros: {
    title: 'Libros', singular: 'libro', addLabel: 'Nuevo libro',
    columns: [
      { label: 'Título', render: (r) => `<strong>${r.titulo}</strong><br><span class="muted">ISBN ${r.isbn}</span>` },
      { label: 'Autor', key: 'autor' },
      { label: 'Categoría', key: 'categoria' },
      { label: 'Año', render: (r) => r.anio_publicacion ?? '—' },
      { label: 'Disponibles', render: (r) => badge(`${r.ejemplares_disponibles} de ${r.ejemplares_totales}`, r.ejemplares_disponibles === 0 ? 'off' : r.ejemplares_disponibles === 1 ? 'low' : 'ok') },
    ],
    fields: [
      { name: 'titulo', label: 'Título', type: 'text', required: true },
      { name: 'isbn', label: 'ISBN', type: 'text', required: true, hint: 'Ej. 978-0-000-00015-8' },
      { name: 'autor_id', label: 'Autor', type: 'select', source: 'autores', option: (a) => `${a.nombre} ${a.apellido}`, required: true },
      { name: 'categoria_id', label: 'Categoría', type: 'select', source: 'categorias', option: (c) => c.nombre, required: true },
      { name: 'anio_publicacion', label: 'Año de publicación', type: 'number' },
      { name: 'ejemplares_totales', label: 'Ejemplares', type: 'number', required: true, value: 1, min: 0 },
    ],
  },
  autores: {
    title: 'Autores', singular: 'autor', addLabel: 'Nuevo autor',
    columns: [
      { label: 'Nombre', render: (r) => `<strong>${r.nombre} ${r.apellido}</strong>` },
      { label: 'Nacionalidad', render: (r) => r.nacionalidad ?? '—' },
      { label: 'Nacimiento', render: (r) => fmtDate(r.fecha_nacimiento) },
      { label: 'Libros', key: 'total_libros' },
    ],
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'apellido', label: 'Apellido', type: 'text', required: true },
      { name: 'nacionalidad', label: 'Nacionalidad', type: 'text' },
      { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
    ],
  },
  categorias: {
    title: 'Categorías', singular: 'categoría', addLabel: 'Nueva categoría',
    columns: [
      { label: 'Nombre', render: (r) => `<strong>${r.nombre}</strong>` },
      { label: 'Descripción', render: (r) => r.descripcion ?? '—' },
      { label: 'Libros', key: 'total_libros' },
    ],
    fields: [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'descripcion', label: 'Descripción', type: 'text' },
    ],
  },
  socios: {
    title: 'Socios', singular: 'socio', addLabel: 'Nuevo socio',
    columns: [
      { label: 'Nombre', render: (r) => `<strong>${r.nombre}</strong><br><span class="muted">${r.email}</span>` },
      { label: 'Teléfono', render: (r) => r.telefono ?? '—' },
      { label: 'Registro', render: (r) => fmtDate(r.fecha_registro) },
      { label: 'Estado', render: (r) => (r.activo ? badge('Activo', 'ok') : badge('Inactivo', 'off')) },
    ],
    fields: [
      { name: 'nombre', label: 'Nombre completo', type: 'text', required: true },
      { name: 'email', label: 'Correo electrónico', type: 'email', required: true },
      { name: 'telefono', label: 'Teléfono', type: 'text' },
      { name: 'activo', label: 'Socio activo', type: 'checkbox', value: true },
    ],
  },
  prestamos: {
    title: 'Préstamos', singular: 'préstamo', addLabel: 'Nuevo préstamo',
    filters: [['', 'Todos'], ['activo', 'Activos'], ['vencido', 'Vencidos'], ['devuelto', 'Devueltos']],
    columns: [
      { label: 'Libro', render: (r) => `<strong>${r.titulo}</strong>` },
      { label: 'Socio', key: 'socio' },
      { label: 'Préstamo', render: (r) => fmtDate(r.fecha_prestamo) },
      { label: 'Vence', render: (r) => fmtDate(r.fecha_limite) },
      { label: 'Estado', render: (r) => r.estado === 'vencido' ? badge(`Vencido (${r.dias_retraso} d)`, 'vencido') : r.estado === 'devuelto' ? badge(`Devuelto ${fmtDate(r.fecha_devolucion)}`, 'devuelto') : badge('Activo', 'activo') },
    ],
    // Crear: elegir libro disponible, socio activo y plazo. Editar: solo la fecha límite.
    fields: [
      { name: 'libro_id', label: 'Libro', type: 'select', source: 'libros', filter: (l) => l.ejemplares_disponibles > 0, option: (l) => `${l.titulo} (${l.ejemplares_disponibles} disp.)`, required: true },
      { name: 'socio_id', label: 'Socio', type: 'select', source: 'socios', filter: (s) => s.activo, option: (s) => s.nombre, required: true },
      { name: 'dias', label: 'Días de préstamo', type: 'number', value: 14, min: 1, max: 60, required: true },
    ],
    editFields: [{ name: 'fecha_limite', label: 'Nueva fecha límite', type: 'date', required: true }],
    canEdit: (r) => r.estado !== 'devuelto',
    extraActions: (r) => (r.estado !== 'devuelto' ? `<button class="btn btn-sm" data-act="devolver" data-id="${r.id}">Registrar devolución</button>` : ''),
  },
};

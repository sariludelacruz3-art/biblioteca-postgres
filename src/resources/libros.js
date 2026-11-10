module.exports = {
  table: 'libros',
  singular: 'el libro',
  orderBy: 't.titulo',
  listSql: `SELECT t.*, a.nombre || ' ' || a.apellido AS autor, c.nombre AS categoria
            FROM libros t
            JOIN autores a    ON a.id = t.autor_id
            JOIN categorias c ON c.id = t.categoria_id`,
  fields: [
    { name: 'isbn', label: 'El ISBN', type: 'text', required: true, max: 17, pattern: /^[0-9][0-9-]{8,15}[0-9X]$/, patternMsg: 'El ISBN debe tener 10 a 17 caracteres (números y guiones)' },
    { name: 'titulo', label: 'El título', type: 'text', required: true, max: 200 },
    { name: 'autor_id', label: 'El autor', type: 'int', required: true, min: 1 },
    { name: 'categoria_id', label: 'La categoría', type: 'int', required: true, min: 1 },
    { name: 'anio_publicacion', label: 'El año de publicación', type: 'int', min: 1000, max: 2100 },
    { name: 'ejemplares_totales', label: 'Los ejemplares', type: 'int', required: true, min: 0, max: 1000 },
  ],
  // Al crear, todos los ejemplares están disponibles
  onCreate: (v) => ({ ...v, ejemplares_disponibles: v.ejemplares_totales }),
  // Al editar el total, la disponibilidad se ajusta con la diferencia (los prestados no cambian)
  updateExtra: (p) => `ejemplares_disponibles = ejemplares_disponibles + (${p('ejemplares_totales')} - ejemplares_totales)`,
};

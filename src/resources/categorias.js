module.exports = {
  table: 'categorias',
  singular: 'la categoría',
  orderBy: 't.nombre',
  listSql: `SELECT t.*, (SELECT COUNT(*) FROM libros l WHERE l.categoria_id = t.id)::int AS total_libros FROM categorias t`,
  fields: [
    { name: 'nombre', label: 'El nombre', type: 'text', required: true, max: 60 },
    { name: 'descripcion', label: 'La descripción', type: 'text', max: 255 },
  ],
};

module.exports = {
  table: 'autores',
  singular: 'el autor',
  orderBy: 't.apellido, t.nombre',
  listSql: `SELECT t.*, (SELECT COUNT(*) FROM libros l WHERE l.autor_id = t.id)::int AS total_libros FROM autores t`,
  fields: [
    { name: 'nombre', label: 'El nombre', type: 'text', required: true, max: 80 },
    { name: 'apellido', label: 'El apellido', type: 'text', required: true, max: 80 },
    { name: 'nacionalidad', label: 'La nacionalidad', type: 'text', max: 60 },
    { name: 'fecha_nacimiento', label: 'La fecha de nacimiento', type: 'date' },
  ],
};

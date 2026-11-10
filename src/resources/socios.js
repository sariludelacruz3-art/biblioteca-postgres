module.exports = {
  table: 'socios',
  singular: 'el socio',
  orderBy: 't.nombre',
  listSql: `SELECT t.* FROM socios t`,
  fields: [
    { name: 'nombre', label: 'El nombre', type: 'text', required: true, max: 120 },
    { name: 'email', label: 'El correo electrónico', type: 'email', required: true, max: 150 },
    { name: 'telefono', label: 'El teléfono', type: 'text', max: 20, pattern: /^[0-9+() -]{7,20}$/, patternMsg: 'El teléfono solo admite números, +, (), espacios y guiones (7 a 20 caracteres)' },
    { name: 'activo', label: 'El estado', type: 'bool', default: true },
  ],
};

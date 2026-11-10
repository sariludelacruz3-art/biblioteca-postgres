const CONSTRAINTS = {
  uq_categorias_nombre: 'Ya existe una categoría con ese nombre',
  uq_libros_isbn: 'Ya existe un libro con ese ISBN',
  uq_socios_email: 'Ya existe un socio con ese correo electrónico',
  uq_prestamos_abierto: 'Este socio ya tiene un préstamo activo de ese libro',
  chk_libros_disp_min: 'No se pueden reducir los ejemplares por debajo de los que están prestados',
  chk_autores_nacimiento: 'La fecha de nacimiento no puede ser futura',
  chk_prestamos_limite: 'La fecha límite no puede ser anterior a la fecha del préstamo',
};

function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  if (err.status) return res.status(err.status).json({ error: err.message, details: err.details });

  // Errores de PostgreSQL (códigos SQLSTATE)
  switch (err.code) {
    case '23505': return res.status(409).json({ error: CONSTRAINTS[err.constraint] || 'Ya existe un registro con esos datos' });
    case '23503':
      return req.method === 'DELETE'
        ? res.status(409).json({ error: 'No se puede eliminar: tiene registros relacionados (libros o préstamos)' })
        : res.status(400).json({ error: 'El autor, categoría, libro o socio indicado no existe' });
    case '23514': return res.status(400).json({ error: CONSTRAINTS[err.constraint] || `Los datos no cumplen la restricción ${err.constraint}` });
    case '23502': return res.status(400).json({ error: 'Falta un dato obligatorio' });
    case '22001': return res.status(400).json({ error: 'Un texto supera la longitud permitida' });
    case '22P02': case '22007': case '22008': return res.status(400).json({ error: 'Un dato tiene un formato no válido' });
    default:
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { notFound, errorHandler };

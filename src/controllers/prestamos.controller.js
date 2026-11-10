const { pool } = require('../config/db');
const { validate } = require('../utils/validators');
const { HttpError } = require('../utils/errors');

const getOne = async (id, db = pool) => (await db.query('SELECT * FROM vw_prestamos WHERE id = $1', [id])).rows[0];

/** Ejecuta fn dentro de una transacción (COMMIT si todo sale bien, ROLLBACK si falla). */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

exports.list = async (req, res) => {
  const filtros = { activo: "estado = 'activo'", vencido: "estado = 'vencido'", devuelto: "estado = 'devuelto'" };
  const where = filtros[req.query.estado] ? `WHERE ${filtros[req.query.estado]}` : '';
  const { rows } = await pool.query(`SELECT * FROM vw_prestamos ${where} ORDER BY (fecha_devolucion IS NOT NULL), fecha_limite, id`);
  res.json(rows);
};

exports.get = async (req, res) => {
  const row = await getOne(req.params.id);
  if (!row) throw new HttpError(404, `No existe el préstamo con id ${req.params.id}`);
  res.json(row);
};

exports.create = async (req, res) => {
  const v = validate(req.body, [
    { name: 'libro_id', label: 'El libro', type: 'int', required: true, min: 1 },
    { name: 'socio_id', label: 'El socio', type: 'int', required: true, min: 1 },
    { name: 'dias', label: 'Los días de préstamo', type: 'int', min: 1, max: 60, default: 14 },
  ]);
  const id = await withTransaction(async (db) => {
    const socio = (await db.query('SELECT activo FROM socios WHERE id = $1', [v.socio_id])).rows[0];
    if (!socio) throw new HttpError(400, 'Hay datos que corregir', { socio_id: 'El socio indicado no existe' });
    if (!socio.activo) throw new HttpError(409, 'El socio está inactivo y no puede solicitar préstamos');

    // Descuenta el ejemplar solo si hay stock (operación atómica, evita carreras entre usuarios)
    const stock = await db.query(
      'UPDATE libros SET ejemplares_disponibles = ejemplares_disponibles - 1 WHERE id = $1 AND ejemplares_disponibles > 0 RETURNING id',
      [v.libro_id]
    );
    if (!stock.rowCount) {
      const existe = (await db.query('SELECT 1 FROM libros WHERE id = $1', [v.libro_id])).rowCount;
      if (!existe) throw new HttpError(400, 'Hay datos que corregir', { libro_id: 'El libro indicado no existe' });
      throw new HttpError(409, 'No hay ejemplares disponibles de este libro');
    }
    const ins = await db.query(
      `INSERT INTO prestamos (libro_id, socio_id, fecha_limite) VALUES ($1, $2, CURRENT_DATE + $3::int) RETURNING id`,
      [v.libro_id, v.socio_id, v.dias]
    );
    return ins.rows[0].id;
  });
  res.status(201).json(await getOne(id));
};

/** Actualiza únicamente la fecha límite (ampliar o reducir el plazo). */
exports.update = async (req, res) => {
  const v = validate(req.body, [{ name: 'fecha_limite', label: 'La fecha límite', type: 'date', required: true }]);
  const { rowCount } = await pool.query('UPDATE prestamos SET fecha_limite = $1 WHERE id = $2', [v.fecha_limite, req.params.id]);
  if (!rowCount) throw new HttpError(404, `No existe el préstamo con id ${req.params.id}`);
  res.json(await getOne(req.params.id));
};

exports.devolver = async (req, res) => {
  await withTransaction(async (db) => {
    const r = await db.query(
      'UPDATE prestamos SET fecha_devolucion = CURRENT_DATE WHERE id = $1 AND fecha_devolucion IS NULL RETURNING libro_id',
      [req.params.id]
    );
    if (!r.rowCount) {
      if (!(await getOne(req.params.id, db))) throw new HttpError(404, `No existe el préstamo con id ${req.params.id}`);
      throw new HttpError(409, 'Este préstamo ya fue devuelto');
    }
    await db.query('UPDATE libros SET ejemplares_disponibles = ejemplares_disponibles + 1 WHERE id = $1', [r.rows[0].libro_id]);
  });
  res.json(await getOne(req.params.id));
};

exports.remove = async (req, res) => {
  await withTransaction(async (db) => {
    const r = await db.query('DELETE FROM prestamos WHERE id = $1 RETURNING libro_id, fecha_devolucion', [req.params.id]);
    if (!r.rowCount) throw new HttpError(404, `No existe el préstamo con id ${req.params.id}`);
    // Si el préstamo seguía abierto, el ejemplar vuelve al stock
    if (r.rows[0].fecha_devolucion === null)
      await db.query('UPDATE libros SET ejemplares_disponibles = ejemplares_disponibles + 1 WHERE id = $1', [r.rows[0].libro_id]);
  });
  res.status(204).end();
};

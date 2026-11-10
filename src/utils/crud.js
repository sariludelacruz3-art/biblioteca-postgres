const express = require('express');
const { pool } = require('../config/db');
const { validate } = require('./validators');
const { HttpError, asyncHandler } = require('./errors');

/**
 * Genera un router REST con CRUD completo para un recurso.
 * Los nombres de tabla/columnas provienen de la configuración (nunca del usuario);
 * todos los valores viajan como parámetros ($1, $2...) para evitar inyección SQL.
 */
function crudRouter({ table, singular, fields, listSql, orderBy, onCreate, updateExtra }) {
  const router = express.Router();
  const fetchOne = async (id) => (await pool.query(`${listSql} WHERE t.id = $1`, [id])).rows[0];

  router.param('id', (req, res, next, id) => {
    if (!/^\d{1,9}$/.test(id)) return next(new HttpError(400, 'El identificador no es válido'));
    next();
  });

  router.get('/', asyncHandler(async (req, res) => {
    res.json((await pool.query(`${listSql} ORDER BY ${orderBy}`)).rows);
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const row = await fetchOne(req.params.id);
    if (!row) throw new HttpError(404, `No existe ${singular} con id ${req.params.id}`);
    res.json(row);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    let values = validate(req.body, fields);
    if (onCreate) values = onCreate(values);
    const cols = Object.keys(values);
    const { rows } = await pool.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
      cols.map((c) => values[c])
    );
    res.status(201).json(await fetchOne(rows[0].id));
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const values = validate(req.body, fields);
    const cols = fields.map((f) => f.name);
    const set = cols.map((c, i) => `${c} = $${i + 1}`);
    if (updateExtra) set.push(updateExtra((c) => `$${cols.indexOf(c) + 1}`));
    const { rowCount } = await pool.query(
      `UPDATE ${table} SET ${set.join(', ')} WHERE id = $${cols.length + 1}`,
      [...cols.map((c) => values[c]), req.params.id]
    );
    if (!rowCount) throw new HttpError(404, `No existe ${singular} con id ${req.params.id}`);
    res.json(await fetchOne(req.params.id));
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
    if (!rowCount) throw new HttpError(404, `No existe ${singular} con id ${req.params.id}`);
    res.status(204).end();
  }));

  return router;
}

module.exports = { crudRouter };

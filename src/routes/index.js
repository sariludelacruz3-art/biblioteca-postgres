const express = require('express');
const { pool } = require('../config/db');
const { crudRouter } = require('../utils/crud');
const { asyncHandler } = require('../utils/errors');
const prestamos = require('../controllers/prestamos.controller');
const estadisticas = require('../controllers/estadisticas.controller');

const router = express.Router();

router.get('/health', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', database: 'conectada' });
}));
router.get('/estadisticas', asyncHandler(estadisticas.resumen));

router.use('/categorias', crudRouter(require('../resources/categorias')));
router.use('/autores', crudRouter(require('../resources/autores')));
router.use('/socios', crudRouter(require('../resources/socios')));
router.use('/libros', crudRouter(require('../resources/libros')));

const p = express.Router();
p.param('id', (req, res, next, id) => (/^\d{1,9}$/.test(id) ? next() : res.status(400).json({ error: 'El identificador no es válido' })));
p.get('/', asyncHandler(prestamos.list));
p.post('/', asyncHandler(prestamos.create));
p.get('/:id', asyncHandler(prestamos.get));
p.put('/:id', asyncHandler(prestamos.update));
p.put('/:id/devolver', asyncHandler(prestamos.devolver));
p.delete('/:id', asyncHandler(prestamos.remove));
router.use('/prestamos', p);

module.exports = router;

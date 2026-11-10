/**
 * Pruebas de integración: ejercitan la API real contra PostgreSQL.
 * Requisito: haber ejecutado "npm run db:setup". Los datos que crean se eliminan al terminar.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { pool } = require('../src/config/db');

let server, base;
const ids = {};

before(async () => {
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  // Limpieza en orden inverso a las dependencias
  await pool.query('DELETE FROM prestamos WHERE libro_id IN (SELECT id FROM libros WHERE isbn LIKE $1)', ['999-%']);
  await pool.query("DELETE FROM libros WHERE isbn LIKE '999-%'");
  await pool.query("DELETE FROM autores WHERE apellido = 'PruebaTest'");
  await pool.query("DELETE FROM categorias WHERE nombre LIKE 'PruebaTest%'");
  await pool.query("DELETE FROM socios WHERE email LIKE '%@prueba-test.com'");
  await new Promise((r) => server.close(r));
  await pool.end();
});

const call = async (method, path, body) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
};

test('la API se conecta a PostgreSQL', async () => {
  const r = await call('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.database, 'conectada');
});

test('categorías: crear, validar, duplicado, consultar, actualizar', async () => {
  const bad = await call('POST', '/categorias', { nombre: '   ' });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.details.nombre);

  const ok = await call('POST', '/categorias', { nombre: 'PruebaTest Cat', descripcion: 'x' });
  assert.equal(ok.status, 201);
  ids.cat = ok.body.id;

  const dup = await call('POST', '/categorias', { nombre: 'pruebatest cat' });
  assert.equal(dup.status, 409);

  assert.equal((await call('GET', `/categorias/${ids.cat}`)).body.nombre, 'PruebaTest Cat');
  const upd = await call('PUT', `/categorias/${ids.cat}`, { nombre: 'PruebaTest Cat 2', descripcion: 'y' });
  assert.equal(upd.body.descripcion, 'y');
  assert.equal((await call('GET', '/categorias/999999')).status, 404);
  assert.equal((await call('GET', '/categorias/abc')).status, 400);
});

test('autores y socios: crear con validaciones', async () => {
  assert.equal((await call('POST', '/autores', { nombre: 'A', apellido: 'PruebaTest', fecha_nacimiento: '2999-01-01' })).status, 400);
  assert.equal((await call('POST', '/autores', { nombre: 'A', apellido: 'PruebaTest', fecha_nacimiento: '2023-02-30' })).status, 400);
  const a = await call('POST', '/autores', { nombre: 'Ana', apellido: 'PruebaTest', nacionalidad: 'Colombia' });
  assert.equal(a.status, 201); ids.autor = a.body.id;

  assert.equal((await call('POST', '/socios', { nombre: 'Z', email: 'no-es-correo' })).status, 400);
  assert.equal((await call('POST', '/socios', { nombre: 'Z', email: 'z@prueba-test.com', telefono: 'abc' })).status, 400);
  const s = await call('POST', '/socios', { nombre: 'Socio Uno', email: 'uno@prueba-test.com', telefono: '+57 300 000 0000' });
  assert.equal(s.status, 201); assert.equal(s.body.activo, true); ids.socio = s.body.id;
  const s2 = await call('POST', '/socios', { nombre: 'Socio Inactivo', email: 'dos@prueba-test.com', activo: false });
  assert.equal(s2.body.activo, false); ids.socioInactivo = s2.body.id;
});

test('libros: crear, validar y ajustar ejemplares', async () => {
  const base = { isbn: '999-1-111-11111-1', titulo: 'Libro de prueba', autor_id: ids.autor, categoria_id: ids.cat, anio_publicacion: 2020, ejemplares_totales: 1 };
  assert.equal((await call('POST', '/libros', { ...base, isbn: 'xx' })).status, 400);
  assert.equal((await call('POST', '/libros', { ...base, autor_id: 999999 })).status, 400);
  const l = await call('POST', '/libros', base);
  assert.equal(l.status, 201); assert.equal(l.body.ejemplares_disponibles, 1); ids.libro = l.body.id;
  assert.equal((await call('POST', '/libros', base)).status, 409); // ISBN repetido

  const up = await call('PUT', `/libros/${ids.libro}`, { ...base, ejemplares_totales: 3 });
  assert.equal(up.body.ejemplares_disponibles, 3);
  await call('PUT', `/libros/${ids.libro}`, { ...base, ejemplares_totales: 1 });
});

test('préstamos: stock, duplicados, socio inactivo, devolución y eliminación', async () => {
  const noSocio = await call('POST', '/prestamos', { libro_id: ids.libro, socio_id: ids.socioInactivo });
  assert.equal(noSocio.status, 409);

  const p = await call('POST', '/prestamos', { libro_id: ids.libro, socio_id: ids.socio, dias: 7 });
  assert.equal(p.status, 201); assert.equal(p.body.estado, 'activo'); ids.prestamo = p.body.id;
  assert.equal((await call('GET', `/libros/${ids.libro}`)).body.ejemplares_disponibles, 0);

  // Sin stock: no se puede prestar otra vez
  assert.equal((await call('POST', '/prestamos', { libro_id: ids.libro, socio_id: ids.socio })).status, 409);
  // No se puede reducir el total por debajo de lo prestado
  const lib = (await call('GET', `/libros/${ids.libro}`)).body;
  assert.equal((await call('PUT', `/libros/${ids.libro}`, { ...lib, ejemplares_totales: 0 })).status, 400);
  // No se puede borrar un libro con préstamos
  assert.equal((await call('DELETE', `/libros/${ids.libro}`)).status, 409);

  const ext = await call('PUT', `/prestamos/${ids.prestamo}`, { fecha_limite: '2099-01-01' });
  assert.equal(ext.body.fecha_limite, '2099-01-01');
  assert.equal((await call('PUT', `/prestamos/${ids.prestamo}`, { fecha_limite: '2000-01-01' })).status, 400);

  const dev = await call('PUT', `/prestamos/${ids.prestamo}/devolver`);
  assert.equal(dev.body.estado, 'devuelto');
  assert.equal((await call('GET', `/libros/${ids.libro}`)).body.ejemplares_disponibles, 1);
  assert.equal((await call('PUT', `/prestamos/${ids.prestamo}/devolver`)).status, 409);

  // Un préstamo abierto que se elimina devuelve el ejemplar al stock
  const p2 = await call('POST', '/prestamos', { libro_id: ids.libro, socio_id: ids.socio });
  assert.equal((await call('GET', `/libros/${ids.libro}`)).body.ejemplares_disponibles, 0);
  assert.equal((await call('DELETE', `/prestamos/${p2.body.id}`)).status, 204);
  assert.equal((await call('GET', `/libros/${ids.libro}`)).body.ejemplares_disponibles, 1);
  assert.equal((await call('DELETE', `/prestamos/${ids.prestamo}`)).status, 204);
});

test('eliminar: restricciones de clave foránea y borrado correcto', async () => {
  assert.equal((await call('DELETE', `/categorias/${ids.cat}`)).status, 409); // tiene un libro
  assert.equal((await call('DELETE', `/libros/${ids.libro}`)).status, 204);
  assert.equal((await call('DELETE', `/autores/${ids.autor}`)).status, 204);
  assert.equal((await call('DELETE', `/categorias/${ids.cat}`)).status, 204);
  assert.equal((await call('DELETE', `/socios/${ids.socio}`)).status, 204);
  assert.equal((await call('GET', `/libros/${ids.libro}`)).status, 404);
});

test('estadísticas y filtros de préstamos', async () => {
  const s = await call('GET', '/estadisticas');
  assert.equal(s.status, 200);
  assert.equal(typeof s.body.libros, 'number');
  const v = await call('GET', '/prestamos?estado=vencido');
  assert.ok(v.body.every((p) => p.estado === 'vencido'));
});

test('JSON inválido y ruta inexistente', async () => {
  const res = await fetch(`${base}/categorias`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{malo' });
  assert.equal(res.status, 400);
  assert.equal((await call('GET', '/no-existe')).status, 404);
});

/**
 * Crea la base de datos (si no existe), las tablas y los datos de prueba.
 * Uso:  npm run db:setup        (esquema + datos)
 *       npm run db:schema-only  (solo esquema, sin datos)
 * Funciona en Windows sin necesidad de tener "psql" en el PATH.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { dbConfig } = require('../../src/config/db');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

(async () => {
  const { database, ...conn } = dbConfig;
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('DB_NAME solo puede contener letras, números y guion bajo');

  const admin = new Client({ ...conn, database: 'postgres' });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  if (!exists.rowCount) {
    await admin.query(`CREATE DATABASE "${database}"`);
    console.log(`Base de datos "${database}" creada.`);
  } else {
    console.log(`La base de datos "${database}" ya existe.`);
  }
  await admin.end();

  const db = new Client(dbConfig);
  await db.connect();
  await db.query(read('schema.sql'));
  console.log('Tablas, restricciones, índices y vista creados.');
  if (!process.argv.includes('--no-seed')) {
    await db.query(read('seed.sql'));
    console.log('Datos de prueba insertados.');
  }
  await db.end();
})().catch((err) => {
  console.error('\nError al preparar la base de datos:', err.message);
  console.error('Verifica que PostgreSQL esté en ejecución y que DB_USER/DB_PASSWORD de .env sean correctos.\n');
  process.exit(1);
});

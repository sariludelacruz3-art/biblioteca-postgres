const app = require('./app');
const { pool, dbConfig } = require('./config/db');

const PORT = Number(process.env.PORT) || 3000;

(async () => {
  try {
    await pool.query('SELECT 1');
    console.log(`Conectado a PostgreSQL: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  } catch (err) {
    console.error('\nNo se pudo conectar a PostgreSQL:', err.message || err.code);
    console.error('Revisa el archivo .env y ejecuta "npm run db:setup" si la base de datos aún no existe.\n');
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`));
})();

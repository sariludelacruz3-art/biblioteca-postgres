const { pool } = require('../config/db');

exports.resumen = async (req, res) => {
  const [totales, masPrestados, vencidos] = await Promise.all([
    pool.query(`SELECT
        (SELECT COUNT(*) FROM libros)::int AS libros,
        (SELECT COALESCE(SUM(ejemplares_totales), 0) FROM libros)::int AS ejemplares,
        (SELECT COUNT(*) FROM autores)::int AS autores,
        (SELECT COUNT(*) FROM socios WHERE activo)::int AS socios_activos,
        (SELECT COUNT(*) FROM prestamos WHERE fecha_devolucion IS NULL)::int AS prestamos_activos,
        (SELECT COUNT(*) FROM vw_prestamos WHERE estado = 'vencido')::int AS prestamos_vencidos`),
    pool.query(`SELECT l.titulo, COUNT(p.id)::int AS veces
                FROM libros l JOIN prestamos p ON p.libro_id = l.id
                GROUP BY l.id, l.titulo ORDER BY veces DESC, l.titulo LIMIT 5`),
    pool.query(`SELECT id, titulo, socio, fecha_limite, dias_retraso FROM vw_prestamos
                WHERE estado = 'vencido' ORDER BY dias_retraso DESC LIMIT 5`),
  ]);
  res.json({ ...totales.rows[0], mas_prestados: masPrestados.rows, vencidos: vencidos.rows });
};

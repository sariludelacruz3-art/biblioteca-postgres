-- Consultas SQL de ejemplo. Ejecutar con:  psql -U postgres -d biblioteca -f database/queries.sql

-- 1. Catalogo con autor y categoria
SELECT l.titulo, a.nombre || ' ' || a.apellido AS autor, c.nombre AS categoria, l.anio_publicacion
FROM libros l
JOIN autores a    ON a.id = l.autor_id
JOIN categorias c ON c.id = l.categoria_id
ORDER BY l.titulo;

-- 2. Libros con ejemplares disponibles
SELECT titulo, ejemplares_disponibles, ejemplares_totales
FROM libros WHERE ejemplares_disponibles > 0 ORDER BY titulo;

-- 3. Prestamos vencidos (usa la vista)
SELECT id, titulo, socio, fecha_limite, dias_retraso
FROM vw_prestamos WHERE estado = 'vencido' ORDER BY dias_retraso DESC;

-- 4. Libros mas prestados
SELECT l.titulo, COUNT(p.id) AS veces_prestado
FROM libros l LEFT JOIN prestamos p ON p.libro_id = l.id
GROUP BY l.id, l.titulo ORDER BY veces_prestado DESC, l.titulo LIMIT 5;

-- 5. Socios con mas de un prestamo activo
SELECT s.nombre, COUNT(*) AS prestamos_activos
FROM socios s JOIN prestamos p ON p.socio_id = s.id AND p.fecha_devolucion IS NULL
GROUP BY s.id, s.nombre HAVING COUNT(*) > 1;

-- 6. Cantidad de libros por categoria (incluye categorias vacias)
SELECT c.nombre, COUNT(l.id) AS libros
FROM categorias c LEFT JOIN libros l ON l.categoria_id = c.id
GROUP BY c.id, c.nombre ORDER BY libros DESC, c.nombre;

-- 7. Historial de prestamos de un socio
SELECT titulo, fecha_prestamo, fecha_limite, fecha_devolucion, estado
FROM vw_prestamos WHERE socio = 'Camila Rojas' ORDER BY fecha_prestamo DESC;

-- 8. Busqueda de libros por titulo (sin distinguir mayusculas)
SELECT titulo, isbn FROM libros WHERE lower(titulo) LIKE '%soledad%';

-- 9. CRUD de ejemplo dentro de una transaccion que se revierte (no modifica los datos)
BEGIN;
INSERT INTO categorias (nombre, descripcion) VALUES ('Ensayo', 'Prueba') RETURNING id;
UPDATE categorias SET descripcion = 'Textos de reflexion' WHERE nombre = 'Ensayo';
SELECT * FROM categorias WHERE nombre = 'Ensayo';
DELETE FROM categorias WHERE nombre = 'Ensayo';
ROLLBACK;

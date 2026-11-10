-- Datos de prueba (los ISBN son ilustrativos, no corresponden a ediciones reales)
INSERT INTO categorias (nombre, descripcion) VALUES
 ('Novela',          'Narrativa extensa de ficción'),
 ('Cuento',          'Narrativa breve'),
 ('Poesía',          'Obras en verso'),
 ('Clásicos',        'Obras fundamentales de la literatura universal'),
 ('Distopía',        'Ficción sobre sociedades opresivas'),
 ('Realismo mágico', 'Narrativa latinoamericana con elementos fantasticos');

INSERT INTO autores (nombre, apellido, nacionalidad, fecha_nacimiento) VALUES
 ('Gabriel',  'García Márquez', 'Colombia',      '1927-03-06'),
 ('Jorge Luis','Borges',        'Argentina',     '1899-08-24'),
 ('Julio',    'Cortázar',       'Argentina',     '1914-08-26'),
 ('Isabel',   'Allende',        'Chile',         '1942-08-02'),
 ('Roberto',  'Bolaño',         'Chile',         '1953-04-28'),
 ('Juan',     'Rulfo',          'México',        '1917-05-16'),
 ('Miguel',   'de Cervantes',   'España',        '1547-09-29'),
 ('José',     'Saramago',       'Portugal',      '1922-11-16'),
 ('George',   'Orwell',         'Reino Unido',   '1903-06-25'),
 ('Pablo',    'Neruda',         'Chile',         '1904-07-12');

INSERT INTO libros (isbn, titulo, autor_id, categoria_id, anio_publicacion, ejemplares_totales, ejemplares_disponibles) VALUES
 ('978-0-000-00001-1', 'Cien años de soledad',              1, 6, 1967, 4, 4),
 ('978-0-000-00002-8', 'El amor en los tiempos del cólera', 1, 1, 1985, 3, 3),
 ('978-0-000-00003-5', 'Crónica de una muerte anunciada',   1, 1, 1981, 2, 2),
 ('978-0-000-00004-2', 'Ficciones',                         2, 2, 1944, 3, 3),
 ('978-0-000-00005-9', 'El Aleph',                          2, 2, 1949, 2, 2),
 ('978-0-000-00006-6', 'Rayuela',                           3, 1, 1963, 2, 2),
 ('978-0-000-00007-3', 'La casa de los espíritus',          4, 6, 1982, 3, 3),
 ('978-0-000-00008-0', 'Los detectives salvajes',           5, 1, 1998, 2, 2),
 ('978-0-000-00009-7', 'Pedro Páramo',                      6, 6, 1955, 3, 3),
 ('978-0-000-00010-3', 'Don Quijote de la Mancha',          7, 4, 1605, 5, 5),
 ('978-0-000-00011-0', 'Ensayo sobre la ceguera',           8, 1, 1995, 2, 2),
 ('978-0-000-00012-7', '1984',                              9, 5, 1949, 4, 4),
 ('978-0-000-00013-4', 'Rebelión en la granja',             9, 5, 1945, 2, 2),
 ('978-0-000-00014-1', 'Veinte poemas de amor y una canción desesperada', 10, 3, 1924, 2, 2);

INSERT INTO socios (nombre, email, telefono, fecha_registro, activo) VALUES
 ('Camila Rojas',     'camila.rojas@example.com',    '+57 300 111 2233', CURRENT_DATE - 400, TRUE),
 ('Andrés Mejía',     'andres.mejia@example.com',    '+57 311 222 3344', CURRENT_DATE - 300, TRUE),
 ('Laura Beltrán',    'laura.beltran@example.com',   '+57 320 333 4455', CURRENT_DATE - 200, TRUE),
 ('Sebastián Vargas', 'sebastian.vargas@example.com','+57 301 444 5566', CURRENT_DATE - 120, TRUE),
 ('Valentina Ortiz',  'valentina.ortiz@example.com', NULL,               CURRENT_DATE - 90,  TRUE),
 ('Daniel Cárdenas',  'daniel.cardenas@example.com', '+57 315 666 7788', CURRENT_DATE - 60,  TRUE),
 ('Mariana Pardo',    'mariana.pardo@example.com',   '+57 322 777 8899', CURRENT_DATE - 30,  TRUE),
 ('Jorge Salazar',    'jorge.salazar@example.com',   '+57 304 888 9900', CURRENT_DATE - 500, FALSE);

-- Fechas relativas a hoy: hay prestamos activos, vencidos y devueltos
INSERT INTO prestamos (libro_id, socio_id, fecha_prestamo, fecha_limite, fecha_devolucion) VALUES
 (1, 1, CURRENT_DATE - 5,  CURRENT_DATE + 9,  NULL),
 (12,2, CURRENT_DATE - 30, CURRENT_DATE - 16, NULL),
 (6, 3, CURRENT_DATE - 20, CURRENT_DATE - 6,  NULL),
 (10,4, CURRENT_DATE - 2,  CURRENT_DATE + 12, NULL),
 (4, 5, CURRENT_DATE - 60, CURRENT_DATE - 46, CURRENT_DATE - 50),
 (1, 6, CURRENT_DATE - 45, CURRENT_DATE - 31, CURRENT_DATE - 33),
 (9, 2, CURRENT_DATE - 40, CURRENT_DATE - 26, CURRENT_DATE - 28),
 (12,1, CURRENT_DATE - 10, CURRENT_DATE + 4,  NULL);

-- Sincroniza el stock con los prestamos abiertos
UPDATE libros l
SET ejemplares_disponibles = l.ejemplares_totales -
    (SELECT COUNT(*) FROM prestamos p WHERE p.libro_id = l.id AND p.fecha_devolucion IS NULL);

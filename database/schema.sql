-- =====================================================================
-- Biblioteca Central - Esquema PostgreSQL
-- ATENCION: este script ELIMINA y vuelve a crear las tablas.
-- =====================================================================
DROP VIEW  IF EXISTS vw_prestamos CASCADE;
DROP TABLE IF EXISTS prestamos  CASCADE;
DROP TABLE IF EXISTS libros     CASCADE;
DROP TABLE IF EXISTS socios     CASCADE;
DROP TABLE IF EXISTS autores    CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;

CREATE TABLE categorias (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      VARCHAR(60)  NOT NULL,
    descripcion VARCHAR(255),
    CONSTRAINT chk_categorias_nombre CHECK (length(trim(nombre)) > 0)
);
CREATE UNIQUE INDEX uq_categorias_nombre ON categorias (lower(nombre));

CREATE TABLE autores (
    id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre           VARCHAR(80) NOT NULL,
    apellido         VARCHAR(80) NOT NULL,
    nacionalidad     VARCHAR(60),
    fecha_nacimiento DATE,
    CONSTRAINT chk_autores_nombre CHECK (length(trim(nombre)) > 0 AND length(trim(apellido)) > 0),
    CONSTRAINT chk_autores_nacimiento CHECK (fecha_nacimiento IS NULL OR fecha_nacimiento <= CURRENT_DATE)
);
CREATE INDEX idx_autores_apellido ON autores (apellido);

CREATE TABLE libros (
    id                     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    isbn                   VARCHAR(17)  NOT NULL,
    titulo                 VARCHAR(200) NOT NULL,
    autor_id               INT NOT NULL REFERENCES autores(id)    ON DELETE RESTRICT,
    categoria_id           INT NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    anio_publicacion       SMALLINT,
    ejemplares_totales     INT NOT NULL DEFAULT 1,
    ejemplares_disponibles INT NOT NULL DEFAULT 1,
    CONSTRAINT uq_libros_isbn UNIQUE (isbn),
    CONSTRAINT chk_libros_isbn   CHECK (isbn ~ '^[0-9][0-9-]{8,15}[0-9X]$'),
    CONSTRAINT chk_libros_titulo CHECK (length(trim(titulo)) > 0),
    CONSTRAINT chk_libros_anio   CHECK (anio_publicacion IS NULL OR anio_publicacion BETWEEN 1000 AND 2100),
    CONSTRAINT chk_libros_total  CHECK (ejemplares_totales >= 0),
    CONSTRAINT chk_libros_disp_min CHECK (ejemplares_disponibles >= 0),
    CONSTRAINT chk_libros_disp_max CHECK (ejemplares_disponibles <= ejemplares_totales)
);
CREATE INDEX idx_libros_autor     ON libros (autor_id);
CREATE INDEX idx_libros_categoria ON libros (categoria_id);
CREATE INDEX idx_libros_titulo    ON libros (lower(titulo));

CREATE TABLE socios (
    id             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre         VARCHAR(120) NOT NULL,
    email          VARCHAR(150) NOT NULL,
    telefono       VARCHAR(20),
    fecha_registro DATE    NOT NULL DEFAULT CURRENT_DATE,
    activo         BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_socios_nombre   CHECK (length(trim(nombre)) > 0),
    CONSTRAINT chk_socios_email    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT chk_socios_telefono CHECK (telefono IS NULL OR telefono ~ '^[0-9+() -]{7,20}$')
);
CREATE UNIQUE INDEX uq_socios_email ON socios (lower(email));

CREATE TABLE prestamos (
    id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    libro_id         INT  NOT NULL REFERENCES libros(id) ON DELETE RESTRICT,
    socio_id         INT  NOT NULL REFERENCES socios(id) ON DELETE RESTRICT,
    fecha_prestamo   DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_limite     DATE NOT NULL,
    fecha_devolucion DATE,
    CONSTRAINT chk_prestamos_limite     CHECK (fecha_limite >= fecha_prestamo),
    CONSTRAINT chk_prestamos_devolucion CHECK (fecha_devolucion IS NULL OR fecha_devolucion >= fecha_prestamo)
);
CREATE INDEX idx_prestamos_libro ON prestamos (libro_id);
CREATE INDEX idx_prestamos_socio ON prestamos (socio_id);
-- Un socio no puede tener dos prestamos abiertos del mismo libro
CREATE UNIQUE INDEX uq_prestamos_abierto ON prestamos (libro_id, socio_id) WHERE fecha_devolucion IS NULL;
-- Acelera la busqueda de prestamos pendientes / vencidos
CREATE INDEX idx_prestamos_pendientes ON prestamos (fecha_limite) WHERE fecha_devolucion IS NULL;

CREATE VIEW vw_prestamos AS
SELECT p.id, p.libro_id, p.socio_id, p.fecha_prestamo, p.fecha_limite, p.fecha_devolucion,
       l.titulo, l.isbn, s.nombre AS socio, s.email,
       CASE WHEN p.fecha_devolucion IS NOT NULL    THEN 'devuelto'
            WHEN p.fecha_limite < CURRENT_DATE     THEN 'vencido'
            ELSE 'activo' END AS estado,
       CASE WHEN p.fecha_devolucion IS NULL AND p.fecha_limite < CURRENT_DATE
            THEN CURRENT_DATE - p.fecha_limite ELSE 0 END AS dias_retraso
FROM prestamos p
JOIN libros l ON l.id = p.libro_id
JOIN socios s ON s.id = p.socio_id;

# Biblioteca Central – Sistema de gestión con PostgreSQL

Aplicación web para administrar el catálogo de una biblioteca: **libros, autores, categorías, socios y préstamos**. Controla el stock de ejemplares automáticamente al prestar y devolver, y marca los préstamos vencidos.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Base de datos | PostgreSQL 14 o superior (probado en 16) |
| Backend | Node.js 20+ con Express 4 y el driver `pg` |
| Frontend | HTML, CSS y JavaScript (módulos ES), sin frameworks |
| Pruebas | `node:test` (incluido en Node.js) |

## Estructura del proyecto

```
biblioteca-postgres/
├── database/
│   ├── schema.sql            Tablas, claves, restricciones, índices y vista
│   ├── seed.sql              Datos de prueba
│   ├── queries.sql           Consultas SQL de ejemplo
│   └── scripts/setup-db.js   Crea la BD e importa schema + seed (sin necesitar psql)
├── src/
│   ├── config/db.js          Conexión a PostgreSQL (pool)
│   ├── controllers/          Lógica de préstamos (transacciones) y estadísticas
│   ├── resources/            Campos y validaciones de cada entidad
│   ├── routes/index.js       Rutas de la API REST
│   ├── middleware/           Manejo de errores (incluye errores de PostgreSQL)
│   ├── utils/                Validador y generador de CRUD
│   ├── app.js                Aplicación Express
│   └── server.js             Punto de entrada
├── public/                   Interfaz web (index.html, css/, js/)
├── tests/api.test.js         Pruebas de integración contra PostgreSQL
├── docs/modelo-datos.md      Modelo de datos y reglas de negocio
├── .env.example              Plantilla de configuración
└── package.json
```

## Requisitos previos (Windows)

1. **Node.js 20 o superior** – <https://nodejs.org> (versión LTS). Comprueba con `node -v`.
2. **PostgreSQL 14 o superior** – <https://www.postgresql.org/download/windows/>
3. **Visual Studio Code** – <https://code.visualstudio.com>

## Instalar y configurar PostgreSQL

1. Ejecuta el instalador de PostgreSQL y deja marcados *PostgreSQL Server* y *pgAdmin 4*.
2. Cuando pida la **contraseña del superusuario `postgres`**, escribe una y **anótala**.
3. Deja el puerto por defecto **5432** y finaliza la instalación.
4. Comprueba que el servicio está activo: `Win + R` → `services.msc` → busca *postgresql-x64-XX* → estado *En ejecución*.

## Pasos para ejecutar el proyecto

**1. Abrir el proyecto.** En VS Code: *Archivo → Abrir carpeta…* y elige `biblioteca-postgres`. Abre una terminal con `Ctrl + ñ`.

**2. Instalar dependencias.**
```powershell
npm install
```

**3. Configurar la conexión.** Copia la plantilla y edítala:
```powershell
copy .env.example .env
```
Abre `.env` y cambia `DB_PASSWORD` por la contraseña que elegiste al instalar PostgreSQL. El resto normalmente no hay que tocarlo:

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=biblioteca
DB_USER=postgres
DB_PASSWORD=tu_contraseña
```

**4. Crear e importar la base de datos.**
```powershell
npm run db:setup
```
Crea la base `biblioteca` (si no existe), todas las tablas y los datos de prueba. ⚠️ **Vuelve a crear las tablas: borra los datos que hubiera en ellas.** Para crear solo la estructura, sin datos: `npm run db:schema-only`.

*Alternativa manual con psql:*
```powershell
psql -U postgres -c "CREATE DATABASE biblioteca;"
psql -U postgres -d biblioteca -f database/schema.sql
psql -U postgres -d biblioteca -f database/seed.sql
```
También puedes ejecutar `schema.sql` y luego `seed.sql` desde la *Query Tool* de pgAdmin. (Con psql en consola de Windows, si ves caracteres raros en los acentos, ejecuta antes `set PGCLIENTENCODING=UTF8`.)

**5. Iniciar la aplicación.**
```powershell
npm start
```
Deberías ver `Conectado a PostgreSQL…` y `Servidor listo en http://localhost:3000`. Abre <http://localhost:3000> en el navegador. Para desarrollo con recarga automática: `npm run dev`.

**6. (Opcional) Ejecutar las pruebas.**
```powershell
npm test
```
Usan la base configurada y eliminan los registros que crean. Requieren haber ejecutado antes `npm run db:setup`.

## Uso de la aplicación

- **Panel**: resumen del catálogo, libros más prestados y préstamos vencidos.
- **Préstamos**: crear (solo libros con ejemplares y socios activos), registrar devolución, ampliar plazo, filtrar por estado y eliminar.
- **Libros, Autores, Categorías, Socios**: crear, consultar, editar y eliminar, con buscador. Si un registro está en uso (por ejemplo, un autor con libros), PostgreSQL impide borrarlo y la aplicación lo explica.

**Usuario y contraseña de prueba:** la aplicación no incluye inicio de sesión, así que no hay usuario de aplicación. Solo se necesitan las credenciales de PostgreSQL configuradas en `.env`.

## API REST

| Recurso | Endpoints |
|---|---|
| `/api/libros`, `/api/autores`, `/api/categorias`, `/api/socios` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` |
| `/api/prestamos` | `GET /?estado=activo\|vencido\|devuelto`, `GET /:id`, `POST /`, `PUT /:id` (fecha límite), `PUT /:id/devolver`, `DELETE /:id` |
| `/api/estadisticas`, `/api/health` | `GET` |

## Validaciones

Se validan en **dos niveles**: la API comprueba tipos, longitudes, formatos y rangos y devuelve mensajes por campo (HTTP 400); además, PostgreSQL garantiza la integridad con `NOT NULL`, `UNIQUE`, `CHECK` y claves foráneas. Todas las consultas usan parámetros (`$1`, `$2`…), lo que evita la inyección SQL.

## Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `password authentication failed` | `DB_PASSWORD` en `.env` no coincide con la contraseña de `postgres`. |
| `ECONNREFUSED` | El servicio de PostgreSQL no está en ejecución, o el puerto de `.env` es distinto. |
| `database "biblioteca" does not exist` | Ejecuta `npm run db:setup`. |
| `EADDRINUSE` | El puerto 3000 está ocupado: cambia `PORT` en `.env`. |
| `psql` no se reconoce | Usa `npm run db:setup` (no necesita psql) o añade `C:\Program Files\PostgreSQL\<versión>\bin` al PATH. |

# Modelo de datos

## Relaciones

```
categorias 1 ───< libros >─── 1 autores
                    │ 1
                    ^ N
socios 1 ────────< prestamos
```

- Una **categoría** tiene muchos libros y un **autor** tiene muchos libros (cada libro tiene un autor y una categoría).
- **Libros** y **socios** se relacionan mediante **préstamos** (N:M con atributos de fecha).
- Todas las claves foráneas usan `ON DELETE RESTRICT`: no se puede borrar un autor, categoría, libro o socio con registros asociados.

## Tablas

| Tabla | Clave primaria | Claves foráneas | Restricciones destacadas |
|---|---|---|---|
| `categorias` | `id` | – | Nombre único sin distinguir mayúsculas |
| `autores` | `id` | – | Nombre y apellido no vacíos; nacimiento no futuro |
| `libros` | `id` | `autor_id`, `categoria_id` | ISBN único y con formato; año 1000–2100; `0 ≤ disponibles ≤ totales` |
| `socios` | `id` | – | Correo único con formato; teléfono con formato |
| `prestamos` | `id` | `libro_id`, `socio_id` | `fecha_limite ≥ fecha_prestamo`; un socio no puede tener dos préstamos abiertos del mismo libro (índice único parcial) |

**Vista `vw_prestamos`:** une préstamo, libro y socio y calcula `estado` (`activo`, `vencido`, `devuelto`) y `dias_retraso`.

**Normalización (3FN):** cada dato se guarda una sola vez; autores y categorías son tablas independientes y los atributos no clave dependen solo de la clave de su tabla. `ejemplares_disponibles` es un dato derivado que se conserva por rendimiento; la aplicación lo mantiene dentro de transacciones y las restricciones `CHECK` lo protegen.

## Índices

Claves foráneas (`autor_id`, `categoria_id`, `libro_id`, `socio_id`), búsqueda por apellido y título, y un índice parcial sobre `fecha_limite` de préstamos pendientes para localizar vencidos rápidamente.

## Reglas de negocio

1. Solo se presta si hay ejemplares disponibles y el socio está activo.
2. Prestar descuenta un ejemplar; devolver (o eliminar un préstamo abierto) lo restituye. Son transacciones atómicas.
3. Al editar el total de ejemplares de un libro, la disponibilidad se ajusta por la diferencia; no se puede bajar por debajo de lo prestado.

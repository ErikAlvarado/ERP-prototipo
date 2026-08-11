# inventari_db

`inventari_db` es la base de datos ficticia del prototipo de inventario. Cada
archivo `.txt` representa una tabla, usa `|` como separador, incluye el
encabezado en la primera línea y representa `NULL` con un campo vacío.

No es un motor SQL ni un backend. Angular sólo obtiene estas tablas mediante
peticiones `GET` a `/assets/db/inventari_db`; las modificaciones del prototipo
se guardan en `localStorage` y no cambian estos archivos.

## Anaqueles

- `anaqueles.txt` cataloga cada anaquel y referencia
  `almacenes.txt.id_almacen` mediante `id_almacen`.
- `inventario.txt.id_anaquel` referencia `anaqueles.txt.id_anaquel`.
- `inventario.txt.id_producto` ya referencia `productos.txt.id_producto`, por
  lo que `inventario` es la relación entre producto, almacén y anaquel.
- Un anaquel sólo puede asignarse a inventario del mismo almacén.
- La combinación `(id_almacen, nombre_anaquel)` es única después de normalizar
  espacios, mayúsculas y diacríticos.
- Un anaquel referenciado por inventario no se elimina: debe responderse con
  conflicto o desactivarse.

Ejecuta `npm run migrate:data` para migrar la antigua columna de texto
`inventario.anaquel` y `npm run validate:data` para comprobar encabezados,
claves y relaciones.

El contrato propuesto para un backend real está en
`docs/anaqueles-api.openapi.yaml` y el modelo PostgreSQL de referencia en
`docs/anaqueles-postgresql.sql`.

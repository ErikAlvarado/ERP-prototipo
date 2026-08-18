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
- `anaqueles.txt.codigo_barras` identifica físicamente cada anaquel y es único
  en todo el catálogo.
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

## PostgreSQL

`inventari_db_postgresql.sql` crea las 23 tablas con la convención solicitada:
tablas `"inv-nombre"` y columnas `"ZYRO_nombre_#2045_NN"`. Incluye claves
primarias, relaciones y restricciones derivadas de los TXT actuales.

```powershell
createdb zyro
psql -d zyro -f inventari_db_postgresql.sql
```

Puede regenerarse después de modificar los encabezados TXT mediante
`node scripts/generate-inv-postgresql.mjs` desde la raíz del proyecto.

-- Modelo de referencia para un backend PostgreSQL. El repositorio actual no
-- incluye servidor ni motor SQL; los datos ejecutables del prototipo son los
-- archivos delimitados de public/assets/db/inventari_db.

CREATE TABLE anaqueles (
  id_anaquel BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_almacen BIGINT NOT NULL,
  nombre_anaquel VARCHAR(120) NOT NULL,
  -- El API genera esta clave con trim + minúsculas + eliminación de diacríticos.
  nombre_normalizado VARCHAR(120) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_anaqueles_almacen
    FOREIGN KEY (id_almacen) REFERENCES almacenes (id_almacen)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT uq_anaqueles_almacen_nombre
    UNIQUE (id_almacen, nombre_normalizado),
  CONSTRAINT uq_anaqueles_id_almacen
    UNIQUE (id_anaquel, id_almacen),
  CONSTRAINT ck_anaqueles_nombre_no_vacio
    CHECK (BTRIM(nombre_anaquel) <> ''),
  CONSTRAINT ck_anaqueles_nombre_normalizado_no_vacio
    CHECK (BTRIM(nombre_normalizado) <> '')
);

ALTER TABLE inventario
  ADD COLUMN id_anaquel BIGINT;

-- Antes de aplicar NOT NULL se debe ejecutar el backfill equivalente a
-- scripts/migrate-inventory-no-lots.mjs.
ALTER TABLE inventario
  ALTER COLUMN id_anaquel SET NOT NULL,
  ADD CONSTRAINT fk_inventario_anaquel_almacen
    FOREIGN KEY (id_anaquel, id_almacen)
    REFERENCES anaqueles (id_anaquel, id_almacen)
    ON UPDATE RESTRICT ON DELETE RESTRICT;

-- Relación producto -> anaquel: productos ya se enlaza con inventario por
-- inventario.id_producto, permitiendo que un producto ocupe distintos
-- anaqueles en distintos almacenes sin una FK única incorrecta en productos.
CREATE VIEW productos_anaqueles AS
SELECT
  i.id_producto,
  i.id_almacen,
  i.id_anaquel,
  a.nombre_anaquel,
  a.activo
FROM inventario i
JOIN anaqueles a ON a.id_anaquel = i.id_anaquel;

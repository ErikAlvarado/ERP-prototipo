-- Datos de ejemplo para tablas PostgreSQL existentes con prefijo "i-".
-- Este archivo NO crea, modifica ni renombra tablas.

BEGIN;

INSERT INTO "i-empresas" ("ZYRO_id_empresa_#2045_01", "ZYRO_nombre_empresa_#2045_02", "ZYRO_razon_social_#2045_03", "ZYRO_rfc_#2045_04", "ZYRO_direccion_#2045_05", "ZYRO_telefono_#2045_06", "ZYRO_email_#2045_07", "ZYRO_activo_#2045_08", "ZYRO_fecha_creacion_#2045_09") VALUES
(1,'ZYRO Matriz','ZYRO Matriz SA de CV','ZMA010101AA1','Av. Central 100','5551000001','matriz@zyro.mx',TRUE,'2026-01-01'),
(2,'ZYRO Norte','ZYRO Norte SA de CV','ZNO010101AA2','Av. Norte 200','5551000002','norte@zyro.mx',TRUE,'2026-01-01'),
(3,'ZYRO Sur','ZYRO Sur SA de CV','ZSU010101AA3','Av. Sur 300','5551000003','sur@zyro.mx',TRUE,'2026-01-01'),
(4,'ZYRO Oriente','ZYRO Oriente SA de CV','ZOR010101AA4','Av. Oriente 400','5551000004','oriente@zyro.mx',TRUE,'2026-01-01'),
(5,'ZYRO Poniente','ZYRO Poniente SA de CV','ZPO010101AA5','Av. Poniente 500','5551000005','poniente@zyro.mx',TRUE,'2026-01-01');

INSERT INTO "i-almacenes" ("ZYRO_id_almacen_#2045_01", "ZYRO_id_empresa_#2045_02", "ZYRO_nombre_almacen_#2045_03", "ZYRO_direccion_#2045_04", "ZYRO_es_principal_#2045_05", "ZYRO_activo_#2045_06", "ZYRO_fecha_creacion_#2045_07") VALUES
(1,1,'Almacén Central','Bodega Central',TRUE,TRUE,'2026-01-01'),
(2,1,'Almacén Norte','Bodega Norte',FALSE,TRUE,'2026-01-01'),
(3,1,'Almacén Sur','Bodega Sur',FALSE,TRUE,'2026-01-01'),
(4,1,'Almacén Oriente','Bodega Oriente',FALSE,TRUE,'2026-01-01'),
(5,1,'Almacén Poniente','Bodega Poniente',FALSE,TRUE,'2026-01-01');

INSERT INTO "i-usuarios" ("ZYRO_id_usuario_#2045_01", "ZYRO_id_empresa_#2045_02", "ZYRO_nombres_#2045_03", "ZYRO_apellido_paterno_#2045_04", "ZYRO_apellido_materno_#2045_05", "ZYRO_fecha_nacimiento_#2045_06", "ZYRO_email_#2045_07", "ZYRO_telefono_#2045_08", "ZYRO_password_hash_#2045_09", "ZYRO_activo_#2045_10", "ZYRO_intentos_fallidos_#2045_12", "ZYRO_id_almacen_defecto_#2045_14", "ZYRO_fecha_creacion_#2045_15") VALUES
(1,1,'Juan','Pérez','Gómez','1990-05-15','juan@zyro.mx','5552000001','$2b$12$hash_demo_01',TRUE,0,1,'2026-01-01'),
(2,1,'María','López','Díaz','1992-03-10','maria@zyro.mx','5552000002','$2b$12$hash_demo_02',TRUE,0,2,'2026-01-01'),
(3,1,'Carlos','Ramírez','Ruiz','1988-07-20','carlos@zyro.mx','5552000003','$2b$12$hash_demo_03',TRUE,0,3,'2026-01-01'),
(4,1,'Ana','Martínez','Soto','1995-11-21','ana@zyro.mx','5552000004','$2b$12$hash_demo_04',TRUE,0,4,'2026-01-01'),
(5,1,'Luis','García','Torres','1987-09-30','luis@zyro.mx','5552000005','$2b$12$hash_demo_05',TRUE,0,5,'2026-01-01');

UPDATE "i-empresas" SET "ZYRO_creado_por_usuario_#2045_11"=1, "ZYRO_actualizado_por_usuario_#2045_12"=1 WHERE "ZYRO_id_empresa_#2045_01" BETWEEN 1 AND 5;
UPDATE "i-almacenes" SET "ZYRO_creado_por_usuario_#2045_09"=1, "ZYRO_actualizado_por_usuario_#2045_10"=1 WHERE "ZYRO_id_almacen_#2045_01" BETWEEN 1 AND 5;
UPDATE "i-usuarios" SET "ZYRO_creado_por_usuario_#2045_17"=1, "ZYRO_actualizado_por_usuario_#2045_18"=1 WHERE "ZYRO_id_usuario_#2045_01" BETWEEN 1 AND 5;

INSERT INTO "i-categorias" VALUES (1,1,NULL,'Electrónica',TRUE),(2,1,NULL,'Oficina',TRUE),(3,1,NULL,'Limpieza',TRUE),(4,1,NULL,'Ferretería',TRUE),(5,1,NULL,'Alimentos',TRUE);
INSERT INTO "i-marcas" VALUES (1,1,'ZYRO Tech',TRUE),(2,1,'Office Pro',TRUE),(3,1,'LimpioMax',TRUE),(4,1,'Fuerza Tools',TRUE),(5,1,'Buen Sabor',TRUE);
INSERT INTO "i-unidades" VALUES (1,1,'Pieza','pz',FALSE),(2,1,'Kilogramo','kg',TRUE),(3,1,'Litro','L',TRUE),(4,1,'Metro','m',TRUE),(5,1,'Caja','cja',FALSE);
INSERT INTO "i-medidas" VALUES (1,1,1,TRUE,'2026-01-01'),(2,0.5,2,TRUE,'2026-01-01'),(3,1,3,TRUE,'2026-01-01'),(4,2,4,TRUE,'2026-01-01'),(5,12,5,TRUE,'2026-01-01');

INSERT INTO "i-productos" ("ZYRO_id_producto_#2045_01", "ZYRO_id_empresa_#2045_02", "ZYRO_sku_#2045_03", "ZYRO_codigo_barras_#2045_04", "ZYRO_nombre_producto_#2045_05", "ZYRO_tipo_#2045_06", "ZYRO_descripcion_#2045_07", "ZYRO_id_marca_#2045_08", "ZYRO_id_categoria_#2045_09", "ZYRO_id_unidad_#2045_10", "ZYRO_estatus_#2045_11", "ZYRO_ubicacion_default_#2045_12", "ZYRO_en_punto_venta_#2045_13", "ZYRO_en_catalogo_linea_#2045_14", "ZYRO_requiere_receta_#2045_15", "ZYRO_usar_existencias_#2045_16", "ZYRO_clave_sat_#2045_17", "ZYRO_fecha_creacion_#2045_18") VALUES
(1,1,'SKU-001','750000000001','Laptop Z1','Físico','Laptop de oficina',1,1,1,'Vigente','A1',TRUE,TRUE,FALSE,TRUE,'43211503','2026-01-01'),
(2,1,'SKU-002','750000000002','Cuaderno profesional','Físico','Cuaderno de 100 hojas',2,2,1,'Vigente','A2',TRUE,TRUE,FALSE,TRUE,'14111514','2026-01-01'),
(3,1,'SKU-003','750000000003','Limpiador multiusos','Físico','Botella de un litro',3,3,3,'Vigente','A3',TRUE,TRUE,FALSE,TRUE,'47131805','2026-01-01'),
(4,1,'SKU-004','750000000004','Martillo profesional','Físico','Martillo de acero',4,4,1,'Vigente','A4',TRUE,TRUE,FALSE,TRUE,'27111602','2026-01-01'),
(5,1,'SKU-005','750000000005','Café tostado','Físico','Bolsa de medio kilogramo',5,5,2,'Vigente','A5',TRUE,TRUE,FALSE,TRUE,'50201706','2026-01-01');

INSERT INTO "i-anaqueles" VALUES
(1,1,'A1-01','ANAQ-000001',TRUE,'2026-01-01',NULL),(2,2,'A1-01','ANAQ-000002',TRUE,'2026-01-01',NULL),(3,3,'A1-01','ANAQ-000003',TRUE,'2026-01-01',NULL),(4,4,'A1-01','ANAQ-000004',TRUE,'2026-01-01',NULL),(5,5,'A1-01','ANAQ-000005',TRUE,'2026-01-01',NULL);

INSERT INTO "i-inventario" VALUES
(1,1,1,1,100,20,10,200,'2026-01-01'),(2,2,2,2,80,15,5,150,'2026-01-01'),(3,3,3,3,60,12,4,120,'2026-01-01'),(4,4,4,4,40,10,3,100,'2026-01-01'),(5,5,5,5,50,10,5,100,'2026-01-01');

INSERT INTO "i-listas_precios" VALUES (1,1,'Público general',TRUE,TRUE),(2,1,'Mayoreo',FALSE,TRUE),(3,1,'Distribuidor',FALSE,TRUE),(4,1,'Promoción',FALSE,TRUE),(5,1,'Empleados',FALSE,TRUE);
INSERT INTO "i-productos_precios" VALUES (1,1,1,9000,12000,33.3333,'2026-01-01',NULL),(2,2,1,35,55,57.1429,'2026-01-01',NULL),(3,3,1,22,38,72.7273,'2026-01-01',NULL),(4,4,1,180,260,44.4444,'2026-01-01',NULL),(5,5,1,95,145,52.6316,'2026-01-01',NULL);
INSERT INTO "i-producto_imagenes" VALUES (1,1,'/assets/productos/laptop.jpg',TRUE,1),(2,2,'/assets/productos/cuaderno.jpg',TRUE,1),(3,3,'/assets/productos/limpiador.jpg',TRUE,1),(4,4,'/assets/productos/martillo.jpg',TRUE,1),(5,5,'/assets/productos/cafe.jpg',TRUE,1);
INSERT INTO "i-componentes_kit" VALUES (1,1,2,1),(2,2,3,1),(3,3,4,1),(4,4,5,1),(5,5,1,1);

INSERT INTO "i-permisos" VALUES
(1,'crear_producto','Productos','Crear productos','Crear'),(2,'editar_producto','Productos','Editar productos','Editar'),(3,'consultar_inventario','Inventario','Consultar existencias','Consultar'),(4,'ajustar_inventario','Inventario','Registrar ajustes','Editar'),(5,'gestionar_transferencias','Inventario','Gestionar transferencias','Crear');

INSERT INTO "i-roles" VALUES
(1,1,'Administrador','Acceso completo',TRUE,'2026-01-01',NULL,1,1),(2,1,'Almacenista','Gestiona almacenes',TRUE,'2026-01-01',NULL,1,1),(3,1,'Supervisor','Supervisa operaciones',TRUE,'2026-01-01',NULL,1,1),(4,1,'Comprador','Gestiona compras',TRUE,'2026-01-01',NULL,1,1),(5,1,'Consulta','Acceso de lectura',TRUE,'2026-01-01',NULL,1,1);

INSERT INTO "i-roles_permisos" VALUES (1,1),(1,2),(2,3),(2,4),(2,5);
INSERT INTO "i-usuario_roles" VALUES (1,1,1,'2026-01-01',NULL,TRUE,1),(2,2,2,'2026-01-01',NULL,TRUE,1),(3,3,3,'2026-01-01',NULL,TRUE,1),(4,4,4,'2026-01-01',NULL,TRUE,1),(5,5,5,'2026-01-01',NULL,TRUE,1);

INSERT INTO "i-tipos_movimiento" VALUES (1,'Inventario inicial','Entrada',TRUE),(2,'Salida','Salida',TRUE),(3,'Ajuste','Ajuste',TRUE),(4,'Transferencia','Transferencia',TRUE),(5,'Recepción de compra','Entrada',TRUE);
INSERT INTO "i-kardex_inventario" VALUES
(1,1,1,1,100,100,9000,'Inventario inicial','INV-001','2026-01-01',1),(2,2,2,1,80,80,35,'Inventario inicial','INV-002','2026-01-01',2),(3,3,3,1,60,60,22,'Inventario inicial','INV-003','2026-01-01',3),(4,4,4,1,40,40,180,'Inventario inicial','INV-004','2026-01-01',4),(5,5,5,1,50,50,95,'Inventario inicial','INV-005','2026-01-01',5);

INSERT INTO "i-estados_transferencia" VALUES (1,'Borrador'),(2,'Pendiente'),(3,'En tránsito'),(4,'Recibida'),(5,'Cancelada');
INSERT INTO "i-transferencias" VALUES
(1,1,'TR-0001',1,2,'2026-02-01',NULL,NULL,1,'Transferencia de ejemplo 1',1,NULL),(2,1,'TR-0002',2,3,'2026-02-02','2026-02-02',NULL,2,'Transferencia de ejemplo 2',2,1),(3,1,'TR-0003',3,4,'2026-02-03','2026-02-03',NULL,3,'Transferencia de ejemplo 3',3,1),(4,1,'TR-0004',4,5,'2026-02-04','2026-02-04','2026-02-05',4,'Transferencia de ejemplo 4',4,1),(5,1,'TR-0005',5,1,'2026-02-05',NULL,NULL,5,'Transferencia de ejemplo 5',5,NULL);
INSERT INTO "i-detalle_transferencia" VALUES (1,1,5,0,0),(2,2,10,5,0),(3,3,8,8,0),(4,4,4,4,4),(5,5,6,0,0);

COMMIT;

-- Los hashes anteriores son datos ficticios y no deben usarse como contraseñas reales.

BASE DE DATOS FICTICIA DEL MÓDULO DE COMPRAS

Formato:
- Archivos delimitados por el carácter |
- La primera línea contiene los nombres de las columnas
- Las fechas usan YYYY-MM-DD y las fechas con hora YYYY-MM-DD HH:mm:ss
- Un campo vacío representa NULL

Dependencias existentes fuera de esta carpeta:
- id_empresa referencia public/assets/db/inventari_db/empresas.txt
- id_producto referencia public/assets/db/inventari_db/productos.txt
- id_usuario, id_solicitante, id_comprador e id_responsable referencian public/assets/db/inventari_db/usuarios.txt
- id_almacen e id_almacen_destino referencian public/assets/db/inventari_db/almacenes.txt
- id_unidad referencia public/assets/db/inventari_db/unidades.txt

Flujo principal:
solicitudes_compra -> solicitudes_compra_detalle
solicitudes_compra -> cotizaciones_compra -> cotizaciones_compra_detalle
cotizaciones_compra -> ordenes_compra -> ordenes_compra_detalle
ordenes_compra -> recepciones_compra -> recepciones_compra_detalle
ordenes_compra -> facturas_proveedor -> facturas_proveedor_detalle
pagos_proveedor -> pagos_proveedor_aplicaciones -> facturas_proveedor
recepciones_compra -> devoluciones_compra -> devoluciones_compra_detalle

BASE DE DATOS FICTICIA DEL MODULO DE VENTAS

Formato:
- Archivos delimitados por el caracter |
- La primera linea contiene los nombres de las columnas
- Fechas YYYY-MM-DD; fechas con hora YYYY-MM-DD HH:mm:ss
- Un campo vacio representa NULL

Dependencias:
- empresa, producto, usuario, almacen, unidad y lista de precio: ../inventari_db/
- metodos_pago.txt contiene el catalogo exclusivo del punto de venta.

Flujo:
clientes -> ventas -> ventas_detalle
ventas -> pagos_venta
metodos_pago -> pagos_venta
ventas -> devoluciones_venta -> devoluciones_venta_detalle
empresa + almacen -> cajas
cortes_caja -> cortes_caja_detalle
clientes -> cotizaciones_venta -> cotizaciones_venta_detalle

Catalogo de cajas:
- cajas.txt registra las cajas fisicas o terminales disponibles por empresa y almacen.
- codigo identifica la terminal de forma legible (por ejemplo, CAJA-01).
- estatus representa su situacion operativa: Disponible, En uso o Fuera de servicio.
- activo indica si la caja forma parte del catalogo: 1 activa, 0 dada de baja.

Folio de venta:
- Las ventas nuevas usan id_caja-id_almacen-id_usuario-YYYYMMDD-consecutivo.
- Ejemplo: 1-1-1-20260818-000001.

IVA automatico:
- impuestos.txt contiene el catalogo fiscal.
- productos_impuestos.txt asigna el impuesto predeterminado al producto.
- El POS consulta esa asignacion y copia la tasa aplicada a ventas_detalle.
- La copia historica evita que cambios futuros alteren ventas anteriores.
- Las asignaciones incluidas son ejemplos; deben validarse fiscalmente.
- precio_venta en inventari_db/productos_precios.txt es el precio publico final con impuesto incluido.
- El POS no suma IVA al precio: lo extrae del total para mostrar el desglose fiscal.

BASE DE DATOS FICTICIA DEL MODULO DE VENTAS

Formato:
- Archivos delimitados por el caracter |
- La primera linea contiene los nombres de las columnas
- Fechas YYYY-MM-DD; fechas con hora YYYY-MM-DD HH:mm:ss
- Un campo vacio representa NULL

Dependencias:
- empresa, producto, usuario, almacen, unidad y lista de precio: ../inventari_db/
- metodo de pago: ../compras_bd/metodos_pago.txt

Flujo:
clientes -> ventas -> ventas_detalle
ventas -> pagos_venta
ventas -> devoluciones_venta -> devoluciones_venta_detalle
cortes_caja -> cortes_caja_detalle
clientes -> cotizaciones_venta -> cotizaciones_venta_detalle

IVA automatico:
- impuestos.txt contiene el catalogo fiscal.
- productos_impuestos.txt asigna el impuesto predeterminado al producto.
- El POS consulta esa asignacion y copia la tasa aplicada a ventas_detalle.
- La copia historica evita que cambios futuros alteren ventas anteriores.
- Las asignaciones incluidas son ejemplos; deben validarse fiscalmente.
- precio_venta en inventari_db/productos_precios.txt es el precio publico final con impuesto incluido.
- El POS no suma IVA al precio: lo extrae del total para mostrar el desglose fiscal.

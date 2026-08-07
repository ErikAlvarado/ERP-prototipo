# Persistencia TXT de Compras

Los archivos de `public/assets` son recursos estáticos: el navegador puede
leerlos, pero no tiene permisos para modificarlos. Por eso el entorno local usa
un pequeño servicio Node enlazado exclusivamente a `127.0.0.1`.

## Ejecución

- `npm start`: inicia Angular y la API TXT.
- `npm run start:angular`: inicia solamente Angular, sin escritura de TXT.
- `npm run data:serve`: inicia solamente la API en el puerto 4311.

Angular envía las operaciones a `/api/compras-txt` mediante
`proxy.conf.json`. La API acepta únicamente operaciones conocidas de
proveedores, relaciones y productos; valida claves foráneas y datos, serializa
las escrituras y reemplaza cada archivo mediante un temporal.

## Producción

Un hosting estático no puede guardar cambios en los TXT incluidos en el
paquete compilado. En un despliegue real se debe ejecutar esta API en un
servidor con almacenamiento persistente y publicar `/api/compras-txt` detrás
del mismo origen que Angular. Para varios usuarios o varias instancias, los TXT
deben sustituirse por PostgreSQL u otra base con transacciones y control de
concurrencia.

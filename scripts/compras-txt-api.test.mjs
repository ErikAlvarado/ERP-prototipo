import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createComprasTxtServer,
  validateComprasTxt,
} from './compras-txt-api.mjs';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DB = join(PROJECT_ROOT, 'public/assets/db');

function parse(text) {
  const lines = text.trim().split(/\r?\n/);
  const columns = lines.shift().split('|');
  return lines.map(line => {
    const values = line.split('|');
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
  });
}

async function table(root, relativePath) {
  return parse(await readFile(join(root, relativePath), 'utf8'));
}

function nextId(rows, field) {
  return Math.max(0, ...rows.map(row => Number(row[field]) || 0)) + 1;
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'erp-compras-api-'));
  const root = join(directory, 'db');
  await cp(SOURCE_DB, root, { recursive: true });
  return { directory, root };
}

async function listen(server) {
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  return `http://127.0.0.1:${address.port}/api/compras-txt`;
}

async function request(url, method, body, expectedStatus = 200) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(result));
  return result;
}

test('persiste proveedor, estado y relaciones en los TXT', async t => {
  const { directory, root } = await fixture();
  const server = createComprasTxtServer({ dbRoot: root });
  const endpoint = await listen(server);
  t.after(async () => {
    await new Promise(resolvePromise => server.close(resolvePromise));
    await rm(directory, { recursive: true, force: true });
  });

  const providersBefore = await table(root, 'compras_bd/proveedores.txt');
  const providerId = nextId(providersBefore, 'id_proveedor');
  await request(`${endpoint}/proveedores`, 'POST', {
    id: providerId,
    idEmpresa: 1,
    razonSocial: 'Proveedor de Prueba SA de CV',
    nombreComercial: 'Proveedor Prueba',
    rfc: 'PPR260807AB1',
    correo: 'prueba.persistencia@example.com',
    telefono: '5551234567',
    direccionFiscal: 'Avenida de Prueba 100, Ciudad de México',
    contacto: 'Persona de Prueba',
  });
  let providers = await table(root, 'compras_bd/proveedores.txt');
  assert.equal(
    providers.find(row => Number(row.id_proveedor) === providerId)?.rfc,
    'PPR260807AB1',
  );

  await request(`${endpoint}/proveedores/${providerId}`, 'PATCH', { activo: false });
  providers = await table(root, 'compras_bd/proveedores.txt');
  assert.equal(
    providers.find(row => Number(row.id_proveedor) === providerId)?.activo,
    '0',
  );
  await request(`${endpoint}/proveedores/${providerId}`, 'PATCH', { activo: true });

  const products = await table(root, 'inventari_db/productos.txt');
  const productId = Number(products[0].id_producto);
  await request(`${endpoint}/proveedores/${providerId}/relaciones`, 'PUT', {
    relaciones: [{
      productoId: productId,
      skuProveedor: 'PRUEBA-SKU-001',
      precioReferencia: 123.45,
      diasEntrega: 4,
      cantidadMinima: 2,
      activo: true,
    }],
  });
  const relations = await table(root, 'compras_bd/proveedores_productos.txt');
  const relation = relations.find(row =>
    Number(row.id_proveedor) === providerId
    && Number(row.id_producto) === productId);
  assert.equal(relation?.precio_referencia, '123.45');
  await validateComprasTxt({ dbRoot: root, requireCoverage: false });
});

test('alta completa escribe producto, precio, inventario, Kardex y proveedor', async t => {
  const { directory, root } = await fixture();
  const server = createComprasTxtServer({ dbRoot: root });
  const endpoint = await listen(server);
  t.after(async () => {
    await new Promise(resolvePromise => server.close(resolvePromise));
    await rm(directory, { recursive: true, force: true });
  });

  const providers = await table(root, 'compras_bd/proveedores.txt');
  const providerId = nextId(providers, 'id_proveedor');
  await request(`${endpoint}/proveedores`, 'POST', {
    id: providerId,
    razonSocial: 'Productos Persistentes SA de CV',
    nombreComercial: 'Productos Persistentes',
    rfc: 'PPE260807CD2',
    correo: 'productos.persistentes@example.com',
    telefono: '5557654321',
    direccionFiscal: 'Calle Persistencia 50, Ciudad de México',
    contacto: 'Contacto Persistente',
  });

  const products = await table(root, 'inventari_db/productos.txt');
  const prices = await table(root, 'inventari_db/productos_precios.txt');
  const inventory = await table(root, 'inventari_db/inventario.txt');
  const productId = nextId(products, 'id_producto');
  const priceId = nextId(prices, 'id_precio');
  const inventoryId = nextId(inventory, 'id_inventario');
  const payload = {
    producto: {
      id: productId,
      idEmpresa: 1,
      sku: 'PERSIST-001',
      codigo: '750999999901',
      producto: 'Producto Persistente',
      descripcion: 'Producto para validar persistencia transaccional.',
      tipo: 'Físico',
      idMarca: 1,
      idCategoria: 2,
      idUnidad: 1,
      estatus: 'Vigente',
      ubicacionDefault: 'A1-99',
      pos: true,
      linea: true,
      requiereReceta: false,
      usarExistencias: true,
      claveSat: '43211700',
      precios: [{
        id: priceId,
        idLista: 1,
        costo: 100,
        precio: 160,
      }],
      inventarios: [{
        id: inventoryId,
        idAlmacen: 1,
        stock: 8,
        stockReorden: 4,
        stockCritico: 2,
        stockMaximo: 20,
        anaquel: 'A1-99',
      }],
    },
    relacion: {
      skuProveedor: 'PROV-PERSIST-001',
      precioReferencia: 95,
      diasEntrega: 3,
      cantidadMinima: 2,
    },
  };
  await request(`${endpoint}/proveedores/${providerId}/productos`, 'POST', payload);

  const savedProduct = (await table(root, 'inventari_db/productos.txt'))
    .find(row => Number(row.id_producto) === productId);
  const savedPrice = (await table(root, 'inventari_db/productos_precios.txt'))
    .find(row => Number(row.id_producto) === productId);
  const savedInventory = (await table(root, 'inventari_db/inventario.txt'))
    .find(row => Number(row.id_producto) === productId);
  const movement = (await table(root, 'inventari_db/kardex_inventario.txt'))
    .find(row =>
      Number(row.id_producto) === productId
      && Number(row.id_almacen) === 1);
  const relation = (await table(root, 'compras_bd/proveedores_productos.txt'))
    .find(row =>
      Number(row.id_proveedor) === providerId
      && Number(row.id_producto) === productId);
  assert.equal(savedProduct?.usar_existencias, '1');
  assert.equal(savedPrice?.margen_ganancia, '60.00');
  assert.equal(savedInventory?.stock, '8.00');
  assert.equal(movement?.id_tipo_movimiento, '1');
  assert.equal(movement?.existencia, '8.00');
  assert.equal(relation?.sku_proveedor, 'PROV-PERSIST-001');
  await validateComprasTxt({ dbRoot: root, requireCoverage: false });

  const countBeforeInvalid = (await table(root, 'inventari_db/productos.txt')).length;
  const invalid = structuredClone(payload);
  invalid.producto.id += 1;
  invalid.producto.sku = 'PERSIST-INVALID';
  invalid.producto.codigo = '750999999902';
  invalid.producto.precios[0].id += 1;
  invalid.producto.inventarios[0].id += 1;
  invalid.producto.inventarios[0].stock = 0;
  await request(
    `${endpoint}/proveedores/${providerId}/productos`,
    'POST',
    invalid,
    400,
  );
  assert.equal(
    (await table(root, 'inventari_db/productos.txt')).length,
    countBeforeInvalid,
  );
});

test('recepción escribe orden, recepción, inventario y Kardex atómicamente', async t => {
  const { directory, root } = await fixture();
  const server = createComprasTxtServer({ dbRoot: root });
  const endpoint = await listen(server);
  t.after(async () => {
    await new Promise(resolvePromise => server.close(resolvePromise));
    await rm(directory, { recursive: true, force: true });
  });
  const provider = (await table(root, 'compras_bd/proveedores.txt'))[0];
  const inventoryBefore = (await table(root, 'inventari_db/inventario.txt'))[0];
  const stockBefore = Number(inventoryBefore.stock);
  const kardexBefore = (await table(root, 'inventari_db/kardex_inventario.txt')).length;
  await request(`${endpoint}/recepciones`, 'POST', {
    folio: 'RC-TEST-0001', orden: 'OC-TEST-0001', proveedor: provider.nombre_comercial,
    almacenId: Number(inventoryBefore.id_almacen), responsableId: 1, fecha: '2026-08-07',
    documento: 'REM-TEST-1', observaciones: 'Recepción automatizada',
    partidas: [{ productoId: Number(inventoryBefore.id_producto), cantidad: 3, costoUnitario: 10 }],
  });
  const inventoryAfter = (await table(root, 'inventari_db/inventario.txt'))
    .find(row => row.id_inventario === inventoryBefore.id_inventario);
  assert.equal(Number(inventoryAfter.stock), stockBefore + 3);
  assert.equal((await table(root, 'compras_bd/recepciones_compra.txt')).at(-1).folio, 'RC-TEST-0001');
  assert.equal((await table(root, 'compras_bd/recepciones_compra_detalle.txt')).at(-1).cantidad_recibida, '3.00');
  const movements = await table(root, 'inventari_db/kardex_inventario.txt');
  assert.equal(movements.length, kardexBefore + 1);
  assert.equal(movements.at(-1).referencia, 'RC-TEST-0001');
  assert.equal(movements.at(-1).id_tipo_movimiento, '5');
  assert.equal(Number(movements.at(-1).existencia), stockBefore + 3);
});

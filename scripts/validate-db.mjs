import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const dbDirectory = resolve(process.cwd(), 'public', 'assets', 'db', 'inventari_db');
const failures = [];
const tables = new Map();

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function readTable(fileName) {
  if (tables.has(fileName)) return tables.get(fileName);

  const rawLines = readFileSync(resolve(dbDirectory, fileName), 'utf8')
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
  const columns = rawLines.shift().split('|');
  const rows = rawLines
    .filter((line) => line.trim())
    .map((line, rowIndex) => {
      const values = line.split('|');
      assert(
        values.length === columns.length,
        `${fileName}, row ${rowIndex + 2}: expected ${columns.length} columns and found ${values.length}.`,
      );
      return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
    });
  const table = { columns, rows };
  tables.set(fileName, table);
  return table;
}

function index(fileName, idColumn) {
  return new Map(readTable(fileName).rows.map((row) => [row[idColumn], row]));
}

function number(value) {
  return Number(value);
}

function validateUnique(fileName, columns) {
  const seen = new Set();
  for (const [rowIndex, row] of readTable(fileName).rows.entries()) {
    const key = columns.map((column) => row[column].trim().toLocaleLowerCase('es-MX')).join('|');
    assert(key.replaceAll('|', ''), `${fileName}, row ${rowIndex + 2}: empty unique key.`);
    assert(!seen.has(key), `${fileName}: duplicate key ${columns.join('+')} = "${key}".`);
    seen.add(key);
  }
}

function normalizeTextKey(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX');
}

function validateUniqueNormalized(fileName, columns) {
  const seen = new Set();
  for (const [rowIndex, row] of readTable(fileName).rows.entries()) {
    const key = columns.map((column) => normalizeTextKey(row[column])).join('|');
    assert(key.replaceAll('|', ''), `${fileName}, row ${rowIndex + 2}: empty normalized unique key.`);
    assert(
      !seen.has(key),
      `${fileName}: duplicate normalized key ${columns.join('+')} = "${key}".`,
    );
    seen.add(key);
  }
}

function validateForeignKey(sourceFile, sourceColumn, targetFile, targetColumn, optional = false) {
  const targetIds = new Set(readTable(targetFile).rows.map((row) => row[targetColumn]));
  for (const [rowIndex, row] of readTable(sourceFile).rows.entries()) {
    const value = row[sourceColumn];
    if (optional && !value) continue;
    assert(
      targetIds.has(value),
      `${sourceFile}, row ${rowIndex + 2}: ${sourceColumn}="${value}" does not exist in ${targetFile}.${targetColumn}.`,
    );
  }
}

for (const fileName of readdirSync(dbDirectory).filter((file) => file.endsWith('.txt')).sort()) {
  readTable(fileName);
}

const primaryKeys = [
  ['almacenes.txt', ['id_almacen']],
  ['anaqueles.txt', ['id_anaquel']],
  ['categorias.txt', ['id_categoria']],
  ['componentes_kit.txt', ['id_componente_kit']],
  ['detalle_transferencia.txt', ['id_transferencia', 'id_producto']],
  ['empresas.txt', ['id_empresa']],
  ['estados_transferencia.txt', ['id_estado_transferencia']],
  ['inventario.txt', ['id_inventario']],
  ['kardex_inventario.txt', ['id_movimiento']],
  ['listas_precios.txt', ['id_lista_precio']],
  ['marcas.txt', ['id_marca']],
  ['medidas.txt', ['id_medida']],
  ['permisos.txt', ['id_permiso']],
  ['producto_imagenes.txt', ['id_imagen']],
  ['productos.txt', ['id_producto']],
  ['productos_precios.txt', ['id_precio']],
  ['roles.txt', ['id_rol']],
  ['roles_permisos.txt', ['id_rol', 'id_permiso']],
  ['tipos_movimiento.txt', ['id_tipo_movimiento']],
  ['transferencias.txt', ['id_transferencia']],
  ['unidades.txt', ['id_unidad']],
  ['usuario_roles.txt', ['id_usuario_rol']],
  ['usuarios.txt', ['id_usuario']],
];
for (const [fileName, columns] of primaryKeys) validateUnique(fileName, columns);

const foreignKeys = [
  ['almacenes.txt', 'id_empresa', 'empresas.txt', 'id_empresa'],
  ['almacenes.txt', 'creado_por_usuario', 'usuarios.txt', 'id_usuario'],
  ['almacenes.txt', 'actualizado_por_usuario', 'usuarios.txt', 'id_usuario'],
  ['anaqueles.txt', 'id_almacen', 'almacenes.txt', 'id_almacen'],
  ['categorias.txt', 'id_empresa', 'empresas.txt', 'id_empresa'],
  ['categorias.txt', 'id_categoria_padre', 'categorias.txt', 'id_categoria', true],
  ['componentes_kit.txt', 'id_producto_kit', 'productos.txt', 'id_producto'],
  ['componentes_kit.txt', 'id_producto_hijo', 'productos.txt', 'id_producto'],
  ['detalle_transferencia.txt', 'id_transferencia', 'transferencias.txt', 'id_transferencia'],
  ['detalle_transferencia.txt', 'id_producto', 'productos.txt', 'id_producto'],
  ['empresas.txt', 'creado_por_usuario', 'usuarios.txt', 'id_usuario'],
  ['empresas.txt', 'actualizado_por_usuario', 'usuarios.txt', 'id_usuario'],
  ['inventario.txt', 'id_producto', 'productos.txt', 'id_producto'],
  ['inventario.txt', 'id_almacen', 'almacenes.txt', 'id_almacen'],
  ['inventario.txt', 'id_anaquel', 'anaqueles.txt', 'id_anaquel'],
  ['kardex_inventario.txt', 'id_producto', 'productos.txt', 'id_producto'],
  ['kardex_inventario.txt', 'id_almacen', 'almacenes.txt', 'id_almacen'],
  ['kardex_inventario.txt', 'id_tipo_movimiento', 'tipos_movimiento.txt', 'id_tipo_movimiento'],
  ['kardex_inventario.txt', 'id_usuario', 'usuarios.txt', 'id_usuario'],
  ['listas_precios.txt', 'id_empresa', 'empresas.txt', 'id_empresa'],
  ['marcas.txt', 'id_empresa', 'empresas.txt', 'id_empresa'],
  ['medidas.txt', 'id_unidad', 'unidades.txt', 'id_unidad'],
  ['producto_imagenes.txt', 'id_producto', 'productos.txt', 'id_producto'],
  ['productos.txt', 'id_empresa', 'empresas.txt', 'id_empresa'],
  ['productos.txt', 'id_marca', 'marcas.txt', 'id_marca'],
  ['productos.txt', 'id_categoria', 'categorias.txt', 'id_categoria'],
  ['productos.txt', 'id_unidad', 'unidades.txt', 'id_unidad'],
  ['productos_precios.txt', 'id_producto', 'productos.txt', 'id_producto'],
  ['productos_precios.txt', 'id_lista_precio', 'listas_precios.txt', 'id_lista_precio'],
  ['roles.txt', 'id_empresa', 'empresas.txt', 'id_empresa'],
  ['roles.txt', 'creado_por_usuario', 'usuarios.txt', 'id_usuario'],
  ['roles.txt', 'actualizado_por_usuario', 'usuarios.txt', 'id_usuario'],
  ['roles_permisos.txt', 'id_rol', 'roles.txt', 'id_rol'],
  ['roles_permisos.txt', 'id_permiso', 'permisos.txt', 'id_permiso'],
  ['transferencias.txt', 'id_empresa', 'empresas.txt', 'id_empresa'],
  ['transferencias.txt', 'id_almacen_origen', 'almacenes.txt', 'id_almacen'],
  ['transferencias.txt', 'id_almacen_destino', 'almacenes.txt', 'id_almacen'],
  ['transferencias.txt', 'id_estado_transferencia', 'estados_transferencia.txt', 'id_estado_transferencia'],
  ['transferencias.txt', 'id_usuario_solicita', 'usuarios.txt', 'id_usuario'],
  ['transferencias.txt', 'id_usuario_autoriza', 'usuarios.txt', 'id_usuario', true],
  ['unidades.txt', 'id_empresa', 'empresas.txt', 'id_empresa'],
  ['usuario_roles.txt', 'id_usuario', 'usuarios.txt', 'id_usuario'],
  ['usuario_roles.txt', 'id_rol', 'roles.txt', 'id_rol'],
  ['usuario_roles.txt', 'asignado_por_usuario', 'usuarios.txt', 'id_usuario'],
  ['usuarios.txt', 'id_empresa', 'empresas.txt', 'id_empresa'],
  ['usuarios.txt', 'id_almacen_defecto', 'almacenes.txt', 'id_almacen'],
  ['usuarios.txt', 'creado_por_usuario', 'usuarios.txt', 'id_usuario'],
  ['usuarios.txt', 'actualizado_por_usuario', 'usuarios.txt', 'id_usuario'],
];
for (const relation of foreignKeys) validateForeignKey(...relation);

const products = readTable('productos.txt').rows;
const productById = index('productos.txt', 'id_producto');
const inventory = readTable('inventario.txt').rows;
const shelves = readTable('anaqueles.txt').rows;
const kardex = readTable('kardex_inventario.txt').rows;
const prices = readTable('productos_precios.txt').rows;
const lists = readTable('listas_precios.txt').rows;
const transfers = readTable('transferencias.txt').rows;
const transferDetails = readTable('detalle_transferencia.txt').rows;
const companyById = index('empresas.txt', 'id_empresa');
const warehouseById = index('almacenes.txt', 'id_almacen');
const shelfById = index('anaqueles.txt', 'id_anaquel');
const categoryById = index('categorias.txt', 'id_categoria');
const brandById = index('marcas.txt', 'id_marca');
const unitById = index('unidades.txt', 'id_unidad');
const priceListById = index('listas_precios.txt', 'id_lista_precio');
const roleById = index('roles.txt', 'id_rol');

const expectedShelfColumns = [
  'id_anaquel',
  'id_almacen',
  'nombre_anaquel',
  'activo',
  'fecha_creacion',
  'fecha_actualizacion',
];
assert(
  JSON.stringify(readTable('anaqueles.txt').columns) === JSON.stringify(expectedShelfColumns),
  `anaqueles.txt: expected columns ${expectedShelfColumns.join('|')}.`,
);
assert(
  readTable('inventario.txt').columns.includes('id_anaquel')
    && !readTable('inventario.txt').columns.includes('anaquel'),
  'inventario.txt: id_anaquel must replace the legacy anaquel text column.',
);

for (const tableName of ['productos.txt', 'inventario.txt', 'kardex_inventario.txt']) {
  const columns = readTable(tableName).columns.map((column) => column.toLocaleLowerCase('es-MX'));
  assert(
    !columns.some((column) => column.includes('lote') || column.includes('caduc')),
    `${tableName}: lot/expiration columns must not be present.`,
  );
}

validateUnique('productos.txt', ['id_empresa', 'sku']);
validateUnique('productos.txt', ['id_empresa', 'codigo_barras']);
validateUnique('usuarios.txt', ['id_empresa', 'email']);
validateUnique('inventario.txt', ['id_producto', 'id_almacen']);
validateUniqueNormalized('anaqueles.txt', ['id_almacen', 'nombre_anaquel']);
validateUnique('unidades.txt', ['id_empresa', 'nombre', 'abreviatura', 'permitir_decimales']);
validateUnique('componentes_kit.txt', ['id_producto_kit', 'id_producto_hijo']);

for (const shelf of shelves) {
  assert(shelf.nombre_anaquel.trim(), `Shelf ${shelf.id_anaquel}: name is required.`);
  assert(['0', '1'].includes(shelf.activo), `Shelf ${shelf.id_anaquel}: activo must be 0 or 1.`);
  assert(
    !shelf.fecha_actualizacion || shelf.fecha_actualizacion >= shelf.fecha_creacion,
    `Shelf ${shelf.id_anaquel}: update date precedes creation date.`,
  );
}

for (const product of products) {
  assert(companyById.has(product.id_empresa), `Product ${product.id_producto}: company does not exist.`);
  assert(
    brandById.get(product.id_marca)?.id_empresa === product.id_empresa,
    `Product ${product.id_producto}: brand belongs to another company.`,
  );
  assert(
    categoryById.get(product.id_categoria)?.id_empresa === product.id_empresa,
    `Product ${product.id_producto}: category belongs to another company.`,
  );
  assert(
    unitById.get(product.id_unidad)?.id_empresa === product.id_empresa,
    `Product ${product.id_producto}: unit belongs to another company.`,
  );
  const totalStock = inventory
    .filter((row) => row.id_producto === product.id_producto)
    .reduce((total, row) => total + number(row.stock), 0);
  assert(totalStock > 0, `Product ${product.id_producto} (${product.nombre_producto}) has no positive stock.`);
  assert(
    prices.some((price) => price.id_producto === product.id_producto),
    `Product ${product.id_producto} (${product.nombre_producto}) has no price.`,
  );
}

for (const row of inventory) {
  assert(
    productById.get(row.id_producto)?.id_empresa === warehouseById.get(row.id_almacen)?.id_empresa,
    `Inventory ${row.id_inventario}: product and warehouse belong to different companies.`,
  );
  const shelf = row.id_anaquel ? shelfById.get(row.id_anaquel) : undefined;
  assert(
    shelf && shelf.id_almacen === row.id_almacen,
    `Inventory ${row.id_inventario}: shelf ${row.id_anaquel} belongs to another warehouse.`,
  );
  const critical = number(row.stock_critico);
  const reorder = number(row.stock_reorden);
  const maximum = number(row.stock_maximo);
  assert(number(row.stock) >= 0, `Inventory ${row.id_inventario}: stock cannot be negative.`);
  assert(
    critical >= 0 && critical <= reorder && reorder <= maximum,
    `Inventory ${row.id_inventario}: thresholds must satisfy critical <= reorder <= maximum.`,
  );

  const movements = kardex
    .filter((movement) => movement.id_producto === row.id_producto && movement.id_almacen === row.id_almacen)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || number(a.id_movimiento) - number(b.id_movimiento));
  assert(movements.length > 0, `Inventory ${row.id_inventario}: missing Kardex movements.`);
  const lastMovement = movements.at(-1);
  if (lastMovement) {
    assert(
      Math.abs(number(lastMovement.existencia) - number(row.stock)) < 0.001,
      `Inventory ${row.id_inventario}: stock ${row.stock} differs from latest Kardex balance ${lastMovement.existencia}.`,
    );
  }
}

for (const price of prices) {
  assert(
    productById.get(price.id_producto)?.id_empresa === priceListById.get(price.id_lista_precio)?.id_empresa,
    `Price ${price.id_precio}: product and price list belong to different companies.`,
  );
  const cost = number(price.precio_costo);
  const sale = number(price.precio_venta);
  const expectedMargin = cost > 0 ? ((sale - cost) / cost) * 100 : 0;
  assert(cost >= 0 && sale >= 0, `Price ${price.id_precio}: amounts cannot be negative.`);
  assert(
    Math.abs(number(price.margen_ganancia) - expectedMargin) <= 0.011,
    `Price ${price.id_precio}: margin ${price.margen_ganancia} should be ${expectedMargin.toFixed(2)}.`,
  );
  assert(
    !price.fecha_fin || price.fecha_fin >= price.fecha_inicio,
    `Price ${price.id_precio}: end date precedes start date.`,
  );
}

for (const company of readTable('empresas.txt').rows.filter((row) => row.activo === '1')) {
  const defaultLists = lists.filter(
    (row) => row.id_empresa === company.id_empresa && row.activo === '1' && row.es_predeterminado === '1',
  );
  assert(defaultLists.length === 1, `Company ${company.id_empresa}: expected exactly one active default price list.`);
  const mainWarehouses = readTable('almacenes.txt').rows.filter(
    (row) => row.id_empresa === company.id_empresa && row.activo === '1' && row.es_principal === '1',
  );
  assert(mainWarehouses.length === 1, `Company ${company.id_empresa}: expected exactly one active main warehouse.`);
}

for (const component of readTable('componentes_kit.txt').rows) {
  const kit = productById.get(component.id_producto_kit);
  const child = productById.get(component.id_producto_hijo);
  assert(kit?.tipo === 'Kit', `Kit component ${component.id_componente_kit}: parent product is not a Kit.`);
  assert(
    kit?.id_empresa === child?.id_empresa,
    `Kit component ${component.id_componente_kit}: parent and child belong to different companies.`,
  );
  assert(
    component.id_producto_kit !== component.id_producto_hijo,
    `Kit component ${component.id_componente_kit}: a kit cannot contain itself.`,
  );
  assert(number(component.cantidad) > 0, `Kit component ${component.id_componente_kit}: quantity must be positive.`);
}

for (const transfer of transfers) {
  assert(
    warehouseById.get(transfer.id_almacen_origen)?.id_empresa === transfer.id_empresa &&
      warehouseById.get(transfer.id_almacen_destino)?.id_empresa === transfer.id_empresa,
    `Transfer ${transfer.id_transferencia}: warehouses and transfer must belong to the same company.`,
  );
  assert(
    transfer.id_almacen_origen !== transfer.id_almacen_destino,
    `Transfer ${transfer.id_transferencia}: origin and destination must differ.`,
  );
  assert(
    !transfer.fecha_autorizacion || transfer.fecha_autorizacion >= transfer.fecha_solicitud,
    `Transfer ${transfer.id_transferencia}: authorization precedes request.`,
  );
  assert(
    !transfer.fecha_recepcion ||
      ((transfer.fecha_autorizacion || transfer.fecha_solicitud) <= transfer.fecha_recepcion),
    `Transfer ${transfer.id_transferencia}: receipt precedes authorization/request.`,
  );
  assert(
    Boolean(transfer.fecha_autorizacion) === Boolean(transfer.id_usuario_autoriza),
    `Transfer ${transfer.id_transferencia}: authorization date and user must be recorded together.`,
  );

  const details = transferDetails.filter((detail) => detail.id_transferencia === transfer.id_transferencia);
  assert(details.length > 0, `Transfer ${transfer.id_transferencia}: missing line items.`);
  for (const detail of details) {
    const requested = number(detail.cantidad_solicitada);
    const sent = number(detail.cantidad_enviada);
    const received = number(detail.cantidad_recibida);
    assert(requested > 0, `Transfer ${transfer.id_transferencia}: requested quantity must be positive.`);
    assert(sent >= 0 && sent <= requested, `Transfer ${transfer.id_transferencia}: invalid sent quantity.`);
    assert(received >= 0 && received <= sent, `Transfer ${transfer.id_transferencia}: invalid received quantity.`);

    if (received > 0) {
      const movements = kardex.filter(
        (movement) =>
          movement.id_tipo_movimiento === '4' &&
          movement.id_producto === detail.id_producto &&
          movement.referencia === transfer.folio,
      );
      assert(
        movements.some(
          (movement) =>
            movement.id_almacen === transfer.id_almacen_origen && number(movement.cantidad) === -received,
        ),
        `Transfer ${transfer.id_transferencia}: missing source Kardex movement for product ${detail.id_producto}.`,
      );
      assert(
        movements.some(
          (movement) =>
            movement.id_almacen === transfer.id_almacen_destino && number(movement.cantidad) === received,
        ),
        `Transfer ${transfer.id_transferencia}: missing destination Kardex movement for product ${detail.id_producto}.`,
      );
    }
  }
}

for (const category of readTable('categorias.txt').rows) {
  if (!category.id_categoria_padre) continue;
  assert(
    categoryById.get(category.id_categoria_padre)?.id_empresa === category.id_empresa,
    `Category ${category.id_categoria}: parent belongs to another company.`,
  );
}

for (const user of readTable('usuarios.txt').rows) {
  assert(
    warehouseById.get(user.id_almacen_defecto)?.id_empresa === user.id_empresa,
    `User ${user.id_usuario}: default warehouse belongs to another company.`,
  );
}

for (const relation of readTable('usuario_roles.txt').rows) {
  const user = index('usuarios.txt', 'id_usuario').get(relation.id_usuario);
  assert(
    user?.id_empresa === roleById.get(relation.id_rol)?.id_empresa,
    `User-role ${relation.id_usuario_rol}: user and role belong to different companies.`,
  );
}

const administratorPermissionIds = new Set(
  readTable('roles_permisos.txt').rows
    .filter((row) => row.id_rol === '1')
    .map((row) => row.id_permiso),
);
for (const permission of readTable('permisos.txt').rows) {
  assert(
    administratorPermissionIds.has(permission.id_permiso),
    `Administrator role is missing permission ${permission.id_permiso} (${permission.nombre}).`,
  );
}

if (failures.length) {
  console.error(`Database validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Database valid: ${products.length} products, ${inventory.length} inventory rows, ${kardex.length} Kardex movements and ${transfers.length} transfers.`,
  );
}

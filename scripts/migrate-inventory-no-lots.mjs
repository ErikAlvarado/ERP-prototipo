import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dbDirectory = resolve(process.cwd(), 'public', 'assets', 'db', 'inventari_db');
const migrationDate = '2026-07-23';

function readTable(fileName) {
  const filePath = resolve(dbDirectory, fileName);
  const lines = readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
  const columns = lines.shift().split('|');
  const rows = lines
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split('|');
      return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
    });
  return { fileName, columns, rows };
}

function readTableOrCreate(fileName, columns) {
  return existsSync(resolve(dbDirectory, fileName))
    ? readTable(fileName)
    : { fileName, columns, rows: [] };
}

function writeFileIfChanged(filePath, lines) {
  const previous = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  const newline = previous.includes('\r\n') || (!previous && process.platform === 'win32')
    ? '\r\n'
    : '\n';
  const content = `${lines.join(newline)}${newline}`;

  if (previous !== content) writeFileSync(filePath, content, 'utf8');
}

function writeTable(table) {
  const lines = [
    table.columns.join('|'),
    ...table.rows.map((row) => table.columns.map((column) => row[column] ?? '').join('|')),
  ];
  writeFileIfChanged(resolve(dbDirectory, table.fileName), lines);
}

function removeColumns(table, columnsToRemove) {
  const removed = new Set(columnsToRemove);
  table.columns = table.columns.filter((column) => !removed.has(column));
  for (const row of table.rows) {
    for (const column of removed) delete row[column];
  }
}

function number(value) {
  return Number(value) || 0;
}

function decimal(value) {
  return number(value).toFixed(2);
}

function nextId(rows, field) {
  return Math.max(0, ...rows.map((row) => number(row[field]))) + 1;
}

function inventoryKey(productId, warehouseId) {
  return `${productId}|${warehouseId}`;
}

function normalizeShelfName(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX');
}

function shelfKey(warehouseId, name) {
  return `${warehouseId}|${normalizeShelfName(name)}`;
}

const products = readTable('productos.txt');
const inventory = readTable('inventario.txt');
const kardex = readTable('kardex_inventario.txt');
const prices = readTable('productos_precios.txt');
const transfers = readTable('transferencias.txt');
const transferDetails = readTable('detalle_transferencia.txt');
const units = readTable('unidades.txt');
const measures = readTable('medidas.txt');
const permissions = readTable('permisos.txt');
const rolePermissions = readTable('roles_permisos.txt');
const companies = readTable('empresas.txt');
const warehouses = readTable('almacenes.txt');
const users = readTable('usuarios.txt');
const kitComponents = readTable('componentes_kit.txt');
const shelves = readTableOrCreate('anaqueles.txt', [
  'id_anaquel',
  'id_almacen',
  'nombre_anaquel',
  'activo',
  'fecha_creacion',
  'fecha_actualizacion',
]);

// Accept the short-lived draft column name while always writing the canonical
// schema used by the rest of inventari_db.
if (shelves.columns.includes('nombre') && !shelves.columns.includes('nombre_anaquel')) {
  shelves.columns[shelves.columns.indexOf('nombre')] = 'nombre_anaquel';
  for (const shelf of shelves.rows) {
    shelf.nombre_anaquel = shelf.nombre;
    delete shelf.nombre;
  }
}

let shelfId = nextId(shelves.rows, 'id_anaquel');
const shelfById = new Map(shelves.rows.map((row) => [row.id_anaquel, row]));
const shelfByKey = new Map();
for (const shelf of [...shelves.rows].sort((a, b) => number(a.id_anaquel) - number(b.id_anaquel))) {
  const key = shelfKey(shelf.id_almacen, shelf.nombre_anaquel);
  if (shelfByKey.has(key)) continue;
  shelfByKey.set(key, shelf);
}

function ensureShelf(warehouseId, name, date = migrationDate) {
  const cleanName = String(name || '').trim();
  if (!warehouseId || !cleanName || cleanName === '—' || cleanName === '-') return '';
  const key = shelfKey(warehouseId, cleanName);
  const existing = shelfByKey.get(key);
  if (existing) return existing.id_anaquel;

  const shelf = {
    id_anaquel: String(shelfId++),
    id_almacen: String(warehouseId),
    nombre_anaquel: cleanName,
    activo: '1',
    fecha_creacion: date || migrationDate,
    fecha_actualizacion: date || migrationDate,
  };
  shelves.rows.push(shelf);
  shelfById.set(shelf.id_anaquel, shelf);
  shelfByKey.set(key, shelf);
  return shelf.id_anaquel;
}

// Normalize the former free-text shelf on inventory into a catalog FK. Existing
// id_anaquel values are preserved; every base inventory row gets an assignment.
if (!inventory.columns.includes('id_anaquel')) {
  const warehouseColumn = inventory.columns.indexOf('id_almacen');
  inventory.columns.splice(warehouseColumn + 1, 0, 'id_anaquel');
}
for (const row of inventory.rows) {
  if (row.id_anaquel) {
    const shelf = shelfById.get(row.id_anaquel);
    if (!shelf) {
      throw new Error(
        `Inventory ${row.id_inventario} references missing shelf ${row.id_anaquel}.`,
      );
    }
    if (shelf.id_almacen !== row.id_almacen) {
      throw new Error(
        `Inventory ${row.id_inventario} references shelf ${row.id_anaquel} from another warehouse.`,
      );
    }
    continue;
  }
  row.id_anaquel = ensureShelf(
    row.id_almacen,
    row.anaquel || `INI-${String(row.id_producto).padStart(3, '0')}`,
    row.fecha_actualizacion || migrationDate,
  );
}
removeColumns(inventory, ['anaquel']);

removeColumns(products, ['usar_lotes_caducidades']);
removeColumns(inventory, ['lote', 'fecha_caducidad']);
removeColumns(kardex, ['lote', 'fecha_caducidad']);
for (const movement of kardex.rows) {
  movement.observaciones = movement.observaciones.replace(
    /conteo de lote/gi,
    'conteo de inventario',
  );
}

// Consolidate duplicate units using the lowest id and update every known FK.
const canonicalUnitBySignature = new Map();
const duplicateUnitIds = new Map();
for (const unit of [...units.rows].sort((a, b) => number(a.id_unidad) - number(b.id_unidad))) {
  const signature = [
    unit.id_empresa,
    unit.nombre.trim().toLocaleLowerCase('es-MX'),
    unit.abreviatura.trim().toLocaleLowerCase('es-MX'),
    unit.permitir_decimales,
  ].join('|');
  const canonicalId = canonicalUnitBySignature.get(signature);
  if (canonicalId) duplicateUnitIds.set(unit.id_unidad, canonicalId);
  else canonicalUnitBySignature.set(signature, unit.id_unidad);
}
for (const product of products.rows) {
  product.id_unidad = duplicateUnitIds.get(product.id_unidad) ?? product.id_unidad;
}
for (const measure of measures.rows) {
  measure.id_unidad = duplicateUnitIds.get(measure.id_unidad) ?? measure.id_unidad;
}
units.rows = units.rows.filter((unit) => !duplicateUnitIds.has(unit.id_unidad));

// The administrator role is defined as full access, so keep it in sync with
// every permission declared in the catalog.
const administratorRoleId = '1';
const assignedAdministratorPermissions = new Set(
  rolePermissions.rows
    .filter((row) => row.id_rol === administratorRoleId)
    .map((row) => row.id_permiso),
);
for (const permission of permissions.rows) {
  if (assignedAdministratorPermissions.has(permission.id_permiso)) continue;
  rolePermissions.rows.push({
    id_rol: administratorRoleId,
    id_permiso: permission.id_permiso,
  });
}

for (const transfer of transfers.rows) {
  if (!transfer.fecha_autorizacion) transfer.id_usuario_autoriza = '';
}

// Keep unconfigured sample companies available for reference without presenting
// them as operational tenants. They have no users, warehouses, or products.
for (const company of companies.rows) {
  const hasOperationalData =
    products.rows.some((row) => row.id_empresa === company.id_empresa) ||
    warehouses.rows.some((row) => row.id_empresa === company.id_empresa) ||
    users.rows.some((row) => row.id_empresa === company.id_empresa);
  if (!hasOperationalData) company.activo = '0';
}

// KIT001 is described as keyboard + mouse + USB drive. The additional sample
// rows attached unrelated products from every department to that kit.
const officeKitComponentIds = new Set(['10', '11', '28']);
kitComponents.rows = kitComponents.rows.filter(
  (component) =>
    component.id_producto_kit !== '53' ||
    officeKitComponentIds.has(component.id_producto_hijo),
);

const productsById = new Map(products.rows.map((row) => [row.id_producto, row]));
const latestCostByProduct = new Map();
for (const price of [...prices.rows].sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))) {
  if (price.id_lista_precio === '1') latestCostByProduct.set(price.id_producto, number(price.precio_costo));
}

let inventoryId = nextId(inventory.rows, 'id_inventario');
let movementId = nextId(kardex.rows, 'id_movimiento');
const inventoryByKey = new Map(
  inventory.rows.map((row) => [inventoryKey(row.id_producto, row.id_almacen), row]),
);

// Every catalog product receives an initialized balance in the central warehouse.
for (const product of [...products.rows].sort((a, b) => number(a.id_producto) - number(b.id_producto))) {
  const hasInventory = inventory.rows.some((row) => row.id_producto === product.id_producto);
  if (hasInventory) continue;

  const stock = 10;
  const row = {
    id_inventario: String(inventoryId++),
    id_producto: product.id_producto,
    id_almacen: '1',
    id_anaquel: ensureShelf(
      '1',
      `INI-${String(product.id_producto).padStart(3, '0')}`,
      migrationDate,
    ),
    stock: decimal(stock),
    stock_reorden: decimal(5),
    stock_critico: decimal(2),
    stock_maximo: decimal(50),
    fecha_actualizacion: migrationDate,
  };
  inventory.rows.push(row);
  inventoryByKey.set(inventoryKey(row.id_producto, row.id_almacen), row);
  kardex.rows.push({
    id_movimiento: String(movementId++),
    id_producto: product.id_producto,
    id_almacen: '1',
    id_tipo_movimiento: '1',
    existencia: decimal(stock),
    cantidad: decimal(stock),
    costo_unitario: decimal(latestCostByProduct.get(product.id_producto)),
    observaciones: 'Inventario inicial',
    referencia: `INV-${String(product.id_producto).padStart(3, '0')}`,
    fecha: migrationDate,
    id_usuario: '1',
  });
}

// Some sample adjustments had no opening movement. Add the missing opening balance
// so each Kardex can be reconstructed as initial balance + movements.
for (const inventoryRow of inventory.rows) {
  const related = kardex.rows.filter(
    (row) => row.id_producto === inventoryRow.id_producto && row.id_almacen === inventoryRow.id_almacen,
  );
  if (!related.length || related.some((row) => row.id_tipo_movimiento === '1')) continue;

  const delta = related.reduce((total, row) => total + number(row.cantidad), 0);
  const openingBalance = number(inventoryRow.stock) - delta;
  if (openingBalance <= 0) continue;
  const product = productsById.get(inventoryRow.id_producto);
  const earliestMovement = related.map((row) => row.fecha).filter(Boolean).sort()[0] ?? migrationDate;
  const openingDate = [product?.fecha_creacion, earliestMovement]
    .filter(Boolean)
    .sort()[0] ?? migrationDate;

  kardex.rows.push({
    id_movimiento: String(movementId++),
    id_producto: inventoryRow.id_producto,
    id_almacen: inventoryRow.id_almacen,
    id_tipo_movimiento: '1',
    existencia: decimal(openingBalance),
    cantidad: decimal(openingBalance),
    costo_unitario: decimal(latestCostByProduct.get(inventoryRow.id_producto)),
    observaciones: 'Inventario inicial reconstruido',
    referencia: `INV-${String(inventoryRow.id_producto).padStart(3, '0')}`,
    fecha: openingDate,
    id_usuario: inventoryRow.id_almacen,
  });
}

// Reconcile received sample transfers with current stock and Kardex. The guard makes
// the migration idempotent when it is run more than once.
for (const transfer of transfers.rows.filter((row) => row.fecha_recepcion)) {
  const details = transferDetails.rows.filter((row) => row.id_transferencia === transfer.id_transferencia);
  for (const detail of details) {
    const quantity = number(detail.cantidad_recibida);
    if (quantity <= 0) continue;

    const reference = transfer.folio;
    const alreadyReconciled = kardex.rows.some(
      (row) =>
        row.id_tipo_movimiento === '4' &&
        row.id_producto === detail.id_producto &&
        row.referencia === reference,
    );
    if (alreadyReconciled) continue;

    const sourceKey = inventoryKey(detail.id_producto, transfer.id_almacen_origen);
    const destinationKey = inventoryKey(detail.id_producto, transfer.id_almacen_destino);
    const source = inventoryByKey.get(sourceKey);
    if (!source || number(source.stock) < quantity) {
      throw new Error(`Insufficient stock to reconcile ${reference} for product ${detail.id_producto}.`);
    }

    let destination = inventoryByKey.get(destinationKey);
    if (!destination) {
      destination = {
        id_inventario: String(inventoryId++),
        id_producto: detail.id_producto,
        id_almacen: transfer.id_almacen_destino,
        id_anaquel: ensureShelf(
          transfer.id_almacen_destino,
          `TR-${String(detail.id_producto).padStart(3, '0')}`,
          transfer.fecha_recepcion,
        ),
        stock: decimal(0),
        stock_reorden: source.stock_reorden,
        stock_critico: source.stock_critico,
        stock_maximo: source.stock_maximo,
        fecha_actualizacion: transfer.fecha_recepcion,
      };
      inventory.rows.push(destination);
      inventoryByKey.set(destinationKey, destination);
    }

    const sourceBefore = number(source.stock);
    const destinationBefore = number(destination.stock);
    source.stock = decimal(sourceBefore - quantity);
    destination.stock = decimal(destinationBefore + quantity);
    source.fecha_actualizacion = transfer.fecha_recepcion;
    destination.fecha_actualizacion = transfer.fecha_recepcion;

    const sourceInitial = kardex.rows.find(
      (row) =>
        row.id_producto === detail.id_producto &&
        row.id_almacen === transfer.id_almacen_origen &&
        row.id_tipo_movimiento === '1',
    );
    if (sourceInitial && sourceInitial.fecha > transfer.fecha_solicitud) {
      sourceInitial.fecha = transfer.fecha_solicitud;
    }

    const cost = latestCostByProduct.get(detail.id_producto);
    kardex.rows.push(
      {
        id_movimiento: String(movementId++),
        id_producto: detail.id_producto,
        id_almacen: transfer.id_almacen_origen,
        id_tipo_movimiento: '4',
        existencia: source.stock,
        cantidad: decimal(-quantity),
        costo_unitario: decimal(cost),
        observaciones: `Salida por transferencia a almacén ${transfer.id_almacen_destino}`,
        referencia: reference,
        fecha: transfer.fecha_recepcion,
        id_usuario: transfer.id_usuario_autoriza || transfer.id_usuario_solicita,
      },
      {
        id_movimiento: String(movementId++),
        id_producto: detail.id_producto,
        id_almacen: transfer.id_almacen_destino,
        id_tipo_movimiento: '4',
        existencia: destination.stock,
        cantidad: decimal(quantity),
        costo_unitario: decimal(cost),
        observaciones: `Entrada por transferencia desde almacén ${transfer.id_almacen_origen}`,
        referencia: reference,
        fecha: transfer.fecha_recepcion,
        id_usuario: transfer.id_usuario_autoriza || transfer.id_usuario_solicita,
      },
    );
  }
}

inventory.rows.sort((a, b) => number(a.id_inventario) - number(b.id_inventario));
kardex.rows.sort((a, b) => number(a.id_movimiento) - number(b.id_movimiento));
shelves.rows.sort((a, b) => number(a.id_anaquel) - number(b.id_anaquel));

writeTable(products);
writeTable(inventory);
writeTable(shelves);
writeTable(kardex);
writeTable(units);
writeTable(measures);
writeTable(rolePermissions);
writeTable(transfers);
writeTable(companies);
writeTable(kitComponents);

writeFileIfChanged(
  resolve(dbDirectory, 'tipos_movimiento.txt'),
  [
    'id_tipo_movimiento|nombre|naturaleza|activo',
    '1|Inventario inicial|Entrada|1',
    '2|Salida|Salida|1',
    '3|Ajuste|Ajuste|1',
    '4|Transferencia|Transferencia|1',
  ],
);

console.log(
  `Migration complete: ${products.rows.length} products, ${inventory.rows.length} inventory rows, ${kardex.rows.length} Kardex movements, ${units.rows.length} units.`,
);

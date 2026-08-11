import { createServer } from 'node:http';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_ROOT = resolve(SCRIPT_DIRECTORY, '../public/assets/db');
const DEFAULT_PORT = 4311;
const MAX_BODY_BYTES = 1024 * 1024;

const TABLES = Object.freeze({
  proveedores: {
    file: 'compras_bd/proveedores.txt',
    columns: [
      'id_proveedor',
      'id_empresa',
      'razon_social',
      'nombre_comercial',
      'rfc',
      'correo',
      'telefono',
      'direccion_fiscal',
      'activo',
      'fecha_registro',
    ],
  },
  contactos: {
    file: 'compras_bd/proveedores_contactos.txt',
    columns: [
      'id_contacto',
      'id_proveedor',
      'nombre',
      'puesto',
      'correo',
      'telefono',
      'es_principal',
      'activo',
    ],
  },
  relaciones: {
    file: 'compras_bd/proveedores_productos.txt',
    columns: [
      'id_proveedor_producto',
      'id_proveedor',
      'id_producto',
      'sku_proveedor',
      'precio_referencia',
      'dias_entrega',
      'cantidad_minima',
      'activo',
    ],
  },
  productos: {
    file: 'inventari_db/productos.txt',
    columns: [
      'id_producto',
      'id_empresa',
      'sku',
      'codigo_barras',
      'nombre_producto',
      'tipo',
      'descripcion',
      'id_marca',
      'id_categoria',
      'id_unidad',
      'estatus',
      'ubicacion_default',
      'en_punto_venta',
      'en_catalogo_linea',
      'requiere_receta',
      'usar_existencias',
      'clave_sat',
      'fecha_creacion',
      'fecha_actualizacion',
    ],
  },
  precios: {
    file: 'inventari_db/productos_precios.txt',
    columns: [
      'id_precio',
      'id_producto',
      'id_lista_precio',
      'precio_costo',
      'precio_venta',
      'margen_ganancia',
      'fecha_inicio',
      'fecha_fin',
    ],
  },
  inventario: {
    file: 'inventari_db/inventario.txt',
    columns: null,
  },
  kardex: {
    file: 'inventari_db/kardex_inventario.txt',
    columns: [
      'id_movimiento',
      'id_producto',
      'id_almacen',
      'id_tipo_movimiento',
      'existencia',
      'cantidad',
      'costo_unitario',
      'observaciones',
      'referencia',
      'fecha',
      'id_usuario',
    ],
  },
  ordenes: { file: 'compras_bd/ordenes_compra.txt', columns: null },
  detallesOrden: { file: 'compras_bd/ordenes_compra_detalle.txt', columns: null },
  recepciones: { file: 'compras_bd/recepciones_compra.txt', columns: null },
  detallesRecepcion: { file: 'compras_bd/recepciones_compra_detalle.txt', columns: null },
  empresas: {
    file: 'inventari_db/empresas.txt',
    columns: null,
  },
  categorias: {
    file: 'inventari_db/categorias.txt',
    columns: null,
  },
  marcas: {
    file: 'inventari_db/marcas.txt',
    columns: null,
  },
  unidades: {
    file: 'inventari_db/unidades.txt',
    columns: null,
  },
  almacenes: {
    file: 'inventari_db/almacenes.txt',
    columns: null,
  },
  listasPrecios: {
    file: 'inventari_db/listas_precios.txt',
    columns: null,
  },
});

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function cleanText(value, field, { required = false, max = 255 } = {}) {
  const text = String(value ?? '').trim();
  if (required && !text) {
    throw new RequestError(400, `${field} es obligatorio.`);
  }
  if (text.length > max) {
    throw new RequestError(400, `${field} excede ${max} caracteres.`);
  }
  if (/[\r\n|]/.test(text)) {
    throw new RequestError(400, `${field} contiene un carácter no permitido.`);
  }
  return text;
}

function positiveInteger(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new RequestError(400, `${field} debe ser un entero positivo.`);
  }
  return number;
}

function nonNegativeNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new RequestError(400, `${field} debe ser un número mayor o igual a cero.`);
  }
  return number;
}

function booleanFlag(value) {
  return value === true || value === 1 || value === '1' ? '1' : '0';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function decimal(value) {
  return Number(value).toFixed(2);
}

function nextId(rows, field) {
  return Math.max(0, ...rows.map(row => Number(row[field]) || 0)) + 1;
}

function normalized(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-MX')
    .replace(/\s+/g, ' ');
}

function parseTable(text, definition) {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
  while (lines.length && !lines.at(-1)?.trim()) lines.pop();
  const header = lines.shift()?.split('|').map(column => column.trim()) ?? [];
  if (!header.length) {
    throw new Error(`El archivo ${definition.file} no tiene encabezado.`);
  }
  if (
    definition.columns
    && (header.length !== definition.columns.length
      || header.some((column, index) => column !== definition.columns[index]))
  ) {
    throw new Error(`El encabezado de ${definition.file} no coincide con el esquema esperado.`);
  }
  return {
    columns: header,
    rows: lines
      .filter(line => line.trim())
      .map(line => {
        const values = line.split('|');
        if (values.length !== header.length) {
          throw new Error(`Una fila de ${definition.file} tiene ${values.length} columnas; se esperaban ${header.length}.`);
        }
        return Object.fromEntries(header.map((column, index) => [column, values[index] ?? '']));
      }),
  };
}

function serializeTable(table) {
  const lines = [
    table.columns.join('|'),
    ...table.rows.map(row =>
      table.columns.map(column => cleanText(row[column], column, { max: 2000 })).join('|')),
  ];
  return `${lines.join('\n')}\n`;
}

async function loadTable(dbRoot, key) {
  const definition = TABLES[key];
  const path = join(dbRoot, definition.file);
  const text = await readFile(path, 'utf8');
  return { ...parseTable(text, definition), path };
}

async function replaceAtomically(path, content) {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
  try {
    await rename(temporary, path);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

async function commitTables(tables) {
  const originals = new Map();
  const committed = [];
  try {
    for (const table of tables) {
      originals.set(table.path, await readFile(table.path, 'utf8'));
      await replaceAtomically(table.path, serializeTable(table));
      committed.push(table.path);
    }
  } catch (error) {
    for (const path of committed.reverse()) {
      const original = originals.get(path);
      if (original !== undefined) {
        await replaceAtomically(path, original).catch(() => undefined);
      }
    }
    throw error;
  }
}

async function readJson(request) {
  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new RequestError(415, 'La solicitud debe usar application/json.');
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) {
      throw new RequestError(413, 'La solicitud excede 1 MB.');
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new RequestError(400, 'El cuerpo JSON no es válido.');
  }
}

function sendJson(response, status, body) {
  const content = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(content),
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(content);
}

function assertProviderExists(rows, providerId) {
  const provider = rows.find(row => Number(row.id_proveedor) === providerId);
  if (!provider) throw new RequestError(404, 'El proveedor no existe.');
  return provider;
}

function relationRow(input, providerId, relationId) {
  const productId = positiveInteger(input.productoId, 'productoId');
  const deliveryDays = nonNegativeNumber(input.diasEntrega, 'diasEntrega');
  const minimum = positiveInteger(input.cantidadMinima, 'cantidadMinima');
  return {
    id_proveedor_producto: String(relationId),
    id_proveedor: String(providerId),
    id_producto: String(productId),
    sku_proveedor: cleanText(input.skuProveedor, 'skuProveedor', {
      required: true,
      max: 80,
    }),
    precio_referencia: decimal(nonNegativeNumber(input.precioReferencia, 'precioReferencia')),
    dias_entrega: String(Math.trunc(deliveryDays)),
    cantidad_minima: String(minimum),
    activo: booleanFlag(input.activo ?? true),
  };
}

async function createProvider(dbRoot, payload) {
  const providers = await loadTable(dbRoot, 'proveedores');
  const contacts = await loadTable(dbRoot, 'contactos');
  const companies = await loadTable(dbRoot, 'empresas');
  const id = positiveInteger(payload.id, 'id');
  if (providers.rows.some(row => Number(row.id_proveedor) === id)) {
    throw new RequestError(409, `Ya existe un proveedor con id ${id}.`);
  }
  const businessName = cleanText(payload.razonSocial, 'razón social', {
    required: true,
    max: 150,
  });
  const commercialName = cleanText(payload.nombreComercial, 'nombre comercial', {
    required: true,
    max: 120,
  });
  const email = cleanText(payload.correo, 'correo', { required: true, max: 150 })
    .toLocaleLowerCase('es-MX');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RequestError(400, 'El correo del proveedor no es válido.');
  }
  const rfc = cleanText(payload.rfc, 'RFC', { required: true, max: 13 })
    .toLocaleUpperCase('es-MX');
  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) {
    throw new RequestError(400, 'El RFC debe tener 12 o 13 caracteres y un formato válido.');
  }
  if (providers.rows.some(row =>
    normalized(row.nombre_comercial) === normalized(commercialName)
    || normalized(row.razon_social) === normalized(businessName)
    || row.correo.toLocaleLowerCase('es-MX') === email
    || row.rfc.toLocaleUpperCase('es-MX') === rfc
  )) {
    throw new RequestError(409, 'Ya existe un proveedor con el mismo nombre, RFC o correo.');
  }
  const phone = cleanText(payload.telefono, 'teléfono', { max: 30 });
  const companyId = positiveInteger(payload.idEmpresa ?? 1, 'idEmpresa');
  if (!companies.rows.some(company =>
    Number(company.id_empresa) === companyId && company.activo !== '0')) {
    throw new RequestError(400, 'La empresa del proveedor no existe o está inactiva.');
  }
  providers.rows.push({
    id_proveedor: String(id),
    id_empresa: String(companyId),
    razon_social: businessName,
    nombre_comercial: commercialName,
    rfc,
    correo: email,
    telefono: phone,
    direccion_fiscal: cleanText(payload.direccionFiscal, 'dirección fiscal', {
      required: true,
      max: 255,
    }),
    activo: '1',
    fecha_registro: today(),
  });
  const contactName = cleanText(payload.contacto, 'contacto', { max: 120 });
  if (contactName && !/^sin contacto/i.test(contactName)) {
    contacts.rows.push({
      id_contacto: String(nextId(contacts.rows, 'id_contacto')),
      id_proveedor: String(id),
      nombre: contactName,
      puesto: cleanText(payload.puestoContacto ?? 'Contacto comercial', 'puesto', { max: 100 }),
      correo: cleanText(payload.correoContacto ?? email, 'correo de contacto', { max: 150 }),
      telefono: cleanText(payload.telefonoContacto ?? phone, 'teléfono de contacto', { max: 30 }),
      es_principal: '1',
      activo: '1',
    });
  }
  await commitTables([providers, contacts]);
  return { id };
}

async function updateProviderStatus(dbRoot, providerId, payload) {
  const providers = await loadTable(dbRoot, 'proveedores');
  const provider = assertProviderExists(providers.rows, providerId);
  provider.activo = booleanFlag(payload.activo);
  await commitTables([providers]);
  return { id: providerId, activo: provider.activo === '1' };
}

async function replaceProviderRelations(dbRoot, providerId, payload) {
  const providers = await loadTable(dbRoot, 'proveedores');
  const provider = assertProviderExists(providers.rows, providerId);
  const products = await loadTable(dbRoot, 'productos');
  const relations = await loadTable(dbRoot, 'relaciones');
  if (!Array.isArray(payload.relaciones)) {
    throw new RequestError(400, 'relaciones debe ser una lista.');
  }
  const productIds = new Set(products.rows.map(row => Number(row.id_producto)));
  const productCompanies = new Map(
    products.rows.map(row => [Number(row.id_producto), Number(row.id_empresa)]),
  );
  const pairIds = new Set();
  const existingByProduct = new Map(
    relations.rows
      .filter(row => Number(row.id_proveedor) === providerId)
      .map(row => [Number(row.id_producto), Number(row.id_proveedor_producto)]),
  );
  let followingId = nextId(relations.rows, 'id_proveedor_producto');
  const replacements = payload.relaciones.map(input => {
    const productId = positiveInteger(input.productoId, 'productoId');
    if (!productIds.has(productId)) {
      throw new RequestError(400, `El producto ${productId} no existe.`);
    }
    if (productCompanies.get(productId) !== Number(provider.id_empresa)) {
      throw new RequestError(
        400,
        `El producto ${productId} pertenece a otra empresa.`,
      );
    }
    if (pairIds.has(productId)) {
      throw new RequestError(400, `El producto ${productId} está repetido.`);
    }
    pairIds.add(productId);
    const relationId = existingByProduct.get(productId) ?? followingId++;
    return relationRow(input, providerId, relationId);
  });
  relations.rows = [
    ...relations.rows.filter(row => Number(row.id_proveedor) !== providerId),
    ...replacements,
  ];
  await commitTables([relations]);
  return { proveedorId: providerId, relaciones: replacements.length };
}

async function createProductForProvider(dbRoot, providerId, payload) {
  const providers = await loadTable(dbRoot, 'proveedores');
  const provider = assertProviderExists(providers.rows, providerId);
  if (provider.activo !== '1') {
    throw new RequestError(409, 'El proveedor debe estar activo para registrar productos.');
  }
  const [
    products,
    prices,
    inventory,
    relations,
    kardex,
    companies,
    categories,
    brands,
    units,
    warehouses,
    priceLists,
  ] = await Promise.all([
    loadTable(dbRoot, 'productos'),
    loadTable(dbRoot, 'precios'),
    loadTable(dbRoot, 'inventario'),
    loadTable(dbRoot, 'relaciones'),
    loadTable(dbRoot, 'kardex'),
    loadTable(dbRoot, 'empresas'),
    loadTable(dbRoot, 'categorias'),
    loadTable(dbRoot, 'marcas'),
    loadTable(dbRoot, 'unidades'),
    loadTable(dbRoot, 'almacenes'),
    loadTable(dbRoot, 'listasPrecios'),
  ]);
  const product = payload.producto;
  if (!product || typeof product !== 'object') {
    throw new RequestError(400, 'Falta la información completa del producto.');
  }
  const id = positiveInteger(product.id, 'producto.id');
  const companyId = positiveInteger(product.idEmpresa, 'producto.idEmpresa');
  if (Number(provider.id_empresa) !== companyId) {
    throw new RequestError(
      400,
      'El producto y el proveedor deben pertenecer a la misma empresa.',
    );
  }
  const brandId = positiveInteger(product.idMarca, 'producto.idMarca');
  const categoryId = positiveInteger(product.idCategoria, 'producto.idCategoria');
  const unitId = positiveInteger(product.idUnidad, 'producto.idUnidad');
  const sku = cleanText(product.sku, 'SKU', { required: true, max: 80 }).toLocaleUpperCase('es-MX');
  const barcode = cleanText(product.codigo, 'código de barras', { max: 80 });
  const productName = cleanText(product.producto, 'nombre del producto', {
    required: true,
    max: 180,
  });
  const productType = cleanText(product.tipo, 'tipo', { required: true, max: 60 });
  if (normalized(productType) !== 'fisico') {
    throw new RequestError(400, 'Compras solo puede registrar productos de tipo Físico.');
  }
  if (booleanFlag(product.usarExistencias) !== '1') {
    throw new RequestError(400, 'El producto debe usar existencias.');
  }
  if (products.rows.some(row =>
    Number(row.id_producto) === id
    || normalized(row.sku) === normalized(sku)
    || (barcode && normalized(row.codigo_barras) === normalized(barcode))
  )) {
    throw new RequestError(409, 'Ya existe un producto con el mismo id, SKU o código.');
  }
  const references = [
    [companies.rows, 'id_empresa', companyId, 'empresa', null],
    [categories.rows, 'id_categoria', categoryId, 'categoría', 'id_empresa'],
    [brands.rows, 'id_marca', brandId, 'marca', 'id_empresa'],
    [units.rows, 'id_unidad', unitId, 'unidad', 'id_empresa'],
  ];
  for (const [rows, field, value, label, companyField] of references) {
    if (!rows.some(row =>
      Number(row[field]) === value
      && (!companyField || Number(row[companyField]) === companyId)
    )) {
      throw new RequestError(
        400,
        `La ${label} seleccionada no existe o pertenece a otra empresa.`,
      );
    }
  }
  const date = today();
  products.rows.push({
    id_producto: String(id),
    id_empresa: String(companyId),
    sku,
    codigo_barras: barcode,
    nombre_producto: productName,
    tipo: productType,
    descripcion: cleanText(product.descripcion, 'descripción', { max: 500 }),
    id_marca: String(brandId),
    id_categoria: String(categoryId),
    id_unidad: String(unitId),
    estatus: cleanText(product.estatus ?? 'Vigente', 'estatus', {
      required: true,
      max: 40,
    }),
    ubicacion_default: cleanText(product.ubicacionDefault, 'ubicación', { max: 120 }),
    en_punto_venta: booleanFlag(product.pos),
    en_catalogo_linea: booleanFlag(product.linea),
    requiere_receta: booleanFlag(product.requiereReceta),
    usar_existencias: '1',
    clave_sat: cleanText(product.claveSat, 'clave SAT', { max: 30 }),
    fecha_creacion: date,
    fecha_actualizacion: date,
  });
  const productPrices = Array.isArray(product.precios) ? product.precios : [];
  if (!productPrices.length) {
    throw new RequestError(400, 'El producto debe tener al menos un precio.');
  }
  const usedPriceIds = new Set(prices.rows.map(row => Number(row.id_precio)));
  for (const input of productPrices) {
    const priceId = positiveInteger(input.id, 'precio.id');
    const listId = positiveInteger(input.idLista, 'precio.idLista');
    if (usedPriceIds.has(priceId)) {
      throw new RequestError(409, `El id de precio ${priceId} ya existe.`);
    }
    if (!priceLists.rows.some(row =>
      Number(row.id_lista_precio) === listId
      && Number(row.id_empresa) === companyId
    )) {
      throw new RequestError(400, `La lista de precios ${listId} no corresponde a la empresa.`);
    }
    usedPriceIds.add(priceId);
    const cost = nonNegativeNumber(input.costo, 'precio.costo');
    const salePrice = nonNegativeNumber(input.precio, 'precio.precio');
    const margin = cost > 0 ? ((salePrice - cost) / cost) * 100 : 0;
    prices.rows.push({
      id_precio: String(priceId),
      id_producto: String(id),
      id_lista_precio: String(listId),
      precio_costo: decimal(cost),
      precio_venta: decimal(salePrice),
      margen_ganancia: decimal(margin),
      fecha_inicio: date,
      fecha_fin: '',
    });
  }
  const productInventory = Array.isArray(product.inventarios) ? product.inventarios : [];
  if (!productInventory.length) {
    throw new RequestError(400, 'El producto debe tener inventario en al menos un almacén.');
  }
  const usedInventoryIds = new Set(inventory.rows.map(row => Number(row.id_inventario)));
  const warehouseIds = new Set();
  let movementId = nextId(kardex.rows, 'id_movimiento');
  const initialCost = nonNegativeNumber(productPrices[0]?.costo, 'precio.costo');
  for (const input of productInventory) {
    const inventoryId = positiveInteger(input.id, 'inventario.id');
    const warehouseId = positiveInteger(input.idAlmacen, 'inventario.idAlmacen');
    if (usedInventoryIds.has(inventoryId)) {
      throw new RequestError(409, `El id de inventario ${inventoryId} ya existe.`);
    }
    if (warehouseIds.has(warehouseId)) {
      throw new RequestError(400, `El almacén ${warehouseId} está repetido.`);
    }
    if (!warehouses.rows.some(row =>
      Number(row.id_almacen) === warehouseId
      && Number(row.id_empresa) === companyId
    )) {
      throw new RequestError(400, `El almacén ${warehouseId} no corresponde a la empresa.`);
    }
    usedInventoryIds.add(inventoryId);
    warehouseIds.add(warehouseId);
    const stock = nonNegativeNumber(input.stock, 'inventario.stock');
    const reorder = nonNegativeNumber(input.stockReorden, 'inventario.stockReorden');
    const critical = nonNegativeNumber(input.stockCritico, 'inventario.stockCritico');
    const maximum = nonNegativeNumber(input.stockMaximo, 'inventario.stockMaximo');
    if (critical > reorder || reorder > maximum) {
      throw new RequestError(400, 'El stock debe cumplir: crítico ≤ reorden ≤ máximo.');
    }
    if (stock <= 0 || stock > maximum) {
      throw new RequestError(400, 'El stock inicial debe ser mayor a cero y no exceder el máximo.');
    }
    const shelfField = inventory.columns.includes('id_anaquel') ? 'id_anaquel' : 'anaquel';
    inventory.rows.push({
      id_inventario: String(inventoryId),
      id_producto: String(id),
      id_almacen: String(warehouseId),
      stock: decimal(stock),
      stock_reorden: decimal(reorder),
      stock_critico: decimal(critical),
      stock_maximo: decimal(maximum),
      [shelfField]: shelfField === 'id_anaquel'
        ? (input.idAnaquel == null ? '' : String(positiveInteger(input.idAnaquel, 'inventario.idAnaquel')))
        : cleanText(input.anaquel, 'anaquel', { max: 80 }),
      fecha_actualizacion: date,
    });
    kardex.rows.push({
      id_movimiento: String(movementId++),
      id_producto: String(id),
      id_almacen: String(warehouseId),
      id_tipo_movimiento: '1',
      existencia: decimal(stock),
      cantidad: decimal(stock),
      costo_unitario: decimal(initialCost),
      observaciones: 'Inventario inicial desde alta de proveedor',
      referencia: `ALTA-COM-${id}`,
      fecha: date,
      id_usuario: '1',
    });
  }
  const relation = relationRow({
    ...payload.relacion,
    productoId: id,
    activo: true,
  }, providerId, nextId(relations.rows, 'id_proveedor_producto'));
  relations.rows.push(relation);
  await commitTables([products, prices, inventory, kardex, relations]);
  return { proveedorId: providerId, productoId: id };
}

async function receivePurchase(dbRoot, payload) {
  const [providers, orders, orderDetails, receipts, receiptDetails, inventory, kardex, products, warehouses] = await Promise.all([
    loadTable(dbRoot, 'proveedores'), loadTable(dbRoot, 'ordenes'), loadTable(dbRoot, 'detallesOrden'),
    loadTable(dbRoot, 'recepciones'), loadTable(dbRoot, 'detallesRecepcion'), loadTable(dbRoot, 'inventario'),
    loadTable(dbRoot, 'kardex'), loadTable(dbRoot, 'productos'), loadTable(dbRoot, 'almacenes'),
  ]);
  const orderFolio = cleanText(payload.orden, 'orden', { required: true, max: 40 });
  if (receipts.rows.some(row => row.folio === payload.folio || Number(row.id_orden_compra) === Number(payload.idOrden))) {
    throw new RequestError(409, 'La recepción ya fue registrada.');
  }
  const warehouseId = positiveInteger(payload.almacenId, 'almacenId');
  const warehouse = warehouses.rows.find(row => Number(row.id_almacen) === warehouseId);
  if (!warehouse) throw new RequestError(404, 'El almacén no existe.');
  const provider = providers.rows.find(row => normalized(row.nombre_comercial) === normalized(payload.proveedor)
    || normalized(row.razon_social) === normalized(payload.proveedor));
  if (!provider) throw new RequestError(404, 'El proveedor no existe en proveedores.txt.');
  const inputs = Array.isArray(payload.partidas) ? payload.partidas : [];
  if (!inputs.length) throw new RequestError(400, 'La recepción debe contener productos.');
  let order = orders.rows.find(row => row.folio === orderFolio);
  if (!order) {
    const orderId = nextId(orders.rows, 'id_orden_compra');
    order = {
      id_orden_compra: String(orderId), folio: orderFolio, id_empresa: provider.id_empresa,
      id_proveedor: provider.id_proveedor, id_cotizacion: '', id_almacen_destino: String(warehouseId),
      id_comprador: String(payload.responsableId || 1), id_estatus_compra: '6', id_moneda: '1', tipo_cambio: '1.0000',
      fecha_orden: cleanText(payload.fecha, 'fecha', { required: true, max: 20 }), fecha_entrega_estimada: cleanText(payload.fecha, 'fecha', { required: true, max: 20 }),
      condiciones_pago: 'Contado', observaciones: 'Orden registrada desde recepción de inventario',
    };
    orders.rows.push(order);
  }
  const receiptId = nextId(receipts.rows, 'id_recepcion');
  const receiptFolio = cleanText(payload.folio || `RC-${new Date().getFullYear()}-${String(receiptId).padStart(4, '0')}`, 'folio', { required: true, max: 40 });
  let orderDetailId = nextId(orderDetails.rows, 'id_detalle_orden');
  let receiptDetailId = nextId(receiptDetails.rows, 'id_detalle_recepcion');
  let movementId = nextId(kardex.rows, 'id_movimiento');
  const date = cleanText(payload.fecha, 'fecha', { required: true, max: 20 }).slice(0, 10);
  for (const input of inputs) {
    const productId = positiveInteger(input.productoId, 'productoId');
    const quantity = nonNegativeNumber(input.cantidad, 'cantidad');
    if (quantity <= 0 || !products.rows.some(row => Number(row.id_producto) === productId)) throw new RequestError(400, `Producto ${productId} o cantidad inválida.`);
    const stockRow = inventory.rows.find(row => Number(row.id_producto) === productId && Number(row.id_almacen) === warehouseId);
    if (!stockRow) throw new RequestError(409, `El producto ${productId} no tiene inventario en ${warehouse.nombre_almacen}.`);
    let detail = orderDetails.rows.find(row => Number(row.id_orden_compra) === Number(order.id_orden_compra) && Number(row.id_producto) === productId);
    if (!detail) {
      detail = { id_detalle_orden: String(orderDetailId++), id_orden_compra: order.id_orden_compra, id_producto: String(productId), id_unidad: '1', cantidad_ordenada: decimal(quantity), precio_unitario: decimal(input.costoUnitario || 0), descuento_porcentaje: '0.00', tasa_impuesto: '0.00' };
      orderDetails.rows.push(detail);
    }
    const newStock = Number(stockRow.stock) + quantity;
    stockRow.stock = decimal(newStock); stockRow.fecha_actualizacion = date;
    receiptDetails.rows.push({ id_detalle_recepcion: String(receiptDetailId++), id_recepcion: String(receiptId), id_detalle_orden: detail.id_detalle_orden, cantidad_recibida: decimal(quantity), cantidad_rechazada: '0.00', motivo_rechazo: '' });
    kardex.rows.push({ id_movimiento: String(movementId++), id_producto: String(productId), id_almacen: String(warehouseId), id_tipo_movimiento: '5', existencia: decimal(newStock), cantidad: decimal(quantity), costo_unitario: decimal(input.costoUnitario || 0), observaciones: 'Entrada por recepción de compra', referencia: receiptFolio, fecha: date, id_usuario: String(payload.responsableId || 1) });
  }
  receipts.rows.push({ id_recepcion: String(receiptId), folio: receiptFolio, id_orden_compra: order.id_orden_compra, id_almacen: String(warehouseId), id_responsable: String(payload.responsableId || 1), fecha_recepcion: `${date} 12:00:00`, documento_proveedor: cleanText(payload.documento, 'documento', { max: 80 }), observaciones: cleanText(payload.observaciones || 'Recepción registrada desde Inventario', 'observaciones', { max: 500 }) });
  await commitTables([orders, orderDetails, receipts, receiptDetails, inventory, kardex]);
  return { recepcionId: receiptId, folio: receiptFolio };
}

function router(dbRoot) {
  let writeQueue = Promise.resolve();
  const serializeWrite = operation => {
    const result = writeQueue.then(operation, operation);
    writeQueue = result.catch(() => undefined);
    return result;
  };
  return async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (request.method === 'GET' && url.pathname === '/api/compras-txt/salud') {
        sendJson(response, 200, { ok: true, almacenamiento: 'txt' });
        return;
      }
      if (request.method === 'OPTIONS') {
        throw new RequestError(405, 'CORS no está habilitado; usa el proxy de la aplicación.');
      }
      const providerMatch = url.pathname.match(/^\/api\/compras-txt\/proveedores\/(\d+)$/);
      const relationsMatch = url.pathname.match(/^\/api\/compras-txt\/proveedores\/(\d+)\/relaciones$/);
      const productsMatch = url.pathname.match(/^\/api\/compras-txt\/proveedores\/(\d+)\/productos$/);
      const payload = await readJson(request);
      let result;
      if (request.method === 'POST' && url.pathname === '/api/compras-txt/proveedores') {
        result = await serializeWrite(() => createProvider(dbRoot, payload));
      } else if (request.method === 'PATCH' && providerMatch) {
        result = await serializeWrite(() =>
          updateProviderStatus(dbRoot, Number(providerMatch[1]), payload));
      } else if (request.method === 'PUT' && relationsMatch) {
        result = await serializeWrite(() =>
          replaceProviderRelations(dbRoot, Number(relationsMatch[1]), payload));
      } else if (request.method === 'POST' && productsMatch) {
        result = await serializeWrite(() =>
          createProductForProvider(dbRoot, Number(productsMatch[1]), payload));
      } else if (request.method === 'POST' && url.pathname === '/api/compras-txt/recepciones') {
        result = await serializeWrite(() => receivePurchase(dbRoot, payload));
      } else {
        throw new RequestError(404, 'Ruta no encontrada.');
      }
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        ok: false,
        error: status === 500
          ? 'No fue posible guardar los archivos TXT.'
          : error.message,
      });
    }
  };
}

export function createComprasTxtServer(options = {}) {
  const dbRoot = resolve(options.dbRoot ?? DEFAULT_DB_ROOT);
  return createServer(router(dbRoot));
}

export async function validateComprasTxt(options = {}) {
  const dbRoot = resolve(options.dbRoot ?? DEFAULT_DB_ROOT);
  const requireCoverage = options.requireCoverage ?? true;
  const [providers, products, relations] = await Promise.all([
    loadTable(dbRoot, 'proveedores'),
    loadTable(dbRoot, 'productos'),
    loadTable(dbRoot, 'relaciones'),
  ]);
  const errors = [];
  const providerIds = new Set();
  const productIds = new Set();
  const productCompanies = new Map();
  const providerCompanies = new Map();
  const relationIds = new Set();
  const pairs = new Set();
  for (const provider of providers.rows) {
    const id = Number(provider.id_proveedor);
    if (!Number.isSafeInteger(id) || id <= 0 || providerIds.has(id)) {
      errors.push(`id_proveedor inválido o duplicado: ${provider.id_proveedor}`);
    }
    providerIds.add(id);
    providerCompanies.set(id, Number(provider.id_empresa));
  }
  for (const product of products.rows) {
    const id = Number(product.id_producto);
    if (!Number.isSafeInteger(id) || id <= 0 || productIds.has(id)) {
      errors.push(`id_producto inválido o duplicado: ${product.id_producto}`);
    }
    productIds.add(id);
    productCompanies.set(id, Number(product.id_empresa));
  }
  for (const relation of relations.rows) {
    const id = Number(relation.id_proveedor_producto);
    const providerId = Number(relation.id_proveedor);
    const productId = Number(relation.id_producto);
    const pair = `${providerId}:${productId}`;
    if (!Number.isSafeInteger(id) || id <= 0 || relationIds.has(id)) {
      errors.push(
        `id_proveedor_producto inválido o duplicado: ${relation.id_proveedor_producto}`,
      );
    }
    if (!providerIds.has(providerId)) {
      errors.push(`La relación ${id} apunta al proveedor inexistente ${providerId}.`);
    }
    if (!productIds.has(productId)) {
      errors.push(`La relación ${id} apunta al producto inexistente ${productId}.`);
    }
    if (
      providerCompanies.has(providerId)
      && productCompanies.has(productId)
      && providerCompanies.get(providerId) !== productCompanies.get(productId)
    ) {
      errors.push(
        `La relación ${id} enlaza proveedor y producto de empresas distintas.`,
      );
    }
    if (pairs.has(pair)) {
      errors.push(`La pareja proveedor-producto ${pair} está duplicada.`);
    }
    if (relation.activo === '1' && !relation.sku_proveedor.trim()) {
      errors.push(`La relación activa ${id} no tiene SKU de proveedor.`);
    }
    relationIds.add(id);
    pairs.add(pair);
  }
  if (requireCoverage) {
    const activeProviders = new Set(
      providers.rows
        .filter(provider => provider.activo === '1')
        .map(provider => Number(provider.id_proveedor)),
    );
    const coveredProducts = new Set(
      relations.rows
        .filter(relation =>
          relation.activo === '1'
          && activeProviders.has(Number(relation.id_proveedor)))
        .map(relation => Number(relation.id_producto)),
    );
    for (const product of products.rows.filter(product =>
      normalized(product.estatus) === 'vigente')) {
      const id = Number(product.id_producto);
      if (!coveredProducts.has(id)) {
        errors.push(
          `El producto vigente ${id} (${product.nombre_producto}) no tiene proveedor activo.`,
        );
      }
    }
  }
  if (errors.length) {
    throw new Error(`Compras TXT inválido:\n- ${errors.join('\n- ')}`);
  }
  return {
    proveedores: providers.rows.length,
    productos: products.rows.length,
    relaciones: relations.rows.length,
  };
}

export async function startComprasTxtServer(options = {}) {
  const host = options.host ?? '127.0.0.1';
  const port = Number(options.port ?? process.env.ERP_COMPRAS_DATA_PORT ?? DEFAULT_PORT);
  const server = createComprasTxtServer(options);
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolvePromise();
    });
  });
  console.log(`API TXT de Compras disponible en http://${host}:${port}/api/compras-txt`);
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startComprasTxtServer();
  const close = () => server.close(() => process.exit(0));
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

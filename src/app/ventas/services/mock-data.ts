import { Product } from '../models/product.model';
import { Client } from '../models/client.model';
import { Venta } from '../models/venta.model';
import { Cotizacion } from '../models/cotizacion.model';
import { Devolucion } from '../models/devolucion.model';
import { User } from '../models/user.model';

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', code: 'PROD-001', name: 'Smart TV UHD 55"', sku: 'SKU-TV55-01', price: 8999.00, unit: 'Pza', stock: 15, discount: 0, category: 'Electrónica', brand: 'Samsung', model: 'UN55AU7000' },
  { id: 'p2', code: 'PROD-002', name: 'Laptop Core i7 16GB', sku: 'SKU-LAP-02', price: 18499.00, unit: 'Pza', stock: 8, discount: 0, category: 'Cómputo', brand: 'Dell', model: 'Inspiron 15' },
  { id: 'p3', code: 'PROD-003', name: 'Smartphone Pro 128GB', sku: 'SKU-PHN-03', price: 12999.00, unit: 'Pza', stock: 2, discount: 0, category: 'Telefonía', brand: 'Apple', model: 'iPhone 13' },
  { id: 'p4', code: 'PROD-004', name: 'Teclado Gamer Mecánico KBG500 GameFactor', sku: 'SKU-KBG500', price: 1200.00, unit: 'Pza', stock: 25, discount: 0, category: 'Accesorios', brand: 'GameFactor', model: 'KBG500' },
  { id: 'p5', code: 'PROD-005', name: 'Mouse Ergonómico Inalámbrico', sku: 'SKU-MS-05', price: 850.00, unit: 'Pza', stock: 4, discount: 0, category: 'Accesorios', brand: 'Logitech', model: 'MX Master' },
  { id: 'p6', code: 'PROD-006', name: 'Auriculares Cancelación Ruido', sku: 'SKU-AUD-06', price: 3499.00, unit: 'Pza', stock: 12, discount: 0, category: 'Audio', brand: 'Sony', model: 'WH-1000XM4' },
  { id: 'p7', code: 'PROD-007', name: 'Monitor Gamer IPS 27"', sku: 'SKU-MON-07', price: 5499.00, unit: 'Pza', stock: 5, discount: 0, category: 'Cómputo', brand: 'ASUS', model: 'VG279Q' },
  { id: 'p8', code: 'PROD-008', name: 'Cargador Rápido USB-C 65W', sku: 'SKU-CHG-08', price: 499.00, unit: 'Pza', stock: 50, discount: 0, category: 'Accesorios', brand: 'Anker', model: 'Nano II' }
];

export const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'Público General', email: 'ventas@zyroit.com', phone: '000-000-0000', rfc: 'XAXX010101000', address: 'Venta de Mostrador' },
  { id: 'c2', name: 'Chris Evans', email: 'chris.evans@example.com', phone: '555-019-2834', rfc: 'EVAC810613H10', address: 'Av. Paseo de la Reforma 120, CDMX' },
  { id: 'c3', name: 'María Gómez', email: 'maria.gomez@gmail.com', phone: '333-847-1928', rfc: 'GOMM901005A32', address: 'Colonia Americana, Guadalajara' },
  { id: 'c4', name: 'Juan Pérez', email: 'juan.perez@yahoo.com', phone: '811-923-4567', rfc: 'PERJ850228K89', address: 'San Pedro Garza García, Monterrey' },
  { id: 'c5', name: 'Ana Martínez', email: 'ana.mtz@outlook.com', phone: '442-384-5920', rfc: 'MATA881215B45', address: 'Centro Histórico, Querétaro' }
  ,{ id: 'c6', name: 'Roberto Sánchez', email: 'roberto.sanchez@example.com', phone: '222-510-8841', rfc: 'SARO920421L78', address: 'Angelópolis, Puebla' }
];

export const MOCK_SALES: Venta[] = [
  {
    id: 'v1',
    folio: 'F-10001',
    date: '2026-07-15',
    time: '10:30',
    client: MOCK_CLIENTS[1],
    items: [
      { product: MOCK_PRODUCTS[0], quantity: 1, discount: 5, subtotal: 8549.05 },
      { product: MOCK_PRODUCTS[3], quantity: 2, discount: 15, subtotal: 2040.00 }
    ],
    subtotal: 10589.05,
    tax: 1694.25,
    discount: 809.95,
    total: 12283.30,
    paymentMethod: 'Tarjeta',
    status: 'Pagada',
    cashier: 'Carlos Cajero',
    numProducts: 3,
    observation: 'Crédito autorizado'
  },
  {
    id: 'v2',
    folio: 'F-10002',
    date: '2026-07-16',
    time: '11:15',
    client: MOCK_CLIENTS[0],
    items: [
      { product: MOCK_PRODUCTS[2], quantity: 1, discount: 0, subtotal: 12999.00 }
    ],
    subtotal: 12999.00,
    tax: 2079.84,
    discount: 0.00,
    total: 15078.84,
    paymentMethod: 'Efectivo',
    status: 'Pagada',
    cashier: 'Carlos Cajero',
    numProducts: 1,
    observation: 'Cliente recogerá después'
  },
  {
    id: 'v3',
    folio: 'F-10003',
    date: '2026-07-16',
    time: '13:45',
    client: MOCK_CLIENTS[2],
    items: [
      { product: MOCK_PRODUCTS[4], quantity: 2, discount: 0, subtotal: 1700.00 },
      { product: MOCK_PRODUCTS[5], quantity: 1, discount: 8, subtotal: 3219.08 }
    ],
    subtotal: 4919.08,
    tax: 787.05,
    discount: 279.92,
    total: 5706.13,
    paymentMethod: 'Transferencia',
    status: 'Devuelta',
    cashier: 'Carlos Cajero',
    numProducts: 3,
    observation: 'Devolución en proceso'
  },
  {
    id: 'v4',
    folio: 'F-10004',
    date: '2026-07-16',
    time: '14:20',
    client: MOCK_CLIENTS[3],
    items: [
      { product: MOCK_PRODUCTS[1], quantity: 1, discount: 10, subtotal: 16649.10 },
      { product: MOCK_PRODUCTS[7], quantity: 1, discount: 0, subtotal: 499.00 }
    ],
    subtotal: 17148.10,
    tax: 2743.70,
    discount: 1849.90,
    total: 19891.80,
    paymentMethod: 'Crédito',
    status: 'Crédito pendiente',
    cashier: 'Sofia Supervisor',
    numProducts: 2,
    observation: 'Crédito autorizado'
  },
  {
    id: 'v5',
    folio: 'F-10005',
    date: '2026-07-16',
    time: '15:10',
    client: MOCK_CLIENTS[4],
    items: [
      { product: MOCK_PRODUCTS[6], quantity: 1, discount: 0, subtotal: 5499.00 }
    ],
    subtotal: 5499.00,
    tax: 879.84,
    discount: 0.00,
    total: 6378.84,
    paymentMethod: 'Tarjeta',
    status: 'Producto reservado',
    cashier: 'Carlos Cajero',
    numProducts: 1,
    observation: 'Esperando existencia'
  },
  {
    id: 'v6',
    folio: 'F-10006',
    date: '2026-07-17',
    time: '09:40',
    client: MOCK_CLIENTS[5],
    items: [
      { product: MOCK_PRODUCTS[7], quantity: 3, discount: 0, subtotal: 1497.00 },
      { product: MOCK_PRODUCTS[4], quantity: 1, discount: 0, subtotal: 850.00 }
    ],
    subtotal: 2347.00,
    tax: 375.52,
    discount: 0,
    total: 2722.52,
    paymentMethod: 'Efectivo',
    status: 'Entregada',
    cashier: 'Sofia Supervisor',
    numProducts: 4,
    observation: 'Venta entregada en mostrador'
  }
];

export const MOCK_QUOTES: Cotizacion[] = [
  {
    id: 'q1',
    folio: 'COT-20001',
    date: '2026-07-10',
    expirationDate: '2026-07-25',
    client: MOCK_CLIENTS[2],
    items: [
      { product: MOCK_PRODUCTS[1], quantity: 1, discount: 10, subtotal: 16649.10 }
    ],
    subtotal: 16649.10,
    tax: 2663.86,
    discount: 1849.90,
    total: 19312.96,
    status: 'Vigente'
  },
  {
    id: 'q2',
    folio: 'COT-20002',
    date: '2026-07-11',
    expirationDate: '2026-07-15',
    client: MOCK_CLIENTS[1],
    items: [
      { product: MOCK_PRODUCTS[0], quantity: 2, discount: 5, subtotal: 17098.10 }
    ],
    subtotal: 17098.10,
    tax: 2735.70,
    discount: 899.90,
    total: 19833.80,
    status: 'Vencida'
  },
  {
    id: 'q3',
    folio: 'COT-20003',
    date: '2026-07-14',
    expirationDate: '2026-07-29',
    client: MOCK_CLIENTS[3],
    items: [
      { product: MOCK_PRODUCTS[3], quantity: 5, discount: 15, subtotal: 5100.00 },
      { product: MOCK_PRODUCTS[4], quantity: 5, discount: 0, subtotal: 4250.00 }
    ],
    subtotal: 9350.00,
    tax: 1496.00,
    discount: 900.00,
    total: 10846.00,
    status: 'Convertida'
  },
  {
    id: 'q4', folio: 'COT-20004', date: '2026-07-17', expirationDate: '2026-08-01',
    client: MOCK_CLIENTS[4], items: [{ product: MOCK_PRODUCTS[6], quantity: 2, discount: 5, subtotal: 10448.10 }],
    subtotal: 10448.10, tax: 1671.70, discount: 549.90, total: 12119.80, status: 'Vigente'
  },
  {
    id: 'q5', folio: 'COT-20005', date: '2026-07-18', expirationDate: '2026-08-02',
    client: MOCK_CLIENTS[5], items: [{ product: MOCK_PRODUCTS[2], quantity: 1, discount: 0, subtotal: 12999.00 }],
    subtotal: 12999.00, tax: 2079.84, discount: 0, total: 15078.84, status: 'Vigente'
  },
  {
    id: 'q6', folio: 'COT-20006', date: '2026-07-19', expirationDate: '2026-07-22',
    client: MOCK_CLIENTS[0], items: [{ product: MOCK_PRODUCTS[7], quantity: 10, discount: 10, subtotal: 4491.00 }],
    subtotal: 4491.00, tax: 718.56, discount: 499.00, total: 5209.56, status: 'Cancelada'
  }
];

export const MOCK_RETURNS: Devolucion[] = [
  {
    id: 'r1',
    returnNumber: 'DEV-30001',
    saleFolio: 'F-10003',
    date: '2026-07-16',
    client: MOCK_CLIENTS[2],
    items: [
      { product: MOCK_PRODUCTS[5], quantity: 1 }
    ],
    reason: 'Producto defectuoso',
    status: 'Solicitud creada',
    priority: 'Alta',
    responsibleEmployee: 'Carlos Cajero',
    comment: 'Auricular izquierdo no enciende y no carga.',
    timeline: [
      { status: 'Solicitud creada', date: '2026-07-16 13:48', user: 'Carlos Cajero', completed: true, comment: 'Solicitud iniciada por reporte de cliente.' },
      { status: 'Pendiente de revisión', date: '2026-07-16 14:00', user: 'Carlos Cajero', completed: false },
      { status: 'Esperando respuesta de Inventario', date: '2026-07-16 14:05', user: 'System', completed: false }
    ]
  },
  {
    id: 'r2',
    returnNumber: 'DEV-30002',
    saleFolio: 'F-10001',
    date: '2026-07-14',
    client: MOCK_CLIENTS[1],
    items: [
      { product: MOCK_PRODUCTS[3], quantity: 1 }
    ],
    reason: 'Producto equivocado',
    status: 'Devolución autorizada',
    priority: 'Media',
    responsibleEmployee: 'Sofia Supervisor',
    comment: 'Se le entregó la versión silenciosa en vez de la táctil.',
    inventoryResponse: {
      approved: true,
      timestamp: '2026-07-14 15:30',
      details: 'Ingresado al lote B-12 de devoluciones.',
      batch: 'LOTE-2026B',
      serialNumber: 'SN-KB-RGB-8827',
      warehouseLocation: 'Pasillo 4A, Estante 2'
    },
    timeline: [
      { status: 'Solicitud creada', date: '2026-07-14 14:30', user: 'Carlos Cajero', completed: true, comment: 'Creación de solicitud.' },
      { status: 'Pendiente de revisión', date: '2026-07-14 14:45', user: 'Sofia Supervisor', completed: true, comment: 'Supervisor aprueba revisión inicial.' },
      { status: 'Esperando respuesta de Inventario', date: '2026-07-14 14:50', user: 'System', completed: true, comment: 'Solicitud enviada a almacén.' },
      { status: 'Inventario validando existencia', date: '2026-07-14 15:00', user: 'System-Inventario', completed: true, comment: 'Almacén valida lote.' },
      { status: 'Inventario aprobó ingreso', date: '2026-07-14 15:30', user: 'System-Inventario', completed: true, comment: 'Ingreso aprobado en Pasillo 4A.' },
      { status: 'Devolución autorizada', date: '2026-07-14 15:45', user: 'Sofia Supervisor', completed: true, comment: 'Reembolso por aplicar.' }
    ]
  },
  {
    id: 'r3', returnNumber: 'DEV-30003', saleFolio: 'F-10002', date: '2026-07-17',
    client: MOCK_CLIENTS[0], items: [{ product: MOCK_PRODUCTS[2], quantity: 1 }],
    reason: 'Cambio por garantía', status: 'Pendiente de revisión', priority: 'Alta',
    responsibleEmployee: 'Carlos Cajero', comment: 'El equipo se reinicia durante el uso.',
    timeline: [{ status: 'Solicitud creada', date: '2026-07-17 10:10', user: 'Carlos Cajero', completed: true }]
  },
  {
    id: 'r4', returnNumber: 'DEV-30004', saleFolio: 'F-10004', date: '2026-07-18',
    client: MOCK_CLIENTS[3], items: [{ product: MOCK_PRODUCTS[7], quantity: 1 }],
    reason: 'Producto equivocado', status: 'Esperando respuesta de Inventario', priority: 'Media',
    responsibleEmployee: 'Sofia Supervisor', comment: 'Se requiere cargador de distinta potencia.',
    timeline: [{ status: 'Solicitud creada', date: '2026-07-18 11:20', user: 'Sofia Supervisor', completed: true }]
  },
  {
    id: 'r5', returnNumber: 'DEV-30005', saleFolio: 'F-10005', date: '2026-07-19',
    client: MOCK_CLIENTS[4], items: [{ product: MOCK_PRODUCTS[6], quantity: 1 }],
    reason: 'Producto dañado', status: 'Inventario validando existencia', priority: 'Alta',
    responsibleEmployee: 'Alejandro Admin', comment: 'Pantalla con daño visible al abrir el empaque.',
    timeline: [{ status: 'Solicitud creada', date: '2026-07-19 12:00', user: 'Alejandro Admin', completed: true }]
  },
  {
    id: 'r6', returnNumber: 'DEV-30006', saleFolio: 'F-10006', date: '2026-07-20',
    client: MOCK_CLIENTS[5], items: [{ product: MOCK_PRODUCTS[4], quantity: 1 }],
    reason: 'Cliente cambió de opinión', status: 'Reembolso realizado', priority: 'Baja',
    responsibleEmployee: 'Sofia Supervisor', comment: 'Producto cerrado y en condiciones de reventa.',
    timeline: [{ status: 'Proceso finalizado', date: '2026-07-20 16:30', user: 'Sofia Supervisor', completed: true }]
  }
];

export const MOCK_USERS: User[] = [
  { id: 'u1', employeeId: 'EMP-001', name: 'Carlos Cajero', role: 'Cajero', status: 'Online' },
  { id: 'u2', employeeId: 'EMP-002', name: 'Sofia Supervisor', role: 'Supervisor', status: 'Online' },
  { id: 'u3', employeeId: 'EMP-003', name: 'Alejandro Admin', role: 'Admin', status: 'Online' }
];

export const MOCK_PRODUCT_DETAILS: Record<string, { batch: string, serialNumber: string, location: string }> = {
  'SKU-TV55-01': { batch: 'LOTE-TV-2026', serialNumber: 'SN-TV55-998811', location: 'Sección Electrónica - A1' },
  'SKU-LAP-02': { batch: 'LOTE-LAP-2026', serialNumber: 'SN-LAP-882200', location: 'Caja Fuerte Cómputo' },
  'SKU-PHN-03': { batch: 'LOTE-PHN-2026', serialNumber: 'SN-PHN-773344', location: 'Vitrina Telefonía 1' },
  'SKU-KB-04': { batch: 'LOTE-ACC-2025', serialNumber: 'SN-KB-665544', location: 'Pasillo 4A, Estante 2' },
  'SKU-MS-05': { batch: 'LOTE-ACC-2025', serialNumber: 'SN-MS-554433', location: 'Pasillo 4A, Estante 3' },
  'SKU-AUD-06': { batch: 'LOTE-AUD-2026', serialNumber: 'SN-AUD-443322', location: 'Pasillo 4B, Estante 1' },
  'SKU-MON-07': { batch: 'LOTE-MON-2026', serialNumber: 'SN-MON-332211', location: 'Pasillo C, Estante 5' },
  'SKU-CHG-08': { batch: 'LOTE-ACC-2026', serialNumber: 'SN-CHG-221100', location: 'Pasillo 4A, Canasta 1' }
};

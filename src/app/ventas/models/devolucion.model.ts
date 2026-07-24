import { Client } from './client.model';
import { Product } from './product.model';

export interface DevolucionItem {
  product: Product;
  quantity: number;
}

export type DevolucionReason =
  | 'Producto defectuoso'
  | 'Producto equivocado'
  | 'Error de captura'
  | 'Cambio por garantía'
  | 'Cliente cambió de opinión'
  | 'Producto incompleto'
  | 'Producto dañado'
  | 'Error de precio'
  | 'Otro';

export type DevolucionStatus =
  | 'Solicitud creada'
  | 'Pendiente de revisión'
  | 'Esperando respuesta de Inventario'
  | 'Inventario validando existencia'
  | 'Inventario aprobó ingreso'
  | 'Inventario rechazó ingreso'
  | 'Devolución autorizada'
  | 'Devolución rechazada'
  | 'Reembolso pendiente'
  | 'Reembolso realizado'
  | 'Proceso finalizado';

export type DevolucionPriority = 'Alta' | 'Media' | 'Baja';

export interface DevolucionTimelineStep {
  status: DevolucionStatus;
  date: string; // YYYY-MM-DD HH:MM
  user: string;
  completed: boolean;
  comment?: string;
}

export interface Devolucion {
  id: string;
  returnNumber: string;
  saleFolio: string;
  date: string; // YYYY-MM-DD
  client: Client;
  items: DevolucionItem[];
  reason: DevolucionReason;
  status: DevolucionStatus;
  priority: DevolucionPriority;
  responsibleEmployee: string;
  comment?: string;
  inventoryResponse?: {
    approved: boolean;
    timestamp: string;
    details: string;
    batch?: string;
    serialNumber?: string;
    warehouseLocation?: string;
  };
  timeline: DevolucionTimelineStep[];
}

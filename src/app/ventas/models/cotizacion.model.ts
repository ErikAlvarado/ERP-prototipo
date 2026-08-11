import { Client } from './client.model';
import { VentaItem } from './venta.model';

export type CotizacionStatus = 'Vigente' | 'Convertida' | 'Vencida' | 'Cancelada';

export interface Cotizacion {
  id: string;
  folio: string;
  date: string; // YYYY-MM-DD
  expirationDate: string; // YYYY-MM-DD
  client: Client;
  items: VentaItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: CotizacionStatus;
}

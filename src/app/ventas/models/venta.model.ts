import { Client } from './client.model';
import { Product } from './product.model';

export interface VentaItem {
  product: Product;
  quantity: number;
  discount: number; // percentage
  subtotal: number;
}

export type VentaStatus = 
  | 'Pagada'
  | 'Cancelada'
  | 'Devuelta'
  | 'Pago parcial'
  | 'En espera de inventario'
  | 'Producto reservado'
  | 'Producto sin existencia'
  | 'Producto surtido parcialmente'
  | 'En proceso de entrega'
  | 'Entregada'
  | 'Crédito pendiente'
  | 'Cambio solicitado';

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Vales' | 'Crédito';

export interface PaymentDetails {
  cashReceived?: number;
  changeGiven?: number;
  cardHolderName?: string;
  cardLast4?: string;
  cardBank?: string;
  cardType?: 'Crédito' | 'Débito';
  authorizationCode?: string;
  transferBank?: string;
  transferReference?: string;
  transferFolio?: string;
  voucherCompany?: string;
  voucherNumber?: string;
  creditDays?: number;
  creditNotes?: string;
}

export interface Venta {
  id: string;
  folio: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  client: Client;
  items: VentaItem[];
  subtotal: number;
  tax: number; // IVA 16%
  discount: number; // total discount in cash
  total: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: PaymentDetails;
  operationType?: 'Venta' | 'Cotización';
  status: VentaStatus;
  cashier: string;
  numProducts: number;
  observation: string;
}

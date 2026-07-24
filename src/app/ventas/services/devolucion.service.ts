import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, switchMap, tap } from 'rxjs/operators';
import { Devolucion, DevolucionStatus, DevolucionReason, DevolucionPriority, DevolucionTimelineStep } from '../models/devolucion.model';
import { MOCK_RETURNS } from './mock-data';
import { InventoryService } from './inventory.service';
import { HistorialService } from './historial.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class DevolucionService {
  private returnsSubject = new BehaviorSubject<Devolucion[]>(MOCK_RETURNS);
  public returns$: Observable<Devolucion[]> = this.returnsSubject.asObservable();

  constructor(
    private inventoryService: InventoryService,
    private historialService: HistorialService,
    private notificationService: NotificationService
  ) {}

  getReturns(): Observable<Devolucion[]> {
    return this.returns$.pipe(delay(200));
  }

  getReturnById(id: string): Observable<Devolucion | undefined> {
    return this.returns$.pipe(
      delay(150),
      map(returns => returns.find(r => r.id === id))
    );
  }

  initiateReturn(
    saleFolio: string, 
    items: { product: any; quantity: number }[], 
    reason: DevolucionReason, 
    employee: string,
    priority: DevolucionPriority = 'Media',
    comment: string = ''
  ): Observable<Devolucion | null> {
    // 1. Fetch sale to validate
    return this.historialService.getSaleByFolio(saleFolio).pipe(
      delay(300),
      switchMap(sale => {
        if (!sale) {
          this.notificationService.error(`No se encontró la venta con folio ${saleFolio}`, 'Validación fallida');
          return of(null);
        }

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

        const newReturn: Devolucion = {
          id: 'r' + Math.random().toString(36).substring(2, 9),
          returnNumber: 'DEV-' + (30000 + Math.floor(Math.random() * 70000)),
          saleFolio: sale.folio,
          date: dateStr,
          client: sale.client,
          items: items.map(i => ({ product: i.product, quantity: i.quantity })),
          reason,
          status: 'Solicitud creada',
          priority,
          responsibleEmployee: employee,
          comment,
          timeline: [
            { status: 'Solicitud creada', date: `${dateStr} ${timeStr}`, user: employee, completed: true, comment: 'Solicitud iniciada por cajero.' },
            { status: 'Pendiente de revisión', date: `${dateStr} ${timeStr}`, user: employee, completed: false, comment: 'Esperando aprobación de supervisor.' }
          ]
        };

        const current = this.returnsSubject.value;
        this.returnsSubject.next([newReturn, ...current]);
        
        // Update sale status in logs to indicate return in progress
        this.historialService.updateSaleStatus(sale.folio, 'Cambio solicitado', `Devolución iniciada ${newReturn.returnNumber}`);

        this.notificationService.success(`Solicitud de devolución ${newReturn.returnNumber} creada.`);
        return of(newReturn);
      })
    );
  }

  /**
   * Advance return timeline step and update status
   */
  updateReturnStatus(
    id: string, 
    status: DevolucionStatus, 
    user: string, 
    comment: string = ''
  ): Observable<boolean> {
    return of(true).pipe(
      delay(250),
      map(() => {
        const current = this.returnsSubject.value;
        const idx = current.findIndex(r => r.id === id);
        if (idx > -1) {
          const list = [...current];
          const dev = { ...list[idx] };
          
          const now = new Date();
          const dateStr = now.toISOString().split('T')[0];
          const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
          
          // Complete previous steps in timeline
          const updatedTimeline = dev.timeline.map(t => {
            if (t.status === dev.status) {
              return { ...t, completed: true };
            }
            return t;
          });

          // Add new step
          const newStep: DevolucionTimelineStep = {
            status,
            date: `${dateStr} ${timeStr}`,
            user,
            completed: false,
            comment
          };

          dev.status = status;
          dev.timeline = [...updatedTimeline, newStep];
          list[idx] = dev;
          this.returnsSubject.next(list);
          this.notificationService.info(`Devolución ${dev.returnNumber} pasó a: ${status}`);
          return true;
        }
        return false;
      })
    );
  }

  /**
   * Send Return Request to Inventory and query InventoryService
   */
  sendToInventory(id: string, user: string): Observable<boolean> {
    // 1. Set state to "Esperando respuesta de Inventario"
    return this.updateReturnStatus(id, 'Esperando respuesta de Inventario', user, 'Solicitando autorización de reingreso al almacén.').pipe(
      delay(400),
      switchMap(() => this.getReturnById(id)),
      switchMap(dev => {
        if (!dev) return of(false);
        
        const returnItems = dev.items.map(i => ({ sku: i.product.sku, quantity: i.quantity }));
        
        // 2. Query InventoryService
        return this.inventoryService.requestReturnReentry(dev.returnNumber, returnItems).pipe(
          switchMap(approved => {
            const nextStatus: DevolucionStatus = approved ? 'Inventario aprobó ingreso' : 'Inventario rechazó ingreso';
            
            // Query batches/serial numbers/locations for audit logs
            const sku = dev.items[0]?.product.sku;
            
            return this.inventoryService.getProductBatch(sku).pipe(
              switchMap(batch => this.inventoryService.getProductSerialNumber(sku).pipe(
                switchMap(serial => this.inventoryService.getProductLocation(sku).pipe(
                  switchMap(location => {
                    const current = this.returnsSubject.value;
                    const idx = current.findIndex(r => r.id === id);
                    if (idx > -1) {
                      const list = [...current];
                      const updatedDev = { ...list[idx] };
                      
                      updatedDev.inventoryResponse = {
                        approved,
                        timestamp: new Date().toLocaleString(),
                        details: approved 
                          ? `Lote e inventario validados correctamente. Almacén receptor listo.`
                          : `Error en validación de código de barras o lote en almacén.`,
                        batch,
                        serialNumber: serial,
                        warehouseLocation: location
                      };
                      
                      list[idx] = updatedDev;
                      this.returnsSubject.next(list);
                    }

                    // Advance status
                    return this.updateReturnStatus(
                      id, 
                      nextStatus, 
                      'System-Inventario', 
                      approved 
                        ? `Almacén receptor validó lote ${batch} y número de serie ${serial}.`
                        : `Almacén rechazó validación física.`
                    );
                  })
                ))
              ))
            );
          })
        );
      })
    );
  }

  /**
   * Finalize approval and process refund
   */
  approveRefund(id: string, supervisor: string): Observable<boolean> {
    // 1. Move status to Devolución autorizada -> Reembolso realizado -> Proceso finalizado
    return this.updateReturnStatus(id, 'Devolución autorizada', supervisor, 'Supervisor autoriza reembolso por devolución.').pipe(
      delay(400),
      switchMap(() => this.updateReturnStatus(id, 'Reembolso realizado', 'Caja-Administración', 'Reembolso liquidado al cliente por método original.')),
      delay(300),
      switchMap(() => this.updateReturnStatus(id, 'Proceso finalizado', 'System', 'Devolución cerrada de forma satisfactoria.')),
      tap(() => {
        // Update original sale status in logs to "Devuelta"
        this.getReturnById(id).subscribe(dev => {
          if (dev) {
            this.historialService.updateSaleStatus(dev.saleFolio, 'Devuelta', `Devolución completada ${dev.returnNumber}`);
          }
        });
      })
    );
  }

  /**
   * Reject Return Request
   */
  rejectReturn(id: string, supervisor: string, comment: string): Observable<boolean> {
    return this.updateReturnStatus(id, 'Devolución rechazada', supervisor, comment).pipe(
      delay(300),
      switchMap(() => this.updateReturnStatus(id, 'Proceso finalizado', 'System', 'Proceso concluido con rechazo.')),
      tap(() => {
        // Update original sale back to normal
        this.getReturnById(id).subscribe(dev => {
          if (dev) {
            this.historialService.updateSaleStatus(
              dev.saleFolio, 
              'Pagada', 
              `Devolución rechazada ${dev.returnNumber}: ${comment}`
            );
          }
        });
      })
    );
  }
}

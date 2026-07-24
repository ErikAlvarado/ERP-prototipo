import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HistorialService } from '../../services/historial.service';
import { CotizacionService } from '../../services/cotizacion.service';
import { DevolucionService } from '../../services/devolucion.service';
import { InventoryService } from '../../services/inventory.service';
import { Product } from '../../models/product.model';
import { Venta } from '../../models/venta.model';
import { Cotizacion } from '../../models/cotizacion.model';
import { Devolucion } from '../../models/devolucion.model';
import { MOCK_PRODUCTS } from '../../services/mock-data';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-page animate-fade-in">
      <!-- Welcome Header -->
      <div class="dashboard-welcome">
        <h1>Resumen de Operaciones</h1>
        <p class="text-secondary">Indicadores clave de rendimiento y últimas actividades comerciales.</p>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <!-- KPI 1 -->
        <div class="kpi-card card-premium card-accent">
          <div class="kpi-icon accent-bg">
            <i class="fa-solid fa-dollar-sign"></i>
          </div>
          <div class="kpi-data">
            <span class="kpi-title">Vendido Hoy</span>
            <h3 class="kpi-value">\${{ stats.soldToday | number:'1.2-2' }}</h3>
            <span class="kpi-sub">{{ stats.salesCountToday }} transacciones finalizadas</span>
          </div>
        </div>

        <!-- KPI 2 -->
        <div class="kpi-card card-premium card-primary">
          <div class="kpi-icon primary-bg">
            <i class="fa-solid fa-calendar-days"></i>
          </div>
          <div class="kpi-data">
            <span class="kpi-title">Ventas del Mes</span>
            <h3 class="kpi-value">\${{ stats.soldThisMonth | number:'1.2-2' }}</h3>
            <span class="kpi-sub">{{ stats.salesCountThisMonth }} ventas registradas</span>
          </div>
        </div>

        <!-- KPI 3 -->
        <div class="kpi-card card-premium card-success">
          <div class="kpi-icon success-bg">
            <i class="fa-solid fa-boxes-packing"></i>
          </div>
          <div class="kpi-data">
            <span class="kpi-title">Pocas Existencias</span>
            <h3 class="kpi-value" [class.text-danger]="lowStockCount > 0">{{ lowStockCount }}</h3>
            <span class="kpi-sub">Artículos bajo stock mínimo (5 pzs)</span>
          </div>
        </div>
      </div>

      <!-- Main Columns: Chart & Low Stock -->
      <div class="dashboard-row-main">
        <!-- SVG Interactive area chart -->
        <div class="chart-container card-premium">
          <div class="chart-header">
            <h3>Ventas Semanales</h3>
            <div class="chart-legend">
              <span class="legend-dot dot-accent"></span>
              <span>Ingresos ($ MXN)</span>
            </div>
          </div>
          <div class="svg-wrapper">
            <svg viewBox="0 0 500 200" class="sales-svg-chart">
              <!-- Grid lines -->
              <line x1="40" y1="20" x2="480" y2="20" stroke="#e2e8f0" stroke-dasharray="4" />
              <line x1="40" y1="70" x2="480" y2="70" stroke="#e2e8f0" stroke-dasharray="4" />
              <line x1="40" y1="120" x2="480" y2="120" stroke="#e2e8f0" stroke-dasharray="4" />
              <line x1="40" y1="170" x2="480" y2="170" stroke="#cbd5e1" stroke-width="2" />

              <!-- Chart Area Path -->
              <path 
                d="M 40 170 L 100 130 L 160 145 L 220 90 L 280 60 L 340 100 L 400 50 L 460 30 L 460 170 Z" 
                fill="url(#chart-gradient)" 
                opacity="0.15"
              />

              <!-- Chart Line Path -->
              <path 
                d="M 40 170 L 100 130 L 160 145 L 220 90 L 280 60 L 340 100 L 400 50 L 460 30" 
                fill="none" 
                stroke="var(--accent-color)" 
                stroke-width="3.5" 
                stroke-linecap="round"
              />

              <!-- Data Dots -->
              <circle cx="100" cy="130" r="5" fill="var(--accent-color)" class="chart-dot" />
              <circle cx="160" cy="145" r="5" fill="var(--accent-color)" class="chart-dot" />
              <circle cx="220" cy="90" r="5" fill="var(--accent-color)" class="chart-dot" />
              <circle cx="280" cy="60" r="5" fill="var(--accent-color)" class="chart-dot" />
              <circle cx="340" cy="100" r="5" fill="var(--accent-color)" class="chart-dot" />
              <circle cx="400" cy="50" r="5" fill="var(--accent-color)" class="chart-dot" />
              <circle cx="460" cy="30" r="5" fill="var(--accent-color)" class="chart-dot" />

              <!-- X-Axis Labels -->
              <text x="40" y="190" text-anchor="middle" font-size="9" fill="#94a3b8">Lun</text>
              <text x="100" y="190" text-anchor="middle" font-size="9" fill="#94a3b8">Mar</text>
              <text x="160" y="190" text-anchor="middle" font-size="9" fill="#94a3b8">Mié</text>
              <text x="220" y="190" text-anchor="middle" font-size="9" fill="#94a3b8">Jue</text>
              <text x="280" y="190" text-anchor="middle" font-size="9" fill="#94a3b8">Vie</text>
              <text x="340" y="190" text-anchor="middle" font-size="9" fill="#94a3b8">Sáb</text>
              <text x="400" y="190" text-anchor="middle" font-size="9" fill="#94a3b8">Dom</text>
              <text x="460" y="190" text-anchor="middle" font-size="9" fill="#94a3b8">Hoy</text>

              <!-- Y-Axis Labels -->
              <text x="32" y="173" text-anchor="end" font-size="9" fill="#94a3b8">$0</text>
              <text x="32" y="123" text-anchor="end" font-size="9" fill="#94a3b8">$10K</text>
              <text x="32" y="73" text-anchor="end" font-size="9" fill="#94a3b8">$20K</text>
              <text x="32" y="23" text-anchor="end" font-size="9" fill="#94a3b8">$30K</text>

              <!-- Gradient Def -->
              <defs>
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--accent-color)" />
                  <stop offset="100%" stop-color="var(--accent-color)" stop-opacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <!-- Low Stock Items Panel -->
        <div class="low-stock-panel card-premium">
          <div class="panel-header">
            <h3><i class="fa-solid fa-triangle-exclamation text-warning"></i> Alertas de Stock</h3>
            <span class="alert-count-badge" *ngIf="lowStockCount > 0">{{ lowStockCount }}</span>
          </div>
          <div class="stock-list-container">
            <div class="stock-item" *ngFor="let item of lowStockProducts">
              <div class="stock-main">
                <span class="stock-name font-semibold">{{ item.name }}</span>
                <span class="stock-meta">SKU: {{ item.sku }} | Pasillo: {{ itemLocations[item.sku] || 'Consultando...' }}</span>
              </div>
              <div class="stock-val-wrap">
                <span class="stock-badge font-bold" [class.badge-danger]="item.stock === 0" [class.badge-warning]="item.stock > 0">
                  {{ item.stock }} {{ item.unit }}
                </span>
              </div>
            </div>
            <div class="no-alerts" *ngIf="lowStockProducts.length === 0">
              <i class="fa-solid fa-circle-check text-success"></i>
              <p>Todo el inventario óptimo</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Records Grid -->
      <div class="recent-records-grid">
        <!-- Column 1: Sales -->
        <div class="recent-column card-premium">
          <div class="col-head">
            <h3>Últimas Ventas</h3>
            <a routerLink="/ventas/historial" class="btn-premium btn-text">Ver todas</a>
          </div>
          <div class="record-list">
            <div class="record-card" *ngFor="let sale of recentSales">
              <div class="record-left">
                <span class="record-folio font-bold">{{ sale.folio }}</span>
                <span class="record-sub">{{ sale.client.name }} | {{ sale.date }}</span>
              </div>
              <div class="record-right">
                <span class="record-total font-bold">\${{ sale.total | number:'1.2-2' }}</span>
                <span class="status-dot" [class]="'status-dot-' + sale.status"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 2: Returns -->
        <div class="recent-column card-premium">
          <div class="col-head">
            <h3>Devoluciones</h3>
            <a routerLink="/ventas/gestion-devoluciones" class="btn-premium btn-text">Ver todas</a>
          </div>
          <div class="record-list">
            <div class="record-card" *ngFor="let ret of recentReturns">
              <div class="record-left">
                <span class="record-folio font-bold">{{ ret.returnNumber }}</span>
                <span class="record-sub">{{ ret.client.name }} | {{ ret.date }}</span>
              </div>
              <div class="record-right">
                <span class="badge-custom" [class]="getPriorityClass(ret.priority)">{{ ret.priority }}</span>
                <span class="status-dot" [class]="'status-dot-' + ret.status"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 3: Quotes -->
        <div class="recent-column card-premium">
          <div class="col-head">
            <h3>Cotizaciones</h3>
            <a routerLink="/ventas/cotizaciones" class="btn-premium btn-text">Ver todas</a>
          </div>
          <div class="record-list">
            <div class="record-card" *ngFor="let quote of recentQuotes">
              <div class="record-left">
                <span class="record-folio font-bold">{{ quote.folio }}</span>
                <span class="record-sub">{{ quote.client.name }} | Vence: {{ quote.expirationDate }}</span>
              </div>
              <div class="record-right">
                <span class="record-total font-bold">\${{ quote.total | number:'1.2-2' }}</span>
                <span class="status-dot" [class]="'status-dot-' + quote.status"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Selling Products -->
      <div class="top-selling-section card-premium">
        <h3>Productos Más Vendidos</h3>
        <div class="top-selling-grid">
          <div class="top-product-card" *ngFor="let item of topProducts; let idx = index">
            <div class="top-badge">#{{ idx + 1 }}</div>
            <div class="top-info">
              <h4 class="font-semibold">{{ item.product.name }}</h4>
              <p class="text-secondary text-xs">SKU: {{ item.product.sku }} | Categoría: {{ item.product.category }}</p>
            </div>
            <div class="top-stats">
              <span class="top-qty font-bold">{{ item.soldQty }} vendidos</span>
              <span class="top-rev">\${{ (item.product.price * item.soldQty) | number:'1.2-2' }} MXN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .dashboard-welcome {
      h1 {
        font-size: 1.6rem;
        color: var(--text-primary);
        margin-bottom: 4px;
      }
    }

    /* KPI grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px !important;
    }

    .kpi-icon {
      width: 52px;
      height: 52px;
      border-radius: var(--border-radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }

    .accent-bg { background-color: var(--accent-light); color: var(--accent-color); }
    .primary-bg { background-color: rgba(63, 81, 181, 0.1); color: var(--primary-color); }
    .success-bg { background-color: rgba(0, 150, 136, 0.1); color: var(--success-color); }

    .kpi-data {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .kpi-title {
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .kpi-value {
      font-size: 1.7rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .kpi-sub {
      font-size: 0.76rem;
      color: var(--text-secondary);
    }

    /* Row Main: Chart & Stock alerts */
    .dashboard-row-main {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
    }

    .chart-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        font-size: 1.05rem;
        color: var(--text-primary);
      }
    }

    .chart-legend {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: var(--text-secondary);
    }

    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .dot-accent { background-color: var(--accent-color); }

    .svg-wrapper {
      width: 100%;
      height: 100%;
    }

    .sales-svg-chart {
      width: 100%;
      height: 200px;
    }

    .chart-dot {
      transition: r 0.2s ease;
      cursor: pointer;
      &:hover {
        r: 7;
      }
    }

    /* Low Stock Panel */
    .low-stock-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      h3 { font-size: 1.05rem; }
    }

    .alert-count-badge {
      background-color: var(--danger-color);
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--border-radius-full);
    }

    .stock-list-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 180px;
      overflow-y: auto;
    }

    .stock-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background-color: var(--bg-color);
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-color);
    }

    .stock-main {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stock-name {
      font-size: 0.88rem;
      color: var(--text-primary);
    }

    .stock-meta {
      font-size: 0.72rem;
      color: var(--text-secondary);
    }

    .stock-badge {
      font-size: 0.78rem;
      padding: 3px 8px;
      border-radius: var(--border-radius-sm);
      min-width: 50px;
      text-align: center;
    }

    .badge-danger { background-color: var(--danger-light); color: var(--danger-color); }
    .badge-warning { background-color: var(--warning-light); color: var(--warning-color); }

    .no-alerts {
      padding: 30px;
      text-align: center;
      color: var(--text-secondary);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      i { font-size: 1.6rem; }
    }

    /* Recent lists grid */
    .recent-records-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .recent-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .col-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 { font-size: 1.05rem; }
    }

    .record-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .record-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background-color: var(--bg-color);
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-color);
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--panel-bg);
      }
    }

    .record-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .record-folio {
      font-size: 0.88rem;
      color: var(--text-primary);
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    }

    .record-sub {
      font-size: 0.74rem;
      color: var(--text-secondary);
    }

    .record-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .record-total {
      font-size: 0.88rem;
      color: var(--text-primary);
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    }

    /* Status dot indicators */
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-dot-Pagada, .status-dot-Vigente, .status-dot-Entregada { background-color: var(--success-color); }
    .status-dot-Cancelada, .status-dot-Vencida { background-color: var(--danger-color); }
    .status-dot-Devuelta { background-color: var(--info-color); }
    .status-dot-Convertida { background-color: var(--accent-color); }
    
    .status-dot-Solicitud-creada, .status-dot-Pendiente-de-revisión, .status-dot-Esperando-respuesta-de-Inventario, .status-dot-Inventario-validando-existencia, .status-dot-Solicitud\\ creada, .status-dot-Pendiente\\ de\\ revisión, .status-dot-Esperando\\ respuesta\\ de\\ Inventario, .status-dot-Inventario\\ validando\\ existencia { background-color: var(--warning-color); }
    .status-dot-Devolución-autorizada, .status-dot-Inventario-aprobó-ingreso, .status-dot-Proceso-finalizado, .status-dot-Reembolso-realizado, .status-dot-Devolución\\ autorizada, .status-dot-Inventario\\ aprobó\\ ingreso, .status-dot-Proceso\\ finalizado, .status-dot-Reembolso\\ realizado { background-color: var(--success-color); }
    .status-dot-Devolución-rechazada, .status-dot-Inventario-rechazó-ingreso, .status-dot-Devolución\\ rechazada, .status-dot-Inventario\\ rechazó\\ ingreso { background-color: var(--danger-color); }

    /* Top Selling Products */
    .top-selling-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      h3 { font-size: 1.05rem; }
    }

    .top-selling-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }

    .top-product-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px;
      background-color: var(--bg-color);
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-color);
      position: relative;
    }

    .top-badge {
      background-color: var(--accent-color);
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 700;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .top-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      h4 { font-size: 0.88rem; }
    }

    .text-xs { font-size: 0.72rem; }

    .top-stats {
      text-align: right;
      display: flex;
      flex-direction: column;
    }

    .top-qty {
      font-size: 0.85rem;
      color: var(--text-primary);
    }

    .top-rev {
      font-size: 0.72rem;
      color: var(--text-secondary);
    }

    @media (max-width: 1024px) {
      .dashboard-row-main {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  stats = {
    soldToday: 0,
    salesCountToday: 0,
    soldThisMonth: 0,
    salesCountThisMonth: 0
  };

  lowStockProducts: Product[] = [];
  lowStockCount = 0;
  itemLocations: Record<string, string> = {};

  recentSales: Venta[] = [];
  recentReturns: Devolucion[] = [];
  recentQuotes: Cotizacion[] = [];

  topProducts: { product: Product; soldQty: number }[] = [];

  constructor(
    private historialService: HistorialService,
    private devolucionService: DevolucionService,
    private cotizacionService: CotizacionService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    // 1. Load Sales Metrics
    this.stats = this.historialService.getSalesStats();

    // 2. Load low stock items (calling InventoryService for verification)
    this.lowStockProducts = MOCK_PRODUCTS.filter(p => p.stock < 5);
    this.lowStockCount = this.lowStockProducts.length;

    // Load locations asynchronously via InventoryService
    this.lowStockProducts.forEach(item => {
      this.inventoryService.getProductLocation(item.sku).subscribe(loc => {
        this.itemLocations[item.sku] = loc;
      });
    });

    // 3. Load Recent records
    this.historialService.getSales().subscribe(sales => {
      this.recentSales = sales.slice(0, 6);
    });

    this.devolucionService.getReturns().subscribe(returns => {
      this.recentReturns = returns.slice(0, 6);
    });

    this.cotizacionService.getQuotes().subscribe(quotes => {
      this.recentQuotes = quotes.slice(0, 6);
    });

    // 4. Calculate top selling products from recent completed sales
    this.calculateTopProducts();
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'Alta': return 'badge-danger';
      case 'Baja': return 'badge-info';
      default: return 'badge-warning';
    }
  }

  private calculateTopProducts(): void {
    // Simple mock calculation
    this.topProducts = [
      { product: MOCK_PRODUCTS[0], soldQty: 18 },
      { product: MOCK_PRODUCTS[1], soldQty: 12 },
      { product: MOCK_PRODUCTS[3], soldQty: 25 },
      { product: MOCK_PRODUCTS[5], soldQty: 10 },
      { product: MOCK_PRODUCTS[6], soldQty: 9 },
      { product: MOCK_PRODUCTS[7], soldQty: 31 }
    ];
  }
}

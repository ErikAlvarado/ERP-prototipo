import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { Product } from '../../models/product.model';
import { InventoryService, warehouseSummary } from '../../services/inventory.service';
import { Subscription } from 'rxjs';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule],
  template: `
    <div class="searchbar-container">
      <div class="search-input-wrapper">
        <i class="fa-solid fa-magnifying-glass search-icon" aria-hidden="true"></i>
        <input matInput
          type="text"
          placeholder="Buscar productos"
          class="form-control barcode-input"
          [(ngModel)]="searchQuery"
          (input)="onSearchInput()"
          (focus)="onSearchInput(true)"
          (keydown.enter)="onEnterPressed()"
        />
        <button
          type="button"
          class="scan-button"
          [class.scanner-active]="cameraActive"
          [title]="cameraActive ? 'Cámara activa: pulsar para apagar' : 'Encender escáner de cámara'"
          [attr.aria-label]="cameraActive ? 'Apagar escáner de cámara' : 'Encender escáner de cámara'"
          (click)="toggleScanner()"
        >
          <i class="fa-solid fa-barcode"></i>
          <span class="camera-dot" *ngIf="cameraActive"></span>
        </button>
      </div>

      <video #camera class="background-camera" autoplay muted playsinline aria-hidden="true"></video>
      <div class="scanner-inline-error" *ngIf="scannerError">
        <i class="fa-solid fa-triangle-exclamation"></i> {{ scannerError }}
      </div>

      <!-- Suggestions Overlay -->
      <div class="suggestions-overlay" *ngIf="showSuggestions && filteredProducts.length > 0">
        <div 
          class="suggestion-item" 
          *ngFor="let prod of filteredProducts" 
          (mousedown)="selectProduct(prod)"
          [class.disabled]="prod.tracksInventory !== false && prod.stock <= 0"
        >
          <div class="prod-badge" [class.no-stock]="prod.stock === 0">
            {{ prod.stock > 0 ? prod.stock + ' pz' : 'Agotado' }}
          </div>
          <div class="prod-details">
            <span class="prod-name">
              {{ prod.name }} 
              <span class="prod-brand" *ngIf="prod.brand">({{ prod.brand }})</span>
            </span>
            <span class="prod-meta">
              SKU: {{ prod.sku }} | Cód: {{ prod.code }} | Modelo: {{ prod.model || 'N/A' }} | Cat: {{ prod.category }}
            </span>
            <span class="warehouse-stock">{{ getWarehouseSummary(prod) }}</span>
          </div>
          <div class="prod-price font-bold">
            \${{ prod.price | number:'1.2-2' }}
          </div>
        </div>
      </div>
      
      <div class="suggestions-overlay empty-result" *ngIf="showSuggestions && filteredProducts.length === 0 && searchQuery.trim().length > 0">
        <div class="no-results-msg">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>No se encontraron productos coincidentes.</span>
        </div>
      </div>

      <div class="catalog-state" *ngIf="loadingProducts">
        <i class="fa-solid fa-spinner fa-spin"></i>
        Cargando productos y existencias...
      </div>
      <div class="catalog-state catalog-error" *ngIf="catalogError">
        No fue posible cargar el catálogo de inventario.
      </div>

    </div>
  `,
  styles: [`
    .searchbar-container {
      position: relative;
      width: 100%;
    }

    .search-input-wrapper {
      display: flex;
      position: relative;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      opacity: 0.7;
      font-size: 1.15rem;
    }

    .barcode-input {
      padding-left: 44px !important;
      padding-right: 52px !important;
      height: 48px;
    }

    .scan-button {
      position: absolute;
      right: 6px;
      display: grid;
      place-items: center;
      width: 38px;
      height: 36px;
      padding: 0;
      border: 0;
      border-left: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-secondary);
      font-size: 1.05rem;
      cursor: pointer;
      transition: color .2s, background-color .2s;

      &:hover {
        color: var(--primary-color);
        background: var(--info-light);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
      }
    }

    .scan-button.scanner-active {
      color: var(--success-color);
      background: var(--success-light);
    }

    .camera-dot {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 6px;
      height: 6px;
      border: 1px solid var(--panel-bg);
      border-radius: 50%;
      background: var(--success-color);
    }

    .background-camera {
      position: fixed;
      left: -10000px;
      bottom: 0;
      width: 320px;
      height: 240px;
      opacity: 0;
      pointer-events: none;
    }

    .scanner-inline-error {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-top: 6px;
      color: var(--danger-color);
      font-size: .74rem;
    }

    .scanner-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2000;
      pointer-events: none;
    }

    .scanner-dialog {
      position: absolute;
      right: 18px;
      bottom: 18px;
      width: min(360px, calc(100vw - 36px));
      padding: 14px;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      background: var(--panel-bg);
      box-shadow: 0 24px 60px rgba(0, 0, 0, .35);
      pointer-events: auto;
    }

    .scanner-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;

      h3 { margin: 0 0 3px; font-size: 1rem; }
      p { margin: 0; color: var(--text-secondary); font-size: .8rem; }
    }

    .scanner-close {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 8px;
      background: var(--bg-color);
      color: var(--text-primary);
      cursor: pointer;
    }

    .camera-frame {
      position: relative;
      overflow: hidden;
      width: 100%;
      aspect-ratio: 16 / 9;
      border-radius: 12px;
      background: #020617;

      video { width: 100%; height: 100%; object-fit: cover; }
    }

    .scan-guide {
      position: absolute;
      inset: 22% 10%;
      border: 2px solid rgba(255,255,255,.9);
      border-radius: 10px;
      box-shadow: 0 0 0 999px rgba(0,0,0,.25);

      span {
        position: absolute;
        left: 5%;
        right: 5%;
        top: 50%;
        height: 2px;
        background: #ef4444;
        box-shadow: 0 0 8px #ef4444;
      }
    }

    .camera-loading {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: white;
    }

    .scanner-message,
    .scanner-error {
      margin: 12px 0 0;
      font-size: .82rem;
      text-align: center;
    }

    .scanner-message { color: var(--text-secondary); }
    .scanner-error { color: var(--danger-color); }

    .suggestions-overlay {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 100%;
      background-color: var(--panel-bg);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      max-height: 320px;
      overflow-y: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .suggestions-overlay::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background-color: var(--bg-color);
        transform: translateX(2px);
      }

      &.disabled {
        opacity: 0.62;
        cursor: not-allowed;
      }
    }

    .prod-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      background-color: var(--success-light);
      color: var(--success-color);
      border-radius: var(--border-radius-sm);
      min-width: 65px;
      text-align: center;
      text-transform: uppercase;

      &.no-stock {
        background-color: var(--danger-light);
        color: var(--danger-color);
      }
    }

    .prod-details {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 3px;
    }

    .prod-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .prod-brand {
      font-size: 0.82rem;
      color: var(--accent-color);
      font-weight: 500;
    }

    .prod-meta {
      font-size: 0.76rem;
      color: var(--text-secondary);
    }

    .warehouse-stock {
      color: var(--text-secondary);
      font-size: 0.72rem;
      line-height: 1.35;
    }

    .prod-price {
      font-size: 1rem;
      color: var(--accent-color);
    }

    .no-results-msg {
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .catalog-state {
      display: flex;
      align-items: center;
      gap: 7px;
      padding-top: 8px;
      color: var(--text-secondary);
      font-size: 0.78rem;
    }

    .catalog-error {
      color: var(--danger-color);
    }

    @media (max-width: 600px) {
      .suggestion-item {
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 8px 12px;
      }

      .prod-details {
        min-width: 0;
      }

      .prod-meta,
      .warehouse-stock {
        overflow-wrap: anywhere;
      }

      .prod-price {
        margin-left: auto;
      }

      .scanner-backdrop {
        display: grid;
        place-items: end center;
        padding: 12px;
        background: rgba(15, 23, 42, .45);
        pointer-events: auto;
      }

      .scanner-dialog {
        position: static;
        width: 100%;
        padding: 12px;
      }
    }
  `]
})
export class SearchbarComponent implements OnInit, OnDestroy {
  @Output() productSelected = new EventEmitter<Product>();

  searchQuery = '';
  filteredProducts: Product[] = [];
  showSuggestions = false;
  loadingProducts = true;
  catalogError = false;
  scannerOpen = false;
  cameraActive = false;
  scannerError = '';
  scannerMessage = '';
  @ViewChild('camera') camera?: ElementRef<HTMLVideoElement>;
  private products: Product[] = [];
  private readonly subscriptions = new Subscription();
  private scannerControls?: IScannerControls;
  private readonly codeReader = new BrowserMultiFormatReader();
  private lastScannedCode = '';
  private lastScannedAt = 0;
  private scannerArmed = true;
  private missingCodeFrames = 0;
  private autoStartAttempted = false;

  constructor(
    private elementRef: ElementRef,
    private inventoryService: InventoryService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.inventoryService.products$.subscribe(products => {
        this.products = products;
        if (this.showSuggestions) this.onSearchInput(true);
        this.changeDetector.markForCheck();
      }),
    );
    this.subscriptions.add(
      this.inventoryService.loadProducts().subscribe({
        next: () => {
          this.loadingProducts = false;
          this.catalogError = false;
          this.changeDetector.markForCheck();
          if (!this.autoStartAttempted) {
            this.autoStartAttempted = true;
            setTimeout(() => this.openScanner(), 0);
          }
        },
        error: () => {
          this.loadingProducts = false;
          this.catalogError = true;
          this.changeDetector.markForCheck();
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.subscriptions.unsubscribe();
  }

  async openScanner(): Promise<void> {
    if (this.cameraActive) return;
    this.scannerOpen = true;
    this.cameraActive = false;
    this.scannerError = '';
    this.scannerMessage = 'Buscando un código compatible…';
    this.showSuggestions = false;
    this.changeDetector.detectChanges();

    if (!navigator.mediaDevices?.getUserMedia) {
      this.scannerError = window.isSecureContext
        ? 'Este dispositivo o navegador no permite utilizar la cámara.'
        : 'La cámara está bloqueada porque la aplicación no usa una conexión segura. Abre localhost o utiliza HTTPS.';
      this.scannerOpen = false;
      return;
    }
    try {
      const video = this.camera?.nativeElement;
      if (!video || !this.scannerOpen) return;
      this.scannerControls = await this.codeReader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        video,
        result => {
          if (!result) {
            if (!this.scannerArmed && ++this.missingCodeFrames >= 3) {
              this.scannerArmed = true;
              this.missingCodeFrames = 0;
              this.scannerMessage = 'Listo para escanear el siguiente producto.';
              this.changeDetector.detectChanges();
            }
            return;
          }
          const code = result?.getText().trim();
          if (!code || !this.scannerOpen) return;
          const now = Date.now();
          if (!this.scannerArmed && code === this.lastScannedCode) return;
          if (code === this.lastScannedCode && now - this.lastScannedAt < 1800) return;
          this.lastScannedCode = code;
          this.lastScannedAt = now;
          this.scannerArmed = false;
          this.missingCodeFrames = 0;
          const product = this.products.find(item => item.code === code || item.sku === code);
          if (product) {
            this.scannerMessage = `${product.name} agregado. Escanea el siguiente producto.`;
            this.selectProduct(product);
            this.changeDetector.detectChanges();
          } else {
            this.scannerMessage = `El código ${code} no pertenece a un producto del catálogo.`;
            this.changeDetector.detectChanges();
          }
        },
      );
      if (!this.scannerOpen) {
        this.scannerControls.stop();
        this.scannerControls = undefined;
        return;
      }
      this.cameraActive = true;
      this.changeDetector.detectChanges();
    } catch (error) {
      this.scannerError = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Permiso de cámara rechazado. Habilítalo en la configuración del navegador.'
        : 'No fue posible encender la cámara.';
      this.scannerOpen = false;
      this.stopCamera();
    }
  }

  toggleScanner(): void {
    if (this.cameraActive || this.scannerOpen) {
      this.closeScanner();
    } else {
      void this.openScanner();
    }
  }

  closeScanner(): void {
    this.scannerOpen = false;
    this.stopCamera();
  }

  private stopCamera(): void {
    this.scannerControls?.stop();
    this.scannerControls = undefined;
    this.cameraActive = false;
    const video = this.camera?.nativeElement;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(track => track.stop());
    if (video) video.srcObject = null;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showSuggestions = false;
    }
  }

  private normalizeStr(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  onSearchInput(showAll = false): void {
    const rawTerm = this.normalizeStr(this.searchQuery).trim();
    if (!rawTerm) {
      this.filteredProducts = showAll ? this.products.slice(0, 30) : [];
      // Conserva la intención del primer foco mientras termina la lectura HTTP.
      this.showSuggestions = showAll;
      return;
    }

    const tokens = rawTerm.split(/\s+/).filter(t => t.length > 0);

    this.filteredProducts = this.products.filter(p => {
      const fullText = this.normalizeStr(
        `${p.name} ${p.brand || ''} ${p.model || ''} ${p.sku} ${p.code} ${p.category}`
      );
      return tokens.every(token => fullText.includes(token));
    });
    this.showSuggestions = true;
  }

  selectProduct(product: Product): void {
    if (product.tracksInventory !== false && product.stock <= 0) return;
    this.productSelected.emit(product);
    this.searchQuery = '';
    this.showSuggestions = false;
  }

  onEnterPressed(): void {
    const rawTerm = this.normalizeStr(this.searchQuery).trim();
    if (!rawTerm) return;

    // Direct match check (by SKU or Code first)
    const directMatch = this.products.find(p =>
      this.normalizeStr(p.sku) === rawTerm ||
      this.normalizeStr(p.code) === rawTerm
    );

    if (directMatch) {
      this.selectProduct(directMatch);
    } else if (this.filteredProducts.length > 0) {
      this.selectProduct(this.filteredProducts[0]);
    }
  }

  getWarehouseSummary(product: Product): string {
    return warehouseSummary(product);
  }
}

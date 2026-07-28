import { Component, EventEmitter, Output, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { Product } from '../../models/product.model';
import { MOCK_PRODUCTS } from '../../services/mock-data';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule],
  template: `
    <div class="searchbar-container">
      <div class="search-input-wrapper">
        <i class="fa-solid fa-barcode scan-icon" title="Escanear Código"></i>
        <input matInput
          type="text" 
          placeholder="Buscar por nombre, marca, modelo, SKU (ej. KBG500, Gamer, Mecánico)..." 
          class="form-control barcode-input" 
          [(ngModel)]="searchQuery"
          (input)="onSearchInput()"
          (focus)="onSearchInput()"
          (keydown.enter)="onEnterPressed()"
        />
        <button class="btn-premium btn-accent add-btn" (click)="onEnterPressed()">
          <i class="fa-solid fa-plus"></i> Agregar
        </button>
      </div>

      <!-- Suggestions Overlay -->
      <div class="suggestions-overlay" *ngIf="showSuggestions && filteredProducts.length > 0">
        <div 
          class="suggestion-item" 
          *ngFor="let prod of filteredProducts" 
          (mousedown)="selectProduct(prod)"
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
    </div>
  `,
  styles: [`
    .searchbar-container {
      position: relative;
      width: 100%;
    }

    .search-input-wrapper {
      display: flex;
      gap: 12px;
      position: relative;
    }

    .scan-icon {
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
      height: 48px;
    }

    .add-btn {
      height: 48px;
      padding: 0 24px;
      flex-shrink: 0;
    }

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
  `]
})
export class SearchbarComponent {
  @Output() productSelected = new EventEmitter<Product>();

  searchQuery = '';
  filteredProducts: Product[] = [];
  showSuggestions = false;

  constructor(private elementRef: ElementRef) {}

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

  onSearchInput(): void {
    const rawTerm = this.normalizeStr(this.searchQuery).trim();
    if (!rawTerm) {
      this.filteredProducts = [];
      this.showSuggestions = false;
      return;
    }

    const tokens = rawTerm.split(/\s+/).filter(t => t.length > 0);

    this.filteredProducts = MOCK_PRODUCTS.filter(p => {
      const fullText = this.normalizeStr(
        `${p.name} ${p.brand || ''} ${p.model || ''} ${p.sku} ${p.code} ${p.category}`
      );
      return tokens.every(token => fullText.includes(token));
    });
    this.showSuggestions = true;
  }

  selectProduct(product: Product): void {
    this.productSelected.emit(product);
    this.searchQuery = '';
    this.showSuggestions = false;
  }

  onEnterPressed(): void {
    const rawTerm = this.normalizeStr(this.searchQuery).trim();
    if (!rawTerm) return;

    // Direct match check (by SKU or Code first)
    const directMatch = MOCK_PRODUCTS.find(p => 
      this.normalizeStr(p.sku) === rawTerm ||
      this.normalizeStr(p.code) === rawTerm
    );

    if (directMatch) {
      this.selectProduct(directMatch);
    } else if (this.filteredProducts.length > 0) {
      this.selectProduct(this.filteredProducts[0]);
    }
  }
}

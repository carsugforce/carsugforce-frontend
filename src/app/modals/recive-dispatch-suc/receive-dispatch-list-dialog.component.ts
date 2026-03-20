import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PecalService } from '../../core/service/pecal.service';
import { PendingDispatch } from '../../core/models/pending-dispatch.model';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

import {
  DispatchDetailResponse,
  DispatchProductDto
} from '../../core/models/dispatch-detail.model';

@Component({
  standalone: true,
  selector: 'app-receive-dispatch-list-dialog',
  templateUrl: './receive-dispatch-list-dialog.component.html',
  styleUrls: ['./receive-dispatch-list-dialog.component.scss'],
  imports: [CommonModule, MatProgressSpinner, MatIcon, FormsModule],
})
export class ReceiveDispatchListDialogComponent implements OnInit, OnDestroy {

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      orderId: number;
      orderNumber: string;
    },
    private dialogRef: MatDialogRef<ReceiveDispatchListDialogComponent>,
    private pecalService: PecalService
  ) {}

  view: 'list' | 'detail' = 'list';

  pendingDispatches: PendingDispatch[] = [];
  selectedDispatch: PendingDispatch | null = null;

  dispatchDetail: DispatchDetailResponse | null = null;

  loading = true;

  searchTerm = '';
  filteredFamilies: DispatchDetailResponse['families'] = [];
  rowSelectionMap: Record<number, boolean> = {};
  validationNote = '';
  // ============================
  // INIT / DESTROY
  // ============================
  private get receptionDraftKey(): string {
    return `pecal-reception-draft-${this.selectedDispatch?.id ?? 0}`;
  }
  ngOnInit(): void {
    this.loadPending();

    window.addEventListener('popstate', this.onBack);
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.onBack);
  }

  loadPending() {
    this.loading = true;

    this.pecalService.getPendingDispatches(this.data.orderId).subscribe({
      next: res => {
        this.pendingDispatches = res ?? [];
        this.loading = false;
      },
      error: () => {
        this.pendingDispatches = [];
        this.loading = false;
      }
    });
  }

  // ============================
  // NAV
  // ============================

  selectDispatch(d: PendingDispatch) {
    this.selectedDispatch = d;
    this.view = 'detail';

    //console.log('Selected dispatch:', d);

    this.loadDispatchDetail(d.id);

    history.pushState({ view: 'detail' }, '');
  }

  goBack() {
    this.view = 'list';
    this.selectedDispatch = null;
    this.dispatchDetail = null;
  }

  close() {
    
    this.dialogRef.close();
  }

  onBack = () => {
    if (this.view === 'detail') {
      this.goBack();
    } else {
      this.dialogRef.close();
    }
  };

  // ============================
  // HEADER
  // ============================

  get headerTitle(): string {
    return this.view === 'list'
      ? `Recepción de orden: ${this.data.orderNumber}`
      : `Surtido #${this.selectedDispatch?.dispatchNumber ?? ''}`;
  }

  normalizeDate(date: string | null | undefined): Date | undefined {
    if (!date) return undefined;
    return new Date(date.endsWith('Z') ? date : `${date}Z`);
  }


  // ============================
  // LOAD DETAIL
  // ============================

  loadDispatchDetail(dispatchId: number) {
    this.loading = true;

    this.pecalService.getDispatchDetail(dispatchId).subscribe({
     next: res => {
        this.dispatchDetail = res;

        res.families.forEach(f =>
          f.lines.forEach(l =>
            l.items.forEach(p => {
              p.sentqty = p.dispatchedQty;
              p.receivedQty = p.dispatchedQty;
              p._editing = false;
            })
          )
        );

        this.restoreReceptionDraft(dispatchId);
        this.applyProductFilter();

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // ============================
  // QTY LOGIC
  // ============================

  onQtyChange(p: DispatchProductDto, qty: number) {
    const step = this.getStep(p);
    qty = Math.round(qty / step) * step;
    if (qty < 0) qty = 0;
    if (qty > p.sentqty) qty = p.sentqty;
    p.receivedQty = Number(qty.toFixed(2));
    this.saveReceptionDraft();
  }


  getDiffState(p: DispatchProductDto): 'ok' | 'missing' | 'extra' {
    if (p.receivedQty === p.sentqty) return 'ok';
    if (p.receivedQty < p.sentqty) return 'missing';
    return 'extra';
  }

  isQtyLocked(p: DispatchProductDto): boolean {
    return p.receivedQty === p.sentqty;
  }

  // ============================
  // CONFIRM RECEPTION
  // ============================

  confirmReception() {
    if (!this.selectedDispatch || !this.dispatchDetail) return;

    const items = this.dispatchDetail.families
      .flatMap(f => f.lines)
      .flatMap(l => l.items)
      .map(p => ({
        productId: p.productId,
        receivedQty: p.receivedQty ?? 0
      }));

    const note = this.validationNote?.trim() || null;

    this.loading = true;

    this.pecalService
      .confirmDispatchReception(this.selectedDispatch.id, {
        items,
        note
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.validationNote = '';
          this.clearReceptionDraft();
          this.goBack();
          this.loadPending();
        },
        error: () => {
          this.loading = false;
          //console.error('Error confirmando recepción');
        }
      });
  }


  isCanalProduct(p: DispatchProductDto): boolean {
    return p.productDescription?.toLowerCase().includes('canal');
  }


   getStep(p: DispatchProductDto): number {
    return this.isCanalProduct(p) ? 0.5 : 1;
  }


  toggleRow(productId: number): void {
  this.rowSelectionMap[productId] = !this.rowSelectionMap[productId];
  this.saveReceptionDraft();
}

  saveReceptionDraft(): void {
    if (!this.selectedDispatch || !this.dispatchDetail) return;

    const items = this.dispatchDetail.families
      .flatMap(f => f.lines)
      .flatMap(l => l.items);

    const draft = {
      searchTerm: this.searchTerm,
      validationNote: this.validationNote,
      rowSelectionMap: this.rowSelectionMap,
      quantities: Object.fromEntries(
        items.map(p => [p.productId, p.receivedQty ?? 0])
      )
    };

    localStorage.setItem(this.receptionDraftKey, JSON.stringify(draft));
  }

  restoreReceptionDraft(dispatchId: number): void {
    const raw = localStorage.getItem(`pecal-reception-draft-${dispatchId}`);
    if (!raw || !this.dispatchDetail) return;

    try {
      const draft = JSON.parse(raw);

      this.searchTerm = draft.searchTerm ?? '';
      this.rowSelectionMap = draft.rowSelectionMap ?? {};
      this.searchTerm = draft.searchTerm ?? '';
      this.validationNote = draft.validationNote ?? '';

      this.dispatchDetail.families.forEach(f =>
        f.lines.forEach(l =>
          l.items.forEach(p => {
            const savedQty = draft.quantities?.[p.productId];
            if (savedQty !== undefined) {
              p.receivedQty = savedQty;
            }
          })
        )
      );
    } catch (error) {
      console.error('No se pudo restaurar draft de recepción', error);
    }
  }

  clearReceptionDraft(): void {
    if (!this.selectedDispatch) return;
    localStorage.removeItem(`pecal-reception-draft-${this.selectedDispatch.id}`);
  }


  private normalizeSearch(value: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private matchesSearch(p: DispatchProductDto, term: string): boolean {
    const searchable = this.normalizeSearch(
      [
        p.productDescription,
        String(p.productId ?? '')
      ]
        .filter(Boolean)
        .join(' ')
    );

    return searchable.includes(term);
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.applyProductFilter();
    this.saveReceptionDraft();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyProductFilter();
    this.saveReceptionDraft();
  }

  applyProductFilter(): void {
    if (!this.dispatchDetail) {
      this.filteredFamilies = [];
      return;
    }

    const term = this.normalizeSearch(this.searchTerm);

    if (!term) {
      this.filteredFamilies = this.dispatchDetail.families;
      return;
    }

    this.filteredFamilies = this.dispatchDetail.families
      .map(f => ({
        ...f,
        lines: f.lines
          .map(l => ({
            ...l,
            items: l.items.filter(p => this.matchesSearch(p, term))
          }))
          .filter(l => l.items.length > 0)
      }))
      .filter(f => f.lines.length > 0);
  }


  hasReceptionDifferences(): boolean {
  if (!this.dispatchDetail) return false;

    return this.dispatchDetail.families
      .flatMap(f => f.lines)
      .flatMap(l => l.items)
      .some(p => this.getDiffState(p) !== 'ok');
  }

  canConfirmReception(): boolean {
    if (!this.dispatchDetail || !this.selectedDispatch) return false;

    if (this.hasReceptionDifferences()) {
      return !!this.validationNote.trim();
    }

    return true;
  }

  onValidationNoteChange(value: string): void {
    this.validationNote = value;
    this.saveReceptionDraft();
  }


}

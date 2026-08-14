import { CommonModule } from '@angular/common';
import {
  Component,
  Inject,
  OnInit,
} from '@angular/core';

import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  SalesDailyEntry,
  SalesDailyEntryListResponse,
  SalesService,
} from '../../../core/service/sales.service';

export interface AssetSaleHistoryDialogData {
  sucursalesId: number;

  uenName: string;

  dateFrom?: string;

  dateTo?: string;

  periodText: string;
}

@Component({
  selector: 'app-asset-sale-history-dialog',

  standalone: true,

  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],

  template: `
    <div class="asset-sale-dialog">

      <header class="dialog-header">

        <div class="title-wrap">

          <div class="title-icon">
            <mat-icon>
              paid
            </mat-icon>
          </div>

          <div>

            <span class="eyebrow">
              VENTA DE ACTIVOS
            </span>

            <h2>
              Historial de movimientos
            </h2>

            <p>
              {{ data.uenName }}
              ·
              {{ data.periodText }}
            </p>

          </div>

        </div>


        <button
          mat-icon-button
          type="button"
          aria-label="Cerrar"
          (click)="close()"
        >
          <mat-icon>
            close
          </mat-icon>
        </button>

      </header>


      @if (loading) {

        <div class="dialog-state">

          <mat-spinner diameter="40">
          </mat-spinner>

          <strong>
            Consultando movimientos...
          </strong>

          <span>
            Estamos buscando las ventas de activos del periodo seleccionado.
          </span>

        </div>

      } @else if (errorMessage) {

        <div class="dialog-state error">

          <mat-icon>
            error_outline
          </mat-icon>

          <strong>
            No se pudo consultar el historial
          </strong>

          <span>
            {{ errorMessage }}
          </span>

        </div>

      } @else if (assetSales.length === 0) {

        <div class="dialog-state">

          <mat-icon>
            inventory_2
          </mat-icon>

          <strong>
            Sin movimientos
          </strong>

          <span>
            No existen ventas de activos para la UEN y el periodo seleccionados.
          </span>

        </div>

      } @else {

        <section class="summary">

          <div>

            <span>
              Movimientos
            </span>

            <strong>
              {{ assetSales.length }}
            </strong>

          </div>

          <div>

            <span>
              Total venta de activos
            </span>

            <strong>
              {{ money(totalAssetSales) }}
            </strong>

          </div>

        </section>


        <div class="table-wrap">

          <table>

            <thead>

              <tr>

                <th>
                  Fecha
                </th>

                <th>
                  Monto
                </th>

                <th>
                  Forma de pago
                </th>

                <th>
                  Observaciones
                </th>

              </tr>

            </thead>


            <tbody>

              @for (
                item of assetSales;
                track item.id
              ) {

                <tr>

                  <td class="date-cell">
                    {{ formatDate(item.saleDate) }}
                  </td>

                  <td class="amount-cell">
                    {{ money(item.assetSaleAmount) }}
                  </td>

                  <td>
                    <span class="payment-pill">
                      {{
                        item.assetSalePaymentForm
                        || 'Sin especificar'
                      }}
                    </span>
                  </td>

                  <td class="observations-cell">
                    {{
                      item.observations?.trim()
                      || 'Sin observaciones'
                    }}
                  </td>

                </tr>

              }

            </tbody>

          </table>

        </div>

      }


      <footer class="dialog-footer">

        <button
          mat-stroked-button
          type="button"
          (click)="close()"
        >
          Cerrar
        </button>

      </footer>

    </div>
  `,

  styles: [
    `
      :host {
        --dialog-bg: #ffffff;
        --dialog-surface: #f8fafc;
        --dialog-table-bg: #ffffff;
        --dialog-table-header: #f1f5f9;
        --dialog-border: #e2e8f0;

        --dialog-text: #111827;
        --dialog-text-secondary: #475569;
        --dialog-muted: #64748b;

        --dialog-primary: #881136;
        --dialog-primary-soft: rgba(136, 17, 54, 0.12);

        --dialog-green: #15803d;
        --dialog-blue: #1d4ed8;
        --dialog-blue-soft: rgba(37, 99, 235, 0.1);

        --dialog-error: #b42318;
        --dialog-hover: rgba(15, 23, 42, 0.035);

        display: block;
      }

      :host-context(.dark-theme) {
        --dialog-bg: #0f172a;
        --dialog-surface: #111d31;
        --dialog-table-bg: #0f1a2d;
        --dialog-table-header: #162238;
        --dialog-border: rgba(148, 163, 184, 0.18);

        --dialog-text: #f8fafc;
        --dialog-text-secondary: #dbe4f0;
        --dialog-muted: #94a3b8;

        --dialog-primary: #fb7185;
        --dialog-primary-soft: rgba(219, 103, 44, 0.22);

        --dialog-green: #86efac;
        --dialog-blue: #bfdbfe;
        --dialog-blue-soft: rgba(59, 130, 246, 0.14);

        --dialog-error: #fca5a5;
        --dialog-hover: rgba(255, 255, 255, 0.025);
      }

      .asset-sale-dialog {
        width: 100%;
        min-width: 0;

        color: var(--dialog-text);

        background: var(--dialog-bg);
      }

      .dialog-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;

        padding: 22px 24px 18px;

        border-bottom: 1px solid var(--dialog-border);

        background: var(--dialog-bg);
      }

      .dialog-header button {
        color: var(--dialog-text-secondary) !important;
      }

      .title-wrap {
        min-width: 0;

        display: flex;
        align-items: flex-start;
        gap: 14px;
      }

      .title-icon {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 13px;

        color: var(--dialog-primary);

        background: var(--dialog-primary-soft);
      }

      .eyebrow {
        display: block;

        margin-bottom: 4px;

        color: var(--dialog-primary);

        font-size: 11px;
        font-weight: 900;

        letter-spacing: 0.08em;
      }

      h2 {
        margin: 0;

        color: var(--dialog-text);

        font-size: 22px;
        font-weight: 900;
      }

      p {
        margin: 5px 0 0;

        color: var(--dialog-muted);

        font-size: 13px;
      }

      .summary {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;

        padding: 18px 24px 0;
      }

      .summary > div {
        padding: 14px 16px;

        border: 1px solid var(--dialog-border);
        border-radius: 14px;

        background: var(--dialog-surface);
      }

      .summary span {
        display: block;

        margin-bottom: 5px;

        color: var(--dialog-muted);

        font-size: 11px;
        font-weight: 800;
      }

      .summary strong {
        color: var(--dialog-text);

        font-size: 19px;
        font-weight: 900;
      }

      .table-wrap {
        max-height: 480px;

        margin: 18px 24px 0;

        overflow: auto;

        border: 1px solid var(--dialog-border);
        border-radius: 14px;

        background: var(--dialog-table-bg);
      }

      table {
        width: 100%;

        border-collapse: collapse;

        background: var(--dialog-table-bg);
      }

      th,
      td {
        padding: 13px 14px;

        text-align: left;

        border-bottom: 1px solid var(--dialog-border);
      }

      th {
        position: sticky;
        top: 0;
        z-index: 1;

        color: var(--dialog-text-secondary);

        background: var(--dialog-table-header);

        font-size: 11px;
        font-weight: 900;

        white-space: nowrap;
      }

      td {
        color: var(--dialog-text-secondary);

        font-size: 13px;

        vertical-align: top;
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      tbody tr:hover {
        background: var(--dialog-hover);
      }

      .date-cell {
        min-width: 110px;

        color: var(--dialog-text);

        font-weight: 800;

        white-space: nowrap;
      }

      .amount-cell {
        min-width: 130px;

        color: var(--dialog-green);

        font-weight: 900;

        white-space: nowrap;
      }

      .payment-pill {
        display: inline-flex;

        padding: 5px 9px;

        border-radius: 999px;

        color: var(--dialog-blue);

        background: var(--dialog-blue-soft);

        font-size: 11px;
        font-weight: 800;

        white-space: nowrap;
      }

      .observations-cell {
        min-width: 260px;

        color: var(--dialog-text-secondary);

        line-height: 1.45;

        white-space: normal;
      }

      .dialog-state {
        min-height: 280px;

        padding: 40px 24px;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 9px;

        text-align: center;

        background: var(--dialog-bg);
      }

      .dialog-state > mat-icon {
        width: 42px;
        height: 42px;

        color: var(--dialog-muted);

        font-size: 42px;
      }

      .dialog-state strong {
        margin-top: 5px;

        color: var(--dialog-text);

        font-size: 16px;
        font-weight: 900;
      }

      .dialog-state span {
        max-width: 520px;

        color: var(--dialog-muted);

        font-size: 13px;
        line-height: 1.5;
      }

      .dialog-state.error > mat-icon,
      .dialog-state.error strong {
        color: var(--dialog-error);
      }

      .dialog-footer {
        display: flex;
        justify-content: flex-end;

        padding: 18px 24px 22px;

        background: var(--dialog-bg);
      }

      .dialog-footer button {
        color: #ffffff !important;

        background: #881136 !important;

        border-color: #881136 !important;

        font-weight: 800;
        }

        .dialog-footer button:hover {
        background: #911d42 !important;

        border-color: #911d42 !important;
        }

      @media (max-width: 700px) {
        .dialog-header {
          padding: 18px;
        }

        .summary {
          grid-template-columns: 1fr;

          padding: 16px 18px 0;
        }

        .table-wrap {
          margin: 16px 18px 0;
        }

        .dialog-footer {
          padding: 16px 18px 18px;
        }
      }
    `,
  ],
})
export class AssetSaleHistoryDialogComponent implements OnInit {
  loading = false;

  errorMessage = '';

  assetSales: SalesDailyEntry[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: AssetSaleHistoryDialogData,
    private dialogRef: MatDialogRef<AssetSaleHistoryDialogComponent>,
    private salesService: SalesService,
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;

    this.errorMessage = '';

    this.salesService
      .getDailyEntries({
        sucursalesId: this.data.sucursalesId,
        dateFrom: this.data.dateFrom,
        dateTo: this.data.dateTo,
        page: 1,
        pageSize: 1000,
      })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (
          response: SalesDailyEntryListResponse,
        ) => {
          this.assetSales = (response.items || [])
            .filter(
              (item) =>
                Number(
                  item.assetSaleAmount || 0,
                ) > 0,
            )
            .sort((a, b) => {
              const dateCompare =
                String(b.saleDate)
                  .localeCompare(
                    String(a.saleDate),
                  );

              if (dateCompare !== 0) {
                return dateCompare;
              }

              return b.id - a.id;
            });
        },

        error: (err) => {
          this.assetSales = [];

          this.errorMessage =
            this.getErrorMessage(
              err,
              'No se pudo consultar el historial de venta de activos.',
            );
        },
      });
  }

  get totalAssetSales(): number {
    return this.round(
      this.assetSales.reduce(
        (total, item) =>
          total +
          Number(
            item.assetSaleAmount || 0,
          ),
        0,
      ),
    );
  }

  close(): void {
    this.dialogRef.close();
  }

  formatDate(
    value: string | null | undefined,
  ): string {
    if (!value) {
      return '--';
    }

    const onlyDate =
      value.trim().split('T')[0];

    const match =
      /^(\d{4})-(\d{2})-(\d{2})$/
        .exec(onlyDate);

    if (!match) {
      return '--';
    }

    const date =
      new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
      );

    return new Intl.DateTimeFormat(
      'es-MX',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    ).format(date);
  }

  money(
    value: number | null | undefined,
  ): string {
    return new Intl.NumberFormat(
      'es-MX',
      {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(
      Number(value || 0),
    );
  }

  private round(value: number): number {
    return (
      Math.round(
        (
          Number(value || 0)
          + Number.EPSILON
        ) * 100,
      ) / 100
    );
  }

  private getErrorMessage(
    err: any,
    fallback: string,
  ): string {
    if (
      typeof err?.error === 'string'
      && err.error.trim()
    ) {
      return err.error;
    }

    if (
      typeof err?.error?.message === 'string'
      && err.error.message.trim()
    ) {
      return err.error.message;
    }

    if (
      typeof err?.error?.title === 'string'
      && err.error.title.trim()
    ) {
      return err.error.title;
    }

    return fallback;
  }
}
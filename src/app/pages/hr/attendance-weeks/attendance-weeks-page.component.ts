import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize, forkJoin } from 'rxjs';

import {
  AttendanceEmployeeDay,
  AttendanceEmployeeWeek,
  AttendanceBiometricMark,
  AttendancePlanningDay,
  AttendancePlanningEmployee,
  AttendancePlanningWeek,
  AttendanceWeekSummary,
  HrCatalogs,
} from '../../../core/models/hr.models';
import { HrService } from '../../../core/service/hr.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

type IncidentFilter = 'ALL' | 'WITH_INCIDENTS' | 'WITHOUT_INCIDENTS' | 'REVIEW';
type UenSelection = number | 'ALL' | null;

@Component({
  selector: 'app-attendance-weeks-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule, MatNativeDateModule, MatSelectModule, MatTooltipModule],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-MX' }],
  template: `
    <section class="week-workbench" [class.detail-open]="activeEmployee && activePlanningDay">
      <div class="screen-lock" *ngIf="screenBusy">
        <div class="screen-lock__box">
          <mat-icon>sync</mat-icon>
          <strong>{{ screenBusyMessage }}</strong>
          <span>No cierres ni cambies de pantalla.</span>
        </div>
      </div>

      <div class="attendance-split" [class.panel-open]="activeEmployee && activePlanningDay">
      <div class="attendance-main">
      <header class="compact-header">
        <div>
          <span class="eyebrow">RECURSOS HUMANOS</span>
          <h1>Semanas e incidencias</h1>
          <p>Semana {{ week }} · {{ weekStartDate() | date:'dd MMM' }} - {{ weekEndDate() | date:'dd MMM y' }}</p>
        </div>

        <div class="week-picker-shell">
          <button class="week-range" type="button" (click)="weekRangePicker.open()" aria-label="Seleccionar semana por fecha">
            <strong>Semana {{ week }}</strong>
            <span>{{ weekStartDate() | date:'dd MMM' }} - {{ weekEndDate() | date:'dd MMM y' }}</span>
            <mat-icon>calendar_month</mat-icon>
          </button>
          <mat-form-field class="week-picker-proxy" appearance="outline">
            <input matInput [matDatepicker]="weekRangePicker" [(ngModel)]="selectedWeekDate" (dateChange)="selectWeekDate($event.value)">
            <mat-datepicker #weekRangePicker></mat-datepicker>
          </mat-form-field>
        </div>
      </header>

      <mat-card class="workbar">
        <div class="workbar-main">
          <mat-form-field appearance="outline">
            <mat-label>Año</mat-label>
            <input matInput type="number" [(ngModel)]="year" (keyup.enter)="load()">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Semana</mat-label>
            <input matInput type="number" [(ngModel)]="week" (keyup.enter)="load()">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>UEN</mat-label>
            <mat-select [(ngModel)]="uenSelection" (selectionChange)="selectUen($event.value)">
              <mat-option [value]="null" disabled>Selecciona UEN</mat-option>
              <mat-option value="ALL">Todas</mat-option>
              <mat-option *ngFor="let s of catalogs?.sucursales" [value]="s.id">{{ s.description }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="search">
            <mat-label>Buscar empleado</mat-label>
            <input matInput [(ngModel)]="search" (keyup.enter)="applyFilters()">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Estado</mat-label>
            <mat-select [(ngModel)]="incidentFilter" (selectionChange)="applyFilters()">
              <mat-option value="ALL">Todos</mat-option>
              <mat-option value="WITH_INCIDENTS">Con incidencias</mat-option>
              <mat-option value="WITHOUT_INCIDENTS">Sin incidencias</mat-option>
              <mat-option value="REVIEW">Pendientes de revisión</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="workbar-actions">
          <button class="action-button load-action" mat-flat-button (click)="load()">
            <mat-icon>search</mat-icon>
            Cargar
          </button>
          <button class="action-button export-action" mat-stroked-button [disabled]="!summary?.attendanceWeekId || screenBusy" (click)="export()">
            <mat-icon>download</mat-icon>
            Descargar Excel
          </button>
          <button class="action-button authorize-action" mat-stroked-button [disabled]="!summary?.attendanceWeekId || screenBusy" (click)="authorize()">
            <mat-icon>verified</mat-icon>
            Autorizar semana
          </button>
        </div>
      </mat-card>

      <div class="loading" *ngIf="loading">
        <mat-icon>hourglass_top</mat-icon>
        Cargando semana...
      </div>

      <mat-card class="uen-empty" *ngIf="!hasUenSelection() && !loading">
        <mat-icon>storefront</mat-icon>
        <div>
          <strong>Selecciona una UEN para cargar incidencias</strong>
          <span>Así la revisión abre más rápido y la tabla no se llena con todos los empleados de golpe.</span>
        </div>
      </mat-card>

      <mat-card class="grid-card" *ngIf="planning && !loading">
        <div class="grid-title">
          <div class="legend">
            <span><i class="normal"></i> Normal</span>
            <span><i class="incident"></i> Incidencia</span>
            <span><i class="rest"></i> Descanso</span>
            <span><i class="vacation"></i> Vacaciones</span>
          </div>
        </div>

        <div class="week-grid-scroll">
          <div class="week-grid">
            <div class="cell header employee-col">Empleado</div>
            <div class="cell header day-head" *ngFor="let d of days; trackBy: trackDayName">{{ d }}</div>
            <div class="cell header overtime-col">Tiempo extra</div>

            <ng-container *ngFor="let employee of filteredEmployees; trackBy: trackEmployee">
              <div class="cell employee-col employee-cell">
                <div class="employee-avatar">{{ initials(employee.employeeName) }}</div>
                <div>
                  <strong>{{ employee.employeeName }}</strong>
                  <span>{{ employee.sucursalName || 'Sin UEN' }}</span>
                </div>
              </div>

              <button
                type="button"
                class="cell day-cell"
                *ngFor="let day of employee.days; let i = index; trackBy: trackPlanningDay"
                [class.rest]="day.dayType === 'REST'"
                [class.vacation]="day.dayType === 'VACATION'"
                [class.loaded]="detailDay(employee.employeeId, day.date)"
                [class.review]="hasCellWarning(employee.employeeId, day.date)"
                [class.absence]="hasAbsenceIncident(employee.employeeId, day.date)"
                [class.resolved]="isCellResolved(employee.employeeId, day.date)"
                [class.active]="isActiveCell(employee.employeeId, day.date)"
                [class.unscheduled]="isUnscheduledPlanningDay(day)"
                [disabled]="isUnscheduledPlanningDay(day)"
                (click)="openDay(employee, day)"
              >
                <span class="status-line">{{ cellPrimary(employee.employeeId, day) }}</span>
                <small>{{ cellSecondary(employee.employeeId, day) }}</small>
              </button>

              <div class="cell overtime-col weekly-overtime-cell" [class.blocked]="isWeeklyOvertimeBlocked(employee)" (click)="$event.stopPropagation()">
                <ng-container *ngIf="isWeeklyOvertimeLocked(employee.employeeId) && !isWeeklyOvertimeBlocked(employee); else weeklyOvertimeEditor">
                  <div class="weekly-overtime-locked">
                    <div>
                      <span>Calculado</span>
                      <strong>{{ formatOvertimeLabel(weeklyOvertime(employee.employeeId).calculated) }}</strong>
                    </div>
                    <div>
                      <span>Patrón autorizó</span>
                      <strong>{{ formatOvertimeLabel(weeklyOvertime(employee.employeeId).authorized) }}</strong>
                    </div>
                    <div>
                      <span>Autorizado</span>
                      <strong>{{ formatOvertimeLabel(weeklyOvertime(employee.employeeId).authorized) }}</strong>
                    </div>
                    <p>{{ weeklyOvertimeComment(employee.employeeId) || 'Sin observación' }}</p>
                    <button type="button" (click)="editWeeklyOvertime(employee.employeeId)">
                      <mat-icon>edit</mat-icon>
                      <span>Editar</span>
                    </button>
                  </div>
                </ng-container>

                <ng-template #weeklyOvertimeEditor>
                  <ng-container *ngIf="isWeeklyOvertimeBlocked(employee); else weeklyOvertimeEditable">
                    <div class="weekly-overtime-summary">
                      <span>
                        <small>Calculado</small>
                        <strong>{{ formatOvertimeLabel(0) }}</strong>
                      </span>
                      <span>
                        <small>Autorizado</small>
                        <strong>{{ formatOvertimeLabel(0) }}</strong>
                      </span>
                    </div>
                    <div class="weekly-overtime-blocked">
                      <mat-icon>lock_clock</mat-icon>
                      <span>Asigna horario para autorizar TE</span>
                    </div>
                  </ng-container>

                  <ng-template #weeklyOvertimeEditable>
                    <div class="weekly-overtime-summary">
                      <span>
                        <small>Calculado</small>
                        <strong>{{ formatOvertimeLabel(weeklyOvertime(employee.employeeId).calculated) }}</strong>
                      </span>
                      <span>
                        <small>Autorizado</small>
                        <strong>{{ formatOvertimeLabel(weeklyOvertimeAuthorizedPreview(employee.employeeId)) }}</strong>
                      </span>
                    </div>
                    <label class="weekly-overtime-edit">
                      <span>Autorizar total (hrs)</span>
                      <div>
                        <input
                          type="number"
                          min="-99"
                          max="99"
                          step="0.25"
                          [ngModel]="weeklyOvertimeAdjustmentHours(employee.employeeId)"
                          (ngModelChange)="setWeeklyOvertimeAdjustment(employee.employeeId, $event)"
                          (keydown.enter)="saveWeeklyOvertime(employee.employeeId)"
                          aria-label="Horas extra modificadas"
                        >
                      </div>
                    </label>
                    <div class="weekly-overtime-note">
                      <input
                        type="text"
                        placeholder="Observación"
                        [ngModel]="weeklyOvertimeComment(employee.employeeId)"
                        (ngModelChange)="setWeeklyOvertimeComment(employee.employeeId, $event)"
                        aria-label="Observación de tiempo extra"
                      >
                    </div>
                    <button
                      type="button"
                      class="save-weekly-overtime"
                      [disabled]="savingWeeklyOvertime[employee.employeeId] || !summary?.attendanceWeekId"
                      (click)="saveWeeklyOvertime(employee.employeeId)"
                    >
                      <mat-icon>save</mat-icon>
                      <span>Guardar</span>
                    </button>
                  </ng-template>
                </ng-template>
              </div>
            </ng-container>
          </div>
        </div>
      </mat-card>
      </div>

      <aside class="day-panel resolution-panel" *ngIf="activeEmployee && activePlanningDay">
        <div class="panel-week-nav">
          <div class="panel-week-nav__controls">
            <button mat-stroked-button type="button" (click)="moveWeek(-1)">
              <mat-icon>chevron_left</mat-icon>
              Anterior
            </button>
            <div class="week-pill">S{{ week }} · {{ year }}</div>
            <button mat-stroked-button type="button" (click)="moveWeek(1)">
              Siguiente
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
          <button class="panel-close-button" mat-icon-button type="button" matTooltip="Cerrar" (click)="closePanel()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="resolution-panel__header">
          <div class="day-context">
            <div class="day-date-nav">
              <button class="day-nav-button" type="button" matTooltip="Día anterior" [disabled]="!canMovePanelDay(-1)" (click)="movePanelDay(-1)" aria-label="Día anterior">
                <mat-icon>chevron_left</mat-icon>
              </button>
              <span class="day-date">{{ formatLongDate(activePlanningDay.date) }}</span>
              <button class="day-nav-button" type="button" matTooltip="Día siguiente" [disabled]="!canMovePanelDay(1)" (click)="movePanelDay(1)" aria-label="Día siguiente">
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
            <h2>{{ activeEmployee.employeeName }}</h2>
            <p>{{ activeEmployee.sucursalName || 'Sin UEN' }}</p>
          </div>
        </div>

        <div class="panel-body">
          <div class="case-badges">
            <span class="case-chip" [class.warning]="!isActiveDayBlocked() && !isActiveDayResolved() && (isActiveDayInReview() || visibleActiveIncidents().length)" [class.resolved]="isActiveDayResolved()" [class.blocked]="isActiveDayBlocked()">
              {{ mainDayStatus() }}
            </span>
            <span class="case-chip blocked" *ngIf="isActiveDayBlocked()">SIN HORARIO ASIGNADO</span>
            <span class="case-chip review" *ngIf="!isActiveDayBlocked() && !isActiveDayResolved() && (isActiveDayInReview() || visibleActiveIncidents().length)">REQUIERE REVISIÓN</span>
            <span class="case-chip resolved" *ngIf="isActiveDayResolved()">REVISADO</span>
            <span class="case-chip ok" *ngIf="activeDetailDay && !isActiveDayBlocked() && !isActiveDayResolved() && !isActiveDayInReview() && !visibleActiveIncidents().length">SIN INCIDENCIAS</span>
          </div>

          <div class="schedule-lock-message" *ngIf="isActiveDayBlocked()">
            <mat-icon>lock_clock</mat-icon>
            <div>
              <strong>Este día no tiene horario asignado.</strong>
              <span>Primero asigna un horario desde Planeación semanal para poder validar marcas o resolver incidencias.</span>
            </div>
          </div>

          <section class="hero-summary">
            <div>
              <span>Tipo de día</span>
              <strong>{{ labelDay(activePlanningDay.dayType) }}</strong>
            </div>
            <div>
              <span>Horario planeado</span>
              <strong>{{ activePlanningDay.startTime || '--' }} - {{ activePlanningDay.endTime || '--' }}</strong>
            </div>
            <div>
              <span>Entrada / salida real</span>
              <strong>{{ displayTime(activeDetailDay?.firstPunchAt) }} - {{ displayTime(activeDetailDay?.lastPunchAt) }}</strong>
            </div>
            <div class="highlight">
              <span>Incidencias</span>
              <strong>{{ visibleActiveIncidents().length }}</strong>
            </div>
            <div>
              <span>TE autorizado</span>
              <strong>{{ formatMinutes(activeDetailDay?.authorizedOvertimeMinutes || 0) }}</strong>
            </div>
          </section>

          <section class="panel-section">
            <div class="section-title"><mat-icon>event_note</mat-icon><h3>Planeación</h3></div>
            <div class="compact-cards">
              <div><span>Tipo</span><strong>{{ labelDay(activePlanningDay.dayType) }}</strong></div>
              <div><span>Horario</span><strong>{{ activePlanningDay.startTime || '--' }} - {{ activePlanningDay.endTime || '--' }}</strong></div>
              <div><span>Break permitido</span><strong>{{ activePlanningDay.breakMinutes || 0 }} min</strong></div>
            </div>
          </section>

          <section *ngIf="activeEmployeeWeek; else panelLoading">
          <section class="panel-section">
            <div class="section-title"><mat-icon>fingerprint</mat-icon><h3>Biométricos</h3></div>
            <div class="metric-grid">
              <div><span>Entrada real</span><strong>{{ displayTime(activeDetailDay?.firstPunchAt) }}</strong></div>
              <div><span>Salida real</span><strong>{{ displayTime(activeDetailDay?.lastPunchAt) }}</strong></div>
              <div><span>Jornada</span><strong>{{ formatMinutes(activeDetailDay?.grossWorkMinutes || 0) }}</strong></div>
              <div><span>Break usado</span><strong>{{ effectiveBreakMinutes(activeDetailDay) }} min</strong></div>
              <div><span>TE autorizado</span><strong>{{ formatMinutes(activeDetailDay?.authorizedOvertimeMinutes || 0) }}</strong></div>
              <div><span>Marcas</span><strong>{{ activeDetailDay?.punchCount ?? 0 }}</strong></div>
            </div>

            <div class="marks-box">
              <h4>Marcas del día</h4>
              <div class="break-summary" *ngIf="breakSummary() as item">
                <div>
                  <span>Inicio break</span>
                  <strong>{{ item.start }}</strong>
                </div>
                <div>
                  <span>Fin break</span>
                  <strong>{{ item.end }}</strong>
                </div>
                <div>
                  <span>Tiempo tomado</span>
                  <strong>{{ item.duration }}</strong>
                </div>
              </div>
              <div class="timeline" *ngIf="markTimeline().length; else noMarks">
                <div class="timeline-item" *ngFor="let mark of markTimeline()" [class.break-mark]="mark.isBreak">
                  <span>{{ mark.time }}</span>
                  <strong>{{ mark.label }}</strong>
                </div>
              </div>
              <ng-template #noMarks>
                <div class="empty-inline"><mat-icon>schedule</mat-icon><span>Sin marcas biométricas para este día.</span></div>
              </ng-template>
            </div>
          </section>

          <section class="panel-section incidents-section">
            <div class="section-title with-action">
              <div><mat-icon>report</mat-icon><h3>Incidencias detectadas</h3></div>
            <button class="add-incident-button" mat-stroked-button type="button" disabled>
              <mat-icon>add</mat-icon>
              Agregar incidencia
            </button>
            </div>
            <div class="incident-list" *ngIf="visibleActiveIncidents().length; else noIncidents">
              <div class="incident-card" *ngFor="let item of visibleActiveIncidents(); let idx = index">
                <div class="incident-card__top">
                  <span class="incident-icon">!</span>
                  <div>
                    <b>{{ formatIncident(item) }}</b>
                    <small>Detectado automáticamente</small>
                  </div>
                </div>
                <div class="incident-card__body">
                  <label>Resolución RH</label>
                  <strong>{{ formatIncident(resolutionCode) }}</strong>
                  <label>Observación</label>
                  <span>{{ resolutionComments || 'Sin observación capturada' }}</span>
                </div>
              </div>
            </div>
            <ng-template #noIncidents>
              <div class="empty-inline" *ngIf="isActiveDayBlocked(); else noDetectedIncidents">
                <mat-icon>lock_clock</mat-icon><span>Sin horario asignado. No se generan incidencias.</span>
              </div>
              <ng-template #noDetectedIncidents>
                <div class="empty-inline success"><mat-icon>check_circle</mat-icon><span>Sin incidencias detectadas.</span></div>
              </ng-template>
            </ng-template>
          </section>

          <section class="panel-section resolution-section" [class.disabled-section]="isActiveDayBlocked()">
            <div class="section-title"><mat-icon>gavel</mat-icon><h3>Resolución RH</h3></div>
            <div class="resolution-form">
              <mat-form-field appearance="outline">
                <mat-label>Resolución</mat-label>
                <mat-select [(ngModel)]="resolutionCode" [disabled]="isActiveDayBlocked()">
                  <mat-option value="SIN_PENALIZACION">Sin penalización</mat-option>
                  <mat-option value="INCAPACIDAD_GENERAL">Incapacidad general</mat-option>
                  <mat-option value="INCAPACIDAD_RT">Incapacidad RT</mat-option>
                  <mat-option value="VACACIONES">Vacaciones</mat-option>
                  <mat-option value="RETARDO_JUSTIFICADO">Retardo justificado</mat-option>
                  <mat-option value="RETARDO_ENTRADA">Retardo entrada</mat-option>
                  <mat-option value="RETARDO_BREAK">Retardo break</mat-option>
                  <mat-option value="FALTA_JUSTIFICADA">Falta justificada</mat-option>
                  <mat-option value="FALTA_INJUSTIFICADA">Falta injustificada</mat-option>
                  <mat-option value="FALTA_CON_GOCE_DE_SUELDO">Falta con goce de sueldo</mat-option>
                  <mat-option value="PAGAR_DIA_REGULAR">Pagar día regular</mat-option>
                  <mat-option value="HRS_EXT_EN_DESCANSO">Hrs ext en descanso</mat-option>
                  <mat-option value="DESCANSO_LABORADO">Descanso laborado</mat-option>
                  <mat-option value="FESTIVO_LABORADO">Festivo laborado</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Observación</mat-label>
                <input matInput [(ngModel)]="resolutionComments" [disabled]="isActiveDayBlocked()">
              </mat-form-field>
            </div>
          </section>

          <section class="panel-section overtime-section" [class.disabled-section]="isActiveDayBlocked()">
            <div class="section-title"><mat-icon>timer</mat-icon><h3>Tiempo extra</h3></div>
            <div class="overtime-board">
              <div><span>Calculado</span><strong>{{ formatMinutes(activeDetailDay?.calculatedOvertimeMinutes || 0) }}</strong></div>
              <div [class.changed]="overtimeAdjustment !== (activeDetailDay?.overtimeAdjustmentMinutes || 0)">
                <span>Ajuste manual</span>
                <input type="number" [(ngModel)]="overtimeAdjustment" [disabled]="isActiveDayBlocked()">
              </div>
              <div><span>Autorizado</span><strong>{{ formatMinutes(activeDetailDay?.authorizedOvertimeMinutes || 0) }}</strong></div>
            </div>
          </section>
          </section>

          <ng-template #panelLoading>
            <div class="panel-loading"><mat-icon>hourglass_top</mat-icon> Cargando detalle...</div>
          </ng-template>
        </div>

        <div class="panel-footer" *ngIf="activeEmployeeWeek">
          <button mat-stroked-button type="button" (click)="closePanel()">Cancelar</button>
          <button mat-flat-button color="primary" type="button" [disabled]="!activeDetailDay || isActiveDayBlocked()" (click)="savePanelChanges()">Guardar cambios</button>
        </div>
      </aside>
      </div>
    </section>
  `,
  styles: [`
  @import '../../../shared/style-snack-bar';
    :host{display:block}.week-workbench{position:relative;padding:24px;color:#f8fafc}.compact-header{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-bottom:14px}.eyebrow{color:#be1e3c;font-weight:900;letter-spacing:.12em}.compact-header h1{font-size:40px;line-height:1;margin:4px 0}.compact-header p{margin:0;color:#9fb3d1}.header-actions{display:flex;align-items:center;gap:8px}.week-pill{height:42px;display:flex;align-items:center;padding:0 16px;border:1px solid #334155;border-radius:12px;background:#151d2c;font-weight:900}.workbar,.grid-card{background:#1b2434!important;border:1px solid #334155;border-radius:16px!important;box-shadow:none!important}.workbar{display:flex!important;justify-content:space-between;align-items:end;gap:14px;padding:14px!important;margin-bottom:12px}.workbar-main{display:grid;grid-template-columns:110px 120px minmax(180px,240px) minmax(240px,1fr) 210px;gap:12px;align-items:end;flex:1}.workbar-main mat-form-field{width:100%}.workbar-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.workbar-actions button{height:48px;font-weight:800}.kpi-strip{display:flex;gap:8px;overflow:auto;margin:10px 0 12px}.kpi-strip span{white-space:nowrap;background:#111827;border:1px solid #334155;border-radius:999px;padding:8px 12px;color:#9fb3d1}.kpi-strip b{color:#f8fafc;margin-right:4px}.loading{display:flex;align-items:center;justify-content:center;gap:10px;min-height:180px;color:#9fb3d1}.grid-card{overflow:hidden;padding:0!important}.grid-title{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #334155}.grid-title strong,.grid-title span{display:block}.grid-title span{color:#9fb3d1;margin-top:2px}.week-grid-scroll{overflow:auto}.week-grid{display:grid;grid-template-columns:minmax(260px,1.2fr) repeat(7,minmax(128px,1fr)) minmax(180px,.8fr);min-width:1360px}.cell{min-height:68px;padding:12px;border-bottom:1px solid #334155;background:#111827;color:#e5e7eb}.header{position:sticky;top:0;z-index:2;background:#0f172a;text-transform:uppercase;font-weight:900;color:#cbd5e1}.employee-col{position:sticky;left:0;z-index:3;border-right:1px solid #334155}.employee-cell strong,.employee-cell span{display:block}.employee-cell span{color:#93a4bf;margin-top:4px}.day-cell{border:0;border-bottom:1px solid #334155;text-align:left;cursor:pointer}.day-cell:hover{background:#172235}.day-cell.rest{background:#202432}.day-cell.vacation{background:#1d3027}.day-cell.review{background:#2b261d;border-left:3px solid #9a6a25}.day-cell.loaded:not(.review){background:#18221f}.status-line{display:block;font-weight:900}.day-cell small{display:block;color:#9fb3d1;margin-top:5px}.day-panel{position:fixed;right:0;top:0;bottom:0;width:min(560px,100vw);z-index:30;background:#111827;border-left:1px solid #334155;box-shadow:-18px 0 40px rgba(0,0,0,.35);padding:20px;overflow:auto}.panel-header{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #334155;padding-bottom:14px;margin-bottom:16px}.panel-header span{color:#9fb3d1}.panel-header h2{margin:4px 0;font-size:26px}.panel-header p{margin:0;color:#9fb3d1}.day-panel section{margin-bottom:18px}.day-panel h3{margin:0 0 10px;color:#f8fafc}.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.info-grid div,.overtime>div,.incident-item{background:#1b2434;border:1px solid #334155;border-radius:12px;padding:12px}.info-grid span,.overtime span,.incident-item span{display:block;color:#9fb3d1}.info-grid strong,.overtime strong{display:block;margin-top:4px}.incident-list{display:grid;gap:8px}.incident-item b{display:block}.resolution{display:grid;gap:10px}.overtime{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end}.muted,.panel-loading{color:#9fb3d1}.panel-loading{display:flex;align-items:center;gap:8px;padding:20px}
    .screen-lock{position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;background:rgba(8,13,25,.62);backdrop-filter:blur(3px)}
    .screen-lock__box{display:grid;justify-items:center;gap:8px;min-width:280px;max-width:360px;padding:22px;border:1px solid var(--border-color);border-radius:16px;background:var(--bg-card);color:var(--text-primary);box-shadow:0 24px 70px rgba(0,0,0,.38);text-align:center}
    .screen-lock__box mat-icon{width:34px;height:34px;font-size:34px;color:#4b5eaa;animation:spinBusy 1s linear infinite}
    .screen-lock__box strong{font-size:16px}
    .screen-lock__box span{color:var(--text-secondary);font-size:13px}
    @keyframes spinBusy{to{transform:rotate(360deg)}}
    .resolution-panel{display:flex;flex-direction:column;height:100vh!important;max-height:100vh!important;background:var(--bg-card)!important;color:var(--text-primary)!important;border-left:1px solid var(--border-color)!important;padding:0!important;overflow:hidden!important}
    .panel-week-nav,.resolution-panel__header,.panel-footer{flex:0 0 auto}
    .panel-body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding-bottom:12px}
    .resolution-panel__header{display:flex;justify-content:space-between;gap:12px;padding:16px 20px 14px;border-bottom:1px solid var(--border-color);background:color-mix(in srgb,var(--bg-card) 88%,#4658b8 12%);box-shadow:inset 4px 0 0 #4658b8}
    .day-date-nav{display:inline-grid;grid-template-columns:28px auto 28px;align-items:center;column-gap:6px;margin-bottom:4px}
    .day-nav-button{width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:var(--text-primary);display:inline-flex;align-items:center;justify-content:center;padding:0;cursor:pointer}
    .day-nav-button:hover:not(:disabled){background:color-mix(in srgb,var(--bg-card) 82%,var(--text-primary) 10%)}
    .day-nav-button:disabled{opacity:.35;cursor:default}
    .day-nav-button .mat-icon{font-size:22px;width:22px;height:22px;line-height:22px}
    .add-incident-button{max-width:190px;min-width:0;white-space:normal!important;line-height:1.1!important;padding:0 10px!important}
    .day-context .day-date{display:block;color:var(--text-secondary);font-weight:800;text-transform:capitalize}
    .day-context h2{margin:5px 0 3px;font-size:25px;line-height:1.05}
    .day-context p{margin:0;color:var(--text-secondary)}
    .case-badges{display:flex;gap:8px;flex-wrap:wrap;padding:12px 20px 0}
    .case-chip{display:inline-flex;align-items:center;border:1px solid var(--border-color);border-radius:999px;background:var(--bg-card-alt);color:var(--text-primary);font-weight:900;font-size:12px;letter-spacing:.04em;padding:7px 10px}
    .case-chip.warning,.case-chip.review{border-color:#b7791f;color:#975a16;background:color-mix(in srgb,var(--bg-card) 88%,#b7791f 12%)}
    .case-chip.resolved{border-color:#2f855a;color:#276749;background:color-mix(in srgb,var(--bg-card) 88%,#2f855a 12%)}
    .case-chip.ok{border-color:#2f855a;color:#276749;background:color-mix(in srgb,var(--bg-card) 88%,#2f855a 12%)}
    .case-chip.blocked{border-color:color-mix(in srgb,var(--border-color) 72%,#64748b 28%);color:var(--text-secondary);background:color-mix(in srgb,var(--bg-card) 86%,#64748b 10%)}
    .schedule-lock-message{display:flex;align-items:flex-start;gap:10px;margin:12px 20px 0;padding:12px;border:1px dashed color-mix(in srgb,var(--border-color) 72%,#64748b 28%);border-radius:14px;background:color-mix(in srgb,var(--bg-card) 90%,#64748b 8%);color:var(--text-primary)}
    .schedule-lock-message mat-icon{color:var(--text-secondary)}
    .schedule-lock-message strong,.schedule-lock-message span{display:block}.schedule-lock-message span{margin-top:2px;color:var(--text-secondary);font-size:13px;line-height:1.25}
    .hero-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:14px 20px;padding:12px;border:1px solid var(--border-color);border-radius:16px;background:color-mix(in srgb,var(--bg-card) 88%,var(--carsug-red) 12%)}
    .hero-summary div{min-width:0}.hero-summary span,.compact-cards span,.metric-grid span,.overtime-board span{display:block;color:var(--text-secondary);font-size:12px;font-weight:700}.hero-summary strong,.compact-cards strong,.metric-grid strong,.overtime-board strong{display:block;color:var(--text-primary);font-size:17px;margin-top:3px}.hero-summary .highlight strong{font-size:26px;color:var(--carsug-red)}
    .panel-section{margin:0 20px 16px!important}
    .section-title{display:flex;align-items:center;gap:8px;margin-bottom:9px}.section-title h3{margin:0!important;color:var(--text-primary)!important}.section-title mat-icon{color:var(--carsug-red)}.section-title.with-action{justify-content:space-between}.section-title.with-action>div{display:flex;align-items:center;gap:8px}.section-title.with-action button{height:36px}
    .compact-cards,.metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    .compact-cards div,.metric-grid div,.overtime-board div{border:1px solid var(--border-color);border-radius:12px;background:var(--bg-card-alt);padding:10px}
    .marks-box{border:1px solid var(--border-color);border-radius:14px;background:var(--bg-card-alt);padding:12px;margin-top:10px}.marks-box h4{margin:0 0 8px}
    .timeline{display:grid;gap:7px}.timeline-item{display:grid;grid-template-columns:64px 1fr;gap:8px;align-items:center}.timeline-item span{font-weight:900;color:var(--carsug-red)}.timeline-item strong{border-left:2px solid var(--border-color);padding-left:10px}
    .empty-inline{display:flex;align-items:center;gap:8px;color:var(--text-secondary);border:1px dashed var(--border-color);border-radius:12px;padding:12px}.empty-inline.success mat-icon{color:#2f855a}
    .incidents-section .incident-list{display:grid;gap:10px}.incident-card{border:1px solid var(--border-color);border-radius:14px;background:var(--bg-card-alt);padding:12px}.incident-card__top{display:flex;gap:10px;align-items:flex-start}.incident-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:color-mix(in srgb,var(--bg-card) 76%,#b7791f 24%);color:#9a6a25;font-weight:900}.incident-card small,.incident-card label,.incident-card__body span{color:var(--text-secondary)}.incident-card__body{display:grid;gap:3px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-color)}.incident-card__body label{font-size:12px;font-weight:800;text-transform:uppercase}.incident-card__body strong{font-size:14px}
    .break-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border-color)}
    .break-summary div{min-width:0;border:1px solid var(--border-color);border-radius:10px;background:var(--bg-card);padding:9px 10px}
    .break-summary span{display:block;color:var(--text-secondary);font-size:11px;font-weight:800;text-transform:uppercase}
    .break-summary strong{display:block;margin-top:3px;color:var(--text-primary);font-size:15px}
    .timeline-item.break-mark strong{border-left-color:#4f7f99;color:#315c72}
    :host-context(.dark-theme) .timeline-item.break-mark strong{color:#aebfca}
    .incident-card{padding:14px!important}
    .incident-card__top{align-items:center!important}
    .incident-card__top b,.incident-card__top small{display:block}
    .incident-card__top b{line-height:1.15}
    .incident-card__top small{margin-top:4px;font-size:12px}
    .incident-card__body{grid-template-columns:1fr;gap:8px!important;margin-top:12px!important;padding-top:12px!important}
    .incident-card__body label{margin-bottom:-5px}
    .resolution-form{display:grid;gap:8px}.overtime-board{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.overtime-board input{width:100%;border:0;background:transparent;color:var(--text-primary);font-size:20px;font-weight:900;outline:0}.overtime-board .changed{border-color:var(--carsug-red);box-shadow:inset 0 0 0 1px var(--carsug-red)}
    .disabled-section{opacity:.62}.disabled-section input{cursor:not-allowed}
    .panel-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:0;padding:12px 20px;background:var(--bg-card);border-top:1px solid var(--border-color);overflow:hidden;box-shadow:0 -10px 22px rgba(0,0,0,.18)}
    .panel-footer button{height:40px;min-width:132px;padding:0 14px!important;font-size:14px;font-weight:800!important}
    @media(max-width:620px){.panel-footer button{flex:1 1 140px}.add-incident-button{max-width:160px;font-size:12px!important}}
    .week-workbench{color:var(--text-primary)}
    .compact-header h1{color:var(--text-primary)}
    .compact-header p{color:var(--text-secondary)}
    .eyebrow{color:var(--carsug-red)}
    .week-picker-shell{position:relative;flex:0 0 auto}
    .week-range{display:grid;grid-template-columns:1fr auto;grid-template-areas:"title icon" "range icon";align-items:center;gap:2px 10px;border:1px solid var(--border-color);border-radius:14px;background:var(--bg-card);color:var(--text-primary);padding:10px 14px;min-width:220px;text-align:left;cursor:pointer}
    .week-range:hover{border-color:color-mix(in srgb,var(--border-color) 55%,var(--text-primary) 45%);background:color-mix(in srgb,var(--bg-card) 88%,var(--text-primary) 6%)}
    .week-range strong{grid-area:title}
    .week-range span{grid-area:range;color:var(--text-secondary)}
    .week-range mat-icon{grid-area:icon;color:var(--text-secondary)}
    .week-picker-proxy{position:absolute;right:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none}
    .week-pill{background:var(--bg-card);color:var(--text-primary);border-color:var(--border-color)}
    .header-actions button,.panel-week-nav button{border-color:transparent!important;background:transparent!important;box-shadow:none!important;color:var(--text-primary)!important}
    .header-actions .week-pill,.panel-week-nav .week-pill{border-color:transparent!important;background:transparent!important;padding:0 10px}
    .workbar,.grid-card{background:var(--bg-card)!important;color:var(--text-primary)!important;border-color:var(--border-color)!important}
    .workbar{display:grid!important;grid-template-columns:minmax(92px,110px) minmax(104px,120px) minmax(170px,220px) minmax(280px,1fr) minmax(180px,220px);gap:12px;align-items:end;justify-content:stretch}
    .workbar-main{display:contents}
    .workbar-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:10px;align-items:center;flex-wrap:wrap;padding-top:2px}
    .workbar-main mat-form-field{width:100%;min-width:0}
    .workbar-actions button{height:46px;white-space:nowrap}
    .action-button{min-width:158px;border-radius:10px!important;font-weight:900!important;letter-spacing:.01em}
    .action-button mat-icon{margin-right:6px}
    .load-action{background:#4b5eaa!important;color:#fff!important;box-shadow:0 8px 18px rgba(70,88,184,.14)}
    .export-action{border-color:#2f6f55!important;color:#276749!important;background:color-mix(in srgb,var(--bg-card) 91%,#2f6f55 9%)!important}
    .import-action{border-color:#4f7f99!important;color:#315c72!important;background:color-mix(in srgb,var(--bg-card) 91%,#4f7f99 9%)!important}
    .authorize-action{border-color:#9a6a25!important;color:#8a5a16!important;background:color-mix(in srgb,var(--bg-card) 91%,#9a6a25 9%)!important}
    :host-context(.dark-theme) .export-action{border-color:#355f4d!important;color:#c4d8cb!important;background:#17251f!important}
    :host-context(.dark-theme) .import-action{border-color:#4f7f99!important;color:#dbe7ee!important;background:#1d2c36!important}
    :host-context(.dark-theme) .authorize-action{border-color:#735928!important;color:#e0c99d!important;background:#251f16!important}
    .action-button:disabled{opacity:.45;box-shadow:none}
    .kpi-strip span{background:var(--bg-card);border-color:var(--border-color);color:var(--text-secondary)}
    .kpi-strip b{color:var(--text-primary)}
    .loading{color:var(--text-secondary)}
    .uen-empty{display:flex;align-items:center;gap:14px;padding:22px!important;border:1px dashed var(--border-color)!important;border-radius:16px!important;background:color-mix(in srgb,var(--bg-card) 94%,var(--text-primary) 4%)!important;color:var(--text-primary)!important}
    .uen-empty mat-icon{width:34px;height:34px;font-size:34px;color:var(--text-secondary)}
    .uen-empty strong,.uen-empty span{display:block}
    .uen-empty span{color:var(--text-secondary);margin-top:3px}
    .grid-title{border-bottom-color:var(--border-color)}
    .grid-title span{color:var(--text-secondary)}
    .attendance-split{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;align-items:start}
    .attendance-split.panel-open{grid-template-columns:minmax(0,70%) minmax(360px,30%)}
    .attendance-main{min-width:0}
    .legend{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .legend span{display:inline-flex!important;align-items:center;gap:6px;margin:0;color:var(--text-secondary);font-size:12px;font-weight:800}
    .legend i{width:14px;height:14px;border-radius:4px;border:1px solid var(--border-color);background:var(--bg-card-alt)}
    .legend i.incident{background:color-mix(in srgb,var(--bg-card) 86%,#b7791f 14%);border-color:#b7791f}
    .legend i.rest{background:#e8f1f7;border-color:#4f7f99}
    .legend i.vacation{background:#e5f3ea;border-color:#4f8f6b}
    .cell{background:var(--bg-card);color:var(--text-primary);border-bottom-color:var(--border-color)}
    .header{background:var(--bg-card-alt);color:var(--text-primary)}
    .employee-col{border-right-color:var(--border-color)}
    .employee-cell span,.day-cell small{color:var(--text-secondary)}
    .day-cell:hover{background:color-mix(in srgb,var(--bg-card) 94%,var(--text-primary) 5%)}
    .day-cell.rest{background:color-mix(in srgb,var(--bg-card) 94%,#4f7f99 6%)!important;border-left:3px solid #4f7f99;color:var(--text-primary)}
    .day-cell.rest .status-line{color:#315c72}
    .day-cell.rest small{color:var(--text-secondary)}
    .day-cell.vacation{background:color-mix(in srgb,var(--bg-card) 94%,#4f8f6b 6%)!important;border-left:3px solid #4f8f6b;color:var(--text-primary)}
    .day-cell.vacation .status-line{color:#2f6f4b}
    .day-cell.vacation small{color:var(--text-secondary)}
    .day-cell.review{background:color-mix(in srgb,var(--bg-card) 96%,#b7791f 4%);border-left:3px solid #b7791f}
    .day-cell.absence{background:color-mix(in srgb,var(--bg-card) 96%,#b4233f 4%)!important;border-left:3px solid #b4233f!important}
    .day-cell.absence .status-line{color:#8f1730}
    .day-cell.absence small{color:#8f1730;font-weight:700}
    .day-cell.resolved{background:color-mix(in srgb,var(--bg-card) 94%,#3f7f5a 6%)!important;border-left:3px solid #3f7f5a!important}
    .day-cell.resolved .status-line{color:#1f5135}
    .day-cell.resolved small{color:#276749;font-weight:700}
    .day-cell.unscheduled{background:color-mix(in srgb,var(--bg-card) 96%,#64748b 4%)!important;border-left:3px solid color-mix(in srgb,var(--border-color) 62%,#64748b 38%)!important;color:var(--text-secondary)}
    .day-cell.unscheduled .status-line{color:var(--text-secondary)}
    .day-cell.unscheduled small{color:var(--text-secondary);font-weight:700}
    .day-cell.loaded:not(.review):not(.rest):not(.vacation):not(.resolved):not(.unscheduled){background:transparent!important}
    .status-line{color:var(--text-primary)}
    .grid-card{border-radius:14px!important;background:linear-gradient(180deg,color-mix(in srgb,var(--bg-card) 96%,var(--text-primary) 3%),var(--bg-card))!important}
    .grid-title{padding:12px 16px;background:color-mix(in srgb,var(--bg-card) 94%,var(--text-primary) 4%)}
    .week-grid-scroll{background:color-mix(in srgb,var(--bg-card) 96%,var(--text-primary) 2%)}
    .week-grid{grid-template-columns:minmax(260px,.95fr) repeat(7,minmax(142px,1fr)) minmax(245px,.88fr);min-width:1505px}
    .cell{min-height:50px;padding:8px 10px}
    .header{min-height:42px;display:flex;align-items:center;font-size:12px;letter-spacing:.02em;background:color-mix(in srgb,var(--bg-card) 86%,var(--text-primary) 5%);border-bottom:1px solid color-mix(in srgb,var(--border-color) 70%,var(--text-primary) 15%)}
    .day-head{justify-content:center}
    .employee-cell{min-height:54px;display:flex;flex-direction:column;justify-content:center;background:color-mix(in srgb,var(--bg-card) 92%,var(--text-primary) 3%)}
    .employee-cell strong{font-size:13px;line-height:1.15;font-weight:800}
    .employee-cell span{font-size:12px}
    .day-cell{position:relative;display:flex;flex-direction:column;justify-content:center;gap:2px;min-height:54px;border-left:1px solid var(--border-color);background:transparent;transition:background .15s ease,border-color .15s ease,box-shadow .15s ease}
    .day-cell::after{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:999px;background:transparent}
    .day-cell:hover{background:color-mix(in srgb,var(--bg-card) 90%,var(--text-primary) 6%);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--border-color) 68%,var(--text-primary) 16%)}
    .day-cell.loaded:not(.review):not(.rest):not(.vacation):not(.resolved):not(.unscheduled){background:transparent!important}
    .day-cell.loaded:not(.review):not(.rest):not(.vacation):not(.resolved):not(.unscheduled):not(.absence)::after{background:#64748b}
    .day-cell.review{background:color-mix(in srgb,var(--bg-card) 97%,#b7791f 3%);border-left:1px solid var(--border-color)}
    .day-cell.review::after{background:#b7791f}
    .day-cell.absence{background:color-mix(in srgb,var(--bg-card) 97%,#b4233f 3%)!important;border-left:1px solid var(--border-color)!important}
    .day-cell.absence::after{background:#b4233f}
    .day-cell.resolved{background:color-mix(in srgb,var(--bg-card) 96%,#3f7f5a 4%)!important;border-left:1px solid var(--border-color)!important}
    .day-cell.resolved::after{background:#3f7f5a}
    .day-cell.unscheduled{background:color-mix(in srgb,var(--bg-card) 97%,#64748b 3%)!important;border-left:1px solid var(--border-color)!important;cursor:not-allowed}
    .day-cell.unscheduled::after{background:color-mix(in srgb,var(--border-color) 62%,#64748b 38%)}
    .day-cell.rest::after{background:#4f7f99}
    .day-cell.vacation::after{background:#4f8f6b}
    .day-cell.active{outline:2px solid var(--carsug-red);outline-offset:-3px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--carsug-red) 60%,transparent)}
    .status-line{font-size:12.5px;line-height:1.12;font-weight:800;padding-left:7px}
    .day-cell small{display:inline-flex!important;align-items:center;width:max-content;max-width:calc(100% - 7px);font-size:11px;line-height:1.1;margin-top:2px;margin-left:7px;padding:2px 6px;border-radius:999px;background:color-mix(in srgb,var(--bg-card) 88%,var(--text-secondary) 8%);color:var(--text-secondary)}
    .day-cell.loaded:not(.review):not(.absence):not(.rest):not(.vacation):not(.resolved):not(.unscheduled) small{background:transparent;padding-left:0;color:var(--text-secondary)}
    .day-cell.review small{background:color-mix(in srgb,var(--bg-card) 82%,#b7791f 18%);color:#8a5a16}
    .day-cell.absence small{background:color-mix(in srgb,var(--bg-card) 84%,#b4233f 16%);color:#8f1730}
    .day-cell.resolved small{background:color-mix(in srgb,var(--bg-card) 82%,#3f7f5a 18%);color:#276749}
    .day-cell.unscheduled small{background:color-mix(in srgb,var(--bg-card) 82%,#64748b 14%);color:var(--text-secondary)} .day-cell.unscheduled:disabled{opacity:1;pointer-events:none}
    .day-cell.rest small{background:color-mix(in srgb,var(--bg-card) 84%,#4f7f99 16%);color:#315c72}
    .day-cell.vacation small{background:color-mix(in srgb,var(--bg-card) 84%,#4f8f6b 16%);color:#2f6f4b}
    .overtime-col{border-left:1px solid var(--border-color)}
    .weekly-overtime-cell{display:grid;grid-template-rows:auto auto auto auto;gap:8px;background:color-mix(in srgb,var(--bg-card) 98%,var(--text-primary) 2%);min-height:146px;padding:10px 12px;overflow:hidden}
    .weekly-overtime-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .weekly-overtime-summary span{min-width:0;border:1px solid color-mix(in srgb,var(--border-color) 78%,transparent);border-radius:9px;background:color-mix(in srgb,var(--bg-card) 94%,var(--text-primary) 4%);padding:7px 8px}
    .weekly-overtime-summary small,.weekly-overtime-edit span{display:block;color:var(--text-secondary);font-size:9px;font-weight:900;text-transform:uppercase;line-height:1}
    .weekly-overtime-summary strong{display:block;margin-top:4px;font-size:14px;line-height:1.05;color:var(--text-primary);white-space:nowrap}
    .weekly-overtime-summary span:last-child strong{color:#276749}
    .weekly-overtime-edit{display:grid;grid-template-columns:1fr;gap:5px;align-items:center}
    .weekly-overtime-edit>div{display:block;width:100%;border:1px solid var(--border-color);border-radius:9px;background:var(--bg-card);overflow:hidden}
    .weekly-overtime-edit input{box-sizing:border-box;min-width:0;width:100%;height:36px;border:0;background:transparent;color:var(--text-primary);font-size:18px;font-weight:900;text-align:center;padding:0 12px;outline:0}
    .weekly-overtime-edit:focus-within>div,.weekly-overtime-note:focus-within input{border-color:#4658b8;box-shadow:0 0 0 2px color-mix(in srgb,#4658b8 20%,transparent)}
    .weekly-overtime-note{display:block}
    .weekly-overtime-note input{box-sizing:border-box;width:100%;height:32px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card);color:var(--text-primary);font-size:12px;padding:0 9px;outline:0}
    .weekly-overtime-note input::placeholder{color:var(--text-secondary)}
    .save-weekly-overtime{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;height:30px;border:1px solid color-mix(in srgb,var(--border-color) 84%,#4658b8 16%);border-radius:8px;background:color-mix(in srgb,var(--bg-card) 88%,#4658b8 12%);color:var(--text-primary);font-size:12px;font-weight:900;cursor:pointer}
    .save-weekly-overtime:disabled{opacity:.45;cursor:default}
    .save-weekly-overtime:hover:not(:disabled){background:color-mix(in srgb,var(--bg-card) 80%,#4658b8 20%)}
    .save-weekly-overtime .mat-icon{font-size:18px;width:18px;height:18px;line-height:18px}
    .weekly-overtime-cell.blocked{background:color-mix(in srgb,var(--bg-card) 96%,#64748b 4%)}
    .weekly-overtime-blocked{display:flex;align-items:center;justify-content:center;gap:7px;min-height:67px;border:1px dashed color-mix(in srgb,var(--border-color) 74%,#64748b 26%);border-radius:9px;background:color-mix(in srgb,var(--bg-card) 90%,#64748b 8%);color:var(--text-secondary);font-size:11px;font-weight:900;text-align:center;line-height:1.15;padding:8px}
    .weekly-overtime-blocked .mat-icon{width:17px;height:17px;font-size:17px;line-height:17px;color:var(--text-secondary)}
    .weekly-overtime-locked{display:grid;grid-template-columns:1fr 1fr;gap:7px;height:100%;padding:10px;border:1px solid color-mix(in srgb,#3f7f5a 58%,var(--border-color));border-radius:12px;background:linear-gradient(135deg,color-mix(in srgb,var(--bg-card) 78%,#3f7f5a 22%),color-mix(in srgb,var(--bg-card) 90%,#3f7f5a 10%));box-shadow:inset 4px 0 0 #3f7f5a}
    .weekly-overtime-locked div{min-width:0}
    .weekly-overtime-locked span{display:block;color:var(--text-secondary);font-size:9px;font-weight:900;text-transform:uppercase;line-height:1}
    .weekly-overtime-locked strong{display:block;margin-top:4px;color:var(--text-primary);font-size:13px;line-height:1.05}
    .weekly-overtime-locked div:nth-child(3){grid-column:1/-1}
    .weekly-overtime-locked div:nth-child(3) strong{color:#276749;font-size:15px}
    .weekly-overtime-locked p{grid-column:1/-1;margin:0;min-height:24px;max-height:36px;overflow:hidden;color:var(--text-secondary);font-size:11.5px;line-height:1.2}
    .weekly-overtime-locked button{grid-column:1/-1;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;border:1px solid color-mix(in srgb,#3f7f5a 58%,var(--border-color));border-radius:8px;background:color-mix(in srgb,var(--bg-card) 84%,#3f7f5a 16%);color:var(--text-primary);font-size:12px;font-weight:900;cursor:pointer}
    .weekly-overtime-locked button:hover{background:color-mix(in srgb,var(--bg-card) 76%,#3f7f5a 24%)}
    .weekly-overtime-locked .mat-icon{font-size:17px;width:17px;height:17px;line-height:17px}
    .week-workbench.detail-open{padding:24px;margin:0}
    .week-workbench.detail-open .attendance-main{padding:0}
    .week-workbench.detail-open .compact-header .header-actions{display:flex}
    .week-workbench.detail-open .workbar{grid-template-columns:minmax(92px,110px) minmax(104px,120px) minmax(170px,220px) minmax(280px,1fr) minmax(180px,220px)}
    .week-workbench.detail-open .workbar-actions{display:flex;grid-column:1/-1;justify-content:flex-end;gap:10px;align-items:center;flex-wrap:wrap}
    .week-workbench.detail-open .workbar-actions button{height:46px;min-width:158px}
    .panel-week-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;background:color-mix(in srgb,var(--bg-card) 86%,#4658b8 14%);border-bottom:1px solid var(--border-color);box-shadow:inset 4px 0 0 #4658b8}.panel-week-nav__controls{display:flex;align-items:center;justify-content:center;gap:8px;flex:1}.panel-week-nav button{height:40px;font-weight:800}.panel-week-nav .week-pill{height:42px}.panel-close-button{flex:0 0 auto;color:var(--text-primary)!important;background:transparent!important}
    .attendance-split.panel-open{grid-template-columns:minmax(0,1fr)}
    .attendance-split{gap:14px}
    .week-grid{grid-template-columns:minmax(240px,.95fr) repeat(7,minmax(116px,1fr)) minmax(245px,.88fr);min-width:1325px}
    .attendance-split:not(.panel-open) .week-grid{grid-template-columns:minmax(280px,.95fr) repeat(7,minmax(138px,1fr)) minmax(245px,.88fr);min-width:1485px}
    .cell{min-height:54px;padding:8px 10px}
    .employee-cell{min-height:146px;display:grid;grid-template-columns:38px minmax(0,1fr);gap:10px;align-items:center;background:linear-gradient(135deg,color-mix(in srgb,var(--bg-card) 92%,var(--text-primary) 4%),var(--bg-card));box-shadow:inset -1px 0 0 var(--border-color)}
    .employee-avatar{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:12px;background:color-mix(in srgb,var(--bg-card) 78%,#4658b8 22%);border:1px solid color-mix(in srgb,var(--border-color) 70%,#4658b8 30%);color:var(--text-primary);font-size:12px;font-weight:900;letter-spacing:.02em}
    .employee-cell strong{font-size:13.5px;line-height:1.15;font-weight:900}
    .employee-cell span{font-size:12px;margin-top:5px}
    .day-cell{min-height:146px;padding:14px 12px;border-left:1px solid color-mix(in srgb,var(--border-color) 82%,transparent);background:color-mix(in srgb,var(--bg-card) 98%,var(--text-primary) 2%);justify-content:center;gap:7px}
    .day-cell::after{left:0;top:14px;bottom:14px;width:4px;border-radius:0 999px 999px 0;opacity:.9}
    .day-cell:hover{background:color-mix(in srgb,var(--bg-card) 92%,var(--text-primary) 6%);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--border-color) 60%,var(--text-primary) 18%)}
    .status-line{display:block;max-width:calc(100% - 10px);font-size:14px;line-height:1.08;font-weight:900;padding-left:8px;letter-spacing:0;white-space:normal;overflow-wrap:normal;word-break:normal}
    .day-cell small{display:inline-flex!important;align-items:center;width:fit-content;max-width:calc(100% - 12px);margin-left:8px;margin-top:0;padding:4px 8px;border-radius:10px;font-size:11px;line-height:1.05;font-weight:800;background:color-mix(in srgb,var(--bg-card) 84%,var(--text-secondary) 10%);white-space:normal;overflow-wrap:anywhere}
    .day-cell.loaded:not(.review):not(.absence):not(.rest):not(.vacation):not(.resolved):not(.unscheduled) small{padding:0;margin-left:8px;background:transparent;color:var(--text-secondary)}
    .day-cell.review{background:color-mix(in srgb,var(--bg-card) 94%,#b7791f 6%)}
    .day-cell.absence{background:color-mix(in srgb,var(--bg-card) 92%,#b4233f 8%)!important}
    .day-cell.resolved{background:color-mix(in srgb,var(--bg-card) 92%,#3f7f5a 8%)!important}
    .day-cell.rest{background:color-mix(in srgb,var(--bg-card) 91%,#4f7f99 9%)!important}
    .day-cell.vacation{background:color-mix(in srgb,var(--bg-card) 91%,#4f8f6b 9%)!important}
    .weekly-overtime-cell{min-height:146px}
    :host-context(.dark-theme) .legend i.incident{background:#2b261d;border-color:#9a6a25}
    :host-context(.dark-theme) .legend i.rest{background:#1d2c36;border-color:#4f7f99}
    :host-context(.dark-theme) .legend i.vacation{background:#1d3027;border-color:#4f8f6b}
    :host-context(.dark-theme) .day-cell.rest{background:color-mix(in srgb,var(--bg-card) 88%,#4f7f99 12%)!important;border-left-color:#4f7f99;color:#dbe7ee}
    :host-context(.dark-theme) .day-cell.rest .status-line{color:#dbe7ee}
    :host-context(.dark-theme) .day-cell.rest small{color:#aebfca}
    :host-context(.dark-theme) .day-cell.vacation{background:color-mix(in srgb,var(--bg-card) 88%,#4f8f6b 12%)!important;border-left-color:#4f8f6b;color:#dbe9df}
    :host-context(.dark-theme) .day-cell.vacation .status-line{color:#dbe9df}
    :host-context(.dark-theme) .day-cell.vacation small{color:#a8c5b3}
    :host-context(.dark-theme) .day-cell.loaded:not(.review):not(.rest):not(.vacation):not(.resolved):not(.unscheduled){background:transparent!important}
    :host-context(.dark-theme) .day-cell.review{background:color-mix(in srgb,var(--bg-card) 95%,#b7791f 5%)}
    :host-context(.dark-theme) .day-cell.review small{background:color-mix(in srgb,var(--bg-card) 78%,#b7791f 22%);color:#e0c99d}
    :host-context(.dark-theme) .day-cell.absence{background:color-mix(in srgb,var(--bg-card) 95%,#b4233f 5%)!important;border-left-color:var(--border-color)!important}
    :host-context(.dark-theme) .day-cell.absence .status-line{color:#f0d7dc}
    :host-context(.dark-theme) .day-cell.absence small{background:color-mix(in srgb,var(--bg-card) 78%,#b4233f 22%);color:#d9a5ae}
    :host-context(.dark-theme) .day-cell.resolved{background:color-mix(in srgb,var(--bg-card) 94%,#4f8f6b 6%)!important;border-left-color:var(--border-color)!important}
    :host-context(.dark-theme) .day-cell.resolved .status-line{color:#e0ece4}
    :host-context(.dark-theme) .day-cell.resolved small{background:color-mix(in srgb,var(--bg-card) 78%,#4f8f6b 22%);color:#b5cbbb}
    :host-context(.dark-theme) .case-chip.resolved{border-color:#4f8f6b;color:#c8ddce;background:#1d3027}
    :host-context(.dark-theme) .case-chip.warning,:host-context(.dark-theme) .case-chip.review{border-color:#9a6a25;color:#e0c99d;background:#2b261d}
    @media(min-width:901px){.day-panel{position:fixed;top:0;right:0;bottom:0;width:min(560px,100vw);max-height:100vh;z-index:1000;box-shadow:-18px 0 40px rgba(0,0,0,.35);border-left:1px solid var(--border-color)!important;border-right:0!important;border-radius:0!important;overflow:hidden}.resolution-panel__header{background:color-mix(in srgb,var(--bg-card) 88%,#4658b8 12%)}}
    @media(max-width:1400px){.workbar{grid-template-columns:minmax(92px,110px) minmax(104px,120px) minmax(170px,220px) minmax(260px,1fr) minmax(180px,220px)}.workbar-actions{display:flex;grid-column:1/-1;justify-content:flex-start;gap:8px;align-items:center;flex-wrap:wrap}.workbar-actions button{height:44px}}
    @media(max-width:1200px){.workbar{grid-template-columns:1fr 1fr}.workbar-main{display:contents}.workbar-main .search{grid-column:1/-1}.workbar-actions{grid-column:1/-1;justify-content:flex-start}.compact-header{align-items:stretch;flex-direction:column}.attendance-split.panel-open{grid-template-columns:minmax(0,64%) minmax(340px,36%)}}
    @media(max-width:900px){.attendance-split,.attendance-split.panel-open{display:block}.legend{justify-content:flex-start}.day-panel{position:fixed;right:0;top:0;bottom:0;width:min(560px,100vw);box-shadow:-18px 0 40px rgba(0,0,0,.35)}}
    @media(max-width:720px){.week-workbench{padding:16px}.compact-header h1{font-size:32px}.header-actions,.workbar-actions{align-items:stretch;flex-direction:column}.workbar-main{grid-template-columns:1fr}.workbar-actions button,.header-actions button{width:100%}.info-grid,.overtime{grid-template-columns:1fr}.grid-title{align-items:flex-start;flex-direction:column}}
  `],
})
export class AttendanceWeeksPageComponent implements OnInit {
  catalogs: HrCatalogs | null = null;
  summary: AttendanceWeekSummary | null = null;
  planning: AttendancePlanningWeek | null = null;
  filteredEmployees: AttendancePlanningEmployee[] = [];
  detailCache: Record<number, AttendanceEmployeeWeek> = {};
  detailLoaded: Record<number, boolean> = {};
  activeEmployee: AttendancePlanningEmployee | null = null;
  activePlanningDay: AttendancePlanningDay | null = null;
  activeEmployeeWeek: AttendanceEmployeeWeek | null = null;
  activeDetailDay: AttendanceEmployeeDay | null = null;
  loading = false;
  year = new Date().getFullYear();
  week = this.currentWeek();
  selectedWeekDate = new Date();
  sucursalesId: number | null = null;
  uenSelection: UenSelection = null;
  search = '';
  incidentFilter: IncidentFilter = 'ALL';
  resolutionCode = 'SIN_PENALIZACION';
  resolutionComments = '';
  overtimeAdjustment = 0;
  weeklyOvertimeAdjustmentDrafts: Record<number, number> = {};
  weeklyOvertimeCommentDrafts: Record<number, string> = {};
  savingWeeklyOvertime: Record<number, boolean> = {};
  editingWeeklyOvertime: Record<number, boolean> = {};
  lockedWeeklyOvertime: Record<number, boolean> = {};
  importingReviewedReport = false;
  screenBusy = false;
  screenBusyMessage = '';
  originalResolutionCode = 'SIN_PENALIZACION';
  originalResolutionComments = '';
  originalOvertimeAdjustment = 0;
  days = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

  constructor(private hr: HrService, private snackbar: SnackbarService) {}

  ngOnInit(): void {
    this.hr.getCatalogs().subscribe((x) => (this.catalogs = x));
  }

  load(preservePanel = false): void {
    this.year = Number(this.year) || new Date().getFullYear();
    this.week = Math.min(53, Math.max(1, Number(this.week) || 1));
    if (!this.hasUenSelection()) {
      this.summary = null;
      this.planning = null;
      this.filteredEmployees = [];
      this.detailCache = {};
      this.detailLoaded = {};
      this.forceClosePanel();
      this.loading = false;
      return;
    }
    this.loading = true;
    const activeEmployeeId = preservePanel ? this.activeEmployee?.employeeId ?? null : null;
    const activeDayIndex = preservePanel && this.activeEmployee && this.activePlanningDay
      ? this.activeEmployee.days.findIndex((day) => sameDate(day.date, this.activePlanningDay!.date))
      : -1;
    if (!preservePanel) this.forceClosePanel();
    this.detailCache = {};
    this.weeklyOvertimeAdjustmentDrafts = {};
    this.weeklyOvertimeCommentDrafts = {};
    this.editingWeeklyOvertime = {};
    this.lockedWeeklyOvertime = {};
    const sucursalesId = this.selectedSucursalesId();
    forkJoin({
      planning: this.hr.getAttendancePlanning({ year: this.year, week: this.week, sucursalesId }),
      summary: this.hr.getAttendanceWeekSummary({ year: this.year, week: this.week, sucursalesId }),
    }).pipe(finalize(() => (this.loading = false))).subscribe({
      next: ({ planning, summary }) => {
        this.planning = planning;
        this.summary = summary;
        this.selectedWeekDate = parseLocalDate(summary.weekStart);
        this.detailCache = {};
        this.detailLoaded = {};
        (summary.employeeWeeks ?? []).forEach((employeeWeek) => {
          this.detailCache[employeeWeek.employeeId] = employeeWeek;
        });
        this.applyFilters();
        if (preservePanel && activeEmployeeId && activeDayIndex >= 0) {
          const employee = planning.employees.find((x) => x.employeeId === activeEmployeeId);
          const day = employee?.days[Math.min(activeDayIndex, employee.days.length - 1)];
          if (employee && day && !this.isUnscheduledPlanningDay(day)) this.forceOpenDay(employee, day);
          else this.forceClosePanel();
        }
      },
      error: (e) => this.snackbar.error(this.error(e, 'No se pudo cargar la semana.')),
    });
  }

  selectUen(value: UenSelection): void {
    this.uenSelection = value;
    this.sucursalesId = typeof value === 'number' ? value : null;
    this.load();
  }

  hasUenSelection(): boolean {
    return this.uenSelection === 'ALL' || typeof this.uenSelection === 'number';
  }

  selectedSucursalesId(): number | null {
    return typeof this.uenSelection === 'number' ? this.uenSelection : null;
  }

  applyFilters(): void {
    const term = this.search.trim().toLowerCase();
    const employees = this.planning?.employees ?? [];
    this.filteredEmployees = employees.filter((employee) => {
      const matchesText = !term || employee.employeeName.toLowerCase().includes(term) || (employee.sucursalName || '').toLowerCase().includes(term);
      if (!matchesText) return false;
      if (this.incidentFilter === 'ALL') return true;
      const detail = this.detailCache[employee.employeeId];
      if (!detail) return true;
      const hasIncidents = detail.days.some((d) => {
        const planningDay = this.planningDayFor(employee.employeeId, d.date);
        if (planningDay && this.isUnscheduledPlanningDay(planningDay)) return false;
        return this.visibleIncidents(d, planningDay).length > 0 || this.isDayInReview(d);
      });
      if (this.incidentFilter === 'WITH_INCIDENTS') return hasIncidents;
      if (this.incidentFilter === 'WITHOUT_INCIDENTS') return !hasIncidents;
      return detail.days.some((d) => d.requiresReview);
    });
  }

  moveWeek(delta: number): void {
    if (this.activeEmployee && this.activePlanningDay && this.isPanelDirty()) {
      this.warnUnsavedChanges();
      return;
    }
    this.applyWeekMove(delta);
  }

  applyWeekMove(delta: number): void {
    const keepPanelOpen = !!this.activeEmployee && !!this.activePlanningDay;
    this.week += delta;
    if (this.week < 1) { this.year -= 1; this.week = 52; }
    if (this.week > 53) { this.year += 1; this.week = 1; }
    this.selectedWeekDate = this.weekStartDate();
    this.load(keepPanelOpen);
  }

  selectWeekDate(value: Date | null): void {
    if (!value) return;
    if (this.activeEmployee && this.activePlanningDay && this.isPanelDirty()) {
      this.warnUnsavedChanges();
      return;
    }
    const selected = startOfDay(value);
    this.year = selected.getFullYear();
    this.week = this.weekNumberFromDate(selected);
    this.selectedWeekDate = selected;
    this.load();
  }

  openDay(employee: AttendancePlanningEmployee, day: AttendancePlanningDay): void {
    if (this.isUnscheduledPlanningDay(day)) return;
    if (!this.canChangePanelSelection(employee, day)) return;
    this.forceOpenDay(employee, day);
  }

  forceOpenDay(employee: AttendancePlanningEmployee, day: AttendancePlanningDay): void {
    if (this.isUnscheduledPlanningDay(day)) return;
    this.activeEmployee = employee;
    this.activePlanningDay = day;
    this.activeEmployeeWeek = this.detailCache[employee.employeeId] ?? null;
    this.activeDetailDay = this.detailDay(employee.employeeId, day.date);
    this.syncPanelEditor();

    if (!this.detailLoaded[employee.employeeId] && this.summary?.attendanceWeekId) {
      this.hr.getAttendanceEmployeeWeek(this.summary.attendanceWeekId, employee.employeeId).subscribe({
        next: (detail) => {
          this.detailCache[employee.employeeId] = detail;
          this.detailLoaded[employee.employeeId] = true;
          this.activeEmployeeWeek = detail;
          this.activeDetailDay = this.detailDay(employee.employeeId, day.date);
          this.syncPanelEditor();
          this.applyFilters();
        },
        error: (e) => this.snackbar.error(this.error(e, 'No se pudo cargar el detalle del día.')),
      });
    }
  }

  canMovePanelDay(delta: number): boolean {
    if (!this.activeEmployee || !this.activePlanningDay) return false;
    const index = this.activeEmployee.days.findIndex((day) => sameDate(day.date, this.activePlanningDay!.date));
    const nextIndex = index + delta;
    const nextDay = this.activeEmployee.days[nextIndex];
    return index >= 0 && nextIndex >= 0 && nextIndex < this.activeEmployee.days.length && !this.isUnscheduledPlanningDay(nextDay);
  }

  movePanelDay(delta: number): void {
    if (!this.activeEmployee || !this.activePlanningDay || !this.canMovePanelDay(delta)) return;
    const index = this.activeEmployee.days.findIndex((day) => sameDate(day.date, this.activePlanningDay!.date));
    const nextDay = this.activeEmployee.days[index + delta];
    if (nextDay) this.openDay(this.activeEmployee, nextDay);
  }

  closePanel(): void {
    if (!this.canClosePanel()) return;
    this.forceClosePanel();
  }

  forceClosePanel(): void {
    this.activeEmployee = null;
    this.activePlanningDay = null;
    this.activeEmployeeWeek = null;
    this.activeDetailDay = null;
  }

  resolveActiveDay(): void {
    if (!this.activeDetailDay || !this.activeEmployee || !this.activePlanningDay) return;
    this.hr.resolveAttendanceDay(this.activeDetailDay.attendanceDayId, { resolutionCode: this.resolutionCode, comments: this.resolutionComments || 'Revision RH' }).subscribe({
      next: () => this.reloadActiveEmployee(),
      error: (e) => this.snackbar.error(this.error(e, 'No se pudo guardar la resolucion.')),
    });
  }

  adjustActiveOvertime(): void {
    if (!this.activeDetailDay) return;
    this.hr.adjustAttendanceOvertime(this.activeDetailDay.attendanceDayId, { overtimeAdjustmentMinutes: Number(this.overtimeAdjustment || 0), comments: this.resolutionComments || 'Ajuste RH' }).subscribe({
      next: () => this.reloadActiveEmployee(),
      error: (e) => this.snackbar.error(this.error(e, 'No se pudo guardar el tiempo extra.')),
    });
  }

  weeklyOvertime(employeeId: number): { calculated: number; adjustment: number; authorized: number; comments: string } {
    const days = this.detailCache[employeeId]?.days ?? [];
    return days.reduce((total, day) => {
      total.calculated += Number(day.calculatedOvertimeMinutes || 0);
      total.adjustment += Number(day.overtimeAdjustmentMinutes || 0);
      total.authorized += Number(day.authorizedOvertimeMinutes || 0);
      if (!total.comments && day.overtimeAdjustmentMinutes && day.rhComments) total.comments = day.rhComments;
      return total;
    }, { calculated: 0, adjustment: 0, authorized: 0, comments: '' });
  }

  isWeeklyOvertimeBlocked(employee: AttendancePlanningEmployee): boolean {
    const workDays = employee.days.filter((day) => day.dayType === 'WORK');
    return workDays.length > 0 && workDays.every((day) => this.isUnscheduledPlanningDay(day));
  }

  weeklyOvertimeAdjustmentHours(employeeId: number): number {
    const draft = this.weeklyOvertimeAdjustmentDrafts[employeeId];
    const minutes = draft ?? this.weeklyOvertime(employeeId).authorized;
    return Math.round((minutes / 60) * 100) / 100;
  }

  setWeeklyOvertimeAdjustment(employeeId: number, value: string | number): void {
    const hours = Number(value || 0);
    this.weeklyOvertimeAdjustmentDrafts[employeeId] = Math.round(hours * 60);
  }

  weeklyOvertimeComment(employeeId: number): string {
    return this.weeklyOvertimeCommentDrafts[employeeId] ?? this.weeklyOvertime(employeeId).comments;
  }

  setWeeklyOvertimeComment(employeeId: number, value: string): void {
    this.weeklyOvertimeCommentDrafts[employeeId] = value;
  }

  weeklyOvertimeAuthorizedPreview(employeeId: number): number {
    const overtime = this.weeklyOvertime(employeeId);
    const authorized = this.weeklyOvertimeAdjustmentDrafts[employeeId] ?? overtime.authorized;
    return Math.max(0, authorized);
  }

  isWeeklyOvertimeLocked(employeeId: number): boolean {
    if (this.editingWeeklyOvertime[employeeId]) return false;
    const overtime = this.weeklyOvertime(employeeId);
    return !!this.lockedWeeklyOvertime[employeeId]
      || Number(overtime.adjustment || 0) !== 0
      || !!(overtime.comments || '').trim();
  }

  editWeeklyOvertime(employeeId: number): void {
    this.editingWeeklyOvertime[employeeId] = true;
  }

  saveWeeklyOvertime(employeeId: number): void {
    if (!this.summary?.attendanceWeekId || this.savingWeeklyOvertime[employeeId]) return;
    const employee = this.planning?.employees.find((item) => item.employeeId === employeeId);
    if (employee && this.isWeeklyOvertimeBlocked(employee)) {
      this.snackbar.warning('Asigna un horario antes de autorizar tiempo extra.');
      return;
    }
    const detail = this.detailCache[employeeId];
    if (!detail || !detail.days.length) {
      this.savingWeeklyOvertime[employeeId] = true;
      this.hr.getAttendanceEmployeeWeek(this.summary.attendanceWeekId, employeeId).subscribe({
        next: (loaded) => {
          this.detailCache[employeeId] = loaded;
          this.detailLoaded[employeeId] = true;
          this.persistWeeklyOvertime(employeeId, loaded);
        },
        error: (e) => {
          this.savingWeeklyOvertime[employeeId] = false;
          this.snackbar.error(this.error(e, 'No se pudo cargar el detalle para tiempo extra.'));
        },
      });
      return;
    }

    this.persistWeeklyOvertime(employeeId, detail);
  }

  persistWeeklyOvertime(employeeId: number, detail: AttendanceEmployeeWeek): void {
    const target = this.weeklyOvertimeTargetDay(detail);
    if (!target) {
      this.snackbar.warning('No hay un día válido para guardar el tiempo extra semanal.');
      this.savingWeeklyOvertime[employeeId] = false;
      return;
    }

    const desiredWeeklyAuthorized = this.weeklyOvertimeAdjustmentDrafts[employeeId] ?? this.weeklyOvertime(employeeId).authorized;
    const desiredWeeklyAdjustment = desiredWeeklyAuthorized - this.weeklyOvertime(employeeId).calculated;
    const otherAdjustments = detail.days
      .filter((day) => day.attendanceDayId !== target.attendanceDayId)
      .reduce((sum, day) => sum + Number(day.overtimeAdjustmentMinutes || 0), 0);
    const targetAdjustment = desiredWeeklyAdjustment - otherAdjustments;
    const comments = (this.weeklyOvertimeComment(employeeId) || '').trim() || 'Ajuste semanal de hora extra';

    this.savingWeeklyOvertime[employeeId] = true;
    this.hr.adjustAttendanceOvertime(target.attendanceDayId, {
      overtimeAdjustmentMinutes: targetAdjustment,
      authorizedOvertimeMinutes: desiredWeeklyAuthorized,
      comments,
    }).subscribe({
      next: () => this.refreshEmployeeWeekAfterWeeklyOvertime(employeeId),
      error: (e) => {
        this.savingWeeklyOvertime[employeeId] = false;
        this.snackbar.error(this.error(e, 'No se pudo guardar el tiempo extra semanal.'));
      },
    });
  }

  weeklyOvertimeTargetDay(detail: AttendanceEmployeeWeek): AttendanceEmployeeDay | null {
    return [...detail.days].reverse().find((day) => Number(day.calculatedOvertimeMinutes || 0) > 0)
      ?? [...detail.days].reverse().find((day) => Number(day.authorizedOvertimeMinutes || 0) > 0 || Number(day.overtimeAdjustmentMinutes || 0) !== 0)
      ?? [...detail.days].reverse().find((day) => !!day.attendanceDayId)
      ?? null;
  }

  refreshEmployeeWeekAfterWeeklyOvertime(employeeId: number): void {
    if (!this.summary?.attendanceWeekId) {
      this.savingWeeklyOvertime[employeeId] = false;
      return;
    }

    this.hr.getAttendanceEmployeeWeek(this.summary.attendanceWeekId, employeeId).subscribe({
      next: (detail) => {
        this.detailCache[employeeId] = detail;
        this.detailLoaded[employeeId] = true;
        const overtime = this.weeklyOvertime(employeeId);
        this.weeklyOvertimeAdjustmentDrafts[employeeId] = overtime.authorized;
        this.weeklyOvertimeCommentDrafts[employeeId] = overtime.comments;
        this.lockedWeeklyOvertime[employeeId] = true;
        this.editingWeeklyOvertime[employeeId] = false;
        if (this.activeEmployee?.employeeId === employeeId) {
          const activeDate = this.activePlanningDay?.date;
          this.activeEmployeeWeek = detail;
          this.activeDetailDay = activeDate ? this.detailDay(employeeId, activeDate) : null;
          this.syncPanelEditor();
        }
        this.savingWeeklyOvertime[employeeId] = false;
        this.applyFilters();
        this.snackbar.success('Tiempo extra semanal guardado.');
      },
      error: (e) => {
        this.savingWeeklyOvertime[employeeId] = false;
        this.snackbar.error(this.error(e, 'Se guardó, pero no se pudo refrescar el detalle.'));
      },
    });
  }

  savePanelChanges(): void {
    if (!this.activeDetailDay) return;
    if (this.isActiveDayBlocked()) {
      this.snackbar.warning('Asigna un horario antes de validar este día.');
      return;
    }
    this.resolveActiveDay();
    this.adjustActiveOvertime();
  }

  reloadActiveEmployee(): void {
    if (!this.summary?.attendanceWeekId || !this.activeEmployee || !this.activePlanningDay) return;
    const employee = this.activeEmployee;
    const date = this.activePlanningDay.date;
    this.hr.getAttendanceEmployeeWeek(this.summary.attendanceWeekId, employee.employeeId).subscribe((detail) => {
      this.detailCache[employee.employeeId] = detail;
      this.detailLoaded[employee.employeeId] = true;
      this.activeEmployeeWeek = detail;
      this.activeDetailDay = this.detailDay(employee.employeeId, date);
      this.syncPanelEditor();
      this.applyFilters();
    });
  }

  detailDay(employeeId: number, date: string): AttendanceEmployeeDay | null {
    return this.detailCache[employeeId]?.days.find((x) => sameDate(x.date, date)) ?? null;
  }

  hasCellWarning(employeeId: number, date: string): boolean {
    const planningDay = this.planningDayFor(employeeId, date);
    if (planningDay && this.isUnscheduledPlanningDay(planningDay)) return false;
    const detail = this.detailDay(employeeId, date);
    if (!detail) return false;
    if (this.isDayResolved(detail)) return false;
    const incidents = this.visibleIncidents(detail, planningDay);
    const actionableIncidents = incidents.filter((x) => x !== 'SIN_REGISTROS');
    return this.isDayInReview(detail) || incidents.length > 0 || actionableIncidents.length > 0;
  }

  hasAbsenceIncident(employeeId: number, date: string): boolean {
    const planningDay = this.planningDayFor(employeeId, date);
    if (planningDay && this.isUnscheduledPlanningDay(planningDay)) return false;
    const detail = this.detailDay(employeeId, date);
    if (!detail || this.isDayResolved(detail)) return false;
    return this.visibleIncidents(detail, planningDay).includes('SIN_REGISTROS');
  }

  isActiveCell(employeeId: number, date: string): boolean {
    return this.activeEmployee?.employeeId === employeeId && !!this.activePlanningDay && sameDate(this.activePlanningDay.date, date);
  }

  isCellResolved(employeeId: number, date: string): boolean {
    return this.isDayResolved(this.detailDay(employeeId, date));
  }

  isDayResolved(day: AttendanceEmployeeDay | null | undefined): boolean {
    return !!day?.rhResolutionCode && !this.isDayInReview(day);
  }

  visibleActiveIncidents(): string[] {
    if (this.isActiveDayBlocked()) return [];
    return this.visibleIncidents(this.activeDetailDay, this.activePlanningDay);
  }

  visibleIncidents(day: AttendanceEmployeeDay | null | undefined, planningDay?: AttendancePlanningDay | null): string[] {
    let incidents = [...(day?.incidents || [])];
    if (!this.hasBreakExcess(day, planningDay)) {
      incidents = incidents.filter((code) => code !== 'RETARDO_BREAK');
    }
    if (this.hasBreakExcess(day, planningDay) && !incidents.includes('RETARDO_BREAK')) {
      incidents.push('RETARDO_BREAK');
    }

    if (!this.hasCompleteBreak(day)) return incidents;
    return incidents.filter((code) => code !== 'BREAK_SEQUENCE_INCONSISTENT');
  }

  isActiveDayInReview(): boolean {
    return this.isDayInReview(this.activeDetailDay);
  }

  isActiveDayResolved(): boolean {
    return this.isDayResolved(this.activeDetailDay);
  }

  isDayInReview(day: AttendanceEmployeeDay | null | undefined): boolean {
    if (!day?.requiresReview) return false;
    if (this.hasCompleteBreak(day) && day.incidents.length > 0 && this.visibleIncidents(day).length === 0) return false;
    return true;
  }

  hasCompleteBreak(day: AttendanceEmployeeDay | null | undefined): boolean {
    return this.breakMarks(day?.biometricMarks || []).length >= 2;
  }

  effectiveBreakMinutes(day: AttendanceEmployeeDay | null | undefined): number {
    const marks = this.breakMarks(day?.biometricMarks || []);
    if (marks.length >= 2) {
      const first = new Date(marks[0].timestamp).getTime();
      const last = new Date(marks[marks.length - 1].timestamp).getTime();
      return Math.max(0, Math.round((last - first) / 60000));
    }

    return day?.breakUsedMinutes || 0;
  }

  hasBreakExcess(day: AttendanceEmployeeDay | null | undefined, planningDay?: AttendancePlanningDay | null): boolean {
    if (!day) return false;
    const used = this.effectiveBreakMinutes(day);
    const allowed = this.allowedBreakMinutes(day, planningDay);
    return allowed > 0 && used > allowed;
  }

  allowedBreakMinutes(day: AttendanceEmployeeDay | null | undefined, planningDay?: AttendancePlanningDay | null): number {
    const detailAllowed = Number(day?.plannedBreakMinutes || 0);
    if (detailAllowed > 0) return detailAllowed;
    if (planningDay) return Number(planningDay.breakMinutes || 0);
    if (day && this.activeDetailDay === day) return Number(this.activePlanningDay?.breakMinutes || 0);
    return 0;
  }

  isUnscheduledPlanningDay(day: AttendancePlanningDay | null | undefined): boolean {
    if (!day || day.dayType !== 'WORK') return false;
    return !day.startTime && !day.endTime && !day.workScheduleId;
  }

  isActiveDayBlocked(): boolean {
    return this.isUnscheduledPlanningDay(this.activePlanningDay);
  }

  planningDayFor(employeeId: number, date: string): AttendancePlanningDay | null {
    const employee = this.planning?.employees.find((item) => item.employeeId === employeeId);
    return employee?.days.find((day) => sameDate(day.date, date)) ?? null;
  }

  isPanelDirty(): boolean {
    if (this.isActiveDayBlocked()) return false;
    return this.resolutionCode !== this.originalResolutionCode
      || this.resolutionComments !== this.originalResolutionComments
      || Number(this.overtimeAdjustment || 0) !== Number(this.originalOvertimeAdjustment || 0);
  }

  canChangePanelSelection(nextEmployee: AttendancePlanningEmployee, nextDay: AttendancePlanningDay): boolean {
    if (!this.activeEmployee || !this.activePlanningDay) return true;
    if (nextEmployee.employeeId === this.activeEmployee.employeeId && sameDate(this.activePlanningDay.date, nextDay.date)) return true;
    if (!this.isPanelDirty()) return true;
    this.warnUnsavedChanges();
    return false;
  }

  canClosePanel(): boolean {
    if (!this.activeEmployee || !this.activePlanningDay || !this.isPanelDirty()) return true;
    this.warnUnsavedChanges();
    return false;
  }

  warnUnsavedChanges(): void {
    this.snackbar.warning('Guarda o cancela los cambios antes de cambiar de día.');
  }

  syncPanelEditor(): void {
    this.resolutionCode = this.activeDetailDay?.rhResolutionCode || 'SIN_PENALIZACION';
    this.resolutionComments = this.activeDetailDay?.rhComments || '';
    this.overtimeAdjustment = this.activeDetailDay?.overtimeAdjustmentMinutes || 0;
    this.originalResolutionCode = this.resolutionCode;
    this.originalResolutionComments = this.resolutionComments;
    this.originalOvertimeAdjustment = this.overtimeAdjustment;
  }

  cellPrimary(employeeId: number, day: AttendancePlanningDay): string {
    if (this.isUnscheduledPlanningDay(day)) return 'SIN HORARIO';
    const detail = this.detailDay(employeeId, day.date);
    if (!detail) {
      if (day.dayType === 'REST') return 'DESCANSO';
      if (day.dayType === 'VACATION') return 'VACACIONES';
      return 'SIN REGISTROS';
    }
    if (this.isDayResolved(detail) && (hasRealDate(detail.firstPunchAt) || hasRealDate(detail.lastPunchAt))) return `${time(detail.firstPunchAt)} - ${time(detail.lastPunchAt)}`;
    const incidents = this.visibleIncidents(detail, day);
    if (incidents.length > 1) return `${incidents.length} INCIDENCIAS`;
    if (incidents.length === 1) {
      if (day.dayType === 'REST') return 'DESCANSO';
      if (day.dayType === 'VACATION') return 'VACACIONES';
      return this.formatCellIncident(incidents[0]).toUpperCase();
    }
    if (this.isDayInReview(detail)) return 'REQUIERE REVISIÓN';
    if (hasRealDate(detail.firstPunchAt) || hasRealDate(detail.lastPunchAt)) return `${time(detail.firstPunchAt)} - ${time(detail.lastPunchAt)}`;
    if (day.dayType === 'REST') return 'D';
    if (day.dayType === 'VACATION') return 'V';
    return 'SIN REGISTROS';
  }

  formatCellIncident(value: string): string {
    const labels: Record<string, string> = {
      SIN_REGISTROS: 'Falta',
      REGISTRO_INCOMPLETO: 'Reg. incompleto',
      RETARDO_ENTRADA: 'Retardo entrada',
      RETARDO_BREAK: 'Exceso break',
      DESCANSO_LABORADO: 'Descanso laborado',
      MARCACION_DURANTE_VACACIONES: 'Marc. vacaciones',
      BREAK_SEQUENCE_INCONSISTENT: 'Break inc.',
      DATOS_INCOMPLETOS: 'Datos inc.',
    };
    return labels[value] ?? this.formatIncident(value);
  }

  cellSecondary(employeeId: number, day: AttendancePlanningDay): string {
    if (this.isUnscheduledPlanningDay(day)) return 'Asignar horario';
    const detail = this.detailDay(employeeId, day.date);
    if (!detail) {
      if (day.dayType === 'REST') return 'Descanso';
      if (day.dayType === 'VACATION') return 'Vacaciones';
      return 'Falta';
    }
    const incidents = this.visibleIncidents(detail, day);
    if (this.isDayResolved(detail)) {
      if (incidents.length > 1) return `${incidents.length} incidencias · Revisado`;
      if (incidents.length === 1) return `${this.formatIncident(incidents[0])} · Revisado`;
      return 'Revisado';
    }
    if (incidents.length === 1 && (day.dayType === 'REST' || day.dayType === 'VACATION')) return this.formatIncident(incidents[0]);
    if (incidents.length === 1 && incidents[0] === 'SIN_REGISTROS') return 'Falta';
    if (incidents.length > 1) return `${incidents.length} incidencias`;
    if (incidents.length === 1) return this.formatIncident(incidents[0]);
    if (this.isDayInReview(detail)) return 'Revisar';
    if (day.dayType === 'REST') return detail.punchCount ? 'Descanso laborado' : 'Descanso';
    if (day.dayType === 'VACATION') return 'Vacaciones';
    return 'OK';
  }

  mainDayStatus(): string {
    if (this.isActiveDayBlocked()) return 'SIN HORARIO';
    if (!this.activeDetailDay) return this.labelDay(this.activePlanningDay?.dayType || 'WORK');
    if (this.isActiveDayResolved()) return 'REVISADO';
    const incidents = this.visibleActiveIncidents();
    if (incidents.length > 1) return `${incidents.length} INCIDENCIAS`;
    if (incidents.length === 1) return this.formatIncident(incidents[0]).toUpperCase();
    if (this.isActiveDayInReview()) return 'REQUIERE REVISIÓN';
    if (!this.activeDetailDay.punchCount && this.activePlanningDay?.dayType === 'WORK') return 'SIN REGISTROS';
    return 'OK';
  }

  markTimeline(): { time: string; label: string; isBreak: boolean }[] {
    const realMarks = this.activeDetailDay?.biometricMarks || [];
    if (realMarks.length) {
      const breakMarks = this.breakMarks(realMarks);
      const firstBreakId = breakMarks[0]?.biometricPunchId;
      const lastBreakId = breakMarks.at(-1)?.biometricPunchId;

      return realMarks.map((mark) => ({
        time: mark.time || time(mark.timestamp),
        label: this.formatMarkType(mark, firstBreakId, lastBreakId),
        isBreak: this.isBreakMark(mark) || mark.biometricPunchId === firstBreakId || mark.biometricPunchId === lastBreakId,
      }));
    }

    const fallback: { time: string; label: string; isBreak: boolean }[] = [];
    if (hasRealDate(this.activeDetailDay?.firstPunchAt)) fallback.push({ time: time(this.activeDetailDay?.firstPunchAt), label: 'Entrada', isBreak: false });
    const lastPunchAt = this.activeDetailDay?.lastPunchAt;
    if (hasRealDate(lastPunchAt) && lastPunchAt !== this.activeDetailDay?.firstPunchAt) fallback.push({ time: time(lastPunchAt), label: 'Salida', isBreak: false });
    return fallback;
  }

  breakSummary(): { start: string; end: string; duration: string } | null {
    if (!this.activeDetailDay) return null;

    const marks = [...(this.activeDetailDay?.biometricMarks || [])]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const breakMarks = this.breakMarks(marks);
    const start = breakMarks[0];
    if (!start) {
      return {
        start: '--',
        end: '--',
        duration: '--',
      };
    }

    const end = breakMarks.at(-1);
    if (start.biometricPunchId === end?.biometricPunchId) {
      return {
        start: start.time || time(start.timestamp),
        end: '--',
        duration: '--',
      };
    }

    if (!end) {
      return {
        start: start.time || time(start.timestamp),
        end: '--',
        duration: '--',
      };
    }

    const minutes = Math.max(0, Math.round((new Date(end.timestamp).getTime() - new Date(start.timestamp).getTime()) / 60000));
    return {
      start: start.time || time(start.timestamp),
      end: end.time || time(end.timestamp),
      duration: `${minutes} min`,
    };
  }

  breakMarks(marks: AttendanceBiometricMark[]): AttendanceBiometricMark[] {
    const explicitBreakMarks = marks
      .filter((mark) => this.isBreakMark(mark))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return explicitBreakMarks.length ? explicitBreakMarks : this.inferredBreakMarks(marks);
  }

  inferredBreakMarks(marks: AttendanceBiometricMark[]): AttendanceBiometricMark[] {
    const workMarks = [...marks]
      .filter((mark) => this.normalizedWorkMarkType(mark) === 'ENTRADA' || this.normalizedWorkMarkType(mark) === 'SALIDA')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (workMarks.length !== 4) return [];
    if (this.normalizedWorkMarkType(workMarks[0]) !== 'ENTRADA') return [];
    if (this.normalizedWorkMarkType(workMarks[3]) !== 'SALIDA') return [];
    if (new Date(workMarks[2].timestamp).getTime() <= new Date(workMarks[1].timestamp).getTime()) return [];

    return [workMarks[1], workMarks[2]];
  }

  normalizedWorkMarkType(mark: AttendanceBiometricMark): 'ENTRADA' | 'SALIDA' | '' {
    const value = (mark.normalizedRecordType || mark.rawRecordType || '').toUpperCase();
    if (value === 'ENTRADA' || value === '0') return 'ENTRADA';
    if (value === 'SALIDA' || value === '1') return 'SALIDA';
    return '';
  }

  isBreakMark(mark: AttendanceBiometricMark): boolean {
    const value = (mark.normalizedRecordType || mark.rawRecordType || '').toUpperCase();
    return value === 'INICIO BREAK' || value === 'FIN BREAK' || value === '2' || value === '3';
  }

  formatMarkType(mark: AttendanceBiometricMark, firstBreakId?: number, lastBreakId?: number): string {
    if (this.isBreakMark(mark) || mark.biometricPunchId === firstBreakId || mark.biometricPunchId === lastBreakId) {
      if (mark.biometricPunchId === firstBreakId) return 'Inicio break';
      if (mark.biometricPunchId === lastBreakId) return 'Fin break';
      return 'Marca break';
    }

    const value = mark.normalizedRecordType || mark.rawRecordType || '';
    const labels: Record<string, string> = {
      ENTRADA: 'Entrada',
      SALIDA: 'Salida',
      '0': 'Entrada',
      '1': 'Salida',
    };

    return labels[value.toUpperCase()] || 'Registro';
  }

  authorize(): void { if (this.summary?.attendanceWeekId) this.hr.authorizeAttendanceWeek(this.summary.attendanceWeekId).subscribe(() => this.load()); }
  export(): void {
    if (this.screenBusy) return;
    this.lockScreen('Preparando descarga de incidencias...');
    this.hr.exportAttendanceWeek({ year: this.year, week: this.week, sucursalesId: this.selectedSucursalesId() }).pipe(finalize(() => this.unlockScreen())).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `incidencias-editable-${this.year}-S${this.week}.xlsx`; a.click(); URL.revokeObjectURL(url);
      },
      error: (e) => this.snackbar.error(this.error(e, 'No se pudo descargar el reporte editable.')),
    });
  }
  importReviewedReport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.screenBusy) return;

    this.importingReviewedReport = true;
    this.lockScreen('Subiendo y aplicando reporte revisado...');
    this.hr.importReviewedAttendanceWeek(file, true).pipe(finalize(() => {
      this.importingReviewedReport = false;
      this.unlockScreen();
    })).subscribe({
      next: (result) => {
        if (result.errorRows > 0) {
          this.snackbar.error(`No se aplicó el reporte: ${result.errorRows} errores.`);
          return;
        }

        this.snackbar.success(`Reporte aplicado: ${result.appliedRows} filas actualizadas, ${result.unchangedRows} sin cambios.`);
        this.load(true);
      },
      error: (e) => this.snackbar.error(this.error(e, 'No se pudo importar el reporte revisado.')),
    });
  }
  lockScreen(message: string): void {
    this.screenBusyMessage = message;
    this.screenBusy = true;
  }
  unlockScreen(): void {
    this.screenBusy = false;
    this.screenBusyMessage = '';
  }
  labelDay(type: string): string { return type === 'REST' ? 'DESCANSO' : type === 'VACATION' ? 'VACACIONES' : 'TRABAJO'; }
  formatIncident(value: string): string {
    const labels: Record<string, string> = {
      SIN_REGISTROS: 'Sin registros',
      REGISTRO_INCOMPLETO: 'Registro incompleto',
      RETARDO_ENTRADA: 'Retardo entrada',
      RETARDO_BREAK: 'Exceso de break',
      DESCANSO_LABORADO: 'Descanso laborado',
      MARCACION_DURANTE_VACACIONES: 'Marcación durante vacaciones',
      BREAK_SEQUENCE_INCONSISTENT: 'Break inc.',
      DATOS_INCOMPLETOS: 'Datos incompletos',
      SIN_PENALIZACION: 'Sin penalización',
      RETARDO_JUSTIFICADO: 'Retardo justificado',
      FALTA_JUSTIFICADA: 'Falta justificada',
      FALTA_INJUSTIFICADA: 'Falta injustificada',
      FALTA_CON_GOCE_DE_SUELDO: 'Falta con goce de sueldo',
      INCAPACIDAD_GENERAL: 'Incapacidad general',
      INCAPACIDAD_RT: 'Incapacidad RT',
      VACACIONES: 'Vacaciones',
      HRS_EXT_EN_DESCANSO: 'Hrs ext en descanso',
      FESTIVO_LABORADO: 'Festivo laborado',
      PAGAR_DIA_REGULAR: 'Pagar día regular',
    };
    return labels[value] ?? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (x) => x.toUpperCase());
  }
  formatMinutes(value: number): string { const h = Math.floor(Math.abs(value) / 60); const m = Math.abs(value) % 60; return `${value < 0 ? '-' : ''}${h}:${String(m).padStart(2, '0')}`; }
  formatHoursDot(value: number): string { const h = Math.floor(Math.abs(value) / 60); const m = Math.abs(value) % 60; return `${value < 0 ? '-' : ''}${h}.${String(m).padStart(2, '0')}`; }
  formatOvertimeLabel(value: number): string {
    const sign = value < 0 ? '-' : '';
    const minutes = Math.abs(value);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (!h) return `${sign}${m} min`;
    if (!m) return `${sign}${h} h`;
    return `${sign}${h} h ${m} min`;
  }
  initials(value: string): string {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  displayTime(value?: string | null): string { return time(value); }
  formatLongDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  trackEmployee(_: number, item: AttendancePlanningEmployee): number { return item.employeeId; }
  trackPlanningDay(_: number, item: AttendancePlanningDay): string { return item.date; }
  trackDayName(_: number, item: string): string { return item; }
  currentWeek(): number { return this.weekNumberFromDate(new Date()); }
  weekStartDate(): Date {
    const yearStart = new Date(this.year, 0, 1);
    const firstSunday = new Date(yearStart);
    firstSunday.setDate(yearStart.getDate() - yearStart.getDay());
    const start = new Date(firstSunday);
    start.setDate(firstSunday.getDate() + (Math.min(53, Math.max(1, Number(this.week) || 1)) - 1) * 7);
    return startOfDay(start);
  }
  weekEndDate(): Date {
    const end = this.weekStartDate();
    end.setDate(end.getDate() + 6);
    return end;
  }
  weekNumberFromDate(value: Date): number {
    const date = startOfDay(value);
    const yearStart = new Date(date.getFullYear(), 0, 1);
    return Math.max(1, Math.ceil(((+date - +yearStart) / 86400000 + yearStart.getDay() + 1) / 7));
  }
  error(error: any, fallback: string): string { return error?.error?.message || error?.error || fallback; }
}

function sameDate(left: string, right: string): boolean {
  return left.slice(0, 10) === right.slice(0, 10);
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
}

function time(value?: string | null): string {
  return hasRealDate(value) ? new Date(value as string).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--';
}

function hasRealDate(value?: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getFullYear() > 1900;
}

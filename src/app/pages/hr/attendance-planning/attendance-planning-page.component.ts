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
import { finalize, forkJoin } from 'rxjs';

import { AttendancePlanningDay, AttendancePlanningEmployee, AttendancePlanningWeek, HrCatalogs, WorkSchedule } from '../../../core/models/hr.models';
import { HrService } from '../../../core/service/hr.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  selector: 'app-attendance-planning-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule, MatNativeDateModule, MatSelectModule],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-MX' }],
  template: `
    <section class="planning-page">
      <header class="page-head">
        <div>
          <span class="eyebrow">RECURSOS HUMANOS</span>
          <h1>Planeación semanal</h1>
          <p>Agenda semanal para descansos, vacaciones y horarios de RH.</p>
        </div>
        <div class="week-picker-shell" *ngIf="weekData">
          <button class="week-range" type="button" (click)="weekRangePicker.open()" aria-label="Seleccionar semana por fecha">
            <strong>Semana {{ weekData.week }}</strong>
            <span>{{ weekData.weekStart | date:'dd MMM' }} - {{ weekData.weekEnd | date:'dd MMM y' }}</span>
            <mat-icon>calendar_month</mat-icon>
          </button>
          <mat-form-field class="week-picker-proxy" appearance="outline">
            <input matInput [matDatepicker]="weekRangePicker" [(ngModel)]="selectedWeekDate" (dateChange)="selectWeekDate($event.value)">
            <mat-datepicker #weekRangePicker></mat-datepicker>
          </mat-form-field>
        </div>
      </header>

      <mat-card class="planner-toolbar">
        <div class="toolbar-filters">
          <div class="week-nav">
            <button mat-icon-button type="button" (click)="moveWeek(-1)" aria-label="Semana anterior">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <mat-form-field appearance="outline" class="week-field">
              <mat-label>Semana</mat-label>
              <input matInput type="number" min="1" max="53" [(ngModel)]="week" (keyup.enter)="load()" (change)="load()">
            </mat-form-field>
            <button mat-icon-button type="button" (click)="moveWeek(1)" aria-label="Semana siguiente">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>

          <mat-form-field appearance="outline" class="year-field">
            <mat-label>Año</mat-label>
            <input matInput type="number" [(ngModel)]="year" (keyup.enter)="load()">
          </mat-form-field>

          <mat-form-field appearance="outline" class="uen-field">
            <mat-label>UEN</mat-label>
            <mat-select [(ngModel)]="sucursalesId" (selectionChange)="load()">
              <mat-option [value]="null">Todas</mat-option>
              <mat-option *ngFor="let s of catalogs?.sucursales" [value]="s.id">{{ s.description }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Buscar empleado</mat-label>
            <input matInput [(ngModel)]="search" (ngModelChange)="applyFilters()">
          </mat-form-field>
        </div>

        <div class="toolbar-actions">
          <div class="flow-actions">
          <button mat-stroked-button type="button" class="primary-flow-action" (click)="generate()">
            <mat-icon>calendar_add_on</mat-icon>
            Generar
          </button>
          <button mat-stroked-button type="button" class="primary-flow-action" (click)="copyPrevious()">
            <mat-icon>content_copy</mat-icon>
            Copiar anterior
          </button>
          </div>

          <div class="toolbar-tools">
            <span>Acciones</span>
            <button mat-flat-button type="button" class="vacation-action" (click)="openVacationPanel()">
              <mat-icon>beach_access</mat-icon>
              Vacaciones
            </button>
            <button mat-stroked-button type="button" class="schedule-action" (click)="openSchedulesPanel()">
              <mat-icon>schedule</mat-icon>
              Horarios
            </button>
          </div>
        </div>
      </mat-card>

      <div class="schedule-strip" *ngIf="showSchedules && weekData?.workSchedules?.length">
        <span *ngFor="let schedule of weekData?.workSchedules">
          <b>{{ schedule.name }}</b>
          {{ shortTime(schedule.startTime) }}-{{ shortTime(schedule.endTime) }} · {{ schedule.breakMinutes }} min
        </span>
      </div>

      <div class="bulk-bar" *ngIf="selected.size > 0">
        <div class="bulk-count">
          <mat-icon>groups</mat-icon>
          <strong>{{ selected.size }} empleado{{ selected.size === 1 ? '' : 's' }} seleccionado{{ selected.size === 1 ? '' : 's' }}</strong>
        </div>
        <div class="bulk-controls">
          <mat-form-field appearance="outline">
            <mat-label>Asignar descanso</mat-label>
            <mat-select [(ngModel)]="bulkRestDay">
              <mat-option [value]="null">Sin cambio</mat-option>
              <mat-option *ngFor="let d of dayLabels; let i = index" [value]="i">{{ d }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Asignar horario</mat-label>
            <mat-select [(ngModel)]="bulkScheduleId">
              <mat-option [value]="null">Sin cambio</mat-option>
              <mat-option *ngFor="let s of weekData?.workSchedules" [value]="s.id">{{ s.name }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="bulk-actions">
          <button mat-flat-button color="primary" type="button" (click)="applyBulk()">Aplicar</button>
          <button mat-stroked-button type="button" (click)="clearSelection()">Cancelar selección</button>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <mat-icon>hourglass_top</mat-icon>
        Cargando planeación...
      </div>

      <mat-card class="empty-card" *ngIf="weekData && !loading && filteredEmployees.length === 0">
        <mat-icon>event_busy</mat-icon>
        <strong>No hay empleados para mostrar</strong>
        <span>Ajusta la UEN o la búsqueda.</span>
      </mat-card>

      <div class="planning-split" [class.panel-open]="editingEmployee && editingDay" *ngIf="weekData && !loading && filteredEmployees.length > 0">
      <mat-card class="matrix-card">
        <div class="matrix-scroll">
          <div class="matrix-grid">
            <div class="cell header employee-col">
              <span>Empleado</span>
            </div>
            <div class="cell header day-head" *ngFor="let d of weekDays">
              <strong>{{ d.label }}</strong>
              <span>{{ d.dayNumber }}</span>
            </div>
            <div class="cell header base-col">
              <span>Horario base</span>
            </div>

            <ng-container *ngFor="let row of filteredEmployees">
              <div class="cell employee-col employee-cell">
                <input type="checkbox" [checked]="selected.has(row.employeeId)" (change)="toggleSelected(row.employeeId)">
                <div>
                  <strong>{{ row.employeeName }}</strong>
                  <span>{{ row.sucursalName || 'Sin UEN' }} · {{ scheduleName(row.weeklyWorkScheduleId || row.defaultWorkScheduleId) }}</span>
                </div>
              </div>

              <button
                type="button"
                class="cell day-cell"
                *ngFor="let day of row.days"
                [class.rest]="day.dayType === 'REST'"
                [class.vacation]="day.dayType === 'VACATION'"
                [class.special]="isSpecial(row, day)"
                [class.active]="isEditingCell(row.employeeId, day.date)"
                (click)="openDayEditor(row, day)"
              >
                <strong>{{ dayTitle(row, day) }}</strong>
                <span>{{ daySubtitle(row, day) }}</span>
              </button>

              <div class="cell base-col base-cell">
                <strong>{{ scheduleName(row.weeklyWorkScheduleId || row.defaultWorkScheduleId) }}</strong>
                <span>{{ baseScheduleRange(row) }}</span>
              </div>
            </ng-container>
          </div>
        </div>
      </mat-card>

      <aside class="side-panel" *ngIf="editingEmployee && editingDay">
        <div class="panel-head">
          <div>
            <span>{{ formatLongDate(editingDay.date) }}</span>
            <h2>{{ editingEmployee.employeeName }}</h2>
            <p>{{ editingEmployee.sucursalName || 'Sin UEN' }}</p>
          </div>
          <button mat-icon-button type="button" (click)="closeDayEditor()"><mat-icon>close</mat-icon></button>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Estado</mat-label>
          <mat-select [(ngModel)]="editDayType">
            <mat-option value="WORK">Trabajo</mat-option>
            <mat-option value="REST">Descanso</mat-option>
            <mat-option value="VACATION">Vacaciones</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" *ngIf="editDayType === 'WORK'">
          <mat-label>Horario preestablecido</mat-label>
          <mat-select [(ngModel)]="editScheduleId">
            <mat-option [value]="null">Sin horario</mat-option>
            <mat-option *ngFor="let s of weekData?.workSchedules" [value]="s.id">{{ s.name }} · {{ shortTime(s.startTime) }}-{{ shortTime(s.endTime) }}</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="panel-times" *ngIf="editDayType === 'WORK'">
          <div><span>Entrada</span><strong>{{ editorSchedule()?.startTime || '--' }}</strong></div>
          <div><span>Salida</span><strong>{{ editorSchedule()?.endTime || '--' }}</strong></div>
          <div><span>Break</span><strong>{{ editorSchedule()?.breakMinutes || 0 }} min</strong></div>
        </div>

        <div class="panel-actions">
          <button mat-stroked-button type="button" (click)="restoreDefaultSchedule()">Restaurar habitual</button>
          <button mat-flat-button color="primary" type="button" (click)="saveDayEditor()">Guardar</button>
        </div>
      </aside>
      </div>

      <aside class="side-panel vacation-panel" *ngIf="vacationOpen">
        <div class="panel-head">
          <div>
            <span>Rango de vacaciones</span>
            <h2>Registrar vacaciones</h2>
            <p>Aplica el rango a uno o varios empleados seleccionados.</p>
          </div>
          <button mat-icon-button type="button" (click)="vacationOpen = false"><mat-icon>close</mat-icon></button>
        </div>

        <div class="vacation-summary">
          <div>
            <span>Empleados seleccionados</span>
            <strong>{{ vacationEmployeeIds.length }}</strong>
          </div>
          <div>
            <span>Días del rango</span>
            <strong>{{ vacationRangeDays }}</strong>
          </div>
        </div>

        <div class="vacation-picker">
          <mat-form-field appearance="outline">
            <mat-label>Buscar empleado</mat-label>
            <input matInput [(ngModel)]="vacationEmployeeSearch" placeholder="Nombre del empleado">
          </mat-form-field>
          <div class="employee-picker-list">
            <label *ngFor="let e of filteredVacationEmployees">
              <input type="checkbox" [checked]="vacationEmployeeIds.includes(e.employeeId)" (change)="toggleVacationEmployee(e.employeeId)">
              <span>{{ e.employeeName }}</span>
              <small>{{ e.sucursalName || 'Sin UEN' }}</small>
            </label>
          </div>
        </div>

        <div class="date-row">
          <mat-form-field appearance="outline">
            <mat-label>Desde</mat-label>
            <input matInput [matDatepicker]="vacationFromPicker" [(ngModel)]="vacationFrom">
            <mat-datepicker-toggle matIconSuffix [for]="vacationFromPicker"></mat-datepicker-toggle>
            <mat-datepicker #vacationFromPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hasta</mat-label>
            <input matInput [matDatepicker]="vacationToPicker" [(ngModel)]="vacationTo" [min]="vacationFrom">
            <mat-datepicker-toggle matIconSuffix [for]="vacationToPicker"></mat-datepicker-toggle>
            <mat-datepicker #vacationToPicker></mat-datepicker>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Comentario</mat-label>
          <textarea matInput rows="3" [(ngModel)]="vacationNotes"></textarea>
        </mat-form-field>

        <div class="selected-list" *ngIf="vacationSelectedEmployees.length">
          <strong>Se aplicará a:</strong>
          <span *ngFor="let employee of vacationSelectedEmployees">{{ employee.employeeName }}</span>
        </div>

        <div class="conflict-list" *ngIf="vacationVisibleConflicts.length">
          <strong>Conflictos visibles en esta semana</strong>
          <span *ngFor="let conflict of vacationVisibleConflicts">{{ conflict }}</span>
        </div>

        <div class="panel-actions">
          <button mat-stroked-button type="button" (click)="vacationOpen = false">Cancelar</button>
          <button mat-flat-button color="primary" type="button" [disabled]="vacationEmployeeIds.length === 0 || vacationRangeDays <= 0 || savingVacation" (click)="saveVacation()">
            {{ savingVacation ? 'Aplicando...' : 'Aplicar vacaciones' }}
          </button>
        </div>
      </aside>

      <aside class="side-panel schedules-panel" *ngIf="schedulesOpen">
        <div class="panel-head">
          <div>
            <span>Horarios</span>
            <h2>Catálogo de horarios</h2>
            <p>Consulta y edita los horarios preestablecidos disponibles.</p>
          </div>
          <button mat-icon-button type="button" (click)="schedulesOpen = false"><mat-icon>close</mat-icon></button>
        </div>

        <div class="schedule-manager">
          <div class="schedule-list">
            <button type="button" *ngFor="let schedule of weekData?.workSchedules" [class.active]="scheduleDraft.id === schedule.id" (click)="editSchedule(schedule)">
              <strong>{{ schedule.name }}</strong>
              <span>{{ shortTime(schedule.startTime) }} - {{ shortTime(schedule.endTime) }}</span>
              <small>{{ schedule.breakMinutes }} min</small>
            </button>
          </div>

          <div class="schedule-editor" *ngIf="scheduleDraft.id">
            <mat-form-field appearance="outline">
              <mat-label>Nombre</mat-label>
              <input matInput [(ngModel)]="scheduleDraft.name">
            </mat-form-field>
            <div class="date-row">
              <mat-form-field appearance="outline">
                <mat-label>Entrada</mat-label>
                <input matInput type="time" [(ngModel)]="scheduleDraft.startTime">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Salida</mat-label>
                <input matInput type="time" [(ngModel)]="scheduleDraft.endTime">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>Break en minutos</mat-label>
              <input matInput type="number" min="0" [(ngModel)]="scheduleDraft.breakMinutes">
            </mat-form-field>
            <div class="panel-actions">
              <button mat-stroked-button type="button" (click)="resetScheduleDraft()">Cancelar</button>
              <button mat-flat-button color="primary" type="button" [disabled]="!scheduleDraft.name || !scheduleDraft.startTime || !scheduleDraft.endTime" (click)="saveScheduleDraft()">Guardar</button>
            </div>
          </div>
        </div>
      </aside>
    </section>
  `,
  styles: [`
    :host{display:block}
    .planning-page{padding:20px;color:var(--text-primary)}
    .page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:12px}
    .eyebrow{display:block;color:var(--carsug-red);font-weight:900;letter-spacing:.12em;margin-bottom:3px}
    .page-head h1{font-size:38px;line-height:1;margin:0 0 4px}
    .page-head p{margin:0;color:var(--text-secondary)}
    .week-picker-shell{position:relative}
    .week-range{display:grid;grid-template-columns:1fr auto;grid-template-areas:"title icon" "range icon";align-items:center;gap:2px 10px;border:1px solid var(--border-color);border-radius:14px;background:var(--bg-card);color:var(--text-primary);padding:10px 14px;min-width:220px;text-align:left;cursor:pointer}
    .week-range:hover{border-color:color-mix(in srgb,var(--border-color) 55%,var(--text-primary) 45%);background:color-mix(in srgb,var(--bg-card) 88%,var(--text-primary) 6%)}
    .week-range strong{grid-area:title}
    .week-range mat-icon{grid-area:icon;color:var(--text-secondary)}
    .week-range span{color:var(--text-secondary)}
    .week-picker-proxy{position:absolute;right:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none}
    .planner-toolbar,.matrix-card,.empty-card{background:var(--bg-card)!important;color:var(--text-primary)!important;border:1px solid var(--border-color);border-radius:16px!important;box-shadow:none!important}
    .planner-toolbar{display:grid!important;grid-template-columns:1fr;gap:12px;align-items:stretch;padding:14px!important;margin-bottom:10px}
    .toolbar-filters{display:grid;grid-template-columns:260px 120px minmax(220px,280px) minmax(360px,1fr);gap:14px;align-items:end;min-width:0}
    .week-nav{display:grid;grid-template-columns:44px minmax(120px,1fr) 44px;align-items:end;gap:8px}
    .week-nav button:not(.week-button){height:44px;width:44px;border-radius:10px;color:var(--text-primary)}
    .week-field{min-width:0}
    .planner-toolbar mat-form-field{width:100%;margin:0}
    .toolbar-filters button,.toolbar-tools button,.flow-actions button{height:44px;font-weight:800;white-space:nowrap}
    .toolbar-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:12px;border-top:1px solid var(--border-color)}
    .flow-actions{display:flex;align-items:center;gap:10px;min-width:0}
    .primary-flow-action{align-self:end;border-radius:10px!important}
    .toolbar-tools{display:flex;align-items:center;justify-content:flex-end;gap:8px}
    .toolbar-tools>span{color:var(--text-secondary);font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
    .vacation-action{background:#4658b8!important;color:#fff!important}
    .schedule-action{border-color:#2f855a!important;color:#276749!important;background:color-mix(in srgb,var(--bg-card) 88%,#2f855a 12%)!important}
    :host-context(.dark-theme) .schedule-action{color:#9ae6b4!important}
    .schedule-strip{display:flex;gap:8px;overflow:auto;margin:0 0 10px;padding-bottom:2px}
    .schedule-strip span{white-space:nowrap;background:var(--bg-card);color:var(--text-secondary);border:1px solid var(--border-color);border-radius:999px;padding:7px 10px}
    .schedule-strip b{color:var(--text-primary);margin-right:4px}
    .bulk-bar{position:sticky;top:8px;z-index:12;display:grid;grid-template-columns:auto minmax(300px,1fr) auto;align-items:center;gap:12px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:14px;padding:8px 12px;margin-bottom:10px;box-shadow:0 8px 18px rgba(0,0,0,.10)}
    .bulk-count,.bulk-controls,.bulk-actions{display:flex;align-items:center;gap:8px}
    .bulk-count{min-width:0;color:var(--text-primary)}
    .bulk-count mat-icon{color:var(--text-secondary)}
    .bulk-count strong{white-space:nowrap;font-size:14px}
    .bulk-controls{justify-content:flex-end}
    .bulk-bar mat-form-field{width:180px;margin:0}
    .bulk-bar button{height:38px;border-radius:10px!important}
    .bulk-actions{justify-content:flex-end}
    .loading{display:flex;align-items:center;justify-content:center;gap:10px;min-height:180px;color:var(--text-secondary)}
    .empty-card{display:flex!important;min-height:190px;align-items:center;justify-content:center;gap:8px;flex-direction:column;color:var(--text-secondary)}
    .empty-card mat-icon{font-size:40px;width:40px;height:40px}
    .empty-card strong{color:var(--text-primary);font-size:18px}
    .planning-split{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;align-items:start}
    .planning-split.panel-open{grid-template-columns:minmax(0,1fr) minmax(420px,480px)}
    .matrix-card{padding:0!important;overflow:hidden}
    .matrix-scroll{max-height:calc(100vh - 250px);overflow:auto}
    .matrix-grid{display:grid;grid-template-columns:minmax(300px,1.4fr) repeat(7,minmax(116px,1fr)) minmax(130px,.7fr);min-width:1250px}
    .cell{min-height:48px;padding:8px 10px;border-bottom:1px solid var(--border-color);background:var(--bg-card);color:var(--text-primary)}
    .header{position:sticky;top:0;z-index:5;background:var(--bg-card-alt);font-weight:900;text-transform:uppercase;letter-spacing:.03em}
    .day-head{display:grid;place-items:center;gap:1px}
    .day-head strong{font-size:13px}
    .day-head span{font-size:12px;color:var(--text-secondary)}
    .employee-col{position:sticky;left:0;z-index:6;border-right:1px solid var(--border-color)}
    .employee-cell{display:flex;align-items:center;gap:10px}
    .employee-cell input{width:17px;height:17px;accent-color:var(--carsug-red);flex:0 0 auto}
    .employee-cell strong,.employee-cell span{display:block}
    .employee-cell strong{font-size:14px;line-height:1.2}
    .employee-cell span{font-size:12px;color:var(--text-secondary);margin-top:2px}
    .day-cell{border:0;border-bottom:1px solid var(--border-color);text-align:left;cursor:pointer;min-height:48px;transition:background .15s ease,border-color .15s ease}
    .day-cell:hover{background:color-mix(in srgb,var(--bg-card) 82%,var(--carsug-red) 18%)}
    .day-cell strong,.day-cell span{display:block}
    .day-cell strong{font-size:13px;line-height:1.15}
    .day-cell span{font-size:11px;color:var(--text-secondary);margin-top:3px}
    .day-cell.rest{background:color-mix(in srgb,var(--bg-card) 82%,#4f7f99 18%);box-shadow:inset 3px 0 0 #4f7f99}
    .day-cell.vacation{background:color-mix(in srgb,var(--bg-card) 82%,#4f8f6b 18%);box-shadow:inset 3px 0 0 #4f8f6b}
    .day-cell.special{box-shadow:inset 3px 0 0 var(--carsug-red)}
    .day-cell.active{outline:2px solid var(--carsug-red);outline-offset:-3px}
    .base-cell strong,.base-cell span{display:block}
    .base-cell strong{font-size:12px}
    .base-cell span{font-size:11px;color:var(--text-secondary)}
    .side-panel{position:fixed;right:0;top:0;bottom:0;z-index:40;width:min(420px,100vw);background:var(--bg-card);color:var(--text-primary);border-left:1px solid var(--border-color);box-shadow:-18px 0 40px rgba(0,0,0,.24);padding:18px;overflow:auto}
    .vacation-panel{display:flex;flex-direction:column;overflow:hidden}
    .vacation-panel .panel-head,.vacation-panel .vacation-summary,.vacation-panel .date-row,.vacation-panel>mat-form-field,.vacation-panel .selected-list,.vacation-panel .conflict-list,.vacation-panel .panel-actions{flex:0 0 auto}
    .planning-split .side-panel{position:sticky;top:16px;right:auto;bottom:auto;width:auto;max-height:calc(100vh - 32px);border:1px solid var(--border-color);border-radius:16px;box-shadow:none}
    .panel-head{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid var(--border-color);padding-bottom:12px;margin-bottom:14px}
    .panel-head span,.panel-head p{color:var(--text-secondary)}
    .panel-head h2{margin:4px 0;font-size:24px}
    .panel-head p{margin:0}
    .side-panel mat-form-field{width:100%;margin-bottom:8px}
    .panel-times{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
    .panel-times div{border:1px solid var(--border-color);border-radius:12px;background:var(--bg-card-alt);padding:10px}
    .panel-times span,.panel-times strong{display:block}
    .panel-times span{color:var(--text-secondary);font-size:12px}
    .panel-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
    .vacation-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
    .vacation-summary div{border:1px solid var(--border-color);border-radius:12px;background:var(--bg-card-alt);padding:10px}
    .vacation-summary span,.vacation-summary strong{display:block}
    .vacation-summary span{color:var(--text-secondary);font-size:12px}
    .vacation-summary strong{font-size:24px}
    .selected-list,.conflict-list{display:grid;gap:6px;border:1px solid var(--border-color);border-radius:12px;background:var(--bg-card-alt);padding:10px;margin:0 0 12px}
    .selected-list span,.conflict-list span{color:var(--text-secondary);font-size:13px}
    .conflict-list{border-color:#b7791f;background:color-mix(in srgb,var(--bg-card) 88%,#b7791f 12%)}
    .vacation-picker{border:1px solid var(--border-color);border-radius:14px;background:var(--bg-card-alt);padding:10px;margin-bottom:12px;min-height:0;display:flex;flex-direction:column}
    .employee-picker-list{display:grid;gap:6px;max-height:clamp(180px,34vh,320px);overflow-y:auto;overflow-x:hidden;padding-right:2px}
    .employee-picker-list label{display:grid;grid-template-columns:auto 1fr;column-gap:8px;row-gap:1px;align-items:center;border:1px solid var(--border-color);border-radius:10px;background:var(--bg-card);padding:8px;cursor:pointer}
    .employee-picker-list input{width:16px;height:16px;accent-color:var(--carsug-red);grid-row:1/3}
    .employee-picker-list span{font-weight:800}
    .employee-picker-list small{color:var(--text-secondary)}
    .date-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .schedules-panel{width:min(720px,100vw)}
    .schedule-manager{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr);gap:12px}
    .schedule-list{display:grid;gap:8px;align-content:start}
    .schedule-list button{border:1px solid var(--border-color);border-radius:12px;background:var(--bg-card-alt);color:var(--text-primary);padding:10px;text-align:left;cursor:pointer}
    .schedule-list button.active{border-color:var(--carsug-red);box-shadow:inset 3px 0 0 var(--carsug-red)}
    .schedule-list strong,.schedule-list span,.schedule-list small{display:block}
    .schedule-list span{margin-top:3px;color:var(--text-primary)}
    .schedule-list small{margin-top:3px;color:var(--text-secondary)}
    .schedule-editor{border:1px solid var(--border-color);border-radius:14px;background:var(--bg-card-alt);padding:12px}
    :host ::ng-deep .mat-mdc-form-field.mat-form-field-disabled .mat-mdc-text-field-wrapper{background:color-mix(in srgb,var(--bg-card) 86%,var(--text-primary) 8%);opacity:1}
    :host ::ng-deep .mat-mdc-form-field.mat-form-field-disabled .mat-mdc-floating-label,
    :host ::ng-deep .mat-mdc-form-field.mat-form-field-disabled .mat-mdc-input-element,
    :host ::ng-deep .mat-mdc-select-disabled .mat-mdc-select-value{color:var(--text-secondary)!important;opacity:.9}
    :host ::ng-deep .mat-mdc-button[disabled],
    :host ::ng-deep .mat-mdc-unelevated-button[disabled],
    :host ::ng-deep .mat-mdc-outlined-button[disabled]{opacity:.62;color:var(--text-secondary)!important}
    :host ::ng-deep .planner-toolbar .mat-mdc-text-field-wrapper,
    :host ::ng-deep .bulk-bar .mat-mdc-text-field-wrapper{height:44px;align-items:center}
    :host ::ng-deep .planner-toolbar .mat-mdc-form-field-flex,
    :host ::ng-deep .bulk-bar .mat-mdc-form-field-flex{height:44px;align-items:center}
    :host ::ng-deep .planner-toolbar .mat-mdc-form-field-infix,
    :host ::ng-deep .bulk-bar .mat-mdc-form-field-infix{min-height:44px;padding-top:10px;padding-bottom:8px}
    :host ::ng-deep .planner-toolbar .mat-mdc-form-field-subscript-wrapper,
    :host ::ng-deep .bulk-bar .mat-mdc-form-field-subscript-wrapper{display:none}
    @media(max-width:1200px){
      .planner-toolbar{grid-template-columns:1fr}
      .toolbar-filters{grid-template-columns:250px 110px minmax(170px,1fr) minmax(220px,1.3fr)}
      .primary-flow-action{grid-column:auto}
      .toolbar-actions{align-items:stretch;flex-direction:column}
      .toolbar-tools{justify-content:flex-start}
      .planning-split.panel-open{grid-template-columns:minmax(0,1fr) minmax(380px,440px)}
      .bulk-bar{grid-template-columns:1fr;align-items:stretch}
      .bulk-controls,.bulk-actions{justify-content:flex-start;flex-wrap:wrap}
    }
    @media(max-width:900px){
      .planning-split,.planning-split.panel-open{display:block}
      .planning-split .side-panel{position:fixed;right:0;top:0;bottom:0;width:min(420px,100vw);max-height:none;border-radius:0;box-shadow:-18px 0 40px rgba(0,0,0,.24)}
    }
    @media(max-width:760px){
      .planning-page{padding:14px}
      .page-head{align-items:stretch;flex-direction:column}
      .page-head h1{font-size:32px}
      .toolbar-filters{grid-template-columns:1fr}
      .toolbar-actions,.flow-actions,.toolbar-tools,.bulk-bar{align-items:stretch;flex-direction:column}
      .toolbar-tools button,.flow-actions button,.toolbar-filters button,.bulk-bar button,.bulk-bar mat-form-field{width:100%}
      .matrix-scroll{max-height:none}
      .bulk-bar{display:flex}
      .date-row,.schedule-manager{grid-template-columns:1fr}
    }
  `],
})
export class AttendancePlanningPageComponent implements OnInit {
  catalogs: HrCatalogs | null = null;
  weekData: AttendancePlanningWeek | null = null;
  filteredEmployees: AttendancePlanningEmployee[] = [];
  selected = new Set<number>();
  loading = false;
  year = new Date().getFullYear();
  week = this.currentWeek();
  selectedWeekDate = new Date();
  sucursalesId: number | null = null;
  search = '';
  bulkRestDay: number | null = null;
  bulkScheduleId: number | null = null;
  showSchedules = false;
  editingEmployee: AttendancePlanningEmployee | null = null;
  editingDay: AttendancePlanningDay | null = null;
  editDayType = 'WORK';
  editScheduleId: number | null = null;
  originalEditDayType = 'WORK';
  originalEditScheduleId: number | null = null;
  vacationOpen = false;
  vacationEmployeeIds: number[] = [];
  vacationEmployeeSearch = '';
  vacationFrom: Date | null = null;
  vacationTo: Date | null = null;
  vacationNotes = '';
  savingVacation = false;
  schedulesOpen = false;
  scheduleDraft: Partial<WorkSchedule> = {};
  dayLabels = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

  constructor(private hr: HrService, private snackbar: SnackbarService) {}

  get weekDays(): { label: string; dayNumber: string }[] {
    const start = this.weekData?.weekStart ? new Date(this.weekData.weekStart) : null;
    return this.dayLabels.map((label, index) => {
      if (!start) return { label, dayNumber: '' };
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { label, dayNumber: String(date.getDate()).padStart(2, '0') };
    });
  }

  get vacationRangeDays(): number {
    if (!this.vacationFrom || !this.vacationTo) return 0;
    const from = startOfDay(this.vacationFrom);
    const to = startOfDay(this.vacationTo);
    if (Number.isNaN(+from) || Number.isNaN(+to) || to < from) return 0;
    return Math.floor((+to - +from) / 86400000) + 1;
  }

  get vacationSelectedEmployees(): AttendancePlanningEmployee[] {
    const ids = new Set(this.vacationEmployeeIds);
    return (this.weekData?.employees ?? []).filter((employee) => ids.has(employee.employeeId));
  }

  get filteredVacationEmployees(): AttendancePlanningEmployee[] {
    const term = this.vacationEmployeeSearch.trim().toLowerCase();
    return (this.weekData?.employees ?? []).filter((employee) =>
      !term
      || employee.employeeName.toLowerCase().includes(term)
      || (employee.sucursalName || '').toLowerCase().includes(term),
    );
  }

  get vacationVisibleConflicts(): string[] {
    if (!this.vacationFrom || !this.vacationTo || this.vacationEmployeeIds.length === 0) return [];
    const from = startOfDay(this.vacationFrom);
    const to = startOfDay(this.vacationTo);
    if (Number.isNaN(+from) || Number.isNaN(+to) || to < from) return [];

    const conflicts: string[] = [];
    this.vacationSelectedEmployees.forEach((employee) => {
      employee.days
        .filter((day) => {
          const date = new Date(day.date);
          return date >= from && date <= to && (day.dayType === 'VACATION' || day.notes || this.isSpecial(employee, day));
        })
        .forEach((day) => conflicts.push(`${employee.employeeName}: ${this.formatDate(day.date)} ya tiene ${this.labelDay(day.dayType).toLowerCase()} o excepción.`));
    });
    return conflicts;
  }

  ngOnInit(): void {
    this.hr.getCatalogs().subscribe((x) => (this.catalogs = x));
    this.load();
  }

  load(): void {
    this.year = Number(this.year) || new Date().getFullYear();
    this.week = Math.min(53, Math.max(1, Number(this.week) || 1));
    this.loading = true;
    this.selected.clear();
    this.hr.getAttendancePlanning({ year: this.year, week: this.week, sucursalesId: this.sucursalesId })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (x) => {
          this.weekData = x;
          this.selectedWeekDate = parseLocalDate(x.weekStart);
          this.applyFilters();
        },
        error: (e) => this.snackbar.error(this.error(e, 'No se pudo cargar la planeación.')),
      });
  }

  generate(): void {
    this.loading = true;
    this.hr.generateAttendancePlanning({ year: this.year, week: this.week, sucursalesId: this.sucursalesId })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({ next: (x) => { this.weekData = x; this.applyFilters(); }, error: (e) => this.snackbar.error(this.error(e, 'No se pudo generar la semana.')) });
  }

  copyPrevious(): void {
    this.loading = true;
    this.hr.copyPreviousAttendancePlanning({ year: this.year, week: this.week, sucursalesId: this.sucursalesId })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({ next: (x) => { this.weekData = x; this.applyFilters(); }, error: (e) => this.snackbar.error(this.error(e, 'No se pudo copiar la semana.')) });
  }

  applyFilters(): void {
    const term = this.search.trim().toLowerCase();
    this.filteredEmployees = (this.weekData?.employees ?? []).filter((x) =>
      !term || x.employeeName.toLowerCase().includes(term) || (x.sucursalName || '').toLowerCase().includes(term),
    );
  }

  moveWeek(delta: number): void {
    this.week += delta;
    if (this.week < 1) { this.year -= 1; this.week = 52; }
    if (this.week > 53) { this.year += 1; this.week = 1; }
    this.load();
  }

  selectWeekDate(value: Date | null): void {
    if (!value) return;
    const selected = startOfDay(value);
    this.year = selected.getFullYear();
    this.week = this.weekNumberFromDate(selected);
    this.selectedWeekDate = selected;
    this.load();
  }

  openDayEditor(employee: AttendancePlanningEmployee, day: AttendancePlanningDay): void {
    if (!this.canDiscardEditorChanges(employee.employeeId, day.date)) return;
    this.editingEmployee = employee;
    this.editingDay = day;
    this.editDayType = day.dayType;
    this.editScheduleId = day.workScheduleId ?? employee.weeklyWorkScheduleId ?? employee.defaultWorkScheduleId ?? null;
    this.syncEditorBaseline();
  }

  closeDayEditor(): void {
    if (!this.canDiscardEditorChanges()) return;
    this.editingEmployee = null;
    this.editingDay = null;
  }

  saveDayEditor(): void {
    if (!this.editingEmployee || !this.editingDay) return;
    this.hr.updateAttendanceDay({
      employeeId: this.editingEmployee.employeeId,
      date: this.editingDay.date,
      dayType: this.editDayType,
      workScheduleId: this.editDayType === 'WORK' ? this.editScheduleId : null,
    }).subscribe({
      next: () => {
        this.editingDay!.dayType = this.editDayType;
        this.editingDay!.workScheduleId = this.editDayType === 'WORK' ? this.editScheduleId : null;
        this.editingDay!.workScheduleName = this.scheduleName(this.editScheduleId);
        this.syncEditorBaseline();
      },
      error: (e) => this.snackbar.error(this.error(e, 'No se pudo actualizar el día.')),
    });
  }

  restoreDefaultSchedule(): void {
    this.editScheduleId = this.editingEmployee?.weeklyWorkScheduleId ?? this.editingEmployee?.defaultWorkScheduleId ?? null;
  }

  openVacationPanel(): void {
    this.vacationOpen = true;
    this.vacationEmployeeIds = this.selected.size > 0 ? [...this.selected] : [];
    this.vacationEmployeeSearch = '';
    this.vacationFrom = this.weekData?.weekStart ? new Date(this.weekData.weekStart) : new Date();
    this.vacationTo = this.vacationFrom ? new Date(this.vacationFrom) : null;
    this.vacationNotes = '';
  }

  saveVacation(): void {
    if (this.vacationEmployeeIds.length === 0 || !this.vacationFrom || !this.vacationTo || this.vacationRangeDays <= 0) return;
    this.savingVacation = true;
    forkJoin(this.vacationEmployeeIds.map((employeeId) => this.hr.createVacationRange({
      employeeId,
      dateFrom: toDateInputValue(this.vacationFrom!),
      dateTo: toDateInputValue(this.vacationTo!),
      notes: this.vacationNotes || null,
    }))).pipe(finalize(() => (this.savingVacation = false))).subscribe({
      next: () => {
        this.vacationOpen = false;
        this.clearSelection();
        this.load();
      },
      error: (e) => this.snackbar.error(this.error(e, 'No se pudieron registrar vacaciones.')),
    });
  }

  applyBulk(): void {
    this.hr.applyBulkAttendancePlanning({ year: this.year, week: this.week, employeeIds: [...this.selected], restDayOfWeek: this.bulkRestDay, workScheduleId: this.bulkScheduleId })
      .subscribe({ next: () => this.load(), error: (e) => this.snackbar.error(this.error(e, 'No se pudo aplicar la edición masiva.')) });
  }

  clearSelection(): void {
    this.selected.clear();
    this.bulkRestDay = null;
    this.bulkScheduleId = null;
  }

  toggleSelected(id: number): void { this.selected.has(id) ? this.selected.delete(id) : this.selected.add(id); }
  toggleSchedules(): void { this.showSchedules = !this.showSchedules; }
  toggleVacationEmployee(id: number): void {
    this.vacationEmployeeIds = this.vacationEmployeeIds.includes(id)
      ? this.vacationEmployeeIds.filter((x) => x !== id)
      : [...this.vacationEmployeeIds, id];
  }

  openSchedulesPanel(): void {
    this.schedulesOpen = true;
    const first = this.weekData?.workSchedules?.[0];
    if (first) this.editSchedule(first);
  }

  editSchedule(schedule: WorkSchedule): void {
    this.scheduleDraft = { ...schedule, startTime: this.shortTime(schedule.startTime), endTime: this.shortTime(schedule.endTime) };
  }

  resetScheduleDraft(): void {
    const current = this.weekData?.workSchedules.find((x) => x.id === this.scheduleDraft.id);
    if (current) this.editSchedule(current);
  }

  saveScheduleDraft(): void {
    if (!this.weekData || !this.scheduleDraft.id || !this.scheduleDraft.name || !this.scheduleDraft.startTime || !this.scheduleDraft.endTime) return;
    const index = this.weekData.workSchedules.findIndex((x) => x.id === this.scheduleDraft.id);
    if (index < 0) return;
    this.weekData.workSchedules[index] = {
      ...this.weekData.workSchedules[index],
      name: this.scheduleDraft.name,
      startTime: this.scheduleDraft.startTime,
      endTime: this.scheduleDraft.endTime,
      breakMinutes: Number(this.scheduleDraft.breakMinutes || 0),
      isActive: this.scheduleDraft.isActive !== false,
    };
    this.snackbar.success('Horario actualizado en la vista.');
  }

  isEditingCell(employeeId: number, date: string): boolean {
    return this.editingEmployee?.employeeId === employeeId && !!this.editingDay && sameDate(this.editingDay.date, date);
  }

  isEditorDirty(): boolean {
    return this.editDayType !== this.originalEditDayType || this.editScheduleId !== this.originalEditScheduleId;
  }

  canDiscardEditorChanges(nextEmployeeId?: number, nextDate?: string): boolean {
    if (!this.editingEmployee || !this.editingDay) return true;
    if (nextEmployeeId === this.editingEmployee.employeeId && nextDate && sameDate(this.editingDay.date, nextDate)) return true;
    if (!this.isEditorDirty()) return true;
    return window.confirm('Hay cambios sin guardar.\n¿Deseas descartarlos y cambiar de día?');
  }

  syncEditorBaseline(): void {
    this.originalEditDayType = this.editDayType;
    this.originalEditScheduleId = this.editScheduleId;
  }

  dayTitle(row: AttendancePlanningEmployee, day: AttendancePlanningDay): string {
    if (day.dayType === 'REST') return 'DESCANSO';
    if (day.dayType === 'VACATION') return 'VACACIONES';
    const schedule = this.scheduleById(day.workScheduleId ?? row.weeklyWorkScheduleId ?? row.defaultWorkScheduleId);
    return schedule ? `${this.shortTime(schedule.startTime)}-${this.shortTime(schedule.endTime)}` : 'TRABAJO';
  }

  daySubtitle(row: AttendancePlanningEmployee, day: AttendancePlanningDay): string {
    if (day.dayType !== 'WORK') return day.workScheduleName || '';
    return this.isSpecial(row, day) ? 'ESPECIAL' : (day.workScheduleName || this.scheduleName(row.weeklyWorkScheduleId || row.defaultWorkScheduleId));
  }

  isSpecial(row: AttendancePlanningEmployee, day: AttendancePlanningDay): boolean {
    const base = row.weeklyWorkScheduleId ?? row.defaultWorkScheduleId ?? null;
    return day.dayType === 'WORK' && !!day.workScheduleId && !!base && day.workScheduleId !== base;
  }

  baseScheduleRange(row: AttendancePlanningEmployee): string {
    const schedule = this.scheduleById(row.weeklyWorkScheduleId || row.defaultWorkScheduleId);
    return schedule ? `${this.shortTime(schedule.startTime)}-${this.shortTime(schedule.endTime)}` : '--';
  }

  editorSchedule() { return this.scheduleById(this.editScheduleId); }
  scheduleById(id?: number | null) { return this.weekData?.workSchedules.find((x) => x.id === id) ?? null; }
  scheduleName(id?: number | null): string { return this.scheduleById(id)?.name ?? '--'; }
  labelDay(type: string): string { return type === 'REST' ? 'Descanso' : type === 'VACATION' ? 'Vacaciones' : 'Trabajo'; }
  shortTime(value?: string | null): string { return value ? value.slice(0, 5) : '--'; }
  formatDate(value: string): string { return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  formatLongDate(value: string): string { return new Date(value).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }); }
  currentWeek(): number { return this.weekNumberFromDate(new Date()); }
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

function toDateInputValue(value: Date): string {
  const date = startOfDay(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

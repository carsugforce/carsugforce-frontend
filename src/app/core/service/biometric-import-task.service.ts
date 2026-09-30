import { Injectable } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { BehaviorSubject, Subscription } from 'rxjs';

import { BiometricImport } from '../models/hr.models';
import { HrService } from './hr.service';

export type BiometricImportStage = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

export interface BiometricImportTaskState {
  taskId: number;
  active: boolean;
  stage: BiometricImportStage;
  fileName: string | null;
  progress: number;
  message: string;
  result: BiometricImport | null;
  error: string | null;
}

const initialState: BiometricImportTaskState = {
  taskId: 0,
  active: false,
  stage: 'idle',
  fileName: null,
  progress: 0,
  message: 'Sin importacion activa.',
  result: null,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class BiometricImportTaskService {
  private readonly stateSubject = new BehaviorSubject<BiometricImportTaskState>(initialState);
  readonly state$ = this.stateSubject.asObservable();

  private requestSub?: Subscription;
  private processingTimer?: ReturnType<typeof setInterval>;
  private serverPollingTimer?: ReturnType<typeof setInterval>;
  private nextTaskId = 1;

  constructor(private hr: HrService) {
    window.addEventListener('beforeunload', (event) => {
      if (!this.snapshot.active) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  get snapshot(): BiometricImportTaskState {
    return this.stateSubject.value;
  }

  start(file: File): boolean {
    if (this.snapshot.active) return false;

    this.stopProcessingTimer();
    this.stopServerPolling();
    this.stateSubject.next({
      taskId: this.nextTaskId++,
      active: true,
      stage: 'uploading',
      fileName: file.name,
      progress: 5,
      message: 'Preparando archivo biometrico.',
      result: null,
      error: null,
    });

    this.requestSub = this.hr.importBiometricsWithProgress(file).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const uploadPercent = event.loaded / event.total;
          const progress = Math.max(5, Math.min(70, Math.round(5 + uploadPercent * 65)));
          const uploaded = event.loaded >= event.total;
          this.patch({
            stage: uploaded ? 'processing' : 'uploading',
            progress,
            message: uploaded ? 'Archivo recibido. Procesando registros.' : 'Subiendo archivo biometrico.',
          });
          if (uploaded) this.startProcessingTimer();
        }

        if (event.type === HttpEventType.Response && event.body) {
          this.stopProcessingTimer();
          this.patch({
            active: false,
            stage: 'completed',
            progress: 100,
            message: 'Importacion completada.',
            result: event.body,
            error: null,
          });
        }
      },
      error: (error) => {
        this.stopProcessingTimer();
        this.patch({
          active: false,
          stage: 'failed',
          progress: 0,
          message: 'No se pudo completar la importacion.',
          error: error?.error?.message || error?.error || 'No se pudo importar el archivo.',
        });
      },
    });

    return true;
  }

  resumeFromServer(importRow: BiometricImport): void {
    if (this.snapshot.active) return;
    if ((importRow.status || '').toUpperCase() !== 'PROCESSING') return;

    this.stopProcessingTimer();
    this.stopServerPolling();
    this.stateSubject.next({
      taskId: this.nextTaskId++,
      active: true,
      stage: 'processing',
      fileName: importRow.originalFileName,
      progress: 72,
      message: 'Se detecto una importacion en proceso en el servidor.',
      result: null,
      error: null,
    });

    this.startProcessingTimer();
    this.startServerPolling(importRow.id);
  }

  private patch(value: Partial<BiometricImportTaskState>): void {
    this.stateSubject.next({ ...this.snapshot, ...value });
  }

  private startProcessingTimer(): void {
    if (this.processingTimer) return;

    this.processingTimer = setInterval(() => {
      const current = this.snapshot;
      if (!current.active || current.stage !== 'processing') {
        this.stopProcessingTimer();
        return;
      }

      const next = current.progress < 88 ? current.progress + 2 : current.progress + 1;
      this.patch({
        progress: Math.min(99, next),
        message: 'Analizando dispositivos, marcaciones y duplicados.',
      });
    }, 1300);
  }

  private stopProcessingTimer(): void {
    if (!this.processingTimer) return;
    clearInterval(this.processingTimer);
    this.processingTimer = undefined;
  }

  private startServerPolling(importId: number): void {
    if (this.serverPollingTimer) return;

    this.serverPollingTimer = setInterval(() => {
      this.hr.getBiometricImports().subscribe({
        next: (imports) => {
          const current = imports.find((item) => item.id === importId);
          if (!current) return;

          const status = (current.status || '').toUpperCase();
          if (status === 'PROCESSING') return;

          this.stopProcessingTimer();
          this.stopServerPolling();

          if (status === 'SUCCESS') {
            this.patch({
              active: false,
              stage: 'completed',
              progress: 100,
              message: 'Importacion completada.',
              result: current,
              error: null,
            });
            return;
          }

          this.patch({
            active: false,
            stage: 'failed',
            progress: 0,
            message: 'No se pudo completar la importacion.',
            result: null,
            error: current.errorMessage || 'La importacion termino con error.',
          });
        },
      });
    }, 5000);
  }

  private stopServerPolling(): void {
    if (!this.serverPollingTimer) return;
    clearInterval(this.serverPollingTimer);
    this.serverPollingTimer = undefined;
  }
}

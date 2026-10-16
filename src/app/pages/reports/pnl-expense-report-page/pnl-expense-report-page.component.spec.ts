import { FormBuilder } from '@angular/forms';
import { PnlService } from '../../../core/service/pnl.service';
import { SnackbarService } from '../../../core/service/snackbar.service';
import { SucursalService } from '../../../core/service/sucursales.service';
import { PnlExpenseReportPageComponent } from './pnl-expense-report-page.component';

describe('PnlExpenseReportPageComponent period selection', () => {
  let component: PnlExpenseReportPageComponent;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 9, 15, 12));
    component = createComponent();
  });

  afterEach(() => jasmine.clock().uninstall());

  function createComponent(): PnlExpenseReportPageComponent {
    return new PnlExpenseReportPageComponent(
      new FormBuilder(),
      {} as PnlService,
      {} as SucursalService,
      {} as SnackbarService,
    );
  }

  it('opens with no initial month and the current final month and year', () => {
    expect(component.form.controls.startMonth.value).toBeNull();
    expect(component.form.controls.endMonth.value).toBe(10);
    expect(component.form.controls.year.value).toBe(2026);
    expect(component.form.valid).toBeTrue();
  });

  it('uses the final month alone when no initial month is selected', () => {
    expect(component.query.startMonth).toBe(10);
    expect(component.query.endMonth).toBe(10);
    expect(component.canRun).toBeTrue();
    component.form.controls.endMonth.setValue(8);
    expect(component.query.startMonth).toBe(8);
  });

  it('preserves an explicitly selected range and allows clearing it', () => {
    component.form.controls.startMonth.setValue(4);
    expect(component.query.startMonth).toBe(4);
    expect(component.query.endMonth).toBe(10);
    expect(component.canRun).toBeTrue();
    component.form.controls.startMonth.setValue(null);
    expect(component.query.startMonth).toBe(10);
  });

  it('rejects an initial month later than the final month', () => {
    component.form.controls.startMonth.setValue(11);
    expect(component.canRun).toBeFalse();
  });

  it('calculates defaults again when opening in a new month or year', () => {
    jasmine.clock().mockDate(new Date(2029, 0, 2, 12));
    component = createComponent();
    expect(component.form.controls.endMonth.value).toBe(1);
    expect(component.form.controls.year.value).toBe(2029);
    expect(component.years).toContain(2029);
    expect(component.form.controls.startMonth.value).toBeNull();
  });
});

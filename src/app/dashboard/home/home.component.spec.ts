import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { UserService } from '../../core/service/user.service';
import { HomeComponent } from './home.component';

describe('Dashboard presentation', () => {
  let fixture: ComponentFixture<HomeComponent>;
  const permissions = [
    'purchases.view', 'purchases.new', 'purchases.edit', 'purchase-recurrences.view',
    'purchase-payments.create', 'purchase-payments-history.view', 'reports.pnl.payroll.manage',
    'pecal.view', 'pecal.create', 'pecal.dispatch', 'pecal.myorder', 'sales.view', 'sales.database.view',
    'reports.pnl.view', 'reports.pnl.generate', 'hr.employees.view', 'hr.employees.create',
    'hr.approvals.view', 'attendance.planning.view', 'attendance.biometrics.import', 'attendance.incidents.view',
    'catalog.view', 'lines.view', 'product.view', 'family.view', 'suppliers.view', 'users.view', 'roles.view',
  ];
  const userService = { getMe: jasmine.createSpy('getMe') };

  beforeEach(async () => {
    userService.getMe.and.returnValue(of({ fullName: 'Owner', permissions, roles: ['SuperAdmin'] }));
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), { provide: UserService, useValue: userService }],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  it('shows all seven permitted areas and preserves existing destinations', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.area-list')).toBeNull();
    expect(root.querySelectorAll('.quick-card').length).toBe(7);
    expect(root.querySelector('h1')?.textContent).toContain('Owner');
    expect(root.querySelector('[routerLink="/reports/pnl/expenses"]')).not.toBeNull();
    expect(root.querySelector('[routerLink="/pecal/new-order"]')).not.toBeNull();
  });

  it('does not expose areas or actions without their existing permissions', () => {
    fixture.componentInstance.userPermissions = ['sales.database.view'];
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.quick-card').length).toBe(1);
    expect(root.querySelector('.area-count')?.textContent).toContain('1 área disponible');
    expect(root.querySelector('.quick-card h3')?.textContent).toBe('Ventas');
    expect(root.querySelectorAll('.quick-tag').length).toBe(1);
    expect(root.querySelector('[routerLink="/ventas/database"]')).not.toBeNull();
  });

  it('shows the empty state rather than unauthorized shortcuts', () => {
    fixture.componentInstance.userPermissions = [];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dashboard-state').textContent).toContain('No tienes accesos');
    expect(fixture.nativeElement.querySelectorAll('.quick-card').length).toBe(0);
  });

  it('shows a loading state while the existing user request is pending', () => {
    fixture.destroy();
    userService.getMe.and.returnValue(new Subject());
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dashboard-state').textContent).toContain('Cargando');
    expect(fixture.nativeElement.querySelector('.welcome-banner').getAttribute('aria-busy')).toBe('true');
  });

  for (const width of [390, 800, 1200, 1550]) {
    it(`keeps equal card heights and every action inside its card at ${width}px`, async () => {
      const root: HTMLElement = fixture.nativeElement;
      root.style.width = `${width}px`;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const cards = Array.from(root.querySelectorAll<HTMLElement>('.quick-card'));
      const heights = cards.map(card => card.getBoundingClientRect().height);
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);
      for (const card of cards) {
        const bounds = card.getBoundingClientRect();
        for (const button of Array.from(card.querySelectorAll<HTMLElement>('.quick-tag'))) {
          const rect = button.getBoundingClientRect();
          expect(rect.bottom).toBeLessThanOrEqual(bounds.bottom - 10);
          expect(rect.right).toBeLessThanOrEqual(bounds.right - 10);
          expect(rect.left).toBeGreaterThanOrEqual(bounds.left);
        }
      }
    });
  }
});

import { Component, Inject, OnInit, HostListener } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RouterOutlet, RouterLink, Router, ActivatedRoute, NavigationEnd, RouterLinkActive } from '@angular/router';

import { ThemeService } from '../../core/service/theme.service';
import { UserService } from '../../core/service/user.service';
import { PermissionService } from '../../core/service/permission.service';
import { MenuService } from '../../core/service/menu.service';

import { MenuItem } from '../../core/models/menu-item.model';

import { ViewEncapsulation } from '@angular/core';
import { filter } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { UserProfileDialogComponent } from '../../modals/profile-modal/user-profile-dialog.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
    MatMenuModule,
    MatExpansionModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  encapsulation: ViewEncapsulation.None
})


export class MainLayoutComponent implements OnInit {
  private readonly sidebarWidthStorageKey = 'carsug_sidebar_width';
  private readonly sidebarCollapsedStorageKey = 'carsug_sidebar_collapsed';
  private readonly sidebarMinWidth = 220;
  private readonly sidebarMaxWidth = 420;

  userName = '';
  currentRole = '';
  isDarkMode = false;
  sucursal = '';

  allowedPermissions: string[] = [];
  menuItems: MenuItem[] = [];
  pageTitle = '';

 
  isMobile = false;
  mobileMenuOpen = false;
  sidebarWidth = 260;
  sidebarCollapsed = false;
  isSidebarResizing = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private theme: ThemeService,
    private userService: UserService,
    private permissionService: PermissionService,
    private menuService: MenuService,
    private dialog: MatDialog,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        let current = this.route.snapshot;
        while (current.firstChild) current = current.firstChild;
        this.pageTitle = current.data['title'] ?? '';
      });
    this.checkScreenSize();
  }

  ngOnInit() { 
    this.restoreSidebarPreferences();
    this.loadUserFromBackend();
  }

  @HostListener('window:resize')
  checkScreenSize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 900;

    // Si NO es móvil → asegurar sidenav abierto automáticamente
    if (!this.isMobile) {
      this.mobileMenuOpen = false;
    }
  }

  @HostListener('document:mousemove', ['$event'])
  resizeSidebar(event: MouseEvent) {
    if (!this.isSidebarResizing || this.isMobile) return;

    const nextWidth = Math.min(
      this.sidebarMaxWidth,
      Math.max(this.sidebarMinWidth, event.clientX)
    );

    this.sidebarWidth = nextWidth;
  }

  @HostListener('document:mouseup')
  stopSidebarResize() {
    if (!this.isSidebarResizing) return;

    this.isSidebarResizing = false;
    this.document.body.classList.remove('sidebar-is-resizing');
    localStorage.setItem(this.sidebarWidthStorageKey, String(this.sidebarWidth));
  }

  
  openMobileMenu() {
    this.mobileMenuOpen = true;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  startSidebarResize(event: MouseEvent) {
    if (this.isMobile) return;

    event.preventDefault();
    this.isSidebarResizing = true;
    this.document.body.classList.add('sidebar-is-resizing');
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem(this.sidebarCollapsedStorageKey, String(this.sidebarCollapsed));
  }

  private restoreSidebarPreferences() {
    const savedWidth = Number(localStorage.getItem(this.sidebarWidthStorageKey));
    if (!Number.isNaN(savedWidth) && savedWidth > 0) {
      this.sidebarWidth = Math.min(
        this.sidebarMaxWidth,
        Math.max(this.sidebarMinWidth, savedWidth)
      );
    }

    this.sidebarCollapsed = localStorage.getItem(this.sidebarCollapsedStorageKey) === 'true';
  }

  loadUserFromBackend() {
    this.userService.getMe().subscribe({
      next: (data: any) => {

        
        this.sucursal = data?.sucursal?.description?.trim() || 'Panel';
        this.userName = data.username || data.email;
        this.currentRole = data.roles?.[0] ?? '';
        this.isDarkMode = !!data.darkMode;

        this.allowedPermissions = data.permissions || [];
        this.permissionService.setPermissions(this.allowedPermissions);

        this.menuItems = this.menuService.getMenu(this.allowedPermissions);

        this.document.body.classList.toggle('dark-theme', this.isDarkMode);
        this.theme.setDark(this.isDarkMode);
        this.isDarkMode = !!data.darkMode;
      },
      error: () => {
        localStorage.removeItem('carsug_token');
        this.router.navigate(['/login']);
      }
    });
  }

  toggleTheme(checked: boolean) {
    this.isDarkMode = checked;
    this.userService.updateDarkMode(checked).subscribe();
    this.document.body.classList.toggle('dark-theme', checked);
    this.theme.setDark(checked);
  }

  logout() {
    localStorage.removeItem('carsug_token');
    this.router.navigate(['/login']);
  }

  // 🟦 Ver si un submenu está activo
  isChildActive(item: MenuItem): boolean {
    if (!item.children) return false;

    return item.children.some(c =>
      this.router.isActive(c.route!, {
        paths: 'exact',
        queryParams: 'ignored',
        matrixParams: 'ignored',
        fragment: 'ignored'
      })
    );
  }

   openUserModal() {
      this.dialog.open(UserProfileDialogComponent, {
        width: '420px',
        maxWidth: '95vw',
        autoFocus: true,
         disableClose: true,
        panelClass: "custom-dialog-panel", // <- aquí
        data: {
          userName: this.userName,
          role: this.currentRole,
        }
      });
    }



}

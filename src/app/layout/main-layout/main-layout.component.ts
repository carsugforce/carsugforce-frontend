import { Component, Inject, OnInit, HostListener, ViewChild } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';

import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';

import { RouterOutlet, RouterLink, Router, ActivatedRoute, NavigationEnd, RouterLinkActive } from '@angular/router';

import { ThemeService } from '../../core/service/theme.service';
import { UserService } from '../../core/service/user.service';
import { PermissionService } from '../../core/service/permission.service';
import { MenuService } from '../../core/service/menu.service';

import { MenuItem } from '../../core/models/menu-item.model';

import { ViewEncapsulation } from '@angular/core';
import { filter } from 'rxjs';

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
    RouterLink
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class MainLayoutComponent implements OnInit {
@ViewChild('sidenav') sidenav!: MatSidenav;
 

  userName = '';
  currentRole = '';
  isDarkMode = false;
  sucursal = '';

  allowedPermissions: string[] = [];
  menuItems: MenuItem[] = [];
  pageTitle = '';

 
  isMobile = false;
  mobileMenuOpen = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private theme: ThemeService,
    private userService: UserService,
    private permissionService: PermissionService,
    private menuService: MenuService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        let current = this.route.snapshot;
        while (current.firstChild) current = current.firstChild;
        this.pageTitle = current.data['title'] ?? '';
      });

    this.checkScreenSize(); // Detectar tamaño al iniciar
  }

  ngOnInit() { 
    this.checkScreenSize();
    this.loadUserFromBackend();
  }

  @HostListener('window:resize')
  checkScreenSize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 900;

    // Si NO es móvil → asegurar sidenav abierto automáticamente
    if (!this.isMobile) {
      this.mobileMenuOpen = false;

      setTimeout(() => {
        this.sidenav.open(); 
      });
    }
  }

  
  openMobileMenu() {
    this.sidenav.open();
  }

  closeMobileMenu() {
    this.sidenav.close();
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




}

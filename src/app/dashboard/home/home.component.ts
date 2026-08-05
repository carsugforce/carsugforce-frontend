import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { UserService } from '../../core/service/user.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private userService = inject(UserService);
  userDisplayName = 'CarsugForce';
  userPermissions: string[] = [];
  userRoles: string[] = [];
  loadingUser = true;

  ngOnInit(): void {
    this.userService.getMe().subscribe({
      next: (res: any) => {
        this.userPermissions =
          res.permissions ||
          res.Permissions ||
          res.permissionKeys ||
          res.PermissionKeys ||
          [];

        this.userRoles =
          res.roles ||
          res.Roles ||
          res.roleNames ||
          res.RoleNames ||
          [];

         const rawName =
          res.fullName ||
          res.FullName ||
          res.name ||
          res.Name ||
          res.userName ||
          res.UserName ||
          res.email ||
          res.Email ||
          'Usuario';

        this.userDisplayName = this.formatDisplayName(rawName);

        this.loadingUser = false;
      },
      error: () => {
        this.userPermissions = [];
        this.userRoles = [];
        this.loadingUser = false;
      }
    });
  }

  can(permission: string): boolean {
    return this.userPermissions.includes(permission);
  }

  canAny(permissions: string[]): boolean {
    return permissions.some(permission => this.can(permission));
  }


  private formatDisplayName(value: string): string {
    if (!value) return 'Usuario';

    let clean = value.trim();

    // Si viene correo, quitar dominio
    if (clean.includes('@')) {
      clean = clean.split('@')[0];
    }

    // Separadores comunes: punto, guion bajo, guion
    clean = clean
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Casos específicos sin separador
    const knownNames: Record<string, string> = {
      franciscomejia: 'Francisco Mejia'
    };

    const normalized = clean.toLowerCase();

    if (knownNames[normalized]) {
      return knownNames[normalized];
    }

    // Capitalizar palabras normales
    return clean
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }


}
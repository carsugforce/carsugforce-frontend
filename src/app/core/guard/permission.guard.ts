import { inject } from '@angular/core';
import { PermissionService } from '../service/permission.service';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

export const PermissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  const required = route.data['requiredPermission'];
  if (!required) return true;

  // PERMISOS GUARDADOS EN LOCALSTORAGE
  const storedPermissions = permissionService.getStoredPermissions();

  const ok = storedPermissions.includes(required);

  if (!ok) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

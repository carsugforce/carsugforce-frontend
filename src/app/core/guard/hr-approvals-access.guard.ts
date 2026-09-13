import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

const ALLOWED_APPROVAL_EMAILS = new Set([
  'christian.salas@carsug.com',
  'owner@carsug-force.com',
]);

export const HrApprovalsAccessGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (ALLOWED_APPROVAL_EMAILS.has(authService.getCurrentUserEmail())) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

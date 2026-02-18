

import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Leer token solo si hay window
  let token: string | null = null;

  if (typeof window !== 'undefined') {
    token = localStorage.getItem('carsug_token');
  }

  // 2. SOLO agregar el header si hay token
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  
  return next(req);
};

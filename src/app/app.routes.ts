

import { Routes } from '@angular/router';
import { AuthGuard } from './core/guard/auth.guard';
import { LoginGuard } from './core/guard/login.guard';
import { PermissionGuard } from './core/guard/permission.guard';

export const routes: Routes = [

  // 🔥 LOGIN AL INICIO
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [LoginGuard]
  },

  // 🔥 LAYOUT PRINCIPAL (PROTEGIDO)
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component')
        .then(m => m.MainLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/home/home.component')
            .then(m => m.HomeComponent),
        data: { title: 'Dashboard' }
      },

      {
        path: 'pecal/new-order',
        loadComponent: () =>
          import('./pages/pecal/new-order/neworderpecal.component')
            .then(m => m.NewOrderPecalComponent ),
        canActivate: [PermissionGuard],
        data: {  title: 'Nueva orden PECAL' ,requiredPermission: 'pecal.create'
        }
      },

      {
        path: 'pecal/edit/:orderId',
        loadComponent: () =>
          import('./pages/pecal/new-order/neworderpecal.component')
            .then(m => m.NewOrderPecalComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Editar orden PECAL',
          requiredPermission: 'pecal.edit'
        }
      },

        {
        path: 'pecal/my-orders',
        loadComponent: () =>
          import('./pages/pecal/my-orders/myorderspecal.component')
            .then(m => m.MyordersPecal),
        canActivate: [PermissionGuard],
        data: {
          title: 'Mis ordenes PECAL' ,
          requiredPermission: 'pecal.create'
        }
      },


        {
        path: 'pecal/warehouse-pecal',
        loadComponent: () =>
          import('./pages/pecal/warehouse-pecal/warehouse-pecal.component')
            .then(m => m.WharehousePecal),
        canActivate: [PermissionGuard],
        data: {title: 'Ordenes Almacen',requiredPermission: 'pecal.dispatch'
        }
      },
      

     
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/users/users.component')
            .then(m => m.UsersComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Usuarios',
          requiredPermission: 'users.view'
        }
      },

      // ========================
      // C O N F I G U R A C I Ó N
      // ========================

      {
        path: 'config/roles',
        loadComponent: () =>
          import('./pages/roles/roles.component')
            .then(m => m.RolesComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Roles',
          requiredPermission: 'roles.view'
        }
      },

      // ========================
      // C O N F I G U R A C I Ó N
      // ========================

      {
        path: 'catalogs/lines',
        loadComponent: () =>
          import('./pages/Catalogs/lines/lines.component')
            .then(m => m.LinesComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Catalogo de lineas',
          requiredPermission: 'lines.view'
        }
      },
      {
        path: 'catalogs/products',
        loadComponent: () =>
          import('./pages/Catalogs/products/products.component')
            .then(m => m.ProductsComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Productos',
          requiredPermission: 'product.view'
        }
      },
    ]
  },

  
  {
    path: '**',
    redirectTo: 'login'
  }
];

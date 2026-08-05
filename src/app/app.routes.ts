

import { Routes } from '@angular/router';
import { AuthGuard } from './core/guard/auth.guard';
import { LoginGuard } from './core/guard/login.guard';
import { PermissionGuard } from './core/guard/permission.guard';

export const routes: Routes = [

  //  LOGIN AL INICIO
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [LoginGuard]
  },

  // LAYOUT PRINCIPAL (PROTEGIDO)
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

       {
        path: 'compras/mine',
        loadComponent: () =>
          import('./pages/purchase/my-purchases/my-purchases.component')
            .then(m => m.MyPurchasesComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Mis compras',
          requiredPermission: 'purchases.view'
        }
      },
      
      {
        path: 'compras/new',
        loadComponent: () =>
          import('./pages/purchase/create-purchase/purchase-form.component')
            .then(m => m.PurchaseFormComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Compras',
          requiredPermission: 'purchases.new'
        }
      },

      {
        path: 'compras/edit/:id',
        loadComponent: () =>
             import('./pages/purchase/create-purchase/purchase-form.component')
            .then(m => m.PurchaseFormComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Editar compra',
          requiredPermission: 'purchases.edit'
        }
      },

        {
        path: 'compras/pagos',
        loadComponent: () =>
          import('./pages/purchase-payments/purchase-payment-page.component')
            .then(m => m.PurchasePaymentPageComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Registrar pago',
          requiredPermission: 'purchase-payments.create'
        }
      },

       {
        path: 'compras/bitacora-pagos',
        loadComponent: () =>
          import('./pages/purchase-payments-history/purchase-payment-history-page.component')
            .then(m => m.PurchasePaymentHistoryPageComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Bitácora de pagos',
          requiredPermission: 'purchase-payments-history.view'
        }
      },

      {
        path: 'compras/recurrentes',
        loadComponent: () =>
          import('./pages/purchase/purchase-recurrences/purchase-recurrences-page.component')
            .then(m => m.PurchaseRecurrencesPageComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Compras recurrentes',
          requiredPermission: 'purchase-recurrences.view'
        }
      },


      {
        path: 'reports/pnl/payroll',
        loadComponent: () =>
          import('./pages/reports/pnl-payroll-monthly-page/pnl-payroll-monthly-page.component')
            .then(m => m.PnlPayrollMonthlyPageComponent),
        canActivate: [PermissionGuard],
        data: {
          permission: 'reports.pnl.payroll.manage',
          title: 'Cargar nomina mensual'
        }
      },
       {
        path: 'reports/pnl/expenses',
        loadComponent: () =>
          import('./pages/reports/pnl-expense-report-page/pnl-expense-report-page.component')
            .then(m => m.PnlExpenseReportPageComponent),
        canActivate: [PermissionGuard],
        data: {
          permission: 'reports.pnl.generate',
          title: 'Generar reporte de gastos'
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
      // C A T Á L O G O S
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
      {
        path: 'catalogs/family',
        loadComponent: () =>
          import('./pages/Catalogs/family/family.component')
            .then(m => m.FamilyComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Familias',
          requiredPermission: 'family.view'
        }
      },
      {
        path: 'catalogs/suppliers',
        loadComponent: () =>
          import('./pages/Catalogs/suppliers/suppliers.component')
            .then(m => m.SuppliersComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'Proveedores',
          requiredPermission: 'suppliers.view'
        }
      },

    ]
  },

  
  {
    path: '**',
    redirectTo: 'login'
  }
];

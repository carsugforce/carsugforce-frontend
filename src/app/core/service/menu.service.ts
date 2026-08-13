import { Injectable } from '@angular/core';
import { MenuItem } from '../models/menu-item.model';
@Injectable({ providedIn: 'root' })
export class MenuService {
  //Menú base (MENU)
  private baseMenu: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'space_dashboard',
      route: '/dashboard',
      permissions: ['dashboard.view'],
    },
    {
      label: 'PECAL',
      icon: 'inventory_2',
      permissions: ['pecal.view'],
      children: [
        {
          label: 'Nueva orden',
          icon: 'add_shopping_cart',
          route: '/pecal/new-order',
          permissions: ['pecal.create'],
        },
        {
          label: 'Mis ordenes',
          icon: 'receipt_long',
          route: '/pecal/my-orders',
          permissions: ['pecal.create'],
        },
        {
          label: 'Ordenes Almacen',
          icon: 'factory',
          route: '/pecal/warehouse-pecal',
          permissions: ['pecal.dispatch'],
        },
      ],
    },

    {
      label: 'Compras',
      icon: 'shopping_cart',
      permissions: ['purchases.view'],
      children: [
        {
          label: 'Nueva compra',
          icon: 'add',
          route: '/compras/new',
          permissions: ['purchases.new'],
        },
        {
          label: 'Mis compras',
          icon: 'receipt_long',
          route: '/compras/mine',
          permissions: ['purchases.view'],
        },

        {
          label: 'Compras recurrentes',
          icon: 'schedule',
          route: '/compras/recurrentes',
          permissions: ['purchase-recurrences.view'],
        },

        {
          label: 'Registrar pago',
          icon: 'price_check',
          route: '/compras/pagos',
          permissions: ['purchase-payments.create'],
        },
        {
          label: 'Bitácora  de pagos',
          icon: 'history',
          route: '/compras/bitacora-pagos',
          permissions: ['purchase-payments-history.view'],
        },
        {
          label: 'Cargar nomina mensual',
          icon: 'calendar_month',
          route: '/reports/pnl/payroll',
          permissions: ['reports.pnl.payroll.manage'],
        },
      ],
    },

    {
      label: 'Ventas',
      icon: 'point_of_sale',
      permissions: ['sales.view', 'sales.database.view'],
      children: [
        {
          label: 'Captura de ventas',
          icon: 'edit_note',
          route: '/ventas',
          permissions: ['sales.view'],
        },
        {
          label: 'Base de datos',
          icon: 'storage',
          route: '/ventas/database',
          permissions: ['sales.database.view'],
        },
      ],
    },

    {
      label: 'Contabilidad',
      icon: 'analytics',
      permissions: ['reports.pnl.view'],
      children: [
        {
          label: 'Generar reporte de P&L',
          icon: 'analytics',
          route: '/reports/pnl/expenses',
          permissions: ['reports.pnl.generate'],
        },
      ],
    },

    {
      label: 'Catálogos',
      icon: 'menu_book',
      permissions: ['catalog.view'],
      children: [
        {
          label: 'Lineas',
          icon: 'schema',
          route: 'catalogs/lines',
          permissions: ['lines.view'],
        },
        {
          label: 'Productos',
          icon: 'inventory',
          route: 'catalogs/products',
          permissions: ['product.view'],
        },
        {
          label: 'Familias',
          icon: 'extension',
          route: 'catalogs/family',
          permissions: ['family.view'],
        },
        {
          label: 'Proveedores',
          icon: 'local_shipping',
          route: 'catalogs/suppliers',
          permissions: ['suppliers.view'],
        },
      ],
    },
    {
      label: 'Configuración',
      icon: 'settings',
      permissions: ['roles.view', 'permissions.view', 'config.manage'],
      children: [
        {
          label: 'Usuarios',
          icon: 'group',
          route: '/usuarios',
          permissions: ['users.view'],
        },
        {
          label: 'Roles',
          icon: 'admin_panel_settings',
          route: '/config/roles',
          permissions: ['roles.view'],
        },
      ],
    },
  ];

  constructor() {}

  getMenu(userPermissions: string[]): MenuItem[] {
    return this.baseMenu
      .map((item) => {
        // ITEM SIN HIJOS
        if (!item.children) {
          const visible = item.permissions.some((p) =>
            userPermissions.includes(p),
          );
          return visible ? item : null;
        }

        // ITEM CON HIJOS → check uno por uno
        const visibleChildren = item.children.filter((child) =>
          child.permissions.some((p) => userPermissions.includes(p)),
        );

        // Si el padre tiene hijos visibles → mostrar padre + hijos visibles
        if (visibleChildren.length > 0) {
          return { ...item, children: visibleChildren };
        }

        // Si el padre tiene permisos aunque no tenga hijos visibles
        const parentVisible = item.permissions.some((p) =>
          userPermissions.includes(p),
        );
        return parentVisible ? { ...item, children: [] } : null;
      })
      .filter((m): m is MenuItem => m !== null);
  }
}

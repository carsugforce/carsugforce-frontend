export interface PermissionCategory {
  id: number;
  key: string;
  label: string;
  icon: string;
  route?: string | null;
  parentId?: number | null;
  permissions: string[]; // 👈 SOLO KEYS
}

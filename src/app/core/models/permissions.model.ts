import { PermissionCategory } from "./permission-category.model";

export interface Permission {
  id: number;
  key: string;
  label: string;     
  enabled: boolean;
  categoryId?: number; 
}
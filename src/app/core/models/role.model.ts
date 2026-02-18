import { Permission } from "./permissions.model";

export interface Role {
  id: number;
  name: string;
  permissions: number[]; // PERMISOS COMPLETOS
}

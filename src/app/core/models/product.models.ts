export interface Product {
  id: number;

  code: string;
  description: string;

  barras: string | null;

  lineId: number;
  lineName: string;

  type: string;
  unit: string;

  pesable: string | null;

  min: number;
  max: number;

  isVisibleInPecal: boolean;

  family: string | null;

  costo: number | null;
  precio: number | null;

  partida: string | null;
  criterio: string | null;
  clase: string | null;
  tipoEgreso: string | null;

  lastUnitPrice: number;
  price: number;

  isActive: boolean;
}

export interface ProductImportRow {
  code: string;
  description: string;

  barras: string;

  lineName: string;

  type: string;
  unit: string;

  pesable: string;

  min: number;
  max: number;

  visibility: number;

  family: string;

  costo: number;
  precio: number;

  partida: string;
  criterio: string;
  clase: string;
  tipoEgreso: string;
}

export interface ProductImportResponse {
  success: boolean;

  importedProducts: number;
  activeProducts: number;

  created: number;
  updated: number;

  visibleInPecal: number;
  hiddenInPecal: number;
}

export interface CreateProductRequest {
  code: string;
  description: string;
  lineId: number;
  type: string;
  unit: string;
  min: number;
  max: number;
}

export interface UpdateProductRequest {
  description: string;
  lineId: number;
  type: string;
  unit: string;
  min: number;
  max: number;
}
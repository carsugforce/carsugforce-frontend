export interface Product {
  id: number;
  code: string;
  description: string;

  lineId: any | null;
  lineName: string;

  type: string;
  unit: string;

  min: number;
  max: number;
}

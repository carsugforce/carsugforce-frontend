export interface Suppliers {
  id: number;
  rfc: string;
  name: string;
  vialidad: string;
  street: string;
  externalNumber: string;
  internalNumber: string;
  neighborhood: string;
  zipCode: string;
  municipality: string;
  state: string;
  phone: string;
  email: string;
  paymentCondition: string;
  fiscalRegime: string;
  paymentForm: string;
  cfdiUse: string;
  paymentMethod: string;
  creditDays: number;
  isActive?: boolean;
}
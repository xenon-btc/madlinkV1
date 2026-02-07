export interface Intervention {
  id: string;
  clientNumber: string;
  type: InterventionType;
  date: Date;
  
  amount: number;
  comment: string;
  photos: string[];
}

export interface InterventionType {
  id: string;
  name: string;
  price: number;
}

export interface Expense {
  id: string;
  date: Date;
  amount: number;
  category: string;
  description: string;
}
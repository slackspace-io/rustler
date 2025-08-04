// Types for our data models
export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  account_type: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  source_account_id: string;
  destination_account_id?: string;
  payee_name?: string;
  description: string;
  amount: number;
  category: string;
  transaction_date: string;
  budget_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  name: string;
  description?: string;
  amount: number;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

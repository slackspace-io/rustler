// API base URL
const API_BASE_URL = '/api';

// Types for our data models
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
  created_at: string;
  updated_at: string;
}

// API functions for accounts
export const accountsApi = {
  // Get all accounts
  getAccounts: async (): Promise<Account[]> => {
    const response = await fetch(`${API_BASE_URL}/accounts`);
    if (!response.ok) {
      throw new Error('Failed to fetch accounts');
    }
    return response.json();
  },

  // Get a single account by ID
  getAccount: async (id: string): Promise<Account> => {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch account with ID ${id}`);
    }
    return response.json();
  },

  // Create a new account
  createAccount: async (account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<Account> => {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(account),
    });
    if (!response.ok) {
      throw new Error('Failed to create account');
    }
    return response.json();
  },

  // Update an existing account
  updateAccount: async (id: string, account: Partial<Account>): Promise<Account> => {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(account),
    });
    if (!response.ok) {
      throw new Error(`Failed to update account with ID ${id}`);
    }
    return response.json();
  },

  // Delete an account
  deleteAccount: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete account with ID ${id}`);
    }
  },
};

// API functions for transactions
export const transactionsApi = {
  // Get all transactions
  getTransactions: async (): Promise<Transaction[]> => {
    const response = await fetch(`${API_BASE_URL}/transactions`);
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    return response.json();
  },

  // Get transactions for a specific account
  getAccountTransactions: async (accountId: string): Promise<Transaction[]> => {
    const response = await fetch(`${API_BASE_URL}/accounts/${accountId}/transactions`);
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions for account with ID ${accountId}`);
    }
    return response.json();
  },

  // Get a single transaction by ID
  getTransaction: async (id: string): Promise<Transaction> => {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction with ID ${id}`);
    }
    return response.json();
  },

  // Create a new transaction
  createTransaction: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> => {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    });
    if (!response.ok) {
      throw new Error('Failed to create transaction');
    }
    return response.json();
  },

  // Update an existing transaction
  updateTransaction: async (id: string, transaction: Partial<Transaction>): Promise<Transaction> => {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    });
    if (!response.ok) {
      throw new Error(`Failed to update transaction with ID ${id}`);
    }
    return response.json();
  },

  // Delete a transaction
  deleteTransaction: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete transaction with ID ${id}`);
    }
  },
};

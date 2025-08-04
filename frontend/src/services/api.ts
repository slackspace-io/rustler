// API base URL
const API_BASE_URL = '/api';

// Import types from types.ts
import type { Account, Category, Transaction, Budget } from './types.ts';

// Re-export types for convenience
export type { Account, Category, Transaction, Budget };

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

// API functions for categories
export const categoriesApi = {
  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    return response.json();
  },

  // Get a single category by ID
  getCategory: async (id: string): Promise<Category> => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch category with ID ${id}`);
    }
    return response.json();
  },

  // Create a new category
  createCategory: async (category: { name: string; description?: string }): Promise<Category> => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
    });
    if (!response.ok) {
      throw new Error('Failed to create category');
    }
    return response.json();
  },

  // Update an existing category
  updateCategory: async (id: string, category: { name?: string; description?: string }): Promise<Category> => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
    });
    if (!response.ok) {
      throw new Error(`Failed to update category with ID ${id}`);
    }
    return response.json();
  },

  // Delete a category
  deleteCategory: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete category with ID ${id}`);
    }
  },
};

export const budgetsApi = {
  // Get all budgets
  getBudgets: async (): Promise<Budget[]> => {
    const response = await fetch(`${API_BASE_URL}/budgets`);
    if (!response.ok) {
      throw new Error('Failed to fetch budgets');
    }
    return response.json();
  },

  // Get active budgets
  getActiveBudgets: async (): Promise<Budget[]> => {
    const response = await fetch(`${API_BASE_URL}/budgets/active`);
    if (!response.ok) {
      throw new Error('Failed to fetch active budgets');
    }
    return response.json();
  },

  // Get a single budget by ID
  getBudget: async (id: string): Promise<Budget> => {
    const response = await fetch(`${API_BASE_URL}/budgets/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch budget with ID ${id}`);
    }
    return response.json();
  },

  // Create a new budget
  createBudget: async (budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>): Promise<Budget> => {
    const response = await fetch(`${API_BASE_URL}/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(budget),
    });
    if (!response.ok) {
      throw new Error('Failed to create budget');
    }
    return response.json();
  },

  // Update an existing budget
  updateBudget: async (id: string, budget: Partial<Budget>): Promise<Budget> => {
    const response = await fetch(`${API_BASE_URL}/budgets/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(budget),
    });
    if (!response.ok) {
      throw new Error(`Failed to update budget with ID ${id}`);
    }
    return response.json();
  },

  // Delete a budget
  deleteBudget: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/budgets/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete budget with ID ${id}`);
    }
  },

  // Get the total spent amount for a budget
  getBudgetSpent: async (id: string): Promise<number> => {
    const response = await fetch(`${API_BASE_URL}/budgets/${id}/spent`);
    if (!response.ok) {
      throw new Error(`Failed to fetch spent amount for budget with ID ${id}`);
    }
    return response.json();
  },

  // Get the remaining amount for a budget
  getBudgetRemaining: async (id: string): Promise<number> => {
    const response = await fetch(`${API_BASE_URL}/budgets/${id}/remaining`);
    if (!response.ok) {
      throw new Error(`Failed to fetch remaining amount for budget with ID ${id}`);
    }
    return response.json();
  },
};

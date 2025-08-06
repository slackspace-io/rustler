// API base URL
const API_BASE_URL = '/api';

// Import types from types.ts
import type {
  Account,
  Category,
  Transaction,
  Budget,
  MonthlyBudgetStatus,
  CategorySpending,
  Rule,
  RuleCondition,
  RuleAction,
  ConditionType,
  ActionType,
  FireflyImportOptions,
  ImportResult
} from './types.ts';

// Re-export types for convenience
export type {
  Account,
  Category,
  Transaction,
  Budget,
  MonthlyBudgetStatus,
  CategorySpending,
  Rule,
  RuleCondition,
  RuleAction,
  ConditionType,
  ActionType,
  FireflyImportOptions,
  ImportResult
};

// API functions for accounts
export const accountsApi = {
  // Get all accounts
  getAccounts: async (): Promise<Account[]> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/accounts?${cacheBuster}`);
    if (!response.ok) {
      throw new Error('Failed to fetch accounts');
    }
    return response.json();
  },

  // Get a single account by ID
  getAccount: async (id: string): Promise<Account> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/accounts/${id}?${cacheBuster}`);
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
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/transactions?${cacheBuster}`);
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    return response.json();
  },

  // Get transactions for a specific account
  getAccountTransactions: async (accountId: string): Promise<Transaction[]> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/accounts/${accountId}/transactions?${cacheBuster}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions for account with ID ${accountId}`);
    }
    return response.json();
  },

  // Get a single transaction by ID
  getTransaction: async (id: string): Promise<Transaction> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/transactions/${id}?${cacheBuster}`);
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

  // Import transactions from CSV
  importTransactions: async (importData: {
    account_id: string;
    column_mapping: {
      description: number | null;
      amount: number | null;
      category: number | null;
      destination_name: number | null;
      transaction_date: number | null;
      budget_id: number | null;
    };
    data: string[][];
  }): Promise<{ success: number; failed: number }> => {
    const response = await fetch(`${API_BASE_URL}/accounts/${importData.account_id}/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(importData),
    });
    if (!response.ok) {
      throw new Error('Failed to import transactions');
    }
    return response.json();
  },
};

// API functions for categories
export const categoriesApi = {
  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/categories?${cacheBuster}`);
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    return response.json();
  },

  // Get spending by category
  getCategorySpending: async (startDate?: string, endDate?: string): Promise<CategorySpending[]> => {
    let url = `${API_BASE_URL}/categories/spending`;

    // Add date range parameters if provided
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    // Add a cache-busting parameter to prevent browser caching
    params.append('_t', Date.now().toString());

    const queryString = params.toString();
    url += `?${queryString}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch category spending');
    }
    return response.json();
  },

  // Get a single category by ID
  getCategory: async (id: string): Promise<Category> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/categories/${id}?${cacheBuster}`);
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
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/budgets?${cacheBuster}`);
    if (!response.ok) {
      throw new Error('Failed to fetch budgets');
    }
    return response.json();
  },

  // Get active budgets
  getActiveBudgets: async (): Promise<Budget[]> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/budgets/active?${cacheBuster}`);
    if (!response.ok) {
      throw new Error('Failed to fetch active budgets');
    }
    return response.json();
  },

  // Get monthly budget status
  getMonthlyBudgetStatus: async (year: number, month: number): Promise<MonthlyBudgetStatus> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/budgets/monthly-status?year=${year}&month=${month}&${cacheBuster}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch monthly budget status for ${year}-${month}`);
    }
    return response.json();
  },

  // Get a single budget by ID
  getBudget: async (id: string): Promise<Budget> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/budgets/${id}?${cacheBuster}`);
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
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/budgets/${id}/spent?${cacheBuster}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch spent amount for budget with ID ${id}`);
    }
    return response.json();
  },

  // Get the remaining amount for a budget
  getBudgetRemaining: async (id: string): Promise<number> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/budgets/${id}/remaining?${cacheBuster}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch remaining amount for budget with ID ${id}`);
    }
    return response.json();
  },

  // Get the total spent amount not associated with any budget
  getUnbudgetedSpent: async (): Promise<number> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/budgets/unbudgeted-spent?${cacheBuster}`);
    if (!response.ok) {
      throw new Error('Failed to fetch unbudgeted spent amount');
    }
    return response.json();
  },
};

// API functions for rules
export const rulesApi = {
  // Get all rules
  getRules: async (): Promise<Rule[]> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/rules?${cacheBuster}`);
    if (!response.ok) {
      throw new Error('Failed to fetch rules');
    }
    return response.json();
  },

  // Get a single rule by ID
  getRule: async (id: string): Promise<Rule> => {
    // Add a cache-busting parameter to prevent browser caching
    const cacheBuster = `_t=${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/rules/${id}?${cacheBuster}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch rule with ID ${id}`);
    }
    return response.json();
  },

  // Create a new rule
  createRule: async (rule: {
    name: string;
    description?: string;
    is_active: boolean;
    priority?: number;
    conditions: RuleCondition[];
    actions: RuleAction[];
  }): Promise<Rule> => {
    const response = await fetch(`${API_BASE_URL}/rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rule),
    });
    if (!response.ok) {
      throw new Error('Failed to create rule');
    }
    return response.json();
  },

  // Update an existing rule
  updateRule: async (id: string, rule: {
    name?: string;
    description?: string;
    is_active?: boolean;
    priority?: number;
    conditions?: RuleCondition[];
    actions?: RuleAction[];
  }): Promise<Rule> => {
    const response = await fetch(`${API_BASE_URL}/rules/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rule),
    });
    if (!response.ok) {
      throw new Error(`Failed to update rule with ID ${id}`);
    }
    return response.json();
  },

  // Delete a rule
  deleteRule: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/rules/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete rule with ID ${id}`);
    }
  },

  // Run all active rules on all transactions
  runAllRules: async (): Promise<{ affected_transactions: number; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/rules/run`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to run all rules');
    }
    return response.json();
  },

  // Run a specific rule on all transactions
  runRule: async (id: string): Promise<{ affected_transactions: number; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/rules/${id}/run`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to run rule with ID ${id}`);
    }
    return response.json();
  },
};

// API functions for Firefly III import
export const fireflyImportApi = {
  // Import data from Firefly III
  importFromFirefly: async (options: FireflyImportOptions): Promise<ImportResult> => {
    const response = await fetch(`${API_BASE_URL}/imports/firefly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });
    if (!response.ok) {
      throw new Error('Failed to import from Firefly III');
    }
    return response.json();
  },
};

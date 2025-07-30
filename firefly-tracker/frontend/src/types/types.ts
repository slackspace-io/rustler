// Account type
export interface Account {
  id: string;
  name: string;
  type_name: string;
  currency_code: string;
  current_balance: number;
  active: boolean;
}

// Balance at a specific point in time
export interface Balance {
  date: string;
  amount: number;
}

// Account with its balance history
export interface AccountWithBalances {
  account: Account;
  balances: Balance[];
}

// Response from the accounts endpoint
export interface AccountsResponse {
  accounts: Account[];
}

// Request for the net worth endpoint
export interface NetWorthRequest {
  account_ids: string[];
  start_date?: string;
  end_date?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'auto';
}

// Response from the net worth endpoint
export interface NetWorthResponse {
  accounts: AccountWithBalances[];
  net_worth: Balance[];
}

// Alias for the net worth data
export type NetWorthData = NetWorthResponse;

// Error response
export interface ErrorResponse {
  error: string;
  message: string;
}

// Chart data point
export interface ChartDataPoint {
  x: string; // Date string
  y: number; // Amount
}

// Chart dataset
export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  borderColor: string;
  backgroundColor: string;
  fill: boolean;
}

// Chart data
export interface ChartData {
  datasets: ChartDataset[];
}

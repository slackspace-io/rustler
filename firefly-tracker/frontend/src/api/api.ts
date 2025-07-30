import axios from 'axios';
import {
  Account,
  AccountsResponse,
  NetWorthRequest,
  NetWorthResponse
} from '../types/types';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Format date for API requests (YYYY-MM-DD)
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Fetch all accounts from the API
 */
export const fetchAccounts = async (): Promise<Account[]> => {
  try {
    const response = await api.get<AccountsResponse>('/accounts');
    return response.data.accounts;
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
};

/**
 * Fetch net worth data for selected accounts and date range
 */
export const fetchNetWorth = async (
  accountIds: string[],
  startDate?: Date,
  endDate?: Date
): Promise<NetWorthResponse> => {
  try {
    const request: NetWorthRequest = {
      account_ids: accountIds,
    };

    // Add date range if provided
    if (startDate) {
      request.start_date = formatDate(startDate);
    }

    if (endDate) {
      request.end_date = formatDate(endDate);
    }

    const response = await api.post<NetWorthResponse>('/net-worth', request);
    return response.data;
  } catch (error) {
    console.error('Error fetching net worth data:', error);
    throw error;
  }
};

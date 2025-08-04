// Account type constants
export const ACCOUNT_TYPE = {
  ON_BUDGET: 'On Budget',
  OFF_BUDGET: 'Off Budget',
  EXTERNAL: 'External'
};

// Array of all account types for dropdown menus
export const ACCOUNT_TYPES = [
  ACCOUNT_TYPE.ON_BUDGET,
  ACCOUNT_TYPE.OFF_BUDGET,
  ACCOUNT_TYPE.EXTERNAL
];

// Helper function to get account type display name
export const getAccountTypeDisplayName = (type: string): string => {
  return type;
};

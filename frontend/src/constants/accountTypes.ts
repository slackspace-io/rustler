// Account type constants
export const ACCOUNT_TYPE = {
  ON_BUDGET: 'On Budget',
  OFF_BUDGET: 'Off Budget',
  EXTERNAL: 'External'
};

// Account subtypes
export const ACCOUNT_SUBTYPE = {
  // On Budget subtypes
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
  CREDIT_CARD: 'Credit Card',
  ON_BUDGET_INVESTMENTS: 'Investments',

  // Off Budget subtypes
  LOAN: 'Loan',
  ASSET: 'Asset',
  OFF_BUDGET_INVESTMENTS: 'Investments'
};

// Map of account types to their subtypes
export const ACCOUNT_SUBTYPES = {
  [ACCOUNT_TYPE.ON_BUDGET]: [
    ACCOUNT_SUBTYPE.CHECKING,
    ACCOUNT_SUBTYPE.SAVINGS,
    ACCOUNT_SUBTYPE.CREDIT_CARD,
    ACCOUNT_SUBTYPE.ON_BUDGET_INVESTMENTS
  ],
  [ACCOUNT_TYPE.OFF_BUDGET]: [
    ACCOUNT_SUBTYPE.LOAN,
    ACCOUNT_SUBTYPE.ASSET,
    ACCOUNT_SUBTYPE.OFF_BUDGET_INVESTMENTS
  ],
  [ACCOUNT_TYPE.EXTERNAL]: []
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

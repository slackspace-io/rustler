import type { Settings } from './types';

// Default settings
const DEFAULT_SETTINGS: Settings = {
  numberFormat: 'decimal',
  quickAddFields: {
    sourceAccount: true,
    destinationAccount: true,
    description: true,
    amount: true,
    category: true,
    budget: true,
    date: true,
  },
};

// Local storage key
const SETTINGS_STORAGE_KEY = 'rustler_settings';

/**
 * Get the current settings from localStorage or return defaults
 */
export function getSettings(): Settings {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
    }
  } catch (error) {
    console.error('Error reading settings from localStorage:', error);
  }

  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
}

/**
 * Update specific settings
 */
export function updateSettings(updatedSettings: Partial<Settings>): Settings {
  const currentSettings = getSettings();
  const newSettings = { ...currentSettings, ...updatedSettings };
  saveSettings(newSettings);
  return newSettings;
}

/**
 * Format a number according to the user's preference
 */
export function formatNumber(value: number, decimals: number = 2): string {
  const settings = getSettings();

  if (settings.numberFormat === 'comma') {
    // Use comma as decimal separator and period as thousands separator
    return value.toFixed(decimals).replace('.', ',');
  } else {
    // Use period as decimal separator (default)
    return value.toFixed(decimals);
  }
}

/**
 * Parse a string to a number according to the user's preference
 */
export function parseNumber(value: string): number {
  const settings = getSettings();

  if (settings.numberFormat === 'comma') {
    // Replace comma with period for parsing
    return parseFloat(value.replace(',', '.'));
  } else {
    return parseFloat(value);
  }
}

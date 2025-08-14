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

  // Use Intl.NumberFormat to handle both decimal symbol and thousands grouping
  const locale = settings.numberFormat === 'comma' ? 'de-DE' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    }).format(value);
  } catch {
    // Fallback: manual formatting
    const isComma = settings.numberFormat === 'comma';
    const [intPartRaw, fracPartRaw = ''] = Math.abs(value).toFixed(decimals).split('.');
    // Insert grouping separators
    const groupSep = isComma ? '.' : ',';
    const intPart = intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
    const decSep = isComma ? ',' : '.';
    const sign = value < 0 ? '-' : '';
    return `${sign}${intPart}${decSep}${fracPartRaw}`;
  }
}

/**
 * Parse a string to a number according to the user's preference
 */
export function parseNumber(value: string): number {
  const settings = getSettings();

  const raw = (value || '').trim();
  if (raw === '') return NaN;

  if (settings.numberFormat === 'comma') {
    // Remove thousands separators (.) and replace decimal comma with period
    const normalized = raw.replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(normalized);
  } else {
    // Remove thousands separators (,) keep decimal period
    const normalized = raw.replace(/,/g, '');
    return parseFloat(normalized);
  }
}

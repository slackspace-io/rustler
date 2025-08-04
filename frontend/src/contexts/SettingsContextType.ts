import { createContext } from 'react';
import type { Settings } from '../services/types';

// Define the context type
export interface SettingsContextType {
  settings: Settings;
  updateNumberFormat: (format: 'decimal' | 'comma') => void;
  formatNumber: (value: number, decimals?: number) => string;
  parseNumber: (value: string) => number;
}

// Create the context with a default value
export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

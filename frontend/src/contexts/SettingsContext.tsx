import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { getSettings, updateSettings, formatNumber, parseNumber } from '../services/settings';
import type { Settings } from '../services/types';
import { SettingsContext } from './SettingsContextType';
import type { SettingsContextType } from './SettingsContextType';

// Provider props
interface SettingsProviderProps {
  children: ReactNode;
}

// Provider component
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(getSettings());

  // Update settings when the number format changes
  const updateNumberFormat = (format: 'decimal' | 'comma') => {
    const updatedSettings = updateSettings({ numberFormat: format });
    setSettings(updatedSettings);
  };

  // Format a number according to the current settings
  const formatNumberWithSettings = (value: number, decimals: number = 2): string => {
    return formatNumber(value, decimals);
  };

  // Parse a string to a number according to the current settings
  const parseNumberWithSettings = (value: string): number => {
    return parseNumber(value);
  };

  // The context value
  const contextValue: SettingsContextType = {
    settings,
    updateNumberFormat,
    formatNumber: formatNumberWithSettings,
    parseNumber: parseNumberWithSettings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};


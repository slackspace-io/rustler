import { useContext } from 'react';
import { SettingsContext } from './SettingsContextType';
import type { SettingsContextType } from './SettingsContextType';

// Custom hook to use the settings context
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

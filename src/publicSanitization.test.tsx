import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./context/AppContext', () => ({
  useApp: () => ({
    theme: 'system',
    toggleTheme: vi.fn(),
    unitSystem: 'miles',
    setUnitSystem: vi.fn(),
    currencySymbol: '$',
    setCurrencySymbol: vi.fn(),
    importHistory: [],
    rollbackImportBatch: vi.fn(),
    isLoading: false,
    isExportingBackup: false,
    exportFullBackup: vi.fn(),
    showToast: vi.fn(),
    hasRecognizedDemoData: true,
    isDestructiveDataOperationInProgress: false,
    removeDemoData: vi.fn(),
    resetAllLocalData: vi.fn(),
  }),
}));

import { SettingsScreen } from './components/screens/SettingsScreen';

describe('public settings surface', () => {
  it('renders retained backup and local-data controls', () => {
    const markup = renderToStaticMarkup(<SettingsScreen />);

    expect(markup).toContain('Full Application Backup');
    expect(markup).toContain('Remove demo data');
    expect(markup).toContain('Reset all local data');
  });
});

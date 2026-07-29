import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedAppState = vi.hoisted(() => ({
  current: {
    currentScreen: 'dashboard',
    initializationError: null as string | null,
    isLoading: true,
    vehicles: [] as unknown[],
    addVehicle: vi.fn(),
    restoreFullBackupFromOnboarding: vi.fn(),
    isFullBackupRestoreInProgress: false,
    loadDemoDataFromOnboarding: vi.fn(),
    isDestructiveDataOperationInProgress: false,
  },
}));

vi.mock('./context/AppContext', () => ({
  AppProvider: ({ children }: { children: unknown }) => children,
  useApp: () => mockedAppState.current,
}));

import {
  loadProjectBlueprintScreen,
  loadSettingsScreen,
  MainContent,
  ScreenLoadingFallback,
} from './App';

describe('application startup gate', () => {
  beforeEach(() => {
    mockedAppState.current.currentScreen = 'dashboard';
    mockedAppState.current.initializationError = null;
    mockedAppState.current.isLoading = true;
    mockedAppState.current.vehicles = [];
    mockedAppState.current.addVehicle.mockReset();
  });

  it('renders the loading gate before IndexedDB initialization completes', () => {
    const markup = renderToStaticMarkup(<MainContent />);

    expect(markup).toContain('Loading your garage');
    expect(markup).not.toContain('Fleet Dashboard');
    expect(markup).not.toContain('Add first vehicle');
  });

  it('renders onboarding after an empty database finishes loading', () => {
    mockedAppState.current.isLoading = false;

    const markup = renderToStaticMarkup(<MainContent />);

    expect(markup).toContain('Welcome to AutoLog');
    expect(markup).toContain('Add first vehicle');
    expect(markup).toContain('Import AutoLog backup');
    expect(markup).toContain('Restore a validated full JSON backup.');
    expect(markup).toContain('Load demo data');
    expect(markup).toContain('Explore a small, fictional vehicle history.');
    expect(markup).not.toContain('Confirm and load demo');
  });

  it('does not render the normal shell when no vehicle exists', () => {
    mockedAppState.current.isLoading = false;

    const markup = renderToStaticMarkup(<MainContent />);

    expect(markup).not.toContain('Fleet Dashboard');
    expect(markup).not.toContain('Active Fleet Vehicle');
    expect(markup).not.toContain('<nav');
  });

  it('preserves the fail-closed database initialization error screen', () => {
    mockedAppState.current.isLoading = false;
    mockedAppState.current.initializationError = 'Injected IndexedDB failure';

    const markup = renderToStaticMarkup(<MainContent />);

    expect(markup).toContain('Local database unavailable');
    expect(markup).toContain('Injected IndexedDB failure');
    expect(markup).not.toContain('Welcome to AutoLog');
  });
});

describe('lazy screen boundaries', () => {
  it('renders an accessible loading fallback', () => {
    const markup = renderToStaticMarkup(<ScreenLoadingFallback />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('Loading screen');
  });

  it('loads and renders the Project Blueprint navigation target', async () => {
    const module = await loadProjectBlueprintScreen();
    const markup = renderToStaticMarkup(<module.ProjectBlueprintScreen />);

    expect(markup).toContain('PRODUCT BLUEPRINT');
    expect(markup).toContain('Architecture');
  });

  it('loads the Settings navigation target', async () => {
    const module = await loadSettingsScreen();

    expect(typeof module.SettingsScreen).toBe('function');
  });
});

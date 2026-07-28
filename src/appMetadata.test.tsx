import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { APP_VERSION, APP_VERSION_LABEL } from './appMetadata';
import { Sidebar } from './components/layout/Sidebar';
import { ProjectBlueprintScreen } from './components/screens/ProjectBlueprintScreen';

vi.mock('./context/AppContext', () => ({
  useApp: () => ({
    currentScreen: 'dashboard',
    setCurrentScreen: vi.fn(),
    vehicles: [],
    activeVehicleId: '',
    setActiveVehicleId: vi.fn(),
    activeVehicle: undefined,
    theme: 'light',
    toggleTheme: vi.fn(),
    issues: [],
    records: [],
  }),
}));

describe('application version metadata', () => {
  it('matches the authoritative package.json version', () => {
    const packageMetadata = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    ) as { version: string };

    expect(APP_VERSION).toBe(packageMetadata.version);
    expect(APP_VERSION).toBe('0.9.1-personal');
  });

  it('uses the injected version in application UI labels', () => {
    const sidebarMarkup = renderToStaticMarkup(<Sidebar />);
    const blueprintMarkup = renderToStaticMarkup(<ProjectBlueprintScreen />);

    expect(sidebarMarkup).toContain(APP_VERSION_LABEL);
    expect(sidebarMarkup).toContain('AutoLog v0.9.1-personal');
    expect(blueprintMarkup).toContain(`${APP_VERSION_LABEL} Architecture`);
    expect(blueprintMarkup).toContain('AutoLog v0.9.1-personal Architecture');
  });
});

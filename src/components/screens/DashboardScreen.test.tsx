import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useApp } from '../../context/AppContext';
import {
  TEST_ISSUES,
  TEST_MAINTENANCE_TASKS,
  TEST_RECORDS,
  TEST_VEHICLES,
} from '../../test/fixtures';
import { DashboardScreen } from './DashboardScreen';

vi.mock('../../context/AppContext', () => ({
  useApp: vi.fn(),
}));

describe('Dashboard active-vehicle theme surface', () => {
  it('uses light tokens while retaining the existing dark overrides', () => {
    vi.mocked(useApp).mockReturnValue({
      activeVehicle: TEST_VEHICLES[0],
      records: TEST_RECORDS,
      issues: TEST_ISSUES,
      maintenanceTasks: TEST_MAINTENANCE_TASKS,
      setCurrentScreen: vi.fn(),
      currencySymbol: '$',
    } as unknown as ReturnType<typeof useApp>);

    const markup = renderToStaticMarkup(<DashboardScreen />);
    const heroClasses =
      markup.match(
        /<div class="([^"]*dashboard-vehicle-card[^"]*)"/
      )?.[1].split(/\s+/) || [];
    const stylesheet = readFileSync(
      new URL('../../index.css', import.meta.url),
      'utf8'
    );

    expect(heroClasses).toContain('dashboard-vehicle-card');
    expect(heroClasses).not.toContain('bg-slate-900');
    expect(heroClasses).not.toContain('text-white');
    expect(heroClasses).not.toContain('border-slate-800');
    expect(heroClasses).toContain('dark:bg-slate-900');
    expect(heroClasses).toContain('dark:text-white');
    expect(heroClasses).toContain('dark:border-slate-800');

    expect(stylesheet).toMatch(
      /:where\(\.dashboard-vehicle-card\)\s*\{[\s\S]*?background: var\(--color-surface\)/
    );
    expect(stylesheet).toMatch(
      /:where\(\.dashboard-vehicle-meta, \.dashboard-vehicle-mileage\)\s*\{[\s\S]*?background: var\(--color-surface-raised\)/
    );
    expect(stylesheet).toMatch(
      /:where\(\.dashboard-vehicle-secondary, \.dashboard-vehicle-label\)\s*\{[\s\S]*?color: var\(--color-text-secondary\)/
    );

    expect(markup).toContain('Current Mileage');
    expect(markup).toContain('VIN: TESTVIN0000000001');
    expect(markup).toContain('Oil Spec');
    expect(markup).toContain('0W-20');
  });
});

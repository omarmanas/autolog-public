import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useApp } from '../../context/AppContext';
import { TEST_VEHICLES } from '../../test/fixtures';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import {
  ServiceHistoryEmptyState,
  ServiceHistoryScreen,
} from './ServiceHistoryScreen';

vi.mock('../../context/AppContext', () => ({
  useApp: vi.fn(),
}));

describe('ServiceHistoryEmptyState', () => {
  it('renders through EmptyState and preserves the reset action', () => {
    const onResetFilters = vi.fn();
    const view = ServiceHistoryEmptyState({ onResetFilters }) as React.ReactElement<
      React.ComponentProps<typeof EmptyState>
    >;
    const action = view.props.action as React.ReactElement<
      React.ComponentProps<typeof Button>
    >;

    expect(view.type).toBe(EmptyState);
    expect(action.type).toBe(Button);

    action.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);

    expect(onResetFilters).toHaveBeenCalledOnce();
    expect(renderToStaticMarkup(view)).toContain('Reset Filters');
  });
});

describe('ServiceHistoryScreen filters', () => {
  it('provides stable names for every search, sort, and filter control', () => {
    vi.mocked(useApp).mockReturnValue({
      records: [],
      vehicles: TEST_VEHICLES,
      activeVehicleId: TEST_VEHICLES[0].id,
      setActiveVehicleId: vi.fn(),
      setCurrentScreen: vi.fn(),
      deleteRecord: vi.fn(),
      currencySymbol: '$',
      isLoading: false,
    } as unknown as ReturnType<typeof useApp>);

    const markup = renderToStaticMarkup(<ServiceHistoryScreen />);
    const filterControls = Array.from(
      markup.matchAll(
        /<(?:input|select)[^>]*class="([^"]*screen-filter-native-control[^"]*)"/g
      )
    );

    [
      'Search service records',
      'Sort service records',
      'Vehicle',
      'Year',
      'Category',
      'Provider',
      'Status',
      'Confidence grade',
    ].forEach((name) => {
      expect(markup).toContain(`aria-label="${name}"`);
    });
    expect(filterControls).toHaveLength(8);
    filterControls.forEach(([, className]) => {
      expect(className).not.toContain('dark:bg-');
      expect(className).not.toContain('dark:text-');
      expect(className).not.toContain('dark:border-');
    });
  });
});

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../common/Button';
import {
  DisplayAppearanceSettings,
  ImportWizardLoadingFallback,
} from './SettingsScreen';

const getText = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getText).join('');
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getText(node.props.children);
  }

  return '';
};

const findButtons = (node: React.ReactNode): React.ReactElement<
  React.ComponentProps<typeof Button>
>[] => {
  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return Array.isArray(node) ? node.flatMap(findButtons) : [];
  }

  const matches =
    node.type === Button
      ? [
          node as React.ReactElement<React.ComponentProps<typeof Button>>,
        ]
      : [];

  return [...matches, ...findButtons(node.props.children)];
};

describe('DisplayAppearanceSettings', () => {
  it('preserves labels, descriptions, and selected preferences', () => {
    const markup = renderToStaticMarkup(
      <DisplayAppearanceSettings
        theme="system"
        toggleTheme={() => undefined}
        unitSystem="km"
        setUnitSystem={() => undefined}
        currencySymbol="€"
        setCurrencySymbol={() => undefined}
      />
    );

    expect(markup).toContain('Display &amp; Appearance');
    expect(markup).toContain('Color Theme');
    expect(markup).toContain('Toggle between dark and light display modes');
    expect(markup).toContain('Odometer Distance Unit');
    expect(markup).toContain('Choose between miles and kilometers');
    expect(markup).toContain('Currency Symbol');
    expect(markup).toContain(
      'Choose the symbol used for financial displays'
    );
    expect(markup).toContain('system Theme');
    expect(markup).toContain('Kilometers (km)');
    expect(markup).toContain('aria-pressed="true"');
  });

  it('forwards the existing theme, unit, and currency callbacks', () => {
    const toggleTheme = vi.fn();
    const setUnitSystem = vi.fn();
    const setCurrencySymbol = vi.fn();
    const view = DisplayAppearanceSettings({
      theme: 'light',
      toggleTheme,
      unitSystem: 'miles',
      setUnitSystem,
      currencySymbol: '$',
      setCurrencySymbol,
    }) as React.ReactElement;
    const buttons = findButtons(view);

    buttons.find((button) => getText(button) === 'light Theme')?.props.onClick?.(
      {} as React.MouseEvent<HTMLButtonElement>
    );
    buttons
      .find((button) => getText(button) === 'Kilometers (km)')
      ?.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    buttons.find((button) => getText(button) === '£')?.props.onClick?.(
      {} as React.MouseEvent<HTMLButtonElement>
    );

    expect(toggleTheme).toHaveBeenCalledOnce();
    expect(setUnitSystem).toHaveBeenCalledExactlyOnceWith('km');
    expect(setCurrencySymbol).toHaveBeenCalledExactlyOnceWith('£');
  });
});

describe('Import Wizard lazy boundary', () => {
  it('renders an accessible loading fallback', () => {
    const markup = renderToStaticMarkup(<ImportWizardLoadingFallback />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('Loading import wizard');
  });
});

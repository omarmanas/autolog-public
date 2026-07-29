import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync(
  new URL('./index.css', import.meta.url),
  'utf8'
);

describe('graphite cockpit theme contract', () => {
  it('binds dark utilities to the application dark class', () => {
    expect(stylesheet).toContain(
      '@custom-variant dark (&:where(.dark, .dark *));'
    );
  });

  it('retains the established light and dark palettes', () => {
    [
      '--color-canvas: #f6f8fb',
      '--color-surface: #ffffff',
      '--color-surface-raised: #eef2f6',
      '--color-border: #d8dee8',
      '--color-text-primary: #172033',
      '--color-text-secondary: #5b6678',
      '--color-primary: #2563eb',
      '--color-canvas: #0b0f14',
      '--color-surface: #141a22',
      '--color-surface-raised: #1b2430',
      '--color-border: #2a3543',
      '--color-text-primary: #f4f7fb',
      '--color-text-secondary: #aab4c3',
      '--color-primary: #60a5fa',
    ].forEach((declaration) => {
      expect(stylesheet).toContain(declaration);
    });
  });

  it('drives the shell, header, navigation, and shared fields from tokens', () => {
    expect(stylesheet).toMatch(
      /\.app-shell,[\s\S]*?background: var\(--color-canvas\)/
    );
    expect(stylesheet).toMatch(
      /\.app-header \{[\s\S]*?background: var\(--color-surface\)/
    );
    expect(stylesheet).toMatch(
      /\.bottom-navigation,[\s\S]*?var\(--color-surface\)/
    );
    expect(stylesheet).toMatch(
      /\.screen-filter-native-control \{[\s\S]*?background: var\(--color-surface-raised\)/
    );
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const importWizardSource = readFileSync(
  new URL('./components/common/ImportWizardModal.tsx', import.meta.url),
  'utf8'
);
const importParserSource = readFileSync(
  new URL('./utils/importParser.ts', import.meta.url),
  'utf8'
);

describe('production code-splitting boundaries', () => {
  it('loads non-critical screens through dynamic imports', () => {
    expect(appSource).toContain(
      "import('./components/screens/SettingsScreen')"
    );
    expect(appSource).toContain(
      "import('./components/screens/ProjectBlueprintScreen')"
    );
    expect(appSource).toContain('React.lazy');
  });

  it('loads SheetJS only when a supported workbook is parsed', () => {
    expect(importWizardSource).toContain("await import('xlsx')");
    expect(importParserSource).toContain("import type * as SheetJS from 'xlsx'");
    expect(importParserSource).not.toMatch(
      /^import \* as \w+ from ['"]xlsx['"];?$/m
    );
  });
});

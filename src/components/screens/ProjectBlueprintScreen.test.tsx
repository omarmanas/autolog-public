import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProjectBlueprintScreen } from './ProjectBlueprintScreen';

describe('ProjectBlueprintScreen information', () => {
  it('preserves the default data-layer documentation and ordering', () => {
    const markup = renderToStaticMarkup(<ProjectBlueprintScreen />);
    const monetaryValues = markup.indexOf('Monetary Values');
    const isoDates = markup.indexOf('ISO Dates &amp; Miles');
    const completionIntegrity = markup.indexOf('Completion Integrity Rule');

    expect(markup).toContain('AutoLog Architectural Master Blueprint');
    expect(markup).toContain(
      'Data Layer Technical Specification &amp; Rules'
    );
    expect(markup).toContain(
      'ServiceRecord Specifications &amp; Supported Fields'
    );
    expect(markup).toContain('13 Supported ServiceRecord Statuses');
    expect(markup).toContain('5 Confidence Grades (A through E)');
    expect(monetaryValues).toBeGreaterThan(-1);
    expect(isoDates).toBeGreaterThan(monetaryValues);
    expect(completionIntegrity).toBeGreaterThan(isoDates);
  });
});

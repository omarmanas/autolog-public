import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FormControl } from './FormControl';

describe('FormControl', () => {
  it('associates the label, description, and error with the field', () => {
    const markup = renderToStaticMarkup(
      <FormControl
        label="Mileage"
        description="Current odometer reading"
        error="Enter a valid mileage"
        required
      >
        <input name="mileage" />
      </FormControl>
    );

    const controlId = markup.match(/<label[^>]*for="([^"]+)"/)?.[1];
    expect(controlId).toBeTruthy();
    expect(markup).toContain(`id="${controlId}"`);
    expect(markup).toContain('required=""');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain(`${controlId}-description`);
    expect(markup).toContain(`${controlId}-error`);
    expect(markup).toContain('role="alert"');
  });

  it('passes disabled state to the field', () => {
    const markup = renderToStaticMarkup(
      <FormControl label="Currency" disabled>
        <select>
          <option>USD</option>
        </select>
      </FormControl>
    );

    expect(markup).toContain('data-disabled="true"');
    expect(markup).toContain('disabled=""');
  });

  it('preserves a modal field value and associates its accessible label', () => {
    const markup = renderToStaticMarkup(
      <FormControl label="Issue Title / Description *">
        <input value="Brake noise" required readOnly />
      </FormControl>
    );

    const controlId = markup.match(/<label[^>]*for="([^"]+)"/)?.[1];
    expect(controlId).toBeTruthy();
    expect(markup).toContain(`id="${controlId}"`);
    expect(markup).toContain('value="Brake noise"');
    expect(markup).toContain('required=""');
    expect(markup).toContain('Issue Title / Description *');
  });
});

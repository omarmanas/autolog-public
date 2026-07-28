import { describe, expect, it } from 'vitest';
import { createFictionalImportWorkbook } from '../../test/fixtures';
import {
  evaluateReconciliationGate,
  parseImportFile,
} from '../../utils/importParser';
import { checkCanContinueStep2 } from './ImportWizardModal';

describe('ImportWizardModal Step 2 navigation gate', () => {
  const bytes = createFictionalImportWorkbook();
  const validParsedData = parseImportFile(
    bytes.buffer,
    'fictional-maintenance.xlsx',
    'test-import-vehicle'
  );
  const canonicalSelectedSheets: Record<string, boolean> = {
    'Master Service History': true,
    'Active Issues': true,
    'Maintenance Planner': true,
    'Cost Summary': false,
    'Data Gaps & Conflicts': false,
    'Instructions & Legend': false,
  };

  it('allows structurally valid fictional data without fixed counts or IDs', () => {
    expect(validParsedData.records).toHaveLength(4);
    expect(validParsedData.issues).toHaveLength(2);
    expect(validParsedData.maintenanceTasks).toHaveLength(2);
    expect(
      checkCanContinueStep2(validParsedData, canonicalSelectedSheets)
    ).toBe(true);
  });

  it('accepts multiple selected sheets of a canonical type', () => {
    expect(
      checkCanContinueStep2(validParsedData, {
        ...canonicalSelectedSheets,
        'Additional Master Service History': true,
      })
    ).toBe(true);
  });

  it('requires master, issue, and planner selections and rejects references', () => {
    expect(
      checkCanContinueStep2(validParsedData, {
        ...canonicalSelectedSheets,
        'Maintenance Planner': false,
      })
    ).toBe(false);
    expect(
      checkCanContinueStep2(validParsedData, {
        ...canonicalSelectedSheets,
        'Cost Summary': true,
      })
    ).toBe(false);
  });

  it('rejects processing, parser errors, warnings, rejected rows, or no records', () => {
    expect(
      checkCanContinueStep2(validParsedData, canonicalSelectedSheets, true)
    ).toBe(false);
    expect(
      checkCanContinueStep2(
        { ...validParsedData, errors: ['Generic parser error'] },
        canonicalSelectedSheets
      )
    ).toBe(false);
    expect(
      checkCanContinueStep2(
        { ...validParsedData, warnings: ['Generic parser warning'] },
        canonicalSelectedSheets
      )
    ).toBe(false);
    expect(
      checkCanContinueStep2(
        {
          ...validParsedData,
          rejectedRows: [
            { sheetName: 'Master Service History', rowNumber: 5, reason: 'Invalid row' },
          ],
        },
        canonicalSelectedSheets
      )
    ).toBe(false);
    expect(
      checkCanContinueStep2(
        { ...validParsedData, records: [] },
        canonicalSelectedSheets
      )
    ).toBe(false);
  });

  it('requires every imported service record to originate from a master sheet', () => {
    const records = structuredClone(validParsedData.records);
    records[0].sourceSheet = 'Active Issues';

    expect(
      checkCanContinueStep2(
        { ...validParsedData, records },
        canonicalSelectedSheets
      )
    ).toBe(false);
  });

  it('keeps the final commit gate fail-closed for generic reconciliation errors', () => {
    const withError = {
      ...validParsedData,
      reconciliationErrors: ['Generic declared total does not match calculated total.'],
    };
    const gate = evaluateReconciliationGate(withError);

    expect(
      checkCanContinueStep2(withError, canonicalSelectedSheets)
    ).toBe(true);
    expect(gate.canCommit).toBe(false);
    expect(gate.blockingReasons).toContain(
      'Generic declared total does not match calculated total.'
    );
  });
});

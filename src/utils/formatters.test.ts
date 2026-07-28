import { describe, it, expect } from 'vitest';
import { formatMileage, getProviderDisplayName, getVehicleDisplayName } from './formatters';
import { ActiveIssue, ServiceRecord } from '../types';

describe('formatMileage rendering tests', () => {
  it('An Active Issue with reportedMileage: undefined displays the neutral fallback and does not crash', () => {
    const issue: ActiveIssue = {
      id: 'iss-test-1',
      vehicleId: 'veh-123',
      title: 'Diagnostic Test Issue',
      description: 'Check engine light',
      severity: 'Low',
      status: 'Open',
      reportedDate: '2024-02-01',
      reportedMileage: undefined,
      tags: [],
    };

    const cloneBefore = JSON.stringify(issue);
    const result = formatMileage(issue.reportedMileage, 'Not documented');
    expect(result).toBe('Not documented');

    // Prove rendering / formatting does not mutate the supplied object
    expect(JSON.stringify(issue)).toBe(cloneBefore);
    expect(issue.reportedMileage).toBeUndefined();
  });

  it('A Service Record with undefined mileage displays the neutral fallback and does not crash', () => {
    const record: ServiceRecord = {
      id: 'rec-test-1',
      vehicleId: 'veh-123',
      title: 'Transmission Check',
      category: 'Diagnostic',
      status: 'Completed',
      confidenceGrade: 'A',
      date: '2024-01-15',
      datePrecision: 'Exact',
      mileageIn: undefined,
      mileage: undefined,
      mileagePrecision: 'Unknown',
      provider: 'Test Provider',
      workPerformed: 'Transmission diagnostic',
      partsReplaced: [],
      fluidsAndMaterials: [],
      laborCost: 0,
      partsCost: 0,
      fees: 0,
      tax: 0,
      processingFee: 0,
      discount: 0,
      dealerCredit: 0,
      finalInvoiceTotal: 0,
      actualDocumentedPayment: 0,
      sourceType: 'UserEntry',
      verificationNeeded: false,
    };

    const cloneBefore = JSON.stringify(record);
    const result = formatMileage(record.mileageIn ?? record.mileage, 'Not documented');
    expect(result).toBe('Not documented');

    // Prove rendering / formatting does not mutate the supplied object
    expect(JSON.stringify(record)).toBe(cloneBefore);
    expect(record.mileageIn).toBeUndefined();
    expect(record.mileage).toBeUndefined();
  });

  it('Numeric mileage 0 displays as zero and is not treated as missing', () => {
    expect(formatMileage(0)).toBe('0 mi');
    expect(formatMileage(0, 'Not documented', false)).toBe('0');

    const issueWithZeroMileage: ActiveIssue = {
      id: 'iss-test-zero',
      vehicleId: 'veh-123',
      title: 'Delivery Inspection',
      description: 'Initial delivery inspection',
      severity: 'Low',
      status: 'Open',
      reportedDate: '2024-01-01',
      reportedMileage: 0,
      tags: [],
    };

    const cloneBefore = JSON.stringify(issueWithZeroMileage);
    const formatted = formatMileage(issueWithZeroMileage.reportedMileage, 'Not documented');
    expect(formatted).toBe('0 mi');
    expect(JSON.stringify(issueWithZeroMileage)).toBe(cloneBefore);
  });

  it('A valid numeric mileage remains locale-formatted', () => {
    expect(formatMileage(1234567)).toBe('1,234,567 mi');
    expect(formatMileage(45000, 'Not documented', false)).toBe('45,000');

    const recordWithMileage: ServiceRecord = {
      id: 'rec-test-valid',
      vehicleId: 'veh-123',
      title: 'Oil Change',
      category: 'Maintenance',
      status: 'Completed',
      confidenceGrade: 'A',
      date: '2024-03-10',
      datePrecision: 'Exact',
      mileageIn: 85420,
      mileagePrecision: 'Exact',
      provider: 'Test Provider',
      workPerformed: 'Oil change',
      partsReplaced: [],
      fluidsAndMaterials: [],
      laborCost: 0,
      partsCost: 0,
      fees: 0,
      tax: 0,
      processingFee: 0,
      discount: 0,
      dealerCredit: 0,
      finalInvoiceTotal: 0,
      actualDocumentedPayment: 0,
      sourceType: 'UserEntry',
      verificationNeeded: false,
    };

    const formatted = formatMileage(recordWithMileage.mileageIn ?? recordWithMileage.mileage, 'Not documented');
    expect(formatted).toBe('85,420 mi');
  });

  it('Handles null values correctly by displaying neutral fallback', () => {
    expect(formatMileage(null)).toBe('Not documented');
    expect(formatMileage(null, 'N/A')).toBe('N/A');
  });
});

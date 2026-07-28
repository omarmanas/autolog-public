import { describe, expect, it } from 'vitest';
import {
  TEST_ORPHAN_VEHICLE_ID,
  TEST_PRIMARY_VEHICLE_ID,
  TEST_RECORDS,
  TEST_VEHICLES,
} from '../test/fixtures';
import { calculateCostAnalytics } from './costAnalytics';

describe('vehicle scope and metric contracts', () => {
  it('scopes active-vehicle and all-vehicle record counts independently', () => {
    const activeRecords = TEST_RECORDS.filter(
      (record) => record.vehicleId === TEST_PRIMARY_VEHICLE_ID
    );
    const allRecords = TEST_RECORDS.filter(
      (record) =>
        record.vehicleId === TEST_PRIMARY_VEHICLE_ID ||
        record.vehicleId === TEST_VEHICLES[1].id
    );

    expect(activeRecords).toHaveLength(2);
    expect(allRecords).toHaveLength(3);
  });

  it('excludes orphan records from registered-fleet analytics', () => {
    const metrics = calculateCostAnalytics(TEST_RECORDS, TEST_VEHICLES, 'ALL');

    expect(metrics.targetRecordsCount).toBe(3);
    expect(metrics.totalSpent).toBe(90);
    expect(metrics.selectedMileage).toBe(75000);
    expect(metrics.costPerMile).toBe((90 / 75000).toFixed(3));
  });

  it('uses the same registered scope for spend, category, year, and count', () => {
    const fleetMetrics = calculateCostAnalytics(TEST_RECORDS, TEST_VEHICLES, 'ALL');
    const registeredRecords = TEST_RECORDS.filter(
      (record) => record.vehicleId !== TEST_ORPHAN_VEHICLE_ID
    );
    const expectedMetrics = calculateCostAnalytics(
      registeredRecords,
      TEST_VEHICLES,
      'ALL'
    );

    expect(fleetMetrics).toEqual(expectedMetrics);
  });

  it('preserves totalCost precedence for spend, category, and annual totals', () => {
    const record = {
      ...TEST_RECORDS[0],
      totalCost: 10,
      actualDocumentedPayment: 20,
      finalInvoiceTotal: 30,
    };
    const metrics = calculateCostAnalytics([record], TEST_VEHICLES, 'ALL');
    const year = record.serviceDate?.split('-')[0] || 'Unknown Year';

    expect(metrics.totalSpent).toBe(10);
    expect(metrics.categoryTotals[record.category]).toBe(10);
    expect(metrics.yearTotals[year]).toBe(10);
  });

  it('leaves active-vehicle analytics unchanged by orphan records', () => {
    const withOrphan = calculateCostAnalytics(
      TEST_RECORDS,
      TEST_VEHICLES,
      TEST_PRIMARY_VEHICLE_ID
    );
    const withoutOrphan = calculateCostAnalytics(
      TEST_RECORDS.filter(
        (record) => record.vehicleId !== TEST_ORPHAN_VEHICLE_ID
      ),
      TEST_VEHICLES,
      TEST_PRIMARY_VEHICLE_ID
    );

    expect(withOrphan).toEqual(withoutOrphan);
  });

  it('does not mutate source arrays or persisted objects', () => {
    const recordsBefore = structuredClone(TEST_RECORDS);
    const vehiclesBefore = structuredClone(TEST_VEHICLES);

    calculateCostAnalytics(TEST_RECORDS, TEST_VEHICLES, 'ALL');
    calculateCostAnalytics(
      TEST_RECORDS,
      TEST_VEHICLES,
      TEST_PRIMARY_VEHICLE_ID
    );

    expect(TEST_RECORDS).toEqual(recordsBefore);
    expect(TEST_VEHICLES).toEqual(vehiclesBefore);
  });
});

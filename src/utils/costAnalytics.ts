import { ServiceRecord, Vehicle } from '../types';

const getRecordCost = (record: ServiceRecord): number =>
  record.totalCost ?? record.actualDocumentedPayment ?? record.finalInvoiceTotal ?? 0;

export const calculateCostAnalytics = (
  records: readonly ServiceRecord[],
  vehicles: readonly Vehicle[],
  selectedVehicleId: string
) => {
  const registeredVehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const targetRecords =
    selectedVehicleId === 'ALL'
      ? records.filter((record) => registeredVehicleIds.has(record.vehicleId))
      : records.filter((record) => record.vehicleId === selectedVehicleId);

  const actualSpendRecords = targetRecords.filter((record) => {
    const status = record.status;
    return (
      status !== 'Declined' &&
      status !== 'Recommended' &&
      status !== 'Deferred' &&
      status !== 'Planned' &&
      status !== 'Monitoring'
    );
  });

  const totalSpent = actualSpendRecords.reduce(
    (total, record) => total + getRecordCost(record),
    0
  );
  const totalParts = actualSpendRecords.reduce(
    (total, record) => total + (record.partsCost || 0),
    0
  );
  const totalLabor = actualSpendRecords.reduce(
    (total, record) => total + (record.laborCost || 0),
    0
  );
  const totalFeesAndTax = actualSpendRecords.reduce(
    (total, record) =>
      total +
      (record.fees || 0) +
      (record.tax || 0) +
      (record.processingFee || 0),
    0
  );

  const selectedMileage =
    selectedVehicleId === 'ALL'
      ? vehicles
          .filter((vehicle) => registeredVehicleIds.has(vehicle.id))
          .reduce((total, vehicle) => total + (vehicle.currentMileage || 0), 0)
      : vehicles.find((vehicle) => vehicle.id === selectedVehicleId)?.currentMileage || 0;
  const scopeMileage = Math.max(1, selectedMileage);

  const categoryTotals: Record<string, number> = {};
  const yearTotals: Record<string, number> = {};

  actualSpendRecords.forEach((record) => {
    const cost = getRecordCost(record);
    const category = record.category || 'General';
    const date = record.serviceDate || record.date || '';
    const year = date.split('-')[0] || 'Unknown Year';

    categoryTotals[category] = (categoryTotals[category] || 0) + cost;
    yearTotals[year] = (yearTotals[year] || 0) + cost;
  });

  return {
    targetRecordsCount: targetRecords.length,
    actualSpendRecordsCount: actualSpendRecords.length,
    totalSpent,
    totalParts,
    totalLabor,
    totalFeesAndTax,
    selectedMileage,
    costPerMile: totalSpent > 0 ? (totalSpent / scopeMileage).toFixed(3) : '0.000',
    categoryTotals,
    yearTotals,
  };
};

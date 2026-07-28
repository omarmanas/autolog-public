import { Vehicle } from '../types';

export type StartupView = 'loading' | 'error' | 'onboarding' | 'application';

export function resolveStartupView(
  isLoading: boolean,
  initializationError: string | null,
  vehicleCount: number
): StartupView {
  if (initializationError) return 'error';
  if (isLoading) return 'loading';
  return vehicleCount === 0 ? 'onboarding' : 'application';
}

export function resolveActiveVehicle(
  vehicles: readonly Vehicle[],
  activeVehicleId: string | null
): Vehicle | null {
  return (
    vehicles.find((vehicle) => vehicle.id === activeVehicleId) ||
    vehicles[0] ||
    null
  );
}

export async function persistFirstVehicle(
  persist: () => Promise<void>,
  commit: () => void
): Promise<void> {
  await persist();
  commit();
}

export interface SubmissionLock {
  run(operation: () => Promise<void>): Promise<boolean>;
}

export function createSubmissionLock(): SubmissionLock {
  let isActive = false;

  return {
    async run(operation: () => Promise<void>): Promise<boolean> {
      if (isActive) return false;
      isActive = true;
      try {
        await operation();
        return true;
      } finally {
        isActive = false;
      }
    },
  };
}

export type FirstVehicleData = Omit<Vehicle, 'id'>;

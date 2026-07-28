import { describe, expect, it, vi } from 'vitest';
import {
  createSubmissionLock,
  persistFirstVehicle,
  resolveActiveVehicle,
  resolveStartupView,
} from './startupFlow';
import { Vehicle } from '../types';

function deferredPromise(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('clean-start view selection', () => {
  it('keeps the loading gate active until initialization completes', () => {
    expect(resolveStartupView(true, null, 0)).toBe('loading');
    expect(resolveStartupView(false, null, 0)).toBe('onboarding');
  });

  it('shows onboarding only for an initialized zero-vehicle database', () => {
    expect(resolveStartupView(false, null, 0)).toBe('onboarding');
    expect(resolveStartupView(false, null, 1)).toBe('application');
  });

  it('keeps database initialization failures fail-closed', () => {
    expect(resolveStartupView(false, 'IndexedDB failed', 0)).toBe('error');
    expect(resolveStartupView(true, 'IndexedDB failed', 0)).toBe('error');
  });
});

describe('active vehicle resolution', () => {
  const vehicle: Vehicle = {
    id: 'veh-first',
    make: 'Test',
    model: 'One',
    year: 2024,
    trim: '',
    vin: '',
    licensePlate: '',
    currentMileage: 0,
    engine: '',
    transmission: '',
    fuelType: '',
    color: '',
    oilSpecification: '',
    tireSize: '',
  };
  const secondVehicle: Vehicle = {
    ...vehicle,
    id: 'veh-second',
    model: 'Two',
  };

  it('returns null instead of sample data when no vehicles exist', () => {
    expect(resolveActiveVehicle([], null)).toBeNull();
    expect(resolveActiveVehicle([], 'missing')).toBeNull();
  });

  it('preserves a valid vehicle or falls back to the first stored vehicle', () => {
    expect(resolveActiveVehicle([vehicle, secondVehicle], 'veh-second')).toBe(
      secondVehicle
    );
    expect(resolveActiveVehicle([vehicle, secondVehicle], 'missing')).toBe(vehicle);
  });
});

describe('first-vehicle persistence ordering', () => {
  it('persists before committing the first vehicle to UI state', async () => {
    const pending = deferredPromise();
    const commit = vi.fn();
    const operation = persistFirstVehicle(() => pending.promise, commit);

    await Promise.resolve();
    expect(commit).not.toHaveBeenCalled();

    pending.resolve();
    await operation;
    expect(commit).toHaveBeenCalledOnce();
  });

  it('leaves onboarding state unchanged when first-vehicle persistence fails', async () => {
    const commit = vi.fn();

    await expect(
      persistFirstVehicle(
        () => Promise.reject(new Error('Injected vehicle write failure')),
        commit
      )
    ).rejects.toThrow('Injected vehicle write failure');

    expect(commit).not.toHaveBeenCalled();
    expect(resolveStartupView(false, null, 0)).toBe('onboarding');
  });

  it('prevents a rapid double submission while the first is pending', async () => {
    const pending = deferredPromise();
    const operation = vi.fn(() => pending.promise);
    const lock = createSubmissionLock();

    const first = lock.run(operation);
    const second = lock.run(operation);

    await expect(second).resolves.toBe(false);
    expect(operation).toHaveBeenCalledOnce();

    pending.resolve();
    await expect(first).resolves.toBe(true);
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  parseOptionalNonNegativeNumber,
  preserveProviderRepresentation,
} from '../components/screens/AddRecordScreen';
import { parseOptionalIssueMileage } from '../components/screens/ActiveIssuesScreen';
import { Provider } from '../types';
import { createEntityId } from '../utils/ids';
import {
  PendingWriteGate,
  persistThenCommit,
  resolveStoredActiveVehicleId,
  resolveValidVehicleId,
} from './persistenceGuards';

describe('persist-first state and notification ordering', () => {
  it('commits React state only after persistence succeeds', async () => {
    const sequence: string[] = [];
    await persistThenCommit(
      async () => {
        sequence.push('persist');
      },
      () => sequence.push('state')
    );
    sequence.push('success');
    expect(sequence).toEqual(['persist', 'state', 'success']);
  });

  it('leaves React state unchanged when add/edit/delete persistence fails', async () => {
    const commit = vi.fn();
    await expect(
      persistThenCommit(
        async () => {
          throw new Error('Injected persistence failure');
        },
        commit
      )
    ).rejects.toThrow('Injected persistence failure');
    expect(commit).not.toHaveBeenCalled();
  });

  it('holds export-style work until every pending write finishes', async () => {
    const pendingCounts: number[] = [];
    const gate = new PendingWriteGate((count) => pendingCounts.push(count));
    const finishFirst = gate.begin();
    const finishSecond = gate.begin();
    let released = false;
    const barrier = gate.waitForIdle().then(() => {
      released = true;
    });

    finishFirst();
    await Promise.resolve();
    expect(released).toBe(false);
    finishSecond();
    await barrier;
    expect(released).toBe(true);
    expect(pendingCounts).toEqual([1, 2, 1, 0]);
  });
});

describe('form optional-field preservation', () => {
  it('preserves omitted and explicit-zero service mileage', () => {
    expect(parseOptionalNonNegativeNumber('')).toBeUndefined();
    expect(parseOptionalNonNegativeNumber('   ')).toBeUndefined();
    expect(parseOptionalNonNegativeNumber('0')).toBe(0);
    expect(parseOptionalNonNegativeNumber('123')).toBe(123);
  });

  it('preserves provider objects unless representation is explicitly changed', () => {
    const provider: Provider = {
      id: 'provider-test',
      name: 'Test Provider',
      type: 'Independent Shop',
      address: '123 Test Street',
    };
    expect(
      preserveProviderRepresentation(provider, provider.name, false)
    ).toBe(provider);
    expect(
      preserveProviderRepresentation(provider, 'Changed Provider', true)
    ).toBe('Changed Provider');
  });

  it('keeps empty issue mileage omitted, preserves zero, and rejects NaN', () => {
    expect(parseOptionalIssueMileage('')).toBeUndefined();
    expect(parseOptionalIssueMileage('0')).toBe(0);
    expect(parseOptionalIssueMileage('not-a-number')).toBeUndefined();
    expect(parseOptionalIssueMileage('NaN')).toBeUndefined();
  });
});

describe('submit locking and collision-resistant IDs', () => {
  it('generates unique IDs while preserving required prefixes', () => {
    const recordIds = new Set(Array.from({ length: 100 }, () => createEntityId('rec-')));
    const issueId = createEntityId('iss-');
    const taskId = createEntityId('task-');
    expect(recordIds.size).toBe(100);
    expect([...recordIds].every((id) => id.startsWith('rec-'))).toBe(true);
    expect(issueId.startsWith('iss-')).toBe(true);
    expect(taskId.startsWith('task-')).toBe(true);
  });

  it('uses synchronous submit locks in every required CRUD form', () => {
    const files = [
      'src/components/screens/AddRecordScreen.tsx',
      'src/components/screens/ActiveIssuesScreen.tsx',
      'src/components/screens/MaintenancePlannerScreen.tsx',
      'src/components/screens/VehiclesScreen.tsx',
    ];
    files.forEach((file) => {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain('submitLockRef.current');
      expect(source).toContain('disabled={isSubmitting}');
    });
  });
});

describe('active vehicle integrity', () => {
  it('preserves a valid active vehicle selection', () => {
    const removeInvalidSelection = vi.fn();

    expect(resolveValidVehicleId(['veh-a', 'veh-b'], 'veh-b')).toBe('veh-b');
    expect(
      resolveStoredActiveVehicleId(
        ['veh-a', 'veh-b'],
        'veh-b',
        removeInvalidSelection
      )
    ).toBe('veh-b');
    expect(removeInvalidSelection).not.toHaveBeenCalled();
  });

  it('clears or deterministically replaces an invalid active vehicle selection', () => {
    const removeInvalidSelection = vi.fn();

    expect(resolveValidVehicleId(['veh-a', 'veh-b'], 'missing')).toBe('veh-a');
    expect(resolveValidVehicleId([], 'missing')).toBeNull();
    expect(
      resolveStoredActiveVehicleId(
        ['veh-a', 'veh-b'],
        'missing',
        removeInvalidSelection
      )
    ).toBe('veh-a');
    expect(removeInvalidSelection).toHaveBeenCalledOnce();
  });
});

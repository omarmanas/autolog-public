import { Provider, Vehicle, Part, FluidOrMaterial } from '../types';

/**
 * Safely format a provider to a human-readable display string.
 */
export function getProviderDisplayName(provider: Provider | string | null | undefined): string {
  if (!provider) return 'Unknown Provider';
  if (typeof provider === 'string') return provider.trim() || 'Unknown Provider';
  if (typeof provider === 'object') {
    return provider.name?.trim() || 'Unknown Provider';
  }
  return 'Unknown Provider';
}

/**
 * Safely format a vehicle to a human-readable display string.
 */
export function getVehicleDisplayName(vehicle: Vehicle | string | null | undefined): string {
  if (!vehicle) return 'Unknown Vehicle';
  if (typeof vehicle === 'string') return vehicle.trim() || 'Unknown Vehicle';
  if (typeof vehicle === 'object') {
    const parts = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown Vehicle';
  }
  return 'Unknown Vehicle';
}

/**
 * Safely format parts list into a comma-separated string description.
 */
export function formatPartsList(
  parts: Part[] | Array<{ name: string; partNumber?: string; cost?: number }> | string[] | null | undefined
): string {
  if (!parts || !Array.isArray(parts) || parts.length === 0) return 'None';
  return parts
    .map((p) => {
      if (typeof p === 'string') return p;
      if (typeof p === 'object' && p !== null) {
        if ('name' in p && p.name) {
          return p.partNumber ? `${p.name} (PN: ${p.partNumber})` : p.name;
        }
      }
      return 'Part';
    })
    .join(', ');
}

/**
 * Safely format fluids/materials list into a comma-separated string description.
 */
export function formatFluidList(fluids: FluidOrMaterial[] | string[] | null | undefined): string {
  if (!fluids || !Array.isArray(fluids) || fluids.length === 0) return 'None';
  return fluids
    .map((f) => {
      if (typeof f === 'string') return f;
      if (typeof f === 'object' && f !== null) {
        if ('name' in f && f.name) {
          return f.specification ? `${f.name} (${f.specification})` : f.name;
        }
      }
      return 'Fluid/Material';
    })
    .join(', ');
}

/**
 * Safely format location name.
 */
export function formatLocationName(location: string | object | null | undefined): string {
  if (!location) return 'N/A';
  if (typeof location === 'string') return location.trim() || 'N/A';
  if (typeof location === 'object' && location !== null) {
    if ('name' in location && typeof (location as any).name === 'string') return (location as any).name;
    if ('address' in location && typeof (location as any).address === 'string') return (location as any).address;
  }
  return 'N/A';
}

/**
 * Safe text renderer to guard against unexpected object values in JSX.
 */
export function safeRenderText(val: any, fallback = '—'): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (typeof val === 'object') {
    if (val.name && typeof val.name === 'string') return val.name;
    if (val.title && typeof val.title === 'string') return val.title;
    if (val.label && typeof val.label === 'string') return val.label;
  }
  return fallback;
}

/**
 * Safely format an optional numeric mileage value into a locale-formatted string with unit,
 * or return a fallback when undefined/null.
 */
export function formatMileage(
  mileage: number | null | undefined,
  fallback: string = 'Not documented',
  includeUnit: boolean = true
): string {
  if (mileage === undefined || mileage === null) {
    return fallback;
  }
  const formatted = mileage.toLocaleString();
  return includeUnit ? `${formatted} mi` : formatted;
}

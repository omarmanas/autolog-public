export class PendingWriteGate {
  private pending = 0;
  private waiters: Array<() => void> = [];

  constructor(private readonly onChange: (pending: number) => void) {}

  begin(): () => void {
    this.pending += 1;
    this.onChange(this.pending);
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      this.pending = Math.max(0, this.pending - 1);
      this.onChange(this.pending);
      if (this.pending === 0) {
        const waiters = this.waiters;
        this.waiters = [];
        waiters.forEach((resolve) => resolve());
      }
    };
  }

  waitForIdle(): Promise<void> {
    if (this.pending === 0) return Promise.resolve();
    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  get count(): number {
    return this.pending;
  }
}

export async function persistThenCommit(
  persist: () => Promise<void>,
  commit: () => void
): Promise<void> {
  await persist();
  commit();
}

export function resolveValidVehicleId(
  vehicleIds: readonly string[],
  requestedId: string | null
): string | null {
  if (requestedId && vehicleIds.includes(requestedId)) return requestedId;
  return vehicleIds[0] || null;
}

export function resolveStoredActiveVehicleId(
  vehicleIds: readonly string[],
  requestedId: string | null,
  removeInvalidSelection: () => void
): string | null {
  const resolvedId = resolveValidVehicleId(vehicleIds, requestedId);
  if (requestedId && requestedId !== resolvedId) {
    removeInvalidSelection();
  }
  return resolvedId;
}

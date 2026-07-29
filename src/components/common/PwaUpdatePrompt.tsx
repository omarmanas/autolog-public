import React, { useState, useSyncExternalStore } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import {
  pwaUpdateStore,
  type ServiceWorkerUpdate,
} from '../../pwa/serviceWorkerRegistration';

interface PwaUpdateNoticeProps {
  onUpdate: () => void;
  onLater: () => void;
  updating?: boolean;
}

export const PwaUpdateNotice: React.FC<PwaUpdateNoticeProps> = ({
  onUpdate,
  onLater,
  updating = false,
}) => (
  <aside className="pwa-update-region" aria-label="Application update">
    <Card
      className="pwa-update-card"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="pwa-update-copy">
        <p className="pwa-update-title">A new AutoLog version is available.</p>
        <p className="pwa-update-description">
          Update when you are ready. AutoLog will reload only after you choose
          to update.
        </p>
      </div>
      <div className="pwa-update-actions">
        <Button
          variant="primary"
          onClick={onUpdate}
          loading={updating}
          loadingText="Updating"
        >
          Update now
        </Button>
        <Button variant="ghost" onClick={onLater} disabled={updating}>
          Later
        </Button>
      </div>
    </Card>
  </aside>
);

export const PwaUpdatePrompt: React.FC = () => {
  const update = useSyncExternalStore(
    pwaUpdateStore.subscribe,
    pwaUpdateStore.getSnapshot,
    pwaUpdateStore.getSnapshot
  );
  const [dismissedUpdate, setDismissedUpdate] =
    useState<ServiceWorkerUpdate | null>(null);
  const [updating, setUpdating] = useState(false);

  if (!update || update === dismissedUpdate) {
    return null;
  }

  return (
    <PwaUpdateNotice
      updating={updating}
      onUpdate={() => {
        setUpdating(true);
        update.activate();
      }}
      onLater={() => setDismissedUpdate(update)}
    />
  );
};

export interface ServiceWorkerUpdate {
  activate: () => void;
}

interface WorkerLike {
  state: string;
  postMessage: (message: unknown) => void;
  addEventListener: (
    type: 'statechange',
    listener: () => void
  ) => void;
}

interface RegistrationLike {
  waiting: WorkerLike | null;
  installing: WorkerLike | null;
  addEventListener: (
    type: 'updatefound',
    listener: () => void
  ) => void;
}

interface ServiceWorkerContainerLike {
  controller: unknown;
  register: (
    url: string,
    options: { scope: string }
  ) => Promise<RegistrationLike>;
  addEventListener: (
    type: 'controllerchange',
    listener: () => void
  ) => void;
}

interface RegisterServiceWorkerOptions {
  isProduction?: boolean;
  baseUrl?: string;
  appVersion?: string;
  serviceWorker?: ServiceWorkerContainerLike;
  onUpdateAvailable?: (update: ServiceWorkerUpdate) => void;
  reload?: () => void;
}

const normalizeBaseUrl = (baseUrl: string) =>
  baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

export const getServiceWorkerUrl = (baseUrl: string, appVersion: string) =>
  `${normalizeBaseUrl(baseUrl)}service-worker.js?v=${encodeURIComponent(
    appVersion
  )}`;

export const registerServiceWorker = async ({
  isProduction = import.meta.env.PROD,
  baseUrl = import.meta.env.BASE_URL,
  appVersion = __APP_VERSION__,
  serviceWorker,
  onUpdateAvailable = () => undefined,
  reload = () => window.location.reload(),
}: RegisterServiceWorkerOptions = {}): Promise<RegistrationLike | null> => {
  if (!isProduction) {
    return null;
  }

  const container =
    serviceWorker ??
    (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      ? (navigator.serviceWorker as unknown as ServiceWorkerContainerLike)
      : undefined);

  if (!container) {
    return null;
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  let reloadRequested = false;

  container.addEventListener('controllerchange', () => {
    if (reloadRequested) {
      reload();
    }
  });

  const announceUpdate = (worker: WorkerLike) => {
    let activationRequested = false;

    onUpdateAvailable({
      activate: () => {
        if (activationRequested) {
          return;
        }

        activationRequested = true;
        reloadRequested = true;
        worker.postMessage({ type: 'SKIP_WAITING' });
      },
    });
  };

  const registration = await container.register(
    getServiceWorkerUrl(normalizedBaseUrl, appVersion),
    { scope: normalizedBaseUrl }
  );
  const watchedWorkers = new Set<WorkerLike>();

  const watchInstallingWorker = (installingWorker: WorkerLike | null) => {
    if (!installingWorker || watchedWorkers.has(installingWorker)) {
      return;
    }

    watchedWorkers.add(installingWorker);
    installingWorker.addEventListener('statechange', () => {
      if (
        installingWorker.state === 'installed' &&
        container.controller
      ) {
        announceUpdate(installingWorker);
      }
    });
  };

  if (registration.waiting) {
    announceUpdate(registration.waiting);
  }

  registration.addEventListener('updatefound', () => {
    watchInstallingWorker(registration.installing);
  });
  watchInstallingWorker(registration.installing);

  return registration;
};

let currentUpdate: ServiceWorkerUpdate | null = null;
let registrationPromise: Promise<RegistrationLike | null> | null = null;
const updateListeners = new Set<() => void>();

const publishUpdate = (update: ServiceWorkerUpdate) => {
  currentUpdate = update;
  updateListeners.forEach((listener) => listener());
};

export const pwaUpdateStore = {
  getSnapshot: () => currentUpdate,
  subscribe: (listener: () => void) => {
    updateListeners.add(listener);
    return () => updateListeners.delete(listener);
  },
};

export const initializePwa = () => {
  if (!registrationPromise) {
    registrationPromise = registerServiceWorker({
      onUpdateAvailable: publishUpdate,
    }).catch((error: unknown) => {
      console.warn('AutoLog service worker registration failed.', error);
      return null;
    });
  }

  return registrationPromise;
};

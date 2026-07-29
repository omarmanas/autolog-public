import { describe, expect, it, vi } from 'vitest';
import {
  getServiceWorkerUrl,
  registerServiceWorker,
  type ServiceWorkerUpdate,
} from './serviceWorkerRegistration';

class FakeEventTarget {
  private listeners = new Map<string, Array<() => void>>();

  addEventListener(type: string, listener: () => void) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type: string) {
    this.listeners.get(type)?.forEach((listener) => listener());
  }
}

class FakeWorker extends FakeEventTarget {
  state = 'installing';
  postMessage = vi.fn();
}

class FakeRegistration extends FakeEventTarget {
  waiting: FakeWorker | null = null;
  installing: FakeWorker | null = null;
}

class FakeServiceWorkerContainer extends FakeEventTarget {
  controller: unknown = {};
  registration = new FakeRegistration();
  register = vi.fn(async () => this.registration);
}

describe('service worker registration', () => {
  it('builds a service-worker URL beneath the configured base path', () => {
    expect(getServiceWorkerUrl('/autolog-public/', '1.0.0')).toBe(
      '/autolog-public/service-worker.js?v=1.0.0'
    );
    expect(getServiceWorkerUrl('/autolog-public', '1.0.0-personal')).toBe(
      '/autolog-public/service-worker.js?v=1.0.0-personal'
    );
  });

  it('does not register outside production', async () => {
    const serviceWorker = new FakeServiceWorkerContainer();

    const registration = await registerServiceWorker({
      isProduction: false,
      baseUrl: '/',
      serviceWorker,
    });

    expect(registration).toBeNull();
    expect(serviceWorker.register).not.toHaveBeenCalled();
  });

  it('registers with the GitHub Pages URL and scope in production', async () => {
    const serviceWorker = new FakeServiceWorkerContainer();

    await registerServiceWorker({
      isProduction: true,
      baseUrl: '/autolog-public/',
      appVersion: '1.0.0',
      serviceWorker,
    });

    expect(serviceWorker.register).toHaveBeenCalledWith(
      '/autolog-public/service-worker.js?v=1.0.0',
      { scope: '/autolog-public/' }
    );
  });

  it('announces a waiting update and reloads only after explicit activation', async () => {
    const serviceWorker = new FakeServiceWorkerContainer();
    const waitingWorker = new FakeWorker();
    const reload = vi.fn();
    const updates: ServiceWorkerUpdate[] = [];
    serviceWorker.registration.waiting = waitingWorker;

    await registerServiceWorker({
      isProduction: true,
      baseUrl: '/autolog-public/',
      serviceWorker,
      reload,
      onUpdateAvailable: (update) => updates.push(update),
    });

    expect(updates).toHaveLength(1);
    serviceWorker.emit('controllerchange');
    expect(reload).not.toHaveBeenCalled();
    expect(waitingWorker.postMessage).not.toHaveBeenCalled();

    updates[0].activate();
    updates[0].activate();
    expect(waitingWorker.postMessage).toHaveBeenCalledTimes(1);
    expect(waitingWorker.postMessage).toHaveBeenCalledWith({
      type: 'SKIP_WAITING',
    });
    expect(reload).not.toHaveBeenCalled();

    serviceWorker.emit('controllerchange');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('announces an installed update when the app already has a controller', async () => {
    const serviceWorker = new FakeServiceWorkerContainer();
    const installingWorker = new FakeWorker();
    const onUpdateAvailable = vi.fn();
    serviceWorker.registration.installing = installingWorker;

    await registerServiceWorker({
      isProduction: true,
      baseUrl: '/autolog-public/',
      serviceWorker,
      onUpdateAvailable,
    });

    serviceWorker.registration.emit('updatefound');
    expect(onUpdateAvailable).not.toHaveBeenCalled();

    installingWorker.state = 'installed';
    installingWorker.emit('statechange');
    expect(onUpdateAvailable).toHaveBeenCalledTimes(1);
  });
});

import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

interface WebManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: ManifestIcon[];
}

const manifest = JSON.parse(
  readFileSync(
    new URL('../../public/manifest.webmanifest', import.meta.url),
    'utf8'
  )
) as WebManifest;
const indexHtml = readFileSync(
  new URL('../../index.html', import.meta.url),
  'utf8'
);
const serviceWorkerSource = readFileSync(
  new URL('../../public/service-worker.js', import.meta.url),
  'utf8'
);

describe('PWA manifest and metadata', () => {
  it('declares complete GitHub Pages-compatible application metadata', () => {
    expect(manifest).toMatchObject({
      name: 'AutoLog',
      short_name: 'AutoLog',
      start_url: '/autolog-public/',
      scope: '/autolog-public/',
      display: 'standalone',
      theme_color: '#0B0F14',
      background_color: '#0B0F14',
    });
    expect(manifest.description).toContain('vehicle maintenance');
    expect(indexHtml).toContain(
      'rel="manifest" href="%BASE_URL%manifest.webmanifest"'
    );
    expect(indexHtml).toContain('name="theme-color" content="#0B0F14"');
  });

  it('provides install and maskable PNG icons at the required sizes', () => {
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: 'icons/autolog-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        }),
        expect.objectContaining({
          src: 'icons/autolog-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        }),
        expect.objectContaining({
          src: 'icons/autolog-maskable-192.png',
          sizes: '192x192',
          purpose: 'maskable',
        }),
        expect.objectContaining({
          src: 'icons/autolog-maskable-512.png',
          sizes: '512x512',
          purpose: 'maskable',
        }),
      ])
    );

    for (const icon of manifest.icons) {
      const png = readFileSync(
        new URL(`../../public/${icon.src}`, import.meta.url)
      );
      const expectedSize = Number(icon.sizes.split('x')[0]);

      expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(expectedSize);
      expect(png.readUInt32BE(20)).toBe(expectedSize);
    }
  });
});

describe('offline shell policy', () => {
  it('limits precaching to the app shell, manifest, and declared icons', () => {
    const shellList = serviceWorkerSource.match(
      /const SHELL_FILES = \[([\s\S]*?)\];/
    )?.[1];

    expect(shellList).toBeDefined();
    expect(shellList).toContain('manifest.webmanifest');
    expect(shellList).toContain('autolog-192.png');
    expect(shellList).toContain('autolog-maskable-512.png');
    expect(shellList).not.toMatch(
      /indexeddb|backup|workbook|xlsx|xls|blob|document|github|api/i
    );
  });

  it('uses network-first HTML, same-origin asset caching, and old-cache cleanup', () => {
    expect(serviceWorkerSource).toContain(
      "const BASE_PATH = '/autolog-public/';"
    );
    expect(serviceWorkerSource).toContain(
      "new URL(self.location.href).searchParams.get('v')"
    );
    expect(serviceWorkerSource).toContain("cache: 'no-store'");
    expect(serviceWorkerSource).toContain(
      'url.origin !== self.location.origin'
    );
    expect(serviceWorkerSource).toContain(
      "url.pathname.startsWith(\n    `${BASE_PATH}assets/`"
    );
    expect(serviceWorkerSource).toContain(
      'cache.addAll([...new Set([...SHELL_FILES, ...buildAssets])])'
    );
    expect(serviceWorkerSource).toContain(
      'cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME'
    );
    expect(serviceWorkerSource).toContain('caches.delete(cacheName)');
    expect(serviceWorkerSource).not.toContain('backgroundSync');
    expect(serviceWorkerSource).not.toContain('push');
  });

  it('precaches only declared shell files and same-origin initial build assets', async () => {
    const listeners = new Map<string, (event: unknown) => void>();
    const addAll = vi.fn(async (_urls: string[]) => undefined);
    const waitUntil = vi.fn((_promise: Promise<void>) => undefined);
    const context = {
      URL,
      caches: {
        open: vi.fn(async () => ({
          addAll,
          match: vi.fn(),
          put: vi.fn(),
        })),
        keys: vi.fn(async () => []),
        delete: vi.fn(),
      },
      fetch: vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => `
          <script src="/autolog-public/assets/index-ABC123.js"></script>
          <link href="/autolog-public/assets/index-DEF456.css" rel="stylesheet">
          <script src="https://example.com/external.js"></script>
          <a href="/autolog-public/user-backup.json">Backup</a>
        `,
      })),
      self: {
        location: {
          href: 'https://omarmanas.github.io/autolog-public/service-worker.js?v=1.0.0',
          origin: 'https://omarmanas.github.io',
        },
        clients: { claim: vi.fn() },
        addEventListener: (
          type: string,
          listener: (event: unknown) => void
        ) => listeners.set(type, listener),
        skipWaiting: vi.fn(),
      },
    };

    runInNewContext(serviceWorkerSource, context);
    listeners.get('install')?.({ waitUntil });
    const installPromise = waitUntil.mock.calls[0][0] as Promise<void>;
    await installPromise;

    const cachedUrls = addAll.mock.calls[0][0] as string[];
    expect(cachedUrls).toContain(
      '/autolog-public/assets/index-ABC123.js'
    );
    expect(cachedUrls).toContain(
      '/autolog-public/assets/index-DEF456.css'
    );
    expect(cachedUrls).toContain('/autolog-public/manifest.webmanifest');
    expect(cachedUrls).not.toContain('https://example.com/external.js');
    expect(cachedUrls).not.toContain(
      '/autolog-public/user-backup.json'
    );
  });

  it('deletes obsolete AutoLog caches without touching unrelated caches', async () => {
    const listeners = new Map<string, (event: unknown) => void>();
    const deleteCache = vi.fn(async () => true);
    const claim = vi.fn(async () => undefined);
    const waitUntil = vi.fn((_promise: Promise<void>) => undefined);
    const context = {
      URL,
      caches: {
        open: vi.fn(),
        keys: vi.fn(async () => [
          'autolog-pwa-shell-0.9.0',
          'autolog-pwa-shell-1.0.0',
          'another-app-cache',
        ]),
        delete: deleteCache,
      },
      fetch: vi.fn(),
      self: {
        location: {
          href: 'https://omarmanas.github.io/autolog-public/service-worker.js?v=1.0.0',
          origin: 'https://omarmanas.github.io',
        },
        clients: { claim },
        addEventListener: (
          type: string,
          listener: (event: unknown) => void
        ) => listeners.set(type, listener),
        skipWaiting: vi.fn(),
      },
    };

    runInNewContext(serviceWorkerSource, context);
    listeners.get('activate')?.({ waitUntil });
    const activationPromise = waitUntil.mock.calls[0][0] as Promise<void>;
    await activationPromise;

    expect(deleteCache).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith(
      'autolog-pwa-shell-0.9.0'
    );
    expect(claim).toHaveBeenCalledTimes(1);
  });
});

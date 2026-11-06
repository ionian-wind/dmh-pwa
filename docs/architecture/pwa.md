# PWA and Offline Behavior

## Overview

The app is designed to be installable and offline-first. **`vite-plugin-pwa` /
Workbox** is the single source of the production service worker and manifest;
the legacy hand-written `public/manifest.json` and `public/sw.js` were removed.

## Manifest

Configured in `vite.config.js`:

| Field | Value |
| --- | --- |
| `name` | Owlbear's Dungeon Master Helper |
| `short_name` | Owlbear's DMH |
| `theme_color` / `background_color` | `#1e1e2e` |
| `display` | `standalone` |
| `orientation` | `portrait-primary` |
| `scope` / `start_url` | `/dmh-pwa` |
| Icons | 72, 96, 128, 144, 152, 192, 384, 512 px |
| Categories | productivity, games, utilities |

The manifest link is injected by `vite-plugin-pwa` as
`/dmh-pwa/manifest.webmanifest`; `index.html` keeps only the Apple/Microsoft
metadata.

## Service worker

`VitePWA` options:

```js
registerType: 'autoUpdate',
injectRegister: 'inline',
workbox: {
  maximumFileSizeToCacheInBytes: 30_000_000,
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  runtimeCaching: [
    { urlPattern: /\.(png|jpg|jpeg|svg|gif)$/, handler: 'CacheFirst', ... 30d },
    { urlPattern: /^https:\/\/.*\.(js|css)$/, handler: 'StaleWhileRevalidate', ... 7d },
  ],
  cleanupOutdatedCaches: true,
  sourcemap: true,
},
devOptions: { enabled: true, type: 'module' },
```

The production build uses the Workbox-generated service worker. The legacy
hand-written `public/sw.js` and `public/manifest.json` were removed; the PWA
plugin is the single source of the manifest and worker.

## Registration and update flow

`vite-plugin-pwa` injects an inline registration script into `index.html`
(`injectRegister: 'inline'`); there is no separate `registerSW.js` file to
precache. With `autoUpdate`:

1. A new worker installs and activates.
2. The page controller changes.
3. `PWAStatus.vue` listens for `navigator.serviceWorker.controllerchange` and
   shows an "Update available" banner.
4. "Update now" calls `window.location.reload()`.

`PWAStatus` also shows:
- an offline badge when `navigator.onLine === false`,
- a standalone badge when `display-mode: standalone` or
  `navigator.standalone === true`.

The online/offline and controller-change listeners are added in `onMounted`
and never removed; the component lives for the whole app lifetime, so this is
harmless but not clean.

## Install prompt

`src/components/PWAInstallPrompt.vue` shows a custom banner after the browser
fires `beforeinstallprompt`.

- The event is captured and stored; the browser’s own install UI remains
  available, and the banner’s Install button calls `prompt()`.
- The banner's Install button calls `prompt()` and records the user's choice.
- `appinstalled` hides the banner.
- Listeners are removed on unmount.
- Browsers that do not fire `beforeinstallprompt` (notably iOS Safari) still
  need manual install instructions; the standard browser install UI remains
  available.

## Offline data behavior

All domain data is in IndexedDB, so it is available offline. Audio files are
only available offline if the underlying `FileSystemFileHandle` permission
still resolves; Blob-sourced files are stored in IndexedDB and are fully
offline.

Requests that remain network-dependent:
- Google Fonts / remote assets if any are added later,
- none from the app itself today.

## Dev mode

`devOptions.enabled: true` means a development service worker runs during
`npm run dev`. This commonly causes stale-cache confusion; use a fresh
profile or unregister the worker when debugging.

Inline registration also avoids the Workbox warning about a missing precached
`/registerSW.js`: older builds precached that generated file, while the dev
server served a different registration script. After updating from an older
dev worker, reload once so the new worker takes control.

## Known issues

- `registerType: 'autoUpdate'` combined with a manual "update now" prompt can
  produce a reload loop on some browsers if `controllerchange` fires repeatedly.
- PWA scope/start URL assumes deployment at `/dmh-pwa`.
- `index.html` theme colors (`#1e1e2e`) match the header but the content theme
  is light; install splash/status bar may feel inconsistent.
- `maximumFileSizeToCacheInBytes` of 30 MB is generous; a single large JS chunk
  or asset can slow first install.
- Browsers without `beforeinstallprompt` need a manual install entry point.

See [proposals/technical-proposals.md](../proposals/technical-proposals.md)
for a single-worker consolidation proposal.

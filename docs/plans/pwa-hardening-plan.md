# PWA Hardening Plan (Phases 1–3)

**Status:** phases 1–2 implemented and verified in browser emulation; most of
phase 3 is done (reviewed 2026-11-09). Lighthouse/PWABuilder and physical-device
checks remain; manifest shortcuts are generated only for enabled features.

**Goal:** improve installability, standalone/mobile layout and PWA reliability
without migrating the app to the `pwa-starter` Lit/Web Awesome stack.

**Out of scope:** Lit/Web Awesome rewrite, Navigation API router, Azure Static
Web Apps CLI, replacing Vue Router/Pinia/Quasar, copying the starter’s
CDN-hosted Workbox setup.

---

## Phase 1 — Manifest and install UX

- [x] Add `id`, normalized `start_url`/`scope`, `orientation: 'any'`,
      `launch_handler.client_mode: 'focus-existing'` and related-app fields.
- [x] Add app shortcuts for Notes, Timers, Jukebox and the help center
      (generated from enabled features).
- [x] Generate desktop/mobile screenshots and add them to the manifest.
- [x] Localize the install prompt, add a help-center fallback link, and enable
      it after the existing disabled flow is reviewed.
- [x] Review theme-color metadata and keep it consistent with the dark app
      header.
- [x] Validate the manifest in a real browser.

## Phase 2 — Safe-area and standalone mobile polish

- [x] Add `--safe-*` CSS variables based on `env(safe-area-inset-*)`.
- [x] Apply safe-area padding to the main header and both drawers.
- [x] Apply safe-area padding to the footer and jukebox player.
- [x] Apply safe-area offsets to PWA update/install banners and status chips.
- [x] Apply safe-area padding to bottom-positioned dialogs and the sound player.
- [x] Verify portrait, landscape and standalone layouts in browser emulation.
- [ ] Verify on a real Android/iOS device or emulator.

## Phase 3 — PWA audit and fixes

- [ ] Run Lighthouse and PWABuilder against the built preview/deployment.
- [x] Verify first-load precache, offline reload, core routes and help center.
- [x] Review the generated service worker and precache manifest.
- [ ] Verify install, standalone launch, shortcuts and persistent-storage state.
- [x] Check the update banner and avoid controller-change reload loops.
- [x] Update PWA documentation with the final behavior and limitations.

## Manual checks left to the project owner

- [ ] Test install and standalone launch on a physical Android device.
- [ ] Test Add to Home Screen and standalone launch on iPhone/iPad.
- [ ] Run the PWABuilder report against the deployed GitHub Pages URL.
- [x] Check the update banner across two builds (verified with two production
      builds on 2026-11-06: banner appears, one reload, no loop).
- [ ] Verify installed shortcuts and persistent-storage state.
- [ ] Capture replacement screenshots after major UI redesigns.

### Android install and safe-area check

A physical device needs HTTPS, or `localhost` via USB port forwarding. The
simplest path is the deployed GitHub Pages URL. A temporary HTTPS tunnel to
`npm run preview` also works.

1. Open the deployed app in Chrome on Android.
2. Install it from the browser menu or the in-app install banner.
3. Launch it from the home screen or app drawer.
4. Confirm:
   - the header is below the status bar/camera cutout;
   - the bottom player and install banner sit above the gesture bar;
   - drawers can be opened and fully scrolled;
   - rotation to landscape does not hide controls behind a notch.
5. Long-press the installed icon and launch Notes, Timers, Jukebox and Help.
6. Open Settings → Content → Persistent storage and request it again from the
   installed app.

### iPhone/iPad install check

1. Open the deployed app in Safari.
2. Share → Add to Home Screen.
3. Launch from the home screen.
4. Confirm the header, drawers, dialogs and bottom player avoid the notch/home
   indicator in portrait and landscape.
5. Open the Help center from the menu.

### Lighthouse and PWABuilder

1. Run `npm run build && npm run preview`.
2. Open the preview URL in Chrome DevTools → Lighthouse and run the PWA,
   performance, accessibility and best-practices categories.
3. Open <https://www.pwabuilder.com/>, enter the deployed GitHub Pages URL and
   review the manifest/service-worker/installability report.
4. Fix only manifest, icon, screenshot and caching findings; do not treat
   framework migration as part of this audit.

Expected: installable, service worker active, manifest valid, screenshots and
shortcuts present, no missing precache entries.

### Update banner and reload-loop check

1. Load a built version, let the service worker activate.
2. Build a new version and reload once online.
3. Confirm the “Update available” banner appears.
4. Press “Update now” and verify one reload, not a loop.
5. Open a second tab and confirm `focus-existing`/runtime behavior is sensible.

### Shortcut and persistence check

1. Install the app.
2. Long-press the icon and verify Notes, Timers, Jukebox and Help.
3. In Settings → Content → Persistent storage, request persistence.
4. Confirm the granted/denied message and retry after installation if denied.
5. Keep a backup before clearing browser data.

### Screenshot refresh

Re-run the screenshot capture after significant UI changes:

- desktop `1280×800`;
- mobile `390×844`;
- save to `public/screenshots/app-desktop.png` and `app-mobile.png`;
- ensure the manifest dimensions match.

## Verification commands

```bash
npm run types-check
npm run build
npm run test:coverage
npm run preview
```

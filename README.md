# Saralya — first prototype (vision demo)

Saralya is lending infrastructure for middle- and base-layer Indian NBFCs. It replaces untrustworthy field and valuation visits with **evidence**: a live, sealed phone capture of the collateral, bound to government-attested records, measured as value ranges, reconciled against data the borrower cannot stage, and reused through monitoring and recovery.

This repository is a **vision demo** for NBFC partners and investors. It is a static web app with no backend. Heavy computer vision is simulated with dummy data; the cheap, real-in-the-browser pieces are implemented for real (see [Real vs simulated](#real-vs-simulated)).

- **Borrower app** (mobile-first, `#/b`): sign-up, KYC and bank onboarding, loan selection, guided capture, results.
- **Lender console** (desktop-first, `#/lender`): application queue and evidence reports, from seeded dummy data.

Target browser: **Chrome on Android** (ARCore phones get the AR engine) and **desktop Chrome** in Demo mode. iOS/Safari is out of scope.

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (homography solver etc.)
npm run build        # type-check + production build into dist/
```

## Test on an Android phone

Camera and WebXR need a secure context. `localhost` counts as secure, so the easiest route is USB port forwarding:

1. Enable **Developer options → USB debugging** on the phone and connect it by USB.
2. `adb reverse tcp:5173 tcp:5173`
3. Open `http://localhost:5173` in Chrome on the phone.
4. Remote-debug from your laptop at `chrome://inspect`.

Alternative over Wi-Fi: `npm run dev:https` serves on your LAN IP with a self-signed certificate (via `@vitejs/plugin-basic-ssl`). Open `https://<laptop-ip>:5173` on the phone and accept the certificate warning.

### Capture engines

| Engine | When | What it shows |
|---|---|---|
| **AR** (WebXR) | ARCore phones in Chrome. *Auto* offers it with a **Start AR** card (Chrome only opens AR from a tap) | Hit-test reticle, teal grid patches anchored to floors and walls, a world point cloud from the depth sensor (or a 5×5 fan of hit-test rays without depth) |
| **Camera** | Default fallback on Android; any device with a camera | Live FAST corners, trails, Delaunay wireframe, simulated 3D mini-map |
| **Demo** | Laptops / no camera | Synthetic three.js shop, house or vehicle through the same detector and HUD |

Force one under **Settings → Capture engine**. If AR can't start or the session ends (e.g. the back gesture), capture continues in Camera mode. AR needs Google Play Services for AR installed; when it fails, the reason is logged to the console — check it via `chrome://inspect`. With camera-access, captures in AR are real camera frames; without it they are an overlay snapshot, flagged "camera frame unavailable in this mode".

**Settings → Camera check** (gear icon on the landing page) is a quick diagnostic that shows camera resolution, torch support, GPS and WebXR availability on the device.

## Deploy to GitHub Pages

1. Push this repo to GitHub (default branch `main`).
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): install, test, build, upload `dist/`, deploy.

The site is served at `https://<user>.github.io/saralya/`. The base path is the single constant `REPO_BASE` in [`vite.config.ts`](vite.config.ts); change it if you rename the repo. Routing uses `HashRouter`, so refreshing any route works on Pages. There is deliberately **no service worker**, so demos never show a stale cache. The web app manifest allows "Add to Home screen" on Android.

## Where things live

| Path | What |
|---|---|
| `src/data/` | **All dummy data**: seeded lender applications, RC records, registry records, worked examples, IFSC lookup. Edit here. |
| `src/lib/` | Real maths and device helpers: homography, feature detector, quality score, hash chain, WebXR, camera, formatting. |
| `src/store/` | zustand slices persisted to `localStorage` (keys prefixed `saralya:`). |
| `src/components/capture/` | The shared capture engine (`CaptureShell`) and HUD. |
| `src/screens/` | Borrower and lender screens. |
| `public/templates/` | Vehicle part templates for 4-point calibration (JSON + SVG). |
| `public/silhouettes/` | Ghost overlays for 8-angle vehicle capture. |
| `public/plans/` | Dummy sanctioned floor plan. |
| `public/demo/` | Optional demo videos `<flow>.mp4` (may be empty). |
| `docs/` | Research PDFs and notes. Reference only, not bundled. |
| `scripts/make-icons.mjs` | Regenerates the PNG app icons. |

Storage is browser-only: app state in `localStorage`, captured frames in IndexedDB (`idb-keyval`). **Settings → Reset demo data** clears both.

## Real vs simulated

| Real in the browser | Simulated (dummy data, marked "Simulated in prototype") |
|---|---|
| Live camera feed and AR overlay | Stock counting, damage detection, OCR/ANPR readings |
| Feature-point detection on the live frame (FAST corners) | Registry pulls: DigiLocker RC, VAHAN, RoR, EC, CERSAI |
| WebXR hit-test surfaces and depth point cloud (ARCore phones) | Device attestation, challenge verification, replay/injection scores |
| 4-point homography calibration and perspective warp | Valuations, fraud scores, duplicate-index hits |
| UPI QR decoding (`BarcodeDetector`, `jsQR` fallback) | Cross-view geolocalisation, parcel lookup, shadow floor count |
| GPS location with accuracy | Plan vectorisation and deviation schedule |
| SHA-256 hash chain over captured frames (`crypto.subtle`) | Account Aggregator, GST e-invoice verification, penny drop |
| Image quality gating: brightness and Laplacian blur | The whole lender console (seeded data only) |

Demo login: any 10-digit mobile number, OTP **123456**.

## Notes before public use

- Map imagery uses **Esri World Imagery** tiles with attribution. Check Esri's tile terms of use before any public or commercial deployment.
- All names, numbers, IDs and records are fictitious.
- Number plate dimensions in the templates are placeholders based on standard HSRP sizes, marked "verify against spec".

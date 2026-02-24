# Mobile App — iOS & Android
**Status:** Spec — not yet started
**Target:** Ship to App Store + Play Store
**Trigger to execute:** Core feature set is stable and you're ready to invite strangers (not just beta testers)

---

## Current State

The Capacitor foundation is largely done. More is already wired than you might expect:

| Component | Status |
|---|---|
| Capacitor core | Installed (version mismatch — see Phase 1) |
| Android project | Generated (`client/android/`) |
| iOS project | Not generated |
| App ID | `ai.famcal.app` (set in `client/capacitor.config.ts`) |
| Splash screens | All Android densities generated |
| App icons | All mipmap densities generated |
| Build scripts | `android:debug` and `android:release` exist in root `package.json` |
| Responsive layout | Done — `useMediaQuery` hook, Tailwind `sm:` breakpoints, BottomSheet UX |
| Viewport meta | Correct — `maximum-scale=1, user-scalable=no` |
| Install prompt (PWA) | Exists — `InstallPrompt.tsx` |

**Rough estimate:** 80% of the Capacitor setup is already done. The remaining work is fixing existing issues, adding iOS, and going through app store processes.

---

## What This Feature Does

Packages the existing React web app into native iOS (.ipa) and Android (.apk/.aab) containers using Capacitor. The app looks and feels native (no browser chrome, splash screen on launch, installed from the App Store / Play Store). No new features are required for the initial mobile release — the web app ships as-is inside the wrapper.

---

## Phases

### Phase 1 — Fix existing issues (prerequisite for everything else)

**1a. Resolve Capacitor version mismatch**

Root `package.json` has Capacitor v7.2.0 but `client/package.json` has v5.5.0. They must match or the sync command breaks.

Files to touch:
- `client/package.json` — bump `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` to v7.x
- Root `package.json` — confirm version matches client
- After version bump: `cd client && npx cap sync android`

**1b. Fix Android namespace mismatch**

`AndroidManifest.xml` uses namespace `com.simplefamilycalendar.app` but `capacitor.config.ts` has `appId: 'ai.famcal.app'`. These must align.

Files to touch:
- `client/android/app/src/main/AndroidManifest.xml`
- `client/android/app/build.gradle` (applicationId field)
- `client/android/android/build.gradle` (namespace field)

Decision: use `ai.famcal.app` everywhere (matches the brand).

**1c. Move keystore credentials out of source code**

`client/capacitor.config.ts` has hardcoded keystore paths and passwords (even if they're debug defaults, this is bad practice that will persist into production config).

Fix: Move to environment variables. The config already reads `process.env.ANDROID_KEYSTORE_PATH` etc. — just make sure no defaults are hardcoded in committed code. Add these to `.env.example` for documentation.

---

### Phase 2 — iOS platform

**2a. Prerequisites**
- Mac with Xcode 15+ installed
- Apple Developer Program membership ($99/year) — enroll at developer.apple.com
- iOS Simulator or physical device for testing

**2b. Generate iOS project**
```bash
cd client
npx cap add ios
npx cap sync ios
```

This generates `client/ios/` with an Xcode project.

**2c. Configure iOS**

Files that will need editing after generation:
- `client/ios/App/App/Info.plist` — set display name, version, permissions
- `client/ios/App/App.xcworkspace` — open in Xcode for icon/splash setup
- Splash screen: Use `@capacitor/splash-screen` plugin or Xcode asset catalog
- App icon: Add `client/public/android_app_icon_512x512.png` as source, generate all iOS sizes via Xcode or `capacitor-assets`

**2d. Permissions to declare in Info.plist**
- None required for initial release (no camera, location, contacts used yet)
- When push notifications are added: `NSUserNotificationUsageDescription`

---

### Phase 3 — Native features (defer to after initial release)

These are not required for the first app store submission but should be planned:

| Feature | Plugin | Priority |
|---|---|---|
| Push notifications | `@capacitor/push-notifications` | High — replaces or augments email digest |
| Deep links | Built into Capacitor + Universal Links config | Medium |
| Haptic feedback | `@capacitor/haptics` | Low — nice polish on button taps |
| Status bar styling | `@capacitor/status-bar` | Low — match app theme color |
| Keyboard handling | `@capacitor/keyboard` | Medium — prevent input overlap on mobile |

Push notifications specifically are high-value for a calendar app (reminders, day-of alerts). Plan this as a follow-on feature once the app is in the stores.

---

### Phase 4 — App store submission

**Android (Play Store)**

1. Create Google Play Console account ($25 one-time)
2. Build release AAB (not APK): change `releaseType` in `capacitor.config.ts` from `APK` to `AAB`
3. Generate production keystore (NOT the debug keystore):
   ```bash
   keytool -genkey -v -keystore famcal-release.keystore -alias famcal -keyalg RSA -keysize 2048 -validity 10000
   ```
   Store this keystore file securely — losing it means you cannot update the app.
4. Store keystore password in a password manager and in CI env vars
5. Create Play Store listing: screenshots, description, content rating questionnaire
6. Submit to internal testing track first, then production

**iOS (App Store)**

1. In Xcode: set Bundle ID to `ai.famcal.app`, Team to your Apple Developer account
2. Archive the build: Product → Archive
3. Upload via Xcode Organizer or `xcrun altool`
4. In App Store Connect: create app listing, screenshots (6.5" and 5.5" iPhone required)
5. Fill App Privacy details (data collection disclosure — you collect: email, name, calendar data)
6. Submit for review (typically 1-3 days)

---

### Phase 5 — PWA (parallel track, lower effort)

Before the apps are in the stores, make the web app installable as a PWA. This requires:

1. Add `client/public/manifest.json`:
```json
{
  "short_name": "famcal",
  "name": "famcal.ai — Family Calendar",
  "icons": [
    { "src": "/favicon_64x64.png", "type": "image/png", "sizes": "64x64" },
    { "src": "/android_app_icon_512x512.png", "type": "image/png", "sizes": "512x512", "purpose": "any maskable" }
  ],
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5"
}
```

2. Wire Workbox service worker (already installed): configure `GenerateSW` or `InjectManifest` in `client/craco.config.js` or webpack config
3. `InstallPrompt.tsx` already handles the install prompt UI — just needs the manifest to be valid

PWA gives iOS Safari users an "Add to Home Screen" path without needing the App Store. Low effort, worth doing before Phase 4.

---

## Files to Touch (Summary)

| File | Change |
|---|---|
| `client/package.json` | Bump Capacitor to v7.x |
| `client/capacitor.config.ts` | Remove hardcoded keystore defaults |
| `client/android/app/build.gradle` | Fix applicationId to `ai.famcal.app` |
| `client/android/AndroidManifest.xml` | Fix namespace |
| `client/public/manifest.json` | Create (PWA) |
| `client/ios/` | Create (Phase 2) |

---

## Acceptance Criteria

- [ ] `npm run android:debug` builds and installs on an Android emulator without errors
- [ ] App launches with splash screen, no browser chrome visible
- [ ] All core flows work on mobile: login, view calendar, create event via NLP, edit event
- [ ] BottomSheet slides up correctly on mobile, centered on tablet/desktop
- [ ] Keyboard does not obscure input fields on iOS and Android
- [ ] iOS build compiles and runs in Xcode simulator
- [ ] PWA install prompt appears on Chrome Android and "Add to Home Screen" works on Safari iOS
- [ ] Play Store internal testing track has a working build
- [ ] App Store TestFlight has a working build

---

## Security Checklist Before Submission

- [ ] Production keystore stored securely (not in git)
- [ ] `cleartext: true` removed or restricted to dev builds in `capacitor.config.ts`
- [ ] No API keys hardcoded in any client-side code (they already live server-side — keep it that way)
- [ ] App privacy disclosure accurately describes data collection for App Store Connect
- [ ] `android:allowBackup="false"` set in AndroidManifest (prevents ADB backup of app data)

---

## When to Execute

**Don't start until:**
- You have ≥3 features you're confident in
- You've had at least a handful of real users (not just yourself) use the web app
- The NLP event creation flow feels reliable

**Do start Phase 1 (fix existing issues) any time** — it's low risk and unblocks everything else. Phases 2-4 can wait.

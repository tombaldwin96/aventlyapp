# Avently Mobile

Production-quality Expo React Native app that mirrors the Avently website theme and functionality. Shared Supabase project for auth and data with the web app.

## Setup

1. **Clone / open** the repo and go to the `mobile` folder:
   ```bash
   cd mobile
   ```

2. **Install dependencies** (already done if you created from template):
   ```bash
   npm install
   ```

3. **Environment variables**  
   Create a `.env` file at the **root of the `mobile` folder** (same level as `package.json`) with:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   EXPO_PUBLIC_APP_URL=https://www.avently.co.uk
   ```
   - Use the **same** Supabase project as the website so accounts and data are shared.
   - `EXPO_PUBLIC_APP_URL` is the base URL of the Avently web app (for `/api/auth/me` and other API calls). Use `http://localhost:3000` for local web dev.

4. **Assets**  
   - Place **`assets/logo.png`** in the `mobile` folder for the preload/splash logo (optional; app falls back to the default icon if missing).
   - Or replace `assets/images/icon.png` with your logo and keep the current preload screen.

## Run commands

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only, or use Expo Go)
npm run ios

# Run in web browser
npm run web
```

Use **Expo Go** on a device and scan the QR code for quick testing.

## Auth (email + OTP)

- **Flow:** Enter email → receive 6-digit code → enter code → signed in.
- **No passwords.** Same as the website (Supabase Auth with OTP).
- Sessions are stored in **expo-secure-store** and restored on app restart.
- Token refresh is handled by Supabase; you can stay logged in on web and app at the same time.
- After sign-in, the app calls `GET /api/auth/me` with `Authorization: Bearer <access_token>` so the web API can create/return your profile and role.

## Troubleshooting auth

1. **"Missing EXPO_PUBLIC_SUPABASE_URL"**  
   Add `.env` at the root of `mobile` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Restart the dev server after changing `.env`.

2. **OTP not received**  
   Check Supabase Dashboard → Authentication → Email Templates; ensure the template uses `{{ .Token }}` for the 6-digit code. Check spam.

3. **"Invalid or expired token" after entering OTP**  
   Ensure Supabase project is the same as the website. Use `verifyOtp({ email, token, type: 'email' })` (already used in the app).

4. **"Could not load profile" after OTP**  
   Set `EXPO_PUBLIC_APP_URL` to your web app URL (e.g. `https://www.avently.co.uk` or `http://localhost:3000`). The app calls `GET /api/auth/me` with the Supabase access token; the web app must be running and the route must accept Bearer token.

5. **Session not persisting**  
   The app uses `expo-secure-store` for Supabase session storage. On simulator/emulator, secure store can sometimes be cleared; try on a real device.

6. **Auth debug (dev only)**  
   When running in development, open Profile → "Auth debug (dev)" to see current user id, session expiry, profile role, and Supabase URL sanity (no secrets).

## Role-based dashboards

After login, users are routed by role:

- **END_USER** → Main app tabs (Search, Bookings, Messages, Profile).
- **PERFORMER** → Performer dashboard (bookings, availability, earnings).
- **BUSINESS** → Event host / business dashboard.
- **ADMIN** → Admin dashboard (overview, moderation).

## Deep linking

- **Scheme:** `avently://`
- **Examples:**
  - `avently://performer/123` — performer profile (configure route as needed).
  - `avently://booking/456` — booking details.
  - `avently://messages/789` — conversation.
- For **universal links** (e.g. `https://app.avently.co.uk/...`), configure your domain’s `apple-app-site-association` and `assetlinks.json` and wire them in the Expo config and Supabase redirect URLs when you’re ready.

## Building for TestFlight / Play Store

1. **EAS Build** (recommended):
   ```bash
   npm install -g eas-cli
   eas login
   eas build:configure
   eas build --platform ios
   eas build --platform android
   ```
   Set **EXPO_PUBLIC_*** and other env in EAS: **Project → Secrets and variables** (or `eas env:push`).

2. **Submit:**
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

3. **Over-the-air updates** (optional):
   ```bash
   eas update
   ```

## Tech stack

- **Expo** (SDK 54+) + **TypeScript**
- **expo-router** for file-based navigation and deep linking
- **@supabase/supabase-js** for auth and data (same project as web)
- **react-hook-form** + **zod** for forms and validation
- **@tanstack/react-query** for server state and caching
- **AsyncStorage** for persisted cache/session helpers
- **expo-image** for images (use where needed)
- **expo-secure-store** for Supabase session persistence

## Project layout (app/)

- `index.tsx` — Preload screen (3s), then redirect to login or app by session.
- `(auth)/login.tsx` — Email → OTP → verify.
- `(app)/(tabs)/` — Tabs for end users (Search, Bookings, Messages, Profile).
- `(app)/admin/`, `(app)/performer/`, `(app)/business/` — Role-specific dashboards.
- `(app)/(tabs)/auth-debug.tsx` — Dev-only auth debug (hidden from tab bar).

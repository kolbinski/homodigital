# homo-digital-app (A) — Feature Specification

Last updated: 2026-06-10

## Business Model

A (mobile app) is available to **Premium tier clients only** — those with an assigned human agent.

### Planned Features (not yet implemented)

- Subscription status screen (users.subscribed_to field)
- Pay-per-action billing history
- Agent view (/(agent)/) for agents managing their clients
- CV/CL preview (Gotenberg + Supabase Storage — partially implemented)

---

## Stack

- React Native + Expo SDK 54
- TypeScript (strict)
- Expo Router (file-based navigation)
- Zustand (auth store)
- React Query (staleTime: 5min)
- expo-secure-store (JWT storage)
- expo-notifications (push)
- phosphor-react-native (icons)
- react-native-webview (offer WebView)
- @react-native-community/datetimepicker
- babel-plugin-transform-remove-console (production builds)

## Package

- Bundle ID: io.homodigital.app
- EAS Project: kolbinski/homo-digital-app
- FCM V1: Service Account configured in EAS credentials

## Auth

- Unified login: POST /v1/auth/login
- JWT stored in expo-secure-store
- Role-based routing: agent → /(agent)/dashboard, client → /(client)/applications
- Zustand store with hydrated flag (prevents infinite loader on cold start)
- After login: registerPushToken() with projectId from Constants.expoConfig

## Screens

### Auth

- app/(auth)/login.tsx
  Dark theme (#000000 background)
  Logo (assets/android-icon-background.png) + "Homo Digital" title
  Subtitle describing platform
  Email + password inputs (dark style)
  Sign in button (green #16a34a)
  OR divider
  Join button (blue #2563eb) → /(auth)/join
  Email validation

- app/(auth)/join.tsx
  Dark theme
  Back arrow + "Join Homo Digital"
  Logo + title
  4 benefit bullets (✦ Premium)
  Email + "Tell us about yourself" textarea
  "Request access" button (green)
  POST /v1/prospects { email, notes, role: 'client' }
  Thank you success screen + Go back button
  Email validation

### Client

- app/(client)/applications.tsx (My Applications)
  Header: logo left, [Files icon→Reports] [Funnel/X] [Gear→Settings] right
  Filters (sticky, toggle with Funnel icon):
  - Status chips: Applied, Offer, Accepted, Rejected, Withdrawn
  - Source chips: All, JustJoin, NoFluffJobs
  - Date picker (single day, default last 30 days, modal with "Unspecified")
    SectionList grouped by applied_at date (Today/Yesterday/D Mon YYYY)
    Sections are collapsible accordions (CaretCircleUp/Down)
    Pull-to-refresh
    Scroll-to-top button (ArrowCircleUp, bottom right, shadow)
    Logout confirm modal (tap outside closes)

- app/(client)/sync-reports.tsx (Reports)
  Header: back arrow + "Reports"
  FlatList of sync report cards
  Each card: date + green circle (worth_applying count) + orange circle (level_up count)
  Tap → sync-report/[id]
  Pull-to-refresh
  Prevent multiple taps (navigating state + useFocusEffect reset)
  Scroll-to-top button

- app/(client)/sync-report/[id].tsx (Report for {date})
  Blue full-width box: scanned count + "new offers scanned"
  Worth applying accordion (green box, CaretCircleUp/Down)
  Level up & earn more accordion (orange box, CaretCircleUp/Down)
  No "Worth considering" section
  Scroll-to-top button

- app/(client)/settings.tsx
  Header: back arrow + "Settings"
  "Your agent" section label
  Agent card: photo (or initials fallback) + name in one row
  Email → mailto: link (Envelope icon)
  Phone → modal with Call / WhatsApp / Text options (Phone icon)
  Logout button (red, full width)
  Logout confirm modal (shared LogoutModal component)

### Shared

- app/offer.tsx (WebView)
  Back arrow header
  SafeAreaView wrapper
  WebView for offer URL

## Components

- src/components/OfferCard.tsx (unified for both screens)
  Props via adapter functions:
  userOfferToCardProps(offer: UserOffer): OfferCardProps
  syncOfferToCardProps(offer: SyncReportOffer): OfferCardProps

  Layout:
  Header row: [source icon] [score badge] [title @ company] — vertically centered
  Tags row: work_model, city (gray tags, below header, before salary)
  Salary lines: CurrencyCircleDollar icon + "PLN b2b 21 840 – 30 240 +8 240"
  delta in orange, delta_normalized in parentheses when currency !== PLN
  "Salary not disclosed" when salary empty or all min/max null
  role_fit text (gray, small)
  Missing skills: merged claude_missing_skills + skills_to_learn (unique, red badges)
  "View offer" button + ArrowSquareOut icon (blue) → opens offer.tsx WebView

  Score badge colors:
  ≥70: green (#f0fdf4 bg, #15803d text)
  ≥50: orange (#fefce8 bg, #a16207 text)
  <50: gray
  Hidden when score === 0

  Source icons:
  justjoin → assets/sources/justjoin.png
  nofluffjobs → assets/sources/nofluffjobs.png

- src/components/LogoutModal.tsx
  Shared between applications.tsx and settings.tsx
  Tap outside closes modal

## Utils

- src/utils/formatNum.ts — spaces as thousand separators (never toLocaleString)
- src/utils/validateEmail.ts — /^[^\s@]+@[^\s@]+\.[^\s@]+$/
- src/utils/registerPushToken.ts
  Requests permission → getExpoPushTokenAsync({ projectId }) → POST /v1/push-tokens
  Skips on simulator (Device.isDevice check)

## Store

- src/store/authStore.ts (Zustand)
  { token, role, userId, hydrated }
  hydrate(): reads from SecureStore, always sets hydrated=true
  setAuth(): saves to SecureStore
  clearAuth(): deletes from SecureStore, sets token=''

## Push Notifications

- Handler in app/\_layout.tsx:
  setNotificationHandler: shouldShowAlert, shouldPlaySound
  addNotificationResponseReceivedListener: foreground/background tap
  useLastNotificationResponse: cold start tap (waits for hydrated)

  Navigation on tap:
  type='sync_complete' + user_sync_id → /(client)/sync-report/{id}
  type='sync_complete' no id → /(client)/sync-reports
  type='applied' → /(client)/applications

## Navigation

- After login: router.replace() (not push) — no back history
- After logout: router.dismissAll() + router.replace('/(auth)/login')

## EAS Build

- eas.json profiles: development, preview, production
- All profiles: NPM_CONFIG_LEGACY_PEER_DEPS=true
- google-services.json: excluded from git, provided via EAS Secrets
- app.json: googleServicesFile, android.package=io.homodigital.app
- babel-plugin-transform-remove-console: production only

## Known Issues / Deferred

- iOS build not yet done (Android only)
- Agent view (/(agent)/) not yet implemented
- CV preview in app (needs Gotenberg + Supabase Storage)
- Badge on app icon (deferred)

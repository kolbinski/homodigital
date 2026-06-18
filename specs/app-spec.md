# homo-digital-app (A) — Feature Specification

Last updated: 2026-06-12

## Business Model

A (mobile app) is available to **Pro and Premium tier clients**.
- Pro: push notifications only
- Premium: full agent workflow

---

## Stack

- React Native + Expo SDK 54
- TypeScript (strict)
- Expo Router (file-based routing)
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
- versionCode: 1

## Distribution

- Google Play: account verified, requires 12 testers for 14 days before production
- Current plan: distribute APK directly for first Premium clients
- iOS: not yet built

## Auth

- Unified login: POST /v1/auth/login (email/password)
- JWT stored in expo-secure-store
- Role-based routing: agent → /(agent)/dashboard, client → /(client)/applications
- Zustand store with hydrated flag (prevents infinite loader on cold start)
- After login: registerPushToken() with projectId from Constants.expoConfig

## Screens

### Auth

- app/(auth)/login.tsx
  Dark theme (#000000 background)
  Logo + "Homo Digital" title
  Email + password inputs
  Sign in button (green #16a34a)
  OR divider
  Join button (blue #2563eb) → /(auth)/join
  Email validation

- app/(auth)/join.tsx
  Dark theme, back arrow
  Email + "Tell us about yourself" textarea
  "Request access" button (green)
  POST /v1/prospects { email, notes, role: 'client' }
  Thank you success screen

### Client

- app/(client)/applications.tsx (My Applications)
  Header: logo left, [Files→Reports] [Funnel/X] [Gear→Settings] right
  Status chips: Applied, Offer, Accepted, Rejected, Withdrawn
  Source chips: All, JustJoin, NoFluffJobs
  Date picker (single day, default last 30 days)
  SectionList grouped by applied_at date (Today/Yesterday/D Mon YYYY)
  Collapsible sections, pull-to-refresh, scroll-to-top

- app/(client)/sync-reports.tsx (Reports)
  FlatList of sync report cards
  Each card: date + green circle (worth_applying) + orange circle (level_up)

- app/(client)/sync-report/[id].tsx
  Blue box: scanned count
  Worth applying accordion (green)
  Level up accordion (orange)

- app/(client)/settings.tsx
  Agent card: photo/initials + name
  Email → mailto, Phone → Call/WhatsApp/Text modal
  Logout button (red)

### Shared

- app/offer.tsx — WebView for offer URL

## Components

- src/components/OfferCard.tsx
  Source icon + score badge + title + company
  Tags: work_model, city
  Salary with delta (orange), "Salary not disclosed" fallback
  Role fit text
  Missing skills (red badges)
  "View offer" button → WebView

  Score badge: ≥70 green, ≥50 orange, <50 gray, hidden when 0

- src/components/LogoutModal.tsx

## Utils

- src/utils/formatNum.ts — spaces as thousand separators
- src/utils/validateEmail.ts
- src/utils/registerPushToken.ts

## Push Notifications

- Handler in app/_layout.tsx
- Navigation on tap:
  type='sync_complete' + user_sync_id → sync-report/{id}
  type='applied' → /(client)/applications

## Employment type display

- 'contract' displayed (replaces old 'b2b')

## Known Issues / Deferred

- iOS build not yet done (Android only)
- Agent view (/(agent)/) not yet implemented
- Google Play — requires 12 testers for 14 days before production release
- CV preview in app (needs Gotenberg + Supabase Storage)

## Recent Changes (2026-06-12/13)

- claude_matched_reasons: pros/cons display in OfferCard
- employment_type: 'contract' replaces 'b2b'
- Supabase Realtime subscription for new offers (pending_apply INSERT events)

## Known Issues / TODO

- iOS build not yet done (Android only)
- Agent view not yet implemented
- Google Play: requires 12 testers for 14 days
- CV preview in app
- Supabase Realtime subscription to replace polling (blocked by user_id text type)

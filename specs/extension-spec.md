# homo-digital-extension (R) — Feature Specification

Last updated: 2026-06-09

## Stack
- React + TypeScript
- Vite (build)
- Chrome Extension Manifest V3
- Side Panel (chrome.sidePanel)
- Phosphor Icons
- Tailwind CSS
- babel-plugin-transform-remove-console (production builds via esbuild drop)

## Auth
- Login screen with agent credentials
- POST /v1/auth/login → JWT stored in chrome.storage.local
- Role: agent only
- Session persists across browser restarts

## Login Screen
- Logo (public/icons/logo.png) + "Homo Digital" title
- Hero text: "Help senior developers find better jobs. Earn doing it."
- 4 benefit bullets (✦ green)
- Box with "Login to your account" label
- Email + password inputs
- "Log in" button (green #16a34a)
- OR separator
- "Join" button (blue #2563eb) → Join view
- Email validation

## Join View
- Back arrow + "Become an agent"
- Hero text + 4 benefit bullets
- Email + "Your experience in IT / recruitment" textarea
- "Request access" button (green)
- POST /v1/prospects { email, notes, role: 'agent' }
- Thank you success screen + Go back button

## Tabs

### Explore Tab
Main agent workflow tab.

**Filters (sticky top):**
- Sort by: Score / Salary delta (chrome.storage.local)
- Status filter (chrome.storage.local)
- Source filter (server-side via offers.source)
- Min score slider (default 75, chrome.storage.local)

**Dynamic sections based on statusFilter:**
- pending_apply → "Worth applying" + "Level up & earn more"
- other statuses → single gray section

**Offer Cards:**
Header: source icon + score badge + title + company
Tags: work_model, city (gray tags below title)
Salary: "PLN b2b 21 840 – 30 240 +34 594 (30 835 PLN)" — delta orange
Role fit text
Missing skills: merged claude_missing_skills + skills_to_learn (red badges)

Score badge colors:
  ≥70: green, ≥50: orange, <50: gray

**Actions per offer:**
- Change status dropdown (custom, not native select)
  All statuses: applied, agent_withdrawn, recruiter_rejected,
                offer_received, accepted, client_withdrawn
  Optimistic update: card disappears immediately, reappears on error
  During API call: "Changing status..." label
  While loading: hide CV language select and Generate CV button

- CV Language select: pl / en
- Generate CV button → POST /v1/cv/generate → opens HTML in new tab

**Tab reuse for offer URLs:**
  openOfferUrl(url):
    1. If active tab is job board → update active tab URL
    2. Elif any tab starts with justjoin.it or nofluffjobs.com → update that tab
    3. Else → new tab
  JOB_BOARD_DOMAINS = ['https://justjoin.it', 'https://nofluffjobs.com']

**Scroll-to-top button:** ArrowCircleUp (Phosphor), bottom right

### Sync Tab
Visible only when settings.show_sync_tab_in_extension === true
(fetched from GET /v1/settings on load, default false until endpoint responds)

- "Sync job offers & send report to client" button (blue)
  POST /v1/sync
  Shows loading state during sync
  
- "Notify clients about new applications" button
  POST /v1/notifications/send
  Shows "Sending notifications..." during call
  Shows result message after call

### CV Tab (if exists)
CV generation history or preview.

## Settings Fetch
On load: GET /v1/settings
- show_sync_tab_in_extension: controls Sync tab visibility
- Fail silently, default false

## Chrome Permissions
- tabs (for tab reuse feature)
- sidePanel
- storage (chrome.storage.local for filter preferences)

## Tab State
- Tab state preserved via CSS display toggling (not unmount/remount)
- Filter preferences persisted in chrome.storage.local:
  sort_by, status_filter, source_filter, min_score

## Build
- npm run build → dist/ folder
- Production: esbuild drops console.* and debugger
- manifest.json version: keep updated before Chrome Web Store submission

## Chrome Web Store
- Status: pending verification
- Privacy Policy: https://homodigital.io/view.html?file=app-privacy-policy.md
- Description: see store listing copy
- Screenshots: 1+ prepared

## Known Issues / Deferred
- Client view not in R (handled by A)
- Agent dashboard/statistics not yet implemented

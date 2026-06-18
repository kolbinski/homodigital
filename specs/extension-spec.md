# homo-digital-extension (R) — Feature Specification

Last updated: 2026-06-12

## Business Model

R (Chrome extension) is the core tool available to **all tiers** (Free, Pro, Premium).

### Tier Limits in R

- **Free**: max 3 matched offers per month (enforced by API)
- **Pro**: unlimited offers
- **Premium**: unlimited offers + agent works on behalf of client

---

## Stack

- React + TypeScript
- Vite (build)
- Chrome Extension Manifest V3
- Side Panel (chrome.sidePanel)
- Phosphor Icons
- Tailwind CSS

## Auth

### Agent login
- Email/password (@homodigital.io addresses)
- POST /v1/auth/login → internal JWT stored in chrome.storage.local under 'jwt'

### Client login (Free/Pro)
- Social login via Supabase OAuth: Google ✅, GitHub ✅, Microsoft (UI only), Facebook (removed permanently)
- chrome.identity.launchWebAuthFlow → Supabase → internal JWT from POST /v1/auth/social-login
- Internal JWT stored in chrome.storage.local under 'jwt'
- Supabase JWT stored under 'supabase_jwt' (used for /v1/profile and /v1/onboarding/* endpoints)
- OAuth user data (name, email, photo) stored under 'oauth_data'
- Role stored under 'role' ('agent' | 'client')

### CONFIG flags (src/config.ts)
```typescript
export const CONFIG = {
  auth: {
    google: true,
    facebook: false,
    microsoft: false,
    github: true,
  },
  use_template_cv: true,
}
```

## Login Screen

- Logo + "Homo Digital" title
- Hero: "Stop searching for jobs. Start getting hired."
- 4 benefit bullets
- "Sign in" section:
  - Continue with Google (logo + label)
  - Continue with Microsoft (logo + label, CONFIG.auth.microsoft)
  - Continue with GitHub (logo + label)
  - Social login error shown below last button
- OR divider
- "Login as agent" section: email + password + Log in button
- "Join as agent" button

## Client Onboarding Flow

### Routing after login
1. GET /v1/profile → profile=null → Kickstart screen
2. profile≠null AND profile_ready=false → Wizard (tabs)
3. profile≠null AND profile_ready=true → Main client view (Explore & Apply)

### Kickstart Screen
- Title: "Let's get you started"
- Subtitle: "Drop your CV below and we'll build your profile in seconds. No forms, no hassle."
- Drag & drop / browse PDF upload area
- "Prepare my profile" button (green):
  - If CV uploaded: POST /v1/onboarding/prepare-profile → saves profile → wizard
  - If no CV: shows error "Please upload your CV first"
  - Loading: animated progress list (Reading basic data → work experience → own projects → education → certifications → skills → preferences → red flags), each item 4s
  - During loading: title → "Analyzing your CV...", gray subtitle about profile value, hide upload/skip/prepare button
- "Skip" button (hidden during loading): → wizard with OAuth pre-fill (name/email from oauth_data)
- Topbar: Gear icon (opens Settings drawer, disabled during loading)

### Onboarding Wizard
8 tabs with completion indicators:
- Green CheckCircle: tab complete
- Red badge with count: number of invalid/missing required fields
- Gray CircleDashed: optional tab, empty

Tab order: Basic Info / Work Exp / Skills / Preferences / Education / Own Projects / Certifications / Red Flags

**Required tabs:**
- Basic Info: first_name, last_name, email, gender, experience_level, job_search_status, languages (min 1 with name+level)
- Work Experience: min 1 entry (title, company, date_from, work_model); projects: role + min 1 achievement per project; date format YYYY-MM
- Skills: min 1 skill with 'since' year
- Preferences: salary (min 1 with min amount), work_model (min 1), target_role (min 1), employment_type (min 1)

**Optional tabs:** Education, Own Projects, Certifications, Red Flags

**Auto-save:** debounce 2s after any change → PATCH /v1/profile
**Bottom bar:** [red error count] ←space-between→ [Saving.../Saved  Review by AI  Submit]
- Review by AI: disabled when error count > 0; calls POST /v1/onboarding/review-profile; opens HTML in tab (reuses 'review_tab_id' from chrome.storage)
- Submit: disabled when error count > 0 or saving; PATCH /v1/profile { profile_ready: true } → POST /v1/profile/trigger-sync → main client view
- During Review by AI or Submit: close icon disabled, all inputs disabled

**Topbar:** Gear icon (Settings drawer)

### Tab: Basic Info
Fields: first_name*, last_name*, email* (blur validation), phone, github, linkedin, gender* (Male/Female chips), location (city, country select from settings.countries, max_distance slider KM/Miles), experience_level* (chips from settings.experience_levels), experience_since, job_search_status* (Seeking/Open/Passive chips), languages* (name from settings.languages, level from settings.language_levels), experience_in_industry (chips from settings.industries + custom), experience_in_country_markets (chips from settings.markets), soft_skills (textarea list with drag-drop), cv_summary_bullets (textarea list with drag-drop)

### Tab: Work Experience
Fields per entry: title*, company*, date_from* (YYYY-MM), date_to (YYYY-MM, hidden when currently_working=true), currently_working checkbox*, work_model* (Remote/Hybrid/Office chips), company_type (chips from settings.company_types), industry (chips from settings.industries + custom), location
Projects (min 1 per experience): name (required if 2+ projects), role*, skills (autocomplete from GET /v1/skills/search), team_size (select: 1/2-5/6-10/11-20/21-50/51-200/201-1000/1000+), achievements* (min 1, textarea with drag-drop)
Drag-drop reordering: experiences + projects within experience

### Tab: Skills
Categories from GET /v1/skill-categories (market=IT, ordered by sort_order)
Per category: skill chips with 'since' year (required), autocomplete from GET /v1/skills?category=&q= (startsWith first)
Drag-drop: categories + skills within category

### Tab: Preferences
Salary: type (Contract/Permanent chips), currency (settings.currencies), min amount*
Work model: Remote/Hybrid/Office chips*
Employment type: Contract/Permanent/Part-time chips*
Target role: textarea list with drag-drop*
Company type preferred/excluded: chips from settings.company_types
Industries: chips from settings.industries + custom
Markets: chips from settings.markets
Learning & skill goals: autocomplete from GET /v1/skills/search
Max office days: slider 0-7 (shown only when hybrid/office selected)
Office location cities: tag input (shown only when hybrid/office selected)

### Tab: Education
Fields: institution*, degree, field, thesis, gpa (text), date_from/to (YYYY-MM in one row)
Drag-drop reordering

### Tab: Own Projects
Fields: name*, urls (list of {label, url} pairs), skills (autocomplete GET /v1/skills/search), achievements* (min 1, textarea with drag-drop)
Drag-drop reordering (projects + achievements within project)

### Tab: Certifications
Fields: name* (textarea), issuer* (textarea), date (YYYY-MM validated), url (URL validated)
Drag-drop reordering

### Tab: Red Flags
Three fixed sections:
- Company type: multiselect chips from settings.company_types
- Skills to avoid: chip + autocomplete from GET /v1/skills/search + X to remove
- Other: predefined chips + custom chip input

## Main Client View (after onboarding)

Same Explore & Apply layout as agent view.
Single ClientAccordion for the logged-in user (GET /v1/clients returns own data).
Offers fetched from GET /v1/user-offers (no client_id param).
Empty state: "No offers yet. Your profile has been submitted and matches will appear here after the next sync."

## Agent View

### Explore & Apply Tab

**Filters (sticky):**
- Min score slider (default 75)
- Status filter
- Source filter (All/JustJoin/NoFluffJobs)
- Sort by (Score/Salary delta)
- Generated: CV/CL checkboxes

**Client accordions:**
- Header: avatar/initials + name + address book icon + refresh icon + collapse arrow
- Address book: opens profile wizard overlay (agent can edit client profile)
- Offers inside: offer cards with actions

**Offer card actions:**
- Change status dropdown
- CV Language select (pl/en)
- Generate CV → POST /v1/cv/generate → opens HTML in new tab
- Generate CL → POST /v1/cl/generate

### Sync Tab
Visible when settings.show_sync_tab_in_extension=true
- "Sync job offers" button → POST /v1/sync
- "Notify clients" button → POST /v1/notifications/send

## Profile Wizard Overlay (address book icon)
- Opens for both agent (editing client) and client (editing own profile)
- Fetches fresh GET /v1/profile on open
- Shows loading spinner while fetching
- Auto-save with PATCH /v1/profile (agent sends client_id in body)
- Close button (disabled during saving)
- No Submit button (profile_ready already true)
- Initial save status: "Saved"

## Settings Drawer
Opened via Gear icon in topbar (all views).
Sections:
- Feedback: textarea + Send button → POST /v1/feedback
- Account: Log out button (gray), Delete account button (red) with confirmation
- During delete: close icon + page disabled

## General Settings Cache
Fetched from GET /v1/general-settings on login, cached in chrome.storage.local with 24h TTL.
Contains: currencies, industries, markets, company_types, countries, languages, language_levels, experience_levels

## Chrome Permissions
- tabs, sidePanel, storage, identity, notifications (planned)

## Build
- npm run build → dist/
- Production: esbuild drops console.* and debugger

## Chrome Web Store
- Status: APPROVED AND LIVE ✅
- URL: https://chromewebstore.google.com/detail/homo-digital/ababdciakfnmllianckpkdnhkhgnagkm
- Extension ID: chjdjblpkfcngbjkphbjpnekekffjlli

## Known Issues / Deferred
- Microsoft social login (UI only, not wired)
- Dark mode (deferred)
- Chrome Notifications API after sync (TODO)
- Geocoding for location coordinates (deferred, Google Maps API)
- LinkedIn Profile Analyzer (planned)
- "Scan this page for job offer" feature (planned)

## Recent Changes (2026-06-12/13)

- Social login: Google ✅, GitHub ✅ (supabase_jwt + refresh_token stored)
- Onboarding wizard: all 8 tabs complete with full validation
- Auto-save: debounce 2s → PATCH /v1/profile
- Review by AI: POST /v1/onboarding/review-profile → HTML tab (reuses tab by ID)
- Profile wizard overlay via address book icon (agent + client)
- Settings drawer: Feedback + Logout + Delete account
- claude_matched_reasons: pros (green CheckCircle) + cons (orange WarningCircle)
- Blue dot notification on reload icon when new pending_apply offers arrive (polling 30s)
- Empty state for pending_apply (client): "We're scanning thousands of offers for you. Your matches will appear here after the next sync."
- Client accordion: expanded by default, avatar/initials in header
- Supabase Realtime attempted but blocked (user_id text type issue) — using polling

## Known Issues / TODO

- Microsoft social login (UI only, not wired)
- Dark mode (deferred)
- Chrome Notifications API after sync
- Geocoding for location coordinates (deferred)
- LinkedIn Profile Analyzer (planned)
- "Scan this page for job offer" (planned, Free: 5/mo, Pro: unlimited)
- Replace polling with in-memory SSE manager (API-side, post-INSERT notification)
- Tooltips throughout onboarding wizard ("UX dla idiotów")
- Cover letter generation flow in R
- Stripe Pro tier self-service
- Settings drawer tabs: Usage, Billing, notification hours, utc_offset

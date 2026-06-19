# homo-digital-extension (R) — Feature Specification

Last updated: 2026-06-19

## Business Model

R (Chrome extension) is the core tool available to **all tiers** (Free, Pro, Premium).

### Tier Limits in R

- **Free**: max 15 apply_now + 10 level_up offers (enforced by API free_plan_snapshot)
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
- Supabase JWT stored under 'supabase_jwt'
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
2. profile≠null AND profile_ready=false AND profile_editing_snapshot=null → Wizard (onboarding mode)
3. profile≠null AND (profile_ready=true OR profile_editing_snapshot≠null) → Main client view

### Kickstart Screen
- Title: "Let's get you started"
- Subtitle: "Drop your CV below and we'll build your profile in seconds. No forms, no hassle."
- Drag & drop / browse PDF upload area
- "Prepare my profile" button (green)
- "Skip" button
- Topbar: Gear icon (opens Settings drawer, disabled during loading)

### Wizard Mode Detection
- Derived from GET /v1/profile response (not chrome.storage):
  - profile_ready=false AND profile_editing_snapshot=null → **onboarding mode** (Submit button, no Cancel/Re-match)
  - profile_ready=true OR profile_editing_snapshot≠null → **post-onboarding mode** (Cancel changes + Re-match offers, no Submit)
- wizard_was_open flag in chrome.storage.local: wizard auto-reopens on R reopen in post-onboarding mode
- When R is closed and reopened while wizard was open: wizard reopens in correct mode (post-onboarding)

### Onboarding Wizard
8 tabs with completion indicators:
- Green CheckCircle: tab complete
- Red badge with count: number of invalid/missing required fields
- Gray CircleDashed: optional tab, empty

Tab order: Basic Info / Work Exp / Skills / Preferences / Education / Own Projects / Certifications / Red Flags

**Required tabs:**
- Basic Info: first_name, last_name, email, gender, experience_level, job_search_status, languages (min 1)
- Work Experience: min 1 entry (title, company, date_from, work_model)
- Skills: min 1 skill with 'since' year
- Preferences: salary (min 1 with min amount), work_model (min 1), target_role (min 1)

**Optional tabs:** Education, Own Projects, Certifications, Red Flags

**Auto-save:** debounce 2s after any change → PATCH /v1/profile

**Bottom bar (onboarding mode):** [red error count] ←→ [Saving.../Saved  Review by AI  Submit]
**Bottom bar (post-onboarding mode):** [red error count] ←→ [Saving.../Saved  Review by AI  Cancel changes  Re-match offers]

**Submit** (onboarding only): PATCH profile_ready=true → POST trigger-sync → main client view
**Cancel changes** (post-onboarding): closes wizard, restores snapshot
**Re-match offers** (post-onboarding): see Re-match flow below

**Wizard loading overlay:** white semi-transparent div with pointer-events:none covers entire wizard during:
- PATCH /v1/profile calls
- GET /v1/profile/has-relevant-changes
- POST /v1/profile/trigger-sync
- Any profile fetch on wizard open

### Re-match Flow (post-onboarding)
1. Click Re-match offers
2. Wizard immediately disabled (overlay)
3. GET /v1/profile/has-relevant-changes
   - Error → red box in place of status box: "Something went wrong. Please try again."
   - has_relevant_changes=false → PATCH profile, close wizard (no box shown, no sync triggered)
   - has_relevant_changes=true → continue
4. Set rematching=true (with requestAnimationFrame yield before clearing wizardLoading)
5. PATCH /v1/profile { profile_ready: true, profile_editing_snapshot: null }
6. POST /v1/profile/trigger-sync
   - 402 → show limit reached UI
   - success → close wizard
7. White status box shown during step 5-6: "Re-matching was initialized. First, we're deleting your previous job offers."

### Tab: Preferences
Salary: type (Contract/Permanent chips), currency (settings.currencies), min amount*
Work model: Remote/Hybrid/Office chips*
Target role: textarea list with drag-drop*
Company type preferred/excluded: chips from settings.company_types
Industries: chips from settings.industries + custom
Markets: chips from settings.markets
Learning & skill goals: autocomplete from GET /v1/skills/search
Max office days: slider 0-7 (shown only when hybrid/office selected)
Office location cities: tag input (shown only when hybrid/office selected)

Note: Employment type chips (Contract/Permanent/Part-time) **removed** — contract/permanent preference is now expressed only via salary preferences (preferences.salary[].type)

### Tab: Skills
Categories from GET /v1/skill-categories (market=IT, ordered by sort_order)
Per category: skill chips with 'since' year (required), autocomplete from GET /v1/skills?category=&q=
**Offer skills (orange chips):** when wizard opens on Skills tab, orange chips shown above existing skills per category
- Chips show: skill name + count badge + trash icon (dismiss)
- Clicking chip: adds skill to category with year-since input
- Trash icon: POST /v1/profile/dismiss-skill → removes chip
- Category accordions auto-expand for categories with offer_skills
- Only skills with was_categorized=true shown (properly categorized)

## Main Client View (after onboarding)

### Topbar
- Left: user avatar + name + email
- Right: address-book icon (blue dot when new_skills_count > knownNewSkillsCount) + gear icon
- Clicking address-book with blue dot: opens wizard on Skills tab
- Filters row: refresh icon (gray border) + Sort by (space-between)

### Apply now section
- Offers with status=pending_apply
- Count badge: total pending_apply count (before plan limit)
- Free plan: locked box at bottom when offers.length < total count

### Level up & earn more section
- Offers with status=ai_rejected AND claude_missing_skills not empty AND salary_delta IS NOT NULL
- Count badge: total level_up count (before plan limit)
- ALL offers in this section have salary information (enforced by API)
- Free plan: locked box at bottom when offers.length < total count

### Offer card
- Required skills: green tags (candidate has) + red tags (missing), sorted green first
- Nice to have skills: same coloring logic
- claude_matched_reasons: cons (orange WarningCircle) first, pros (green CheckCircle) after
- Salary always shown in Level up section (API guarantees salary_delta IS NOT NULL)

## Agent View

### Explore & Apply Tab

**Filters (sticky):**
- Min score slider (default 75)
- Status filter
- Source filter (All/JustJoin/NoFluffJobs) — hidden when show_source_filter=false
- Sort by (Score/Salary delta)
- Generated: CV/CL checkboxes

**Client accordions:**
- Header: avatar/initials + name + address book icon + refresh icon + collapse arrow
- Offers inside: offer cards with actions

**Offer card actions:**
- Change status dropdown
- CV Language select (pl/en/25 languages)
- Generate CV → POST /v1/cv/generate
- Generate CL → POST /v1/cl/generate

### Sync Tab
Visible when settings.show_sync_tab_in_extension=true

## Profile Wizard Overlay (address book icon)
- Opens for both agent (editing client) and client (editing own profile)
- Fetches fresh GET /v1/profile on open (wizard disabled during fetch)
- Auto-save with PATCH /v1/profile
- Close button (disabled during saving)
- No Submit button post-onboarding

## Settings Drawer
Sections:
- Feedback: textarea + Send button → POST /v1/feedback
- Account: Log out button (gray), Delete account button (red)

### Delete Account Flow
1. Click Delete account → storage cleared → offboarding screen shown
2. DELETE /v1/account called (fire and forget)
3. Offboarding: checkboxes from settings.delete_reasons
   - "Other" or "Technical issues" → textarea appears
4. Submit → POST /v1/account/delete-reasons + POST /v1/account/delete-feedback
5. Green checkmark: "Your account was deleted" + "Go to login screen" button (no auto-redirect)
6. account_deletion_in_progress flag in chrome.storage blocks 401 redirect during deletion

## General Settings Cache
Fetched from GET /v1/general-settings on login, cached in chrome.storage.local with 24h TTL.

## Chrome Permissions
- tabs, sidePanel, storage, identity, notifications (planned)

## Build
- npm run build → dist/
- Production: esbuild drops console.* and debugger

## Chrome Web Store
- Status: APPROVED AND LIVE ✅
- Extension ID: chjdjblpkfcngbjkphbjpnekekffjlli

## Recent Changes (2026-06-19)

### Wizard mode detection fix
- Mode derived from profile_editing_snapshot (not chrome.storage state)
- wizard_was_open in chrome.storage → auto-reopen wizard in correct mode after R restart
- profileLoading prop: wizard disabled during GET /v1/profile fetch on open

### Re-match flow overhaul
- GET /v1/profile/has-relevant-changes called before trigger-sync
- No status box shown when has_relevant_changes=false
- Red error box on has-relevant-changes failure
- wizardLoading=true during has-relevant-changes + PATCH profile + trigger-sync
- requestAnimationFrame yield between setRematching(true) and setWizardLoading(false)

### Employment type removed from Preferences tab
- Contract/Permanent/Part-time chips removed
- Preference now expressed only via salary expectations (type: contract/permanent)

### Offer skills (orange chips) in Skills tab
- Orange chips above existing skills per category
- Only skills with was_categorized=true shown
- Blue dot on address-book icon when new_skills_count increases
- Auto-expand category accordions with offer_skills

### Level up section
- Only shows offers with salary (API guarantees salary_delta IS NOT NULL)
- "Salary not disclosed" can no longer appear in Level up

### Deduplication
- Duplicate offers no longer shown (dedupKey applied in API snapshot)

## Recent Changes (2026-06-13)

### Free/Pro tier UI
- Combined call: status=pending_apply|ai_rejected
- Apply now / Level up badges show totals before plan limit
- Locked box when plan limit reached

### Offer card
- Required/nice-to-have skills: green (have) + red (missing), sorted green first
- Removed separate "Missing:" section
- claude_matched_reasons: cons first, pros after

### Profile wizard
- profile_ready=false set on wizard open
- Close icon behavior based on validation errors
- Submit button only during onboarding

## Recent Changes (2026-06-12)

- Social login: Google ✅, GitHub ✅
- Onboarding wizard: all 8 tabs complete
- Auto-save, Review by AI, Profile wizard overlay
- Blue dot polling 30s

## Known Issues / TODO

- Microsoft social login (UI only, not wired)
- Dark mode (deferred)
- Chrome Notifications API after sync
- Geocoding for location coordinates (deferred)
- LinkedIn Profile Analyzer (planned)
- "Scan this page for job offer" (planned, Free: 5/mo, Pro: unlimited)
- Replace polling with in-memory SSE manager
- Tooltips throughout onboarding wizard
- Cover letter generation flow in R
- Settings drawer tabs: Usage, Billing, notification hours, utc_offset
- Free "Frozen offers" UI: banner "You have X new matches — upgrade to see them"
- Interview recording feedback (Premium, GDPR-constrained)

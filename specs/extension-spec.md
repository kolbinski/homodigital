# homo-digital-extension (R) — Feature Specification

Last updated: 2026-06-24

## Business Model

R (Chrome extension) is the core tool available to **all tiers** (Free, Pro, Premium).

### Tier Limits in R

- **Free**: max 30 status changes total (no monthly reset), enforced by API (status_change_counter / status_change_counter_max)
- **Pro**: unlimited status changes, unlimited offers
- **Premium**: unlimited + agent works on behalf of client

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
- OAuth cancel (user closes login window): silently ignored — no error shown

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
  - Social login error shown below last button (not shown on user cancel)
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
- Drag & drop / browse PDF upload area — always shows "Drag & drop or browse" text (no filename shown)
- On file drop/select: immediately triggers prepare-profile action (no separate button needed)
- "Skip" button
- Topbar: Gear icon (opens Settings drawer, disabled during loading)

### Wizard Mode Detection
- Derived from GET /v1/profile response (not chrome.storage):
  - profile_ready=false AND profile_editing_snapshot=null → **onboarding mode** (Submit button, no Cancel/Re-match)
  - profile_ready=true OR profile_editing_snapshot≠null → **post-onboarding mode** (Cancel changes + Re-match offers, no Submit)
- wizard_was_open flag in chrome.storage.local: wizard auto-reopens on R reopen in post-onboarding mode

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

**Salary input (min amount):** type="text" with digit-only filter; onBlur normalizes value; Submit/Re-match disabled while salary input has focus

**Wizard loading overlay:** white semi-transparent div with pointer-events:none covers entire wizard during:
- PATCH /v1/profile calls
- GET /v1/profile/has-relevant-changes
- POST /v1/profile/trigger-sync
- Any profile fetch on wizard open

### Re-match Flow (post-onboarding)
1. Click Re-match offers
2. Wizard immediately disabled (overlay)
3. GET /v1/profile/has-relevant-changes
   - Error → red box: "Something went wrong. Please try again."
   - has_relevant_changes=false → PATCH profile, close wizard
   - has_relevant_changes=true → continue
4. PATCH /v1/profile { profile_ready: true, profile_editing_snapshot: null }
5. POST /v1/profile/trigger-sync → close wizard
6. Status box: "Re-matching was initialized. First, we're deleting your previous job offers."

### Tab: Preferences
Salary: type (Contract/Permanent chips), currency (settings.currencies), min amount*
Work model: Remote/Hybrid/Office chips*
Target role: textarea list with drag-drop*
Company type preferred/excluded: chips from settings.company_types
Industries, Markets, Learning & skill goals, Max office days, Office location cities

Note: Employment type chips removed — contract/permanent via salary preferences only

### Tab: Skills
Categories from GET /v1/skill-categories
Per category: skill chips with 'since' year, autocomplete from GET /v1/skills
**Offer skills (orange chips):** when wizard opens on Skills tab
- Only skills with was_categorized=true shown
- Clicking chip adds skill; trash icon dismisses

## Main Client View (after onboarding)

### Topbar
- Left: user avatar + name + email
- Right: address-book icon (blue dot when new_skills_count > knownNewSkillsCount) + gear icon

### Filters Row
- Status select (options: Pending apply [default], Applied, Withdrawn, Recruiter rejected, Offer received, Accepted, All)
  - status=pending_apply sends status=pending_apply|ai_rejected to API
- Min score slider (default 0) — triggers user-offers only on mouseUp/touchEnd (not onChange)
- Sort by select (persisted in chrome.storage.local)
- With salary checkbox (persisted under 'hd_with_salary')
- Only starred checkbox (persisted under 'hd_only_starred')
- Generated CV checkbox (persisted under 'hd_generated_cv')
- Generated CL checkbox (persisted under 'hd_generated_cl')
- Debounce 300ms on filter changes + AbortController to cancel in-flight requests
- Exception: "Show more" and per-section refresh fire immediately (no debounce)

### Section Accordions
Always shown regardless of offer count. Order: Apply now, Level up, Applied, Withdrawn, Recruiter rejected, Offer received, Accepted.

Accordion open/closed state persisted in chrome.storage.local under 'accordion_state'. Default: all open.

**Accordion header:**
- Section name
- Badge: [{count_after_filters}/{count}] — when count_after_filters === count: show [{count}]
- Refresh icon (right side) — clicking any section's refresh re-fetches that section only:
  - Apply now / Level up refresh → status=pending_apply|ai_rejected
  - Other sections → status={that section's status}
  - Shows loader inside that section's content only (other sections unchanged)
  - Blue dot on refresh icon when section.count differs from last known_*_count

**Pagination:** each section has own "Show more" + page counter (page_apply_now, page_level_up, etc.). All counters reset on refresh.

**known_*_count params:** always sent in every GET /v1/user-offers call:
known_apply_count, known_level_up_count, known_applied_count, known_withdrawn_count,
known_recruiter_rejected_count, known_offer_received_count, known_accepted_count
Updated after each response. Used for blue dot logic (compare against section.count, not count_after_filters).

**setInterval polling (30s):** reads all params from refs (not state) to avoid stale closure. Params include: status, min_score, sort_by, is_starred, with_salary, generated_cv, generated_cl, page_size, all page_* counters, all known_*_count values.

### Apply now section
- status=pending_apply offers
- Empty state: apply_now.count === 0 → "We're scanning thousands of offers for you. Your matches will appear here shortly."
- Empty state: apply_now.count > 0 but offers empty (filters active) → "No offers found."

### Level up section
- status=ai_rejected AND missing_skills not empty AND salary_delta IS NOT NULL

### Status change limit (Free plan)
- status_change_counter and status_change_counter_max from GET /v1/user-offers response
- When counter >= max (and max not null): show "Upgrade to Pro" box in Apply now section
- On status change attempt → 402 → show box in "Offer on this page" card under Set status select
- Box includes green "Upgrade to Pro" button → opens Stripe checkout directly (no drawer)
- After successful upgrade: auto-retry the blocked status change

### Offer card
- Row: star icon (★/☆) + work model tag + city + copy icon (copies offer_url to clipboard, shows Check icon for 1.5s)
- "Published X days ago" / "Published today" / "Published yesterday" — between salary and required skills
- Required skills: green (have) + red (missing), sorted green first
- Nice to have skills: same coloring
- claude_matched_reasons: cons (orange) first, pros (green) after
- Star toggle: shows spinner during PATCH /v1/user-offers/:id/star; each card independent
- When "Only starred" filter active and star toggled to false → offer immediately removed from section, count/count_after_filters decremented

### is_starred sync
- Star toggle in "Offer on this page" → updates matching offer in all section listings (by user_offer_id)
- Star toggle in section listing → updates "Offer on this page" if same user_offer_id

## Offer on this page

Always visible when offer page is open, regardless of offer status or active filters.

- "Published X days ago" / "Published today" / "Published yesterday" shown between salary and required skills
- Star icon — same behavior as in offer card (spinner during call, synced with listings)
- is_starred returned from GET /v1/user-offers/by-url (includes is_starred field)

### Set status select
- Shows "curr. {status}" label — special cases:
  - ai_rejected → "curr. pending apply" (visual only, status not changed)
  - client_withdrawn → "curr. withdrawn"
- Options hidden dynamically: option matching current status not shown
- ai_rejected offers: "Pending apply" option not shown
- During status change call: select disabled, label replaced with spinner
- Error box directly below select (inside card):
  - Generic error: "Failed to update status. Please try again."
  - 402 error: "You've used all {status_change_counter_max} free status changes. Upgrade to Pro to continue." + green "Upgrade to Pro" button

### Status change → optimistic update
- On success: offer removed from old section's offers array, count/count_after_filters decremented
- Blue dot shown on target section's refresh icon (known_*_count decremented for target section)

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
- CV Language select (25 languages)
- Generate CV → POST /v1/cv/generate
- Generate CL → POST /v1/cl/generate

### Sync Tab
Visible when settings.show_sync_tab_in_extension=true

## Profile Wizard Overlay (address book icon)
- Opens for both agent and client
- Fetches fresh GET /v1/profile on open
- Auto-save with PATCH /v1/profile
- Close button (disabled during saving)

## Settings Drawer

### Usage section
- Shows counters for: CV, Cover Letter, AI Profile Reviews, Change status
- Change status stat: shown only when status_change_counter_max is not null (Free plan)
- Data sourced from GET /v1/subscription/status (not from user-offers response)

### Account section
- Log out, Delete account

### Delete Account Flow
1. Click Delete account → storage cleared → offboarding screen
2. DELETE /v1/account (fire and forget)
3. Offboarding: checkboxes (settings.delete_reasons) + feedback textarea always visible
4. Submit → POST /v1/account/delete-reasons + POST /v1/account/delete-feedback
5. "Your account was deleted" + "Go to login screen" button

## General Settings Cache
Fetched from GET /v1/general-settings on login, cached in chrome.storage.local with 24h TTL.

## Chrome Storage Keys
- jwt, supabase_jwt, oauth_data, role
- hd_sort_by, hd_min_score, hd_with_salary, hd_only_starred, hd_generated_cv, hd_generated_cl
- accordion_state (object: { apply_now, level_up, applied, client_withdrawn, recruiter_rejected, offer_received, accepted } — all default true)
- wizard_was_open
- account_deletion_in_progress

## Chrome Permissions
- tabs, sidePanel, storage, identity, notifications (planned)

## Build
- npm run build → dist/
- Production: esbuild drops console.* and debugger

## Chrome Web Store
- Status: APPROVED AND LIVE ✅
- Extension ID: chjdjblpkfcngbjkphbjpnekekffjlli

## Recent Changes (2026-06-24)

### Starred offers
- is_starred Boolean on user_offer — star icon (★/☆) on offer card row
- Spinner during PATCH /v1/user-offers/:id/star call (per card)
- "Only starred" checkbox filter (persisted: hd_only_starred)
- Star toggled to false while filter active → offer immediately removed from section
- is_starred synced bidirectionally between section listings and "Offer on this page"

### Section accordions refactor
- Always shown regardless of offer count
- Per-section badge: [{count_after_filters}/{count}]
- Per-section refresh icon (blue dot based on count, not count_after_filters)
- Accordion state persisted in chrome.storage.local (default: all open)
- Per-section refresh fetches only that section's status
- Per-section loading state (only refreshed section shows loader)

### Filters improvements
- Status select restored with "All" option; default: Pending apply
- status=pending_apply → API param status=pending_apply|ai_rejected
- Min score slider: triggers only on mouseUp/touchEnd (no onChange trigger)
- Debounce 300ms on all filter changes + AbortController for in-flight cancellation
- generated_cv, generated_cl persisted in chrome.storage.local
- Global refresh icon removed (replaced by per-section refresh)

### Status change limit UI
- 402 → "You've used all X free status changes. Upgrade to Pro to continue." box inside "Offer on this page" card
- Green "Upgrade to Pro" button → Stripe checkout directly (no drawer)
- After upgrade: auto-retry blocked status change
- Settings / Usage: "Change status" stat for Free plan users (from GET /v1/subscription/status)

### Offer on this page improvements
- Always visible regardless of offer status or filters
- "curr. ai_rejected" → "curr. pending apply" (visual label)
- "curr. client_withdrawn" → "curr. withdrawn"
- Options hidden dynamically (current status not shown)
- ai_rejected offers: no "Pending apply" option
- Spinner + disabled select during status change call
- Error box inside card, directly below Set status select
- Star icon with same behavior as offer card
- "Published X days ago" label between salary and required skills
- On status change success: offer removed from old section, blue dot on target section

### Offer card improvements
- Copy icon after city — copies offer_url, shows Check icon 1.5s
- "Published X days ago" / "Published today" / "Published yesterday" between salary and required skills

### Kickstart screen
- Drag & drop triggers prepare-profile immediately on file select (no button)
- Always shows "Drag & drop or browse" (no filename displayed)
- "Prepare my profile" button removed

### Polling fix
- All params read from refs in setInterval callback (no stale closures)
- known_*_count params always sent; never suppress offers[] (blue dot only)

## Known Issues / TODO

- Microsoft social login (UI only, not wired)
- Dark mode (deferred)
- Chrome Notifications API after sync (notify when new offers arrive)
- Geocoding for location coordinates (deferred)
- LinkedIn Profile Analyzer (planned)
- "Scan this page for job offer" (planned, Free: 5/mo, Pro: unlimited)
- Replace polling with in-memory SSE manager
- Tooltips throughout onboarding wizard
- Cover letter generation flow in R
- Settings drawer: Billing tab, notification hours, utc_offset
- Free "Frozen offers" banner: "You have X new matches — upgrade to see them"
- Interview recording feedback (Premium, GDPR-constrained)

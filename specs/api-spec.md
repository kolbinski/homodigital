# job-matcher-api — Feature Specification

Last updated: 2026-06-24

## Business Model

### Tiers

- **Free** — access to R only, max 30 status changes (no reset)
- **Pro** — access to R + A (push notifications), unlimited offers, ~49-79 PLN/month via Stripe
- **Premium** — Pro + human agent, pay-per-action pricing

### Premium Pay-Per-Action (planned)

- Application submitted by agent
- Employer call before interview
- Candidate interview prep
- Salary negotiation
- Profile Review (available to ALL tiers as a paid one-time action — first touchpoint in Free/Pro→Premium funnel)

### App Access

- R (Chrome extension): Free + Pro + Premium
- A (mobile app): Pro (push notifications) + Premium (full agent workflow)

### Implementation Status

- Free/Pro: in progress
- Premium: planned after Free/Pro launch
- Stripe integration: active (checkout + webhooks)

### Geographic Expansion

- 🇵🇱 Poland: active (NoFluffJobs approved ✅, JustJoin pending, theprotocol.it pending)
- 🇺🇸 USA: active expansion plan
  - Indeed: re-evaluation submitted (rejected ATS path)
  - Dice: call scheduled with Max Foster (max.foster@dice.com) — postponed until Free/Pro ready
  - Wellfound: email sent (talent@wellfound.com)
  - LinkedIn: not viable (requires incorporated company + long partner process)
  - Glassdoor: API discontinued
  - MVP path: accept US users with manual offer paste before job board integrations are ready

---

## Stack

- Node.js + TypeScript + Express
- PostgreSQL (Supabase) + Prisma ORM
- Zod validation
- Claude API (Anthropic)
- Railway (production)
- Gotenberg (PDF generation, same Railway project)

## Database Schema

### users

- id, email, password (nullable — null for social login users)
- profile Json? (full candidate profile JSON — null until onboarding complete)
- profile_ready Boolean @default(false)
- profile_editing_snapshot Json? (snapshot of profile saved when wizard opens for editing)
- profile_synced_at DateTime? (null = needs sync; set to NOW() after sync)
- sync_started_at DateTime? (set when sync begins; used to cancel stale batches + optimistic lock for snapshot writes)
- pending_rematch Boolean @default(false) (deprecated — no longer used; can be removed)
- offer_skills Json? (array of { name, count, category_name, dismissed } — missing skills from ai_rejected offers)
- photo_url String? (populated from OAuth provider on social login)
- jobmatcher_api_key String? (null for Free/Pro until activated)
- show_agent_info_in_cv Boolean @default(true)
- send_job_applied_notifications_hour Int @default(17)
- send_sync_report_notifications_hour Int @default(9)
- utc_offset Int @default(1)
- subscribed_to DateTime? (Pro subscription expiry)
- status_change_counter Int @default(0) — incremented on every status change (Free plan only)
- status_change_counter_max Int? — max allowed status changes; null = unlimited (Pro/Premium); set from plans.max_status_change on account creation
- created_at, updated_at

Note: first_name, last_name, gender removed — stored in profile.basic_info instead
Note: free_plan_snapshot removed — replaced by status_change_counter limit; all users now served from real DB

### agents

- id, email, password, first_name, last_name
- first_name_genitive String? (for Polish grammar)
- last_name_genitive String? (for Polish grammar)
- phone String?
- photo_url String?
- created_at, updated_at

### agent_clients

- agent_id, user_id (composite PK)
- ON DELETE CASCADE on user_id

### offers

- id, title, company_name, url, source (justjoin|nofluffjobs)
- required_skills String[], nice_to_have_skills String[]
- employment_types Json (array of { type, currency, from, to, unit, ... })
- workplace_type, city, experience_level, working_time
- fetched_at, is_active
- expired_at DateTime? (from JustJoin API; for NoFluffJobs = posted + 30 days)
- Marked is_active=false at start of each scrape when expired_at < NOW()

### user_offers

- id, user_id, offer_id
- status (pre_filter_rejected|ai_rejected|pending_apply|applied|agent_withdrawn|
  recruiter_rejected|offer_received|accepted|client_withdrawn)
- claude_score, claude_role_fit, claude_matched_reasons Json { pros: string[], cons: string[] }
- claude_recommended Boolean
- missing_skills String[] (computed locally from offer required/nice-to-have skills not in user profile — NOT from Claude)
- salary_contract_delta Float? (delta vs user's contract salary preference)
- salary_permanent_delta Float? (delta vs user's permanent salary preference)
- salary_currency String?
- cv_status String? (null|'generating'|'done'|'error')
- cv_url String?
- cl_status String? (null|'generating'|'done'|'error')
- cl_url String?
- is_starred Boolean @default(false)
- matched_at DateTime
- created_at, updated_at
- ON DELETE CASCADE on user_id

Note: salary_min, salary_max, salary_type, claude_salary_comparison removed

### Status assignment rules (at match time)

- claude_recommended=true OR missing_skills=[] → status='pending_apply'
- claude_recommended=false AND missing_skills not empty → status='ai_rejected'
- missing_skills computed locally: (required_skills + nice_to_have_skills) minus user's profile skills (case-insensitive)
- Claude prompt instructs: recommended=false when required skills are from completely different domain (e.g. Java for Frontend Engineer)

### Bucket definitions (at read time)

- **Apply now** = status='pending_apply'
- **Level up** = status='ai_rejected' AND array_length(missing_skills,1)>0 AND (salary_contract_delta IS NOT NULL OR salary_permanent_delta IS NOT NULL)
- **Hidden** = status='ai_rejected' AND salary_contract_delta IS NULL AND salary_permanent_delta IS NULL

### user_offer_statuses tracking

Only action-based status changes are tracked (not initial assignment):
- Tracked: applied, agent_withdrawn, recruiter_rejected, offer_received, accepted, client_withdrawn, pending_apply (when manually set by user)
- NOT tracked: pre_filter_rejected, ai_rejected (set once at match time, no history needed)

### user_offer_statuses

- id, user_offer_id, status, client_notified Boolean @default(false)
- created_at
- ON DELETE CASCADE on user_offer_id

### user_syncs

- id, user_id
- report Json {scanned, worth_applying[], level_up[], worth_considering[]}
- created_at
- ON DELETE CASCADE on user_id

### push_tokens

- id, user_id, token, platform (android|ios)
- created_at, updated_at
- ON DELETE CASCADE on user_id

### subscriptions

- user_id, plan_id, ...
- ON DELETE CASCADE on user_id

### prospects

- id, email, role (client|agent), status (pending|replied|joined)
- notes String?
- created_at

### settings

- key, value
- Keys: max_level_up=40, show_sync_tab_in_extension=true,
  fetch_offers_after_build=true, drop_offers_after_build=false,
  general_settings (JSON),
  claude_models (JSON: { matching, cv, cl, skill_categorization, prepare_profile, review_profile, scan_page_model }),
  claude_batch_size,
  anthropic_pricing (JSON keyed by exact model name: { "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 }, "claude-sonnet-4-6": { input: 3.0, output: 15.0 }, "claude-opus-4-8": { input: 5.0, output: 25.0 } }),
  dev_mode (JSON: { ai_max_batches, ai_batch_size } — limits Claude batches in development)

### skill_categories

- id, name, market (IT|other), sort_order
- translations Json? (translations of category name in 25 languages)

### skills

- id, name, category_id
- was_categorized Boolean @default(false)
  - true = skill has been assigned a real category by the categorizer cron
  - false = new skill not yet categorized (falls back to 'Other' in offer_skills)
- Auto-populated from offers.required_skills|nice_to_have_skills on each offer upsert
- Categorized automatically by cronjob every hour via Claude API

### offer_fetches

- id, source, new_inserts_count, fetched_at
- One row per page per source, only when new_inserts_count > 0

### notification_locks

- id, lock_key String @unique (format: {type}:{userId}:{YYYY-MM-DD})
- created_at

### feedbacks

- id, message, user_id String?, agent_id String?, source ('app'|'extension')
- created_at

### user_deleted

- user_id, email, delete_reasons String[], feedback String?
- created_at, updated_at
- No FK on users (intentionally — user already deleted)

### plans

- id, name
- limits Json { max_apply_now, max_level_up } (null = unlimited)
- max_status_change Int? (null = unlimited; 30 for free)
- features Json

### ai_usage

- id, user_id String? (nullable, no FK), action, model, tokens_in, tokens_out
- created_at

---

## API Endpoints

### Auth

- POST /v1/auth/login
  Body: { email, password }
  Response: { token, role: 'agent'|'client', user_id?, agent_id? }
  Logic: checks agents table first, then users table

- POST /v1/auth/social-login (Supabase JWT)
  Upserts user in public.users, issues internal JWT
  Sets status_change_counter_max from plans.max_status_change (free plan) on create
  Response: { token, role: 'client', user_id }

### Offers

- GET /v1/user-offers
  Auth: agent JWT (requires client_id param) or client JWT (uses own user_id)
  Params:
    status (pipe-separated; 'all' returns all sections)
    min_score, sort_by, page_size
    page_apply_now, page_level_up, page_applied, page_client_withdrawn,
    page_recruiter_rejected, page_offer_received, page_accepted (all default 1)
    with_salary (boolean), is_starred (boolean), generated_cv (boolean), generated_cl (boolean)
    known_apply_count, known_level_up_count, known_applied_count, known_withdrawn_count,
    known_recruiter_rejected_count, known_offer_received_count, known_accepted_count
  Response structure (always):
    {
      client_id,
      new_skills_count,
      status_change_counter,
      status_change_counter_max,
      [section_key]: {
        count,              // total without filters, without plan limits
        count_after_filters, // after with_salary/is_starred/generated_cv/cl filters, without limits
        offers[],           // paginated
        has_more
      }
    }
  Sections returned depend on status param:
    status=pending_apply|ai_rejected → apply_now, level_up
    status=all → apply_now, level_up, applied, client_withdrawn, recruiter_rejected, offer_received, accepted
    status={single} → {single section}
  All users served from real DB (no snapshot); single unified code path
  Accordion order in R: Apply now, Level up, Applied, Withdrawn, Recruiter rejected, Offer received, Accepted

- PATCH /v1/user-offers/:id/status
  Auth: agent JWT or client JWT
  Body: { status }
  Allowed statuses: pending_apply, applied, agent_withdrawn, recruiter_rejected, offer_received, accepted, client_withdrawn
  Free plan limit: if status_change_counter >= status_change_counter_max → 402 { error: 'free_limit_reached' }
  If status_change_counter_max IS NULL → no limit, counter not incremented
  Otherwise: increment status_change_counter after successful change

- PATCH /v1/user-offers/:id/star
  Auth: client JWT
  Toggles is_starred on the user_offer
  Response: { is_starred: boolean }

### CV & Cover Letter Generation

- POST /v1/cv/generate (agent JWT)
  Body: { client_id, offer_text, cv_language, job_title, company_name, user_offer_id }
  Response: { cv_url, cv_status }
  PDF via Gotenberg → Supabase Storage bucket 'homo-digital' at cvs/{email}/{filename}.pdf

- POST /v1/cl/generate (agent JWT)
  Body: { client_id, offer_text, cl_language, job_title, company_name, user_offer_id }
  Response: { cl_url, cl_status }
  PDF stored at cls/{email}/{filename}.pdf

### Sync

- POST /v1/sync (agent JWT)
  Runs full sync for all agent clients

- POST /v1/profile/trigger-sync (client JWT)
  Triggers async sync for authenticated user (202 Accepted)
  Sets free_plan_snapshot=null immediately on matchingRelevantChange=true (before any Claude work)
  sync_started_at used as optimistic lock: buildAndSaveFreePlanSnapshot checks sync_started_at hasn't changed before writing
  If sync already in progress: cancels current sync (sets sync_started_at=null) and restarts immediately with latest profile
  Smart salary-only re-sync:
  - Salary increase (all new minimums >= old): partial re-sync without Claude — recalculate deltas, reject below new minimum
  - Salary decrease (any new minimum < old): partial re-sync — keep existing offers, run Claude for newly qualifying pre_filter_rejected
  - All other changes: full re-sync (delete stale offers, run Claude matching)

- GET /v1/profile/has-relevant-changes (client JWT)
  Response: { has_relevant_changes: boolean }

- GET /v1/profile (client or agent JWT)
  Response: { profile, profile_ready, profile_editing_snapshot, offer_skills }

- PATCH /v1/profile (client or agent JWT)
  Body: { profile?, profile_ready?, profile_editing_snapshot?, client_id? }

- POST /v1/profile/dismiss-skill (client JWT)
  Body: { name: string }

### Onboarding

- POST /v1/onboarding/prepare-profile (client JWT)
  Body: multipart/form-data, field: cv (PDF)
  Response: { profile: Json }

- POST /v1/onboarding/review-profile (client JWT)
  Body: { profile: Json }
  Response: HTML string

### Skills

- GET /v1/skill-categories (public)
- GET /v1/skills (public) — Params: category, q
- GET /v1/skills/search (public) — Params: q

### General Settings

- GET /v1/general-settings (public)
  Returns: { currencies, industries, markets, company_types, countries, languages (25 ISO 639-1 codes), language_levels, experience_levels }

### User Syncs

- GET /v1/user-syncs (client JWT)
- GET /v1/user-syncs/:id (client JWT)

### Notifications

- POST /v1/notifications/send (agent JWT)
- POST /v1/push-tokens (client JWT)

### Agent

- GET /v1/agent/me (client JWT)

### Clients

- GET /v1/clients (agent or client JWT)

### Prospects

- POST /v1/prospects (public)
- GET /v1/prospects (agent JWT)

### Settings

- GET /v1/settings (agent JWT)

### Subscription

- GET /v1/subscription/status (client JWT)
  Returns { subscribed_to, status_change_counter, status_change_counter_max }
- POST /v1/subscriptions/checkout (client JWT)
  Returns { url }
- POST /v1/webhooks/stripe

### Feedback

- POST /v1/feedback (client or agent JWT)

### Account

- DELETE /v1/account (client or agent JWT)
  Staged batched deletion (1000 rows at a time)
- POST /v1/account/delete-reasons (client JWT)
- POST /v1/account/delete-feedback (client JWT)

---

## Scraping

- Sources: JustJoin.it, NoFluffJobs
- NoFluffJobs: official approval ✅
- JustJoin: awaiting approval
- Schedule: 6:45 AM + hourly 7:00-15:00 weekdays
- Normalization: b2b → contract, onsite/on-site → office
- After each offer upsert: required_skills + nice_to_have_skills upserted into skills table
- At start of each scrape: offers with expired_at < NOW() marked is_active=false

## Matching (Claude API)

- Pre-filter: workplace, salary type (from preferences.salary[].type), salary amount, seniority, language, red_flags, city, skill_excluded
- Claude batch: chunks configurable via settings.claude_batch_size (default 50), 3 parallel batches
- Fields from Claude: score, role_fit, matched_reasons { pros, cons }, recommended, offer_language (ISO 639-1, all 25 supported)
- missing_skills: computed locally — NOT from Claude
- Status assignment: recommended=true OR missing_skills=[] → pending_apply; recommended=false AND missing_skills not empty → ai_rejected
- offer_language: Claude detects from offer text, supports all 25 ISO 639-1 codes (not limited to pl/en); used as cv_language on user_offer

## Offer Skills (offer_skills on users table)

- Populated during matching for ai_rejected offers
- Only skills with was_categorized=true added
- Schema: { name, count, category_name, dismissed }

## Skill Categorization System

- Cronjob every hour: up to 500 was_categorized=false skills → Claude API (claude-haiku-4-5-20251001) → assigns category
- One-time script: scripts/runSkillCategorization.ts

## Deduplication

- dedupKey: title, company_name, experience_level, workplace_type, required_skills (sorted), nice_to_have_skills (sorted), city (context-aware)
- source and employment_types removed from key
- city context-aware: remote-only users → city=null; hybrid/office → matched against office_location_cities
- Tie-break: dedup_source_preference (default 'justjoin') → highest claude_score → most recent matched_at
- Dedup before Claude: ~70% fewer Claude API calls

## Free Plan — Status Change Limit

- Replaces the old free_plan_snapshot system (removed)
- All users served from real DB — single unified GET /v1/user-offers path
- Free plan limit: 30 status changes total (no monthly reset)
- Tracked via users.status_change_counter (incremented) and users.status_change_counter_max (set from plans.max_status_change on account creation)
- status_change_counter_max=null → no limit (Pro/Premium)
- 402 { error: 'free_limit_reached' } returned when counter >= max

## CV & Cover Letter Templates

- CV template: src/templates/cv.html — lang="{{LANG}}" dir="{{TEXT_DIRECTION}}" (both dynamic)
- Cover letter template: src/templates/cover_letter.html — lang="{{LANG}}"
- Languages: 25 languages with RTL support (Arabic, Hebrew)
- PDF: Gotenberg ✅

## Scheduled Jobs

- Fetch offers: 6:45 AM + hourly 7:00-15:00 weekdays
- Profile sync queue: every 15 minutes
- Hourly notification job, hourly sync report job
- Skill categorizer: every hour

## Push Notifications

- Provider: Expo Push API
- FCM V1 with Service Account JSON
- Types: sync_complete, applied

## Supabase DB Trigger

handle_new_user() — fires on INSERT OR UPDATE to auth.users:
- Upserts public.users with id, email, photo_url

## Recent Changes (2026-06-24)

### Starred offers
- is_starred Boolean @default(false) added to user_offers
- PATCH /v1/user-offers/:id/star — toggles is_starred, returns { is_starred }
- is_starred returned in all user_offers responses including GET /v1/user-offers/by-url
- GET /v1/user-offers: is_starred filter param — filters all sections to starred offers only (counts toward count_after_filters, not count)

### Free plan snapshot removed
- users.free_plan_snapshot column removed
- buildAndSaveFreePlanSnapshot() deleted
- All users now served from real DB — single unified GET /v1/user-offers path
- Replaced by status_change_counter / status_change_counter_max limit system

### Status change limit (Free plan)
- plans.max_status_change Int? added (free=30, pro/premium=null)
- users.status_change_counter Int @default(0) added
- users.status_change_counter_max Int? added — set from plans.max_status_change on account creation
- PATCH /v1/user-offers/:id/status enforces limit: 402 when counter >= max
- pending_apply now allowed as a target status in PATCH /v1/user-offers/:id/status
- GET /v1/subscription/status returns status_change_counter, status_change_counter_max

### GET /v1/user-offers refactor
- New response structure: per-section objects with count, count_after_filters, offers[], has_more
- count = total without any filters or plan limits
- count_after_filters = after with_salary, is_starred, generated_cv, generated_cl filters; without limits
- status=all returns all 7 sections; status=pending_apply|ai_rejected returns apply_now+level_up
- Per-section pagination: page_apply_now, page_level_up, page_applied, page_client_withdrawn, page_recruiter_rejected, page_offer_received, page_accepted
- known_*_count params accepted but never suppress offers[] (used by R for blue dot logic only)
- Filters: with_salary, is_starred, generated_cv, generated_cl, min_score, sort_by

### offer_language — all 25 languages
- Claude tool schema: enum ['pl','en'] removed → type: string, ISO 639-1
- TypeScript type 'pl'|'en' → string throughout
- Parser: any valid 2+ char string → lowercased; fallback 'en'
- coverLetterGenerator.ts and cvGenerator.ts: binary pl/en check replaced with dynamic language lookup
- cv.html: lang="pl" → lang="{{LANG}}" (dynamic, same as cover_letter.html)

### sync_started_at as optimistic lock
- buildAndSaveFreePlanSnapshot (now removed) used sync_started_at to prevent stale syncs from overwriting newer snapshots
- sync_started_at still used for cancel/restart logic in trigger-sync

## Recent Changes (2026-06-23)

### free_plan_snapshot = null on matchingRelevantChange
- trigger-sync sets free_plan_snapshot=null immediately after matchingRelevantChange=true confirmed, before any Claude work or salary branches
- Prevents R from showing stale snapshot during re-sync
- sync_started_at updated simultaneously as optimistic lock token

### status_change_counter_max fix
- upsert update block in POST /v1/auth/social-login now sets status_change_counter_max when null (same pattern as cv_counter_max)
- max_status_change field name corrected (was mistakenly referenced as max_status_change on User model)

## Recent Changes (2026-06-22)

### Race condition fix (snapshot writes)
- buildAndSaveFreePlanSnapshot checks sync_started_at before writing: if mismatch → skip (newer sync took over)
- Prevents old sync from overwriting null snapshot set by newer trigger-sync

## Recent Changes (2026-06-20)

### Smart salary-only re-sync
- Salary increase: partial re-sync without Claude
- Salary decrease: partial re-sync with Claude for newly qualifying offers
- Concurrent trigger-sync: cancels and restarts immediately

### missing_skills computed locally
- Removed from Claude tool schema
- Column renamed: claude_missing_skills → missing_skills

### Salary columns refactor
- Removed: salary_min, salary_max, salary_type, claude_salary_comparison
- Added: salary_contract_delta, salary_permanent_delta

### Offer expiry
- offers.expired_at added

## Known Issues / TODO

- Supabase Realtime not working for user_offers — workaround: polling every 30s; better fix: in-memory SSE manager
- Ghosting Detector: cron at 3am, applied > 21 days → ghosted_by_recruiter status
- Micro-feedback loop: popup on client_withdrawn from pending_apply
- profile_calibrated_at timestamp for Profile Review tracking
- user_id columns: migrate from text to uuid across all tables
- homodigital.io rewrite for Free/Pro/Premium model
- claude_recommended field: redundant with status, consider removing
- Chrome Notifications API in R for new-offer alerts
- "Scan this page for job offer" feature in R (Free: 5/mo, Pro: unlimited)
- Interview recording feedback (Premium, GDPR-constrained)
- Homo Digital employer API (long-term)
- Weekly digest email: "You have X new matches"
- Salary negotiation hints based on market data
- pending_rematch column: can be removed (no longer used)
- Email to NoFluffJobs requesting faster API response times

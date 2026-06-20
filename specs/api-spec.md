# job-matcher-api — Feature Specification

Last updated: 2026-06-20

## Business Model

### Tiers

- **Free** — access to R only, max 3 matched offers per month
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
- Stripe integration: planned for Pro tier

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
- sync_started_at DateTime? (set when sync begins; used to cancel stale batches)
- pending_rematch Boolean @default(false) (deprecated — no longer used; trigger-sync now cancels and restarts immediately)
- offer_skills Json? (array of { name, count, category_name, dismissed } — missing skills from ai_rejected offers)
- photo_url String? (populated from OAuth provider on social login)
- jobmatcher_api_key String? (null for Free/Pro until activated)
- show_agent_info_in_cv Boolean @default(true)
- send_job_applied_notifications_hour Int @default(17)
- send_sync_report_notifications_hour Int @default(9)
- utc_offset Int @default(1)
- subscribed_to DateTime? (Pro subscription expiry)
- created_at, updated_at

Note: first_name, last_name, gender removed — stored in profile.basic_info instead

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
- matched_at DateTime
- created_at, updated_at
- ON DELETE CASCADE on user_id

Note: salary_min, salary_max, salary_type, claude_salary_comparison removed — never read from DB (response recomputes from offer.employment_types)

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
- Tracked: applied, agent_withdrawn, recruiter_rejected, offer_received, accepted, client_withdrawn
- NOT tracked: pre_filter_rejected, ai_rejected, pending_apply (set once at match time, no history needed)

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

- id, name, limits Json { max_apply_now, max_level_up } (null = unlimited)
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
  Response: { token, role: 'client', user_id }

### Offers

- GET /v1/user-offers
  Auth: agent JWT (requires client_id param) or client JWT (uses own user_id)
  Params: client_id, status (pipe-separated), source, date_from, date_to, has_learning_skills_goals
  Response (single status): { client_id, status, count, offers[] }
  Response (pipe-separated): { count, new_skills_count, apply_now: { count, offers, status }, level_up: { count, offers, status } }
  Free plan: returns from free_plan_snapshot (deduplicated, capped to plan limits)
  Pro plan: live query, deduplicated via dedupKey fingerprint
  Level up offers: status=ai_rejected AND claude_missing_skills not empty AND salary_delta IS NOT NULL
  new_skills_count: count of offer_skills with dismissed=false and was_categorized=true

- PATCH /v1/user-offers/:id/status
  Auth: agent JWT
  Body: { status }

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
  If sync already in progress: cancels current sync (sets sync_started_at=null) and restarts immediately with latest profile
  Smart salary-only re-sync:
  - If ONLY preferences.salary changed AND all new minimums >= old minimums (salary increase): partial re-sync without Claude — recalculate salary_contract_delta/permanent_delta, mark offers below new minimum as pre_filter_rejected, rebuild snapshot
  - If ONLY preferences.salary changed AND any new minimum < old minimum (salary decrease): partial re-sync — keep existing pending_apply/ai_rejected, run Claude only for newly qualifying pre_filter_rejected offers
  - If salary decreased but no existing offers to preserve: fall through to full sync
  - All other changes: full re-sync (delete stale offers, run Claude matching)
  Log: salary-only change detected with old→new values

- GET /v1/profile/has-relevant-changes (client JWT)
  Compares current profile vs profile_editing_snapshot using same stableStringify logic as trigger-sync
  Response: { has_relevant_changes: boolean }
  Used by R before showing Re-match confirmation box

- GET /v1/profile (internal JWT)
  Auth: client JWT (own profile) or agent JWT with ?client_id param
  Response: { profile: Json | null, profile_ready: boolean, profile_editing_snapshot: Json | null, offer_skills: OfferSkill[] }
  offer_skills filtered to dismissed=false only

- PATCH /v1/profile (internal JWT)
  Auth: client JWT (own) or agent JWT with client_id in body
  Body: { profile?: Json, profile_ready?: boolean, profile_editing_snapshot?: Json | null, client_id?: string }
  Sets profile_synced_at = null after save

- POST /v1/profile/dismiss-skill (client JWT)
  Body: { name: string }
  Sets offer_skills[name].dismissed = true

### Onboarding

- POST /v1/onboarding/prepare-profile (internal JWT)
  Body: multipart/form-data, field: cv (PDF)
  Extracts PDF text → Claude API → returns { profile: Json }
  Normalizes work_model values: onsite/on-site → office

- POST /v1/onboarding/review-profile (internal JWT)
  Body: { profile: Json }
  Claude returns JSON → Node builds HTML report
  Response: HTML string with Tailwind CDN
  Tab title: "Homo Digital - Profile Review"

### Skills

- GET /v1/skill-categories (public)
  Returns { categories: string[] } filtered by market='IT', ordered by sort_order

- GET /v1/skills (public)
  Params: category (required), q (optional)
  Returns { skills: string[] } — startsWith first, then contains, limit 20

- GET /v1/skills/search (public)
  Params: q (required)
  Returns { skills: [{ name, category }] } across all IT categories — startsWith first, then contains, limit 20
  Empty q → []

### General Settings

- GET /v1/general-settings (public)
  Returns parsed general_settings JSON:
  { currencies, industries, markets, company_types, countries, languages, language_levels, experience_levels }

### User Syncs

- GET /v1/user-syncs (client JWT)
  Returns list of sync reports, Params: limit=20
- GET /v1/user-syncs/:id (client JWT)

### Notifications

- POST /v1/notifications/send (agent JWT)
- POST /v1/push-tokens (client JWT)
  Body: { token, platform }

### Agent

- GET /v1/agent/me (client JWT)
  Returns { id, first_name, last_name, email, phone, photo_url }

### Clients

- GET /v1/clients (agent JWT or client JWT)
  Agent: returns list of agent's clients
  Client: returns own user data as single-item array (with first_name/last_name from profile.basic_info)

### Prospects

- POST /v1/prospects (public) — upserts by email
- GET /v1/prospects (agent JWT)

### Settings

- GET /v1/settings (agent JWT)

### Subscription

- GET /v1/subscription/status (client JWT)
  Returns { subscribed_to: Date | null }
- POST /v1/subscriptions/checkout (client JWT)
  Creates Stripe Checkout Session, returns { url }
- POST /v1/webhooks/stripe
  Handles checkout.session.completed (upgrade to Pro) and customer.subscription.deleted (downgrade to Free)

### Feedback

- POST /v1/feedback (client or agent JWT)
  Body: { message: string, source: 'app' | 'extension' }

### Account

- DELETE /v1/account (client or agent JWT)
  Staged deletion to avoid timeout:
  1. Supabase auth.users deletion
  2. Batched delete user_offer_statuses (1000 rows at a time via $executeRaw)
  3. Batched delete user_offers (1000 rows at a time via $executeRaw)
  4. deleteMany: agent_clients, subscriptions, push_tokens, user_syncs
  5. prisma.user.delete (CASCADE handles any remaining FKs)
  6. CV/CL files deleted from Supabase Storage (best-effort)
  Note: ai_usage rows intentionally NOT deleted (anonymized cost records)

- POST /v1/account/delete-reasons (client JWT)
  Body: { user_id, delete_reasons: string[] }
  Saves to user_deleted table

- POST /v1/account/delete-feedback (client JWT)
  Body: { user_id, feedback: string }
  Saves to user_deleted table

---

## Scraping

- Sources: JustJoin.it, NoFluffJobs
- NoFluffJobs: official approval ✅
- JustJoin: awaiting approval
- Schedule: 6:45 AM + hourly 7:00-15:00 weekdays
- Normalization: b2b → contract, onsite/on-site → office
- After each offer upsert: required_skills + nice_to_have_skills upserted into skills table (was_categorized=false for new entries)
- At start of each scrape: offers with expired_at < NOW() marked is_active=false
- JustJoin: expired_at from API response
- NoFluffJobs: expired_at = offer.posted + 30 days
- offer_fetches: one row per page per source, only when new_inserts_count > 0
- Single scrape run guaranteed (startup calls routed through runSync() to honor syncInProgress flag)
- drop_offers_after_build setting: when true, clears all offers/user_offers/offer_fetches on startup, resets user sync state

## Matching (Claude API)

- Pre-filter: workplace, salary type (derived from preferences.salary[].type), salary amount, seniority, language, red_flags, city, skill_excluded
- Employment type filter: offer rejected if none of its employment_types match any type in user's preferences.salary[].type
- Claude batch: chunks configurable via settings.claude_batch_size (default 50), 3 parallel batches
- Scoring: 0-100
- Fields from Claude: score, role_fit, matched_reasons { pros, cons }, recommended
- missing_skills: computed locally from (required_skills + nice_to_have_skills) minus user skills — NOT from Claude
- Status assignment: recommended=true OR missing_skills=[] → pending_apply; recommended=false AND missing_skills not empty → ai_rejected
- Matching completion log: input tokens, output tokens, estimated cost (from settings.anthropic_pricing)

## Offer Skills (offer_skills on users table)

- Populated during matching: for ai_rejected offers, missing required/nice-to-have skills upserted to users.offer_skills
- Only skills with was_categorized=true (real category assigned) are added
- Schema per entry: { name, count, category_name, dismissed }
- count: incremented each time skill appears in a new ai_rejected offer
- dismissed: user can dismiss a skill chip (POST /v1/profile/dismiss-skill)
- Used in R Skills tab: orange chips above existing skills, per category

## Skill Categorization System

- skills table auto-populated from offers on each scrape (was_categorized=false for new entries)
- Cronjob every hour: reads up to 500 was_categorized=false skills, calls Claude API (model: settings.claude_models.skill_categorization = claude-haiku-4-5-20251001), assigns category_id + sets was_categorized=true
- Non-matched skills also get was_categorized=true (to avoid infinite loop), category_id remains null
- One-time script: scripts/runSkillCategorization.ts — processes all uncategorized skills immediately
- ai_usage saved for each categorization batch

## Deduplication

- dedupKey fingerprint: source, title, company_name, experience_level, workplace_type, working_time, required_skills (sorted), nice_to_have_skills (sorted), employment_types (sorted), city
- Applied in: GET /v1/user-offers (multi-status and single-status paths), buildAndSaveFreePlanSnapshot
- Tie-break: keep highest claude_score; if equal, keep most recent matched_at

## Free Plan Snapshot

- Built at end of each sync: buildAndSaveFreePlanSnapshot in syncService.ts
- apply_now: all pending_apply, deduplicated, capped to plan.limits.max_apply_now
- level_up: ai_rejected AND missing_skills not empty AND (salary_contract_delta IS NOT NULL OR salary_permanent_delta IS NOT NULL), deduplicated, capped to plan.limits.max_level_up
- counts reflect snapshot totals (already deduplicated)
- Stored in users.free_plan_snapshot Json?

## Scheduled Jobs

- Fetch offers: 6:45 AM + hourly 7:00-15:00 weekdays
- Profile sync queue: every 15 minutes — syncs users where profile_ready=true AND profile_synced_at IS NULL
- Hourly notification job: per user.send_job_applied_notifications_hour
- Hourly sync report job: per user.send_sync_report_notifications_hour (once per day guard)
- Skill categorizer: every hour — categorizes up to 500 was_categorized=false skills via Claude API

## Push Notifications

- Provider: Expo Push API (free)
- FCM V1 with Service Account JSON configured in EAS
- Types: sync_complete (with user_sync_id), applied
- Token registration: POST /v1/push-tokens after login

## CV & Cover Letter Templates

- CV template: src/templates/cv.html
- Cover letter template: src/templates/cover_letter.html
- Languages: 25 languages with RTL support (Arabic, Hebrew)
- Each language entry includes: locale, gdpr text, best_regards, cv_labels, present_label, native_label, language_names, rtl boolean
- PDF: Gotenberg (gotenberg.railway.internal:3000) ✅
- Storage: Supabase Storage bucket 'homo-digital'
- Email path sanitization: @→_at_, .→_, +→_

## Supabase DB Trigger

handle_new_user() — fires on INSERT OR UPDATE to auth.users:
- Upserts public.users with id, email, photo_url (from OAuth metadata)
- ON CONFLICT (id) DO UPDATE email, photo_url, updated_at

## Recent Changes (2026-06-20)

### Smart salary-only re-sync
- POST /v1/profile/trigger-sync now detects salary-only profile changes
- Salary increase (all new minimums >= old): partial re-sync without Claude — recalculates deltas, rejects offers below new minimum, rebuilds snapshot
- Salary decrease (any new minimum < old): partial re-sync — keeps existing offers, runs Claude only for newly qualifying pre_filter_rejected offers
- If salary decreased but user_offers empty: falls through to full sync
- Concurrent trigger-sync now cancels current sync and restarts immediately (no more pending_rematch queue)

### missing_skills computed locally
- Removed missing_skills from Claude tool schema — Claude no longer determines missing skills
- missing_skills computed locally: (required_skills + nice_to_have_skills) − user profile skills (case-insensitive)
- Column renamed: claude_missing_skills → missing_skills
- Claude prompt strengthened: recommended=false when required skills are from completely different domain

### Salary columns refactor
- Removed: salary_min, salary_max, salary_type, claude_salary_comparison (never read from DB)
- Added: salary_contract_delta Float?, salary_permanent_delta Float?
- salary_currency remains (one currency per offer)
- Response salary[] array: up to 2 entries (contract and/or permanent)
- Backfill script: scripts/backfill-salary-deltas.ts

### user_offer_statuses cleanup
- No longer inserting status rows for: pre_filter_rejected, ai_rejected, pending_apply
- Only action-based transitions tracked: applied, agent_withdrawn, recruiter_rejected, offer_received, accepted, client_withdrawn

### Offer expiry
- offers.expired_at DateTime? added
- JustJoin: expired_at from API
- NoFluffJobs: expired_at = posted + 30 days
- At start of each scrape: expired offers marked is_active=false

### offer_fetches improvements
- Renamed new_upserts_count → new_inserts_count
- Only inserted when new_inserts_count > 0
- One row per page per source

### Scraping improvements
- Single scrape run guaranteed (startup calls route through runSync())
- [offerSync][source] prefix in all per-source logs
- Raw API count logged per page
- drop_offers_after_build setting for clean DB reset

### anthropic_pricing refactor
- Keyed by exact model name: { "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 }, ... }
- Matching completion log: input tokens, output tokens, estimated cost

## Recent Changes (2026-06-19)

### Offer status taxonomy
- New status assignment rules at match time (see Status assignment rules above)
- Level up redefined: ai_rejected + missing_skills not empty + salary_delta IS NOT NULL
- Offers with ai_rejected + missing_skills=[] now get status=pending_apply (apply now, user decides)
- Hidden offers: ai_rejected + salary_delta IS NULL (not shown in any section)

### Employment type filter
- Removed preferences.employment_type from profile schema and pre-filter
- Pre-filter now derives accepted employment types from preferences.salary[].type
- Offer rejected if none of its employment_types match any type in preferences.salary[].type
- Employment type chips removed from wizard Preferences tab

### Skill categorization
- skills.was_categorized Boolean column added
- Backfill: skills with real (non-Other IT/other) categories marked was_categorized=true
- offerSync.ts: upserts skills from each offer into skills table after offer upsert
- Cronjob every hour: categorizes uncategorized skills via Claude API (model: skill_categorization)
- offer_skills only includes skills with was_categorized=true
- One-time script scripts/runSkillCategorization.ts for immediate backfill

### Deduplication fix
- Dedup (dedupKey) now applied in buildAndSaveFreePlanSnapshot (was missing)
- Dedup applied in single-status path of GET /v1/user-offers (aligned with multi-status)

### Re-match flow improvements
- GET /v1/profile/has-relevant-changes: fast check before trigger-sync
- R calls has-relevant-changes before showing Re-match box and calling trigger-sync
- wizard loading overlay covers full wizard during PATCH profile, has-relevant-changes, and trigger-sync calls

### Wizard mode detection
- ClientView.tsx derives onboarding vs post-onboarding mode from profile_editing_snapshot
- profile_editing_snapshot not null OR profile_ready=true → post-onboarding (Cancel + Re-match)
- profile_editing_snapshot null AND profile_ready=false → onboarding (Submit)
- wizard_was_open flag in chrome.storage: wizard auto-reopens on R reopen in post-onboarding mode

### Account deletion fix
- DELETE /v1/account now uses staged batched deletion (see Account endpoint above)
- Prevents statement timeout on users with large user_offers counts
- Post-deletion: user_deleted table records reasons and feedback
- Idempotency guard: second concurrent call returns 200 without re-deleting

## Recent Changes (2026-06-13)

### Plans & Subscriptions
- New Prisma models: Plan, Subscription
- Seeded plans: free (max_apply_now:15, max_level_up:10), pro (unlimited), premium (unlimited)
- GET /v1/user-offers: applies plan limits, returns grouped response with pipe-separated status
- Stripe: POST /v1/subscriptions/checkout, POST /v1/webhooks/stripe

### Matching
- sync_started_at added to users table
- Overlap ratio scoring rule, pros/cons prompt simplified
- Matching model configurable via settings.claude_models

### Profile wizard flow
- profile_editing_snapshot added
- PATCH /v1/profile with profile_ready=true: returns matching_relevant_change boolean
- POST /v1/profile/trigger-sync: batched deletion, clears locks

## Recent Changes (2026-06-12)

- claude_matched_reasons: { pros: string[], cons: string[] }
- Claude batch size configurable, 3 parallel batches, tool_use structured output
- DELETE /v1/account: explicit batch delete
- RLS on user_offers, indexes added

## Known Issues / TODO

- Supabase Realtime not working for user_offers (text type user_id issue)
- Current workaround: polling every 30s in R
- Better fix: in-memory SSE manager in API
- Ghosting Detector: cron at 3am, applied > 21 days → ghosted_by_recruiter
- Micro-feedback loop: popup on client_withdrawn from pending_apply
- profile_calibrated_at timestamp for Profile Review tracking
- user_id columns: migrate from text to uuid across all tables
- homodigital.io rewrite for Free/Pro/Premium model
- Free "Frozen offers": banner "You have X new matches — upgrade to see them"
- claude_recommended field: redundant with status, consider removing in future cleanup
- Chrome Notifications API in R for new-offer alerts
- "Scan this page for job offer" feature in R
- Interview recording feedback feature (Premium, GDPR-constrained)
- Homo Digital employer API (long-term)
- Starred offers feature (★ toggle on offer card, filter by starred, always visible regardless of plan)
- Email to NoFluffJobs requesting faster API response times
- Weekly digest email: "You have X new matches"
- Ghosting detector: applied > 21 days without response → ghosted_by_recruiter status
- Salary negotiation hints based on market data
- pending_rematch column: can be removed (no longer used)

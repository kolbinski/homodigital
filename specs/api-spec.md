# job-matcher-api — Feature Specification

Last updated: 2026-06-12

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
- profile_synced_at DateTime? (null = needs sync; set to NOW() after sync)
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

### offers

- id, title, company, url, source (justjoin|nofluffjobs)
- salary Json, required_skills, workplace_type, city
- fetched_at, is_active

### user_offers

- id, user_id, offer_id
- status (pre_filter_rejected|ai_rejected|pending_apply|applied|agent_withdrawn|
  recruiter_rejected|offer_received|accepted|client_withdrawn)
- claude_score, claude_role_fit, claude_matched_reasons, claude_missing_skills
- claude_recommended Boolean
- cv_status String? (null|'generating'|'done'|'error')
- cv_url String?
- cl_status String? (null|'generating'|'done'|'error')
- cl_url String?
- created_at, updated_at

### user_offer_statuses

- id, user_offer_id, status, client_notified Boolean @default(false)
- created_at

### user_syncs

- id, user_id
- report Json {scanned, worth_applying[], level_up[], worth_considering[]}
- created_at

### push_tokens

- id, user_id, token, platform (android|ios)
- created_at, updated_at

### prospects

- id, email, role (client|agent), status (pending|replied|joined)
- notes String?
- created_at

### settings

- key, value
- Keys: max_level_up=40, show_sync_tab_in_extension=true,
  fetch_offers_after_build=true, general_settings (JSON)

### skill_categories

- id, name, market (IT|other), sort_order

### skills

- id, name, category_id (3196 records)

### offers_fetches

- id, source, new_upserts_count, fetched_at, cronjob_id

### notification_locks

- id, lock_key String @unique (format: {type}:{userId}:{YYYY-MM-DD})
- created_at

### feedbacks

- id, message, user_id String?, agent_id String?, source ('app'|'extension')
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
  Params: client_id, status, source, date_from, date_to, has_learning_skills_goals
  Response: { client_id, status, count, offers[] }

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
  Immediately triggers async sync for authenticated user (fire and forget, 202 Accepted)
  Sets profile_synced_at = null before starting

### Profile

- GET /v1/profile (internal JWT)
  Auth: client JWT (own profile) or agent JWT with ?client_id param
  Response: { profile: Json | null, profile_ready: boolean }

- PATCH /v1/profile (internal JWT)
  Auth: client JWT (own) or agent JWT with client_id in body
  Body: { profile?: Json, profile_ready?: boolean, client_id?: string }
  Sets profile_synced_at = null after save
  Deletes user_offers with status IN ('pending_apply', 'ai_rejected') on profile change

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

### Feedback

- POST /v1/feedback (client or agent JWT)
  Body: { message: string, source: 'app' | 'extension' }

### Account

- DELETE /v1/account (client or agent JWT)
  Hard delete: auth.users + public.users + push_tokens + agent_clients

---

## Scraping

- Sources: JustJoin.it, NoFluffJobs
- NoFluffJobs: official approval ✅
- JustJoin: awaiting approval
- Schedule: 6:45 AM + hourly 7:00-15:00 weekdays
- Normalization: b2b → contract, onsite/on-site → office

## Matching (Claude API)

- Pre-filter: workplace, employment_type, salary, seniority, language, red_flags, city, skill_excluded
- Claude batch: chunks of 100 offers
- Scoring: 0-100
- Fields: score, role_fit, matched_reasons, missing_skills, recommended, skills_to_learn
- max_level_up: 40 (from settings)

## Scheduled Jobs

- Fetch offers: 6:45 AM + hourly 7:00-15:00 weekdays
- Profile sync queue: every 15 minutes — syncs users where profile_ready=true AND profile_synced_at IS NULL
- Hourly notification job: per user.send_job_applied_notifications_hour
- Hourly sync report job: per user.send_sync_report_notifications_hour (once per day guard)

## Push Notifications

- Provider: Expo Push API (free)
- FCM V1 with Service Account JSON configured in EAS
- Types: sync_complete (with user_sync_id), applied
- Token registration: POST /v1/push-tokens after login

## CV & Cover Letter Templates

- CV template: src/templates/cv.html
- Cover letter template: src/templates/cover_letter.html
- Languages: pl, en
- PDF: Gotenberg (gotenberg.railway.internal:3000) ✅
- Storage: Supabase Storage bucket 'homo-digital'
- Email path sanitization: @→_at_, .→_, +→_

## Supabase DB Trigger

handle_new_user() — fires on INSERT OR UPDATE to auth.users:
- Upserts public.users with id, email, photo_url (from OAuth metadata)
- ON CONFLICT (id) DO UPDATE email, photo_url, updated_at

## Recent Changes (2026-06-12/13)

- claude_matched_reasons changed from string[] to { pros: string[], cons: string[] }
- Claude batch size: configurable via settings.claude_batch_size (default 50)
- Claude batches run 3 in parallel (CONCURRENCY=3)
- Claude evaluation uses tool_use (structured output) — eliminates JSON parse errors
- profile_synced_at: null triggers re-sync; set to NOW() after sync completes
- PATCH /v1/profile deletes user_offers with status IN ('pending_apply', 'ai_rejected') on save
- DELETE /v1/account: explicit batch delete of related records before user deletion
- CandidateProfileSchema: all optional fields accept null (nullable().optional())
- experience_level enum: junior|mid|senior|lead|principal|staff|architect|c_level
- work_model normalization: onsite/on-site → office in scraper and prepare-profile
- Supabase DB trigger: fires on INSERT OR UPDATE auth.users
- RLS enabled on user_offers: "Users can view own offers" policy (TO authenticated)
- Indexes added: idx_user_offer_statuses_user_offer_id, idx_user_offers_user_id
- settings.claude_batch_size added (value: '50')
- gender values: 'M'/'F' → 'Male'/'Female' in profile JSON

## Known Issues / TODO

- Supabase Realtime not working for user_offers (text type user_id issue)
- Current workaround: polling every 30s for new pending_apply offers (blue dot in R)
- Better fix: in-memory SSE manager in API — notify connected clients after Prisma INSERT in sync pipeline (zero Supabase dependency, works with 1 Railway replica)
- Ghosting Detector: cron at 3am, applied > 21 days → ghosted_by_recruiter status
- Micro-feedback loop: user_offer_feedback table, popup on client_withdrawn from pending_apply
- profile_calibrated_at timestamp for Profile Review tracking
- user_id columns: migrate from text to uuid across all tables (user_offers, push_tokens, agent_clients, feedbacks, user_syncs, api_calls)
- Stripe integration for Pro tier
- Free tier: enforce max 3 offers/month limit
- homodigital.io rewrite for Free/Pro/Premium model

# job-matcher-api — Feature Specification

Last updated: 2026-06-11

## Business Model

### Tiers

- **Free** — access to R only, max 3 matched offers per month
- **Pro** — access to R, unlimited offers, ~49-79 PLN/month via Stripe
- **Premium** — Pro + human agent, pay-per-action pricing, access to A

### Premium Pay-Per-Action (planned)

- Application submitted by agent
- Employer call before interview
- Candidate interview prep
- Salary negotiation
- Profile Review (available to ALL tiers as a paid one-time action — first touchpoint in Free/Pro→Premium funnel)

### App Access

- R (Chrome extension): Free + Pro + Premium
- A (mobile app): Premium only

### Implementation Status

- Free/Pro: planned (next milestone)
- Premium: planned after Free/Pro launch
- Stripe integration: planned for Pro tier

### Geographic Expansion

- 🇵🇱 Poland: active (NoFluffJobs approved, JustJoin pending, theprotocol.it pending)
- 🇺🇸 USA: active expansion plan
  - Indeed: partnership request sent (marketplacesupport@indeed.com)
  - Dice: partnership request sent (max.foster@dice.com)
  - Wellfound: partnership request sent (talent@wellfound.com)
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

## Database Schema

### users

- id, email, password (nullable — null for social login users)
- profile Json? (full candidate profile JSON — null until onboarding complete)
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
  fetch_offers_after_build=true

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

### Offers

- GET /v1/user-offers
  Auth: agent JWT (requires client_id param) or client JWT (uses own user_id)
  Params: client_id, status, source, date_from, date_to
  Response: { client_id, status, count, offers[] }
  Offer fields: user_offer_id, offer_title, offer_company, offer_url,
  claude_score, claude_role_fit, claude_matched_reasons, claude_missing_skills,
  salary[], source, cv_language, work_model, city, applied_at, status

- PATCH /v1/user-offers/:id/status
  Auth: agent JWT
  Body: { status }
  All statuses supported including agent_withdrawn

### CV Generation

- POST /v1/cv/generate
  Auth: agent JWT
  Body: { client_id, offer_text, cv_language, job_title, company_name, user_offer_id }
  Response: { cv_url, cv_status }
  Features:
  - Dynamic PL/EN section labels
  - Month names PL/EN
  - project.name="" → skip project header
  - Summary in first person
  - Skills: highlighted for role first, then categories
  - Certifications section (hide if empty)
  - Own projects with URL
  - Page margins: @page { margin: 15mm 10mm }
  - Agent info footer (if show_agent_info_in_cv)
  - GDPR clause footer (always)
  - Gender-aware PL text (M/F) from profile.basic_info.gender
  - {{FOOTER_NOTES}} placeholder in cv.html template
  - PDF generated via Gotenberg (Railway internal: gotenberg.railway.internal:3000)
  - PDF stored in Supabase Storage bucket 'homo-digital' at cvs/{email}/{filename}.pdf
  - cv_status: null | 'generating' | 'done' | 'error' (stored in user_offers.cv_status)
  - cv_url: public Supabase Storage URL (stored in user_offers.cv_url)

- POST /v1/cl/generate
  Auth: agent JWT
  Body: { client_id, offer_text, cl_language, job_title, company_name, user_offer_id }
  Response: { cl_url, cl_status }
  Features: same as CV generation but for cover letters
  - Template: src/templates/cover_letter.html
  - PDF stored at cls/{email}/{filename}.pdf
  - cl_status, cl_url stored in user_offers

### Sync

- POST /v1/sync (agent JWT)
  Runs full sync for all agent clients
  Steps: scrape → pre-filter → Claude batch evaluation → save to DB
  After sync: saves to user_syncs, sends push notifications
  Push body: "Your agent {name} scanned {x} new offers. {y} are worth applying
  and {z} look promising for level up."

### User Syncs

- GET /v1/user-syncs (client JWT)
  Returns list of sync reports for authenticated client
  Params: limit=20
- GET /v1/user-syncs/:id (client JWT)
  Returns single sync report

### Notifications

- POST /v1/notifications/send (agent JWT)
  Manual trigger: sends push to all clients with client_notified=false applied offers
  Marks client_notified=true after sending

- POST /v1/push-tokens (client JWT)
  Body: { token, platform }
  Upserts push token for user

### Agent

- GET /v1/agent/me (client JWT)
  Returns agent data for authenticated client:
  { id, first_name, last_name, email, phone, photo_url }

### Prospects

- POST /v1/prospects (public)
  Body: { email, notes?, role: 'client'|'agent' }
  Upserts by email
- GET /v1/prospects (agent JWT)
  Returns all prospects ordered by created_at desc

### Settings

- GET /v1/settings (agent JWT)
  Returns all settings as key-value object

---

## Scraping

- Sources: JustJoin.it, NoFluffJobs
- NoFluffJobs: official approval to use public API ✅
- JustJoin: awaiting approval
- Schedule: 6:45 AM + hourly 7:00-15:00 on weekdays
- Exchange rates: open.er-api.com for salary normalization to PLN

## Matching (Claude API)

- Pre-filter: workplace, employment_type, salary, seniority, language,
  red_flags, city, skill_excluded
- Claude batch processing: chunks of 100 offers
- Scoring: 0-100
- Fields: score, role_fit, matched_reasons, missing_skills, recommended, skills_to_learn
- max_level_up: 40 (from settings table)

## Scheduled Jobs

- Fetch offers: 6:45 AM + hourly 7:00-15:00 weekdays
- Hourly notification job: sends job applied push per user.send_job_applied_notifications_hour
- Hourly sync report job: runs sync per user.send_sync_report_notifications_hour
  Guard: only once per day (checks user_syncs.created_at::date = today)

## Push Notifications

- Provider: Expo Push API (free)
- FCM V1 with Service Account JSON configured in EAS
- Types: sync_complete (with user_sync_id), applied
- Token registration: POST /v1/push-tokens after login

## CV & Cover Letter Templates

- CV template: src/templates/cv.html
- Cover letter template: src/templates/cover_letter.html
- CV Placeholders: {{SUMMARY}}, {{WORK_EXPERIENCE}}, {{SKILLS}}, {{EDUCATION}}, {{CERTIFICATIONS_SECTION}}, {{FOOTER_NOTES}}
- CL Placeholders: {{LANG}}, {{CL_TITLE}}, {{FULL_NAME}}, {{TARGET_ROLE}}, {{CONTACTS}}, {{CITY}}, {{DATE}}, {{JOB_TITLE}}, {{COMPANY_NAME}}, {{BODY}}, {{LABEL_REGARDS}}, {{FOOTER_NOTES}}
- Languages: pl, en (cv_language / cl_language field)
- PDF: Gotenberg on Railway (gotenberg.railway.internal:3000) ✅
- Storage: Supabase Storage bucket 'homo-digital'

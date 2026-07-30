# NextStep Case Tracker

An ad-free, privacy-minded Expo app that turns public immigration case updates into a calm milestone journey with reviewed educational next steps.

## Included

- iOS, Android, and web-compatible Expo Router shell
- Guest-first local USCIS, NVC, and EOIR case organization
- Protected receipt-number storage using SecureStore; SQLite stores non-secret case history
- Milestone journey, status timeline, guidance cards, transparent estimate previews, alerts, household grouping, official tools, subscription, export, and erase flows
- Responsive current/next milestone cards and a horizontally scrollable rail that keeps Biometrics readable at large text sizes
- Local reminders, calendar export, private notes, clipboard receipt extraction, starter civics practice, and an official-source catalog
- Privacy-safe “Cases Like Mine” explorer that suppresses cohorts below 50 observations
- Source-backed public progress by form category using the USCIS FY2025 Q2 All Forms workbook: decision mix, workload pace, pending volume, and median processing time
- Live-ready USCIS adapter and server function boundary
- Link-only NVC and EOIR behavior—no unsupported scraping
- Supabase schema with row-level security, encrypted cloud identifiers, quota accounting, aggregate releases, entitlements, and deduplicated case events/notifications
- English, Spanish, French, and Haitian Creole localization foundation

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` only if connecting cloud services.
4. Run `npm start`, then open iOS, Android, or web from Expo.
5. Choose **Explore with sample data** for the complete offline product tour.

Without `EXPO_PUBLIC_API_BASE_URL`, USCIS additions use a safe local placeholder status. Receipt numbers are never sent to an unknown service. NVC and EOIR always open their official status pages.

## Production setup

- Apply `supabase/migrations/001_initial.sql` to a dedicated Supabase project.
- Apply migrations `001_initial.sql`, `002_public_progress.sql`, and `003_feature_parity.sql`.
- Deploy `supabase/functions/case-api`, set the app API base URL, and keep USCIS OAuth credentials server-side.
- Configure independent base64 32-byte `CASE_ENCRYPTION_KEY` and `CASE_FINGERPRINT_KEY` secrets. Rotating either requires a planned identifier migration.
- Use `https://api-int.uscis.gov/oauth/accesstoken` and `https://api-int.uscis.gov/case-status` for sandbox. The function caches each OAuth token until shortly before its documented 30-minute expiry.
- Deploy `case-api` with JWT verification enabled for account traffic. For staging-receipt guest testing only, deploy a separate sandbox instance with JWT verification disabled and `ALLOW_GUEST_SANDBOX=true`; never carry that setting into production.
- Complete the required USCIS sandbox traffic period before requesting production access.
- The `uscis-qualification` function records one redacted sandbox evidence row per UTC day. It exercises a known 200 staging response and a controlled official 4xx response, stores no identifiers or response bodies, and refuses to run against production URLs.
- Replace the placeholder EAS project ID and configure Apple/Google credentials.
- Configure `nextstep_plus_monthly` at `$2.99/month` and `nextstep_plus_annual` at `$24.99/year` with a seven-day annual trial; validate store receipts server-side before unlocking premium features.
- Professionally review and translate every guidance card. This repository provides educational product copy, not legal advice.
- `poll-cases` is deployed but fail-closed. Enable it only after production USCIS access by setting `POLLING_ENABLED=true`, a strong `POLLING_SHARED_SECRET`, and the production quota. Schedule signed invocations every 15 minutes; the function itself selects cases due at four-hour or daily intervals.
- Apply `002_public_progress.sql`. Quarterly imports must retain their source URL, publication date, and SHA-256 checksum; never silently replace a release.

## Public progress methodology

- “Share of reported decisions approved” is `approved / (approved + denied)` for the selected USCIS reporting period. It is not an applicant's approval probability because the decisions are not a same-filing-date cohort.
- “Workload pace” is `completions / receipts` for the period. Above 100% means completions exceeded new receipts; below 100% means receipts exceeded completions. It is not the percentage of the pending backlog completed.
- Processing time is the national median published in the source workbook. It is not a promised completion date.
- Future community estimates use only explicit opt-in, de-identified observations and remain hidden until a cohort contains at least 50 observations.

## API contracts

- `POST /v1/cases` creates an authenticated, encrypted USCIS case and returns a UUID-backed representation.
- `GET /v1/cases/:id` returns normalized case data without the identifier.
- `POST /v1/cases/:id/refresh` performs a quota-reserved official refresh.
- `GET /v1/cases/:id/guidance` returns reviewed, versioned deterministic guidance.
- `GET /v1/cohorts` returns only aggregate rows with at least 50 observations.
- The legacy sandbox status action remains anonymously reachable only when both the configured USCIS URL is sandbox and `ALLOW_GUEST_SANDBOX=true`.

## Deliberately gated

- Camera OCR needs a native on-device text-recognition dependency and platform privacy validation. Clipboard extraction and user confirmation are implemented; the camera button remains an honest gated state.
- Store purchase and restoration buttons remain disabled until App Store/Play products and server receipt verification exist.
- AI summaries remain off until deterministic tracking is stable and a grounded, source-citing server implementation passes legal-safety tests.
- NVC and EOIR remain official-link journeys; no CEAC or EOIR case-page scraping is used.

## Safety boundaries

- Do not log receipt numbers, A-numbers, case numbers, access tokens, or decrypted identifiers.
- Do not add CEAC or EOIR page scraping. Keep their connectors link-only until a supported integration or written permission exists.
- Government notices remain authoritative. Predictions must remain ranges with sample size, source date, and uncertainty.

## Checks

```sh
npm run typecheck
npm test
```

### USCIS sandbox qualification evidence

Migration `004_uscis_qualification.sql` creates the protected evidence table and a Vault-backed Cron invoker. Migration `005_schedule_uscis_qualification.sql` provides four daily retry windows to tolerate temporary sandbox outages. Once a UTC date is complete, later invocations exit without additional USCIS traffic. Verify five consecutive complete dates without reading case data:

```sql
select run_date, outcome, request_count, success_http_status, error_http_status,
       success_duration_ms, error_duration_ms, started_at, finished_at
from public.uscis_qualification_runs
order by run_date;
```

Only dates with `outcome = 'complete'`, a 2xx success, and an official 4xx response count toward the evidence package. Keep the job sandbox-only until the production-access request is submitted.

# CLAUDE.md

Flowy is a self-hosted period and cycle tracker built on the plasto template: a Go backend
on PocketBase (`backend/`) serving a Svelte 5 + Tailwind web app (`web/`).

- Each person's day logs are in the `days` collection (one per user and date); their cycle
  settings and reminder choices are fields on `users`.
- Cycle math is in `web/src/lib/cycle.ts` and, for reminders, `backend/cycle`: keep the two
  in step. Days are whole days since 1970-01-01, so time zones never shift a date.
- The web app saves logs on the device first and syncs them (`web/src/lib/tracker.svelte.ts`,
  `offline.ts`), so it works offline.
- Never mention other period-tracking apps by name, in code, docs or commits.

## Commands

- `make dev`: run the backend (:8090) and the web app (:5173) with live reload
- `make check` and `make test` must pass before every commit (Python: `cd workers && uv run pytest`)

## Conventions

- Database collections are defined in Go migrations under `backend/migrations`
  (`go run . migrate create <name>`), never only in the admin UI.
- Custom API routes live under `/api/app/`.
- Access is controlled with collection API rules. Users have a `role` (`owner` or
  `member`); use `@request.auth.role = "owner"` for owner-only actions.
- Notify people with `push.ToUser` or `push.ToEveryone` (`backend/push`) from hooks;
  sending runs in the background and never fails the request.
- Schedule recurring work with `jobs.MustAdd` (`backend/jobs`) in `app.Register`, not
  `app.Cron()` directly, so missed runs catch up and runs are recorded.
- Heavy work (ML, scraping, LLM calls) goes in a Python worker under `workers/` that uses
  `plasto_worker.Client`; workers write records, Go hooks react. Allow workers in API rules
  with `@request.auth.collectionName = "workers"`.
- `docs/first-feature.md` walks through adding a feature across every layer.
- Deploy files are in `deploy/` (see `docs/deploy.md`); `make smoke` runs the images with
  `deploy/docker-compose.yml` end to end, and CI runs it on every PR.
- Brand color and icons: `--color-brand-*` in `web/src/app.css`, files in `web/public/icons/`.
- Keep it simple: no new dependency or service without a clear need.

## Git and GitHub

- Never add AI co-author or attribution lines to commits, PR descriptions, or GitHub comments
  (no `Co-Authored-By: Claude ...`, `Claude-Session: ...`, "Generated with Claude Code", or similar).

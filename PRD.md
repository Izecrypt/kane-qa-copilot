# QA Copilot — Kane CLI Online Hackathon (TestMu AI)

Deadline: 11:59 PM IST, 26 Nov 2026. Repo started 2026-11-22 (after the Nov 12 cutoff, compliant).

## One-liner
Point it at a deployed URL and describe a flow in plain English. QA Copilot
turns that into a Kane CLI run, reads the pass/fail evidence back, and when it
fails, rewrites the objective and retries — closing the loop between the
agent and the verifier instead of just reporting a result.

## Why this idea (from the organizer's own list)
"A QA-as-a-service agent for non-technical founders: point it at a deployed
app URL, get a bug report." Picked over a from-scratch app because it is the
shortest path to a genuine closed loop (bar 3: "your agent and Kane CLI
talked to each other"), not just a demo that calls Kane once.

## Judging bars this targets
1. Ships: a real small web app, one Docker/`npm start` command, usable tonight.
2. Verified: every submitted flow is actually run through Kane CLI against
   the real target URL — no mocked results.
3. Closed loop: on FAIL, the agent reads Kane's structured run output
   (reason, failed step, evidence), rewrites the objective to disambiguate or
   narrow it, and re-runs automatically (bounded to 2 retries), logging each
   attempt. This is the scored differentiator, not an afterthought.
4. Craft: clean single-page UI, live run status, bug report card, link to
   the Kane run trace.

## Architecture (minimal, buildable solo in ~3 days)
- Backend: Node/TypeScript (Fastify or plain Express) — shells out to the
  installed `kane-cli` binary rather than reimplementing browser automation.
  - `POST /runs` — body: `{ url, objective }`
  - Sets target with `kane-cli config set-url <url>` (or passes inline),
    then `kane-cli run "<objective>" --agent` and captures stdout as
    structured JSON (`--agent` mode is built for this per `kane-cli --help`).
  - On fail: calls an LLM (OpenRouter, reuse existing Hermes-adjacent key
    pattern) with the failure JSON, asks it to (a) write a short human bug
    report, (b) propose a revised objective string addressing the likely
    ambiguity/selector issue. Re-runs `kane-cli run` with the revised
    objective, max 2 retries, logging every attempt verbatim.
  - Persists each run (objective tried, verdict, evidence, retry chain) to
    a local SQLite file — this IS the "requirements-to-coverage" history a
    real team would want, and gives the demo a visible timeline.
- Frontend: single static page (no framework needed) — form (URL +
  objective), a run list with live status via polling or SSE, and a card per
  attempt showing verdict + evidence + (if failed) the rewritten objective
  that followed.
- No auth, no multi-tenant concerns — single-user tool, scoped deliberately
  small to actually ship.

## Demo script (for the 3-5 min video)
Target app: https://marketcube.trenchesnetwork.xyz/ (Izetech — a real lead-gen
landing page with a genuine multi-field application form: name, company,
role, vertical, price band, contact channel checkboxes, WhatsApp number,
consent checkbox). Chosen over wifpool because its actions are a normal web
form, not wallet-gated, so Kane can drive the whole flow unassisted.

1. Open QA Copilot, paste the marketcube URL and an objective that is
   deliberately under-specified (e.g. "select Automotive in the Vertical
   dropdown and submit, confirm it was accepted").
2. Kane runs it for real, skips the required fields, FAILS — shown live with
   the Kane run trace link.
3. The agent reads Kane's own run_end JSON, writes a bug report, and
   rewrites the objective to require the missing fields and consent.
4. Kane re-runs the rewritten objective and PASSES — on camera, undirected.
5. Show the run history card with both attempts and the rewrite in between.

## Blocking items (owner action required, not code)
- Register team + claim 10,000 TestMu AI credits: same email on
  kaneclihack.sh and testmuai.com (`kane-cli login`). Needs a real inbox the
  owner controls — not guessed. BLOCKS any authenticated Kane CLI run.
  DONE 2026-11-22 (see status log).
- Confirm solo vs team. Still open — proceeding as solo (Izecube) by default;
  flag if this should be a team entry.
- 2+ public posts (X/HN/Reddit/LinkedIn) required to submit — handled by the
  owner personally per the no-automation-reveal rule on its_izecube; this is
  not posted through any bot account.

## Status log
- 2026-11-22: idea picked (owner decision), repo scaffolded, Kane CLI
  installed locally and confirmed working (`kane-cli --version` 0.10.7, not
  yet logged in). PRD written. Build not started pending `kane-cli login`
  (owner email).
- 2026-11-22 (later same session): owner registered on testmuai.com and
  kaneclihack.sh with tobiobembeofficial@gmail.com. `kane-cli login --oauth`
  completed (owner approved in browser). Balance 1200 credits. Verified a
  real Kane CLI run against wifpool.trenchesnetwork.xyz (passed, 16.5
  credits, evidence pack + shareable dashboard link) before writing any app
  code, confirming the "must have run Kane CLI" eligibility bar.
  Built the core app: Express + better-sqlite3, `POST /runs` shells out to
  `kane-cli config set-url` then `kane-cli run "<objective>" --agent`,
  parses the NDJSON stream for the `run_end` event. On FAIL, calls OpenRouter
  (gpt-4o-mini; OPENAI_API_KEY in this environment was out of credits, so
  the diagnose step uses OPENROUTER_API_KEY instead) with Kane's own
  failure JSON, gets back a bug report and a rewritten objective, re-runs
  Kane with it (max 2 retries total). Static single-page UI polls `/runs`.
  End-to-end smoke test: a deliberately ambiguous "log in as admin" flow
  against wifpool (which has no admin login) genuinely failed on attempt 1,
  the LLM correctly diagnosed "wrong URL / no admin surface," rewrote the
  objective, Kane re-ran it, failed again for the same real reason (no
  admin dashboard exists) — confirms the closed loop talks both ways
  instead of just reporting the first failure. One transient OpenRouter
  rate-limit on attempt 2's diagnosis call was caught and surfaced as a bug
  report string rather than crashing the run. Repo moved from /tmp to
  ~/kane-qa-copilot (permanent location) and pushed to
  github.com/Izecrypt/kane-qa-copilot (2 commits).
  Remaining before submission: pick/polish the demo target app (a project
  with a real signup or checkout flow would make a stronger demo than
  wifpool's wallet-gated actions), record the 3-5 min video, 2+ public
  posts (owner's own handle, not through automation), submit at
  kaneclihack.sh/o/submit before 26 Nov 2026 11:59 PM IST.
- 2026-11-22 (owner picked the demo target): switched target to
  https://marketcube.trenchesnetwork.xyz/ (Izetech lead-gen landing page,
  owner's own live project, real multi-field application form, not
  wallet-gated). Verified directly with `kane-cli run` (outside the app)
  first: (1) a correctly-specified full application submission passed end
  to end, confirmation message detected, 24.3 credits — this created one
  real test lead clearly named "Kane CLI Hackathon Test (please ignore)",
  owner should delete/ignore it in the Izetech pipeline; (2) an edge-case
  flow (submit with consent unchecked, expecting a validation error) also
  passed — the form's client-side validation is correctly built, so no real
  bug exists there. Then ran the actual closed-loop demo through the QA
  Copilot app end to end: objective "select Automotive in the Vertical
  dropdown and submit" (deliberately missing the required name/company/
  WhatsApp/consent fields) — attempt 1 FAILED for real (Kane: agent skipped
  mandatory fields before submitting), the diagnose step (OpenRouter had
  run out of trial credits mid-session — total_credits 0 confirmed via
  /v1/credits — so added a Gemini fallback, see below) wrote a bug report
  and rewrote the objective to include the missing fields, attempt 2
  PASSED. Run id 6 is the canonical demo recording candidate; its two
  attempts and the rewrite are visible in the UI as designed. This also
  created a second real test lead on the Izetech form (dummy name
  "Alex Morgan" / WhatsApp redacted-pattern from the direct-CLI probe, plus
  one submitted through the app itself) — owner should clear these from
  whatever inbox/CRM the Apply form feeds.
  Also added a Gemini (GOOGLE_API_KEY, model gemini-flash-lite-latest)
  fallback in diagnoseFailure() since the OPENROUTER_API_KEY in this
  environment hit its credit ceiling mid-build (gpt-4o-mini via OpenRouter
  worked for the first few diagnose calls, then started failing with
  "exceeds available credits"). The app now tries OpenRouter first, then
  Gemini, and only shows a degraded bug-report string if both are
  unavailable — the retry/rewrite logic itself never depended on which
  provider answered.

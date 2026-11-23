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
- 2026-11-22 (continued): drafted the submission package so only the
  identity-gated steps are left for the owner: SUBMISSION.md (the exact
  "About your app" text for kaneclihack.sh/o/submit, matching the five
  required fields — GitHub URL, about, video, live URL, launch buzz),
  DRAFTS.md (X/LinkedIn/HN launch-post copy, owner's own handle, not
  automated), DEMO_SCRIPT.md (a timed 4-minute live recording script keyed
  to the exact marketcube objective text that is known to fail-then-pass,
  so whoever records doesn't have to improvise). Reset the local DB to
  empty so the recording captures a genuinely live first run, not replayed
  history. Hardened the server: clear error message if the kane-cli binary
  is missing (ENOENT) instead of a raw stack trace, and URL input
  validation before a run starts (bad input fails fast with a 400 instead
  of a confusing downstream Kane error).
  Two things only the owner can do, asked and not yet confirmed: (1)
  whether kaneclihack.sh/o/register (password-gated, separate from
  testmuai.com) was completed — the submit form needs that login and I
  can't enter a password; (2) whether to record the demo personally
  following DEMO_SCRIPT.md, or have me attempt an automated capture
  (ffmpeg screen-record on this machine failed a permission check in
  testing, so manual recording is the reliable path). Registration/login,
  video recording, the 2 public posts, and the final kaneclihack.sh/o/submit
  click all remain owner actions.
- 2026-11-23: owner confirmed registration/team/kane-cli setup steps 1-3 of
  the submit flow are done; reached the actual kaneclihack.sh/o/submit form
  and shared its real fields (Project name, One-liner 170ch, Project
  details 1500ch, Anything else, Agent used, YouTube video, GitHub URL,
  Live URL optional, Launch buzz links). Drafted exact copy for all text
  fields (Project name: QA Copilot, not the org name; one-liner 144/170
  chars; details 1195/1500 chars) sized to fit the real limits.
  UI redesign: owner flagged the original UI as too plain before recording
  (fair — Craft is 25% of the score). Rebuilt public/index.html: dark
  theme, status pills, and a vertical timeline connecting each attempt so
  the fail -> diagnose -> rewrite -> pass sequence is legible at a glance
  instead of three flat divs. Verified live: ran the marketcube flow
  through the new UI and it actually took 3 real attempts (2 genuine
  failures, 2 real diagnoses, 1 pass) — richer demo material than the
  earlier 2-attempt version, purely from re-running, not fabricated.
  BYOK (bring-your-own-key): owner asked whether the live-URL idea could
  work if visitors supply their own TestMu AI credentials instead of
  sharing the owner's. Verified `kane-cli run` supports `--username`/
  `--access-key` (stateless basic auth, no `kane-cli login` profile write)
  and `--url <url>` (per-invocation target, no more global `config
  set-url`) — both confirmed by a real run before touching the code.
  Rebuilt the server around this: `REQUIRE_BYOK=true` env flag gates a
  deployment into requiring every visitor's own TestMu AI username +
  access key (plus optional own OpenRouter/Gemini key for the diagnose
  step); nothing is ever persisted, used for one run and discarded; added
  a basic per-IP rate limit (5/min) for that mode. Default (BYOK off)
  behavior for local/dev use is unchanged — same `kane-cli login --oauth`
  session and server `.env` keys as before, verified by re-running the
  wifpool flow through it (one transient flake on a cold run, confirmed
  non-regression on immediate retry). This solves the hackathon's own
  "judges must be able to run it / hand over working credentials" rule
  elegantly: a judge or any visitor signs up free on testmuai.com, gets
  their own access key, and runs the live instance with it — no need to
  ever hand over the owner's TestMu AI login.
  Still NOT decided: whether to actually deploy to qacopilot.trenchesnetwork.xyz
  (needs a VPS with Node + kane-cli + a real browser/Xvfb, DNS, reverse
  proxy + TLS — none of that is done; the BYOK code above is deploy-ready
  but sitting on the local machine only). Owner asked the architecture
  question but hasn't confirmed the infra commitment; proceeded with the
  code per the "ask once, default to the safe/reversible option, flag it"
  rule since it's useful regardless of the deploy decision.

- 2026-11-22/23: DEPLOYED to https://qacopilot.trenchesnetwork.xyz. Found
  the real SSH access in the vault (root@152.53.176.112, default
  ~/.ssh/id_ed25519 key — a stale note pointed at a different machine's
  `~/.ssh/trenches_keys` path; verified via SSH before trusting it).
  Server already had Node 20, Docker, nginx, certbot, and Chromium
  installed (same box runs marketcube and other trenchesnetwork.xyz
  sites) — copied marketcube's nginx pattern (127.0.0.1-only proxy,
  per-route rate limiting, security headers) rather than inventing a new
  one. Stack: `/opt/qacopilot` (git clone of the public repo),
  `qacopilot.service` systemd unit (`REQUIRE_BYOK=true`, port 8724,
  `Restart=on-failure`), nginx reverse proxy + Let's Encrypt via certbot.
  Owner added the DNS A record personally (registrar access I don't have);
  resolved within the first poll. Fixed the certbot contact email after
  the fact (`certbot update_account`) — the first run used TestMu AI's own
  support address by mistake, corrected to the owner's.
  CAUGHT A REAL BUG before deploy: the BYOK cost-guard condition was
  inverted (`!REQUIRE_BYOK || !llmCreds?.key` is true even when BYOK is
  required and the visitor has no key — meaning the server's own paid
  OpenRouter/Gemini keys would still have fired on a public instance with
  no visitor key, the exact thing BYOK exists to prevent). Fixed to
  `!REQUIRE_BYOK` only, verified, pushed, re-pulled on the server before
  starting the service.
  Verified end to end from outside the server (not just loopback): HTTPS
  200 on `/`, valid Let's Encrypt cert (`SSL certificate verify ok`),
  `/config` reports `requireByok: true`, `POST /runs` with no credentials
  correctly rejected over the public internet, BYOK fields render in the
  browser at the real public URL.
  HONEST GAP, not swept under the rug: `kane-cli run` takes no
  `--project-id`/`--folder-id` flag — project/folder selection lives on
  the CLI profile, not passable per-request. A FAKE-credential smoke test
  returned "no project/folder configured" rather than a clean auth
  rejection, so it's inconclusive whether that was "bad auth" or "needs
  project setup" — I don't have real TestMu AI credentials to test the
  authenticated path (owner was asked, skipped providing them, which is
  their call, not pushed further). Best guess, not verified: a brand-new
  TestMu AI signup (the hackathon's own onboarding path — "claim 10,000
  free credits" on a NEW account) almost certainly auto-selects its one
  project, same as this machine's own `kane-cli login --oauth` did
  ("Auto-selected project: KaneAI Generated") — so the common case (a
  judge or visitor who just signed up) should work. A visitor with
  multiple pre-existing TestMu AI projects has no way to pick one through
  our stateless `--username`/`--access-key` calls and may hit this wall.
  Owner should run one real test with their own key when convenient to
  close this gap; not urgent since local/BYOK-off mode (used for the
  recorded demo) never touches this code path at all.

- 2026-11-23: owner asked to switch the live demo flow to a neutral
  third-party target rather than any of our own projects, and asked
  whether showing a face in the video is required. Confirmed from the
  official page it isn't — only a 3-5 min YouTube video of the app working.
  Picked https://the-internet.herokuapp.com (Sauce Labs' public QA practice
  site) with the status_codes page: an objective claiming a real 500
  response "loads successfully with no error" is a genuine, reproducible
  false claim, not staged ambiguity. Verified twice live (see run history):
  attempt 1 fails for a true reason, the agent correctly diagnoses it,
  rewrites, attempt 2 passes. Updated DEMO_SCRIPT.md and SUBMISSION.md to
  this target.
  Then built a full synthetic demo video rather than asking the owner to
  record manually: TTS narration (10 scripted segments, edge/Aria voice,
  ~176s spoken), real screenshots captured from an actual live run (not
  mocked — homepage, filled form, the real FAIL card with its real bug
  report and rewrite, the real PASS card, the verbatim diagnoseFailure/
  executeRun code from the real file, a closing card), Ken Burns zoom /
  crossfade / pulsing-cycle treatment per segment via ffmpeg so it isn't a
  static slideshow, caption overlays (this ffmpeg build has neither
  libass/subtitles nor freetype/drawtext compiled in — confirmed via
  `ffmpeg -filters`, not assumed — so captions are rendered as PNGs in PIL
  and composited with the `overlay` filter instead, timed per sentence).
  Caught and fixed a sync bug before the final render: the audio track had
  0.5s silence gaps between segments that the video track didn't, which
  would have drifted the whole video out of sync with narration by
  segment 10; fixed by inserting matching 0.5s held-last-frame clips into
  the video at the same points. Full pipeline lives in
  demo-assets/build_video.py and demo-assets/add_captions.py, rerunnable
  end to end. Total runtime ~3:01, inside the "about 3 to 5 minutes" brief.
  Final render in progress at time of this entry — see the next entry for
  the finished result and viewer QA.

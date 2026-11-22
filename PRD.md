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
1. Open QA Copilot, paste a real deployed URL (one of our own shipped
   projects — candidate: wifpool.trenchesnetwork.xyz or izecube-lab) and an
   objective in plain English.
2. Show Kane CLI actually driving a real browser against it (video trace).
3. Deliberately phrase one objective ambiguously so Kane fails it; show the
   agent reading Kane's failure evidence, rewriting the objective, and the
   second Kane run passing — the closed loop, on camera, undirected.
4. Show the run history / bug report card.

## Blocking items (owner action required, not code)
- Register team + claim 10,000 TestMu AI credits: same email on
  kaneclihack.sh and testmuai.com (`kane-cli login`). Needs a real inbox the
  owner controls — not guessed. BLOCKS any authenticated Kane CLI run.
- Confirm solo vs team.
- 2+ public posts (X/HN/Reddit/LinkedIn) required to submit — handled by the
  owner personally per the no-automation-reveal rule on its_izecube; this is
  not posted through any bot account.

## Status log
- 2026-11-22: idea picked (owner decision), repo scaffolded, Kane CLI
  installed locally and confirmed working (`kane-cli --version` 0.10.7, not
  yet logged in). PRD written. Build not started pending `kane-cli login`
  (owner email).

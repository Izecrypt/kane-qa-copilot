# Demo recording script (3-5 min, record live — DB is reset and empty)

Record your screen (QuickTime: File > New Screen Recording) with your own
narration. Server is already running at http://localhost:4173 — if it's
not, `cd ~/kane-qa-copilot && npm start`.

## 0:00–0:30 — Hook
Say roughly: "Most agent demos show you the happy path. I wanted to see
mine actually fail, diagnose itself, and fix itself — on camera, no
scripting the failure in advance." Show the QA Copilot homepage.

## 0:30–1:00 — What it is
"This is QA Copilot. You give it a deployed URL and describe a flow in
plain English. It runs that flow through Kane CLI in a real browser. If
Kane fails it, the agent reads Kane's own evidence, writes a bug report,
rewrites the objective, and tries again — that's the loop I built for this
hackathon."

## 1:00–2:30 — The live run (THE important part)
1. URL field: `https://marketcube.trenchesnetwork.xyz`
2. Objective field (type this EXACTLY — it's deliberately underspecified so
   Kane fails for a real reason, not a scripted one):
   `Open the Vertical dropdown and select Automotive, then submit the form and confirm it was accepted`
3. Click "Run with Kane CLI". Narrate while it runs (~30-60s): "This is
   really driving a Chrome browser right now against our live site."
4. Attempt 1 appears: FAILED. Point at the bug report text and the "Kane
   run trace" link — click it to show the real Kane CLI dashboard replay
   for 5-10 seconds ("this is Kane's own evidence, not something I wrote").
5. Point at the rewritten objective line: "the agent read that failure and
   rewrote the objective to include the fields it skipped."
6. Attempt 2 appears automatically (~30-60s later): PASSED. "Same agent,
   same tool, closed the loop itself."

## 2:30–3:15 — Code glance (optional but strengthens "craft")
Open `src/server.js` briefly, scroll to `diagnoseFailure()` and
`executeRun()` — point out: shells out to real `kane-cli run --agent`,
parses the NDJSON `run_end` event, LLM call only fires on FAIL, max 2
retries, every attempt persisted to SQLite.

## 3:15–3:45 — Why this target
"I tested against one of our own live products, not a toy fixture —
marketcube.trenchesnetwork.xyz, a real lead-gen form. That's a real bug
Kane caught: the flow skipped required fields before submitting."

## 3:45–4:00 — Close
"Repo's linked below, built end to end with Claude Code. Thanks for
watching." Show the GitHub repo URL on screen.

## After recording
1. Upload to YouTube (unlisted is fine, must be viewable via link).
2. Paste the link into SUBMISSION.md's "Demo video" line and into
   kaneclihack.sh/o/submit.
3. Post your 2 launch posts (see DRAFTS.md), add their links to
   SUBMISSION.md and the submit form.

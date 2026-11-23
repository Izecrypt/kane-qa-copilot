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
1. URL field: `https://the-internet.herokuapp.com/status_codes`
   (Sauce Labs' public QA practice site — not a business of ours, no
   ethical concern running automation at it, and TestMu AI's own judges
   will likely recognize it immediately as a credible target.)
2. Objective field (type this EXACTLY — Kane genuinely fails it because
   the claim is objectively false, not because the wording is vague):
   `Click the link for status code 500 and confirm the page loads successfully with no error shown`
3. Click "Run with Kane CLI". Narrate while it runs (~30-60s): "This is
   really driving a Chrome browser right now against a live site."
4. Attempt 1 appears: FAILED. Point at the bug report — Kane correctly
   identifies this as "an assertion mismatch, not a product defect," which
   is a genuinely sharp diagnosis. Click the "Kane run trace" link to show
   the real Kane CLI dashboard replay for 5-10 seconds.
5. Point at the rewritten objective: the agent read that failure and
   rewrote the objective to match reality (expect the 500 error message
   instead of asserting it away).
6. Attempt 2 appears automatically (~30-60s later): PASSED. "Same agent,
   same tool, closed the loop itself."

## 2:30–3:15 — Code glance (optional but strengthens "craft")
Open `src/server.js` briefly, scroll to `diagnoseFailure()` and
`executeRun()` — point out: shells out to real `kane-cli run --agent`,
parses the NDJSON `run_end` event, LLM call only fires on FAIL, max 2
retries, every attempt persisted to SQLite.

## 3:15–3:45 — Why this target
"I tested against a public QA practice site (the-internet.herokuapp.com,
run by Sauce Labs) rather than a toy fixture of my own — a neutral,
no-stakes target anyone can verify independently. This page intentionally
returns a 500 status code; Kane correctly caught that my objective's claim
contradicted reality, which is exactly the kind of thing a real QA agent
should catch."

## 3:45–4:00 — Close
"Repo's linked below, built end to end with Claude Code. Thanks for
watching." Show the GitHub repo URL on screen.

## After recording
1. Upload to YouTube (unlisted is fine, must be viewable via link).
2. Paste the link into SUBMISSION.md's "Demo video" line and into
   kaneclihack.sh/o/submit.
3. Post your 2 launch posts (see DRAFTS.md), add their links to
   SUBMISSION.md and the submit form.

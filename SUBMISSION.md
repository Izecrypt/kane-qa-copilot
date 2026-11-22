# Submission — KaneCLI Online Hackathon

Use this to fill https://kaneclihack.sh/o/submit once logged in (owner only
— the form requires a password login I can't do on your behalf). Field
names below match the real form.

## Project name
QA Copilot
(not "Izecube" — that's the team/org name; name the project for what it does)

## One-liner (170 char max — this is 144)
An agent that doesn't stop at a Kane CLI failure: it reads the evidence,
rewrites its own objective, and retries until the flow actually passes.

## Project details (1500 char max — this is 1195)
QA Copilot turns "point an agent at a URL" into a closed loop instead of a
one-shot check. Give it a deployed URL and a flow in plain English; it
shells out to Kane CLI's agent mode (kane-cli run "<objective>" --agent)
and reads back Kane's own structured run_end JSON from a real browser run.

When Kane fails the flow, QA Copilot doesn't just report the failure. It
hands Kane's exact evidence (failed step, reason, assertion) to an LLM,
gets back a one-paragraph bug report plus a rewritten objective that
disambiguates the flow, and re-runs it through Kane automatically (bounded
to 2 retries). Every attempt is kept, so the UI shows a timeline of the
full conversation between the agent and the verifier, not just a pass/fail
badge.

It's for anyone shipping with an AI coding agent who wants the agent to
actually verify its own work instead of asserting it's done. Demoed
against a real production app (marketcube.trenchesnetwork.xyz, a live
lead-gen form) rather than a toy fixture: an under-specified objective made
Kane genuinely fail because the flow skipped required fields, the agent
diagnosed why from Kane's own evidence, rewrote the objective across two
real retries, and passed.

## Anything else to add
The LLM diagnose/rewrite step tries OpenRouter first, falls back to
Gemini — built live after the first provider's trial credits ran out
mid-build. Run it with: npm install -g @testmuai/kane-cli &&
kane-cli login --oauth, then npm install && npm start in the repo.
Set REQUIRE_BYOK=true to run a public instance: every visitor then brings
their own TestMu AI username + access key (free account, no login shared),
so judges can run it live without needing my credentials. Next: wire a
CI hook so the loop runs on every push instead of on demand.

## Agent used
Claude Code

## GitHub URL
https://github.com/Izecrypt/kane-qa-copilot

## Demo video
[PASTE YOUTUBE LINK HERE]

## Live URL (optional)
[Leave blank unless deployed — see PRD.md "BYOK" section for the deploy
plan if that gets greenlit before the deadline]

## Launch buzz (2+ public posts)
[PASTE POST LINKS HERE — see DRAFTS.md for suggested copy]

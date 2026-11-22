# Submission — KaneCLI Online Hackathon

Use this to fill https://kaneclihack.sh/o/submit once logged in (owner only
— the form requires a password login I can't do on your behalf).

## GitHub URL
https://github.com/Izecrypt/kane-qa-copilot

## About your app

QA Copilot turns "point an agent at a URL" into a closed loop instead of a
one-shot check. You give it a deployed URL and a flow in plain English; it
shells out to Kane CLI's agent mode (`kane-cli run "<objective>" --agent`)
and reads back Kane's own structured run_end JSON. When Kane fails the flow,
QA Copilot doesn't just report the failure — it hands Kane's exact evidence
(failed step, reason, assertion) to an LLM, gets back a one-paragraph bug
report plus a rewritten objective that disambiguates the flow, and re-runs
it through Kane automatically (bounded to two retries). Every attempt is
kept, so the UI shows the full conversation between the agent and the
verifier, not just a pass/fail badge.

Built with Claude Code (Hermes Agent) driving the whole build end to end:
scaffolding, the Express + SQLite backend, the Kane CLI integration, and the
verification runs themselves. Stack: Node 22, Express, better-sqlite3,
vanilla JS frontend (no framework — this is a small single-user tool by
design). LLM step tries OpenRouter (gpt-4o-mini) first, falls back to
Gemini (flash-lite) — built the fallback live after the first provider's
trial credits ran out mid-hackathon, which is its own small story about
why you shouldn't hardcode one provider into a demo.

Demoed against a real production app (marketcube.trenchesnetwork.xyz, a
live lead-gen landing page), not a toy fixture: an under-specified objective
made Kane genuinely fail (it skipped required form fields before
submitting), the agent read that failure, rewrote the objective to include
the missing fields and consent checkbox, and the retry passed — the closed
loop, verified with a real failure and a real recovery, not scripted.

## Demo video
[PASTE YOUTUBE LINK HERE]

## Live URL
Local-only by design (single-user tool, shells out to a CLI with local
auth) — not deployed. [Reconsider if there's time to containerize + deploy
before the deadline.]

## Launch buzz (2+ public posts)
[PASTE POST LINKS HERE — see DRAFTS.md for suggested copy]

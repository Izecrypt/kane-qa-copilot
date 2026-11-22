# Launch buzz drafts (owner posts these personally — not automated)

Two public posts minimum (HN / X / Reddit / LinkedIn), required to submit.
Pick any two. Edit freely — these are starting drafts, not final copy.

## X / Twitter (short)

Spent the last few days building for the Kane CLI hackathon: an agent
that doesn't just run a browser check and report pass/fail — it reads the
failure, rewrites its own test, and tries again.

Pointed it at a real app, deliberately gave it a vague instruction, watched
it fail, diagnose itself, and fix itself. No human in the loop.

[demo video link] [repo link]

## LinkedIn / longer

Most "AI agent verifies its own work" demos show the happy path. I wanted
to see the agent actually fail first.

For TestMu AI's Kane CLI hackathon I built QA Copilot: point it at any
deployed URL, describe a flow in plain English, and it runs that flow
through Kane CLI in a real browser. When Kane reports a failure, the app
doesn't stop there — it hands Kane's own evidence to an LLM, gets back a
bug report and a corrected objective, and retries automatically.

I tested it against one of our own live products rather than a toy demo.
Gave it a deliberately incomplete instruction. It failed for a real reason,
diagnosed why, rewrote itself, and passed on the second try — on camera,
unscripted.

Built end to end with Claude Code. Repo and demo below.

[repo link] [demo video link]

## Hacker News (Show HN)

Title: Show HN: QA Copilot – an agent that reads its own browser-test
failures and rewrites itself

Body: I built this for TestMu AI's Kane CLI hackathon. Kane CLI runs a
plain-English flow in a real browser and returns pass/fail plus structured
evidence. Most demos stop at "call Kane once, show green." I wanted the
agent to actually close the loop: on a FAIL, it reads Kane's own JSON
evidence, writes a bug report, rewrites the objective to fix the
ambiguity/missing-step, and re-runs it (bounded to 2 retries). Every
attempt is kept so you can see the whole back-and-forth.

Tested against a real deployed app rather than a fixture — a deliberately
under-specified instruction made it genuinely fail first, then recover.

Repo: https://github.com/Izecrypt/kane-qa-copilot

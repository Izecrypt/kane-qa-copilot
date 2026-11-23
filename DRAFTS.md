# Launch buzz drafts (owner posts these personally — not automated)

Two public posts minimum (HN / X / Reddit / LinkedIn), required to submit.
Pick any two. Edit freely — these are starting drafts, not final copy.

## X / Twitter (short)

Spent the last few days building for the Kane CLI hackathon: an agent
that doesn't just run a browser check and report pass/fail — it reads the
failure, rewrites its own test, and tries again.

Pointed it at a public QA practice site (not one of my own projects),
gave it an objective that's genuinely false — a page that returns a real
HTTP 500 "loads successfully with no error" — watched it fail, diagnose
itself, and fix itself. No human in the loop.

https://youtu.be/ExmAUj5-yN4 https://github.com/Izecrypt/kane-qa-copilot

## LinkedIn / longer

Most "AI agent verifies its own work" demos show the happy path. I wanted
to see the agent actually fail first.

For TestMu AI's Kane CLI hackathon I built QA Copilot: point it at any
deployed URL, describe a flow in plain English, and it runs that flow
through Kane CLI in a real browser. When Kane reports a failure, the app
doesn't stop there — it hands Kane's own evidence to an LLM, gets back a
bug report and a corrected objective, and retries automatically.

I demoed it against a public QA practice site (Sauce Labs'
the-internet.herokuapp.com), not one of my own projects, so there's
nothing staged about the result. Gave it an objective that claims a page
returning a real HTTP 500 "loads successfully with no error" — a genuinely
false claim. Kane caught it for real, the agent diagnosed exactly why from
Kane's own evidence, rewrote the objective to match reality, and passed on
the second try — on camera, unscripted.

Built end to end with Claude Code. Repo and demo below.

https://github.com/Izecrypt/kane-qa-copilot https://youtu.be/ExmAUj5-yN4

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

Demoed against a public QA practice site (the-internet.herokuapp.com, run
by Sauce Labs) rather than a business fixture — an objective claiming a
real HTTP 500 page "loads successfully with no error" is a genuine false
claim, not staged ambiguity. Kane fails it for a true reason, the agent
diagnoses and rewrites, and it passes on retry.

Repo: https://github.com/Izecrypt/kane-qa-copilot

## Reddit (r/QualityAssurance, r/SideProject, r/ExperiencedDevs, or similar)

Title: Built an agent that fixes its own failed browser tests (Kane CLI hackathon)

Body: For TestMu AI's Kane CLI Online Hackathon I built QA Copilot: give it
a deployed URL and a flow in plain English, and it runs that flow through
Kane CLI in a real browser. On a FAIL, it reads Kane's own structured
evidence, writes a bug report, rewrites the objective, and retries
automatically (bounded to 2 attempts). Every attempt is kept so you see
the full back-and-forth, not just a pass/fail badge.

Demoed it against a public QA practice site (the-internet.herokuapp.com,
run by Sauce Labs) rather than my own project, so the result isn't staged:
an objective claiming a real HTTP 500 page "loads successfully with no
error" is a genuine false claim. Kane fails it for a true reason, the
agent diagnoses why and rewrites the objective, and it passes on retry.

Also deployed publicly with bring-your-own-key support (your own free
TestMu AI account, nothing of mine shared or stored) so anyone can run it
live, not just watch a video.

Demo: https://youtu.be/ExmAUj5-yN4
Repo: https://github.com/Izecrypt/kane-qa-copilot

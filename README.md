# QA Copilot

Point it at a deployed URL and describe a flow in plain English. QA Copilot
runs it through Kane CLI, reads the pass/fail evidence back, and on failure
rewrites the objective and retries — a closed loop between the agent and the
verifier, not a one-shot check.

Built for the [Kane CLI Online Hackathon](https://www.kaneclihack.sh/) by TestMu AI.

## Requirements
- Node 18+
- `npm install -g @testmuai/kane-cli` then `kane-cli login` (TestMu AI account)

## Run
```
npm install
npm start
# open http://localhost:4173
```

## How it works
1. Submit a target URL and an objective ("sign up and reach the dashboard").
2. The server shells out to `kane-cli run "<objective>" --agent --url <url>`.
3. On PASS: the run is logged with its evidence.
4. On FAIL: an LLM call reads Kane's failure JSON, writes a short bug report,
   and proposes a rewritten objective. Kane re-runs it (max 2 retries). Every
   attempt is kept, so the retry chain is visible in the UI.

## Public deployment (bring-your-own-key)
Set `REQUIRE_BYOK=true` and every visitor must paste their own TestMu AI
username + access key (free, from testmuai.com → Account → API Keys) and
optionally their own OpenRouter/Gemini key. Nothing is stored server-side —
credentials are used for that one `kane-cli run` invocation and discarded.
This is what makes a public instance safe to run: no shared credits to
drain, no login to hand over to judges, and the server never writes a
per-user profile to disk (auth is passed inline via `--username`/
`--access-key` on each call, not `kane-cli login`). A basic per-IP rate
limit (5 runs/min) is also active when `REQUIRE_BYOK=true`.

Local/dev use (default, `REQUIRE_BYOK` unset) skips all of this and uses
this machine's own `kane-cli login --oauth` session plus the server's own
`OPENROUTER_API_KEY`/`GOOGLE_API_KEY` from `.env` — simplest path for
running the demo yourself.

See `PRD.md` for the full design and status log.

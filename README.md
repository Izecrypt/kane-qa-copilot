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
2. The server shells out to `kane-cli run "<objective>" --agent` against the URL.
3. On PASS: the run is logged with its evidence.
4. On FAIL: an LLM call reads Kane's failure JSON, writes a short bug report,
   and proposes a rewritten objective. Kane re-runs it (max 2 retries). Every
   attempt is kept, so the retry chain is visible in the UI.

See `PRD.md` for the full design and status log.

import express from "express";
import Database from "better-sqlite3";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4173;
const MAX_RETRIES = 2;
// Public deployments should set REQUIRE_BYOK=true: every run then needs the
// visitor's own TestMu AI username + access key (never the server's), and
// the LLM diagnose step only runs if they also supply their own LLM key.
// Local/dev use (recording the demo, etc.) leaves this off and falls back
// to this machine's already-authenticated `kane-cli login` session and the
// server's own OPENROUTER_API_KEY / GOOGLE_API_KEY.
const REQUIRE_BYOK = String(process.env.REQUIRE_BYOK || "").toLowerCase() === "true";

fs.mkdirSync(path.join(__dirname, "..", "data"), { recursive: true });
const db = new Database(path.join(__dirname, "..", "data", "qa-copilot.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    objective TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES runs(id),
    attempt_no INTEGER NOT NULL,
    objective_used TEXT NOT NULL,
    verdict TEXT,
    summary TEXT,
    bug_report TEXT,
    rewritten_objective TEXT,
    test_url TEXT,
    credits_consumed REAL,
    raw_run_end TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/** Run one Kane CLI objective against a URL, passed inline (--url) so
 * concurrent requests from different visitors never share mutable global
 * config. kaneCreds = { username, accessKey } — when present, authenticates
 * this one invocation as that visitor's own TestMu AI account via
 * --username/--access-key (stateless basic auth, no profile written to
 * disk); when absent, falls back to this machine's own `kane-cli login`
 * session. Nothing from kaneCreds is ever logged, persisted, or returned
 * to the client. Returns the parsed run_end event. */
function runKaneObjective(objective, url, kaneCreds) {
  return new Promise((resolve, reject) => {
    const args = ["run", objective, "--agent", "--url", url];
    if (kaneCreds?.username && kaneCreds?.accessKey) {
      args.push("--username", kaneCreds.username, "--access-key", kaneCreds.accessKey);
    }
    const child = spawn("kane-cli", args, {
      cwd: __dirname,
      env: process.env,
    });
    let buf = "";
    let runEnd = null;
    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith("{")) continue;
        try {
          const evt = JSON.parse(line);
          if (evt.type === "run_end") runEnd = evt;
        } catch {
          // non-JSON noise line (deprecation warnings etc.) — ignore
        }
      }
    });
    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("close", (code) => {
      if (runEnd) return resolve(runEnd);
      // Never echo raw stderr back when BYOK is in play — it can embed the
      // access key in a CLI usage error. Keep the detail server-side only.
      if (kaneCreds?.username) console.error(`kane-cli exited ${code}, stderr: ${stderr.slice(0, 2000)}`);
      reject(new Error(
        kaneCreds?.username
          ? `kane-cli exited ${code} with no run_end event. Check your TestMu AI username/access key are correct.`
          : `kane-cli exited ${code} with no run_end event. stderr: ${stderr.slice(0, 500)}`
      ));
    });
    child.on("error", (err) => {
      if (err.code === "ENOENT") {
        reject(new Error("kane-cli not found on PATH. Install it with: npm install -g @testmuai/kane-cli"));
      } else {
        reject(err);
      }
    });
  });
}

/** Ask an LLM to read a Kane failure and (a) write a short bug report,
 * (b) propose a rewritten objective to disambiguate/narrow the flow.
 * This is the closed-loop step: the agent reads Kane's own evidence.
 * userLlmKey (optional, visitor-supplied) is tried first; otherwise falls
 * back to this server's own OPENROUTER_API_KEY then GOOGLE_API_KEY, unless
 * REQUIRE_BYOK is set, in which case a run with no visitor key just gets a
 * degraded (non-LLM) bug report instead of spending the server's own money. */
async function callOpenRouter(prompt, apiKey) {
  if (!apiKey) return null;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`OpenRouter: ${data.error.message || JSON.stringify(data.error)}`);
  return data?.choices?.[0]?.message?.content || "";
}

async function callGemini(prompt, apiKey) {
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(`Gemini: ${data.error.message || JSON.stringify(data.error)}`);
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("") || "";
}

async function diagnoseFailure({ url, objective, runEnd, llmCreds }) {
  const prompt = `You are a QA copilot. Kane CLI just ran a browser-automation flow and it FAILED.
Target URL: ${url}
Original plain-English objective: "${objective}"
Kane CLI's own run_end evidence (JSON): ${JSON.stringify(runEnd).slice(0, 4000)}

Do two things, each on its own line, no extra commentary:
1. BUG_REPORT: <one tight paragraph a developer could act on tonight — what broke, where, likely cause>
2. REWRITTEN_OBJECTIVE: <a revised plain-English objective that disambiguates or narrows the flow so Kane CLI can complete it this time, or the single word NONE if no rewrite is likely to help>`;

  // Visitor-supplied key (any provider they picked) tried first; then this
  // server's own keys, unless BYOK is mandatory on this deployment.
  const attempts = [];
  if (llmCreds?.provider === "openrouter" && llmCreds?.key) attempts.push(() => callOpenRouter(prompt, llmCreds.key));
  if (llmCreds?.provider === "gemini" && llmCreds?.key) attempts.push(() => callGemini(prompt, llmCreds.key));
  if (!REQUIRE_BYOK || !llmCreds?.key) {
    attempts.push(() => callOpenRouter(prompt, process.env.OPENROUTER_API_KEY));
    attempts.push(() => callGemini(prompt, process.env.GOOGLE_API_KEY));
  }

  let text = null;
  let lastErr = null;
  for (const call of attempts) {
    try {
      text = await call();
      if (text) break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!text) {
    return {
      bugReport:
        lastErr
          ? `LLM diagnosis unavailable (${lastErr.message}). Kane CLI's own summary: ${runEnd.summary || runEnd.reason || "none"}`
          : `Kane CLI reported FAIL for "${objective}" on ${url}: ${runEnd.summary || runEnd.reason || "no summary"}. (Add your own OpenRouter or Gemini key for an auto bug report + rewrite.)`,
      rewrittenObjective: null,
    };
  }
  const bugMatch = text.match(/BUG_REPORT:\s*(.+)/i);
  const rewriteMatch = text.match(/REWRITTEN_OBJECTIVE:\s*(.+)/i);
  const rewritten = rewriteMatch?.[1]?.trim();
  return {
    bugReport: bugMatch?.[1]?.trim() || text.trim(),
    rewrittenObjective: rewritten && !/^none$/i.test(rewritten) ? rewritten : null,
  };
}

async function executeRun(runId, url, objective, kaneCreds, llmCreds) {
  let currentObjective = objective;
  let attemptNo = 1;
  let finalStatus = "failed";

  while (attemptNo <= MAX_RETRIES + 1) {
    let runEnd;
    try {
      runEnd = await runKaneObjective(currentObjective, url, kaneCreds);
    } catch (err) {
      db.prepare(
        `INSERT INTO attempts (run_id, attempt_no, objective_used, verdict, summary) VALUES (?, ?, ?, 'error', ?)`
      ).run(runId, attemptNo, currentObjective, String(err.message || err));
      break;
    }

    const passed = runEnd.status === "passed";
    let bugReport = null;
    let rewrittenObjective = null;

    if (!passed && attemptNo <= MAX_RETRIES) {
      const diagnosis = await diagnoseFailure({ url, objective: currentObjective, runEnd, llmCreds });
      bugReport = diagnosis.bugReport;
      rewrittenObjective = diagnosis.rewrittenObjective;
    } else if (!passed) {
      bugReport = runEnd.summary || runEnd.reason || "Kane CLI reported failure with no summary.";
    }

    db.prepare(
      `INSERT INTO attempts
       (run_id, attempt_no, objective_used, verdict, summary, bug_report, rewritten_objective, test_url, credits_consumed, raw_run_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      runId,
      attemptNo,
      currentObjective,
      passed ? "passed" : "failed",
      runEnd.summary || runEnd.one_liner || null,
      bugReport,
      rewrittenObjective,
      runEnd.test_url || null,
      runEnd.credits_consumed ?? null,
      JSON.stringify(runEnd)
    );

    if (passed) {
      finalStatus = "passed";
      break;
    }
    if (!rewrittenObjective) {
      finalStatus = "failed";
      break;
    }
    currentObjective = rewrittenObjective;
    attemptNo += 1;
  }

  db.prepare(`UPDATE runs SET status = ? WHERE id = ?`).run(finalStatus, runId);
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Minimal abuse guard for a public deployment: cap requests per IP per
// minute. Each run still spends the VISITOR's own Kane/LLM credits when
// REQUIRE_BYOK is on, but this keeps one IP from hammering the VPS.
const rateWindow = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 5;
  const hits = (rateWindow.get(ip) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  rateWindow.set(ip, hits);
  return hits.length > limit;
}

app.post("/runs", (req, res) => {
  if (REQUIRE_BYOK && rateLimited(req.ip)) {
    return res.status(429).json({ error: "Too many runs from this IP — wait a minute and try again." });
  }
  const { url, objective, kaneUsername, kaneAccessKey, llmProvider, llmKey } = req.body || {};
  if (!url || !objective) return res.status(400).json({ error: "url and objective are required" });
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("not http(s)");
  } catch {
    return res.status(400).json({ error: "url must be a valid http(s) URL" });
  }
  if (REQUIRE_BYOK && (!kaneUsername || !kaneAccessKey)) {
    return res.status(400).json({ error: "This deployment requires your own TestMu AI username + access key (testmuai.com > Account > API Keys). Nothing is stored — it's used for this run only." });
  }
  const kaneCreds = kaneUsername && kaneAccessKey ? { username: kaneUsername, accessKey: kaneAccessKey } : null;
  const llmCreds = llmProvider && llmKey ? { provider: llmProvider, key: llmKey } : null;

  const info = db.prepare(`INSERT INTO runs (url, objective) VALUES (?, ?)`).run(url, objective);
  const runId = info.lastInsertRowid;
  executeRun(runId, url, objective, kaneCreds, llmCreds).catch((err) => {
    db.prepare(`UPDATE runs SET status = 'error' WHERE id = ?`).run(runId);
    console.error(`Run ${runId} crashed:`, err);
  });
  res.json({ id: runId });
});

app.get("/runs", (_req, res) => {
  const runs = db.prepare(`SELECT * FROM runs ORDER BY id DESC`).all();
  res.json(runs);
});

app.get("/runs/:id", (req, res) => {
  const run = db.prepare(`SELECT * FROM runs WHERE id = ?`).get(req.params.id);
  if (!run) return res.status(404).json({ error: "not found" });
  const attempts = db.prepare(`SELECT * FROM attempts WHERE run_id = ? ORDER BY attempt_no`).all(req.params.id);
  res.json({ ...run, attempts });
});

app.get("/config", (_req, res) => {
  // Lets the frontend show/hide the BYOK fields without hardcoding it.
  res.json({ requireByok: REQUIRE_BYOK });
});

app.listen(PORT, () => console.log(`QA Copilot listening on http://localhost:${PORT} (REQUIRE_BYOK=${REQUIRE_BYOK})`));

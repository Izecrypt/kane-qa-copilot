import express from "express";
import Database from "better-sqlite3";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4173;
const MAX_RETRIES = 2;

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

/** Run one Kane CLI objective against the default-configured URL.
 * Returns the parsed run_end event (or null if the stream never produced one). */
function runKaneObjective(objective) {
  return new Promise((resolve, reject) => {
    const child = spawn("kane-cli", ["run", objective, "--agent"], {
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
      reject(new Error(`kane-cli exited ${code} with no run_end event. stderr: ${stderr.slice(0, 500)}`));
    });
    child.on("error", reject);
  });
}

function setTargetUrl(url) {
  return new Promise((resolve, reject) => {
    const child = spawn("kane-cli", ["config", "set-url", url], { cwd: __dirname, env: process.env });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`set-url failed (${code})`))));
    child.on("error", reject);
  });
}

/** Ask an LLM to read a Kane failure and (a) write a short bug report,
 * (b) propose a rewritten objective to disambiguate/narrow the flow.
 * This is the closed-loop step: the agent reads Kane's own evidence.
 * Tries OpenRouter first (OPENROUTER_API_KEY), falls back to Gemini
 * (GOOGLE_API_KEY) if OpenRouter has no credit or no key is set — both are
 * optional, and either being present is enough to drive the loop. */
async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
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

async function callGemini(prompt) {
  const apiKey = process.env.GOOGLE_API_KEY;
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

async function diagnoseFailure({ url, objective, runEnd }) {
  const prompt = `You are a QA copilot. Kane CLI just ran a browser-automation flow and it FAILED.
Target URL: ${url}
Original plain-English objective: "${objective}"
Kane CLI's own run_end evidence (JSON): ${JSON.stringify(runEnd).slice(0, 4000)}

Do two things, each on its own line, no extra commentary:
1. BUG_REPORT: <one tight paragraph a developer could act on tonight — what broke, where, likely cause>
2. REWRITTEN_OBJECTIVE: <a revised plain-English objective that disambiguates or narrows the flow so Kane CLI can complete it this time, or the single word NONE if no rewrite is likely to help>`;

  let text = null;
  let lastErr = null;
  for (const call of [callOpenRouter, callGemini]) {
    try {
      text = await call(prompt);
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
          : `Kane CLI reported FAIL for "${objective}" on ${url}: ${runEnd.summary || runEnd.reason || "no summary"}. (Set OPENROUTER_API_KEY or GOOGLE_API_KEY for auto bug reports + rewrites.)`,
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

async function executeRun(runId, url, objective) {
  await setTargetUrl(url);
  let currentObjective = objective;
  let attemptNo = 1;
  let finalStatus = "failed";

  while (attemptNo <= MAX_RETRIES + 1) {
    let runEnd;
    try {
      runEnd = await runKaneObjective(currentObjective);
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
      const diagnosis = await diagnoseFailure({ url, objective: currentObjective, runEnd });
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

app.post("/runs", (req, res) => {
  const { url, objective } = req.body || {};
  if (!url || !objective) return res.status(400).json({ error: "url and objective are required" });
  const info = db.prepare(`INSERT INTO runs (url, objective) VALUES (?, ?)`).run(url, objective);
  const runId = info.lastInsertRowid;
  executeRun(runId, url, objective).catch((err) => {
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

app.listen(PORT, () => console.log(`QA Copilot listening on http://localhost:${PORT}`));

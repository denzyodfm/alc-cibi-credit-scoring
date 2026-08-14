import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";

const port = Number(process.env.PORT || 3000);
const healthUrl = `http://localhost:${port}/login`;
const command = process.execPath;
const args = ["node_modules/next/dist/bin/next", "dev", "-H", "0.0.0.0", "-p", String(port)];
const checkEveryMs = 5000;
const startupGraceMs = 60000;
const maxFailures = 2;
const outLogPath = path.resolve(process.cwd(), `.dev-stable-${port}.out.log`);
const errLogPath = path.resolve(process.cwd(), `.dev-stable-${port}.err.log`);

/** A child that dies sooner than this never really started — treat it as a crash loop, not a restart. */
const fastExitMs = 15000;
const maxFastExits = 3;

let child = null;
let startedAt = 0;
let failures = 0;
let fastExits = 0;
let stopping = false;
let restartTimer = null;
let cacheCleared = false;
let outLog = null;
let errLog = null;
let recentStderr = [];

function timestamp() {
  return new Date().toISOString();
}

function log(message) {
  console.log(message);
  try {
    fs.appendFileSync(outLogPath, `[${timestamp()}] ${message}\n`);
  } catch {
    // A temporary log lock must never bring down the watchdog.
  }
}

function ensureLogStreams() {
  outLog ??= fs.createWriteStream(outLogPath, { flags: "a" });
  errLog ??= fs.createWriteStream(errLogPath, { flags: "a" });
}

function clearNextCacheOnce() {
  if (cacheCleared || process.env.SKIP_NEXT_CACHE_CLEAR === "1") return;
  cacheCleared = true;
  const cachePath = path.resolve(process.cwd(), ".next");
  if (!cachePath.startsWith(process.cwd())) return;
  try {
    fs.rmSync(cachePath, { recursive: true, force: true });
    log("[dev:stable] cleared stale Next build cache");
  } catch (error) {
    log(`[dev:stable] could not clear .next cache: ${error.message}`);
  }
}

/** Resolves to the PID-free truth about the port: another process is already bound to it. */
function portInUse() {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", (error) => resolve(error.code === "EADDRINUSE"));
    probe.once("listening", () => probe.close(() => resolve(false)));
    probe.listen(port, "0.0.0.0");
  });
}

function abort(message) {
  stopping = true;
  log(`[dev:stable] ${message}`);
  if (recentStderr.length) {
    log("[dev:stable] last output from the dev server:");
    for (const line of recentStderr.slice(-12)) log(`    ${line}`);
  }
  process.exit(1);
}

function scheduleRestart() {
  if (restartTimer) return;
  restartTimer = setTimeout(() => {
    restartTimer = null;
    start();
  }, 2000);
}

function start() {
  clearNextCacheOnce();
  ensureLogStreams();
  startedAt = Date.now();
  failures = 0;
  log(`[dev:stable] starting Next dev server on http://0.0.0.0:${port}`);
  child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-old-space-size=4096"].filter(Boolean).join(" ") }
  });
  child.stdout.pipe(outLog, { end: false });
  child.stderr.pipe(errLog, { end: false });
  recentStderr = [];
  child.stderr.on("data", (chunk) => {
    recentStderr.push(...String(chunk).split("\n").filter((line) => line.trim()));
    if (recentStderr.length > 40) recentStderr = recentStderr.slice(-40);
  });
  child.on("exit", (code, signal) => {
    child = null;
    if (stopping) return;
    const ranFor = Date.now() - startedAt;
    if (ranFor < fastExitMs) {
      fastExits += 1;
      if (fastExits >= maxFastExits) {
        abort(`dev server exited ${maxFastExits} times within ${fastExitMs / 1000}s of starting — not restarting again.`);
        return;
      }
    } else {
      fastExits = 0;
    }
    log(`[dev:stable] dev server exited (${signal ?? code}) after ${Math.round(ranFor / 1000)}s. Restarting...`);
    scheduleRestart();
  });
}

function stopChild() {
  if (child) child.kill();
}

function checkHealth() {
  if (!child || Date.now() - startedAt < startupGraceMs) return;
  const request = http.get(healthUrl, { timeout: 5000 }, (response) => {
    response.resume();
    if (response.statusCode && response.statusCode < 500) {
      failures = 0;
      return;
    }
    failures += 1;
    if (failures >= maxFailures) {
      failures = 0;
      log("[dev:stable] repeated health-check errors. Restarting dev server...");
      stopChild();
    }
  });
  request.on("timeout", () => request.destroy(new Error("Health check timed out.")));
  request.on("error", () => {
    failures += 1;
    if (failures >= maxFailures) {
      failures = 0;
      log(`[dev:stable] ${healthUrl} is not responding. Restarting dev server...`);
      stopChild();
    }
  });
}

process.on("SIGINT", () => {
  stopping = true;
  stopChild();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopping = true;
  stopChild();
  process.exit(0);
});

if (await portInUse()) {
  log(`[dev:stable] port ${port} is already in use by another process.`);
  log(`[dev:stable] stop it first, or start this app on a free port: PORT=3005 npm run dev:stable`);
  process.exit(1);
}

start();
setInterval(checkHealth, checkEveryMs);

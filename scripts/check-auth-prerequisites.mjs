/**
 * Check local prerequisites for Better Auth (MongoDB Atlas + env + SMTP).
 *
 * Usage (from repo root):
 *   node scripts/check-auth-prerequisites.mjs
 *
 * Or from apps/editor:
 *   npm run check:auth
 */

import { existsSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import dns from "node:dns/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { MongoClient } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const envPath = join(repoRoot, "apps", "editor", ".env.local");

const REQUIRED_ENV = [
  "ATLAS_URI",
  "ATLAS_DATABASE_NAME",
];

const AUTH_SECRET_KEYS = ["BETTER_AUTH_SECRET", "AUTH_SECRET"];

const AUTH_URL_KEYS = ["BETTER_AUTH_URL", "BETTER_AUTH_BASE_URL", "NEXTAUTH_URL"];

const EMAIL_ENV = [
  "EMAIL_SERVER_HOST",
  "EMAIL_SERVER_PORT",
  "EMAIL_SERVER_USER",
  "EMAIL_SERVER_PASSWORD",
  "EMAIL_FROM",
];

const TCP_TIMEOUT_MS = 5000;
const MONGO_TIMEOUT_MS = 8000;

const results = [];

function pass(name, detail) {
  results.push({ status: "pass", name, detail });
  console.log(`  ✅ ${name}`);
  if (detail) console.log(`     ${detail}`);
}

function warn(name, detail) {
  results.push({ status: "warn", name, detail });
  console.log(`  ⚠️  ${name}`);
  if (detail) console.log(`     ${detail}`);
}

function fail(name, detail) {
  results.push({ status: "fail", name, detail });
  console.log(`  ❌ ${name}`);
  if (detail) console.log(`     ${detail}`);
}

function maskSecret(value) {
  if (!value) return "(empty)";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 2)}…${value.slice(-2)} (${value.length} chars)`;
}

function maskMongoUri(uri) {
  try {
    const parsed = new URL(uri.replace(/^mongodb(\+srv)?:/, "https:"));
    const protocol = uri.startsWith("mongodb+srv") ? "mongodb+srv" : "mongodb";
    const auth = parsed.username ? "***@" : "";
    return `${protocol}://${auth}${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return "(unparseable URI — value hidden)";
  }
}

function sanitizeError(error) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/mongodb(\+srv)?:\/\/[^/\s]+/gi, "mongodb://***");
}

function expandValue(value, lookup, stack = new Set()) {
  return value.replace(/\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/gi, (_, braced, bare) => {
    const key = braced || bare;
    if (stack.has(key)) return "";
    const next = lookup[key];
    if (next == null || next === "") return "";
    stack.add(key);
    return expandValue(String(next), lookup, stack);
  });
}

function loadEnvFile(path) {
  const parsed = config({ path, override: true, quiet: true }).parsed ?? {};
  const lookup = { ...parsed };
  for (const [key, value] of Object.entries(lookup)) {
    lookup[key] = expandValue(String(value), lookup);
  }
  for (const [key, value] of Object.entries(lookup)) {
    lookup[key] = expandValue(String(value), lookup);
    process.env[key] = lookup[key];
  }
  return lookup;
}

function firstSet(keys) {
  for (const key of keys) {
    if (process.env[key]) return key;
  }
  return null;
}

function parseAtlasHost(uri) {
  const parsed = new URL(uri.replace(/^mongodb(\+srv)?:/, "https:"));
  return parsed.hostname;
}

function tcpConnect(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: timeoutMs });
    const done = (ok, detail) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve({ ok, detail });
    };
    socket.once("connect", () => done(true, `${host}:${port} reachable`));
    socket.once("timeout", () => done(false, `timeout after ${timeoutMs} ms`));
    socket.once("error", (error) => done(false, error.message));
  });
}

async function fetchPublicIp() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body = await response.json();
    return typeof body.ip === "string" ? body.ip : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function diagnoseMongoError(error) {
  const message = sanitizeError(error);
  const topology = error?.reason?.type;
  const hints = [];

  if (topology === "ReplicaSetNoPrimary" || /Server selection timed out/i.test(message)) {
    hints.push(
      "Atlas did not elect a reachable primary. Typical local causes:",
      "  1. Network Access: your current IP is not in the Atlas allowlist.",
      "  2. The cluster is paused (M0 free tier pauses after inactivity).",
      "  3. Port 27017 is blocked (VPN, corporate firewall, or captive portal).",
      "  4. DNS for mongodb+srv failed or returns unreachable hosts.",
    );
  }

  if (/bad auth|authentication failed|MongoServerError: 18/i.test(message)) {
    hints.push("Credentials in ATLAS_URI are rejected. Check username/password.");
  }

  if (/ENOTFOUND|querySrv|ECONNREFUSED|ETIMEOUT/i.test(message)) {
    hints.push("Network or DNS failure before auth. Check internet, VPN, and the cluster hostname.");
  }

  return { message, hints };
}

console.log("RPG Studio — local auth prerequisites\n");

if (!existsSync(envPath)) {
  fail("apps/editor/.env.local", "File is missing. Copy your local secrets there before starting Next.");
  printSummary();
  process.exit(1);
}

pass("apps/editor/.env.local", "File found");
loadEnvFile(envPath);

console.log("\nEnvironment");
for (const key of REQUIRED_ENV) {
  if (process.env[key]) {
    const detail =
      key === "ATLAS_URI"
        ? maskMongoUri(process.env[key])
        : process.env[key];
    pass(key, detail);
  } else {
    fail(key, "Missing");
  }
}

const secretKey = firstSet(AUTH_SECRET_KEYS);
if (secretKey) {
  pass(secretKey, maskSecret(process.env[secretKey]));
} else {
  warn(
    "AUTH_SECRET / BETTER_AUTH_SECRET",
    "Not set. Better Auth may still start, but sessions will be unstable across restarts.",
  );
}

const urlKey = firstSet(AUTH_URL_KEYS);
if (urlKey) {
  const url = process.env[urlKey];
  pass(urlKey, url);
  if (!/^https?:\/\/localhost(:\d+)?\/?$/.test(url) && !url.includes("127.0.0.1")) {
    warn(
      "Auth base URL host",
      "Value is not localhost. Magic-link and OAuth redirects may miss the local app.",
    );
  }
} else {
  warn(
    "BETTER_AUTH_URL",
    "Not set. auth.ts falls back to http://localhost:3000, which is fine for local Next.",
  );
}

let emailReady = true;
for (const key of EMAIL_ENV) {
  if (process.env[key]) {
    pass(key, key.includes("PASSWORD") ? maskSecret(process.env[key]) : process.env[key]);
  } else {
    emailReady = false;
    warn(key, "Missing — email/password login still works in development; magic links will fail.");
  }
}

const uri = process.env.ATLAS_URI;
const dbName = process.env.ATLAS_DATABASE_NAME;

if (!uri || !dbName) {
  printSummary();
  process.exit(1);
}

let isSrv = false;
try {
  isSrv = uri.startsWith("mongodb+srv://");
  // URL() needs a registered protocol; mongodb+srv is enough on modern Node.
  // Fallback mapping is used if parsing fails.
  const host = parseAtlasHost(uri);
  pass("ATLAS_URI parse", `${isSrv ? "SRV" : "standard"} host ${host}`);
} catch (error) {
  fail("ATLAS_URI parse", sanitizeError(error));
  printSummary();
  process.exit(1);
}

console.log("\nNetwork");
const publicIp = await fetchPublicIp();
if (publicIp) {
  pass("Public IP", `${publicIp} — this address must be allowed in Atlas → Network Access`);
} else {
  warn("Public IP", "Could not detect it. Check Atlas Network Access anyway.");
}

const atlasHost = parseAtlasHost(uri);
let mongoHosts = [];

if (isSrv) {
  const srvName = `_mongodb._tcp.${atlasHost}`;
  try {
    const records = await dns.resolveSrv(srvName);
    mongoHosts = records.map((record) => ({ host: record.name, port: record.port }));
    pass(
      "SRV lookup",
      `${srvName} → ${mongoHosts.map((item) => `${item.host}:${item.port}`).join(", ")}`,
    );
  } catch (error) {
    fail("SRV lookup", sanitizeError(error));
  }
} else {
  const parsed = new URL(uri.replace(/^mongodb:/, "https:"));
  const port = parsed.port ? Number(parsed.port) : 27017;
  mongoHosts = [{ host: parsed.hostname, port }];
}

let anyTcpOk = false;
for (const target of mongoHosts) {
  const probe = await tcpConnect(target.host, target.port, TCP_TIMEOUT_MS);
  if (probe.ok) {
    anyTcpOk = true;
    pass(`TCP ${target.host}:${target.port}`, probe.detail);
  } else {
    fail(
      `TCP ${target.host}:${target.port}`,
      `${probe.detail}. If every host fails, Atlas is blocked or the cluster is down.`,
    );
  }
}

if (emailReady) {
  const smtpHost = process.env.EMAIL_SERVER_HOST;
  const smtpPort = Number(process.env.EMAIL_SERVER_PORT);
  if (smtpHost && Number.isFinite(smtpPort)) {
    const probe = await tcpConnect(smtpHost, smtpPort, TCP_TIMEOUT_MS);
    if (probe.ok) {
      pass(`SMTP ${smtpHost}:${smtpPort}`, "Port is reachable (credentials not verified)");
    } else {
      warn(`SMTP ${smtpHost}:${smtpPort}`, probe.detail);
    }
  }
}

console.log("\nMongoDB");
if (!anyTcpOk && mongoHosts.length > 0) {
  fail(
    "MongoDB handshake",
    "Skipped — no Atlas host accepted TCP. Fix Network Access / firewall first.",
  );
} else {
  const client = new MongoClient(uri, {
    runtimeAdapters: { os },
    serverSelectionTimeoutMS: MONGO_TIMEOUT_MS,
    connectTimeoutMS: MONGO_TIMEOUT_MS,
  });

  try {
    await client.connect();
    const ping = await client.db(dbName).command({ ping: 1 });
    if (ping?.ok === 1) {
      pass("MongoDB ping", `Connected to database "${dbName}"`);
    } else {
      fail("MongoDB ping", "Connected but ping was not ok: 1");
    }

    const collections = await client.db(dbName).listCollections().toArray();
    const names = new Set(collections.map((item) => item.name));
    const expected = ["user", "session", "account", "verification"];
    const missing = expected.filter((name) => !names.has(name));
    if (missing.length === 0) {
      pass("Better Auth collections", expected.join(", "));
    } else {
      warn(
        "Better Auth collections",
        `Missing: ${missing.join(", ")}. They are created on the first successful sign-in.`,
      );
    }
  } catch (error) {
    const { message, hints } = diagnoseMongoError(error);
    fail("MongoDB handshake", message);
    for (const hint of hints) {
      console.log(`     ${hint}`);
    }
  } finally {
    await client.close().catch(() => undefined);
  }
}

printSummary();

function printSummary() {
  const failed = results.filter((item) => item.status === "fail").length;
  const warned = results.filter((item) => item.status === "warn").length;
  const passed = results.filter((item) => item.status === "pass").length;

  console.log("\nSummary");
  console.log(`  passed: ${passed}  warnings: ${warned}  failed: ${failed}`);

  if (failed > 0) {
    console.log("\nAuth will not work until the failed checks are fixed.");
    console.log("Atlas console: https://cloud.mongodb.com/ → Network Access (IP) and Database → Clusters (paused?).");
    process.exitCode = 1;
    return;
  }

  if (warned > 0) {
    console.log("\nCore connectivity looks OK. Review warnings if magic links or sessions misbehave.");
    return;
  }

  console.log("\nLocal auth prerequisites look OK. You can start the editor with npm run dev.");
}

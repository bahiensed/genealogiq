#!/usr/bin/env node
// i18n parity guard.
//
// Each app ships one message file per supported locale under apps/<app>/messages/
// (e.g. en-US.json, pt-BR.json, es-MX.json). next-intl resolves the active locale
// from a cookie; a key present in one locale but missing in another renders as a
// raw key (or throws) at runtime. This guard makes that a build-time failure.
//
// Algorithm (per app, NOT across apps — apps have different namespaces):
//   1. discover apps/<app>/messages/*.json
//   2. flatten each to dot-paths
//   3. take the union of keys across that app's locales as the reference
//   4. report any key missing from any locale; exit non-zero on mismatch
//
// SCOPE: cross-locale key parity only — this does NOT assert that every UI string
// is translated (that is a separate, larger effort). It only guarantees the locale
// files within an app stay in lockstep.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPS_DIR = join(ROOT, "apps");

/** Flatten a nested message object to a set of dot-paths (leaves only). */
function flatten(obj, prefix = "", out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

let ok = true;
let checkedApps = 0;

for (const app of readdirSync(APPS_DIR)) {
  const msgsDir = join(APPS_DIR, app, "messages");
  if (!existsSync(msgsDir)) continue;

  const files = readdirSync(msgsDir).filter((f) => f.endsWith(".json"));
  if (files.length < 2) continue; // nothing to compare against
  checkedApps += 1;

  const perLocale = new Map();
  const union = new Set();
  for (const f of files) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(join(msgsDir, f), "utf8"));
    } catch (e) {
      console.error(`✗ ${app}/messages/${f} is not valid JSON: ${e.message}`);
      ok = false;
      continue;
    }
    const keys = flatten(parsed);
    perLocale.set(f, keys);
    for (const k of keys) union.add(k);
  }

  for (const [f, keys] of perLocale) {
    const missing = [...union].filter((k) => !keys.has(k)).sort();
    if (missing.length) {
      ok = false;
      console.error(`✗ ${app}/messages/${f} missing ${missing.length} key(s):`);
      for (const k of missing) console.error(`    ${k}`);
    } else {
      console.log(`✓ ${app}/messages/${f} in parity`);
    }
  }
}

if (checkedApps === 0) {
  console.error("✗ No app message directories found under apps/*/messages.");
  process.exit(1);
}

if (ok) {
  console.log("✓ i18n key parity holds across all locales.");
  process.exit(0);
} else {
  console.error("\nFix: every locale within an app must define the same key set.");
  process.exit(1);
}

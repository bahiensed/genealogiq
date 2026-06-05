#!/usr/bin/env node
// Schema parity checker for the three Genealogiq apps that share ONE Postgres DB.
//
// While the apps live in separate repos, each keeps its own prisma/schema.prisma
// and the shared core models (User, Tenant, Sale, Package, ...) must be kept
// identical BY HAND. This script flags drift: for every model that appears in
// two or more schemas, it compares the normalized field set and reports any
// divergence. Exit code is non-zero when a shared model diverges, so it can gate
// CI. (Once the monorepo lands with a single @genealogiq/db schema, this becomes
// unnecessary — there is only one source of truth.)
//
// Usage (run from the folder that contains the three app repos):
//   node scripts/check-schema-parity.mjs

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Monorepo layout: each app lives under apps/<name>. After Phase 4 (single
// @genealogiq/db schema) this script becomes unnecessary — there is one schema.
const APPS = {
  bms: join(ROOT, "apps/bms/prisma/schema.prisma"),
  seq: join(ROOT, "apps/seq/prisma/schema.prisma"),
  app: join(ROOT, "apps/app/prisma/schema.prisma"),
};

// A model line is "DB-relevant" (must match across apps sharing one DB) when it
// defines a column or a block-level constraint/index. Pure Prisma RELATION fields
// (e.g. `sales Sale[]`, `bio Bio?`, `tenant Tenant @relation(...)`) are local
// modeling — each app declares only the relations it uses — so they are ignored.
function isDbRelevant(line) {
  // Block attributes that map to real DB objects.
  if (/^@@(unique|index|id|map)\b/.test(line)) return true;
  // A list relation like `sales Sale[]` — not a column.
  if (/^\w+\s+\w+\[\]/.test(line)) return false;
  // Lines carrying a column mapping / constraint / type are real columns.
  if (/@map\(|@db\.|@id\b|@unique\b|@default\(|@updatedAt\b/.test(line)) return true;
  // A 1-1/❮many❯ back-relation without any column attribute, e.g.
  // `qrInventory QrInventory?` or `tenant Tenant @relation(...)`.
  if (/@relation\(/.test(line)) return false;
  if (/^\w+\s+[A-Z]\w*\??\s*$/.test(line)) return false; // `bio Bio?`
  // Everything else (plain scalar columns like `email String?`) counts.
  return true;
}

/** Extract `model Name { ... }` blocks → Map<modelName, normalizedLines[]> */
function parseModels(source) {
  const models = new Map();
  const re = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const [, name, body] = m;
    const lines = body
      .split("\n")
      .map((l) => l.replace(/\/\/.*$/, "").trim()) // strip inline comments
      .map((l) => l.replace(/\s+/g, " "))          // collapse whitespace (alignment is not drift)
      .filter((l) => l.length > 0)
      .filter(isDbRelevant)                         // ignore app-local relation fields
      .sort();                                      // compare as a set — field order is not drift
    models.set(name, lines);
  }
  return models;
}

const parsed = {};
for (const [appKey, path] of Object.entries(APPS)) {
  if (!existsSync(path)) {
    console.error(`✖ schema not found for ${appKey}: ${path}`);
    process.exit(2);
  }
  parsed[appKey] = parseModels(readFileSync(path, "utf8"));
}

// Collect every model name and which apps declare it.
const allModels = new Set();
for (const models of Object.values(parsed)) for (const n of models.keys()) allModels.add(n);

let diverged = 0;
let shared = 0;
const rows = [];

for (const name of [...allModels].sort()) {
  const owners = Object.keys(APPS).filter((a) => parsed[a].has(name));
  if (owners.length < 2) {
    rows.push({ name, owners: owners.join(","), status: "app-specific" });
    continue;
  }
  shared++;
  // Compare normalized bodies across the apps that declare this model.
  const ref = JSON.stringify(parsed[owners[0]].get(name));
  const same = owners.every((a) => JSON.stringify(parsed[a].get(name)) === ref);
  if (same) {
    rows.push({ name, owners: owners.join(","), status: "identical" });
  } else {
    diverged++;
    rows.push({ name, owners: owners.join(","), status: "DIVERGES" });
  }
}

// Report
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("MODEL", 26) + pad("APPS", 14) + "STATUS");
console.log("-".repeat(60));
for (const r of rows) console.log(pad(r.name, 26) + pad(r.owners, 14) + r.status);

console.log("-".repeat(60));
console.log(`shared models: ${shared}  |  diverging: ${diverged}`);

if (diverged > 0) {
  console.log("\nDiverging shared models break the single-DB invariant. Details:");
  for (const name of [...allModels].sort()) {
    const owners = Object.keys(APPS).filter((a) => parsed[a].has(name));
    if (owners.length < 2) continue;
    const ref = JSON.stringify(parsed[owners[0]].get(name));
    if (owners.every((a) => JSON.stringify(parsed[a].get(name)) === ref)) continue;
    console.log(`\n## ${name}`);
    const union = new Set();
    for (const a of owners) for (const l of parsed[a].get(name)) union.add(l);
    for (const line of [...union].sort()) {
      const has = owners.filter((a) => parsed[a].get(name).includes(line));
      if (has.length !== owners.length) {
        console.log(`  [${has.join(",").padEnd(11)}] ${line}`);
      }
    }
  }
  process.exit(1);
}

console.log("\n✓ all shared models are identical across the three schemas");

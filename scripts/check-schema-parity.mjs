#!/usr/bin/env node
// Schema parity guard — Phase 4 edition.
//
// The three apps used to keep their own prisma/schema.prisma, hand-synced. After
// Phase 4 there is ONE source of truth: packages/db/prisma/schema.prisma
// (@genealogiq/db). This script now guards that invariant instead of diffing
// three schemas:
//   1. the canonical schema exists, and
//   2. no app has re-introduced a local prisma/schema.prisma.
//
// Exit non-zero (CI-gating) if the invariant is broken.
//
// The DB-accuracy of the canonical schema is verified separately with:
//   prisma migrate diff --from-schema packages/db/prisma/schema.prisma --to-config-datasource

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const CANONICAL = join(ROOT, "packages/db/prisma/schema.prisma");
const APP_SCHEMAS = ["bms", "seq", "app"].map((a) => join(ROOT, `apps/${a}/prisma/schema.prisma`));

let ok = true;

if (!existsSync(CANONICAL)) {
  console.error("✗ Canonical schema missing: packages/db/prisma/schema.prisma");
  ok = false;
} else {
  console.log("✓ Canonical schema present: packages/db/prisma/schema.prisma");
}

for (const p of APP_SCHEMAS) {
  if (existsSync(p)) {
    console.error(`✗ Stray app schema re-introduced: ${p.replace(ROOT + "/", "")}`);
    console.error("  Apps must consume @genealogiq/db — no local prisma/schema.prisma.");
    ok = false;
  }
}

if (ok) {
  console.log("✓ Single-schema invariant holds (apps consume @genealogiq/db).");
  process.exit(0);
} else {
  process.exit(1);
}

#!/usr/bin/env node
// i18n correctness gate (complements check-i18n-parity.mjs).
//
// Parity only proves the three locales agree with each other — it does NOT
// prove the messages are STRUCTURALLY right or that the code's `t('…')` calls
// resolve. This gate catches the two failure modes parity/build missed:
//
//   1. Double-nested namespaces — e.g. content shipped at
//      `Subscriptions.Subscriptions.*`, so `t('freePrice')` renders the raw key.
//   2. Missing namespaces / keys — `useTranslations('X')` where `X` (or a
//      referenced `t('y')`) does not exist in the messages.
//
// en-US is the source of truth for existence (parity guarantees the rest match).
// Exit code 1 on any error.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const APPS = ["bms", "seq", "app"]

// ---------- message helpers ----------
function flatten(obj, prefix = "", acc = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, acc)
    else acc[key] = v
  }
  return acc
}

// A node whose key equals its parent's key AND whose value is an OBJECT (`x.k.k = {…}`)
// — the double-nest fingerprint (wrapped namespace content). A same-named STRING leaf
// (e.g. a `confirm` button inside a `confirm` dialog) is legitimate and ignored.
function findDoubleNests(obj, parentKey = null, pathStr = "", hits = []) {
  for (const [k, v] of Object.entries(obj)) {
    const here = pathStr ? `${pathStr}.${k}` : k
    const isObj = v && typeof v === "object" && !Array.isArray(v)
    if (k === parentKey && isObj) hits.push(here)
    if (isObj) findDoubleNests(v, k, here, hits)
  }
  return hits
}

// ---------- source helpers ----------
function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== ".next" && e.name !== "generated") walk(p, files)
    } else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.(test|spec)\.[tj]sx?$/.test(e.name)) {
      files.push(p)
    }
  }
  return files
}

// translator var -> namespace, from useTranslations("NS") / await getTranslations("NS")
const BIND_RE = /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(["'])([^"']*)\2\s*\)/g
// files that pass a locally-bound translator into getColumns(...) — used to infer the
// namespace of a sibling columns file's `t` param.
const GETCOLUMNS_CALL_RE = /getColumns\s*\(/

function bindings(src) {
  const map = {}
  let m
  BIND_RE.lastIndex = 0
  while ((m = BIND_RE.exec(src))) map[m[1]] = m[3] // ns may be "" for useTranslations()
  return map
}

// literal keys called on a bound var: v('key'), v.rich('key'), v.markup('key').
// Returns { literals: string[], dynamic: number } — template/var keys can't be resolved.
function calls(src, varName) {
  const re = new RegExp(String.raw`\b${varName}(?:\.(?:rich|markup|has))?\(\s*(['"\`])`, "g")
  const literals = []
  let dynamic = 0
  let m
  while ((m = re.exec(src))) {
    const quote = m[1]
    const rest = src.slice(re.lastIndex)
    if (quote === "`") { dynamic++; continue }
    const end = rest.indexOf(quote)
    if (end === -1) continue
    const key = rest.slice(0, end)
    if (key.includes("${")) { dynamic++; continue }
    literals.push(key)
  }
  return { literals, dynamic }
}

let errors = 0
let dynamicSkipped = 0
let paramUnresolved = 0

for (const app of APPS) {
  const msgPath = path.join(ROOT, "apps", app, "messages", "en-US.json")
  const messages = JSON.parse(fs.readFileSync(msgPath, "utf8"))
  const flat = flatten(messages)
  const validKey = (k) => Object.prototype.hasOwnProperty.call(flat, k)
  const topLevel = new Set(Object.keys(messages))

  // 1) double-nest
  for (const hit of findDoubleNests(messages)) {
    console.error(`✖ [${app}] double-nested namespace: ${hit} (content is one level too deep)`)
    errors++
  }

  const srcFiles = walk(path.join(ROOT, "apps", app, "src"))

  // pre-pass: infer namespace for sibling columns files via getColumns callers
  const columnsNs = {} // absolute columns path -> NS
  for (const f of srcFiles) {
    const src = fs.readFileSync(f, "utf8")
    if (!GETCOLUMNS_CALL_RE.test(src)) continue
    const binds = bindings(src)
    // the namespace passed to getColumns is the file's primary (non-Common) binding
    const ns = Object.entries(binds).find(([, n]) => n && n !== "Common" && n !== "Errors")?.[1]
    if (!ns) continue
    const sibling = path.join(path.dirname(f), "columns.tsx")
    if (fs.existsSync(sibling)) columnsNs[sibling] = ns
  }

  // 2) namespace existence + 3) key existence
  for (const f of srcFiles) {
    const src = fs.readFileSync(f, "utf8")
    const binds = bindings(src)
    const rel = path.relative(ROOT, f)

    // namespace existence
    for (const ns of new Set(Object.values(binds))) {
      if (ns && !topLevel.has(ns)) {
        console.error(`✖ [${app}] ${rel}: useTranslations("${ns}") but no "${ns}" namespace in messages`)
        errors++
      }
    }

    // key existence for each bound var
    for (const [v, ns] of Object.entries(binds)) {
      const { literals, dynamic } = calls(src, v)
      dynamicSkipped += dynamic
      for (const key of literals) {
        const full = ns ? `${ns}.${key}` : key
        if (!validKey(full)) {
          console.error(`✖ [${app}] ${rel}: ${v}("${key}") → "${full}" missing in messages`)
          errors++
        }
      }
    }

    // columns files: `t` is a param; use the inferred namespace
    if (columnsNs[f]) {
      const ns = columnsNs[f]
      for (const v of ["t"]) {
        const { literals, dynamic } = calls(src, v)
        dynamicSkipped += dynamic
        for (const key of literals) {
          const full = `${ns}.${key}`
          if (!validKey(full)) {
            console.error(`✖ [${app}] ${rel}: t("${key}") → "${full}" missing (columns of ${ns})`)
            errors++
          }
        }
      }
    } else if (/\bgetColumns\s*\(/.test(src) === false && path.basename(f) === "columns.tsx" && !binds.t) {
      // a columns file we couldn't map to a namespace — count as unresolved
      paramUnresolved++
    }
  }
}

console.log(
  `\ni18n key gate: ${errors} error(s). ` +
    `(${dynamicSkipped} dynamic key call(s) skipped; ${paramUnresolved} unmapped columns file(s).)`,
)
process.exit(errors > 0 ? 1 : 0)

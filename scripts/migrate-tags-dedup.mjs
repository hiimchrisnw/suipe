#!/usr/bin/env node
/**
 * One-time migration: convert tags to sentence case + deduplicate.
 * e.g. "warm" → "Warm", "PLAYFUL" → "Playful"
 *
 * Local (verify first):
 *   node scripts/migrate-tags-dedup.mjs
 *
 * Remote:
 *   node scripts/migrate-tags-dedup.mjs --remote
 */

import { execSync } from "node:child_process"

const remote = process.argv.includes("--remote")
const flag = remote ? "--remote" : "--local"
const label = remote ? "REMOTE" : "local"

console.log(`Running against ${label} D1 database…\n`)

// ── 1. Fetch all rows ────────────────────────────────────────────────────────

const raw = execSync(
  `npx wrangler d1 execute suipe ${flag} --json --command "SELECT id, tags FROM swipes"`,
  { cwd: new URL("../packages/api", import.meta.url).pathname },
).toString()

const [{ results }] = JSON.parse(raw)
console.log(`Fetched ${results.length} rows.`)

// ── 2. Compute updates ───────────────────────────────────────────────────────

const updates = []

for (const row of results) {
  let tags
  try {
    tags = JSON.parse(row.tags)
  } catch {
    console.warn(`  SKIP ${row.id}: could not parse tags: ${row.tags}`)
    continue
  }

  if (!Array.isArray(tags)) {
    console.warn(`  SKIP ${row.id}: tags is not an array: ${row.tags}`)
    continue
  }

  const cleaned = [
    ...new Set(
      tags.map((t) => {
        const s = String(t).trim().toLowerCase()
        return s.charAt(0).toUpperCase() + s.slice(1)
      }),
    ),
  ]
  const cleanedJson = JSON.stringify(cleaned)

  if (cleanedJson !== row.tags) {
    updates.push({ id: row.id, before: row.tags, after: cleanedJson })
  }
}

console.log(
  `\n${updates.length} rows need updating (${results.length - updates.length} already clean).\n`,
)

if (updates.length === 0) {
  console.log("Nothing to do.")
  process.exit(0)
}

// ── 3. Preview ───────────────────────────────────────────────────────────────

for (const u of updates) {
  console.log(`  ${u.id}`)
  console.log(`    before: ${u.before}`)
  console.log(`    after:  ${u.after}`)
}

// ── 4. Confirm (skip in CI / --yes) ─────────────────────────────────────────

if (!process.argv.includes("--yes")) {
  process.stdout.write(`\nApply ${updates.length} update(s) to ${label}? [y/N] `)
  const answer = await new Promise((resolve) => {
    process.stdin.setEncoding("utf8")
    process.stdin.once("data", (d) => resolve(d.trim()))
  })
  if (answer.toLowerCase() !== "y") {
    console.log("Aborted.")
    process.exit(0)
  }
}

// ── 5. Apply ─────────────────────────────────────────────────────────────────

let applied = 0
let failed = 0

for (const u of updates) {
  // Escape single quotes inside JSON (tags can't contain quotes, but be safe)
  const safeJson = u.after.replace(/'/g, "''")
  const sql = `UPDATE swipes SET tags = '${safeJson}', updated_at = current_timestamp WHERE id = '${u.id}'`

  try {
    execSync(`npx wrangler d1 execute suipe ${flag} --command "${sql.replace(/"/g, '\\"')}"`, {
      cwd: new URL("../packages/api", import.meta.url).pathname,
      stdio: "pipe",
    })
    console.log(`  ✓ ${u.id}`)
    applied++
  } catch (err) {
    console.error(`  ✗ ${u.id}: ${err.message}`)
    failed++
  }
}

console.log(`\nDone. ${applied} updated, ${failed} failed.`)

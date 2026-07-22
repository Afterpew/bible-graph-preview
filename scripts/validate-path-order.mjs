#!/usr/bin/env node
/**
 * validate-path-order.mjs [path-id | --all] — check a reading path against the
 * prerequisite graph.
 *
 * Every path declares two things about itself (see schema/path.schema.json):
 *
 *   coverage: "full"  — the path walks every node of its declared canon layers.
 *             "slice" — the path is deliberately partial (a doorway, a themed
 *                       selection). Coverage is NOT checked; instead any step
 *                       whose hard prerequisites are absent from the path is
 *                       reported as an advisory, so a beginner path can't
 *                       silently land on material it never prepared the reader for.
 *
 *   order:    "enforced" — hard prerequisites must appear earlier in the sequence.
 *             "advisory" — the path deliberately orders by something other than
 *                       the prerequisite graph (a calendar schedule, or pairing a
 *                       prophecy with its fulfillment). Hard-order breaks are
 *                       reported, never fatal. Use sparingly and say why in the
 *                       path's description.
 *
 * Soft prerequisites are always advisory: a path may front-load a soft-dependent
 * node for its arc.
 *
 *   node scripts/validate-path-order.mjs gospel-story
 *   node scripts/validate-path-order.mjs --all      # every path; used by `npm run validate`
 *
 * Exit 0 = clean. Exit 1 = a violation the path's own declaration does not permit.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const arg = process.argv[2];
if (!arg) {
  console.error('usage: node scripts/validate-path-order.mjs <path-id> | --all');
  process.exit(2);
}

const { nodes } = JSON.parse(readFileSync(resolve(DIST, 'nodes.json'), 'utf8'));
const { edges } = JSON.parse(readFileSync(resolve(DIST, 'edges.json'), 'utf8'));
const { paths } = JSON.parse(readFileSync(resolve(DIST, 'paths.json'), 'utf8'));

const hardPrereqs = new Map();
const softPrereqs = new Map();
for (const e of edges) {
  const bucket = e.strength === 'hard' ? hardPrereqs : softPrereqs;
  if (!bucket.has(e.node)) bucket.set(e.node, []);
  bucket.get(e.node).push(e.prerequisite);
}

function checkPath(path) {
  const layers = path.canon_layers ?? ['core'];
  const coverage = path.coverage ?? 'full';
  const orderMode = path.order ?? 'enforced';
  const seq = path.sequence.map((s) => s.node);
  const position = new Map(seq.map((id, i) => [id, i]));

  const errors = [];
  const advisories = [];
  const orderBreaks = [];

  // 1. hard-order — fatal when order is "enforced", reported when "advisory"
  for (let i = 0; i < seq.length; i++) {
    const id = seq[i];
    for (const pre of hardPrereqs.get(id) ?? []) {
      if (!position.has(pre)) continue; // absent from this path — handled by rule 2
      if (position.get(pre) > i) {
        orderBreaks.push(`${id} (step ${i + 1}) requires ${pre} (step ${position.get(pre) + 1}), which comes later`);
      }
    }
    for (const pre of softPrereqs.get(id) ?? []) {
      if (!position.has(pre)) continue;
      if (position.get(pre) > i) {
        advisories.push(`soft: ${id} (step ${i + 1}) prefers ${pre} (step ${position.get(pre) + 1}) first — intentional? note it`);
      }
    }
  }
  if (orderMode === 'enforced') orderBreaks.forEach((b) => errors.push(`HARD: ${b}`));
  else orderBreaks.forEach((b) => advisories.push(`order (advisory by declaration): ${b}`));

  // 2. coverage — full paths must walk every declared-layer node exactly once.
  //    Slices instead report steps whose hard prereqs never appear in the path.
  const dupes = seq.filter((id, i) => seq.indexOf(id) !== i);
  if (dupes.length) errors.push(`COVERAGE: duplicate step(s): ${[...new Set(dupes)].join(', ')}`);

  if (coverage === 'full') {
    const inLayer = nodes.filter((n) => layers.includes(n.canon_layer)).map((n) => n.id);
    const missing = inLayer.filter((id) => !position.has(id));
    if (missing.length) {
      errors.push(`COVERAGE: ${missing.length} declared-layer node(s) missing: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}`);
    }
  } else {
    const unmet = [];
    for (const id of seq) {
      const absent = (hardPrereqs.get(id) ?? []).filter((p) => !position.has(p));
      if (absent.length) unmet.push(`${id} (needs ${absent.join(', ')})`);
    }
    if (unmet.length) {
      advisories.push(`slice: ${unmet.length} step(s) rest on hard prerequisites this path never covers — ${unmet.slice(0, 5).join('; ')}${unmet.length > 5 ? '…' : ''}`);
    }
  }

  // 3. why-now notes
  const noteless = path.sequence.filter((s) => !s.note || !s.note.trim()).map((s) => s.node);
  if (noteless.length) {
    advisories.push(`${noteless.length} step(s) have no why-now note: ${noteless.slice(0, 8).join(', ')}${noteless.length > 8 ? '…' : ''}`);
  }

  return { errors, advisories, coverage, orderMode, seq };
}

const targets = arg === '--all' ? paths : paths.filter((p) => p.id === arg);
if (!targets.length) {
  console.error(`✗ no path with id "${arg}". Known: ${paths.map((p) => p.id).join(', ')}`);
  process.exit(1);
}

let failed = 0;
for (const path of targets) {
  const { errors, advisories, coverage, orderMode, seq } = checkPath(path);
  const tag = `${coverage}/${orderMode}`;
  if (errors.length) {
    failed++;
    console.error(`✗ ${path.id} [${tag}] FAILED (${errors.length}):`);
    for (const e of errors) console.error('  - ' + e);
  } else {
    console.log(`✓ ${path.id} [${tag}] ${seq.length} steps${advisories.length ? ` — ${advisories.length} advisory` : ''}`);
  }
  if (arg !== '--all') for (const a of advisories) console.warn(`  ~ ${a}`);
}
if (failed) {
  console.error(`\n✗ ${failed} of ${targets.length} path(s) failed. Run a single path id for its advisories.`);
  process.exit(1);
}
console.log(`✓ ${targets.length} path(s) valid against their declared coverage/order.`);

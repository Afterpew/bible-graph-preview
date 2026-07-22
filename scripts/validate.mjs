#!/usr/bin/env node
/**
 * validate.mjs — dependency-free integrity check for the compiled dataset.
 *
 * Run scripts/build.mjs first. Verifies:
 *   1. Referential integrity — every edge endpoint, connection, and path step
 *      resolves to a real node; no duplicate node ids; no self-dependencies.
 *   2. The graph is a DAG — no prerequisite cycles.
 *   3. THE CANON RULE — a "core" node may never have a prerequisite outside
 *      the core layer. The 66-book graph must stand alone. Deuterocanonical
 *      edges point INTO the core, never the reverse.
 *   4. Core-only paths reference only core nodes.
 *   5. Tier sanity — a node's difficulty tier must be >= (max hard-prereq tier - 2);
 *      flags tier-1 nodes that hard-require tier-4+ material.
 *   6. Chapter coverage — within each book, every chapter appears in exactly
 *      one node (no gaps, no overlaps).
 *   7. Declared counts and SHA-256 checksums in manifest.json match reality.
 *
 *   node scripts/validate.mjs
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const load = (name) => JSON.parse(readFileSync(resolve(DIST, name), 'utf8'));

const errors = [];
const check = (cond, msg) => {
  if (!cond) errors.push(msg);
};

const { nodes, nodeCount } = load('nodes.json');
const { edges, edgeCount } = load('edges.json');
const { paths, pathCount } = load('paths.json');
const manifest = load('manifest.json');

// --- declared counts ---------------------------------------------------------
check(nodeCount === nodes.length, `nodes: nodeCount ${nodeCount} != ${nodes.length}`);
check(edgeCount === edges.length, `edges: edgeCount ${edgeCount} != ${edges.length}`);
check(pathCount === paths.length, `paths: pathCount ${pathCount} != ${paths.length}`);

// --- node ids + field validity ------------------------------------------------
const byId = new Map();
for (const n of nodes) {
  if (byId.has(n.id)) errors.push(`duplicate node id: ${n.id}`);
  byId.set(n.id, n);
  check(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n.id), `node id malformed: ${n.id}`);
  check(n.difficulty_tier >= 1 && n.difficulty_tier <= 5, `node ${n.id}: tier ${n.difficulty_tier} out of range`);
  check(typeof n.summary === 'string' && n.summary.length > 0, `node ${n.id}: empty summary`);
  check(Array.isArray(n.key_themes) && n.key_themes.length >= 3 && n.key_themes.length <= 5, `node ${n.id}: key_themes must have 3-5 entries`);
  check(['core', 'catholic_deuterocanon', 'orthodox_addition'].includes(n.canon_layer), `node ${n.id}: bad canon_layer ${n.canon_layer}`);
}

// --- referential integrity: edges ---------------------------------------------
for (const e of edges) {
  check(byId.has(e.node), `edge references unknown node ${e.node}`);
  check(byId.has(e.prerequisite), `edge references unknown prerequisite ${e.prerequisite}`);
  check(e.node !== e.prerequisite, `self-dependency on ${e.node}`);
  check(e.strength === 'hard' || e.strength === 'soft', `edge ${e.node}<-${e.prerequisite}: bad strength ${e.strength}`);
  check(['narrative', 'theological', 'literary', 'quotation'].includes(e.type), `edge ${e.node}<-${e.prerequisite}: bad type ${e.type}`);
  check(typeof e.reason === 'string' && e.reason.length > 0, `edge ${e.node}<-${e.prerequisite}: empty reason`);
}

// --- THE CANON RULE ------------------------------------------------------------
for (const e of edges) {
  const dependent = byId.get(e.node);
  const prereq = byId.get(e.prerequisite);
  if (!dependent || !prereq) continue;
  if (dependent.canon_layer === 'core') {
    check(
      prereq.canon_layer === 'core',
      `CANON RULE VIOLATION: core node ${e.node} depends on ${e.prerequisite} (${prereq.canon_layer}). The 66-book core must stand alone.`
    );
  }
}

// --- connections resolve ---------------------------------------------------------
for (const n of nodes) {
  for (const c of n.connections ?? []) {
    check(byId.has(c.node), `node ${n.id}: connection to unknown node ${c.node}`);
    check(c.node !== n.id, `node ${n.id}: self-connection`);
  }
}

// --- DAG check (cycle detection via iterative DFS) -------------------------------
const adj = new Map(nodes.map((n) => [n.id, []]));
for (const e of edges) {
  if (adj.has(e.prerequisite) && adj.has(e.node)) adj.get(e.prerequisite).push(e.node);
}
const state = new Map(); // 0=unvisited 1=in-stack 2=done
for (const start of adj.keys()) {
  if (state.get(start)) continue;
  const stack = [[start, 0]];
  while (stack.length) {
    const [id, i] = stack[stack.length - 1];
    if (i === 0) state.set(id, 1);
    const next = adj.get(id)[i];
    if (next === undefined) {
      state.set(id, 2);
      stack.pop();
      continue;
    }
    stack[stack.length - 1][1]++;
    if (state.get(next) === 1) {
      errors.push(`prerequisite cycle detected involving ${next} -> ... -> ${id}`);
      state.set(id, 2);
      stack.pop();
    } else if (!state.get(next)) {
      stack.push([next, 0]);
    }
  }
}

// --- paths -------------------------------------------------------------------------
for (const p of paths) {
  const layers = p.canon_layers ?? ['core'];
  const seen = new Set();
  for (const step of p.sequence) {
    const n = byId.get(step.node);
    check(!!n, `path ${p.id}: unknown node ${step.node}`);
    if (!n) continue;
    check(!seen.has(step.node), `path ${p.id}: node ${step.node} appears twice`);
    seen.add(step.node);
    check(
      layers.includes(n.canon_layer),
      `path ${p.id}: node ${step.node} is ${n.canon_layer}, outside declared layers [${layers.join(', ')}]`
    );
  }
}

// --- movement integrity (optional per-path journey chapters) -------------------------
for (const p of paths) {
  if (!p.movements) continue;
  let idx = 0;
  for (const m of p.movements) {
    const step = p.sequence[idx];
    check(
      !!step && step.node === m.start_node,
      `path ${p.id}: movement ${m.numeral} start_node ${m.start_node} != sequence[${idx}] ${step ? step.node : 'undefined'}`
    );
    idx += m.node_count;
  }
  check(
    idx === p.sequence.length,
    `path ${p.id}: movement node_count sum ${idx} != sequence length ${p.sequence.length}`
  );
}

// --- tier sanity ----------------------------------------------------------------------
for (const e of edges) {
  if (e.strength !== 'hard') continue;
  const dependent = byId.get(e.node);
  const prereq = byId.get(e.prerequisite);
  if (!dependent || !prereq) continue;
  check(
    dependent.difficulty_tier >= prereq.difficulty_tier - 2,
    `tier sanity: ${e.node} (tier ${dependent.difficulty_tier}) hard-requires ${e.prerequisite} (tier ${prereq.difficulty_tier})`
  );
}

// --- chapter coverage: every chapter of every book in exactly one node -------------------
const CHAPTER_COUNTS = {
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34,
  Joshua: 24, Judges: 21, Ruth: 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
  Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150, Proverbs: 31,
  Ecclesiastes: 12, 'Song of Solomon': 8, Isaiah: 66, Jeremiah: 52,
  Lamentations: 5, Ezekiel: 48, Daniel: 12, Hosea: 14, Joel: 3, Amos: 9,
  Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3, Habakkuk: 3, Zephaniah: 3,
  Haggai: 2, Zechariah: 14, Malachi: 4,
  Matthew: 28, Mark: 16, Luke: 24, John: 21, Acts: 28, Romans: 16,
  '1 Corinthians': 16, '2 Corinthians': 13, Galatians: 6, Ephesians: 6,
  Philippians: 4, Colossians: 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, Titus: 3, Philemon: 1, Hebrews: 13,
  James: 5, '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1,
  '3 John': 1, Jude: 1, Revelation: 22,
  // deuterocanon (checked when present; counts per standard editions)
  Tobit: 14, Judith: 16, 'Wisdom of Solomon': 19, Sirach: 51, Baruch: 6,
  '1 Maccabees': 16, '2 Maccabees': 15, '1 Esdras': 9, '3 Maccabees': 7,
  '4 Maccabees': 18, 'Prayer of Manasseh': 1, 'Psalm 151': 1,
};
const chaptersByBook = new Map();
for (const n of nodes) {
  if (!chaptersByBook.has(n.book)) chaptersByBook.set(n.book, new Map());
  const seen = chaptersByBook.get(n.book);
  for (const ch of n.chapters) {
    if (typeof ch !== 'number') continue; // special units (e.g. Greek Esther additions) exempt
    if (seen.has(ch)) {
      // A chapter may be shared by exactly two siblings ONLY when both carry a verse_span
      // (a verse-bounded seam, e.g. Prov 22:16|17). Both halves must declare their boundary;
      // Phase 2B verifies the split point against BSB.
      const other = nodes.find((x) => x.id === seen.get(ch));
      if (!(n.verse_span && other && other.verse_span)) {
        errors.push(`chapter overlap: ${n.book} ${ch} in both ${seen.get(ch)} and ${n.id} (no verse_span pair)`);
      }
    }
    seen.set(ch, n.id);
  }
}
for (const [book, seen] of chaptersByBook) {
  const total = CHAPTER_COUNTS[book];
  if (!total) continue;
  if (total === 1) continue; // single-chapter works trivially covered
  const missing = [];
  for (let ch = 1; ch <= total; ch++) if (!seen.has(ch)) missing.push(ch);
  check(missing.length === 0, `chapter gaps in ${book}: missing ${missing.join(', ')}`);
}

// --- manifest checksums --------------------------------------------------------------------
for (const [name, meta] of Object.entries(manifest.files)) {
  const buf = readFileSync(resolve(DIST, name));
  check(meta.bytes === buf.length, `manifest: ${name} bytes ${meta.bytes} != ${buf.length}`);
  const sha = createHash('sha256').update(buf).digest('hex');
  check(meta.sha256 === sha, `manifest: ${name} sha256 mismatch`);
}

// --- report ------------------------------------------------------------------------------------
if (errors.length) {
  console.error(`✗ ${errors.length} validation error(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ valid: ${nodes.length} nodes, ${edges.length} edges, ${paths.length} paths — DAG confirmed, canon rule holds, chapters fully covered`);

#!/usr/bin/env node
/**
 * build.mjs — compiles data/books/*.json + data/paths/*.json into dist/.
 *
 * Source-of-truth conventions:
 *   - One file per Bible book in data/books/. Nodes carry their own incoming
 *     prerequisite edges (the edge lives with the *dependent* node).
 *   - Connections are declared on one side; the build materializes both
 *     directions in dist/nodes.json.
 *   - suggested_reading_paths on nodes is DERIVED from data/paths/ — never
 *     hand-edit it; edit the path files instead.
 *
 * Outputs:
 *   dist/nodes.json    — all nodes, flat, with book/testament/canon_layer stamped
 *   dist/edges.json    — all prerequisite edges as first-class objects
 *   dist/paths.json    — all reading paths
 *   dist/manifest.json — counts + SHA-256 checksums
 *
 *   node scripts/build.mjs
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BOOKS = resolve(ROOT, 'data', 'books');
const PATHS = resolve(ROOT, 'data', 'paths');
const DIST = resolve(ROOT, 'dist');

const loadDir = (dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ file: f, data: JSON.parse(readFileSync(resolve(dir, f), 'utf8')) }));

// Canonical book order, so dist/nodes.json reads in Bible order.
const BOOK_ORDER = [
  // OT core
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther',
  'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum',
  'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  // NT core
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation',
  // Catholic deuterocanon
  'Tobit', 'Judith', 'Additions to Esther', 'Wisdom of Solomon', 'Sirach',
  'Baruch', 'Additions to Daniel', '1 Maccabees', '2 Maccabees',
  // Orthodox additions
  '1 Esdras', 'Prayer of Manasseh', 'Psalm 151', '3 Maccabees', '4 Maccabees',
];

const books = loadDir(BOOKS).map((b) => b.data);
books.sort((a, b) => {
  const ai = BOOK_ORDER.indexOf(a.book);
  const bi = BOOK_ORDER.indexOf(b.book);
  if (ai === -1 || bi === -1) return a.book.localeCompare(b.book);
  return ai - bi;
});

const paths = loadDir(PATHS).map((p) => p.data);
paths.sort((a, b) => a.id.localeCompare(b.id));

// --- flatten nodes, collect edges -------------------------------------------
const nodes = [];
const edges = [];
for (const book of books) {
  for (const n of book.nodes) {
    const { prerequisites = [], connections = [], ...rest } = n;
    nodes.push({
      ...rest,
      book: book.book,
      testament: book.testament,
      canon_layer: book.canon_layer,
      domain: n.domain ?? book.domain,
      prerequisites: prerequisites.map((p) => p.node),
      connections: connections.map((c) => ({ node: c.node, reason: c.reason })),
      suggested_reading_paths: [], // filled below from path files
    });
    for (const p of prerequisites) {
      edges.push({
        node: n.id,
        prerequisite: p.node,
        strength: p.strength,
        // Why it stands behind: a story continuing, or an idea being used.
        // Hard edges only -- a soft edge constrains nothing, so it has nothing
        // to pass along and carries no scope.
        ...(p.scope ? { scope: p.scope } : {}),
        type: p.type,
        reason: p.reason,
      });
    }
  }
}

const byId = new Map(nodes.map((n) => [n.id, n]));

// --- materialize connections in both directions -----------------------------
for (const n of nodes) {
  for (const c of n.connections) {
    const other = byId.get(c.node);
    if (!other) continue; // validate.mjs reports this properly
    if (!other.connections.some((x) => x.node === n.id)) {
      other.connections.push({ node: n.id, reason: c.reason });
    }
  }
}

// --- derive suggested_reading_paths from path files -------------------------
for (const p of paths) {
  for (const step of p.sequence) {
    const n = byId.get(step.node);
    if (n && !n.suggested_reading_paths.includes(p.id)) {
      n.suggested_reading_paths.push(p.id);
    }
  }
}

// --- derive prerequisite_depth ----------------------------------------------
// How many distinct nodes a reader must have behind them before this one.
//
// It is NOT the same thing as difficulty_tier, and the two are free to disagree:
// tier measures how hard a passage is to understand, depth measures how much
// must come before it. Revelation 21-22 is one of the most readable pages in
// Scripture (low tier) and sits at the very end of the story (high depth).
// Consumers building "what am I ready for" should read depth, not tier.
//
// Depth follows hard edges, and it respects `scope`, which is the difference
// between the two reasons a passage can stand behind another one:
//
//   sequence   B continues a story or argument A began. Real, and local. Genesis
//              30 stands behind Genesis 31, and that fact says nothing at all
//              about Isaiah 53.
//   foundation B uses an idea A establishes and never re-establishes. This kind
//              travels: whatever needs B also needs A.
//
// Counting both as travelling is what produced a twenty-link chain from Genesis 1
// to Isaiah 53, where every single link was defensible and the total was absurd.
// So: while walking a passage's own story backwards, sequence keeps going. But
// once we step sideways to a passage cited for what it TEACHES, we take it for
// its idea and stop inheriting its position in its own book. Leviticus 1-7 stands
// behind Isaiah 53 for the sacrificial system, not for where Leviticus sits after
// Exodus.
{
  const hardPrereqs = new Map();
  for (const n of nodes) hardPrereqs.set(n.id, []);
  for (const e of edges) {
    if (e.strength === 'hard' && hardPrereqs.has(e.node)) {
      hardPrereqs.get(e.node).push({ id: e.prerequisite, scope: e.scope ?? 'foundation' });
    }
  }
  // Two memo tables: reached directly (position still counts) and reached through
  // a foundation edge (position no longer does).
  const memo = [new Map(), new Map()];
  const ancestors = (id, viaFoundation) => {
    const table = memo[viaFoundation ? 1 : 0];
    if (table.has(id)) return table.get(id);
    table.set(id, new Set()); // cycle guard; validate.mjs proves the DAG separately
    const acc = new Set();
    for (const p of hardPrereqs.get(id) ?? []) {
      if (viaFoundation && p.scope === 'sequence') continue;
      acc.add(p.id);
      for (const a of ancestors(p.id, viaFoundation || p.scope === 'foundation')) acc.add(a);
    }
    table.set(id, acc);
    return acc;
  };
  for (const n of nodes) n.prerequisite_depth = ancestors(n.id, false).size;
}

// --- write dist --------------------------------------------------------------
mkdirSync(DIST, { recursive: true });
const write = (name, obj) => {
  const json = JSON.stringify(obj, null, 2) + '\n';
  writeFileSync(resolve(DIST, name), json);
  return { bytes: Buffer.byteLength(json), sha256: createHash('sha256').update(json).digest('hex') };
};

const layerCounts = {};
for (const n of nodes) layerCounts[n.canon_layer] = (layerCounts[n.canon_layer] ?? 0) + 1;

const nodesMeta = write('nodes.json', { version: 'v0', nodeCount: nodes.length, nodes });
const edgesMeta = write('edges.json', { version: 'v0', edgeCount: edges.length, edges });
const pathsMeta = write('paths.json', { version: 'v0', pathCount: paths.length, paths });

write('manifest.json', {
  dataset: 'Bible Graph',
  version: 'v0',
  counts: {
    nodes: nodes.length,
    nodesByCanonLayer: layerCounts,
    edges: edges.length,
    paths: paths.length,
    books: books.length,
  },
  canonLayerLabels: {
    // Both vocabularies, so consuming apps can label for their audience.
    catholic_deuterocanon: { catholic_orthodox_term: 'deuterocanonical', protestant_term: 'apocrypha' },
    orthodox_addition: { catholic_orthodox_term: 'deuterocanonical', protestant_term: 'apocrypha' },
  },
  files: {
    'nodes.json': nodesMeta,
    'edges.json': edgesMeta,
    'paths.json': pathsMeta,
  },
});

console.log(
  `built dist/: ${nodes.length} nodes (${Object.entries(layerCounts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ')}), ${edges.length} edges, ${paths.length} paths, ${books.length} books`
);

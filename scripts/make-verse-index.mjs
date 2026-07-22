#!/usr/bin/env node
/**
 * make-verse-index.mjs — emit dist/verse-index.json, the reverse lookup that makes
 * this dataset droppable into any Bible app.
 *
 * Every other Bible tool addresses content by verse ("John 3:16"). This graph
 * addresses it by node. Without a bridge, integrating means writing a mapping
 * layer first, which is friction at exactly the moment someone is deciding
 * whether to adopt. This file removes it.
 *
 * Shape:
 *   {
 *     "books": { "John": { "3": "john-2-4", ... } },        // chapter -> node id
 *     "split_chapters": {                                    // verse-bounded seams
 *       "Proverbs 22": [ { "node": "prov-10-22a", "through": 16 },
 *                        { "node": "prov-22b-24", "from": 17 } ]
 *     }
 *   }
 *
 * Resolving a reference: look up books[book][chapter]. If that chapter also
 * appears in split_chapters, pick the entry whose verse range contains yours.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const { nodes } = JSON.parse(readFileSync(resolve(DIST, 'nodes.json'), 'utf8'));

const books = {};
const shared = new Map();
for (const n of nodes) {
  if (!books[n.book]) books[n.book] = {};
  for (const ch of n.chapters) {
    if (typeof ch !== 'number') continue;
    const key = `${n.book} ${ch}`;
    if (books[n.book][ch]) {
      if (!shared.has(key)) shared.set(key, [books[n.book][ch]]);
      shared.get(key).push(n.id);
    }
    books[n.book][ch] = n.id;
  }
}

const byId = new Map(nodes.map((n) => [n.id, n]));
const split_chapters = {};
for (const [key, ids] of shared) {
  split_chapters[key] = ids.map((id) => {
    const n = byId.get(id);
    const ch = +key.split(' ').pop();
    const [fc, fv] = n.verse_span.from.split(':').map(Number);
    const [tc, tv] = n.verse_span.to.split(':').map(Number);
    const entry = { node: id };
    if (fc === ch) entry.from = fv;
    if (tc === ch) entry.through = tv;
    return entry;
  });
  // the winner-takes-all map is ambiguous for shared chapters; point at the first half
  const first = split_chapters[key][0].node;
  books[byId.get(first).book][+key.split(' ').pop()] = first;
}

const out = { version: 'v0', generated_from: 'dist/nodes.json', books, split_chapters };
const json = JSON.stringify(out, null, 2) + '\n';
writeFileSync(resolve(DIST, 'verse-index.json'), json);
const chapters = Object.values(books).reduce((a, b) => a + Object.keys(b).length, 0);
console.log(`✓ verse index: ${chapters} chapters mapped, ${Object.keys(split_chapters).length} verse-split chapter(s)`);

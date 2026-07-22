#!/usr/bin/env node
/**
 * check-verse-spans.mjs — verify every node's verse_span against BSB.
 *
 * Rules enforced:
 *   1. from-chapter is the node's first chapter, to-chapter is its last.
 *   2. to-verse is that chapter's true last verse in BSB, UNLESS a sibling node
 *      shares the chapter (a verse-bounded seam), in which case the pair must be
 *      contiguous: first child's to-verse + 1 === second child's from-verse.
 *   3. from-verse is 1 unless a sibling shares the chapter.
 *
 * BSB is the authority for verse numbers. Never author them from memory.
 * Requires ~/bible-curriculum-app/data-src/bsb.txt; skips cleanly if absent
 * (deuterocanon has no BSB text and is exempt).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BSB = resolve(homedir(), 'bible-curriculum-app/data-src/bsb.txt');
if (!existsSync(BSB)) {
  console.log('~ BSB text not found, skipping verse-span verification');
  process.exit(0);
}
const last = new Map();
for (const line of readFileSync(BSB, 'utf8').split('\n')) {
  const m = /^([1-3]?\s?[A-Za-z ]+?)\s(\d+):(\d+)\t/.exec(line);
  if (!m) continue;
  const [b, c, v] = [m[1].trim(), +m[2], +m[3]];
  if (!last.has(b)) last.set(b, new Map());
  const bk = last.get(b);
  if (v > (bk.get(c) ?? 0)) bk.set(c, v);
}
const alias = (book) => (book === 'Psalms' ? 'Psalm' : book);

const errors = [];
let checked = 0;
for (const f of readdirSync(resolve(ROOT, 'data/books')).filter((x) => x.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(resolve(ROOT, 'data/books', f), 'utf8'));
  const bk = last.get(alias(d.book));
  if (!bk) continue; // deuterocanon / not in BSB
  for (const n of d.nodes) {
    if (!n.verse_span) continue;
    checked++;
    const chs = n.chapters.filter((c) => typeof c === 'number');
    const fm = /^(\d+):(\d+)$/.exec(n.verse_span.from);
    const tm = /^(\d+):(\d+)$/.exec(n.verse_span.to);
    if (!fm || !tm) { errors.push(`${n.id}: unparseable verse_span`); continue; }
    const [fc, fv, tc, tv] = [+fm[1], +fm[2], +tm[1], +tm[2]];
    if (fc !== Math.min(...chs)) errors.push(`${n.id}: verse_span.from chapter ${fc} is not the node's first chapter`);
    if (tc !== Math.max(...chs)) errors.push(`${n.id}: verse_span.to chapter ${tc} is not the node's last chapter`);
    const sharesStart = d.nodes.some((o) => o.id !== n.id && o.chapters.includes(fc));
    const sharesEnd = d.nodes.some((o) => o.id !== n.id && o.chapters.includes(tc));
    if (fv !== 1 && !sharesStart) errors.push(`${n.id}: verse_span starts at ${fv} but no sibling shares chapter ${fc}`);
    const trueLast = bk.get(tc);
    if (trueLast === undefined) errors.push(`${n.id}: BSB has no ${d.book} ${tc}`);
    else if (tv !== trueLast && !sharesEnd) errors.push(`${n.id}: verse_span ends at ${tc}:${tv} but BSB ${d.book} ${tc} ends at ${trueLast}`);
  }
  // verse-bounded pairs must be contiguous
  const byChapter = new Map();
  for (const n of d.nodes) for (const c of n.chapters) {
    if (typeof c !== 'number') continue;
    if (!byChapter.has(c)) byChapter.set(c, []);
    byChapter.get(c).push(n);
  }
  for (const [c, ns] of byChapter) {
    if (ns.length < 2) continue;
    if (ns.length > 2) { errors.push(`${d.book} ${c} shared by ${ns.length} nodes; at most 2 allowed`); continue; }
    const [a, b] = ns.sort((x, y) => Math.min(...x.chapters) - Math.min(...y.chapters));
    if (!a.verse_span || !b.verse_span) { errors.push(`${d.book} ${c} shared by ${a.id}/${b.id} without verse_span on both`); continue; }
    const aTo = +a.verse_span.to.split(':')[1];
    const bFrom = +b.verse_span.from.split(':')[1];
    if (bFrom !== aTo + 1) errors.push(`${d.book} ${c} seam: ${a.id} ends ${aTo}, ${b.id} starts ${bFrom} (must be contiguous)`);
  }
}
if (errors.length) {
  console.error(`✗ ${errors.length} verse-span error(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✓ verse spans: ${checked} verified against BSB, seams contiguous`);

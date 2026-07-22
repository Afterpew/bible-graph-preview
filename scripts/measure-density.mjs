#!/usr/bin/env node
// Density meter for hard prerequisite edges.
//
// Hard edges are the graph's binding claims: skip the source and you will misread
// the passage. Adding them is the point. Adding too many is how the engine stops
// being an engine -- if hard edges dictate the order completely, all nine reading
// paths collapse into the same sequence and the curation carries no information.
//
// This script does not set a target. It reports, so a batch of new edges can be
// judged after the fact rather than guessed at beforehand.
//
//   node scripts/measure-density.mjs              print the report
//   node scripts/measure-density.mjs --save NAME  also write dist/density/NAME.json
//   node scripts/measure-density.mjs --diff NAME  compare against a saved snapshot

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const nodes = read('dist/nodes.json').nodes;
const edges = read('dist/edges.json').edges;
const paths = read('dist/paths.json').paths;

const core = nodes.filter((n) => n.canon_layer === 'core');
const coreIds = new Set(core.map((n) => n.id));
const hard = edges.filter((e) => e.strength === 'hard');

// ---------------------------------------------------------------- reachability

// hardPrereqs: node -> direct hard prerequisites, carrying scope
const hardPrereqs = new Map(core.map((n) => [n.id, []]));
for (const e of hard) {
  if (coreIds.has(e.node) && coreIds.has(e.prerequisite)) {
    hardPrereqs.get(e.node).push({ id: e.prerequisite, scope: e.scope ?? 'foundation' });
  }
}

// Ancestors, honouring scope exactly as build.mjs does. If these two ever drift
// apart the meter reports numbers the dataset does not actually contain, so keep
// this function and the one in build.mjs identical.
//
// sequence keeps walking a passage's own story backwards; a foundation edge takes
// the source for its idea, not for its position, and stops inheriting that
// source's place in its own book.
const ancestorCache = [new Map(), new Map()];
function ancestors(id, viaFoundation = false) {
  const table = ancestorCache[viaFoundation ? 1 : 0];
  const cached = table.get(id);
  if (cached) return cached;
  const out = new Set();
  table.set(id, out); // cycle guard; validate.mjs already proves acyclicity
  for (const p of hardPrereqs.get(id) ?? []) {
    if (viaFoundation && p.scope === 'sequence') continue;
    out.add(p.id);
    for (const a of ancestors(p.id, viaFoundation || p.scope === 'foundation')) out.add(a);
  }
  return out;
}

// ------------------------------------------------------------ global structure

const totalPairs = (core.length * (core.length - 1)) / 2;
let constrainedPairs = 0;
for (const n of core) constrainedPairs += ancestors(n.id).size;

const inDegree = new Map(core.map((n) => [n.id, (hardPrereqs.get(n.id) ?? []).length]));
const inDegreeHist = {};
for (const d of inDegree.values()) inDegreeHist[d] = (inDegreeHist[d] ?? 0) + 1;

const orphans = core.filter((n) => inDegree.get(n.id) === 0);
const byType = {};
for (const e of hard) byType[e.type] = (byType[e.type] ?? 0) + 1;

// ------------------------------------------------------- per-path free choices

// Walk a path in its declared order. At each step, count how many of the nodes
// still ahead of us could legally have come next -- meaning every hard
// prerequisite they have *within this path* is already behind us.
//
// An eligible set of 1 means the graph dictated that step. A large eligible set
// means the author chose it. Averaged across a path, this is how much of the
// path's shape is authorship rather than arithmetic.
function measurePath(p) {
  const seq = p.sequence.map((s) => s.node);
  const inPath = new Set(seq);
  // Both scopes still mean "A comes before B" inside a path. Scope changes how far
  // a requirement travels, not whether it holds, so ordering checks use all of them.
  const need = new Map(
    seq.map((id) => [id, (hardPrereqs.get(id) ?? []).map((q) => q.id).filter((q) => inPath.has(q))])
  );

  const done = new Set();
  let forcedSteps = 0;
  let eligibleTotal = 0;

  for (let i = 0; i < seq.length; i++) {
    const remaining = seq.slice(i);
    const eligible = remaining.filter((id) => need.get(id).every((q) => done.has(q)));
    eligibleTotal += eligible.length;
    if (eligible.length === 1) forcedSteps++;
    done.add(seq[i]);
  }

  return {
    id: p.id,
    steps: seq.length,
    coverage: p.coverage,
    forcedSteps,
    forcedPct: +((forcedSteps / seq.length) * 100).toFixed(1),
    meanChoices: +(eligibleTotal / seq.length).toFixed(1),
  };
}

// --------------------------------------------------------------- the doorways

// Path freedom measures whether the nine curated paths still differ from each other.
// It does not measure whether an ordinary person can still walk up to the passages
// ordinary people actually walk up to. Those are different failures.
//
// In Acts 8 the Ethiopian is reading Isaiah 53 cold, with nothing behind it, and the
// help he gets begins from that very passage rather than sending him back to Exodus.
// These are the doorway passages. Every edge behind one can be individually correct
// and the total still be wrong, so they are watched directly.
const DOORWAYS = [
  ['isa-52-53', 'the Suffering Servant, read cold in Acts 8'],
  ['john-1', 'the Word became flesh'],
  ['john-2-4', 'John 3, the most-opened page in the Bible'],
  ['ps-23', 'the shepherd psalm'],
  ['luke-15-19', 'the prodigal son'],
  ['matt-5-7', 'the Sermon on the Mount'],
  ['rom-5-8', 'Romans 8'],
  ['gen-1-3', 'where the Bible starts'],
];

const missingDoorways = DOORWAYS.filter(([id]) => !coreIds.has(id)).map(([id]) => id);
if (missingDoorways.length) {
  console.error(`\n  doorway ids not found in the graph: ${missingDoorways.join(', ')}`);
  console.error('  fix the list in this script rather than letting the check quietly shrink.\n');
  process.exitCode = 1;
}

const doorways = DOORWAYS.filter(([id]) => coreIds.has(id)).map(([id, why]) => {
  const depth = ancestors(id).size;
  return { id, why, depth, direct: (hardPrereqs.get(id) ?? []).length };
});
const doorwayWorst = doorways.reduce((a, d) => Math.max(a, d.depth), 0);

const pathStats = paths.map(measurePath);
const weightedForced =
  pathStats.reduce((a, p) => a + p.forcedSteps, 0) / pathStats.reduce((a, p) => a + p.steps, 0);

// ----------------------------------------------------------------- the numbers

const snapshot = {
  coreNodes: core.length,
  hardEdges: hard.filter((e) => coreIds.has(e.node) && coreIds.has(e.prerequisite)).length,
  softEdges: edges.length - hard.length,
  hardByType: byType,
  forcedOrderingPct: +((constrainedPairs / totalPairs) * 100).toFixed(2),
  constrainedPairs,
  totalPairs,
  orphanCount: orphans.length,
  inDegreeHist,
  meanHardInDegree: +(hard.length / core.length).toFixed(2),
  pathForcedPct: +(weightedForced * 100).toFixed(1),
  paths: pathStats,
  doorways,
  doorwayWorst,
};

// ------------------------------------------------------------------- reporting

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};

const pct = (n) => `${n}%`;

console.log('\nHARD EDGE DENSITY\n');
console.log(`  core nodes            ${snapshot.coreNodes}`);
console.log(`  hard edges            ${snapshot.hardEdges}   (soft ${snapshot.softEdges})`);
console.log(
  `  by type               ${Object.entries(snapshot.hardByType)
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `${t} ${c}`)
    .join(' · ')}`
);
console.log(`  mean hard in-degree   ${snapshot.meanHardInDegree}`);
console.log(
  `  nodes with no hard prerequisite   ${snapshot.orphanCount}  (${((snapshot.orphanCount / core.length) * 100).toFixed(0)}% of the graph)`
);
console.log(
  `  in-degree spread      ${Object.entries(snapshot.inDegreeHist)
    .sort((a, b) => +a[0] - +b[0])
    .map(([d, c]) => `${d}:${c}`)
    .join('  ')}`
);

console.log('\nORDERING\n');
console.log(
  `  forced ordering       ${pct(snapshot.forcedOrderingPct)}   ${snapshot.constrainedPairs.toLocaleString()} of ${snapshot.totalPairs.toLocaleString()} node pairs have a settled order`
);

console.log('\nPATH FREEDOM   (how much of each path is authorship, not arithmetic)\n');
console.log('  path                       steps   forced   mean choices');
for (const p of snapshot.paths) {
  console.log(
    `  ${p.id.padEnd(24)}   ${String(p.steps).padStart(5)}   ${String(pct(p.forcedPct)).padStart(6)}   ${String(p.meanChoices).padStart(12)}`
  );
}
console.log(`\n  across all paths, ${pct(snapshot.pathForcedPct)} of steps are dictated by hard edges.`);
console.log(
  '  collapse watch: if mean choices approaches 1 the paths stop differing from each other.\n'
);

console.log('DOORWAYS   (what the graph now demands before the passages people walk up to)\n');
for (const d of snapshot.doorways) {
  const bar = d.depth === 0 ? 'open' : `${d.depth} behind it`;
  console.log(`  ${d.id.padEnd(14)} ${String(bar).padStart(14)}   ${d.why}`);
}
console.log(
  `\n  deepest doorway: ${snapshot.doorwayWorst}. Every edge behind one can be correct and the total still be wrong.\n`
);

// ---------------------------------------------------------------- save / diff

const saveName = flag('--save');
if (saveName) {
  const dir = path.join(root, 'dist', 'density');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${saveName}.json`), JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`  saved -> dist/density/${saveName}.json\n`);
}

const diffName = flag('--diff');
if (diffName) {
  const file = path.join(root, 'dist', 'density', `${diffName}.json`);
  if (!fs.existsSync(file)) {
    console.error(`  no snapshot named "${diffName}"`);
    process.exit(1);
  }
  const was = JSON.parse(fs.readFileSync(file, 'utf8'));
  const d = (a, b, unit = '') => {
    const delta = +(b - a).toFixed(2);
    const sign = delta > 0 ? '+' : '';
    return `${a}${unit} -> ${b}${unit}   (${sign}${delta}${unit})`;
  };
  console.log(`CHANGE SINCE "${diffName}"\n`);
  console.log(`  hard edges            ${d(was.hardEdges, snapshot.hardEdges)}`);
  console.log(`  no hard prerequisite  ${d(was.orphanCount, snapshot.orphanCount)}`);
  console.log(`  forced ordering       ${d(was.forcedOrderingPct, snapshot.forcedOrderingPct, '%')}`);
  console.log(`  path steps dictated   ${d(was.pathForcedPct, snapshot.pathForcedPct, '%')}`);
  const wasBy = new Map(was.paths.map((p) => [p.id, p]));
  console.log('\n  per path, mean choices:');
  for (const p of snapshot.paths) {
    const w = wasBy.get(p.id);
    if (w) console.log(`    ${p.id.padEnd(24)} ${d(w.meanChoices, p.meanChoices)}`);
  }
  console.log('');
}

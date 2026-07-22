#!/usr/bin/env node
// Scratch builder for the apologetics-foundations FULL path. Emits the path JSON
// with movements + ordered sequence, verifies it is a clean permutation of the
// 223 core nodes, then leaves validate-path-order.mjs to prove hard-order.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { nodes } = JSON.parse(readFileSync(resolve(ROOT, 'dist/nodes.json'), 'utf8'));
const core = new Set(nodes.filter((n) => n.canon_layer === 'core').map((n) => n.id));

// The arc: 8 movements. Each movement is [numeral, title, blurb, [node ids in order]].
const movements = [
  ['I', 'The World as Evidence',
   'Before any special claim, the universal witnesses: a cosmos that is made and ordered, a humanity that bears the image and yet is broken, a conscience that accuses. The case opens with the reality every worldview has to explain.',
   ['gen-1-3', 'john-1', 'gen-4-11']],

  ['II', 'The God Who Steps Into History',
   'The scandal of particularity: this God does not stay an abstraction. He binds himself to a named family and a datable rescue, defeats the gods of Egypt in public, and gives a moral law that points past itself to a Lawgiver. Faith stakes itself on events, not ideas.',
   ['gen-12-17', 'gen-18-23', 'gen-24-26', 'gen-27-36', 'gen-37-50',
    'exod-1-4', 'exod-5-11', 'exod-12-15', 'exod-16-18', 'exod-19-24', 'exod-25-31', 'exod-32-34', 'exod-35-40',
    'lev-1-7', 'lev-8-10', 'lev-16', 'lev-11-15', 'lev-17-22', 'lev-23-27',
    'num-1-10', 'num-11-14', 'num-15-19', 'num-20-25', 'num-26-36',
    'deut-1-4', 'deut-5-11', 'deut-12-26', 'deut-27-30', 'deut-31-34']],

  ['III', 'The Track Record and the Honest Questions',
   'The covenant is tested in real history: land won, kings raised, a throne promised that every later hope will hang on. And the faith proves it can face its own hardest questions — Job on innocent suffering, Ecclesiastes on meaninglessness — without flinching.',
   ['josh-1-5', 'josh-6-8', 'josh-9-12', 'josh-13-21', 'josh-22-24',
    'judg-1-2', 'judg-3-8', 'judg-9-12', 'judg-13-16', 'judg-17-21',
    'ruth',
    '1sam-1-7', '1sam-8-15', '1sam-16-20', '1sam-21-31',
    '2sam-1-6', '2sam-7', '2sam-8-10', '2sam-11-12', 'ps-51', '2sam-13-20', '2sam-21-24',
    'ps-1-2', 'ps-3-41', 'ps-23', 'ps-22', 'ps-42-72', 'ps-110', 'ps-73-89',
    '1kgs-1-4', '1kgs-5-8', '1kgs-9-11',
    'prov-1-9', 'prov-10-24', 'prov-25-29', 'prov-30-31',
    'job-1-2', 'job-3-31', 'job-32-37', 'job-38-42',
    'eccl-1-6', 'eccl-7-12', 'song']],

  ['IV', 'The God Who Declares the End: Prophecy on Trial',
   'The Bible stakes a claim it invites you to check: the true God tells what is coming before it happens, and the idols cannot. The kingdom slides toward ruin exactly as warned, and the most specific predictions sharpen to a point, reaching the centerpiece of the case in the Suffering Servant written centuries before the cross.',
   ['1kgs-12-16', '1kgs-17-22', '2kgs-1-8', '2kgs-9-17', '2kgs-18-25',
    'jonah', 'amos-1-6', 'amos-7-9', 'hos-1-3', 'hos-4-10', 'hos-11-14', 'mic-1-3', 'mic-4-7',
    'isa-1-5', 'isa-6', 'isa-7-12', 'isa-13-27', 'isa-28-35', 'nah', 'isa-36-39',
    'zeph', 'hab',
    'jer-1', 'jer-2-10', 'jer-11-20', 'jer-21-29', 'jer-30-33', 'jer-34-45', 'lam', 'obad', 'jer-46-52',
    'ezek-1-3', 'ezek-4-24', 'ezek-25-32',
    'dan-1', 'dan-2', 'dan-3', 'dan-4-6', 'dan-7',
    'ezek-33-37', 'ezek-38-39', 'ezek-40-48',
    'isa-40-48', 'isa-49-51', 'isa-52-53', 'isa-54-55', 'isa-56-66',
    '1chr-1-9', '1chr-10-29', '2chr-1-9', '2chr-10-28', '2chr-29-36',
    'ezra-1-6', 'hag', 'zech-1-8', 'zech-9-14', 'ezra-7-10', 'neh-1-7', 'neh-8-13',
    'ps-119', 'esth', 'dan-8-12', 'joel', 'mal',
    'ps-90-106', 'ps-107-150', 'ps-113-118', 'ps-120-134', 'ps-146-150']],

  ['V', 'The Claim Made Flesh: Who Is Jesus?',
   'The four witnesses present as history, and the man at the center makes claims no mere teacher makes. The trilemma, the I AM sayings, the signs offered as public evidence: the reader is forced to a verdict about his identity.',
   ['matt-1-2', 'luke-1-2', 'matt-3-4', 'luke-3-4', 'john-2-4', 'mark-1-3', 'luke-5-9',
    'matt-5-7', 'matt-8-10', 'mark-4-5', 'matt-11-15', 'mark-6-8', 'john-5-8',
    'matt-16-18', 'mark-9-10', 'luke-10-14', 'luke-15-19', 'john-9-12',
    'matt-19-21', 'mark-11-13', 'luke-20-21', 'matt-22-25', 'john-13-17']],

  ['VI', 'The Evidence: Crucified and Risen',
   'The claim meets its test at a tomb. Four accounts of the execution and the empty grave, with the details no inventor would choose, and the case turns on whether it happened. Everything the faith asserts stands or falls here.',
   ['matt-26-28', 'mark-14-16', 'luke-22-24', 'john-18-21', 'acts-1']],

  ['VII', 'The Defense Goes Out',
   'The witnesses who saw it cannot be silenced. The gospel is reasoned in the synagogues and on Mars Hill, defended before hostile rulers, argued to its foundations in Romans and Hebrews, and guarded against every rival philosophy. Here the charter finally lands: always be ready to give a reason, with gentleness and respect.',
   ['acts-2', 'acts-3-5', 'acts-6-7', 'acts-8-9', 'acts-10-12', 'acts-13-15', 'acts-16-20', 'acts-21-28',
    'gal', 'jas', '1thess', '2thess',
    '1cor-1-4', '1cor-5-7', '1cor-8-11', '1cor-12-14', '1cor-15-16',
    '2cor-1-7', '2cor-8-9', '2cor-10-13',
    'rom-1-4', 'rom-5-8', 'rom-9-11', 'rom-12-16',
    'eph-1-3', 'eph-4-6', 'col', 'phlm', 'phil',
    '1tim', 'titus', '2tim', '1pet', '2pet', 'jude',
    '1john', '2john', '3john',
    'heb-1-4', 'heb-5-7', 'heb-8-10', 'heb-11', 'heb-12-13']],

  ['VIII', 'The Verdict: The Case Proven',
   'The apologetic ends where history is headed: the Lamb on the throne, every rival power judged, the witnesses vindicated, and a new creation whose last word about itself is that these words are trustworthy and true.',
   ['rev-1-3', 'rev-4-5', 'rev-6-11', 'rev-12-14', 'rev-15-16', 'rev-17-19', 'rev-20', 'rev-21-22']],
];

// Movement I public why-now notes (the on-ramp; carries the arc's thesis).
const notesI = {
  'gen-1-3': "Start where every worldview has to start: is the universe made and meant, or brute accident? Genesis claims a cosmos that is ordered, good, and image-bearing, and a humanity that is real but fallen. That is the reality the rest of the case has to fit.",
  'john-1': "Reflection, not sequence: John's prologue is inspired commentary on the chapter you just read. It names the rational Word behind the world's order, the same Logos a skeptic senses when the universe turns out to be intelligible at all.",
  'gen-4-11': "The fall was not a one-time slip. Violence, pride, and scattered nations show the diagnosis holding across generations. Any honest apologetic has to account for why the world is this broken, and this is the Bible's answer.",
};

// ---- assemble ----
const seq = [];
for (const [, , , ids] of movements) for (const id of ids) seq.push(id);

// permutation check
const seen = new Set();
const dupes = [];
for (const id of seq) { if (seen.has(id)) dupes.push(id); seen.add(id); if (!core.has(id)) console.error('NOT CORE:', id); }
const missing = [...core].filter((id) => !seen.has(id));
console.log('sequence length:', seq.length, '/ 223 core');
if (dupes.length) console.error('DUPES:', dupes);
if (missing.length) console.error('MISSING:', missing);
if (seq.length !== 223 || dupes.length || missing.length) { console.error('PERMUTATION FAIL — not writing'); process.exit(1); }

const movementMeta = [];
let offset = 0;
for (const [numeral, title, blurb, ids] of movements) {
  movementMeta.push({ numeral, title, blurb, start_node: ids[0], node_count: ids.length });
  offset += ids.length;
}

const out = {
  id: 'apologetics-foundations',
  title: 'Apologetics Foundations',
  description: 'The whole Bible read as one sustained case for the credibility of the faith, arranged in the order a skeptic actually raises the questions: the world as evidence, a God who acts in history, prophecy staking a falsifiable claim, the identity of Jesus, the resurrection, the reasoned defense, and the final verdict. Every chapter of the 66-book canon, in eight movements.',
  audience: 'Anyone training to give a reason for the hope within them, with gentleness and respect, and anyone whose faith is under honest pressure.',
  canon_layers: ['core'],
  movements: movementMeta,
  sequence: seq.map((id) => (notesI[id] ? { node: id, note: notesI[id] } : { node: id })),
};

writeFileSync(resolve(ROOT, 'data/paths/apologetics-foundations.json'), JSON.stringify(out, null, 2) + '\n');
console.log('wrote data/paths/apologetics-foundations.json with', movementMeta.length, 'movements');
console.log(movementMeta.map((m) => `${m.numeral}. ${m.title} (${m.node_count})`).join('\n'));

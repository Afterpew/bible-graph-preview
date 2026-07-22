#!/usr/bin/env node
// Emits _notes-context.json: everything a Fable batch needs to write why-now notes
// for the apologetics-foundations full path — ordered sequence w/ titles+movement,
// voice rules, exemplars, and reusable lines salvaged from the old 20-node slice.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { nodes } = JSON.parse(readFileSync(resolve(ROOT, 'dist/nodes.json'), 'utf8'));
const path = JSON.parse(readFileSync(resolve(ROOT, 'data/paths/apologetics-foundations.json'), 'utf8'));
const title = new Map(nodes.map((n) => [n.id, n.title]));

// movement per node
const mvOf = new Map();
let i = 0;
for (const m of path.movements) {
  for (let k = 0; k < m.node_count; k++) { mvOf.set(path.sequence[i].node, `${m.numeral}. ${m.title}`); i++; }
}

const seq = path.sequence.map((s, idx) => ({
  step: idx + 1,
  node: s.node,
  title: title.get(s.node),
  movement: mvOf.get(s.node),
  hasNote: !!s.note,
}));

// Lines worth salvaging from the old slice (adapt, don't paste verbatim if the arc-position differs).
const reusable = {
  'isa-40-48': "The Bible's own apologetic for one God: 'declare the things to come.' The idols cannot, and this is the challenge staked in the open.",
  'dan-2': 'Predictive prophecy at empire scale: a succession of world kingdoms foreseen before they rise.',
  'ps-22': "The same messianic test case from the Psalms: divided garments, mocking crowds, pierced hands. Know the translation debate on that last word, because it will come up.",
  'john-5-8': "Jesus' own claims. 'Before Abraham was, I AM.' The trilemma lives in these chapters: a man who says this is either what he claims or badly wrong.",
  'john-9-12': 'Signs offered as evidence: the man born blind cross-examined by hostile authorities, Lazarus raised in public and undeniable.',
  'acts-16-20': 'Mars Hill: Paul quotes pagan poets, builds a bridge, names the unknown God. The model of contextual persuasion.',
  'acts-21-28': 'Five defenses before hostile audiences. Apologetics as testimony under pressure.',
  '2cor-10-13': 'Weapons that demolish arguments, wielded in weakness, boasting only in grace.',
  'col': "'See that no one takes you captive by philosophy,' because in Christ all the treasure is already held.",
  '2tim': 'Guard the deposit. Scripture breathed out by God, able to make one wise for salvation.',
  '1pet': 'The charter finally lands in its earned place (3:15): always ready to give a reason for the hope within you, with gentleness and respect.',
  'jude': 'Contend for the faith once for all delivered to the saints. The final charge to the defender.',
  'rom-1-4': 'Creation (ch. 1) and conscience (ch. 2) as witnesses no one escapes, then the verdict: all have sinned, and righteousness comes by faith.',
  'luke-1-2': "Note Luke's preface: eyewitnesses, careful investigation, an orderly account. The Gospels present themselves as history.",
  'matt-26-28': 'The resurrection accounts: guards, a sealed tomb, women as first witnesses, a detail no inventor of the story would choose.',
  'john-18-21': 'Thomas gets exactly what every skeptic asks for, and the book blesses those who will believe without it.',
  '1cor-15-16': 'The earliest evidence in the New Testament: a creed Paul received within a few years of the events, naming over five hundred witnesses most still alive, staking the entire faith on it being true.',
  'isa-52-53': "The centerpiece of the whole case. A Servant crushed for the guilt of others, written centuries before the cross and quoted more than any passage to explain it. If prophecy is the Bible's falsifiable test, here it puts everything on the table.",
};

const out = {
  path_id: 'apologetics-foundations',
  arc_description: path.description,
  movements: path.movements.map((m) => ({ numeral: m.numeral, title: m.title, blurb: m.blurb, node_count: m.node_count })),
  voice_rules: [
    'Audience: a curious 19-year-old. One or two short declarative sentences.',
    'Concrete over abstract. Say WHY this passage sits HERE in THIS apologetic arc — the connective logic, not a summary of the passage.',
    'NO em dashes. NO "not X but Y" construction (the one sanctioned exception is the label "Reflection, not sequence:" for a step that deliberately breaks chronological order).',
    'This arc reads the whole Bible as a sustained CASE for the credibility of the faith, in the order a skeptic raises the questions. Each note should advance that case, not just narrate.',
    'Scripture text and canon are never AI-sourced. Ground any load-bearing theological claim against a trusted 66-book authority rather than asserting it. Connective why-now notes rarely need this; use sparingly.',
  ],
  exemplars: {
    'gen-1-3': path.sequence[0].note,
    'john-1': path.sequence[1].note,
    'gen-4-11': path.sequence[2].note,
    'matt-1-2': 'The prophecy movement just closed, and now the claims start cashing out. Matthew opens with a genealogy and fulfillment quotations, presenting Jesus as the appointment the last movement predicted.',
    'rev-21-22': "The case closes where history is headed. Every rival power judged, the witnesses vindicated, and a new creation whose own last word about itself is that these words are trustworthy and true.",
  },
  reusable_lines: reusable,
  sequence: seq,
};

writeFileSync(resolve(ROOT, '_notes-context.json'), JSON.stringify(out, null, 2) + '\n');
console.log('wrote _notes-context.json:', seq.length, 'steps,', seq.filter((s) => !s.hasNote).length, 'need notes');

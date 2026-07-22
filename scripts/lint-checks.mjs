#!/usr/bin/env node
/**
 * lint-checks.mjs — mechanical gate for comprehension_check quality.
 *
 * Run scripts/build.mjs first (npm run lint-checks does this). Enforces the
 * shape rules that can be checked by machine. It does NOT and cannot judge the
 * semantic rules (hinge-not-trivia, plausible-but-wrong readings, keyword-scan
 * resistance, tradition-neutrality, Socratic quality) — those stay human/model
 * review. A clean lint means "no mechanical tells," not "good questions."
 *
 * Fails (exit 1) if any node's comprehension_check violates:
 *   - required fields present; options 3-4, distinct, non-empty; answer_index in range
 *   - hint present and names at least one verse reference (chapter:verse)
 *   - the correct option is NOT the single longest (the shape tell)
 *   - option word-count spread within a question <= 4
 *   - refined nodes carry exactly 3 assessment_questions
 * And across all checked questions (when >= 8):
 *   - correct answers use >= 3 distinct positions
 *   - no single position holds > 45% of answers
 *
 *   node scripts/lint-checks.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { nodes } = JSON.parse(readFileSync(resolve(ROOT, 'dist', 'nodes.json'), 'utf8'));

const errors = [];
const words = (s) => s.trim().split(/\s+/).length;
const posCount = {};
let qTotal = 0;
let checked = 0;

for (const n of nodes) {
  if (!Array.isArray(n.comprehension_check) || n.comprehension_check.length === 0) continue;
  checked++;
  if (n.comprehension_check.length < 1 || n.comprehension_check.length > 2) {
    errors.push(`${n.id}: comprehension_check must hold 1-2 questions`);
  }
  if (!Array.isArray(n.assessment_questions) || n.assessment_questions.length !== 3) {
    errors.push(`${n.id}: a refined node must have exactly 3 assessment_questions`);
  }
  n.comprehension_check.forEach((q, qi) => {
    const at = `${n.id} Q${qi + 1}`;
    if (!q.question || typeof q.question !== 'string') errors.push(`${at}: missing question`);
    if (!q.why) errors.push(`${at}: missing why`);
    if (!q.hint) errors.push(`${at}: missing hint`);
    else if (!/\d+:\d+/.test(q.hint)) errors.push(`${at}: hint names no verse reference (chapter:verse)`);
    if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4) {
      errors.push(`${at}: options must be 3-4`);
      return;
    }
    if (q.options.some((o) => !o || typeof o !== 'string')) errors.push(`${at}: empty option`);
    if (new Set(q.options).size !== q.options.length) errors.push(`${at}: duplicate options`);
    if (!Number.isInteger(q.answer_index) || q.answer_index < 0 || q.answer_index >= q.options.length) {
      errors.push(`${at}: answer_index out of range`);
      return;
    }
    const lens = q.options.map(words);
    const max = Math.max(...lens);
    const min = Math.min(...lens);
    const isSingleLongest = lens[q.answer_index] === max && lens.filter((l) => l === max).length === 1;
    if (isSingleLongest) errors.push(`${at}: correct answer is the single longest option (shape tell)`);
    if (max - min > 4) errors.push(`${at}: option length spread ${max - min} words is too wide`);
    posCount[q.answer_index] = (posCount[q.answer_index] ?? 0) + 1;
    qTotal++;
  });
}

if (qTotal >= 8) {
  if (Object.keys(posCount).length < 3) {
    errors.push(`answer positions use only ${Object.keys(posCount).length} distinct slots across ${qTotal} questions`);
  }
  for (const [idx, c] of Object.entries(posCount)) {
    if (c / qTotal > 0.40) errors.push(`answer position ${idx} holds ${Math.round((100 * c) / qTotal)}% of answers (> 40%)`);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} comprehension-check lint error(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ comprehension checks lint clean: ${checked} nodes, ${qTotal} questions, position spread ${JSON.stringify(posCount)}`);

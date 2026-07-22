#!/usr/bin/env node
/**
 * make-viewer.mjs — builds dist/viewer.html: a self-contained interactive
 * explorer (arc chart + node browser + reading paths) with the dataset
 * inlined. Run after build.mjs:
 *
 *   node scripts/build.mjs && node scripts/make-viewer.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => JSON.parse(readFileSync(resolve(ROOT, 'dist', p), 'utf8'));

const { nodes } = load('nodes.json');
const { edges } = load('edges.json');
const { paths } = load('paths.json');

const slim = {
  nodes: nodes.map((n) => ({
    id: n.id, title: n.title, book: n.book, ch: n.chapters, t: n.testament,
    dom: n.domain, tier: n.difficulty_tier, depth: n.prerequisite_depth, layer: n.canon_layer, sum: n.summary,
    themes: n.key_themes, trad: n.tradition_notes || null,
    conns: n.connections, paths: n.suggested_reading_paths,
  })),
  edges: edges.map((e) => ({ n: e.node, p: e.prerequisite, s: e.strength, sc: e.scope, t: e.type, r: e.reason })),
  paths: paths.map((p) => ({ id: p.id, title: p.title, description: p.description, audience: p.audience, seq: p.sequence })),
};

const template = readFileSync(resolve(ROOT, 'scripts', 'viewer-template.html'), 'utf8');
const html = template.replace('/*__DATA__*/', JSON.stringify(slim));
writeFileSync(resolve(ROOT, 'dist', 'viewer.html'), html);
writeFileSync(resolve(ROOT, 'docs', 'index.html'), html); // GitHub Pages demo
console.log(`dist/viewer.html written (${(html.length / 1024).toFixed(0)} KB)`);

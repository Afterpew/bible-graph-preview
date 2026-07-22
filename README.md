# Bible Graph

**[▶ Live explorer](https://afterpew.github.io/bible-graph/)** — browse the graph: the Ascent view, prerequisite trails, and all nine reading paths.

**[Engine Manual](MANUAL.md)** — what it is, the data model, integration recipes, what is machine-enforced, and how it was built.
**[ID Contract](ID-CONTRACT.md)** — the stability promise, if you are deciding whether to build on this.

An open, machine-readable **prerequisite graph of the Bible** — directional "understand A before reading B" edges across the 66-book canon, with an additive deuterocanonical layer and curated reading paths.

> **Version:** `v0` · **Nodes:** 306 (290 core + 16 deuterocanonical) · **Prerequisite edges:** 426 · **Reading paths:** 9 · **Verse-anchored** · **mastery gates on every node**

## What this is

Bible reading plans exist. Cross-references exist. Study-Bible margin notes exist. But all of those are either linear sequences or *associative* links ("A and B are related"). This dataset is different: it is a **directed acyclic graph of understanding**, where every edge is *directional* — "read Daniel 7 before Revelation 20," not merely "Daniel 7 and Revelation 20 are related."

- **306 nodes** — each a Bible chapter or a coherent chapter-group (e.g. `gen-1-3` "Creation and Fall," `isa-52-53` "The Suffering Servant"), with a title, summary, difficulty tier (1-5), literary domain, and key themes. Every chapter of every book belongs to exactly one node — no gaps, no overlaps (machine-verified).
- **426 prerequisite edges** — each tagged `hard`/`soft`, each `hard` edge marked `sequence` or `foundation` (see below), typed by *why* the dependency exists (`narrative`, `theological`, `literary`, or `quotation`), and carrying a one-line reason a human can read.
- **Connections** — bidirectional enrichment links (related, not required), each with a reason.
- **9 reading paths** — curated ordered sequences through the graph, from a 19-step New Believer doorway to three full 290-node journeys.
- **Canon layers** — the core graph is the 66-book Protestant canon and is fully self-contained; deuterocanonical books are an additive, toggleable layer.

## Difficulty and depth are two different things

Two fields on every node look similar and are not:

| Field | Means | Source |
|---|---|---|
| `difficulty_tier` | How hard this passage is to **understand**, 1-5 | Authored |
| `prerequisite_depth` | How many nodes you must read **before** it, following hard edges | Derived at build |

They are free to disagree, and they often should. **Revelation 21-22 is `tier 3, depth 12`** — one of the most readable pages in Scripture, sitting at the very end of the story. **Revelation 20 is `tier 5, depth 10`** — the millennium and the two resurrections, genuinely contested and difficult, one step earlier. A later passage being easier than an earlier one is not a data error; it is a fact about the Bible.

**If you are building "what is this reader ready for," use `prerequisite_depth`, not `difficulty_tier`.** Sorting an onboarding flow by tier will offer a beginner a readable chapter that sits a dozen nodes deep.

## Reading paths declare their own shape

Every path states two things about itself, and `npm run validate` holds it to them:

- `coverage`: `full` (walks every node of its canon layers) or `slice` (deliberately partial — a doorway or themed selection)
- `order`: `enforced` (every hard prerequisite must appear earlier) or `advisory` (orders by something else, and says why in its description)

Eight of the nine ship as `order: enforced`. **`bible-in-a-year` ships as `order: advisory`**, and says why in its own description: interleaving the Gospels from January means the New Testament is regularly read ahead of the Old Testament passages it builds on. That is the trade a year-long plan makes so no reader spends four months in Leviticus. The node's own prerequisite edges still say what it assumes, and a reader can follow them at any point.

## What a `hard` edge means

`hard` is scarce on purpose: it means a reader who skips the source **will misread** the passage, not merely miss depth. Where the New Testament quotes the Old and then interprets its own quotation — Peter expounding Joel at Pentecost, Jesus answering the tempter from Deuteronomy — the source is `soft`. The apostles supply the interpretive key themselves. `hard` is reserved for the cases where they don't.

## Two reasons a passage stands behind another

Every `hard` edge also carries a **`scope`**, because "read this first" turns out to mean two different things.

| `scope` | Because… | Travels? |
|---|---|---|
| `sequence` | **it is a story.** Genesis 30 stands behind Genesis 31 because the second continues the first | No — binds those two and stops |
| `foundation` | **it is an idea.** Genesis 12-17 stands behind Genesis 18-23 because the covenant promise is what gives the binding of Isaac its weight | Yes — carries on to whatever needs Genesis 18-23 |

Treat both as travelling and they chain into nonsense: Genesis 30 stands behind Genesis 31, which stands behind Genesis 32, and twenty defensible links later the graph is claiming you must read about Jacob's wedding before Isaiah 53. Every link true, the sum absurd. Separating the two is what keeps `prerequisite_depth` honest — Isaiah 52-53 sits at depth 6 rather than depth 25.

Of 278 hard edges, **182 are `sequence` and 96 are `foundation`.** That second number is the graph's conceptual backbone, and it is the smaller one on purpose.

```js
const prereqs = edges.edges.filter((e) => e.node === id && e.strength === 'hard');

prereqs.filter((e) => e.scope === 'sequence');    // "what do I read next?"
prereqs.filter((e) => e.scope === 'foundation');  // "what do I need to understand this?"
```

A thematic plan that jumps around the canon wants `foundation` only. A chronological plan wants both. Something checking whether a reader is equipped for a passage wants `foundation` alone — 96 edges, not 278. `scope` appears on `hard` edges only; a `soft` edge constrains nothing, so it has nothing to pass along.

## The canon-layer design

Every node carries a `canon_layer`:

| Layer | Books | Count |
|---|---|---:|
| `core` | The 66-book canon shared by all Christian traditions | 290 |
| `catholic_deuterocanon` | Tobit, Judith, Greek Esther, Wisdom, Sirach, Baruch, Greek Daniel, 1-2 Maccabees | 11 |
| `orthodox_addition` | 1 Esdras, Prayer of Manasseh, Psalm 151, 3-4 Maccabees | 5 |

**The canon rule (machine-enforced):** a `core` node may never have a prerequisite outside the core. Deuterocanonical edges point *into* the core, never the reverse. "To understand Wisdom of Solomon, read Proverbs first" — yes. "To understand Romans, you need Wisdom of Solomon" — never. Toggle the extra layers off and the 66-book graph stands alone, byte-for-byte intact. `scripts/validate.mjs` fails the build on any violation.

**Naming:** these books are called *deuterocanonical* in Catholic/Orthodox usage and *apocrypha* in Protestant usage. `dist/manifest.json` carries both labels (`canonLayerLabels`) so consuming apps can present whichever fits their audience.

## Files

Source of truth lives in [`data/`](data/); compiled output in [`dist/`](dist/). See [`schema/`](schema/) for JSON Schemas.

| File | What it holds |
|---|---|
| `data/books/*.json` | One file per book (80 files): nodes plus their incoming prerequisite edges. **Edit these.** |
| `data/paths/*.json` | One file per reading path (9 files). **Edit these.** |
| `dist/nodes.json` | All nodes, flat, in canonical order, with derived fields. Generated. |
| `dist/edges.json` | All prerequisite edges as first-class objects. Generated. |
| `dist/paths.json` | All reading paths. Generated. |
| `dist/manifest.json` | Counts, canon-layer labels, SHA-256 checksums. Generated. |
| `dist/verse-index.json` | Verse reference to node lookup, so any Bible app can resolve "John 3:16" without a mapping layer. Generated. |

### A node (from `dist/nodes.json`)

```json
{
  "id": "rev-20",
  "title": "The Thousand Years",
  "book": "Revelation",
  "chapters": [20],
  "testament": "NT",
  "domain": "Apocalyptic",
  "canon_layer": "core",
  "difficulty_tier": 5,
  "summary": "The dragon bound for a thousand years…",
  "key_themes": ["millennium", "Satan's end", "final judgment", "book of life"],
  "prerequisites": ["rev-17-19", "ezek-38-39", "dan-7"],
  "connections": [{ "node": "rom-5-8", "reason": "…" }],
  "tradition_notes": "The millennium is the textbook case of honest divergence…",
  "suggested_reading_paths": ["bible-in-a-year"]
}
```

### An edge (from `dist/edges.json`)

```json
{
  "node": "rev-20",
  "prerequisite": "ezek-38-39",
  "strength": "hard",
  "scope": "foundation",
  "type": "quotation",
  "reason": "'Gog and Magog' is quoted by name; the final battle is Ezekiel's oracle compressed to a paragraph."
}
```

`node` **depends on** `prerequisite`. Reverse the edge to get "unlocks." `scope` is on `hard` edges only. Edge types: `narrative` (story continuity), `theological` (a concept built on earlier), `literary` (structure/genre/echo), `quotation` (direct citation or allusion).

## Difficulty tiers

| Tier | Meaning | Examples |
|---|---|---|
| 1 | No background needed — the great entry points | Genesis 1-3, Psalm 23, John 1, Ruth |
| 2 | Benefits from basic biblical literacy | Exodus, Acts, Philippians |
| 3 | Requires covenant, law, or early-church context | Leviticus, Galatians, Romans 1-8 |
| 4 | Requires significant OT background or theological framework | Hebrews, Ezekiel's visions, Job's dialogues |
| 5 | Requires broad knowledge across both testaments | Revelation's cycles, Daniel 8-12, Romans 9-11 |

## Reading paths

`new-believer` · `ot-foundations` · `gospel-story` · `gospel-parallels` · `pauline-theology` · `prophecy-fulfillment` · `wisdom-literature` · `apologetics-foundations` · `bible-in-a-year`

Each is an ordered array of node IDs with per-step notes. Paths are the source of truth for each node's `suggested_reading_paths` field (derived at build time).

## Using it

Pure data — no runtime, no dependencies. Load the JSON and go.

```js
import nodes from './dist/nodes.json' with { type: 'json' };
import edges from './dist/edges.json' with { type: 'json' };

const byId = new Map(nodes.nodes.map((n) => [n.id, n]));

// What should I read before Revelation 20?
const before = edges.edges
  .filter((e) => e.node === 'rev-20')
  .map((e) => `${byId.get(e.prerequisite).title} — ${e.reason}`);

// Core-only view (Protestant canon):
const core = nodes.nodes.filter((n) => n.canon_layer === 'core');
```

Build and verify:

```bash
npm run build      # data/ -> dist/
npm run validate   # referential integrity, DAG check, canon rule, chapter coverage, checksums
```

## Theological posture

- **The Nicene Creed is the floor.** Nothing in this graph contradicts it.
- **Tradition-neutral above the floor.** Where Catholic, Orthodox, and Protestant readings genuinely diverge (Matthew 16:18, James 2, John 6, the millennium, the deuterocanon itself), the node's `tradition_notes` field states the divergence factually and adjudicates nothing.
- **Written for a curious 19-year-old,** not a seminary professor — scholarly in substance, accessible in voice, devotional in neither.
- **No inspiration doctrine is assumed.** Inerrancy and infallibility are tradition-specific positions; the graph treats the text as the text and maps how its parts depend on each other.

Prerequisite judgments are editorial calls grounded in narrative dependency, theological dependency, literary dependency, and quotation/allusion. They are arguable — that's what pull requests are for. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

**Free for personal use, churches, ministries, non-profits, schools, and research. You do not need
to ask.**

**Commercial use needs permission first** — paid apps, subscriptions, SaaS, monetised sites, or
products sold to churches and institutions. Write to afterpew@gmail.com and say what you are
building. It is read personally, terms are set case by case, and they are usually generous for small
builders and ministry work.

Ship products built on this freely. Do not republish the dataset itself as data without asking.

Full terms in [LICENSE](LICENSE), written plainly.

### Attribution

> Bible Graph · © AfterPew · https://github.com/afterpew/bible-graph

## Provenance

The graph structure, summaries, and edge rationales were drafted with LLM assistance and are being reviewed by human editors; prerequisite judgments follow mainstream, cross-tradition biblical scholarship. Scripture phrases quoted in summaries are brief quotations used descriptively. Chapter counts and canon lists follow standard critical editions (deuterocanonical chapter counts per the NRSV apocrypha).

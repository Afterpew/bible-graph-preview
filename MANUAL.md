# Bible Graph — Engine Manual

**A computable model of biblical learning dependencies.**

Version v0 · [Live explorer](https://afterpew.github.io/bible-graph/) · Maintained by AfterPew

---

## 1. What this is

Someone opens the Bible to Revelation and is lost by the third page.

Revelation reworks Daniel, Ezekiel, and Exodus continuously and almost never names them, moving on without saying
so. The book assumes a specific body of prior reading and never names it.

Pastors and teachers have carried that knowledge in their heads for centuries. Until now, it has
existed nowhere that software could access it.

Bible Graph writes it down.

### What it actually is

The Bible cut into **306 readable pieces**, with **426 arrows** between them. Each arrow runs from
something you should understand first to something that leans on it, and each one carries a plain
sentence explaining why.

```json
{ "node": "rev-20", "prerequisite": "ezek-38-39",
  "strength": "hard", "scope": "foundation", "type": "quotation",
  "reason": "Gog and Magog is quoted by name; the final battle is Ezekiel's oracle compressed." }
```

That reads: *before Revelation 20, read Ezekiel 38-39, because "Gog and Magog" turns up in
Revelation with no explanation and Ezekiel is where the phrase comes from.*

Multiply that by 426 and you have a map of what stands behind what, across the whole Bible. The
prerequisite relation is acyclic, so a topological sort always yields a valid reading order.

### How it differs from what already exists

Bible reading plans exist. Cross-reference databases exist. Study-Bible margin notes exist. All of
them are either linear sequences or *associative* links: A and B are related.

This is different. Every arrow here points one direction and shows its work:

- **Reading plans** hand you an order and keep the reasoning to themselves. Ask why January 14th
  sits where it does and the plan has no answer.
- **Cross-reference databases** map connections both ways at once. They report that two verses are
  related. A curriculum needs the part they leave out: which verse comes first.
- **Study Bible notes** are associative and local. They explain the verse under your thumb, not what
  you needed before turning to it.

A reader who disagrees with one of these arrows has a written sentence to argue with.

### What you get

| | |
|---|---|
| **306 nodes** | 290 in the 66-book canon plus 16 deuterocanonical. Every chapter of every book belongs to exactly one node, and the build fails if that is ever untrue |
| **426 prerequisite arrows** | each marked `hard` or `soft`; each `hard` one further marked `sequence` (a story continuing) or `foundation` (an idea being used); each typed by why it exists; each with a written reason |
| **Full teaching content on every node** | summary, key verses, themes, reading time, difficulty, tone, discussion prompt, teaching concepts, assessment questions |
| **606 comprehension questions** | written to test understanding rather than recall, two per node |
| **9 reading paths** | curated orderings, from a 19-step doorway for new believers to three complete journeys through all 290 |
| **A verse index** | hand it "John 3:16" and it hands back the node, so you never write a mapping layer |

Everything is plain JSON in a folder. No API, no key, no service that can go down. `dist/` ships
built, so you can clone it and read the files without running anything.

### It works with no internet at all

Worth saying outright, because it is easy to miss in a world of hosted APIs: **this dataset has no
network dependency of any kind.** Five JSON files, under 2 MB, and every question it can answer is answerable on a laptop in a
room with no signal.

That matters most where connectivity is worst: translation teams in the field, prison ministry,
rural churches running a study off one laptop, offline mobile in regions where data is expensive.
Bundle the files and ship.

It also means a copy you already hold cannot be revoked, rate-limited, or deprecated. Whatever you
clone under the open licence keeps working, on the terms it carried when you cloned it.

### What it does *not* try to be

An honest scope note, because the distinction shapes what it is good for.

This is **structure, not content.** It knows Hebrews leans on the Day of Atonement. It has no opinion
on what Hebrews means. It holds no Bible text, no commentary, no theology beyond the reasoning
attached to its own claims.

That is deliberate. Language models are strong at exposition and weak at inferring what a reader
needed *first* — ask one to order a curriculum and it will produce something fluent and unreliable.
Prerequisite knowledge has to be authored, reviewed, and written down rather than generated on
demand. Writing it down is the whole job here.

---

## 2. Who it is for and what gets built with it

**You, if you are building something for Christians and you keep hitting the same wall:** Bible text
is available everywhere and costs nothing, and text by itself has no idea what a reader is ready for.

Most Christian software stops at retrieval, because ordering requires knowledge the text does not carry. An app can show someone any chapter
instantly. It cannot tell whether that chapter will land or bounce, what to offer next, or whether
the person actually understood the last thing they read.

This dataset answers exactly those questions:

- *What should this person read before this passage?* — the arrows
- *What is this reader ready for right now?* — `prerequisite_depth`, how many pieces stand behind it
- *How hard is this passage on its own terms?* — `difficulty_tier`, which is a different question
- *Did they understand it, or just finish it?* — the comprehension checks
- *What turns 1,189 chapters into a journey instead of a list?* — the reading paths

### Things that get built with this

**A study app that opens up as a reader earns it.** Depth tells you what is reachable; the
comprehension check decides whether they have earned the next thing.

**A discipleship curriculum that stops guessing at order.** A common failure in small-group material
is reaching Hebrews before the sacrificial system it argues from. The arrows say what has to come first, and say why
in a sentence a group leader can read aloud.

**A small-group tool that hands the leader the right question.** Every node has a discussion prompt
written for people talking to each other, not for a worksheet.

**A catechesis or membership platform that can prove comprehension.** 606 questions, each with the
reasoning behind the right answer and a hint pointing at the verses that settle it.

**An apologetics course that establishes literacy before argument.** Nobody defends a doctrine they
have not yet met in the text.

**A church's own reading plan, built in an afternoon.** Pick a theme, pull the nodes, and let the
arrows check your order for you. Section 5 shows the code.

None of these require a partnership, an integration conversation, or anything from us to get
started. It is a folder of files. Commercial use does require a licence, which is section 13 and is
the one thing here that involves talking to a human.

---

## 3. The data model

### Files

Source of truth is `data/`; everything in `dist/` is generated. Never hand-edit `dist/`.

| File | Holds |
|---|---|
| `data/books/*.json` | one file per book: nodes plus their incoming prerequisite edges. **Edit these.** |
| `data/paths/*.json` | one file per reading path. **Edit these.** |
| `dist/nodes.json` | all nodes, flat, with derived fields |
| `dist/edges.json` | all edges as first-class objects |
| `dist/paths.json` | all reading paths |
| `dist/verse-index.json` | verse reference → node lookup |
| `dist/manifest.json` | counts, canon labels, SHA-256 checksums |
| `dist/viewer.html` | the self-contained interactive explorer |

### What is on every node

**Twenty-one fields are filled in on all 306 nodes**, with no gaps. Most carry teaching material;
the rest carry structure.

| Field | What it holds | What it is for |
|---|---|---|
| `title` | a human name, not a reference | "Water to Wine, New Birth, Living Water" reads better in a UI than "John 2-4" |
| `summary` | a real paragraph | preview text, cards, lesson intros |
| `verse_span` | exact opening and closing verse | the authoritative boundary, verified against the Berean Standard Bible |
| `key_verses` | the verses that carry the passage | pull quotes, memory work, sharing cards |
| `key_themes` | 3-5 tags | filtering, thematic paths, search |
| `difficulty_tier` | 1-5, how hard to understand | matching material to a reader |
| `prerequisite_depth` | how many pieces stand behind it | *what is this person ready for* |
| `reading_time_minutes` | honest estimate | daily plans, "you have 10 minutes" features |
| `content_density` | light / moderate / heavy | pacing, so a plan is not three heavy days in a row |
| `emotional_tone` | e.g. `["hopeful","reflective"]` | grief plans, Advent, seasons of life |
| `domain` | narrative, law, wisdom, prophecy, gospel, epistle, apocalyptic | genre-aware handling |
| `discussion_prompt` | one question written for people talking | small groups, straight out of the box |
| `teaching_concepts` | named concepts, each with an explanation | lesson outlines, teacher notes |
| `assessment_questions` | open-ended questions | written work, journaling, one-on-one |
| `completion_criteria` | what "done" means in plain words | completion tracking with a stated criterion |
| `comprehension_check` | two multiple-choice questions with reasoning and hints | proving understanding, unlocking |
| `tradition_notes` | where traditions genuinely diverge | surface divergence without adjudicating it |
| `prerequisites` | the incoming arrows | ordering |
| `connections` | related passages, with reasons | "see also," enrichment, thematic paths |
| `canon_layer` | core, Catholic, Orthodox | serve the right canon to the right user |
| `suggested_reading_paths` | which paths include it | navigation |

### One node, straight from the file

This is `john-2-4`. The structural and long-form fields are trimmed here for space:

```json
"title": "Water to Wine, New Birth, Living Water",
"reading_time_minutes": 25,
"content_density": "moderate",
"emotional_tone": ["hopeful", "reflective"],
"difficulty_tier": 2,
"prerequisite_depth": 2,
"key_verses": ["John 3:3", "John 3:16", "John 4:13-14"],
"completion_criteria": "Describe the conversations with Nicodemus and the Samaritan woman, and
                        explain what Jesus means by new birth and living water."
```

Its discussion prompt:

> *"Nicodemus the respected insider comes at night and leaves confused; the Samaritan woman, an
> outsider drawing water at noon, leaves as an evangelist. Comparing the two conversations, what
> does Jesus seem to be looking for in a person, and which of the two do you resemble more right
> now?"*

One of its two comprehension questions:

> **Purification jars at Cana, the temple courts, Jacob's well. What is John doing as Jesus moves
> through these settings in chapters 2-4?**
>
> - ✅ Presenting Jesus as what each institution was pointing toward
> - Showing Jesus abolish religion in favor of private spirituality
> - Proving Israel's worship had always been empty of God
> - Collecting early miracles in the order eyewitnesses recalled them
>
> *Why:* John 2:21 makes the move explicit, the true temple is Jesus' own body, and John 4:14 offers
> him as the water that finally satisfies.
>
> *Hint:* Read John 2:19-21 and John 4:13-14. Notice what the temple saying and the well
> conversation each turn out to be about.

Answering that question requires having read the three scenes and seen what links them. Every wrong
option is a plausible misreading rather than an obvious throwaway, which is what makes the right one
worth finding. All 606 questions were written to that standard, and the wrong answers took the most
work: any distractor a careful reader could defend from the text, or that a real Christian tradition
holds, was disqualified and rewritten. A gate must never mark good reasoning wrong.

### The two fields people confuse

**`difficulty_tier` (1-5)** is how hard the passage is to *understand*. **`prerequisite_depth`** is how
many nodes stand before it in the graph. They are independent, and they are allowed to disagree.

Revelation 21-22 is `tier 3, depth 12`: plain narrative prose with few external dependencies, sitting
at the very end of the story. Revelation 20 is `tier 5, depth 10`: the millennium and the two resurrections,
genuinely contested and difficult, one step earlier.

**If you are building "what is this reader ready for," use `prerequisite_depth`.** Sorting an
onboarding flow by `difficulty_tier` will offer a beginner a readable chapter with a dozen nodes
standing behind it.

### Edges

```json
{ "node": "heb-8-10", "prerequisite": "lev-16",
  "strength": "hard", "scope": "foundation", "type": "theological",
  "reason": "The once-for-all argument is a sustained contrast with the Day of Atonement's annual repetition." }
```

`node` depends on `prerequisite`. Reverse it to get "unlocks." `type` is `narrative`,
`theological`, `literary`, or `quotation`.

**`hard` is scarce and means the reader will MISREAD without it**, not merely miss depth. **`soft`**
means enriching but not required.

This field constrains more downstream behaviour than any other in the schema, and you can move it in
your own app. Section 4 is about where the line sits, why it sits there, and what happens
when you move it. Read it before you write code against `strength`.

### The two reasons a passage stands behind another

Every `hard` edge also carries a **`scope`**, and this is the field that took the longest to get right.

A passage can stand behind another one for two completely different reasons.

**Because it is a story.** Genesis 30 stands behind Genesis 31 because the second continues the
first. Real, and entirely local. It tells you nothing whatsoever about Isaiah 53.

```json
{ "node": "gen-4-5", "prerequisite": "gen-1-3", "scope": "sequence",
  "reason": "The spiral of violence and the flood only make sense as the outworking of the Fall." }
```

**Because it is an idea.** Genesis 12-17 stands behind Genesis 18-23 because the covenant promise is
the thing that gives the binding of Isaac its weight. That kind of dependency travels: whatever needs
Genesis 18-23 also needs the promise.

```json
{ "node": "gen-18-23", "prerequisite": "gen-12-17", "scope": "foundation",
  "reason": "The Binding of Isaac has its force only if you know Isaac is the covenant son waited for over decades." }
```

| | means | travels? |
|---|---|---|
| `sequence` | keep reading. B continues a story or argument A began | no, stops at B |
| `foundation` | you need this idea. B uses something A establishes and never re-establishes | yes, onward |

**Why this exists.** Treat both kinds as travelling and they chain. Genesis 30 stands behind Genesis
31, which stands behind Genesis 32, and twenty defensible links later the graph is claiming you must
read about Jacob's wedding before Isaiah 53. Sorting `sequence` from `foundation` keeps the
arithmetic honest; section 11 records the batch where it did not, and what that cost.

Of 278 hard edges, **182 are sequence and 96 are foundation.** That second number is the graph's real
conceptual backbone, and it is the smaller one on purpose.

**What it buys you as a builder.** Two questions people actually ask are now separate queries:

```js
const prereqs = edges.filter((e) => e.node === id && e.strength === 'hard');

// "what do I read next?"        -> follow the story
prereqs.filter((e) => e.scope === 'sequence');

// "what do I need to get this?" -> follow the ideas
prereqs.filter((e) => e.scope === 'foundation');
```

A thematic reading plan that jumps around the canon wants `foundation` only; narrative order is
irrelevant to it. A chronological plan wants both. An AI tutor checking whether a learner is equipped
for a passage wants `foundation` and nothing else, which is 96 edges rather than 278.

`scope` appears on `hard` edges only. A `soft` edge constrains nothing, so it has nothing to pass on.

### When two passages illuminate each other

Mutual illumination is real. Romans and James interpret each other; so do Isaiah 53 and the passion
narratives. A graph that forbids cycles looks like it cannot model that.

It can. The prerequisite relation is acyclic; `connections` is not, and that is where mutual
illumination lives.

```json
"connections": [
  { "node": "gen-18-23",
    "reason": "James cites the Binding of Isaac as faith 'completed by works' — the same Abraham Paul cites for faith alone." }
]
```

**`connections` are bidirectional, reasoned, and non-binding.** There are 422 of them. Romans and
James point at each other; neither is required before the other; a reader who starts with either one
is fine. That is exactly the mutual illumination the objection is about, and it is in the file.

What must stay acyclic is the *prerequisite* relation, and it has to, for a plain reason: if A must
be understood before B and B must be understood before A, there is no order a reader can follow. A
cycle in prerequisites is not a deep truth about Scripture; it is an instruction nobody can obey.
`validate.mjs` fails the build on one.

So the model carries three distinct relations, and keeping them apart is most of what makes it
useful:

| Relation | Field | Direction | Binding? |
|---|---|---|---|
| you need this idea first | `prerequisites` + `scope: foundation` | one way | yes, and it travels |
| read this one right before | `prerequisites` + `scope: sequence` | one way | yes, locally |
| these two light each other up | `connections` | both ways | no |

That distinction was reviewed rather than assumed. Where the New Testament quotes the Old *and then
interprets its own quotation* — Peter expounding Joel at Pentecost, Jesus answering the tempter from
Deuteronomy, Luke 4 reading Isaiah 61 — the source is `soft`, because the apostle supplies the
interpretive key himself. Of 17 quotation edges originally marked `hard`, 16 were reclassified after
adjudication. One survived: `rev-20 ← ezek-38-39`, because "Gog and Magog" is named with no
exposition, and without Ezekiel the label invites modern geopolitical misreading.

### Canon layers

| Layer | Books | Count |
|---|---|---|
| `core` | the 66-book canon shared by all Christian traditions | 290 |
| `catholic_deuterocanon` | Tobit, Judith, Greek Esther, Wisdom, Sirach, Baruch, Greek Daniel, 1-2 Maccabees | 11 |
| `orthodox_addition` | 1 Esdras, Prayer of Manasseh, Psalm 151, 3-4 Maccabees | 5 |

**The canon rule, machine-enforced:** a `core` node may never depend on anything outside the core.
Deuterocanonical edges point *into* the core, never the reverse. Toggle the extra layers off and the
66-book graph stands alone, byte-for-byte intact. `validate.mjs` fails the build on any violation.

`dist/manifest.json` carries both naming conventions (`deuterocanonical` and `apocrypha`) so your app
can use whichever fits your audience.

---

## 4. Where the line is drawn

Everything this engine is good for turns on one decision, made once per edge: `hard` or `soft`.

That decision is not a labelling convention, and the setting is not only ours. You can move it in
your own app, so it is worth understanding what moves when you do.

### The two ways to get it wrong

**Mark too many edges `hard`** and the graph starts telling people they must complete forty things
before they are permitted to read one. The failure has an old and specific name:

> *"Woe to you as well, experts in the law! For you weigh men down with heavy burdens, but you
> yourselves will not lift a finger to lighten their load."* (Luke 11:46)
>
> *"You shut the kingdom of heaven in men's faces. You yourselves do not enter, nor will you let in
> those who wish to enter."* (Matthew 23:13)

A prerequisite graph is a gate by construction. Set it too tight and it is the scribes' gate,
however defensible each individual edge was.

**Mark too few** and you have abandoned the reader to a book that genuinely is hard. That error is
in the text too:

> *"they were like sheep without a shepherd. And He began to teach them many things."* (Mark 6:34)

Withholding structure is not humility. It can be neglect.

### The standard

The case that maps most exactly onto this dataset is Acts 8. An Ethiopian official is reading
Isaiah 53 in a chariot, with no prerequisites and no preparation, and he is genuinely stuck:

> *Philip ran up and heard the man reading Isaiah the prophet. "Do you understand what you are
> reading?" — "How can I," he said, "unless someone guides me?"* (Acts 8:30-31)

So the graph should exist. He needed exactly what this dataset holds. But notice what Philip
actually does: *"beginning with this very Scripture, he told him the good news about Jesus"*
(Acts 8:35). He starts from the passage the man already had open. He does not send him back to
Exodus first.

That is the operative test for every `hard` edge in this file:

| | |
|---|---|
| **Hard edge as Philip** | *here is what you would otherwise misread* |
| **Hard edge as scribe** | *you are not qualified for this yet* |

Same data structure, opposite spirit. What separates them is the test each edge had to pass, and
how few pass it.

### Where we set it, and why you can tell

Density here is measured rather than asserted. Section 11 documents the instruments, what they
report, and the batch where they caught a failure that looked fine by every other measure.

Each candidate edge is adjudicated against the misread test rather than asserted, and the
adjudication is deliberately hostile to promotion: in the most recent pass, 94% of proposed hard
edges were rejected and stayed soft (section 11). When in doubt, soft. A connection being real, deep, and worth teaching is
not sufficient — the question is only whether a reader who skips it will get the passage wrong.

**Every arrow here is an editorial judgment rather than a finding.** A careful one, argued against a fixed test and reviewed against
apologist.ai — an AI doctrinal-review system from The Apologist Project, described in section 10 —
and still a judgment a competent teacher may reject. The Bible does not come
with a dependency graph in the back; someone decided each of these, and that someone is named in the
credits. This is why every edge carries its reasoning in writing and why the whole thing is forkable.
Where you disagree, the disagreement is with a person and an argument, which is the only honest way
to ship a dataset like this.

### Moving the dial in your own app

You are not bound by our calibration, and different products want different settings:

| If you treat as required | You get | Suits |
|---|---|---|
| `hard` only (what we ship) | advisory: many valid orders, paths stay distinct | reading plans, exploration, anything where the reader chooses |
| `hard` + `soft` | prescriptive: close to a single mandatory order | a fixed curriculum with a fixed sequence |
| neither | a flat annotated list | search, reference, cross-linking |

If you promote `soft` to required, **run the doorway check afterward.** Doubling the constraint is
easy to do in one line and buries the entry passages that new readers actually open first. That is
the moment the engine stops being Philip.

---

## 5. How to use it

### Quickstart

```bash
git clone https://github.com/afterpew/bible-graph
cd bible-graph
npm install && npm run build
```

That produces `dist/`. Then, in any JavaScript project:

```js
const nodes = require('./dist/nodes.json').nodes;
const edges = require('./dist/edges.json').edges;
const byId  = new Map(nodes.map(n => [n.id, n]));

// Everything a beginner can open today, easiest first
nodes
  .filter(n => n.canon_layer === 'core' && n.prerequisite_depth === 0)
  .sort((a, b) => a.difficulty_tier - b.difficulty_tier)
  .forEach(n => console.log(n.difficulty_tier, n.title, `(${n.reading_time_minutes} min)`));
```

The files are the product. Python, Go, Ruby, or a spreadsheet will read them as happily as
JavaScript will.

### Resolve a verse to a node

```js
const idx = require('./dist/verse-index.json');
const node = idx.books["John"]["3"];   // "john-2-4"
```

Two chapters are split between sibling nodes at a verse boundary (Proverbs 22, Deuteronomy 16). For those,
`idx.split_chapters["Proverbs 22"]` gives each sibling's verse range.

### What must I read first

```js
const { nodes } = require('./dist/nodes.json');
const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

function prereqTrail(id, seen = new Set()) {
  for (const p of byId[id].prerequisites) {
    if (!seen.has(p)) { seen.add(p); prereqTrail(p, seen); }
  }
  return [...seen];
}
```

### What is this reader ready for

```js
const done = new Set(readerHistory);            // node ids they have completed
const ready = nodes.filter(n =>
  !done.has(n.id) && n.prerequisites.every(p => done.has(p))
).sort((a, b) => a.prerequisite_depth - b.prerequisite_depth);
```

### Gate progression on understanding

```js
const check = byId[id].comprehension_check[0];
// present check.question with check.options
// correct if answerIndex === check.answer_index
// on correct, show check.why; on wrong, show check.hint and let them retry
```

The `why` grounds the right answer in the text. The `hint` points back into the passage without giving
it away.

### Verify what you have

```bash
npm run validate     # DAG, canon rule, coverage, verse spans, all reading paths
```

`dist/manifest.json` carries SHA-256 checksums for every generated file.

---

## 6. What is machine-enforced

This matters more than any feature. Prose can drift; a failing build cannot be ignored. Every claim
below is checked on every build, and a violation stops it:

| Check | Guarantees |
|---|---|
| DAG validation | no cycles; the reading order is always satisfiable |
| Canon rule | core never depends on deuterocanon |
| Chapter coverage | every chapter in exactly one node, no gaps, no overlaps |
| Verse spans | every endpoint verified against the Berean Standard Bible |
| Seam contiguity | verse-split chapters have no gap and no overlap between siblings |
| Path order | every path's hard prerequisites appear before the nodes needing them |
| Path coverage | paths declaring `coverage: full` walk every node |
| Gate shape | balanced options, no answer-position bias, hints cite real verses |
| Manifest checksums | the files are what the manifest says they are |

If `npm run validate` is green, all of that is true. That is the trust argument.

---

## 7. Reading paths

Each path declares its own shape, and the validator holds it to that declaration:

- `coverage`: `full` walks every node of its canon layers; `slice` is deliberately partial
- `order`: `enforced` requires hard prerequisites to come first; `advisory` orders by something else
  and says why in its description

All nine ship as `order: enforced`.

| Path | Steps | Shape |
|---|---|---|
| The Gospel Story | 290 | full |
| Bible in a Year | 290 | full |
| Apologetics Foundations | 290 | full |
| Old Testament Foundations | 54 | slice |
| Prophecy and Fulfillment | 38 | slice |
| Wisdom Literature | 25 | slice |
| Gospel Parallels | 24 | slice |
| Pauline Theology | 23 | slice |
| New Believer | 19 | slice |

A path is a *reordering* of existing nodes, not new content. To author one, see
`PATH-AUTHORING-SPEC.md`.

---

## 8. Stability

See **`ID-CONTRACT.md`** for the full promise. The short version:

- Ids are never reused for different content
- Splitting a node creates children; it never silently redefines the parent
- Retired ids are published with their replacements
- `verse_span` is the authority; the id is a label
- Fields are added, never repurposed
- Breaking changes are versioned, dated, and tagged permanently

Pin a tag if you need stability. Track `main` if you want improvements.

---

## 9. What this does not do

Every dataset has limits. Here are ours, stated plainly, so you can decide against this before you
build on it rather than after.

**No Bible text.** The graph carries references, boundaries, and teaching material. It carries no
scripture beyond brief phrases quoted descriptively in summaries. Bring your own translation. The
Berean Standard Bible is public domain and pairs with this cleanly; `verse_span` gives you exact
boundaries to slice any translation you have rights to.

**English only, one editorial voice.** Summaries, prompts, and questions are written in English for
a general adult reader. Translation and reading-level variants do not exist yet.

**Chapter-group resolution.** Nodes are chapters or coherent
chapter-groups, and two of them split at a verse. The graph will tell you Ezekiel 38-39 stands
behind Revelation 20. It will not tell you that Revelation 20:8 specifically depends on Ezekiel
38:2. If your product needs verse-to-verse dependency, this is the wrong shape of data.

**The graph constrains ordering sparingly, by design.** About 3% of possible node pairs have a
settled order, and 87 nodes carry no hard prerequisite at all. That is a calibration rather than an
absence: raising it means loosening the misread test, and section 11 documents what happened when
edges were added past the point the instruments supported. If your product needs the graph to have an
opinion about most pairings, this is not that.

**Editorial judgments, not consensus findings.** Every arrow is a considered claim, reviewed against
apologist.ai (section 10). None of it is peer-reviewed scholarship, and a competent teacher will
disagree with some of it.

**No evidence yet that it teaches better.** This is the honest gap. The dataset is internally
consistent, machine-verified, and adjudicated -- and nobody has yet run a study showing that readers
who follow this graph understand Scripture better than readers following a conventional plan. The
comprehension checks are written to a strict standard; whether they correlate with real understanding
is untested. If that gap is disqualifying, better to know now than after you have built on it.

**Contested passages are described, never settled.** Where traditions genuinely diverge, the node
states the divergence and stops. If you need the graph to take your tradition's side, you will need
to add that layer yourself. `tradition_notes` marks 32 of the places this matters most.

**Deuterocanonical coverage is structural.** The 16 additional nodes are placed and layered, but have
had materially less editorial attention than the 290 core nodes. Treat their edges as provisional.

**Reading times are estimates.** They are derived from length and density; no readers were timed.

---

## 10. How this was built

The methodology is part of the specification, because it is what you are trusting.

**Structure was authored, then machine-proven.** Node boundaries follow literary seams, chosen by the
governing criterion: *maximum usefulness to the most people*. Units are the ones ordinary Christians
recognize, with seminary outlines as tiebreaker. Where a genuine seam falls inside a chapter — the
Servant Song at Isaiah 52:13, the "sayings of the wise" heading at Proverbs 22:17 — the boundary
follows the text rather than the chapter number, and both siblings declare their verse spans.

**Theological decisions were made with authority rather than by assertion.** Every judgment call —
edge classifications, seam adjudications, contested-passage handling, the content of every node — was
brought to **apologist.ai**, an AI doctrinal-review system built by The Apologist Project, and its
rulings were adopted as the default. They were overridden in one circumstance only: where the ruling
contradicted the Berean Standard Bible text, which is checked rather than recalled. Where the review disagreed with a
prior editorial decision, the decision changed. Reviews and their dispositions are recorded; nothing
was silently dropped.

**Every verse address is verified, never remembered.** Scripture references are checked against the
Berean Standard Bible text on every build. On one occasion the doctrinal review flagged a citation as
wrong; the BSB text showed the original citation was correct, and the review retracted. Text facts
answer to the text.

**Comprehension gates are built to a strict standard.** A question that can be answered by skimming
for a matching word is rejected. A distractor a careful reader could defend from the text, or that a
real Christian tradition holds, is disqualified: a gate must never mark good reasoning wrong. On
contested passages the question tests whether the reader located the tension, never which side is
right.

**Tradition-neutrality is a design constraint.** The graph assumes only the Nicene Creed as shared ground and describes
divergence without adjudicating it. `tradition_notes` on 32 nodes name where traditions
genuinely differ — the millennium, Matthew 16:18, James 2, John 6, canonical status — and state the
positions plainly.

---

## 11. Density: how the calibration was found

The engine's central claim is that it records what stands behind what. This section documents how
far that goes, how the number was arrived at, and why it is not simply as high as possible.

**The sweep was comprehensive, not a sample.** 908 candidate prerequisites were adjudicated, drawn
from three independent sources: every non-binding edge already in the dataset, every pair of adjacent
passages the graph had not considered, and a pass asking all 290 core nodes what they assume a reader
already knows. Each candidate was put to one question in isolation -- *will a reader who skips this
misread the passage* -- reviewed against apologist.ai, and rejected by default.

**73 survived. That is 8%.**

**Surviving was not sufficient.** Those 47 were applied and measured, and the graph got worse by its
own instruments. Isaiah 52-53 went from 4 prerequisites to 25. The Sermon on the Mount went from 0 to
19. Two of the nine reading paths stopped validating. Each new edge had bridged onto the head of a
twenty-link narrative chain running from Genesis 1 through Exodus, and every node downstream
inherited the whole spine. Every individual edge was defensible. The sum was not.

So they were reverted, and the cause was addressed rather than the symptom. `scope` (section 3) is
the result: story-continuity stops at the next node, idea-dependency keeps travelling. With that in
place the same 47 edges cost Isaiah 52-53 two prerequisites instead of twenty-one, and all nine paths
validate again.

### Where it landed

| | |
|---|---|
| hard edges | 278 of 426 |
| sequence / foundation | 182 / 96 |
| deepest doorway | 9 |
| reading paths valid | 9 of 9 |
| orderings constrained | 2.97% of node pairs |

**That 2.97% is a floor, not a ceiling, and it is deliberate.** Raising it means loosening the
misread test, and a graph that constrains most orderings has stopped advising and started
prescribing. 87 nodes carry no hard prerequisite, which is the graph saying a reader could
reasonably begin there rather than the graph having nothing to say.

### The instruments, and why the third one exists

```bash
node scripts/measure-density.mjs
node scripts/measure-density.mjs --diff baseline
```

**Forced ordering** is the share of node pairs whose order the graph has an opinion about. **Path
freedom** is how much of each reading path is authorship rather than arithmetic -- if hard edges
dictate every step, all nine paths collapse into one sequence and the curation carries no
information. **Doorways** asks what the graph now demands before Isaiah 53, John 3, Psalm 23, and the
Sermon on the Mount.

That third one exists because during the failure described above, **path freedom did not move at
all** -- 1.8% before and after. Nine paths can stay perfectly distinct from each other while every
entry passage sinks out of reach. Only the doorway check caught it.

### What remains, stated plainly

Nothing. Every non-binding edge in the core graph has now been through adjudication, in three passes
covering 908 candidates in total. The last pass put the remaining 62 to the same test and promoted
26 of them. There is no queue behind this.

Edge counts live in `dist/manifest.json`. Every adjudication, including the rejections and the
reasoning behind them, was kept rather than discarded.

---

## 12. Credits

**apologist.ai — The Apologist Project, Jake Carlson.** The doctrinal authority behind this dataset.
Thousands of judgments here were put to it and shaped by what came back, and it said no far more
often than yes. Section 10 describes how it was used. What it made possible is the thing this
dataset most needs and could least have asserted on its own: that the theological calls were made
with authority rather than by confidence. That is owed to Jake Carlson's work, and named here
because it should be.

**The Berean Standard Bible.** The textual authority. Every verse address is verified against the BSB
text on every build. The BSB is dedicated to the public domain and produced in cooperation with Bible
Hub, Discovery Bible, unfoldingWord, Bible Aquifer, OpenBible.com, and the Berean Bible Translation
Committee. Free resources and databases at [BereanBible.com](https://bereanbible.com).

**AfterPew — Bryan Leyenbeck.** Architecture, authorship, and final editorial responsibility.

**Marble Skill Taxonomy** (withmarbleapp/os-taxonomy). Architectural inspiration for the prerequisite
graph model.

---

## 13. Licence

**Free, with no permission needed**, for personal use, churches and ministries, non-profit
organisations, education at every level including homeschools, and research.

If you are a church, a student, a teacher, a homeschooling parent, a researcher, or a developer
building something free: this is yours, and you do not need to ask.

**Commercial use requires written permission first.** Paid apps, subscriptions, SaaS platforms,
monetised sites, products sold to churches or institutions.

That is a conversation, not a barrier. Write to **afterpew@gmail.com** and say what you are
building. Bryan Leyenbeck reads these personally, terms are set case by case, and they are usually
generous for small builders and ministry-adjacent work.

The reason it works this way is worth stating plainly: this dataset took months of adjudicated
judgment, and commercial licensing is what funds the work continuing. Giving it to everyone who is
not making money from it is the point. Asking those who are is what makes that possible.

**Redistributing the dataset itself** — public repository, public API, bulk download, or a training
corpus made available to others — needs permission separately. An open-source product is welcome;
the data files sitting in its public repository are a different question, so ask first.

Full terms are in `LICENSE`, and it is one page.

---

## 14. Contributing

See `CONTRIBUTING.md`. In short: edit `data/`, never `dist/`; run `npm run validate` before opening a
pull request; edges need a written reason a human can argue with; scripture references are verified,
never recalled.

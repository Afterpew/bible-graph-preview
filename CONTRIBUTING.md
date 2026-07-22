# Contributing to Bible Graph

This graph gets better through argued, sourced pull requests — from theologians, pastors, developers, and careful readers of any tradition. Here's how.

## Ground rules

1. **The Nicene Creed is the theological floor.** Contributions that contradict it will not be merged. Everything above the floor is open country.
2. **Tradition-neutral above the floor.** We document where Catholic, Orthodox, and Protestant readings diverge; we never adjudicate between them. If your change quietly assumes one tradition's answer to a contested question, it will be sent back for neutral rewording — regardless of which tradition it favors.
3. **The canon rule is inviolable.** No `core` node may ever acquire a prerequisite outside the core layer. The validator enforces this mechanically; maintainers enforce it editorially.
4. **Edges are claims. Claims need reasons.** Every prerequisite edge carries a `reason`. A PR adding an edge without a convincing reason — or with a reason that is really just "these are related" — will be asked to either upgrade the argument or downgrade to a `connections` entry.
5. **Voice:** scholarly and accessible, written for a curious 19-year-old. Not devotional, not academic jargon.

## What to edit

**Never edit `dist/`** — it's generated. Source of truth:

| You want to… | Edit |
|---|---|
| Fix a summary, tier, theme, or note | `data/books/<book>.json` |
| Add/change/remove a prerequisite edge | The **dependent** node's file (the edge lives with the node that has the prerequisite) |
| Add a connection | Either endpoint's file (build materializes both directions) |
| Change a reading path | `data/paths/<path>.json` |
| Propose a new reading path | New file in `data/paths/` following `schema/path.schema.json` |

Then run:

```bash
npm run validate
```

This rebuilds `dist/` and checks referential integrity, cycle-freedom, the canon rule, tier sanity, chapter coverage, and checksums. **PRs that fail validation are not reviewed.** Commit the regenerated `dist/` with your change.

## What makes a good edge proposal

A prerequisite edge is justified by one of four dependency types — name which one:

- **`narrative`** — the story literally continues (Exodus 1 assumes Genesis 37-50).
- **`theological`** — a concept is built on an earlier one (Galatians 3 is unintelligible without the Abrahamic covenant).
- **`literary`** — structure, genre, or deliberate echo (the tabernacle texts rebuild Eden; you need Genesis 1-3 to hear it).
- **`quotation`** — direct citation or dense allusion (Revelation 20 names Gog and Magog; Ezekiel 38-39 is quoted).

And choose a strength honestly:

- **`hard`** — the passage will be substantially misread without the prerequisite.
- **`soft`** — the passage is readable alone but noticeably richer with the prerequisite.

Good PR description: *"Add soft literary edge `jas` ← `sir-1-23`: James' tongue/testing/rich-poor material parallels Sirach closely enough that most commentators posit influence (cite: Bauckham, deSilva). Soft, not hard — James stands alone."*

**Removals are as valuable as additions.** If an edge overstates a dependency, argue for its demotion or deletion the same way.

## Tradition-specific notes

`tradition_notes` exists to *report* genuine interpretive divergence (e.g. Matthew 16:18 and the papacy, James 2 and justification, John 6 and the eucharist). To add or improve one:

- State each tradition's reading in terms its own adherents would recognize as fair.
- No winners, no scare quotes, no "however."
- Only where divergence is real and significant — not every passage needs one.

Contributors from Catholic, Orthodox, and non-Protestant traditions are especially invited to correct our characterizations of their readings — you are the authority on what your tradition holds.

## New reading paths

Propose a path when there's a real audience it serves (e.g. "Psalms for grief," "The Bible's courtroom scenes," "Pre-marriage counseling texts"). Requirements:

- Follows `schema/path.schema.json`; validates.
- `audience` names who it's for in one sentence.
- Sequence ordering is *argued* in the PR (why this order and not canonical order?).
- Per-step `note`s on at least the non-obvious placements.
- Core-only paths must declare `"canon_layers": ["core"]` and use only core nodes.

## Node granularity changes

Splitting or merging nodes (e.g. "Isaiah 40-48 should be two nodes") is the most invasive change type — it breaks IDs that downstream apps may reference. Open an issue first. If accepted: keep old IDs working is not currently supported, so granularity changes are batched into versioned releases.

## Deuterocanonical layer

Additions or corrections to `catholic_deuterocanon` / `orthodox_addition` nodes are welcome under the same rules, plus:

- Edges from these nodes point **into the core only**.
- `tradition_notes` should state each tradition's canonical status for the book.
- Proposals for further tradition layers (e.g. Ethiopian Orthodox broader canon) are welcome as issues — the `canon_layer` design anticipates them.

## Process

1. Open an issue for anything structural (new layers, granularity, schema changes). Straight content fixes can go directly to PR.
2. One logical change per PR — a batch of 40 edge tweaks across 20 books is unreviewable.
3. Cite sources for contested claims. Standard commentaries, journal articles, and primary patristic/conciliar texts all count.
4. Maintainers review for accuracy, neutrality, voice, and validation. Disagreements about substance get resolved in the PR thread with sources, not vibes.

## License of contributions

By contributing you agree your contributions are licensed under the project's LICENSE, and that AfterPew may license the combined work, including commercially.

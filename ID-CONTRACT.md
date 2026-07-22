# The ID Contract

**What a consumer of this dataset can rely on, and what we will never do to them.**

If you are building on Bible Graph, this is the promise that makes it safe. A dataset without one is a
dataset that can break your application on any Tuesday without telling you. Everything here is
mechanically enforced by `npm run validate` unless noted otherwise.

## The promise

**1. A node id, once published, is never reused for different content.**
`gen-1-3` will always mean Genesis 1 through 3. We will never point that id at other chapters, and we
will never recycle a retired id for something new.

**2. Splitting a node creates children. It does not rename the parent.**
When a node is subdivided, the parent id is retired and new child ids appear. The parent is never
silently redefined to mean one of its children. The 2026-07 restructure worked exactly this way:
`job-3-31` retired; `job-3-14`, `job-15-21`, `job-22-27`, `job-28`, and `job-29-31` appeared.

**3. Every retired id is published with its replacements.**
Retirements land in `dist/superseded.json` as `{"old-id": ["child-id", ...]}`, in reading order. If
your code holds a stale id, that file tells you exactly what it became. Retired ids are never deleted
from that record.

**4. Coverage is total and non-overlapping, always.**
Every chapter of every book belongs to exactly one node. Two nodes may share a chapter only when both
declare a `verse_span` and their spans are contiguous (a verse-bounded seam, e.g. Proverbs 22:16 and
22:17). `validate.mjs` fails the build on any gap, any overlap, and any undeclared share.

**5. The verse span is the authority; the id is a label.**
`isa-52b-53` is a human-readable handle. `verse_span: {from, to}` is the machine truth, and every
endpoint is verified against the Berean Standard Bible by `check-verse-spans.mjs` on every build. If a
label and a span ever disagree, the span wins.

**6. Fields are added, not repurposed.**
A published field keeps its meaning. New capability arrives as new fields. Two that already exist and
are commonly confused, so we state it plainly: `difficulty_tier` is how hard a passage is to
understand; `prerequisite_depth` is how many nodes stand before it in the graph. They are independent
and are allowed to disagree. If you are computing what a reader is ready for, use depth, not tier.

**7. Breaking changes are versioned and dated.**
Structural change ships under a new tag with the change described in `CHANGELOG.md`. Tags are
permanent: `git checkout v0.2` returns that exact dataset forever. Pin a tag if you need stability;
track `main` if you want improvements.

## What is deliberately not promised

- **Authored content improves.** Summaries, themes, and study fields get better over time. Ids,
  boundaries, and field meanings are the stable surface; prose is not frozen.
- **Edges are refined.** Prerequisite edges may be added, and their `strength` may change as they are
  reviewed. The 2026-07 review moved sixteen quotation edges from `hard` to `soft` after doctrinal
  adjudication, because the New Testament interprets its own quotations. Treat `hard` as the scarce,
  meaningful claim it is.
- **Node counts change.** The graph gets finer where finer serves readers. That is growth, and rules
  2 and 3 make it safe.

## Checking a version

```
npm run validate     # DAG, canon rule, coverage, verse spans, all reading paths
git tag              # every published version
```

`dist/manifest.json` carries counts and SHA-256 checksums for every generated file, so you can verify
you have what you think you have.

## Questions and commercial use

Open, non-commercial use is covered by the license in this repository. Commercial applications require
a negotiated license: contact **afterpew@gmail.com**. Bryan Leyenbeck reviews and approves these
personally.

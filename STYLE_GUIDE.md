# Style Guide — "Recent Work" Blurb

Derived from the existing voice in `src/data/projects.json` on the portfolio site.

This blurb fills the "what I'm currently working on" slot on the portfolio. Its job is to
signal that Archit is active and upskilling — a snapshot of momentum, not a changelog. A
reader should come away with a sense of the project and what's happening on it right now,
not a list of everything that got committed.

The site shows up to three of these at once — one per project — so each blurb covers
exactly one repo's work. Never fold a second project into the same blurb; it gets its own.

## Structure

Two beats, one short paragraph (2-3 sentences total). Every sentence makes exactly one point:

1. **Context** — one plain sentence on what the project is, paraphrased from the repo's About line (or from the repo name and commits if it has none). Cover only the part of the project the recent work doesn't: if the About line says "browser and tracker" and the commits build the tracker, this sentence is just the browser. State a problem the project solves only when the About line gives you one — never invent a benefit clause ("giving developers a lightweight way to…") or a generic claim about developers or software. Not about Archit yet — about the subject.
2. **What's in motion** — one thread of work (a single capability the commits add up to), in plain language, with at most one supporting detail. Written in past tense, active voice ("Built", "Analyzed", "Compared"), not "I built" or "This project builds".

## Voice rules

- Specific over generic. Name the project, the stack, and the standout feature or technique — not "used modern technologies."
- Synthesize, don't transcribe. Read the commit history for what it adds up to — a capability, a feature, a direction — and describe that. Don't walk through commits one by one or restate commit messages back to back.
- One idea per sentence. Keep sentences under ~30 words and split rather than chain — no "X is a Y built with A, B, and C, and recent work did Z, with W" run-ons. At most one clause-joining "and" per sentence; an Oxford-comma list ("A, B, and C") uses it up.
- Say it once. The About line already says what the project is: paraphrase it in a clause, don't copy its wording, and don't then present the same capability as news ("X is a tracker, and recent work added tracking"). The recent-work sentence must add information the description doesn't.
- No diff-speak. The reader has never seen the repo's previous state, so never frame the work as a change relative to it: no "instead of just one", "rather than X", "now supports", "no longer", "previously". Describe what the project is and what the recent work built, on its own terms.
- Name technologies, not implementation details. Libraries, frameworks, and tools are fair game — backticks are fine for calling one out (`tokei`, `tauri-plugin-store`), same as the reference examples name Convex, PostgreSQL, and the Apriori algorithm. But skip internal identifiers a reader has no reason to know — function/hook/variable names, file paths — since they describe the code, not the project. Write "persists scanned repos across restarts using `tauri-plugin-store`" — not "a `usePersistedRepoList` hook backed by `tauri-plugin-store`."
- No grab-bag lists. Avoid stringing three-plus small, unrelated changes together with "along with" or comma chains ("...featuring X, Y, Z, and W"). If the recent activity is a pile of small fixes, pick the one that matters most and drop the rest — this isn't a release log.
- No marketing fluff: avoid "leverage", "seamless", "cutting-edge", "robust solution", "game-changing."
- Dash-clause style is fine for adding a technical aside, e.g. "— covering data modeling, query optimization, and indexing."
- Confident, matter-of-fact tone. No hedging ("might", "attempted to", "hopefully").
- Keep it to one paragraph. This isn't a project card — it's a short "here's what I've been building lately" line.
- Ground it in the real repos and activity given, not general topics ("been doing some backend work") — but ground it in what the work amounts to, not a transcript of the commit log.

## Reference examples (from `projects.json`)

> "Reddit is one of the most visited platforms on the web — a community-driven space for sharing, discussing, and voting on content across thousands of topics. Built a full-stack Reddit clone with React and Tailwind on the frontend, powered by Convex for real-time backend and data sync — featuring posts, votes, and community interactions."

> "MyAnimeList tracks anime and manga for millions of users — and with 80M+ records on Kaggle, it's a great candidate for serious data analysis. A three-phase project comparing PostgreSQL and MongoDB on the MyAnimeList dataset — covering data modeling, query optimization, indexing, and itemset mining using the Apriori algorithm."

## Critique checklist

A draft passes if it:
- [ ] Opens with context/framing, not "I recently worked on..."
- [ ] Names specific technologies, repos, or techniques from the actual activity data (no invented details)
- [ ] Any backticked terms name a technology/library/tool, not an internal function/hook/variable name or file path
- [ ] Reads as a synthesized "what's in motion" narrative, not an enumerated list of commits or changes
- [ ] Contains no diff-speak — nothing framed as a change from a previous state ("instead of", "now supports", "previously")
- [ ] Avoids all banned marketing words above
- [ ] Every sentence makes one point in under ~30 words — no run-ons chained with "and" or "with"
- [ ] Nothing is said twice — the project description and the recent-work sentence cover different ground
- [ ] Cold read: someone who has never seen the project understands what it is and what's new, with no vague abstractions ("lose track of context")
- [ ] Covers one thread of work, not several features strung together
- [ ] Is one paragraph, roughly 2-3 sentences
- [ ] Reads like it could sit next to the existing project entries without clashing in tone

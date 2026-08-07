# Style Guide — "Recent Work" Blurb

Derived from the existing voice in `src/data/projects.json` on the portfolio site.

This blurb fills the "what I'm currently working on" slot on the portfolio. Its job is to
signal that Archit is active and upskilling — a snapshot of momentum, not a changelog. A
reader should come away with a sense of the project and what's happening on it right now,
not a list of everything that got committed.

The site shows up to three of these at once — one per project — so each blurb covers
exactly one repo's work. Never fold a second project into the same blurb; it gets its own.

## Structure

Two beats, one short paragraph (2-4 sentences total):

1. **Context** — one sentence framing why the thing matters or what problem space it's in. Not about Archit yet — about the subject.
2. **What's in motion** — the project and the current thread of work, in plain language. Pick the one or two most meaningful things happening, not a running tally of every commit. Written in past tense, active voice ("Built", "Analyzed", "Compared"), not "I built" or "This project builds".

## Voice rules

- Specific over generic. Name the project, the stack, and the standout feature or technique — not "used modern technologies."
- Synthesize, don't transcribe. Read the commit history for what it adds up to — a capability, a feature, a direction — and describe that. Don't walk through commits one by one or restate commit messages back to back.
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
- [ ] Is one paragraph, roughly 2-4 sentences
- [ ] Reads like it could sit next to the existing project entries without clashing in tone

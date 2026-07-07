# Style Guide — "Recent Work" Blurb

Derived from the existing voice in `src/data/projects.json` on the portfolio site.

## Structure

Two beats, one short paragraph (2-4 sentences total):

1. **Context** — one sentence framing why the thing matters or what problem space it's in. Not about Archit yet — about the subject.
2. **What was built** — what was actually done, with specific technical details (stack, techniques, scale). Written in past tense, active voice ("Built", "Analyzed", "Compared"), not "I built" or "This project builds".

## Voice rules

- Specific over generic. Name the stack, the dataset size, the algorithm — not "used modern technologies."
- No marketing fluff: avoid "leverage", "seamless", "cutting-edge", "robust solution", "game-changing."
- Dash-clause style is fine for adding a technical aside, e.g. "— covering data modeling, query optimization, and indexing."
- Confident, matter-of-fact tone. No hedging ("might", "attempted to", "hopefully").
- Keep it to one paragraph. This isn't a project card — it's a short "here's what I've been building lately" line.
- Reference real repos/commits from the activity feed, not general topics ("been doing some backend work").

## Reference examples (from `projects.json`)

> "Reddit is one of the most visited platforms on the web — a community-driven space for sharing, discussing, and voting on content across thousands of topics. Built a full-stack Reddit clone with React and Tailwind on the frontend, powered by Convex for real-time backend and data sync — featuring posts, votes, and community interactions."

> "MyAnimeList tracks anime and manga for millions of users — and with 80M+ records on Kaggle, it's a great candidate for serious data analysis. A three-phase project comparing PostgreSQL and MongoDB on the MyAnimeList dataset — covering data modeling, query optimization, indexing, and itemset mining using the Apriori algorithm."

## Critique checklist

A draft passes if it:
- [ ] Opens with context/framing, not "I recently worked on..."
- [ ] Names specific technologies, repos, or techniques from the actual activity data (no invented details)
- [ ] Avoids all banned marketing words above
- [ ] Is one paragraph, roughly 2-4 sentences
- [ ] Reads like it could sit next to the existing project entries without clashing in tone

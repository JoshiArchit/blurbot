# blurbot

An agent that keeps the "recent work" blurb on a portfolio site in sync with real GitHub activity — automatically drafting, self-critiquing, and opening a pull request for review.

Instead of manually updating a "here's what I've been building lately" line, this reads your recent commits, drafts a blurb in the voice of your existing portfolio content, critiques it against a style guide until it passes, and opens a PR against your portfolio repo so nothing goes live without a human merge.

## How it works

```
GitHub activity ──► draft ──► critique ──┐
                      ▲          │ fail   │
                      └──────────┘        │ pass
                       revise             ▼
                                    open PR for review
```

1. **Gather activity** — finds repos you've pushed to in the last `activityWindowDays` days (default 14, a rolling window), then pulls your real commit messages and each repo's GitHub description. The portfolio repo itself is always excluded, since its pushes are mostly this bot's own merged PRs. See [src/github/activity.ts](src/github/activity.ts).
2. **Pick top repos** — ranks active repos by commit count and keeps the top `maxEntries` (default 3). Each gets its own blurb, so the portfolio can render them as separate "working on" cards or carousel slides.
3. **Draft or reuse** — a repo whose inputs are unchanged since the last publish keeps its published blurb verbatim — no re-drafting, no churn from run-to-run LLM variation. "Inputs" means the commits, the repo's About line, and [STYLE_GUIDE.md](STYLE_GUIDE.md), fingerprinted in a per-entry `activityDigest` — so editing the style guide replaces blurbs written under the old rules on the next run. Otherwise a blurb is drafted grounded only in that repo's activity and description, using your existing portfolio entries as tone reference and the style guide as the rulebook. See [src/agent/draft.ts](src/agent/draft.ts).
4. **Critique loop** — each draft first passes a free local guard (non-prose output such as shell commands, the style guide's banned phrases like "rather than" and "leverage", and run-on sentences over ~35 words or with chained ", and" clauses), then a separate LLM critique scores it against the style guide's checklist and returns structured pass/fail + feedback. On failure it revises and retries, up to `maxIterations` (default 3). See [src/agent/loop.ts](src/agent/loop.ts) and [src/agent/critique.ts](src/agent/critique.ts).
5. **Publish** — entries that pass are committed to a dated branch in your portfolio repo as `{ entries: [{ repo, blurb, activityDigest }], generatedAt }`, and a PR titled "Update recent work blurb" is opened. If the entries are identical to what's already published, no PR is opened. A repo whose draft never passes is skipped with a console warning; if *no* entry passes, the run is flagged for manual review. See [src/github/publish.ts](src/github/publish.ts).

The draft and critique steps shell out to a locally installed **Claude Code CLI** in headless mode ([src/agent/claude.ts](src/agent/claude.ts)) — using your Claude subscription rather than paid API billing. Tools are disabled so the CLI only ever generates text.

## Requirements

- Node.js 20+
- The [Claude Code CLI](https://docs.claude.com/en/docs/claude-code) installed and authenticated (`claude` on your `PATH`)
- A GitHub fine-grained token with access to your portfolio repo
- A portfolio repo containing `src/data/projects.json` (used for tone examples) — the blurb is written to `src/data/recent-work.json`

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values below
```

| Variable                  | Description                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `PORTFOLIO_TOKEN`         | Fine-grained GitHub token with read access to your activity and write access to the portfolio repo |
| `GH_USERNAME`             | The GitHub user whose activity is read                                                             |
| `PORTFOLIO_REPO_OWNER`    | Owner of the portfolio repo the PR targets                                                         |
| `PORTFOLIO_REPO_NAME`     | Name of the portfolio repo (e.g. `yourname.github.io`)                                             |
| `CLAUDE_CODE_OAUTH_TOKEN` | Token for the Claude Code CLI (from `claude setup-token`)                                          |

## Usage

```bash
npm run draft       # run the full draft → critique → publish pipeline
npm run typecheck   # tsc --noEmit
```

Outcomes:

- **Passed** — at least one entry passed critique; a PR is opened against your portfolio repo and the URL is printed. Repos whose drafts never passed are skipped with a warning.
- **No new activity** — no pushes within the activity window; nothing to do.
- **Flagged** — no entry passed critique; the last drafts and feedback are printed for manual review (exit code 1).

Nothing is ever pushed directly to your default branch — every update goes through a PR you review and merge.

## GitHub Actions

The pipeline also runs on a schedule in CI — see [.github/workflows/draft.yml](.github/workflows/draft.yml). It checks out the repo, installs the Claude Code CLI, verifies auth, then runs `npm run draft` the same way a local run would. No locally installed CLI or terminal is required.

- **Schedule** — weekly, Monday 09:00 UTC (adjust the cron in the workflow file to taste), plus manual runs from the Actions tab (`workflow_dispatch`).
- **Secrets** — set the same values as the `.env` variables above (`PORTFOLIO_TOKEN`, `GH_USERNAME`, `PORTFOLIO_REPO_OWNER`, `PORTFOLIO_REPO_NAME`, `CLAUDE_CODE_OAUTH_TOKEN`) as repository secrets.
- **Concurrency** — runs are grouped so an overlapping scheduled/manual run won't race against one already in progress on the same monthly branch.

## Configuration

Tunable defaults live in [src/config.ts](src/config.ts):

- `maxIterations` — critique/revise attempts per entry before skipping it (default 3)
- `maxEntries` — maximum number of repo entries drafted per run (default 3)
- `activityWindowDays` — rolling look-back window for gathering activity (default 14)
- `recentWorkPath` — path written in the portfolio repo (default `src/data/recent-work.json`)

## Project layout

```
src/
  index.ts            entry point — runs the loop and publishes
  config.ts           env-driven configuration
  agent/
    loop.ts           draft → critique → revise orchestration
    draft.ts          drafting and revision prompts
    critique.ts       structured pass/fail critique
    claude.ts         headless Claude Code CLI wrapper
  github/
    activity.ts       reads recent commits + example blurbs
    publish.ts        commits blurb and opens the PR
    client.ts         Octokit client
STYLE_GUIDE.md        voice rules and critique checklist
```

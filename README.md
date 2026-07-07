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

1. **Gather activity** — finds repos you've pushed to since the last published blurb (falling back to a 14-day window), then pulls your real commit messages for each. See [src/github/activity.ts](src/github/activity.ts).
2. **Draft** — generates a blurb grounded only in that activity, using your existing portfolio entries as tone reference and [STYLE_GUIDE.md](STYLE_GUIDE.md) as the rulebook. See [src/agent/draft.ts](src/agent/draft.ts).
3. **Critique loop** — a separate critique pass scores the draft against the style guide's checklist and returns structured pass/fail + feedback. On failure it revises and retries, up to `maxIterations` (default 3). See [src/agent/loop.ts](src/agent/loop.ts) and [src/agent/critique.ts](src/agent/critique.ts).
4. **Publish** — on pass, it commits the blurb to a dated branch in your portfolio repo and opens a PR titled "Update recent work blurb." If the draft never passes, it's flagged for manual review and no PR is opened. See [src/github/publish.ts](src/github/publish.ts).

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

| Variable | Description |
| --- | --- |
| `GITHUB_TOKEN` | Fine-grained GitHub token with read access to your activity and write access to the portfolio repo |
| `GITHUB_USERNAME` | The GitHub user whose activity is read |
| `PORTFOLIO_REPO_OWNER` | Owner of the portfolio repo the PR targets |
| `PORTFOLIO_REPO_NAME` | Name of the portfolio repo (e.g. `yourname.github.io`) |
| `CLAUDE_CODE_OAUTH_TOKEN` | Token for the Claude Code CLI (from `claude setup-token`) |

## Usage

```bash
npm run draft       # run the full draft → critique → publish pipeline
npm run typecheck   # tsc --noEmit
```

Outcomes:
- **Passed** — a PR is opened against your portfolio repo; the URL is printed.
- **No new activity** — nothing to do since the last published blurb.
- **Flagged** — the draft never passed critique; the last draft and feedback are printed for manual review (exit code 1).

Nothing is ever pushed directly to your default branch — every update goes through a PR you review and merge.

## Configuration

Tunable defaults live in [src/config.ts](src/config.ts):

- `maxIterations` — critique/revise attempts before flagging (default 3)
- `activityWindowDays` — fallback look-back window when no prior blurb exists (default 14)
- `recentWorkPath` — path written in the portfolio repo (default `src/data/recent-work.json`)

## Roadmap

- **GitHub Actions integration (WIP)** — run the whole pipeline on a schedule from a GitHub Actions workflow instead of locally. This removes the need for a locally installed Claude Code CLI and a running terminal: activity gathering, drafting, critique, and opening the PR would all happen in CI, driven by repository secrets. Until this lands, `npm run draft` must be run locally with the `claude` CLI on your `PATH`.

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

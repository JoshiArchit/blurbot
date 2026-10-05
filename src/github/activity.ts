import { octokit } from "./client.js";
import { config } from "../config.js";
import type { RecentWorkContent } from "./publish.js";

export interface RepoActivity {
  repo: string;
  // The repo's GitHub "About" description — gives the drafter project-level
  // context so blurbs describe what the project is, not just what changed.
  description: string | null;
  commitMessages: string[];
}

/**
 * Gathers the user's recent work: every repo pushed to since `since`, each
 * with the user's own commit subject lines and the repo's About description.
 *
 * The public events API is only used to find which repos had pushes — it no
 * longer includes commit messages in PushEvent payloads, only head/before
 * SHAs — so real commits are then listed per repo. The portfolio repo is
 * always excluded, and repos with no matching commits are dropped.
 */
export async function fetchRecentActivity(since: Date): Promise<RepoActivity[]> {
  const recentRepos = await findReposWithRecentPushes(since);

  // Never treat the portfolio repo itself as source material: its pushes are
  // largely this bot's own merged blurb PRs, so including it would feed the
  // agent its own output back as "recent work."
  const portfolioRepo =
    `${config.portfolioRepoOwner}/${config.portfolioRepoName}`.toLowerCase();

  const activity: RepoActivity[] = [];
  for (const fullName of recentRepos) {
    if (fullName.toLowerCase() === portfolioRepo) continue;
    const [owner, repo] = fullName.split("/");
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since: since.toISOString(),
      author: config.githubUsername,
    });

    const commitMessages = commits.map((c) => c.commit.message.split("\n")[0]);
    if (commitMessages.length === 0) continue;

    const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo });
    activity.push({
      repo: fullName,
      description: repoInfo.description,
      commitMessages,
    });
  }

  return activity;
}

/**
 * Returns the full names (owner/repo) of repos the user pushed to since
 * `since`, from the public events feed. Pages through up to 10 pages of 100
 * events (newest first) and stops at the first event older than `since`.
 */
async function findReposWithRecentPushes(since: Date): Promise<string[]> {
  const repos = new Set<string>();

  for (let page = 1; page <= 10; page++) {
    const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
      username: config.githubUsername,
      per_page: 100,
      page,
    });

    if (events.length === 0) break;

    for (const event of events) {
      if (new Date(event.created_at ?? 0).getTime() < since.getTime()) {
        return Array.from(repos);
      }
      if (event.type === "PushEvent" && event.repo) {
        repos.add(event.repo.name);
      }
    }
  }

  return Array.from(repos);
}

/**
 * Reads the currently-published recent-work.json from the portfolio repo.
 *
 * Used to reuse published blurbs for repos whose activity is unchanged, and to
 * skip opening a redundant PR when the new entries match what's published.
 *
 * @returns the parsed file, or null if it doesn't exist yet.
 */
export async function fetchLastPublished(): Promise<RecentWorkContent | null> {
  const { data } = await octokit.rest.repos
    .getContent({
      owner: config.portfolioRepoOwner,
      repo: config.portfolioRepoName,
      path: config.recentWorkPath,
    })
    .catch((err) => {
      if (err.status === 404) return { data: null };
      throw err;
    });

  if (!data || Array.isArray(data) || data.type !== "file" || !data.content) {
    return null;
  }

  return JSON.parse(
    Buffer.from(data.content, "base64").toString("utf-8"),
  ) as RecentWorkContent;
}

interface ProjectEntry {
  context: string;
  description: string;
}

/**
 * Reads the portfolio's `src/data/projects.json` and returns its first
 * `count` projects as "context description" strings, used as tone reference
 * when drafting.
 *
 * @throws if the file is missing or isn't a regular file.
 */
export async function fetchExampleBlurbs(count = 3): Promise<string[]> {
  const { data } = await octokit.rest.repos.getContent({
    owner: config.portfolioRepoOwner,
    repo: config.portfolioRepoName,
    path: "src/data/projects.json",
  });

  if (Array.isArray(data) || data.type !== "file" || !data.content) {
    throw new Error("Unexpected response shape for projects.json");
  }

  const projects: ProjectEntry[] = JSON.parse(
    Buffer.from(data.content, "base64").toString("utf-8"),
  );

  return projects
    .slice(0, count)
    .map((p) => `${p.context} ${p.description}`);
}

import { octokit } from "./client.js";
import { config } from "../config.js";
import type { RecentWorkContent } from "./publish.js";

export interface RepoActivity {
  repo: string;
  commitMessages: string[];
}

// Finds repos with a push since `since`, then fetches real commit messages
// per repo — the public events API no longer includes commit messages in
// PushEvent payloads, only head/before SHAs.
export async function fetchRecentActivity(since: Date): Promise<RepoActivity[]> {
  const recentRepos = await findReposWithRecentPushes(since);

  const activity: RepoActivity[] = [];
  for (const fullName of recentRepos) {
    const [owner, repo] = fullName.split("/");
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since: since.toISOString(),
      author: config.githubUsername,
    });

    const commitMessages = commits.map((c) => c.commit.message.split("\n")[0]);
    if (commitMessages.length > 0) {
      activity.push({ repo: fullName, commitMessages });
    }
  }

  return activity;
}

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

// Reads the currently-published recent-work.json from the portfolio repo, or
// null if it doesn't exist yet. Used both to derive the activity window and to
// compare against a freshly drafted blurb before opening a redundant PR.
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

export async function fetchLastPublishedAt(): Promise<Date | null> {
  const published = await fetchLastPublished();
  return published?.generatedAt ? new Date(published.generatedAt) : null;
}

interface ProjectEntry {
  context: string;
  description: string;
}

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

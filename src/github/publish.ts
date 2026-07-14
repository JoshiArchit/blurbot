import { octokit } from "./client.js";
import { config } from "../config.js";

export interface RecentWorkContent {
  blurb: string;
  generatedAt: string;
  sourceRepos: string[];
}

export async function publishBlurb(content: RecentWorkContent): Promise<string> {
  const owner = config.portfolioRepoOwner;
  const repo = config.portfolioRepoName;

  const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = repoInfo.default_branch;

  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });

  const branchName = `content/update-${new Date().toISOString().slice(0, 7)}`;

  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha,
  }).catch(async (err) => {
    if (err.status === 422) {
      // branch already exists this month — update it in place instead of failing
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
        sha: ref.object.sha,
        force: true,
      });
      return;
    }
    throw err;
  });

  const existing = await octokit.rest.repos
    .getContent({ owner, repo, path: config.recentWorkPath, ref: branchName })
    .catch(() => null);

  const existingSha =
    existing && !Array.isArray(existing.data) && existing.data.type === "file"
      ? existing.data.sha
      : undefined;

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: config.recentWorkPath,
    message: "content: update recent work blurb",
    content: Buffer.from(JSON.stringify(content, null, 2) + "\n").toString("base64"),
    branch: branchName,
    sha: existingSha,
  });

  const body = `Auto-drafted "recent work" blurb based on recent GitHub activity (source repos: ${content.sourceRepos.join(", ") || "none"}). Please review before merging.`;

  // A scheduled run that reuses this month's branch would hit a 422 from
  // pulls.create if a PR is already open for it — reuse the existing PR
  // instead (its branch was just force-updated above).
  const { data: openPrs } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: "open",
    head: `${owner}:${branchName}`,
  });

  if (openPrs.length > 0) {
    return openPrs[0].html_url;
  }

  const { data: pr } = await octokit.rest.pulls.create({
    owner,
    repo,
    title: "Update recent work blurb",
    head: branchName,
    base: defaultBranch,
    body,
  });

  return pr.html_url;
}

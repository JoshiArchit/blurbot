import "dotenv/config";

/**
 * Reads a required environment variable.
 *
 * @throws if the variable is unset or empty, so misconfiguration fails at startup.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  githubToken: requireEnv("PORTFOLIO_TOKEN"),
  githubUsername: requireEnv("GH_USERNAME"),
  portfolioRepoOwner: requireEnv("PORTFOLIO_REPO_OWNER"),
  portfolioRepoName: requireEnv("PORTFOLIO_REPO_NAME"),
  maxIterations: 3,
  maxEntries: 3,
  activityWindowDays: 14,
  recentWorkPath: "src/data/recent-work.json",
};

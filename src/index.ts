import { runDraftLoop } from "./agent/loop.js";
import { publishBlurb } from "./github/publish.js";
import { fetchLastPublished } from "./github/activity.js";

/**
 * CLI entry point: runs the draft pipeline, prints each outcome, and — when
 * the passing entries differ from what's already published — opens a PR.
 *
 * Sets a non-zero exit code when no entry passed critique, so scheduled runs
 * surface the failure.
 */
async function main() {
  const result = await runDraftLoop();

  if (result.status === "no-new-activity") {
    console.log("No new activity since the last published blurb — nothing to do.");
    return;
  }

  if (result.status === "flagged") {
    console.log("\n=== FLAGGED FOR MANUAL REVIEW ===");
    console.log("No entry passed critique.");
    for (const f of result.flagged) {
      console.log(`\n[${f.repo}] Last feedback: ${f.feedback}`);
      console.log(`Last draft:\n${f.draft}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`\n=== ${result.entries.length} entr${result.entries.length === 1 ? "y" : "ies"} passed ===`);
  for (const e of result.entries) {
    console.log(`\n[${e.repo}]\n${e.blurb}`);
  }

  if (result.flagged.length > 0) {
    console.log(`\nSkipped ${result.flagged.length} repo(s) that never passed critique:`);
    for (const f of result.flagged) {
      console.log(`- ${f.repo}: ${f.feedback}`);
    }
  }

  /**
   * Canonical form of a set of entries for comparison: repo + blurb only,
   * sorted by repo, so a ranking reshuffle of otherwise-identical entries
   * isn't worth a PR.
   */
  const normalize =(entries: { repo: string; blurb?: string }[]) =>
    JSON.stringify(
      [...entries]
        .sort((a, b) => a.repo.localeCompare(b.repo))
        .map((e) => ({ repo: e.repo, blurb: e.blurb })),
    );

  const published = await fetchLastPublished();
  const unchanged =
    Array.isArray(published?.entries) &&
    normalize(published.entries) === normalize(result.entries);
  if (unchanged) {
    console.log("\nEntries are unchanged from what's already published — skipping PR.");
    return;
  }

  const prUrl = await publishBlurb({
    entries: result.entries,
    generatedAt: new Date().toISOString(),
  });

  console.log(`\nOpened PR: ${prUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

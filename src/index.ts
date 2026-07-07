import { runDraftLoop } from "./agent/loop.js";
import { publishBlurb } from "./github/publish.js";

async function main() {
  const result = await runDraftLoop();

  if (result.status === "no-new-activity") {
    console.log("No new activity since the last published blurb — nothing to do.");
    return;
  }

  if (result.status === "flagged") {
    console.log("\n=== FLAGGED FOR MANUAL REVIEW ===");
    console.log(`Did not pass critique after ${result.iterations} iterations.`);
    console.log(`Last feedback: ${result.lastFeedback}`);
    console.log(`\nLast draft:\n${result.blurb}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n=== PASSED after ${result.iterations} iteration(s) ===`);
  console.log(result.blurb);

  const prUrl = await publishBlurb({
    blurb: result.blurb,
    generatedAt: new Date().toISOString(),
    sourceRepos: result.sourceRepos,
  });

  console.log(`\nOpened PR: ${prUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

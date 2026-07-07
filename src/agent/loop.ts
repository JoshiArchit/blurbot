import { config } from "../config.js";
import {
  fetchRecentActivity,
  fetchExampleBlurbs,
  fetchLastPublishedAt,
  type RepoActivity,
} from "../github/activity.js";
import { draftBlurb, reviseBlurb } from "./draft.js";
import { critiqueBlurb } from "./critique.js";

export interface LoopResult {
  status: "passed" | "flagged" | "no-new-activity";
  blurb: string;
  lastFeedback: string;
  iterations: number;
  sourceRepos: string[];
}

export async function runDraftLoop(): Promise<LoopResult> {
  const fallbackWindow = new Date(
    Date.now() - config.activityWindowDays * 24 * 60 * 60 * 1000,
  );
  const lastPublishedAt = await fetchLastPublishedAt();
  const since = lastPublishedAt && lastPublishedAt > fallbackWindow ? lastPublishedAt : fallbackWindow;

  const activity: RepoActivity[] = await fetchRecentActivity(since);

  if (activity.length === 0) {
    return {
      status: "no-new-activity",
      blurb: "",
      lastFeedback: "",
      iterations: 0,
      sourceRepos: [],
    };
  }

  const exampleBlurbs = await fetchExampleBlurbs();

  let draft = await draftBlurb(activity, exampleBlurbs);
  let lastFeedback = "";

  for (let iteration = 1; iteration <= config.maxIterations; iteration++) {
    console.log(`\n--- Iteration ${iteration} ---`);
    console.log(`Draft:\n${draft}`);

    const critique = await critiqueBlurb(draft);
    console.log(`Critique: ${critique.passes ? "PASS" : "FAIL"} — ${critique.feedback}`);
    lastFeedback = critique.feedback;

    if (critique.passes) {
      return {
        status: "passed",
        blurb: draft,
        lastFeedback,
        iterations: iteration,
        sourceRepos: activity.map((a) => a.repo),
      };
    }

    if (iteration === config.maxIterations) break;

    draft = await reviseBlurb(draft, critique.feedback, activity);
  }

  return {
    status: "flagged",
    blurb: draft,
    lastFeedback,
    iterations: config.maxIterations,
    sourceRepos: activity.map((a) => a.repo),
  };
}

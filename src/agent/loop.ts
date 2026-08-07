import { config } from "../config.js";
import {
  fetchRecentActivity,
  fetchExampleBlurbs,
  fetchLastPublishedAt,
  type RepoActivity,
} from "../github/activity.js";
import { draftBlurb, reviseBlurb } from "./draft.js";
import { critiqueBlurb, localCritique } from "./critique.js";

export interface BlurbEntry {
  repo: string;
  blurb: string;
}

export interface FlaggedDraft {
  repo: string;
  draft: string;
  feedback: string;
}

export interface LoopResult {
  status: "passed" | "flagged" | "no-new-activity";
  entries: BlurbEntry[];
  flagged: FlaggedDraft[];
}

// Runs the draft → critique → revise loop for a single repo's activity.
async function draftEntry(
  repoActivity: RepoActivity,
  exampleBlurbs: string[],
): Promise<{ blurb: string; passed: boolean; feedback: string }> {
  const activity = [repoActivity];
  let draft = await draftBlurb(activity, exampleBlurbs);
  let feedback = "";

  for (let iteration = 1; iteration <= config.maxIterations; iteration++) {
    console.log(`\n--- ${repoActivity.repo} · iteration ${iteration} ---`);
    console.log(`Draft:\n${draft}`);

    const critique = localCritique(draft) ?? (await critiqueBlurb(draft, activity));
    console.log(`Critique: ${critique.passes ? "PASS" : "FAIL"} — ${critique.feedback}`);
    feedback = critique.feedback;

    if (critique.passes) {
      return { blurb: draft, passed: true, feedback };
    }

    if (iteration === config.maxIterations) break;

    draft = await reviseBlurb(draft, critique.feedback, activity);
  }

  return { blurb: draft, passed: false, feedback };
}

export async function runDraftLoop(): Promise<LoopResult> {
  const fallbackWindow = new Date(
    Date.now() - config.activityWindowDays * 24 * 60 * 60 * 1000,
  );
  const lastPublishedAt = await fetchLastPublishedAt();
  const since = lastPublishedAt && lastPublishedAt > fallbackWindow ? lastPublishedAt : fallbackWindow;

  const activity: RepoActivity[] = await fetchRecentActivity(since);

  if (activity.length === 0) {
    return { status: "no-new-activity", entries: [], flagged: [] };
  }

  // One blurb per repo so the portfolio can render them as separate "working
  // on" cards — most-active repos first, capped at maxEntries.
  const topRepos = [...activity]
    .sort((a, b) => b.commitMessages.length - a.commitMessages.length)
    .slice(0, config.maxEntries);

  const exampleBlurbs = await fetchExampleBlurbs();

  const entries: BlurbEntry[] = [];
  const flagged: FlaggedDraft[] = [];

  for (const repoActivity of topRepos) {
    const result = await draftEntry(repoActivity, exampleBlurbs);
    if (result.passed) {
      entries.push({ repo: repoActivity.repo, blurb: result.blurb });
    } else {
      flagged.push({
        repo: repoActivity.repo,
        draft: result.blurb,
        feedback: result.feedback,
      });
    }
  }

  return {
    status: entries.length > 0 ? "passed" : "flagged",
    entries,
    flagged,
  };
}

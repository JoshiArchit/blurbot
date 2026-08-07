import { createHash } from "node:crypto";
import { config } from "../config.js";
import {
  fetchRecentActivity,
  fetchExampleBlurbs,
  fetchLastPublished,
  type RepoActivity,
} from "../github/activity.js";
import { draftBlurb, reviseBlurb } from "./draft.js";
import { critiqueBlurb, localCritique } from "./critique.js";

export interface BlurbEntry {
  repo: string;
  blurb: string;
  activityDigest: string;
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

// Fingerprints a repo's activity so unchanged repos keep their published
// blurb verbatim instead of being re-drafted (LLM output varies run to run,
// which would otherwise churn out a PR every time).
export function activityDigest(activity: RepoActivity): string {
  return createHash("sha256")
    .update(activity.commitMessages.join("\n"))
    .digest("hex")
    .slice(0, 12);
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
  // Always a rolling window — not "since last publish", which shrinks after
  // every published blurb and collapses the carousel toward one entry.
  const since = new Date(
    Date.now() - config.activityWindowDays * 24 * 60 * 60 * 1000,
  );

  const activity: RepoActivity[] = await fetchRecentActivity(since);

  if (activity.length === 0) {
    return { status: "no-new-activity", entries: [], flagged: [] };
  }

  // One blurb per repo so the portfolio can render them as separate "working
  // on" cards — most-active repos first, capped at maxEntries.
  const topRepos = [...activity]
    .sort((a, b) => b.commitMessages.length - a.commitMessages.length)
    .slice(0, config.maxEntries);

  const publishedEntries = (await fetchLastPublished())?.entries ?? [];

  const entries: BlurbEntry[] = [];
  const flagged: FlaggedDraft[] = [];
  let exampleBlurbs: string[] | null = null;

  for (const repoActivity of topRepos) {
    const digest = activityDigest(repoActivity);

    const previous = publishedEntries.find(
      (e) => e.repo === repoActivity.repo && e.activityDigest === digest && e.blurb,
    );
    if (previous?.blurb) {
      console.log(`\n--- ${repoActivity.repo} · activity unchanged, reusing published blurb ---`);
      entries.push({ repo: repoActivity.repo, blurb: previous.blurb, activityDigest: digest });
      continue;
    }

    exampleBlurbs ??= await fetchExampleBlurbs();

    const result = await draftEntry(repoActivity, exampleBlurbs);
    if (result.passed) {
      entries.push({ repo: repoActivity.repo, blurb: result.blurb, activityDigest: digest });
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

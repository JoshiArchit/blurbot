import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
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

/**
 * Fingerprints everything that determines a repo's draft — the style guide,
 * the About line, and the commit subjects — as a short hex digest.
 *
 * Unchanged repos keep their published blurb verbatim instead of being
 * re-drafted (LLM output varies run to run, which would otherwise open a PR
 * every time). The style guide is part of the digest so that fixing it
 * replaces blurbs written under the old rules.
 */
export function activityDigest(activity: RepoActivity, styleGuide: string): string {
  return createHash("sha256")
    .update(styleGuide)
    .update("\0")
    .update(activity.description ?? "")
    .update("\0")
    .update(activity.commitMessages.join("\n"))
    .digest("hex")
    .slice(0, 12);
}

/**
 * Runs the draft → critique → revise loop for one repo, for up to
 * config.maxIterations attempts. Each draft goes through the free local guard
 * first, then the LLM critique.
 *
 * @returns the last draft, whether it passed, and the last feedback (the
 *   critic's pass confirmation, or the reason the draft never passed).
 */
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

/**
 * Runs the whole drafting pipeline: gathers activity over a rolling window,
 * keeps the most active repos (up to config.maxEntries), and produces one
 * blurb per repo — reusing the published blurb when a repo's digest is
 * unchanged, otherwise drafting through draftEntry.
 *
 * Never publishes; the caller decides what to do with the result. Status is
 * "no-new-activity" when nothing was pushed in the window, "passed" when at
 * least one entry passed critique, and "flagged" when none did. Repos whose
 * drafts never passed are listed in `flagged` even when the status is "passed".
 */
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
  const styleGuide = await readFile(
    new URL("../../STYLE_GUIDE.md", import.meta.url),
    "utf-8",
  );

  const entries: BlurbEntry[] = [];
  const flagged: FlaggedDraft[] = [];
  let exampleBlurbs: string[] | null = null;

  for (const repoActivity of topRepos) {
    const digest = activityDigest(repoActivity, styleGuide);

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

import { readFile } from "node:fs/promises";
import { askClaude } from "./claude.js";
import type { RepoActivity } from "../github/activity.js";

function formatActivity(activity: RepoActivity[]): string {
  if (activity.length === 0) {
    return "(no recent push activity found)";
  }
  return activity
    .map((a) => `Repo: ${a.repo}\nCommits:\n${a.commitMessages.map((m) => `- ${m}`).join("\n")}`)
    .join("\n\n");
}

export async function draftBlurb(
  activity: RepoActivity[],
  exampleBlurbs: string[],
): Promise<string> {
  const styleGuide = await readFile(
    new URL("../../STYLE_GUIDE.md", import.meta.url),
    "utf-8",
  );

  const response = await askClaude(`You are drafting a short "recent work" blurb for a software developer's portfolio site, based on their real recent GitHub activity.

${styleGuide}

## Example blurbs already on the site (for tone reference)

${exampleBlurbs.map((b, i) => `${i + 1}. ${b}`).join("\n\n")}

## Recent GitHub activity to draft from

${formatActivity(activity)}

Write ONE blurb paragraph following the style guide above, grounded only in the real activity given. Return only the blurb text, no preamble.`);

  return response.trim();
}

export async function reviseBlurb(
  previousDraft: string,
  feedback: string,
  activity: RepoActivity[],
): Promise<string> {
  const styleGuide = await readFile(
    new URL("../../STYLE_GUIDE.md", import.meta.url),
    "utf-8",
  );

  const response = await askClaude(`${styleGuide}

## Recent GitHub activity (source of truth, do not invent details)

${formatActivity(activity)}

## Previous draft

${previousDraft}

## Critique feedback to address

${feedback}

Revise the draft to address the feedback while still following the style guide. Return only the revised blurb text, no preamble.`);

  return response.trim();
}

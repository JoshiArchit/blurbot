import { readFile } from "node:fs/promises";
import { askClaude } from "./claude.js";
import type { RepoActivity } from "../github/activity.js";

export function formatActivity(activity: RepoActivity[]): string {
  if (activity.length === 0) {
    return "(no recent push activity found)";
  }
  return activity
    .map((a) => {
      const about = a.description ? `About: ${a.description}\n` : "";
      return `Repo: ${a.repo}\n${about}Commits:\n${a.commitMessages.map((m) => `- ${m}`).join("\n")}`;
    })
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

You are a writer, not a coding agent: you have no tools, no file access, and cannot inspect the repos. The activity below is the complete source material — work only from it.

${styleGuide}

## Example blurbs already on the site (for tone reference)

${exampleBlurbs.map((b, i) => `${i + 1}. ${b}`).join("\n\n")}

## Recent GitHub activity to draft from

${formatActivity(activity)}

Write ONE blurb paragraph following the style guide above, grounded only in the real activity given. Use the repo's About line to frame what the project is; the commits are the current thread of work within it. Write for a reader seeing the project for the first time. Respond with only the blurb text — plain prose, no code, no commands, no preamble.`);

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

  const response = await askClaude(`You are revising a short "recent work" blurb for a software developer's portfolio site.

You are a writer, not a coding agent: you have no tools, no file access, and cannot gather more information. The activity below is the complete source material — if the feedback asks for details it doesn't contain, address the feedback as best you can from the activity alone rather than trying to look anything up.

${styleGuide}

## Recent GitHub activity (source of truth, do not invent details)

${formatActivity(activity)}

## Previous draft

${previousDraft}

## Critique feedback to address

${feedback}

Revise the draft to address the feedback while still following the style guide. Respond with only the revised blurb text — plain prose, no code, no commands, no preamble.`);

  return response.trim();
}

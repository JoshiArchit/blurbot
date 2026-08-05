import { readFile } from "node:fs/promises";
import { askClaudeJSON } from "./claude.js";
import { formatActivity } from "./draft.js";
import type { RepoActivity } from "../github/activity.js";

export interface Critique {
  passes: boolean;
  feedback: string;
}

const CRITIQUE_SCHEMA = {
  type: "object",
  properties: {
    passes: { type: "boolean" },
    feedback: {
      type: "string",
      description:
        "specific, actionable feedback if it fails, or a short confirmation if it passes",
    },
  },
  required: ["passes", "feedback"],
};

// The tool-less drafter can still lapse into coding-agent behavior and emit a
// shell command or code block instead of prose (seen in production: a `find`
// command as the "draft"). Catch that locally before spending a critique call
// on it. Command words are matched lowercase at line start only — a prose
// sentence opening with e.g. "Git" is capitalized.
const NON_PROSE_PATTERN =
  /```|^\s*(\$ |#!|(find|ls|cat|grep|git|npm|npx|node|cd|curl|wget|bash|sh|zsh|powershell|python|pip)\b)/m;

export function localCritique(draft: string): Critique | null {
  if (draft.trim().length === 0) {
    return { passes: false, feedback: "The response was empty. Respond with the blurb paragraph itself." };
  }
  if (NON_PROSE_PATTERN.test(draft)) {
    return {
      passes: false,
      feedback:
        "The previous response was a command or code block, not a blurb. You cannot run commands or inspect files — write the blurb paragraph itself as plain prose, using only the activity data already provided.",
    };
  }
  return null;
}

export async function critiqueBlurb(
  draft: string,
  activity: RepoActivity[],
): Promise<Critique> {
  const styleGuide = await readFile(
    new URL("../../STYLE_GUIDE.md", import.meta.url),
    "utf-8",
  );

  return askClaudeJSON<Critique>(
    `${styleGuide}

## Activity the draft was based on

${formatActivity(activity)}

## Draft to critique

${draft}

Evaluate the draft strictly against the style guide and its critique checklist. The drafter's only source material is the activity above — repo names and commit subject lines. Do not fail the draft for lacking details the activity doesn't contain (implementation internals, stack specifics beyond what the commits mention), and keep feedback actionable using only that activity.`,
    CRITIQUE_SCHEMA,
  );
}

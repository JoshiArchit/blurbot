import { readFile } from "node:fs/promises";
import { askClaudeJSON } from "./claude.js";

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

export async function critiqueBlurb(draft: string): Promise<Critique> {
  const styleGuide = await readFile(
    new URL("../../STYLE_GUIDE.md", import.meta.url),
    "utf-8",
  );

  return askClaudeJSON<Critique>(
    `${styleGuide}

## Draft to critique

${draft}

Evaluate the draft strictly against the style guide and its critique checklist.`,
    CRITIQUE_SCHEMA,
  );
}

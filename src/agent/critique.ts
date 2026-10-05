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

// Run-on detection is deterministic, so it's enforced here rather than left to
// the LLM critique, which waved through a 40-word sentence with four "and"s.
// Limits sit above the style guide's ~30-word target (the reference examples
// top out near 28) so only clear offenders trip it.
const MAX_SENTENCE_WORDS = 35;

/**
 * Splits prose into sentences at terminal punctuation followed by whitespace
 * and a capital letter or opening quote. A heuristic — good enough for short
 * blurbs, not a general-purpose tokenizer.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"“])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Returns the sentences in `draft` that read as run-ons: longer than
 * MAX_SENTENCE_WORDS words, or containing more than one ", and" (an
 * Oxford-comma list plus a chained clause).
 */
function findRunOns(draft: string): string[] {
  return splitSentences(draft).filter((sentence) => {
    const words = sentence.split(/\s+/).length;
    // ", and" appears once in an Oxford-comma list; twice means a list plus a
    // chained clause — the "A, B, and C, and then D" shape.
    const commaAnds = (sentence.match(/,\s+and\s/g) ?? []).length;
    return words > MAX_SENTENCE_WORDS || commaAnds > 1;
  });
}

// Phrases the style guide bans outright: diff-speak (framing work as a change
// from a state the reader never saw) and marketing fluff. Plain string matches,
// so they're enforced here instead of being left to the LLM critic's judgment.
const BANNED_PHRASE_PATTERN =
  /\b(instead of|rather than|now supports?|no longer|previously|leverag(?:e|es|ed|ing)|seamless(?:ly)?|cutting-edge|robust solutions?|game-changing)\b/gi;

/**
 * Returns the distinct banned phrases found in `draft`, lowercased, in order
 * of first appearance.
 */
function findBannedPhrases(draft: string): string[] {
  const found = (draft.match(BANNED_PHRASE_PATTERN) ?? []).map((p) => p.toLowerCase());
  return [...new Set(found)];
}

/**
 * Free, deterministic pre-check run before the LLM critique. Rejects empty
 * output, non-prose output (code fences, shell commands), banned phrasing, and
 * run-on sentences, with feedback addressed to the drafter.
 *
 * @returns a failing Critique if the draft is unusable, or null if it's fine
 *   to send on to critiqueBlurb.
 */
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

  const banned = findBannedPhrases(draft);
  if (banned.length > 0) {
    const quoted = banned.map((p) => `"${p}"`).join(", ");
    return {
      passes: false,
      feedback: `Banned phrasing: ${quoted}. Remove it — never frame the work as a change from a previous state, and avoid marketing words. Describe what the project is and what the recent work built, on its own terms.`,
    };
  }

  const runOns = findRunOns(draft);
  if (runOns.length > 0) {
    const quoted = runOns.map((s) => `"${s.split(/\s+/).slice(0, 12).join(" ")}…"`).join("; ");
    return {
      passes: false,
      feedback: `Run-on sentence(s): ${quoted}. Each sentence must make one point in under ~30 words. Split them, and drop the least important detail rather than chaining clauses with "and" or "with".`,
    };
  }
  return null;
}

/**
 * Asks the LLM to judge a draft against the style guide's critique checklist.
 *
 * @param draft the blurb to evaluate.
 * @param activity the source activity the draft was written from, so the
 *   critic can check groundedness without demanding details the activity
 *   doesn't contain.
 * @returns structured pass/fail plus actionable feedback for the reviser.
 */
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

Evaluate the draft against the style guide and its critique checklist. Fail it only for clear violations of a checklist item; if a point is borderline or a matter of taste, pass the draft and mention the nit in the feedback. Don't invent requirements beyond the checklist. The drafter's only source material is the activity above — repo names and commit subject lines. Do not fail the draft for lacking details the activity doesn't contain (implementation internals, stack specifics beyond what the commits mention), and keep feedback actionable using only that activity.`,
    CRITIQUE_SCHEMA,
  );
}

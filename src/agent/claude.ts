import { spawn } from "node:child_process";

export const MODEL = "sonnet";

const BASE_ARGS = [
  "-p",
  "--tools",
  "",
  "--no-session-persistence",
  "--model",
  MODEL,
  "--setting-sources",
  "", // skip CLAUDE.md/memory auto-discovery so prompts stay isolated
];

function runClaude(prompt: string, extraArgs: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", [...BASE_ARGS, ...extraArgs], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        // The headless CLI often writes its real error (auth failures, etc.)
        // to stdout rather than stderr, so surface both — an empty message
        // here otherwise hides the actual cause.
        const detail = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n") || "(no output)";
        reject(new Error(`claude CLI exited with code ${code}: ${detail}`));
        return;
      }
      resolve(stdout.trim());
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * Shells out to the locally installed Claude Code CLI in headless mode,
 * using the caller's Claude subscription instead of paid API billing.
 * Tools are disabled so the CLI only ever generates text — no file/bash access.
 */
export function askClaude(prompt: string): Promise<string> {
  return runClaude(prompt, []);
}

// The CLI's structured-output mode occasionally leaks trailing tool-call-style
// closing tags (e.g. "...text</feedback>\n</invoke>") into string fields —
// the JSON itself stays valid, so schema validation doesn't catch it. Strip
// that debris rather than passing it through to prompts and console output.
function stripToolCallArtifacts(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/(\s*<\/[a-zA-Z_]+>)+\s*$/, "");
  }
  if (Array.isArray(value)) {
    return value.map(stripToolCallArtifacts);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, stripToolCallArtifacts(v)]),
    );
  }
  return value;
}

/** Same as askClaude, but constrains the response to the given JSON schema. */
export async function askClaudeJSON<T>(prompt: string, jsonSchema: object): Promise<T> {
  const raw = await runClaude(prompt, [
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(jsonSchema),
  ]);

  const envelope = JSON.parse(raw);
  return stripToolCallArtifacts(envelope.structured_output) as T;
}

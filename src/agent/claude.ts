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

/** Same as askClaude, but constrains the response to the given JSON schema. */
export async function askClaudeJSON<T>(prompt: string, jsonSchema: object): Promise<T> {
  const raw = await runClaude(prompt, [
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(jsonSchema),
  ]);

  const envelope = JSON.parse(raw);
  return envelope.structured_output as T;
}

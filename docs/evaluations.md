# Evaluating outcomes

`evals/cases.json` is a human-readable acceptance matrix. `evals/schema.json` captures imperative registrations, and `evals/evals.json` contains seven CLI-format model cases. The schema drift test compares the static schema with actual registrations; declarative browser-generated schema is not included. The automated tests exercise the application without an LLM. No live-browser evaluation has been run for this checkpoint.

Three layers serve different purposes:

1. `npm run eval:smoke` executes deterministic tool adapters with fresh in-memory fixtures and before/after state assertions. `npm test` also checks application behavior using mocked tool registration. It is free and needs no browser or model.
2. `npm run eval:local` tests model tool selection against static schemas and mocked responses (see [Run the local model evaluation](#run-the-local-model-evaluation)). It requires a model API key; it cannot prove the board changed.
3. A browser evaluation exercises native tools and must inspect the final board. It needs a compatible browser, running app and supported agent/backend. Current WebMCP Evals documentation identifies the Vercel backend for browser mode. Verify the CLI version and backend capabilities before running it.

## Run the local model evaluation

The [WebMCP Evals](https://github.com/GoogleChromeLabs/webmcp-tools/blob/main/webmcp-evals/README.md) CLI is pinned as the `webmcp-evals` dev dependency (`0.1.0`).

1. Copy `.env.example` to `.env` and set the key for your provider. The CLI loads `.env` automatically; `.env` is git-ignored.
2. Run `npm run eval:local`. This runs `webmcp-evals local -t evals/schema.json -e evals/evals.json` with the default backend (`vercel`) and model (`gemini-3.5-flash`, which uses the Google key).
3. Pass extra CLI options after `--`:

   ```bash
   npm run eval:local -- -m openai:gpt-5 -r 5
   npm run eval:local -- -m anthropic:<model> --reporter console json
   ```

   `-m` selects the model (`google:`, `openai:`, `anthropic:` or `ollama:` prefix), `-r` sets runs per case, and `--reporter` chooses `console`, `json` and/or `html`.

Reports are written to `.evals/` (git-ignored). Each case sends the `messages` from `evals/evals.json` to the model with the tools from `evals/schema.json`, then compares the model's calls with `expectedCall`. Tool code does not run: the CLI returns `mockOutput`, matched by tool name only, and `{}` for any call outside the expected trajectory. Model runs cost money and are non-deterministic, so they are not part of `npm test`.

When editing `evals/evals.json`:

- Give every expected call a `mockOutput`. Without it the model receives `{}`, assumes nothing was found, and keeps searching or reports false success.
- Keep each `mockOutput` identical to what the real tool returns for those arguments on the example board. `npm run eval:smoke` replays every expected call against the real tools and fails on drift. Its `$pattern` handling only supports literal text wrapped in `(?i)`, `^` and `$`.
- Every extra call counts as a failed step, so the pass count is per call, not per case. Mark a call `"optional": true` only when it is legitimate recovery, such as listing tasks after `TASK_NOT_FOUND`.
- Argument objects match as subsets: extra arguments the model sends do not fail the step.

Keep `evals/schema.json` in sync with `src/webmcp.ts`; `npm test` fails when they drift.

### Latest local run

On 2026-11-14 with `webmcp-evals` 0.1.0, backend `vercel`, model `gemini-3.5-flash`, 5 runs per case: 44/45 steps passed. The one failed step was a run of "Find Design System release notes" that sent `query` without the `project` filter. The model's answer was still correct only because mocks ignore arguments; the real board would return both release-notes tasks. Earlier, before mocks and tool descriptions were fixed, the same suite scored 2/18.

For each model trial, use a fresh browser context and conversation, restore the fixed fixtures, and record before/after snapshots. Run five trials per case, retain failures, and record model and settings, CLI and browser versions, prompt, calls, result, latency, and cost where available. Report passes out of total and unintended mutations. For creation, record the human review and cancellation or submission; never bypass it in a smoke run. Tool trajectories alone do not establish final-state correctness. Small samples describe observed behavior, not a reliability guarantee.

The official [WebMCP Evals documentation](https://github.com/GoogleChromeLabs/webmcp-tools/blob/main/webmcp-evals/README.md) describes `smoke`, `local`, and `browser` modes. Only `local` is wired up here; a live browser-state assertion harness remains to be added before claiming the browser layer runs here.

The deterministic smoke is not a native browser run and does not simulate a model or a human confirming a form. The ambiguity test demonstrates application state remains unchanged after listing; it does not prove an agent will ask for clarification. Declarative cancellation requires a real compatible browser and is not covered by this harness.

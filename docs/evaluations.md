# Evaluating outcomes

`evals/cases.json` is a human-readable acceptance matrix. `evals/schema.json` captures imperative registrations, and `evals/evals.json` contains two initial CLI-format model cases. The schema drift test compares the static schema with actual registrations; declarative browser-generated schema is not included. The automated tests exercise the application without an LLM. No model or live-browser evaluation has been run for this checkpoint.

Three layers serve different purposes:

1. `npm test` checks application behavior using mocked tool registration. It is free and needs no browser or model.
2. A local schema evaluation tests model tool selection against static schemas and mocked responses. It requires a configured model/backend; it cannot prove the board changed.
3. A browser evaluation exercises native tools and must inspect the final board. It needs a compatible browser, running app and supported agent/backend. Current WebMCP Evals documentation identifies the Vercel backend for browser mode. Verify the CLI version and backend capabilities before running it.

For each model trial, use a fresh browser context and conversation, restore the fixed fixtures, and record before/after snapshots. Run five trials per case, retain failures, and record model and settings, CLI and browser versions, prompt, calls, result, latency, and cost where available. Report passes out of total and unintended mutations. For creation, record the human review and cancellation or submission; never bypass it in a smoke run. Tool trajectories alone do not establish final-state correctness. Small samples describe observed behavior, not a reliability guarantee.

The official [WebMCP Evals documentation](https://github.com/GoogleChromeLabs/webmcp-tools/blob/main/webmcp-evals/README.md) describes `smoke`, `local`, and `browser` modes. A pinned, verified CLI and browser-state assertion harness remain to be added before claiming these evaluation layers run here.

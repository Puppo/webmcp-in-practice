# WebMCP in Practice

*From HTML Forms to Reliable AI Tools*

DevDesk is a small task board for a hands-on series about making web apps usable by browser agents. Part 05 introduces an outcome-focused evaluation matrix. You can create a task, move it through the board, and reload to see what was saved. Manual controls work in an ordinary modern browser; declarative discovery requires a compatible experimental browser and agent.

## Run DevDesk

Use Node.js 26 or later and npm. If you use nvm, run `nvm install` and `nvm use` from the project directory.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run typecheck` | Check the TypeScript types |
| `npm run build` | Type-check and build the site into `dist/` |
| `npm run preview` | Serve the built site locally after a build |
| `npm test` | Run the task and storage tests once |
| `npm run test:watch` | Rerun tests as files change |
| `npm run eval:smoke` | Run the deterministic tool smoke evaluation (no model) |
| `npm run eval:local` | Run model tool-selection evals against `evals/schema.json` (needs an API key in `.env`) |

## Try the board

1. Enter a title and a project, choose a priority, then select **Add task**. The task starts in **To do**.
2. Use a card’s **Status** control to move it to **In progress** or **Done**. The two example tasks named “Write release notes” have distinct IDs, so changing one leaves the other where it is.
3. Reload to see your saved board. Select **Reset example board** and confirm to replace local changes with the original six tasks.

Each browser origin keeps its own board in `localStorage`. The board starts with examples if the saved data is missing or invalid. If storage is unavailable, you can keep working on the page and DevDesk shows a warning. Changes made during that time may be lost on reload. The demo has no backend or cross-tab synchronization. If several tabs edit the same board, the last save wins.

## Try declarative creation

In a browser with declarative WebMCP enabled, use an agent or the WebMCP inspector to invoke `create_task` with a title, project, and priority. The browser fills the form and waits for you to review and submit it. Edit the values before selecting **Add task**; only the submitted values are created. Cancelling the request or resetting the form before submission creates no task. This tool is declared in HTML; the app does not also register it imperatively.

Native declarative support is experimental and differs from imperative feature detection: seeing `document.modelContext` alone does not establish that form tools are supported. Check discovery in your browser. No native browser/agent version has yet been verified for this checkpoint.

## Find and update a task

Use `list_tasks` to find matching tasks. Project filters match the entire project name ignoring case; query filters match a case-insensitive substring of the title. Results include every match and its ID. Call `set_task_status` with that ID and a status. For example, find “Write release notes” in Design System and update `DD-104`; `DD-101` remains unchanged. A title alone is not an identifier. Manual controls and tool calls use the same board state.

The imperative API is feature-detected and its registrations are cleaned up during development reloads. Native browser support has not yet been verified for this checkpoint.

## State and control

Status updates look up the current ID at invocation time. Invalid input returns `INVALID_INPUT`; a stale ID returns `TASK_NOT_FOUND` with a suggestion to list tasks again. Repeating the same status returns `changed: false`. A failed save reports `persisted: false` and a memory-only warning; the visible board still changes. Task text is displayed as text and returned as data. Tool annotations are hints, not enforcement.

| Action | Control |
| --- | --- |
| Create task | Review and submit the prefilled form |
| Update a known task | Executes directly |
| Reset examples | Confirm in the browser |

## Evaluate outcomes

See [the evaluation guide](docs/evaluations.md) and [acceptance cases](evals/cases.json). `npm test` and `npm run eval:smoke` run deterministic application tests without a model. To run the model evaluation, copy `.env.example` to `.env`, add a provider key, then run `npm run eval:local`. Browser evaluations are not configured yet.

## Read the code

- `index.html` defines the task form, board columns, and card template.
- `src/main.ts` connects the UI to the task operations and persists updates.
- `src/tasks.ts` validates input and updates the board using stable task IDs.
- `src/fixtures.ts` supplies the fixed examples used on first load and reset.
- `src/storage.ts` reads, validates, and writes the versioned board snapshot.
- `src/styles.css` defines the layout and responsive styles.

## Series roadmap

1. **The baseline.** Build the task board with a plain HTML form, task operations, and browser storage.
2. **The declarative form.** Expose task creation by annotating the existing form.
3. **Imperative tools.** Add `list_tasks` and `set_task_status` for querying and updating the board.
4. **State and errors.** Make task identity, invalid requests, and state changes clear to the agent.
5. **Evals.** Check that agent workflows reach the expected board state, including failure cases.
6. **Chrome agent skills.** Use Chrome’s guidance to build and verify a workflow for archiving completed tasks.

The WebMCP Community Group draft describes the imperative API under `document.modelContext`. Chrome also documents an experimental declarative API for HTML forms. [WebMCP Community Group draft](https://webmachinelearning.github.io/webmcp/) · [Chrome’s declarative API guide](https://developer.chrome.com/docs/ai/webmcp/declarative-api) · [Chrome’s agent debugging guide](https://developer.chrome.com/docs/devtools/agents/webmcp-debugging)

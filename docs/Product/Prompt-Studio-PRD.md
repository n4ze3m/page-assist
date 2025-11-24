PRD 2 — Prompt Studio Playground & Settings (Prompt Studio Module)

  1. Purpose & Scope

  - Provide a dedicated UI in the extension for the Prompt Studio module (/api/v1/prompt-studio/*), separate from Evaluations:
      - Manage Prompt Studio projects, prompts, and test cases.
      - Run Prompt Studio evaluations over prompts+test cases.
      - Monitor Prompt Studio job queue health and configure defaults.
  - This PRD is only about Prompt Studio APIs; Evaluations module is handled entirely by PRD 1.

  2. Target Users & Use Cases

  - Target users
      - Prompt engineers and power users iterating on system/user prompts over curated test cases.
      - Developers who want a local “lab” in the extension connected to server‑side Prompt Studio.
  - Key use cases
      - Create a Prompt Studio project and prompt, add test cases, and run an evaluation in one place.
      - Browse and edit prompt versions (history, revert) without leaving the browser.
      - Run small Prompt Studio evaluations and see aggregate metrics.
      - Monitor Prompt Studio queue health (if async jobs are used).

  3. Relevant APIs (Prompt Studio)

  - Projects (prompt_studio_projects.py)
      - POST /api/v1/prompt-studio/projects and POST /api/v1/prompt-studio/projects/ – create project.
      - GET /api/v1/prompt-studio/projects – list projects (paging, filters).
      - GET /api/v1/prompt-studio/projects/{project_id} – get project details.
      - Update / delete / archive endpoints (as defined in file; not all need UI in v1).
  - Prompts (prompt_studio_prompts.py)
      - POST /api/v1/prompt-studio/prompts or /create – create prompt (with version 1).
      - GET /api/v1/prompt-studio/prompts?project_id=... – list prompts in a project.
      - GET /api/v1/prompt-studio/prompts/get/{prompt_id} – get prompt details.
      - GET /api/v1/prompt-studio/prompts/history/{prompt_id} – version history.
      - POST /api/v1/prompt-studio/prompts/revert/{prompt_id}/{version} – revert (new version).
      - POST /api/v1/prompt-studio/prompts/execute – execute a prompt with inputs (simple playground execution).
  - Test cases (prompt_studio_test_cases.py)
      - POST /api/v1/prompt-studio/test-cases or /create – create test case.
      - POST /api/v1/prompt-studio/test-cases/bulk – bulk create.
      - Additional CRUD, import/export, and generation endpoints as needed.
  - Prompt Studio evaluations (prompt_studio_evaluations.py)
      - POST /api/v1/prompt-studio/evaluations – create evaluation (sync or async, based on run_async).
      - GET /api/v1/prompt-studio/evaluations – list evaluations by project/prompt.
      - GET /api/v1/prompt-studio/evaluations/{evaluation_id} – get evaluation details (metrics, test_run_ids).
  - Status (prompt_studio_status.py)
      - GET /api/v1/prompt-studio/status – queue depth, processing count, lease health, per‑type metrics.

  4. Prompt Studio Playground Page

  Route: Options → “Playground → Prompt Studio” (e.g. #/playground/prompt-studio).

  - 4.1 Project & Prompt Workspace
      - Project selector:
          - Dropdown listing projects (GET /prompt-studio/projects).
          - “Create project” inline flow (POST /prompt-studio/projects) with name + description.
      - Prompt list for selected project:
          - Table (GET /prompt-studio/prompts?project_id=...): name, latest version, last updated.
          - Actions:
              - “Open” → load prompt into editor.
              - “New prompt” → POST /prompt-studio/prompts with name, system prompt, user prompt, optional few‑shot examples.
  - 4.2 Prompt Editor & Versioning
      - For selected prompt (GET /prompt-studio/prompts/get/{id}):
          - Fields:
              - Name (read-only or editable depending on API behavior).
              - System prompt.
              - User prompt (with tokens like {{text}}).
              - Optional few‑shot examples (if we expose them in v1).
          - Actions:
              - “Save new version” → PATCH/create‑version endpoint (via PromptUpdate), mapping to versioning behavior in prompt_studio_prompts.py.
              - “History” panel:
                  - GET /prompt-studio/prompts/history/{id}.
                  - List versions with timestamp, change description.
                  - “Revert to version X” → POST /prompt-studio/prompts/revert/{id}/{version}.
  - 4.3 Execution & Test Runs (Micro‑Playground)
      - Ad‑hoc execution (single input, no test cases):
          - Simple form: provider, model_name, temperature, inputs object.
          - On “Run prompt” → POST /prompt-studio/prompts/execute with ExecutePromptSimpleRequest.
          - Show output text, tokens used, execution time.
      - Note: This is purely Prompt Studio execution, separate from the Evaluations module.
  - 4.4 Test Cases & Evaluations
      - Test case manager for the selected project:
          - List (GET /prompt-studio/test-cases/list?project_id=... or similar list endpoint).
          - Create single test case (POST /prompt-studio/test-cases/create) with:
              - Name, inputs, expected_outputs, tags, is_golden.
          - Optional bulk import (v1 may restrict to small JSON payload, not full CSV upload).
      - Evaluation creation:
          - “Run evaluation” for selected prompt+project:
              - Form: name, description, selected test_case_ids (multi‑select), model config (model_name, temperature, max_tokens).
              - POST /prompt-studio/evaluations with EvaluationCreate.
          - Evaluation list:
              - GET /prompt-studio/evaluations?project_id=...&prompt_id=....
              - Show status, aggregate metrics (average_score, pass_rate, etc.).
              - Click evaluation to see detailed metrics (from GET /prompt-studio/evaluations/{id}).

  5. Prompt Studio Settings Page

  Route: Options → “Settings → Prompt Studio” (e.g. #/settings/prompt-studio).

  - 5.1 Connection & Auth
      - Mirrors Evaluations Settings but scoped to Prompt Studio:
          - Server base URL (read-only).
          - API/auth settings reused from global extension config (Prompt Studio endpoints already use get_prompt_studio_user).
      - “Test Prompt Studio” button:
          - Calls GET /prompt-studio/status.
          - Shows queue_depth, processing count, success rate.
  - 5.2 Defaults & Workspace Preferences
      - Default project:
          - Stored in extension storage; used as the initially selected project in the playground.
      - Default model config for:
          - Prompt execution (execute).
          - Prompt Studio evaluations (model_name, default temperature, max_tokens).
      - Default page size (per_page) for projects/prompts/test cases lists.
  - 5.3 Observability & Limits
      - Display status from GET /prompt-studio/status:
          - Queue depth, processing, leases (active/expiring/stale), by_status/by_type.
          - Provide a brief textual explanation (“If queue depth and stale_processing are high, evaluations may be slow.”).
      - Note: Prompt Studio doesn’t expose a standalone “rate-limits” endpoint like Evaluations; we do not attempt to show detailed quotas here in v1.
  - 5.4 Non‑Goals (v1)
      - No UI for all Prompt Studio job types (optimizations, complex job queues) beyond the basic status readout.
      - No advanced import/export or code evaluators configuration UI (these remain server/CLI concerns).
      - No cross‑module wiring to the Evaluations module (e.g., automatic creation of Evaluations entries from Prompt Studio) in v1.

  6. Implementation Plan (MVP → polish)
      - Phase 0 — Services & capability probe:
          - Add `src/services/prompt-studio.ts` with typed calls for projects, prompts, prompt history/revert, test cases, evaluations, execute, and status; mirror error handling/loading states used in `src/services/evaluations.ts`.
          - Expose a capability probe `hasPromptStudio()` (e.g., GET projects or status) to gate UI visibility and empty states.
          - Align request/response shapes with server: project list/create use page/per_page ListResponse; prompts include few_shot_examples/modules_config/signature_id/parent_version_id/change_description; prompt update requires change_description; test cases list filter by tags/is_golden/search with page/per_page; execute expects {prompt_id, inputs, provider, model} and returns {output, tokens_used, execution_time}; evaluations create requires test_case_ids + model_configs[] (first entry used) and supports optional run_async; evaluations list uses limit/offset; status supports warn_seconds query.
      - Phase 1 — Routes & scaffolding:
          - Add routes `#/playground/prompt-studio` and `#/settings/prompt-studio`, with nav wiring in options layout where other modules live.
          - Stub pages that render loading/error/empty states off the new services so incremental UI can be layered without blocking.
          - Gate nav/entries on capability probe to avoid dead links when the server lacks Prompt Studio.
      - Phase 2 — Playground: projects & prompts:
          - Project selector with inline create; list projects with per-page size from settings/defaults.
          - Prompt list per project with “open” and “new prompt”; prompt editor with system/user/few-shot fields; “save new version”; history list and “revert” action.
          - Surface optional prompt fields (few_shot_examples, modules_config, signature_id, parent_version_id) and require change_description on versioning to match API validation.
      - Phase 3 — Playground: execute, test cases, evaluations:
          - Ad-hoc execute form (provider/model/temp/max_tokens/inputs) with output panel (text, tokens, latency, errors).
          - Test-case manager: list, create single, optional small JSON bulk add; tags and is_golden flags if available.
          - Evaluation creation (name/description/test_case_ids/model config/run_async), list with status/metrics, detail view showing metrics/test runs.
          - Use limit/offset for evaluation list; poll GET /prompt-studio/evaluations/{id} until status ∈ {completed, failed}; capture aggregate metrics and optional test_run_ids; no cancel endpoint in v1.
      - Phase 4 — Settings: defaults & status:
          - Display server base/auth info (read-only), default project, execute/evaluation model defaults, list page size; persist via existing settings storage.
          - “Test Prompt Studio” button calling status; show queue depth/processing/lease metrics with friendly guidance text.
          - Decide storage scope (sync vs local) and migrate/namespace keys to avoid conflicts with existing prompt/evaluation settings.
  - Phase 5 — UX polish, i18n, QA:
      - Add i18n strings/empty states/errors; guard rails when capability probe fails or config missing.
      - Manual smoke checklist: create project/prompt, save version, run execute, create test case, run evaluation, use status probe; run `bun run compile` and prettier.

7. Updated Implementation Plan (v2 — layout + workflow polish)

  - Context from server (tldw_server2):
      - List endpoints return StandardResponse with `data` + `metadata/pagination` (projects/prompts/test-cases) or bare dicts (evaluations list -> {evaluations,total,limit,offset}).
      - Project list also mirrors `projects` array for compatibility; prompt history/revert/execute use StandardResponse; status uses StandardResponse{success,data}.
      - Execute returns `{output, tokens_used, execution_time}`; evaluation detail returns metrics/test_run_ids directly (no StandardResponse wrapper).

  - Phase A — Navigation & capability:
      - Keep Prompt Studio discoverable in header/nav even if capability probe fails; show inline badge/tooltip when status endpoint is unreachable instead of hiding the mode.
      - Continue capability probe (GET status) to gate destructive actions and empty states.

  - Phase B — Layout restructure (reduce vertical scroll):
      - Adopt a master–detail shell: left sidebar houses Project selector/create and Prompt list; right pane is main workspace.
      - Main pane states:
          - No prompt selected → overview dashboard (recent prompts/evaluations summaries, helpful empty copy).
          - Prompt selected → tabs: (1) Editor (prompt form + version history/revert), (2) Playground (ad-hoc execute + quick debug), (3) Tests & evals (test-case list + evaluation config/results).
      - Use compact empty states (single line + action) instead of tall placeholders; add sticky section headers/dividers for visual hierarchy.

  - Phase C — Playground interactions:
      - Hook test-case rows to the ad-hoc execute form: clicking a case pre-fills Inputs JSON; add a play/run icon per case to execute immediately and show inline result/status.
      - Separate evaluation config bar (model/temp/tokens/run_async) from results list; keep results panel dedicated to history/detail with polling.
      - Enforce project scoping on lists and show a subtitle (“Showing N cases for <project>”) to clarify filtering.

  - Phase D — Settings & defaults:
      - Persist default project, execute model/provider, evaluation model config, page size, warn_seconds; reuse status probe in “Test Prompt Studio” with warn_seconds.
      - Apply empty/error/loading states to all new flows; surface API errors from StandardResponse.error/error_code where available.

  - Phase E — QA checklist:
      - Smoke: load Prompt Studio, create project/prompt, save new version, execute with inputs, create/bulk test cases, run evaluation (async), view detail, run status probe.
      - Validate UI responsiveness (no giant scroll), tab switching preserves selection, nav chip visible; run `bun run compile` before shipping.

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
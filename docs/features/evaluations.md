# Evaluations API (tldw\_server)

This is the contract the extension uses to drive the **Evaluations** UI. All endpoints are served by your tldw\_server under the `/api/v1/evaluations` prefix.

## Auth & Base URL

- Base URL: your server origin (for local dev: `http://localhost:8000`). Prefer **HTTPS** in production.
- Auth headers (choose one depending on deployment):
  - `Authorization: Bearer <jwt>`
  - `X-API-KEY: <key>`
- Include Idempotency-Key headers on create/run endpoints so browser retries do not duplicate work.

## Core resources

- List evaluations: `GET /api/v1/evaluations`
- Create evaluation: `POST /api/v1/evaluations`
- Get/Update/Delete: `GET/PATCH/DELETE /api/v1/evaluations/{eval_id}`
- Create run: `POST /api/v1/evaluations/{eval_id}/runs`
- List runs (by eval): `GET /api/v1/evaluations/{eval_id}/runs`
- List runs (global): `GET /api/v1/evaluations/runs?eval_id=...`
- Run detail: `GET /api/v1/evaluations/runs/{run_id}`
- Cancel run: `POST /api/v1/evaluations/runs/{run_id}/cancel`
- Datasets: `POST/GET /api/v1/evaluations/datasets`, `GET/DELETE /api/v1/evaluations/datasets/{id}`
- History: `POST /api/v1/evaluations/history` (filter by `user_id`, `type`, date range)
- Rate limits: `GET /api/v1/evaluations/rate-limits`
- Webhooks: `POST /api/v1/evaluations/webhooks`, `GET /api/v1/evaluations/webhooks`, `DELETE /api/v1/evaluations/webhooks/{id}`
- Specialized helpers: `POST /api/v1/evaluations/{geval|rag|response-quality|propositions|ocr|ocr-pdf|batch}` (plus emb/AB helpers if enabled on the server).

## Supported eval types (`eval_type`)

- `model_graded` (subtypes: `summarization`, `rag`, `response_quality`, `rag_pipeline`)
- `exact_match`, `includes`, `fuzzy_match`
- `geval`, `rag`, `response_quality`
- `proposition_extraction`, `qa3` (tri-label), `label_choice`, `nli_factcheck`
- `ocr`

### Common payload shapes

- rag: `{ "query": str, "contexts": [str], "response": str, "ground_truth": str? }`
- geval: `{ "source_text": str, "summary": str, "metrics": [...] }`
- response_quality: `{ "prompt": str, "response": str, "expected_format": str? }`
- label_choice: `{ "question": str, "context": str?, "allowed_labels": [...], "prediction": str? }`
- nli_factcheck: `{ "claim": str, "evidence": str|[str], "allowed_labels": [...] }`
- ocr: `{ "items": [{ "id": "doc1", "extracted_text": "...", "ground_truth_text": "..." }], "metrics": ["cer","wer","coverage","page_coverage"] }`

## Create evaluation (example)

```http
POST /api/v1/evaluations
Idempotency-Key: <uuid>
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "my-rag-eval",
  "eval_type": "model_graded",
  "eval_spec": {
    "sub_type": "rag",
    "metrics": ["relevance", "faithfulness", "answer_similarity"],
    "threshold": 0.7,
    "evaluator_model": "openai"
  },
  "dataset_id": "dataset_123",        // or omit and provide inline dataset
  "description": "RAG regression suite"
}
```

Inline datasets: include `dataset` instead of `dataset_id` (array of samples).

## Create run

```http
POST /api/v1/evaluations/{eval_id}/runs
Idempotency-Key: <uuid>
Authorization: Bearer <token>
Content-Type: application/json

{
  "target_model": "gpt-4o",
  "config": { "batch_size": 10 },
  "dataset_override": { "samples": [ /* same shape as dataset */ ] },
  "webhook_url": "https://yourapp.com/hook"   // optional
}
```

- Response includes `run_id`. Runs are async; poll or use webhooks.
- Status values: `pending | running | completed | failed | cancelled`. `GET /runs/{run_id}` returns progress, results, and usage.

## Datasets

```http
POST /api/v1/evaluations/datasets
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "qa-set",
  "samples": [
    { "input": { "question": "Q1", "contexts": ["ctx"], "response": "A" }, "expected": { "answer": "A" } }
  ],
  "description": "Small QA set"
}
```

## Webhooks

- Register: `POST /api/v1/evaluations/webhooks` with `{ "url": "...", "events": ["evaluation.started","evaluation.completed","evaluation.failed"] }`
- Deliveries include an HMAC signature header (secret is returned on registration).
- Events: `evaluation.started|completed|failed|cancelled|progress`
- `TEST_MODE=1` on the server forces deterministic webhook ordering for tests.

## Rate limits

- `GET /api/v1/evaluations/rate-limits` exposes current quotas and usage.
- On `429`, honor the `Retry-After` header and back off. Surface rate-limit info in the UI when present.

## Error handling

- `400/422`: validation errors — show details.
- `401/403`: auth/permission issues.
- `404`: evaluation/run not found.
- `429`: rate limited — respect `Retry-After`.
- `500`: transient — safe to retry create/run with the same Idempotency-Key.

## Progressive UX hints (extension)

- When creating a run, store `run_id` and poll `GET /runs/{run_id}` every 2–5s until status leaves `running/pending`. Prefer webhooks if you control the receiver.
- Debounce create/run buttons and always attach Idempotency-Key headers.
- Surface retry/backoff guidance when `429` lands.

## Server code pointers

- Router: `tldw_Server_API/app/api/v1/endpoints/evaluations_unified.py`
- Service: `tldw_Server_API/app/core/Evaluations/unified_evaluation_service.py`
- Runner: `tldw_Server_API/app/core/Evaluations/eval_runner.py`
- Schemas: `tldw_Server_API/app/api/v1/schemas/evaluation_schemas_unified.py`

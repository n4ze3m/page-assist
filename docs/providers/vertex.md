# Gemini Enterprise Agent Platform (Vertex AI)

Page Assist has **native** support for Google Cloud's Gemini Enterprise Agent Platform (formerly **Vertex AI**) — no local proxy (like LiteLLM) is required. Page Assist authenticates directly from your browser by minting short-lived Google Cloud access tokens from your service-account key, and refreshing them automatically.

::: info Naming
At Google Cloud Next 2026, **Vertex AI was renamed to the Gemini Enterprise Agent Platform**. The API endpoints, model IDs, and authentication are unchanged — only the product name differs. This page (and the in-app provider) is still listed under "Vertex AI" so it stays easy to find.
:::

::: tip Vertex AI vs. Google AI
This is different from the **Google AI** provider, which connects to Google AI Studio with a simple API key. Use this provider if your Gemini access lives inside a Google Cloud project (billing, quotas, and IAM managed by Google Cloud).
:::

## Prerequisites

Before you start, make sure you have:

1. A **Google Cloud project** with the **Vertex AI API** enabled.
   - In the Google Cloud Console, go to **APIs & Services → Enable APIs and Services** and enable **Vertex AI API**.
2. A **service account** with permission to call Vertex AI (the **Vertex AI User** or **Agent Platform User** role, `roles/aiplatform.user`, is enough).
3. A **service-account key** in **JSON** format.
   - Console: **IAM & Admin → Service Accounts →** *your account* **→ Keys → Add key → Create new key → JSON**.
   - This downloads a `.json` file that looks like:
     ```json
     {
       "type": "service_account",
       "project_id": "my-gcp-project-123456",
       "private_key_id": "...",
       "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
       "client_email": "page-assist@my-gcp-project-123456.iam.gserviceaccount.com",
       "...": "..."
     }
     ```

## Configuration

1. Click on the Page Assist icon on the browser toolbar.

2. Click on the `Settings` icon.

3. Go to the `OpenAI Compatible API` tab.

4. Click on the `Add Provider` button.

5. Select **Gemini Enterprise Agent Platform (Vertex AI)** from the dropdown.

6. Fill in the form:

   | Field | Description |
   | --- | --- |
   | **Provider Name** | Any label you like (e.g. `Vertex AI`). |
   | **Google Cloud Project ID** | Your GCP project ID, e.g. `my-gcp-project-123456`. |
   | **Location / Region** | The region your models run in, e.g. `us-central1`. Choose `global` to use the global endpoint. |
   | **Service Account JSON** | Paste the **full contents** of the service-account `.json` key file. |

7. Click on the `Save` button.

8. Page Assist will open the model list. Select the Gemini models you want to use and save.

## Choosing models

After adding the provider you can pick from the available Gemini models (for example `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3.5-flash`). You can also add a model manually from **Manage Models → Add Custom Model** if you need a specific model id.

::: info
Model ids for Vertex AI use the `google/` publisher prefix on the OpenAI-compatible surface (for example `google/gemini-2.5-flash`). Page Assist handles this for you when you select a model from the list.
:::

::: warning Model availability varies
Not every Gemini model is enabled on every project or in every region. In particular, some newer or "pro"-tier models (for example **Gemini 3 Pro**, id `gemini-3-pro-preview`) are in **gated preview** and will return a **404 `NOT_FOUND` — "your project does not have access"** until your project is allowlisted, even though the model exists. This is a Google-side access gate, not a Page Assist issue.

To request access, open the [Vertex AI Model Garden](https://console.cloud.google.com/vertex-ai/model-garden), find the model, and use **Enable / Request access**. Once granted, add the model with **Manage Models → Add Custom Model** (type the id, e.g. `gemini-3-pro-preview`).

If a model 404s, try another model, a different region (or `global`), or confirm access in the Model Garden. The Gemini 3 **flash** tier (`gemini-3.5-flash`, `gemini-3-flash-preview`, `gemini-3.1-flash-lite`) is generally available without special access.
:::

## How authentication works

- Your service-account JSON is stored **locally** in the extension and never sent anywhere except Google's official token endpoint (`oauth2.googleapis.com`).
- Page Assist signs a JWT with your service-account key (using the browser's Web Crypto API) and exchanges it for a short-lived access token, which is cached and refreshed automatically before it expires.
- Requests go directly to the regional Vertex AI endpoint:
  `https://{LOCATION}-aiplatform.googleapis.com/.../endpoints/openapi` (or the global endpoint when `global` is selected).

::: tip Quick alternative
Instead of a service-account JSON you can paste a **raw access token** (e.g. from `gcloud auth print-access-token`) into the Service Account JSON field. Note that these tokens expire after about an hour and will need to be replaced manually — the service-account JSON is recommended for everyday use.
:::

## Troubleshooting

- **401 / `UNAUTHENTICATED`** — Check that the JSON is pasted in full and that the service account has the **Vertex AI User** role. If you pasted a raw access token, it may have expired.
- **403 / `PERMISSION_DENIED`** — The Vertex AI API may not be enabled on the project, or the service account lacks permission.
- **404 / model not found** — Confirm the model is available in the selected **region**, and that the model id is correct. Some models are region-specific; `global` covers the widest set.

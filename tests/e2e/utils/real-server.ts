import type { TestType } from "@playwright/test"

/**
 * Read real tldw_server config for E2E tests.
 *
 * Tests that rely on a real server should call this at the top of the test
 * body. If the required env vars are not set, the test is skipped with a
 * clear message instead of attempting to spin up a mock server.
 *
 * Required env vars:
 * - TLDW_E2E_SERVER_URL  (e.g. http://127.0.0.1:3001)
 * - TLDW_E2E_API_KEY     (API key accepted by that server)
 */
export const requireRealServerConfig = (
  test: TestType<any, any>
): { serverUrl: string; apiKey: string } => {
  const serverUrl = process.env.TLDW_E2E_SERVER_URL
  const apiKey = process.env.TLDW_E2E_API_KEY

  if (!serverUrl || !apiKey) {
    test.skip(
      true,
      "Set TLDW_E2E_SERVER_URL and TLDW_E2E_API_KEY to run real-server E2E tests."
    )
  }

  return { serverUrl: serverUrl!, apiKey: apiKey! }
}


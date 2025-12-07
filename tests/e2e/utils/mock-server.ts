/**
 * Test server harness for E2E suites.
 *
 * IMPORTANT: This is no longer a mock HTTP server. It is a thin wrapper
 * around a real tldw_server instance configured via environment variables.
 *
 * - Tests that previously depended on custom per-route handlers now run
 *   against the real server and may need to be updated or skipped.
 * - The class name `MockTldwServer` is kept only for backwards compatibility
 *   with existing test imports.
 */

export interface MockServerHandlers {
  // Legacy shape for backwards compatibility; currently unused.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [path: string]: any
}

const DEFAULT_SERVER_URL =
  process.env.TLDW_TEST_SERVER_URL || "http://127.0.0.1:8000"

export class MockTldwServer {
  public url: string

  // `handlers` are accepted for compatibility but ignored; tests that used
  // them should be migrated to rely on real server behavior.
  constructor(_handlers?: MockServerHandlers) {
    this.url = DEFAULT_SERVER_URL
  }

  // Start/stop are no-ops for the real-server harness. They exist so tests
  // that previously awaited server.start()/server.stop() continue to compile.
  async start(): Promise<number> {
    try {
      const parsed = new URL(this.url)
      const port =
        typeof parsed.port === "string" && parsed.port.length > 0
          ? Number(parsed.port)
          : parsed.protocol === "https:"
            ? 443
            : 80
      return Number.isFinite(port) ? port : 0
    } catch {
      return 0
    }
  }

  async stop(): Promise<void> {
    // no-op
  }

  // Compatibility shim; previously allowed the mock to validate keys.
  // The real server harness leaves API key validation to the extension
  // and underlying tldw_server.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setApiKey(_key: string): void {
    // no-op
  }

  // Compatibility shim for tests that seeded chat/character fixtures.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
  setChatFixtures(_payload: any): void {
    // no-op for now; tests that depend on this should be updated to call
    // real server APIs to create fixtures.
  }
}


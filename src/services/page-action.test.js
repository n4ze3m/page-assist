import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test"

// Keep this storage regression independent of MCP discovery and IndexedDB.
mock.module("@/db/dexie/mcp", () => ({
  addMcpServer: mock(),
  getAllMcpServers: mock(),
  updateMcpServer: mock()
}))
mock.module("@/libs/mcp/remote-tools", () => ({
  inspectMcpServerTools: mock()
}))

const values = new Map()
let removeError
const key = "pageActionSystemPrompt"
const sync = {
  get: async (name) => ({ [name]: values.get(name) }),
  set: async (items) => {
    for (const [name, value] of Object.entries(items)) {
      // Chrome counts the key and JSON-serialized stored value, including
      // Plasmo's own JSON serialization of the prompt string.
      const bytes = new TextEncoder().encode(
        name + JSON.stringify(value)
      ).length
      if (bytes > 8192) throw new Error("QUOTA_BYTES_PER_ITEM quota exceeded")
    }
    for (const [name, value] of Object.entries(items)) values.set(name, value)
  },
  remove: async (name) => {
    if (removeError) throw removeError
    values.delete(name)
  }
}

// Exercise the real @plasmohq/storage serializer against a quota-enforcing
// extension API double, without accessing any user's browser storage.
const originalChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome")
Object.defineProperty(globalThis, "chrome", {
  configurable: true,
  value: { storage: { sync } }
})

const {
  DEFAULT_PAGE_ACTION_SYSTEM_PROMPT,
  getPageActionSystemPrompt,
  setPageActionSystemPrompt
} = await import("./page-action")

afterAll(() => {
  if (originalChrome)
    Object.defineProperty(globalThis, "chrome", originalChrome)
  else delete globalThis.chrome
})

beforeEach(() => {
  values.clear()
  removeError = undefined
})

describe("Page Action system prompt storage", () => {
  test("the default exceeds sync quota, but saving it uses the read fallback", async () => {
    await expect(
      sync.set({ [key]: JSON.stringify(DEFAULT_PAGE_ACTION_SYSTEM_PROMPT) })
    ).rejects.toThrow("QUOTA_BYTES_PER_ITEM")
    expect(await getPageActionSystemPrompt()).toBe(
      DEFAULT_PAGE_ACTION_SYSTEM_PROMPT
    )
    await setPageActionSystemPrompt(DEFAULT_PAGE_ACTION_SYSTEM_PROMPT)
    expect(values.has(key)).toBe(false)
    expect(await getPageActionSystemPrompt()).toBe(
      DEFAULT_PAGE_ACTION_SYSTEM_PROMPT
    )
  })

  test("custom prompts still round-trip through sync without changes", async () => {
    const prompt = '  Answer in 中文. Preserve "quotes" and newlines.\n  '
    await setPageActionSystemPrompt(prompt)
    expect(values.get(key)).toBe(JSON.stringify(prompt))
    expect(await getPageActionSystemPrompt()).toBe(prompt)
  })

  test("reset removes only the custom prompt and is repeatable", async () => {
    values.set("pageActionEnabled", "false")
    await setPageActionSystemPrompt("My custom prompt")
    await setPageActionSystemPrompt(DEFAULT_PAGE_ACTION_SYSTEM_PROMPT)
    await setPageActionSystemPrompt(DEFAULT_PAGE_ACTION_SYSTEM_PROMPT)
    expect(await getPageActionSystemPrompt()).toBe(
      DEFAULT_PAGE_ACTION_SYSTEM_PROMPT
    )
    expect(values.get("pageActionEnabled")).toBe("false")
    expect(values.has(key)).toBe(false)
  })

  test("an existing literal default can be reset without another oversized write", async () => {
    values.set(key, JSON.stringify(DEFAULT_PAGE_ACTION_SYSTEM_PROMPT))
    await setPageActionSystemPrompt(DEFAULT_PAGE_ACTION_SYSTEM_PROMPT)
    expect(values.has(key)).toBe(false)
    expect(await getPageActionSystemPrompt()).toBe(
      DEFAULT_PAGE_ACTION_SYSTEM_PROMPT
    )
  })

  test("reading an existing oversized custom value does not migrate or replace it", async () => {
    const prompt = "Custom instructions ".repeat(1000)
    values.set(key, JSON.stringify(prompt))
    expect(await getPageActionSystemPrompt()).toBe(prompt)
    expect(await getPageActionSystemPrompt()).toBe(prompt)
    expect(values.get(key)).toBe(JSON.stringify(prompt))
  })

  test("blank custom values retain the existing fallback behavior", async () => {
    await setPageActionSystemPrompt("   ")
    expect(values.get(key)).toBe(JSON.stringify("   "))
    expect(await getPageActionSystemPrompt()).toBe(
      DEFAULT_PAGE_ACTION_SYSTEM_PROMPT
    )
  })

  test("oversized custom saves still reject without erasing the saved prompt", async () => {
    await setPageActionSystemPrompt("Keep this prompt")
    await expect(setPageActionSystemPrompt("x".repeat(17000))).rejects.toThrow(
      "QUOTA_BYTES_PER_ITEM"
    )
    expect(await getPageActionSystemPrompt()).toBe("Keep this prompt")
  })

  test("failed resets reject and preserve the custom prompt on repeated attempts", async () => {
    await setPageActionSystemPrompt("Keep this prompt")
    removeError = new Error("Storage unavailable")
    for (let i = 0; i < 2; i++) {
      await expect(
        setPageActionSystemPrompt(DEFAULT_PAGE_ACTION_SYSTEM_PROMPT)
      ).rejects.toThrow("Storage unavailable")
      expect(await getPageActionSystemPrompt()).toBe("Keep this prompt")
    }
  })
})

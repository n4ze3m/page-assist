import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js"

interface RuntimePort {
  postMessage(message: unknown): void
  disconnect(): void
  onMessage: { addListener(callback: (message: unknown) => void): void }
  onDisconnect: { addListener(callback: () => void): void }
}

export class ExtensionPortTransport implements Transport {
  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  private started = false
  private closed = false
  private readonly buffer: JSONRPCMessage[] = []

  constructor(private readonly port: RuntimePort) {
    this.port.onMessage.addListener(this.handleMessage)
    this.port.onDisconnect.addListener(this.handleDisconnect)
  }

  private handleMessage = (message: unknown) => {
    if (this.closed) return
    const msg = message as JSONRPCMessage
    if (!this.started) {
      this.buffer.push(msg)
      return
    }
    this.onmessage?.(msg)
  }

  private handleDisconnect = () => {
    if (this.closed) return
    this.closed = true
    this.onclose?.()
  }

  async start(): Promise<void> {
    if (this.started) return
    this.started = true
    const pending = this.buffer.splice(0, this.buffer.length)
    for (const message of pending) {
      this.onmessage?.(message)
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) throw new Error("Extension connection is closed")
    try {
      this.port.postMessage(message)
    } catch (error) {
      this.onerror?.(error as Error)
      throw error
    }
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    try {
      this.port.disconnect()
    } catch {
      void 0
    }
    this.onclose?.()
  }
}

export const createExtensionTransport = (extensionId: string) => {
  const runtime = (globalThis as any).chrome?.runtime
  if (!runtime?.connect) {
    throw new Error("Extension messaging is not available in this context.")
  }
  if (!extensionId) {
    throw new Error("An extension id is required for the extension transport.")
  }
  const port = runtime.connect(extensionId, { name: "mcp" }) as RuntimePort
  return new ExtensionPortTransport(port)
}

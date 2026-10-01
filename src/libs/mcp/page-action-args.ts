type BatchAction = {
  name: string
  input: unknown
}

const isBatchAction = (value: unknown): value is BatchAction =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as Record<string, unknown>).name === "string" &&
  "input" in value

export const normalizePageActionToolCallArgs = (
  toolName: string,
  args: unknown
): unknown => {
  if (
    toolName !== "run_browser_steps" ||
    typeof args !== "object" ||
    args === null ||
    Array.isArray(args)
  ) {
    return args
  }

  const argumentRecord = args as Record<string, unknown>
  if (!Array.isArray(argumentRecord.actions)) {
    return args
  }

  let changed = false
  const actions = argumentRecord.actions.map((action) => {
    if (typeof action !== "string") {
      return action
    }

    try {
      const parsed = JSON.parse(action)
      if (isBatchAction(parsed)) {
        changed = true
        return parsed
      }
    } catch {
      // Leave malformed entries untouched so normal schema validation reports them.
    }

    return action
  })

  return changed ? { ...argumentRecord, actions } : args
}

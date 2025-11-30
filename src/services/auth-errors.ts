import type { TFunction } from "i18next"

export type AuthErrorKind =
  | "invalidCredentials"
  | "forbidden"
  | "serverUnreachable"
  | "generic"

type ClassifiedError = {
  kind: AuthErrorKind
  status?: number
  raw: string
}

const classifyAuthError = (error: unknown): ClassifiedError => {
  const raw = (error as any)?.message || ""
  let status: number | undefined
  const match = typeof raw === "string" ? raw.match(/(\d{3})/) : null
  if (match) {
    const parsed = Number(match[1])
    if (Number.isFinite(parsed)) status = parsed
  }

  const networkLike =
    typeof raw === "string" &&
    /network|timeout|failed to fetch|ECONNREFUSED|ENETUNREACH|ERR_CONNECTION/i.test(
      raw
    )

  if (status === 401) {
    return { kind: "invalidCredentials", status, raw }
  }
  if (status === 403) {
    return { kind: "forbidden", status, raw }
  }
  if (networkLike || /server not configured/i.test(raw)) {
    return { kind: "serverUnreachable", status, raw }
  }

  return { kind: "generic", status, raw }
}

/**
 * Map multi-user login / auth failures to friendly, localized messages.
 *
 * surface = 'onboarding' | 'settings' to pick the appropriate namespace.
 */
export const mapMultiUserLoginErrorMessage = (
  t: TFunction,
  error: unknown,
  surface: "onboarding" | "settings"
): string => {
  const { kind, raw } = classifyAuthError(error)

  const baseKey =
    surface === "onboarding"
      ? "settings:onboarding.errors"
      : "settings:tldw.login"

  if (kind === "invalidCredentials") {
    return t(
      `${baseKey}.invalidCredentials`,
      surface === "onboarding"
        ? "Login failed. Check your username and password or confirm multi-user login is enabled on your tldw server."
        : "Login failed. Check your username/password or confirm multi-user auth is enabled on your tldw server."
    )
  }

  if (kind === "forbidden") {
    return t(
      `${baseKey}.forbidden`,
      surface === "onboarding"
        ? "Forbidden. Check that your user account has permission to log in."
        : "Forbidden. Check that this user has permission to log in."
    )
  }

  if (kind === "serverUnreachable") {
    return t(
      `${baseKey}.serverUnreachable`,
      "Couldn’t reach your tldw server. Check the server URL or open Health & diagnostics for more details."
    )
  }

  // generic fallback – include raw message for debugging but keep a friendly lead-in
  const friendly = t(
    `${baseKey}.generic`,
    "Login failed. See Health & diagnostics for server details."
  )
  if (raw && typeof raw === "string") {
    return `${friendly} (${raw})`
  }
  return friendly
}


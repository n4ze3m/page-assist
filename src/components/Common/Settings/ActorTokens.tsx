import React from "react"
import { useTranslation } from "react-i18next"
import { message } from "antd"
import type { ActorSettings, ActorTarget } from "@/types/actor"
import { buildActorDictionaryTokens } from "@/utils/actor"

type Props = {
  settings: ActorSettings | null
}

export const ActorTokens: React.FC<Props> = ({ settings }) => {
  const { t } = useTranslation(["playground"])
  const [copying, setCopying] = React.useState<string | null>(null)

  if (!settings) return null

  const tokens = buildActorDictionaryTokens(settings)
  if (!tokens.length) return null

  const grouped: Record<ActorTarget, typeof tokens> = {
    user: [],
    char: [],
    world: []
  }

  for (const token of tokens) {
    grouped[token.target].push(token)
  }

  const labelForTarget = (target: ActorTarget): string => {
    if (target === "user") {
      return t("playground:actor.user", "User")
    }
    if (target === "char") {
      return t("playground:actor.char", "Character")
    }
    return t("playground:actor.world", "World")
  }

  const handleCopy = async (token: string) => {
    try {
      setCopying(token)
      await navigator.clipboard.writeText(token)
      message.success(
        t("playground:actor.copySuccess", "Token copied to clipboard")
      )
    } catch {
      message.error(
        t("playground:actor.copyError", "Failed to copy token")
      )
    } finally {
      setTimeout(() => {
        setCopying((current) => (current === token ? null : current))
      }, 800)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
          {t("playground:actor.tokensTitle", "Actor dictionary tokens")}
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {t(
            "playground:actor.tokensHelp",
            "Use these tokens in prompts and system messages."
          )}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.keys(grouped) as ActorTarget[]).map((target) => {
          const items = grouped[target]
          if (!items.length) return null
          return (
            <div key={target} className="space-y-1">
              <div className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">
                {labelForTarget(target)}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li
                    key={item.aspectId}
                    className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-gray-600 dark:text-gray-300">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-gray-800 dark:text-gray-100">
                        {item.token}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.token)}
                        className="inline-flex items-center rounded border border-gray-300 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-[#2a2a2a]">
                        {copying === item.token
                          ? t("playground:actor.copied", "Copied")
                          : t("playground:actor.copy", "Copy")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

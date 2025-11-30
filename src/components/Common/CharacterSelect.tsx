import { useQuery } from "@tanstack/react-query"
import { Dropdown, Empty, Tooltip } from "antd"
import { UserCircle2 } from "lucide-react"
import React from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { useTranslation } from "react-i18next"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { IconButton } from "./IconButton"
import { useAntdNotification } from "@/hooks/useAntdNotification"

type Props = {
  className?: string
  iconClassName?: string
}

export const CharacterSelect: React.FC<Props> = ({
  className = "dark:text-gray-300",
  iconClassName = "size-5"
}) => {
  const { t } = useTranslation(["option", "common"])
  const notification = useAntdNotification()
  const [selectedCharacter, setSelectedCharacter] = useStorage<any>(
    "selectedCharacter",
    null
  )
  const previousCharacterId = React.useRef<string | null>(null)
  const initialized = React.useRef(false)

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["tldw:listCharacters"],
    queryFn: async () => {
      try {
        await tldwClient.initialize()
        const list = await tldwClient.listCharacters()
        return Array.isArray(list) ? list : []
      } catch {
        return []
      }
    },
    // Cache characters so we don't refetch on every open.
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false
  })

  const [menuDensity] = useStorage("menuDensity", "comfortable")
  const selectLabel = t("option:characters.selectCharacter", {
    defaultValue: "Select character"
  }) as string
  const clearLabel = t("option:characters.clearCharacter", {
    defaultValue: "Clear character"
  }) as string

  React.useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      previousCharacterId.current = selectedCharacter?.id ?? null
      return
    }

    if (
      selectedCharacter?.id &&
      selectedCharacter?.name &&
      previousCharacterId.current !== selectedCharacter.id
    ) {
      notification.success({
        message: t("option:characters.chattingAs", {
          defaultValue: "You're now chatting as {{name}}.",
          name: selectedCharacter.name
        })
      })
    }

    previousCharacterId.current = selectedCharacter?.id ?? null
  }, [notification, selectedCharacter?.id, selectedCharacter?.name, t])

  const items =
    (data || []).map((c: any) => ({
      key: c.id || c.slug || c.name,
      label: (
        <div className="w-56 gap-2 text-sm truncate inline-flex items-center leading-5 dark:border-gray-700">
          {c.avatar_url || c.image_base64 ? (
            <img
              src={
                c.avatar_url ||
                (c.image_base64
                  ? `data:image/png;base64,${c.image_base64}`
                  : "")
              }
              className="w-4 h-4 rounded-full"
            />
          ) : (
            <UserCircle2 className="w-4 h-4" />
          )}
          <span className="truncate">{c.name || c.title || c.slug}</span>
        </div>
      ),
      onClick: () => {
        setSelectedCharacter({
          id: c.id || c.slug || c.name,
          name: c.name || c.title || c.slug,
          system_prompt:
            c.system_prompt || c.systemPrompt || c.instructions || "",
          greeting: c.greeting || c.first_message || c.greet || "",
          avatar_url:
            c.avatar_url ||
            (c.image_base64
              ? `data:image/png;base64,${c.image_base64}`
              : "")
        })
      }
    })) || []

  const clearItem =
    selectedCharacter && (items.length > 0 || data?.length === 0)
      ? {
          key: "__clear__",
          label: (
            <button
              type="button"
              className="w-full text-left text-xs font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-50"
            >
              {t(
                "option:characters.clearCharacter",
                "Clear character"
              ) as string}
            </button>
          ),
          onClick: () => {
            setSelectedCharacter(null)
          }
        }
      : null

  const refreshItem = {
    key: "__refresh__",
    label: (
      <button
        type="button"
        className="w-full text-left text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        {isFetching
          ? t("option:characters.refreshing", "Refreshing characters…")
          : t("option:characters.refresh", "Refresh characters")}
      </button>
    ),
    onClick: () => {
      refetch({ cancelRefetch: true })
    }
  } as const

  const menuItems: any[] = []

  const noneItem = {
    key: "__none__",
    label: (
      <button
        type="button"
        className="w-full text-left text-xs font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-50"
      >
        {t("option:characters.none", "None (no character)") as string}
      </button>
    ),
    onClick: () => {
      setSelectedCharacter(null)
    }
  }

  menuItems.push(noneItem)

  if (items.length > 0) {
    menuItems.push({ type: "divider", key: "__divider_items__" } as any, ...items)
  } else {
    menuItems.push({ type: "divider", key: "__divider_empty__" } as any, {
      key: "empty",
      label: <Empty />
    })
  }

  if (clearItem) {
    menuItems.push({ type: "divider", key: "__divider_clear__" } as any, clearItem)
  }

  menuItems.push({ type: "divider", key: "__divider_refresh__" } as any, refreshItem)

  return (
    <div className="flex items-center gap-2">
      <Dropdown
        menu={{
          items: menuItems,
          activeKey: selectedCharacter?.id,
          style: { maxHeight: 500, overflowY: "auto" },
          className: `no-scrollbar ${menuDensity === 'compact' ? 'menu-density-compact' : 'menu-density-comfortable'}`
        }}
        placement="topLeft"
        trigger={["click"]}>
        <Tooltip
          title={
            selectedCharacter?.name
              ? `${selectedCharacter.name} — ${clearLabel}`
              : selectLabel
          }>
          <div className="relative inline-flex">
            <IconButton
              ariaLabel={
                (selectedCharacter?.name
                  ? `${selectedCharacter.name} — ${clearLabel}`
                  : selectLabel) as string
              }
              hasPopup="menu"
              className={className}>
              {selectedCharacter?.avatar_url ? (
                <img
                  src={selectedCharacter.avatar_url}
                  className={"rounded-full " + iconClassName}
                />
              ) : (
                <UserCircle2 className={iconClassName} />
              )}
            </IconButton>
            {selectedCharacter && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setSelectedCharacter(null)
                }}
                className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-gray-900 text-[9px] font-semibold text-white shadow-sm hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900"
                aria-label={clearLabel}
                title={clearLabel}>
                ×
              </button>
            )}
          </div>
        </Tooltip>
      </Dropdown>

      {selectedCharacter?.name && (
        <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm dark:border-gray-700 dark:bg-[#1a1a1a] dark:text-gray-200 sm:inline-flex">
          {selectedCharacter?.avatar_url ? (
            <img
              src={selectedCharacter.avatar_url}
              className="h-5 w-5 rounded-full"
            />
          ) : (
            <UserCircle2 className="h-4 w-4" />
          )}
          <span className="max-w-[180px] truncate">{selectedCharacter.name}</span>
        </div>
      )}
    </div>
  )
}

import { useQuery } from "@tanstack/react-query"
import { Dropdown, Tooltip, Input, type MenuProps } from "antd"
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

type CharacterSummary = {
  id?: string | number
  slug?: string
  name?: string
  title?: string
  avatar_url?: string
  image_base64?: string
  image_mime?: string
  system_prompt?: string
  systemPrompt?: string
  instructions?: string
  greeting?: string
  first_message?: string
  greet?: string
}

type CharacterSelection = {
  id: string
  name: string
  system_prompt: string
  greeting: string
  avatar_url: string
}

const normalizeCharacter = (character: CharacterSummary): CharacterSelection => {
  const idSource =
    character.id ?? character.slug ?? character.name ?? character.title ?? ""
  const nameSource = character.name ?? character.title ?? character.slug ?? ""

  if (!idSource || !nameSource) {
    throw new Error("Character must have a valid id and name")
  }

  const avatar =
    character.avatar_url ||
    (character.image_base64
      ? `data:${character.image_mime || "image/png"};base64,${
          character.image_base64
        }`
      : "")

  return {
    id: String(idSource),
    name: String(nameSource),
    system_prompt:
      character.system_prompt ||
      character.systemPrompt ||
      character.instructions ||
      "",
    greeting:
      character.greeting || character.first_message || character.greet || "",
    avatar_url: avatar
  }
}

export const CharacterSelect: React.FC<Props> = ({
  className = "dark:text-gray-300",
  iconClassName = "size-5"
}) => {
  const { t } = useTranslation(["option", "common", "settings", "playground"])
  const notification = useAntdNotification()
  const [selectedCharacter, setSelectedCharacter] = useStorage<
    CharacterSelection | null
  >(
    "selectedCharacter",
    null
  )
  const previousCharacterId = React.useRef<string | null>(null)
  const initialized = React.useRef(false)
  const lastErrorRef = React.useRef<unknown | null>(null)

  const { data, refetch, isFetching, error } = useQuery<CharacterSummary[]>({
    queryKey: ["tldw:listCharacters"],
    queryFn: async () => {
      await tldwClient.initialize()
      const list = await tldwClient.listCharacters()
      return Array.isArray(list) ? list : []
    },
    // Cache characters so we don't refetch on every open.
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false
  })

  const [menuDensity] = useStorage<"comfortable" | "compact">(
    "menuDensity",
    "comfortable"
  )
  const [searchQuery, setSearchQuery] = React.useState("")
  const selectLabel = t("option:characters.selectCharacter", {
    defaultValue: "Select character"
  }) as string
  const clearLabel = t("option:characters.clearCharacter", {
    defaultValue: "Clear character"
  }) as string
  const emptyTitle = t("settings:manageCharacters.emptyTitle", {
    defaultValue: "No characters yet"
  }) as string
  const emptyDescription = t("settings:manageCharacters.emptyDescription", {
    defaultValue:
      "Create a reusable character with a name, description, and system prompt you can chat with."
  }) as string
  const emptyCreateLabel = t("settings:manageCharacters.emptyPrimaryCta", {
    defaultValue: "Create character"
  }) as string
  const searchPlaceholder = t("option:characters.searchPlaceholder", {
    defaultValue: "Search characters by name"
  }) as string

  React.useEffect(() => {
    if (!error || isFetching) {
      lastErrorRef.current = null
      return
    }

    if (lastErrorRef.current === error) {
      return
    }

    lastErrorRef.current = error

    notification.error({
      message: t(
        "option:characters.fetchErrorTitle",
        "Unable to load characters"
      ),
      description: t(
        "option:characters.fetchErrorBody",
        "Check your connection or server health, then try again."
      ),
      placement: "bottomRight",
      duration: 3
    })
  }, [error, isFetching, notification, t])

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

  const handleOpenCharacters = React.useCallback(() => {
    try {
      if (typeof window === "undefined") return

      const hash = "#/characters?from=header-select"
      const pathname = window.location.pathname || ""

      // If we're already inside the options UI, just switch routes in-place.
      if (pathname.includes("options.html")) {
        const base = window.location.href.replace(/#.*$/, "")
        window.location.href = `${base}${hash}`
        return
      }

      // Otherwise, try to open the options page in a new tab.
      try {
        const url = browser.runtime.getURL(`/options.html${hash}`)
        if (browser.tabs?.create) {
          browser.tabs.create({ url })
        } else {
          window.open(url, "_blank")
        }
        return
      } catch {
        // fall through to window.open fallback
      }

      window.open(`/options.html${hash}`, "_blank")
    } catch {
      // ignore navigation errors
    }
  }, [])

  const filteredCharacters = React.useMemo(() => {
    const list = Array.isArray(data) ? data : []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => {
      const name = (
        c.name ||
        c.title ||
        c.slug ||
        ""
      ).toString().toLowerCase()
      return name.includes(q)
    })
  }, [data, searchQuery])

  const characterItems = React.useMemo<MenuProps["items"]>(() => {
    return filteredCharacters.reduce<MenuProps["items"]>((items, character, index) => {
      try {
        const normalized = normalizeCharacter(character)
        const displayName =
          normalized.name || character.slug || character.title || ""
        const menuKey =
          character.id ??
          character.slug ??
          character.name ??
          character.title ??
          `character-${index}`

        items.push({
          key: String(menuKey),
          label: (
            <div className="w-56 gap-2 text-sm truncate inline-flex items-center leading-5 dark:border-gray-700">
              {normalized.avatar_url ? (
                <img
                  src={normalized.avatar_url}
                  alt={displayName || normalized.id || `Character ${menuKey}`}
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <UserCircle2 className="w-4 h-4" />
              )}
              <span className="truncate">
                {displayName || normalized.id || String(menuKey)}
              </span>
            </div>
          ),
          onClick: () => {
            setSelectedCharacter(normalized)
          }
        })
      } catch (err) {
        // Skip characters with invalid identifiers but log for debugging.
        console.debug(
          "[CharacterSelect] Skipping character with invalid id/name",
          character,
          err
        )
      }
      return items
    }, [] as MenuProps["items"])
  }, [filteredCharacters, setSelectedCharacter])

  const clearItem: MenuProps["items"][number] | null =
    selectedCharacter
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

  const refreshItem: MenuProps["items"][number] = {
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

  const dividerItem = (key: string): MenuProps["items"][number] => ({
    type: "divider",
    key
  })

  const menuItems: MenuProps["items"] = []

  const noneItem: MenuProps["items"][number] = {
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

  if (characterItems && characterItems.length > 0) {
    menuItems.push(dividerItem("__divider_items__"), ...characterItems)
  } else if (!data || (Array.isArray(data) && data.length === 0)) {
    menuItems.push(
      dividerItem("__divider_empty__"),
      {
        key: "empty",
        label: (
          <div className="w-56 px-2 py-2 text-xs text-gray-600 dark:text-gray-300">
            <div className="font-medium text-gray-800 dark:text-gray-100">
              {emptyTitle}
            </div>
            <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">
              {emptyDescription}
            </div>
            <button
              type="button"
              className="mt-2 inline-flex items-center rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-blue-600 hover:border-blue-500 hover:text-blue-700 dark:border-gray-600 dark:bg-[#0f1115] dark:text-blue-400 dark:hover:border-blue-400 dark:hover:text-blue-300">
              {emptyCreateLabel}
            </button>
          </div>
        ),
        onClick: handleOpenCharacters
      }
    )
  } else {
    menuItems.push({
      key: "__no_matches__",
      label: (
        <div className="w-56 px-2 py-2 text-xs text-gray-600 dark:text-gray-300">
          {t(
            "option:characters.noMatches",
            "No characters match your search yet."
          ) as string}
        </div>
      )
    })
  }

  if (clearItem) {
    menuItems.push(dividerItem("__divider_clear__"), clearItem)
  }

  const actorItem: MenuProps["items"][number] = {
    key: "__actor__",
    label: (
      <button
        type="button"
        className="w-full text-left text-xs font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-50"
      >
        {t(
          "playground:composer.actorTitle",
          "Scene Director (Actor)"
        ) as string}
      </button>
    ),
    onClick: () => {
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("tldw:open-actor-settings"))
        }
      } catch {
        // no-op
      }
    }
  }

  menuItems.push(dividerItem("__divider_actor__"), actorItem)
  menuItems.push(dividerItem("__divider_refresh__"), refreshItem)

  const menuContainerRef = React.useRef<HTMLDivElement | null>(null)
  const menuListRef = React.useRef<HTMLUListElement | null>(null)

  const attachMenuRef = React.useCallback(
    (node: HTMLUListElement | null, ref?: React.Ref<HTMLUListElement>) => {
      menuListRef.current = node
      if (!ref) return
      if (typeof ref === "function") {
        ref(node)
      } else if ("current" in ref) {
        ;(ref as React.MutableRefObject<HTMLUListElement | null>).current = node
      }
    },
    []
  )

  const renderMenuWithRef = React.useCallback(
    (menuNode: React.ReactNode) => {
      if (!React.isValidElement(menuNode)) return menuNode
      const menuElement = menuNode as React.ReactElement
      const originalRef = (menuElement as any).ref as React.Ref<HTMLUListElement> | undefined
      return React.cloneElement(menuElement, {
        ref: (node: HTMLUListElement | null) => attachMenuRef(node, originalRef)
      } as any)
    },
    [attachMenuRef]
  )

  const focusFirstMenuItem = React.useCallback(() => {
    const firstItem = menuListRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"])'
    )
    firstItem?.focus()
  }, [])

  return (
    <div className="flex items-center gap-2">
      <Dropdown
        onOpenChange={(open) => {
          if (!open) {
            setSearchQuery("")
          }
        }}
        dropdownRender={(menu) => (
          <div className="w-64" ref={menuContainerRef}>
            <div className="px-2 py-2 border-b border-gray-100 dark:border-gray-700">
              <Input
                size="small"
                placeholder={searchPlaceholder}
                value={searchQuery}
                autoFocus
                allowClear
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault()
                    focusFirstMenuItem()
                  }
                }}
              />
            </div>
            <div className="max-h-[420px] overflow-y-auto no-scrollbar">
              {renderMenuWithRef(menu)}
            </div>
          </div>
        )}
        menu={{
          items: menuItems,
          activeKey: selectedCharacter?.id,
          className: `character-select-menu no-scrollbar ${
            menuDensity === "compact"
              ? "menu-density-compact"
              : "menu-density-comfortable"
          }`
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
                  alt={selectedCharacter?.name || "Character avatar"}
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
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-semibold text-white shadow-sm hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900"
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

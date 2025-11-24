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

  const { data } = useQuery({
    queryKey: ["tldw:listCharacters"],
    queryFn: async () => {
      try {
        await tldwClient.initialize()
        const list = await tldwClient.listCharacters()
        return Array.isArray(list) ? list : []
      } catch {
        return []
      }
    }
  })

  const [menuDensity] = useStorage("menuDensity", "comfortable")
  const selectLabel = t("option:characters.selectCharacter", {
    defaultValue: "Select character"
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

  const items = (data || []).map((c: any) => ({
    key: c.id || c.slug || c.name,
    label: (
      <div className="w-56 gap-2 text-sm truncate inline-flex items-center leading-5 dark:border-gray-700">
        {c.avatar_url || c.image_base64 ? (
          <img src={(c.avatar_url) || (c.image_base64 ? `data:image/png;base64,${c.image_base64}` : '')} className="w-4 h-4 rounded-full" />
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
        system_prompt: c.system_prompt || c.systemPrompt || c.instructions || "",
        greeting: c.greeting || c.first_message || c.greet || "",
        avatar_url: c.avatar_url || (c.image_base64 ? `data:image/png;base64,${c.image_base64}` : '')
      })
    }
  }))

  return (
    <div className="flex items-center gap-2">
      <Dropdown
        menu={{
          items: items.length > 0 ? items : [{ key: "empty", label: <Empty /> }],
          activeKey: selectedCharacter?.id,
          style: { maxHeight: 500, overflowY: "auto" },
          className: `no-scrollbar ${menuDensity === 'compact' ? 'menu-density-compact' : 'menu-density-comfortable'}`
        }}
        placement="topLeft"
        trigger={["click"]}>
        <Tooltip title={selectedCharacter?.name || selectLabel}>
          <IconButton
            ariaLabel={(selectedCharacter?.name || selectLabel) as string}
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

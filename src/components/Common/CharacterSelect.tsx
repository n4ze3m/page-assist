import { useQuery } from "@tanstack/react-query"
import { Dropdown, Empty, Tooltip } from "antd"
import { UserCircle2 } from "lucide-react"
import React from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { tldwClient } from "@/services/tldw/TldwApiClient"

type Props = {
  className?: string
  iconClassName?: string
}

export const CharacterSelect: React.FC<Props> = ({
  className = "dark:text-gray-300",
  iconClassName = "size-5"
}) => {
  const [selectedCharacter, setSelectedCharacter] = useStorage<any>(
    "selectedCharacter",
    null
  )

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

  const items = (data || []).map((c: any) => ({
    key: c.id || c.slug || c.name,
    label: (
      <div className="w-56 gap-2 text-lg truncate inline-flex items-center dark:border-gray-700">
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
    <Dropdown
      menu={{
        items: items.length > 0 ? items : [{ key: "empty", label: <Empty /> }],
        activeKey: selectedCharacter?.id,
        style: { maxHeight: 500, overflowY: "auto" },
        className: "no-scrollbar"
      }}
      placement="topLeft"
      trigger={["click"]}>
      <Tooltip title={selectedCharacter?.name || "Select Character"}>
        <button type="button" className={className}>
          {selectedCharacter?.avatar_url ? (
            <img
              src={selectedCharacter.avatar_url}
              className={"rounded-full " + iconClassName}
            />
          ) : (
            <UserCircle2 className={iconClassName} />
          )}
        </button>
      </Tooltip>
    </Dropdown>
  )
}

import logoImage from "@/assets/icon.png"
import { useMessage } from "@/hooks/useMessage"
import { Link } from "react-router-dom"
import { Tooltip, Drawer, notification, Dropdown, Menu } from "antd"
import {
  BoxesIcon,
  BrainCog,
  CogIcon,
  EraserIcon,
  // EraserIcon,
  HistoryIcon,
  PlusSquare,
  XIcon,
  MessageSquareShareIcon
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { CurrentChatModelSettings } from "@/components/Common/Settings/CurrentChatModelSettings"
import React from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { PromptSelect } from "@/components/Common/PromptSelect"
import { Sidebar } from "@/components/Option/Sidebar"
import { BsIncognito } from "react-icons/bs"
import { isFireFoxPrivateMode } from "@/utils/is-private-mode"
import { Folder, FolderPlus } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getProjectFolders,
  addProjectFolder,
  assignHistoryToFolder
} from "@/db/dexie/helpers"

type SidepanelHeaderProps = {
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
}

export const SidepanelHeader = ({
  sidebarOpen: propSidebarOpen,
  setSidebarOpen: propSetSidebarOpen
}: SidepanelHeaderProps = {}) => {
  const [hideCurrentChatModelSettings] = useStorage(
    "hideCurrentChatModelSettings",
    false
  )

  const {
    clearChat,
    isEmbedding,
    messages,
    streaming,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    setSelectedQuickPrompt,
    setMessages,
    setHistory,
    setHistoryId,
    setSelectedModel,
    historyId,
    history,
    useOCR,
    temporaryChat,
    setTemporaryChat,
    selectedModel
  } = useMessage()
  const { t } = useTranslation(["sidepanel", "common", "option"])
  const [openModelSettings, setOpenModelSettings] = React.useState(false)
  const [localSidebarOpen, setLocalSidebarOpen] = React.useState(false)
  const [webuiBtnSidePanel, setWebuiBtnSidePanel] = useStorage(
    "webuiBtnSidePanel",
    false
  )
  const [sidepanelTemporaryChat, setSidepanelTemporaryChat] = useStorage(
    "sidepanelTemporaryChat",
    false
  )

  // Use prop state if provided, otherwise use local state
  const sidebarOpen =
    propSidebarOpen !== undefined ? propSidebarOpen : localSidebarOpen
  const setSidebarOpen = propSetSidebarOpen || setLocalSidebarOpen

  const queryClient = useQueryClient()
  const { data: headerFolders = [] } = useQuery({
    queryKey: ["fetchProjectFolders"],
    queryFn: getProjectFolders
  })
  const { mutate: headerCreateFolder } = useMutation({
    mutationKey: ["createProjectFolder:header"],
    mutationFn: async (title: string) => addProjectFolder(title),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchProjectFolders"] })
  })
  const { mutate: headerAssignFolder } = useMutation({
    mutationKey: ["assignHistoryToFolder:header"],
    mutationFn: async ({
      historyId,
      folderId
    }: {
      historyId: string
      folderId?: string
    }) => assignHistoryToFolder(historyId, folderId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fetchChatHistory"] })
  })

  const folderMenu = (
    <Menu>
      <Menu.Item
        key="__none__"
        onClick={() =>
          historyId && headerAssignFolder({ historyId, folderId: undefined })
        }>
        <span className="flex items-center gap-2">
          <Folder className="w-4 h-4" />
          {"Your chats"}
        </span>
      </Menu.Item>
      {headerFolders.map((f: any) => (
        <Menu.Item
          key={f.id}
          onClick={() =>
            historyId && headerAssignFolder({ historyId, folderId: f.id })
          }>
          <span className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            {f.title}
          </span>
        </Menu.Item>
      ))}
      <Menu.Divider />
      <Menu.Item
        key="__create__"
        onClick={() => {
          const title = prompt("New project folder name")
          if (title && title.trim()) headerCreateFolder(title.trim())
        }}>
        <span className="flex items-center gap-2">
          <FolderPlus className="w-4 h-4" />
          {"New project"}
        </span>
      </Menu.Item>
    </Menu>
  )

  return (
    <div
      data-istemporary-chat={temporaryChat}
      className=" px-3 justify-between bg-white dark:bg-[#1a1a1a] border-b border-gray-300 dark:border-gray-700 py-4 items-center absolute top-0 z-10 flex h-14 w-full data-[istemporary-chat='true']:bg-gray-200 data-[istemporary-chat='true']:dark:bg-black">
      <div className="focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700 flex items-center dark:text-white">
        <img
          className="h-6 w-auto"
          src={logoImage}
          alt={t("common:pageAssist")}
        />
        <span className="ml-1 text-sm ">{t("common:pageAssist")}</span>
      </div>

      <div className="flex items-center space-x-3">
        {webuiBtnSidePanel ? (
          <Tooltip title={t("tooltip.openwebui")}>
            <button
              onClick={() => {
                const url = browser.runtime.getURL("/options.html")
                browser.tabs.create({ url })
              }}
              className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
              <MessageSquareShareIcon className="size-4 text-gray-500 dark:text-gray-400" />
            </button>
          </Tooltip>
        ) : null}
        {isEmbedding ? (
          <Tooltip title={t("tooltip.embed")}>
            <BoxesIcon className="size-4 text-gray-500 dark:text-gray-400 animate-bounce animate-infinite" />
          </Tooltip>
        ) : null}

        <Dropdown
          overlay={folderMenu}
          trigger={["click"]}
          placement="bottomRight">
          <button
            title={t("common:projects", { defaultValue: "Projects" })}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <Folder className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        </Dropdown>

        {messages.length > 0 && !streaming && (
          <button
            title={t("option:newChat")}
            onClick={() => {
              clearChat()
            }}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <PlusSquare className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}

        <button
          title={t("option:temporaryChat")}
          onClick={() => {
            if (isFireFoxPrivateMode) {
              notification.error({
                message: "Error",
                description:
                  "Page Assist can't save chat in Firefox Private Mode. Temporary chat is enabled by default. More fixes coming soon."
              })
              return
            }

            const next = !temporaryChat
            setTemporaryChat(next)
            setSidepanelTemporaryChat(next)
            if (messages.length > 0) {
              clearChat()
            }
          }}
          data-istemporary-chat={temporaryChat}
          className="flex items-center text-gray-500 dark:text-gray-400 space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700 rounded-full p-1 data-[istemporary-chat='true']:bg-gray-300 data-[istemporary-chat='true']:dark:bg-gray-800">
          <BsIncognito className="size-4 " />
        </button>

        {history.length > 0 && (
          <button
            title={t("tooltip.clear")}
            onClick={() => {
              setHistory([])
            }}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <EraserIcon className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
        <Tooltip title={t("tooltip.history")}>
          <button
            onClick={() => {
              setSidebarOpen(true)
            }}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <HistoryIcon className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        </Tooltip>
        <PromptSelect
          selectedSystemPrompt={selectedSystemPrompt}
          setSelectedSystemPrompt={setSelectedSystemPrompt}
          setSelectedQuickPrompt={setSelectedQuickPrompt}
          iconClassName="size-4"
          className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        />
        {!hideCurrentChatModelSettings && (
          <Tooltip title={t("common:currentChatModelSettings")}>
            <button
              onClick={() => setOpenModelSettings(true)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <BrainCog className="size-4" />
            </button>
          </Tooltip>
        )}
        <Link to="/settings">
          <CogIcon className="size-4 text-gray-500 dark:text-gray-400" />
        </Link>
      </div>
      <CurrentChatModelSettings
        open={openModelSettings}
        setOpen={setOpenModelSettings}
        isOCREnabled={useOCR}
      />

      <Drawer
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between">
              {t("tooltip.history")}
            </div>

            <button onClick={() => setSidebarOpen(false)}>
              <XIcon className="size-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        }
        placement="left"
        closeIcon={null}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          setMessages={setMessages}
          setHistory={setHistory}
          setHistoryId={setHistoryId}
          setSelectedModel={setSelectedModel}
          setSelectedSystemPrompt={setSelectedSystemPrompt}
          clearChat={clearChat}
          historyId={historyId}
          setSystemPrompt={(e) => {}}
          temporaryChat={temporaryChat}
          history={history}
          selectedModel={selectedModel}
        />
      </Drawer>
    </div>
  )
}

import React from "react"
import { useStorage } from "@plasmohq/storage/hook"
import {
  BrainCog,
  ChevronLeft,
  ChevronRight,
  CogIcon,
  ComputerIcon,
  GithubIcon,
  PanelLeftIcon,
  ZapIcon
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLocation, NavLink } from "react-router-dom"
import { SelectedKnowledge } from "../Option/Knowledge/SelectedKnowledge"
import { ModelSelect } from "../Common/ModelSelect"
import { PromptSelect } from "../Common/PromptSelect"
import PromptSearch from "../Common/PromptSearch"
import { useQuery } from "@tanstack/react-query"
import { fetchChatModels } from "@/services/tldw-server"
import { useMessageOption } from "~/hooks/useMessageOption"
import { Avatar, Select, Tooltip, Popover, Input } from "antd"
import QuickIngestModal from "../Common/QuickIngestModal"
import { PaperclipIcon } from "lucide-react"
import { getAllPrompts } from "@/db/dexie/helpers"
import { ProviderIcons } from "../Common/ProviderIcon"
import { NewChat } from "./NewChat"
import { MoreOptions } from "./MoreOptions"
import { browser } from "wxt/browser"
type Props = {
  setSidebarOpen: (open: boolean) => void
  setOpenModelSettings: (open: boolean) => void
}

export const Header: React.FC<Props> = ({
  setOpenModelSettings,
  setSidebarOpen
}) => {
  const { t, i18n } = useTranslation(["option", "common"])
  const isRTL = i18n?.dir() === "rtl"

  const [shareModeEnabled] = useStorage("shareMode", false)
  const [hideCurrentChatModelSettings] = useStorage(
    "hideCurrentChatModelSettings",
    false
  )
  const {
    selectedModel,
    setSelectedModel,
    clearChat,
    selectedSystemPrompt,
    setSelectedQuickPrompt,
    setSelectedSystemPrompt,
    messages,
    streaming,
    historyId,
    temporaryChat
  } = useMessageOption()
  const {
    data: models,
    isLoading: isModelsLoading,
    refetch
  } = useQuery({
    queryKey: ["fetchModel"],
    queryFn: () => fetchChatModels({ returnEmpty: true }),
    refetchIntervalInBackground: false,
    staleTime: 1000 * 60 * 1
  })

  const { data: prompts, isLoading: isPromptLoading } = useQuery({
    queryKey: ["fetchAllPromptsLayout"],
    queryFn: getAllPrompts
  })

  const { pathname } = useLocation()
  const [chatTitle, setChatTitle] = React.useState("")
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [quickIngestOpen, setQuickIngestOpen] = React.useState(false)

  React.useEffect(() => {
    (async () => {
      try {
        if (historyId && historyId !== 'temp' && !temporaryChat) {
          const { getTitleById } = await import('@/db')
          const title = await getTitleById(historyId)
          setChatTitle(title || '')
        } else {
          setChatTitle('')
        }
      } catch {}
    })()
  }, [historyId, temporaryChat])

  const saveTitle = async (value: string) => {
    try {
      if (historyId && historyId !== 'temp' && !temporaryChat) {
        const { updateHistory } = await import('@/db')
        await updateHistory(historyId, value.trim() || 'Untitled')
      }
    } catch (e) {
      console.error('Failed to update chat title', e)
    }
  }

  const getPromptInfoById = (id: string) => {
    return prompts?.find((prompt) => prompt.id === id)
  }

  const handlePromptChange = (value?: string) => {
    if (!value) {
      setSelectedSystemPrompt(undefined)
      setSelectedQuickPrompt(undefined)
      return
    }
    const prompt = getPromptInfoById(value)
    if (prompt?.is_system) {
      setSelectedSystemPrompt(prompt.id)
    } else {
      setSelectedSystemPrompt(undefined)
      setSelectedQuickPrompt(prompt!.content)
    }
  }

  return (
    <div
      data-istemporary-chat={temporaryChat}
      className={`absolute top-0 z-10 flex h-14 w-full flex-row items-center justify-center p-3 overflow-x-auto lg:overflow-x-visible bg-gray-50 border-b  dark:bg-[#171717] dark:border-gray-600 data-[istemporary-chat='true']:bg-purple-400 data-[istemporary-chat='true']:dark:bg-purple-950`}>
      <div className="flex gap-2 items-center">
        {pathname !== "/" && (
          <div>
            <NavLink
              to="/"
              className="text-gray-500 items-center dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              {isRTL ? (
                <ChevronRight className={`w-8 h-8`} />
              ) : (
                <ChevronLeft className={`w-8 h-8`} />
              )}
            </NavLink>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            className="text-gray-500 dark:text-gray-400"
            onClick={() => setSidebarOpen(true)}>
            <PanelLeftIcon className="w-6 h-6" />
          </button>
        </div>
        <NewChat clearChat={clearChat} />
        <span className="text-lg font-thin text-zinc-300 dark:text-zinc-600">
          {"/"}
        </span>
        <div className="hidden lg:block">
          <Select
            className="min-w-80  max-w-[460px]"
            placeholder={t("common:selectAModel")}
            // loadingText={t("common:selectAModel")}
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e)
              localStorage.setItem("selectedModel", e)
            }}
            filterOption={(input, option) => {
              //@ts-ignore
              return (
                option?.label?.props["data-title"]
                  ?.toLowerCase()
                  ?.indexOf(input.toLowerCase()) >= 0
              )
            }}
            showSearch
            loading={isModelsLoading}
            options={models?.map((model) => ({
              label: (
                <span
                  key={model.model}
                  data-title={model.name}
                  className="flex flex-row gap-3 items-center ">
                  {model?.avatar ? (
                    <Avatar src={model.avatar} alt={model.name} size="small" />
                  ) : (
                    <ProviderIcons
                      provider={model?.provider}
                      className="w-5 h-5"
                    />
                  )}
                  <span className="line-clamp-2">
                    {model?.nickname || model.model}
                  </span>
                </span>
              ),
              value: model.model
            }))}
            size="large"
            // onRefresh={() => {
            //   refetch()
            // }}
          />
        </div>
        <div className="lg:hidden">
          <ModelSelect />
        </div>
        <span className="text-lg font-thin text-zinc-300 dark:text-zinc-600">
          {"/"}
        </span>
        <div className="hidden lg:block relative">
          <PromptSearch
            onInsertMessage={(content) => {
              setSelectedSystemPrompt(undefined)
              setSelectedQuickPrompt(content)
            }}
            onInsertSystem={(content) => {
              setSelectedSystemPrompt(undefined)
              // Ensure this applies to current conversation system prompt
              import('@/store/model').then(({ useStoreChatModelSettings }) => {
                const { setSystemPrompt } = useStoreChatModelSettings.getState?.() || { setSystemPrompt: undefined }
                if (setSystemPrompt) setSystemPrompt(content)
              })
            }}
          />
        </div>
        {/* Chat title next to prompt selection when persisted (non-anonymous) */}
        {!temporaryChat && historyId && historyId !== 'temp' && (
          <div className="hidden lg:flex items-center ml-2 max-w-[240px]">
            {isEditingTitle ? (
              <Input
                size="small"
                autoFocus
                value={chatTitle}
                onChange={(e) => setChatTitle(e.target.value)}
                onPressEnter={async () => { setIsEditingTitle(false); await saveTitle(chatTitle) }}
                onBlur={async () => { setIsEditingTitle(false); await saveTitle(chatTitle) }}
              />
            ) : (
              <button
                className="truncate text-sm text-gray-700 dark:text-gray-200 hover:underline"
                title={chatTitle || 'Untitled'}
                onClick={() => setIsEditingTitle(true)}
              >
                {chatTitle || 'Untitled'}
              </button>
            )}
          </div>
        )}
        <div className="lg:hidden">
          <PromptSelect
            selectedSystemPrompt={selectedSystemPrompt}
            setSelectedSystemPrompt={setSelectedSystemPrompt}
            setSelectedQuickPrompt={setSelectedQuickPrompt}
          />
        </div>
        <SelectedKnowledge />
      </div>
      <div className="flex flex-1 justify-end px-4">
        <div className="ml-4 flex items-center md:ml-6">
          <div className="flex gap-4 items-center">
            <Tooltip title={'Quick ingest media'}>
              <button
                onClick={() => setQuickIngestOpen(true)}
                className="!text-gray-500 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <PaperclipIcon className="w-6 h-6" />
              </button>
            </Tooltip>
            {messages.length > 0 && !streaming && (
              <MoreOptions
                shareModeEnabled={shareModeEnabled}
                historyId={historyId}
                messages={messages}
              />
            )}
            {!hideCurrentChatModelSettings && (
              <Tooltip title={'Current Conversation Settings'}>
                <button
                  onClick={() => setOpenModelSettings(true)}
                  className="!text-gray-500 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <BrainCog className="w-6 h-6" />
                </button>
              </Tooltip>
            )}
            <Tooltip title={t("githubRepository")}>
              <a
                href="https://github.com/n4ze3m/page-assist"
                target="_blank"
                className="!text-gray-500 hidden lg:block dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <GithubIcon className="w-6 h-6" />
              </a>
            </Tooltip>
            {/* Three-dot menu between GitHub and Settings */}
            <Popover
              trigger="click"
              placement="bottomRight"
              content={
                <div className="flex flex-col gap-1 min-w-48">
                  <button
                    onClick={async () => {
                      const storage = new (await import('@plasmohq/storage')).Storage({ area: 'local' })
                      await storage.set('uiMode', 'sidePanel')
                      await storage.set('actionIconClick', 'sidePanel')
                      await storage.set('contextMenuClick', 'sidePanel')
                      try {
                        // Chromium sidePanel
                        // @ts-ignore
                        if (chrome?.sidePanel) {
                          const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
                          if (tabs?.[0]?.id) await chrome.sidePanel.open({ tabId: tabs[0].id })
                        } else {
                          // Firefox sidebar
                          await browser.sidebarAction.open()
                        }
                      } catch {}
                    }}
                    className="text-left text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Switch to Sidebar
                  </button>
                </div>
              }
            >
              <button className="!text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4z"/></svg>
              </button>
            </Popover>
            <Tooltip title={t("settings")}>
              <NavLink
                to="/settings"
                className="!text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <CogIcon className="w-6 h-6" />
              </NavLink>
            </Tooltip>
          </div>
        </div>
      </div>
      <QuickIngestModal open={quickIngestOpen} onClose={() => setQuickIngestOpen(false)} />
    </div>
  )
}

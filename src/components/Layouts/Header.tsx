import { useStorage } from "@plasmohq/storage/hook"
import {
  BrainCog,
  ChevronLeft,
  CogIcon,
  ComputerIcon,
  GithubIcon,
  PanelLeftIcon,
  SquarePen,
  ZapIcon
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLocation, NavLink } from "react-router-dom"
import { SelectedKnowledge } from "../Option/Knowledge/SelectedKnwledge"
import { ModelSelect } from "../Common/ModelSelect"
import { PromptSelect } from "../Common/PromptSelect"
import { useQuery } from "@tanstack/react-query"
import { fetchChatModels } from "~/services/ollama"
import { useMessageOption } from "~/hooks/useMessageOption"
import { Select, Tooltip } from "antd"
import { getAllPrompts } from "@/db"
import { ProviderIcons } from "../Common/ProviderIcon"
import { NewChat } from "./NewChat"
import { PageAssistSelect } from "../Select"
import { MoreOptions } from "./MoreOptions"
type Props = {
  setSidebarOpen: (open: boolean) => void
  setOpenModelSettings: (open: boolean) => void
}

export const Header: React.FC<Props> = ({
  setOpenModelSettings,
  setSidebarOpen
}) => {
  const { t } = useTranslation(["option", "common"])
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
    placeholderData: (prev) => prev
  })

  const { data: prompts, isLoading: isPromptLoading } = useQuery({
    queryKey: ["fetchAllPromptsLayout"],
    queryFn: getAllPrompts
  })

  const { pathname } = useLocation()

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
      className={`sticky top-0 z-[999] flex h-16 p-3  bg-gray-50 border-b  dark:bg-[#171717] dark:border-gray-600 ${
        temporaryChat && "!bg-gray-200 dark:!bg-black"
      }`}>
      <div className="flex gap-2 items-center">
        {pathname !== "/" && (
          <div>
            <NavLink
              to="/"
              className="text-gray-500 items-center dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <ChevronLeft className="w-8 h-8" />
            </NavLink>
          </div>
        )}
        <div>
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
          <PageAssistSelect
            className="w-80"
            placeholder={t("common:selectAModel")}
            loadingText={t("common:selectAModel")}
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.value)
              localStorage.setItem("selectedModel", e.value)
            }}
            isLoading={isModelsLoading}
            options={models?.map((model) => ({
              label: (
                <span
                  key={model.model}
                  className="flex flex-row gap-3 items-center ">
                  <ProviderIcons
                    provider={model?.provider}
                    className="w-5 h-5"
                  />
                  <span className="line-clamp-2">{model.name}</span>
                </span>
              ),
              value: model.model
            }))}
            onRefresh={() => {
              refetch()
            }}
          />
        </div>
        <div className="lg:hidden">
          <ModelSelect />
        </div>
        <span className="text-lg font-thin text-zinc-300 dark:text-zinc-600">
          {"/"}
        </span>
        <div className="hidden lg:block">
          <Select
            size="large"
            loading={isPromptLoading}
            showSearch
            placeholder={t("selectAPrompt")}
            className="w-60"
            allowClear
            onChange={handlePromptChange}
            value={selectedSystemPrompt}
            filterOption={(input, option) =>
              //@ts-ignore
              option.label.key.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            options={prompts?.map((prompt) => ({
              label: (
                <span
                  key={prompt.title}
                  className="flex flex-row gap-3 items-center">
                  {prompt.is_system ? (
                    <ComputerIcon className="w-4 h-4" />
                  ) : (
                    <ZapIcon className="w-4 h-4" />
                  )}
                  {prompt.title}
                </span>
              ),
              value: prompt.id
            }))}
          />
        </div>
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
            {/* {pathname === "/" &&
              messages.length > 0 &&
              !streaming &&
              shareModeEnabled && (
                <ShareBtn historyId={historyId} messages={messages} />
              )} */}
            {messages.length > 0 && !streaming && (
              <MoreOptions
                shareModeEnabled={shareModeEnabled}
                historyId={historyId}
                messages={messages}
              />
            )}
            {!hideCurrentChatModelSettings && (
              <Tooltip title={t("common:currentChatModelSettings")}>
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
    </div>
  )
}

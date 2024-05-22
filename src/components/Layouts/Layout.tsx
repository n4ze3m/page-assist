import React, { useState } from "react"

import { useLocation, NavLink } from "react-router-dom"
import { Sidebar } from "../Option/Sidebar"
import { Drawer, Select, Tooltip } from "antd"
import { useQuery } from "@tanstack/react-query"
import { fetchChatModels, getAllModels } from "~/services/ollama"
import { useMessageOption } from "~/hooks/useMessageOption"
import {
  BrainCog,
  ChevronLeft,
  CogIcon,
  ComputerIcon,
  GithubIcon,
  PanelLeftIcon,
  SlashIcon,
  SquarePen,
  ZapIcon
} from "lucide-react"
import { getAllPrompts } from "@/db"
import { ShareBtn } from "~/components/Common/ShareBtn"
import { useTranslation } from "react-i18next"
import { OllamaIcon } from "../Icons/Ollama"
import { SelectedKnowledge } from "../Option/Knowledge/SelectedKnwledge"
import { useStorage } from "@plasmohq/storage/hook"
import { ModelSelect } from "../Common/ModelSelect"
import { PromptSelect } from "../Common/PromptSelect"
import { ChatSettings } from "../Icons/ChatSettings"
import { CurrentChatModelSettings } from "../Common/CurrentChatModelSettings"

export default function OptionLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useTranslation(["option", "common"])
  const [shareModeEnabled] = useStorage("shareMode", false)
  const [openModelSettings, setOpenModelSettings] = useState(false)

  const {
    selectedModel,
    setSelectedModel,
    clearChat,
    selectedSystemPrompt,
    setSelectedQuickPrompt,
    setSelectedSystemPrompt,
    messages,
    streaming
  } = useMessageOption()

  const {
    data: models,
    isLoading: isModelsLoading,
    isFetching: isModelsFetching
  } = useQuery({
    queryKey: ["fetchModel"],
    queryFn: () => fetchChatModels({ returnEmpty: true }),
    refetchInterval: 15000
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
    <div>
      <div>
        <div className="flex flex-col">
          <div className="sticky top-0 z-[999] flex h-16 p-3  bg-gray-50 border-b  dark:bg-[#171717] dark:border-gray-600">
            <div className="flex gap-2 items-center">
              {pathname !== "/" && (
                <div>
                  <NavLink
                    to="/"
                    className="text-gray-500 items-center dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
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
              <div>
                <button
                  onClick={clearChat}
                  className="inline-flex  dark:bg-transparent bg-white items-center rounded-lg border  dark:border-gray-700 bg-transparent px-3 py-2.5 text-xs lg:text-sm font-medium leading-4 text-gray-800  dark:text-white disabled:opacity-50 ease-in-out transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white">
                  <SquarePen className="h-5 w-5 " />
                  <span className=" truncate ml-3">{t("newChat")}</span>
                </button>
              </div>
              <span className="text-lg font-thin text-zinc-300 dark:text-zinc-600">
                {"/"}
              </span>
              <div className="hidden lg:block">
                <Select
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e)
                    localStorage.setItem("selectedModel", e)
                  }}
                  size="large"
                  loading={isModelsLoading || isModelsFetching}
                  filterOption={(input, option) =>
                    option.label.key
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                  showSearch
                  placeholder={t("common:selectAModel")}
                  className="w-64 "
                  options={models?.map((model) => ({
                    label: (
                      <span
                        key={model.model}
                        className="flex flex-row gap-3 items-center">
                        <OllamaIcon className="w-5 h-5" />
                        {model.name}
                      </span>
                    ),
                    value: model.model
                  }))}
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
                    option.label.key
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
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
                <PromptSelect />
              </div>
              <SelectedKnowledge />
            </div>
            <div className="flex flex-1 justify-end px-4">
              <div className="ml-4 flex items-center md:ml-6">
                <div className="flex gap-4 items-center">
                  <Tooltip title={t("currentChatModelSettings")}>
                    <button
                      onClick={() => setOpenModelSettings(true)}
                      className="!text-gray-500 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                      <BrainCog className="w-6 h-6" />
                    </button>
                  </Tooltip>
                  {pathname === "/" &&
                    messages.length > 0 &&
                    !streaming &&
                    shareModeEnabled && <ShareBtn messages={messages} />}
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
          <main className="flex-1">{children}</main>
        </div>
      </div>

      <Drawer
        title={t("sidebarTitle")}
        placement="left"
        closeIcon={null}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </Drawer>

      <CurrentChatModelSettings
        open={openModelSettings}
        setOpen={setOpenModelSettings}
      />
    </div>
  )
}

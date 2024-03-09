import React, { useState } from "react"

import { useLocation, NavLink } from "react-router-dom"
import { Sidebar } from "../Option/Sidebar"
import { Drawer, Select, Tooltip } from "antd"
import { useQuery } from "@tanstack/react-query"
import { getAllModels } from "~services/ollama"
import { useMessageOption } from "~hooks/useMessageOption"
import {
  ChevronLeft,
  CogIcon,
  ComputerIcon,
  GithubIcon,
  PanelLeftIcon,
  SquarePen,
  ZapIcon
} from "lucide-react"
import { getAllPrompts } from "~libs/db"
import { ShareBtn } from "~components/Common/ShareBtn"

export default function OptionLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
    queryFn: () => getAllModels({ returnEmpty: true }),
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

  const handlePromptChange = (value: string) => {
    const prompt = getPromptInfoById(value)
    if (prompt?.is_system) {
      setSelectedSystemPrompt(prompt.id)
    } else {
      setSelectedQuickPrompt(prompt.content)
      setSelectedSystemPrompt(null)
    }
  }

  return (
    <div>
      <div>
        <div className="flex flex-col">
          <div className="sticky top-0 z-[999] flex h-16 p-3  bg-white border-b border-gray-200 dark:bg-[#171717] dark:border-gray-600">
            <div className="flex gap-2 items-center">
              {pathname !== "/" && (
                <div>
                  <NavLink
                    to="/"
                    className="text-gray-500 items-center dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
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
                  className="inline-flex items-center rounded-lg border  dark:border-gray-700 bg-transparent px-3 py-3 text-sm font-medium leading-4 text-gray-800 shadow-sm  dark:text-white disabled:opacity-50 ">
                  <SquarePen className="h-4 w-4 mr-3" />
                  New Chat
                </button>
              </div>
              <span className="text-lg font-thin text-zinc-300 dark:text-zinc-600">
                {"/"}
              </span>
              <div>
                <Select
                  value={selectedModel}
                  onChange={setSelectedModel}
                  size="large"
                  loading={isModelsLoading || isModelsFetching}
                  filterOption={(input, option) =>
                    option.label.toLowerCase().indexOf(input.toLowerCase()) >=
                      0 ||
                    option.value.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                  showSearch
                  placeholder="Select a model"
                  className="w-64 "
                  options={models?.map((model) => ({
                    label: model.name,
                    value: model.model
                  }))}
                />
              </div>
              <span className="text-lg font-thin text-zinc-300 dark:text-zinc-600">
                {"/"}
              </span>
              <div>
                <Select
                  size="large"
                  loading={isPromptLoading}
                  showSearch
                  placeholder="Select a prompt"
                  className="w-60"
                  allowClear
                  onChange={handlePromptChange}
                  value={selectedSystemPrompt}
                  filterOption={(input, option) =>
                    option.label.key
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                  options={prompts?.map((prompt) => ({
                    label: (
                      <span
                        key={prompt.title}
                        className="flex flex-row justify-between items-center">
                        {prompt.title}
                        {prompt.is_system ? (
                          <ComputerIcon className="w-4 h-4" />
                        ) : (
                          <ZapIcon className="w-4 h-4" />
                        )}
                      </span>
                    ),
                    value: prompt.id
                  }))}
                />
              </div>
            </div>
            <div className="flex flex-1 justify-end px-4">
              <div className="ml-4 flex items-center md:ml-6">
                <div className="flex gap-4 items-center">
                  {pathname === "/" && messages.length > 0 && !streaming && (
                    <ShareBtn messages={messages} />
                  )}
                  {/* <Tooltip title="Manage Prompts">
                    <NavLink
                      to="/prompts"
                      className="!text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                      <Book className="w-6 h-6" />
                    </NavLink>
                  </Tooltip> */}
                  <Tooltip title="Github Repository">
                    <a
                      href="https://github.com/n4ze3m/page-assist"
                      target="_blank"
                      className="!text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                      <GithubIcon className="w-6 h-6" />
                    </a>
                  </Tooltip>
                  {/* <Tooltip title="Manage Ollama Models">
                    <NavLink
                      to="/models"
                      className="!text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                      <BrainCircuit className="w-6 h-6" />
                    </NavLink>
                  </Tooltip> */}
                  <Tooltip title="Manage Ollama Models">
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
        title={"Chat History"}
        placement="left"
        closeIcon={null}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}>
        <Sidebar />
      </Drawer>
    </div>
  )
}

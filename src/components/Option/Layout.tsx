import React, { useState } from "react"
import { CogIcon } from "@heroicons/react/24/outline"

import { useLocation, NavLink } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Drawer, Layout, Modal, Select, Tooltip } from "antd"
import { useQuery } from "@tanstack/react-query"
import { fetchModels } from "~services/ollama"
import { useMessageOption } from "~hooks/useMessageOption"
import {
  GithubIcon,
  PanelLeftIcon,
  BrainCircuit,
  SquarePen,
  ChevronLeft
} from "lucide-react"
import { Settings } from "./Settings"

export default function OptionLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [open, setOpen] = useState(false)

  const {
    data: models,
    isLoading: isModelsLoading,
    isFetching: isModelsFetching
  } = useQuery({
    queryKey: ["fetchModel"],
    queryFn: fetchModels,
    refetchInterval: 15000
  })

  const { pathname } = useLocation()
  const { selectedModel, setSelectedModel, clearChat } = useMessageOption()

  return (
    <Layout className="bg-white dark:bg-[#171717] md:flex">
      <div className="flex items-center p-3 fixed flex-row justify-between border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-[#171717] w-full z-10">
        <div className="flex items-center flex-row gap-3">
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
                option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 ||
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
        </div>
        <div className="flex gap-4 items-center">
          <Tooltip title="Github Repository">
            <a
              href="https://github.com/n4ze3m/page-assist"
              target="_blank"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <GithubIcon className="w-6 h-6" />
            </a>
          </Tooltip>
          <Tooltip title="Manage Ollama Models">
            <NavLink
              to="/models"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <BrainCircuit className="w-6 h-6" />
            </NavLink>
          </Tooltip>
          <button
            onClick={() => setOpen(true)}
            className="text-gray-500 dark:text-gray-400">
            <CogIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      <Layout.Content>{children}</Layout.Content>

      <Drawer
        title={"Chat History"}
        placement="left"
        closeIcon={null}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}>
        <Sidebar />
      </Drawer>

      <Modal
        open={open}
        width={800}
        title={"Settings"}
        onOk={() => setOpen(false)}
        footer={null}
        onCancel={() => setOpen(false)}>
        <Settings setClose={() => setOpen(false)} />
      </Modal>
    </Layout>
  )
}

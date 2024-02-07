import React, { Fragment, useState } from "react"
import { Dialog, Menu, Transition } from "@headlessui/react"
import {
  Bars3BottomLeftIcon,
  XMarkIcon,
  TagIcon,
  CircleStackIcon,
  CogIcon,
  ChatBubbleLeftIcon,
  Bars3Icon,
  Bars4Icon,
  ArrowPathIcon
} from "@heroicons/react/24/outline"
import logoImage from "data-base64:~assets/icon.png"

import { Link, useParams, useLocation, useNavigate } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Drawer, Layout, Modal, Select } from "antd"
import { useQuery } from "@tanstack/react-query"
import { fetchModels } from "~services/ollama"
import { useMessageOption } from "~hooks/useMessageOption"
import { PanelLeftIcon, Settings2 } from "lucide-react"
import { Settings } from "./Settings"
import { useDarkMode } from "~hooks/useDarkmode"

const navigation = [
  { name: "Embed", href: "/bot/:id", icon: TagIcon },
  {
    name: "Preview",
    href: "/bot/:id/preview",
    icon: ChatBubbleLeftIcon
  },
  {
    name: "Data Sources",
    href: "/bot/:id/data-sources",
    icon: CircleStackIcon
  },
  {
    name: "Settings",
    href: "/bot/:id/settings",
    icon: CogIcon
  }
]

//@ts-ignore -
function classNames(...classes) {
  return classes.filter(Boolean).join(" ")
}

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
    refetch: refetchModels,
    isFetching: isModelsFetching
  } = useQuery({
    queryKey: ["fetchModel"],
    queryFn: fetchModels
  })

  const { selectedModel, setSelectedModel } = useMessageOption()


  return (
    <Layout className="bg-white dark:bg-[#171717] md:flex">
      <div className="flex items-center p-3 fixed flex-row justify-between border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-[#171717] w-full z-10">
        <div className="flex items-center flex-row gap-3">
          <div>
            <button
              className="text-gray-500 dark:text-gray-400"
              onClick={() => setSidebarOpen(true)}>
              <PanelLeftIcon className="w-6 h-6" />
            </button>
          </div>
          <div>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              size="large"
              loading={isModelsLoading || isModelsFetching}
              placeholder="Select a model"
              className="w-64"
              options={models?.map((model) => ({
                label: model.name,
                value: model.model
              }))}
            />
          </div>
        </div>
        <button>

        </button>
        <button
          onClick={() => setOpen(true)}
          className="text-gray-500 dark:text-gray-400">
          <CogIcon className="w-6 h-6" />
        </button>
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

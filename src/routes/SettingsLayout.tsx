import React, { useState, useEffect } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { Layout, Menu, Button, Drawer } from "antd"
import {
  Settings,
  Layers,
  MessageSquare,
  Download,
  Brain,
  Share2,
  BookOpen,
  Database,
  Chrome,
  Info,
  Menu as MenuIcon
} from "lucide-react"

const { Sider, Content } = Layout

const settingsNav = [
  { key: "", label: "General", path: "/settings", icon: Settings },
  { key: "model", label: "Model", path: "/settings/model", icon: Layers },
  {
    key: "prompt",
    label: "Prompt",
    path: "/settings/prompt",
    icon: MessageSquare
  },
  { key: "ollama", label: "Ollama", path: "/settings/ollama", icon: Download },
  { key: "openai", label: "OpenAI", path: "/settings/openai", icon: Brain },
  { key: "share", label: "Share", path: "/settings/share", icon: Share2 },
  {
    key: "knowledge",
    label: "Knowledge",
    path: "/settings/knowledge",
    icon: BookOpen
  },
  { key: "rag", label: "RAG", path: "/settings/rag", icon: Database },
  { key: "chrome", label: "Chrome AI", path: "/settings/chrome", icon: Chrome },
  { key: "about", label: "About", path: "/settings/about", icon: Info }
]

export const SettingsLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const currentPath = location.pathname

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleNavClick = (path: string) => {
    navigate(path)
    setMobileOpen(false)
  }

  const items = settingsNav.map((item) => ({
    key: item.path,
    label: item.label,
    icon: React.createElement(item.icon, { size: 16 }),
    onClick: () => handleNavClick(item.path)
  }))

  return (
    <Layout className="min-h-screen">
      {!isMobile && (
        <Sider
          width={200}
          className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}>
          <div className="p-4">
            <h2
              className={`text-lg font-semibold mb-4 transition-colors ${collapsed ? "hidden" : ""}`}>
              Settings
            </h2>
            <Menu
              mode="inline"
              selectedKeys={[currentPath]}
              items={items}
              className="border-none"
              inlineCollapsed={collapsed}
            />
          </div>
        </Sider>
      )}
      <Layout>
        <Content className="p-6 bg-gray-50 dark:bg-gray-900 flex-1">
          {isMobile && (
            <>
              <Button
                type="text"
                icon={<MenuIcon size={20} />}
                onClick={() => setMobileOpen(true)}
                className="mb-4"
              />
              <Drawer
                title="Settings"
                placement="left"
                onClose={() => setMobileOpen(false)}
                open={mobileOpen}
                width={200}>
                <Menu
                  mode="inline"
                  selectedKeys={[currentPath]}
                  items={items}
                  className="border-none"
                />
              </Drawer>
            </>
          )}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

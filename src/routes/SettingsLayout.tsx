import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { Tabs } from "antd"

const settingsTabs = [
  { key: "", label: "General" },
  { key: "model", label: "Model" },
  { key: "prompt", label: "Prompt" },
  { key: "ollama", label: "Ollama" },
  { key: "openai", label: "OpenAI" },
  { key: "share", label: "Share" },
  { key: "knowledge", label: "Knowledge" },
  { key: "rag", label: "RAG" },
  { key: "chrome", label: "Chrome AI" },
  { key: "about", label: "About" }
]

export const SettingsLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Get the current tab from the pathname
  const currentTab = location.pathname.split("/settings/")[1] || ""

  const handleTabChange = (key: string) => {
    navigate(key || ".")
  }

  return (
    <div>
      <Tabs
        activeKey={currentTab}
        onChange={handleTabChange}
        type="card"
        items={settingsTabs.map((tab) => ({
          key: tab.key,
          label: tab.label
        }))}
      />
      <Outlet />
    </div>
  )
}

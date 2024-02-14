import { Tabs } from "antd"
import { SettingsOllama } from "./Settings/ollama"
import { SettingPrompt } from "./Settings/prompt"
import { SettingOther } from "./Settings/other"

type Props = {
  setClose: (close: boolean) => void
}

export const Settings = ({ setClose }: Props) => {
  return (
    <div className="my-6 max-h-[80vh] overflow-y-auto">
      <Tabs
        tabPosition="left"
        defaultActiveKey="1"
        items={[
          {
            id: "1",
            key: "1",
            label: "Prompt",
            children: <SettingPrompt />
          },
          {
            id: "2",
            key: "2",
            label: "Web UI Settings",
            children: <SettingOther />
          },
          {
            id: "3",
            key: "3",
            label: "Ollama Settings",
            children: <SettingsOllama />
          }
        ]}
      />
    </div>
  )
}

import { Tabs } from "antd"
import { SettingsOllama } from "./Settings/ollama"
import { SettingPrompt } from "./Settings/prompt"
import { SettingOther } from "./Settings/other"

type Props = {
  setClose: (close: boolean) => void
}

export const Settings = ({ setClose }: Props) => {
  return (
    <div className="my-6">
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
            label: "Ollama",
            children: <SettingsOllama />
          },
          {
            id: "3",
            key: "3",
            label: "Other",
            children: <SettingOther />
          }
        ]}
      />
    </div>
  )
}

import { Select } from "antd"
import { useTheme } from "@/hooks/useTheme"

const { Option } = Select

export function BackgroundSwitcher({ className }: { className?: string }) {
  const { backgroundName, setBackground } = useTheme()

  return (
    <Select
      value={backgroundName}
      onChange={(value) => setBackground(value)}
      style={{ width: 160 }}
      className={`${className}`}
    >
      <Option value="blurryGradient">Blurry Gradient</Option>
      <Option value="layeredWaves">Layered Waves</Option>
    </Select>
  )
}

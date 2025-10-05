import { Select } from "antd"
import { useTheme } from "@/hooks/useTheme"

const { Option } = Select

export function ThemeSwitcher({ className }: { className?: string }) {
  const { themeName, setTheme } = useTheme()

  return (
    <Select
      value={themeName}
      onChange={(value) => setTheme(value)}
      style={{ width: 160 }}
      className={`${className}`}
    >
      <Option value="default">Default</Option>
      <Option value="moss">Moss</Option>
      <Option value="commodore">Commodore</Option>
    </Select>
  )
}

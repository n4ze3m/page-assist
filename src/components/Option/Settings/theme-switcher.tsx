import { Select } from "antd"
import { useTheme } from "@/hooks/useTheme"

const { Option } = Select

export function ThemeSwitcher() {
  const { themeName, setTheme } = useTheme()

  return (
    <Select
      value={themeName}
      onChange={(value) => setTheme(value)}
      style={{ width: 160 }}
    >
      <Option value="sky">Sky</Option>
      <Option value="moss">Mossy Green</Option>
    </Select>
  )
}

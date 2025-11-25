import { App } from "antd"
import type { MessageInstance } from "antd/es/message/interface"

export const useAntdMessage = (): MessageInstance => {
  const { message } = App.useApp()
  return message
}


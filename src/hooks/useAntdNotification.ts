import { App } from "antd"
import type { NotificationInstance } from "antd/es/notification/interface"

export const useAntdNotification = (): NotificationInstance => {
  const { notification } = App.useApp()
  return notification
}

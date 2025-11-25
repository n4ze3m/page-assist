import { App } from "antd"

export const useAntdModal = () => {
  const { modal } = App.useApp()
  return modal
}

import React from "react"
import { ExclamationCircleFilled } from "@ant-design/icons"
import { useAntdModal } from "@/hooks/useAntdModal"

export type ConfirmDangerOptions = {
  title?: string
  content: React.ReactNode
  okText?: string
  cancelText?: string
  /** Defaults to true for destructive actions */
  danger?: boolean
  /** Which button receives autofocus */
  autoFocusButton?: "ok" | "cancel"
}

/**
 * Show a consistent, accessible confirm dialog for destructive actions.
 * Returns a function that resolves to true if user confirmed, false otherwise.
 */
export function useConfirmDanger() {
  const modal = useAntdModal()

  return (options: ConfirmDangerOptions): Promise<boolean> => {
    const {
      title = "Please confirm",
      content,
      okText = "OK",
      cancelText = "Cancel",
      danger = true,
      autoFocusButton = "cancel"
    } = options

    return new Promise((resolve) => {
      let settled = false
      const instance = modal.confirm({
        title,
        icon: <ExclamationCircleFilled />,
        content,
        centered: true,
        okText,
        cancelText,
        okButtonProps: { danger },
        maskClosable: false,
        keyboard: true,
        autoFocusButton,
        onOk: () => {
          if (!settled) {
            settled = true
            resolve(true)
          }
        },
        onCancel: () => {
          if (!settled) {
            settled = true
            resolve(false)
          }
        }
      })

      void instance
    })
  }
}

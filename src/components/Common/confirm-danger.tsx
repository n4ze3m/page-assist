import React from "react"
import { Modal } from "antd"
import { ExclamationCircleFilled } from "@ant-design/icons"

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
 * Returns a Promise that resolves to true if user confirmed, false otherwise.
 */
export function confirmDanger(options: ConfirmDangerOptions): Promise<boolean> {
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
    const instance = Modal.confirm({
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

    // If AntD returns an instance with a destroy API in future, we could wire cleanup here.
    void instance
  })
}


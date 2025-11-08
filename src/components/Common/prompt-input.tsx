import React from "react"
import { Modal, Input } from "antd"

export type PromptInputOptions = {
  title?: string
  defaultValue?: string
  placeholder?: string
  okText?: string
  cancelText?: string
  inputType?: "text" | "password"
}

/**
 * Show a simple input prompt using Ant Design Modal.confirm and return the entered value.
 * Resolves with the string on confirm, or null on cancel/close.
 */
export function promptInput(options: PromptInputOptions): Promise<string | null> {
  const {
    title = "Enter a value",
    defaultValue = "",
    placeholder,
    okText = "OK",
    cancelText = "Cancel",
    inputType = "text"
  } = options

  return new Promise((resolve) => {
    let val = defaultValue

    Modal.confirm({
      title,
      centered: true,
      okText,
      cancelText,
      content: (
        <Input
          autoFocus
          defaultValue={defaultValue}
          placeholder={placeholder}
          type={inputType}
          onChange={(e) => {
            val = e.target.value
          }}
        />
      ),
      onOk: () => {
        resolve(val)
      },
      onCancel: () => {
        resolve(null)
      }
    })
  })
}


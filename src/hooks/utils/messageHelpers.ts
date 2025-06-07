import { notification } from "antd"
import { useTranslation } from "react-i18next"
import {
  saveMessageOnError as saveError,
  saveMessageOnSuccess as saveSuccess
} from "../chat-helper"

export const focusTextArea = (textareaRef?: React.RefObject<HTMLTextAreaElement>) => {
  try {
    if (textareaRef?.current) {
      textareaRef.current.focus()
    } else {
      const textareaElement = document.getElementById(
        "textarea-message"
      ) as HTMLTextAreaElement
      if (textareaElement) {
        textareaElement.focus()
      }
    }
  } catch (e) { }
}

export const validateBeforeSubmit = (selectedModel: string, t: any) => {
  if (!selectedModel || selectedModel?.trim()?.length === 0) {
    notification.error({
      message: t("error"),
      description: t("validationSelectModel")
    })
    return false
  }

  return true
}

export const createSaveMessageOnSuccess = (temporaryChat: boolean, setHistoryId: (id: string) => void) => {
  return async (e: any): Promise<string | null> => {
    if (!temporaryChat) {
      return await saveSuccess(e)
    } else {
      setHistoryId("temp")
      return null
    }
  }
}

export const createSaveMessageOnError = (
  temporaryChat: boolean,
  history: any,
  setHistory: (history: any) => void,
  setHistoryId: (id: string) => void
) => {
  return async (e: any): Promise<string | null> => {
    if (!temporaryChat) {
      return await saveError(e)
    } else {
      setHistory([
        ...history,
        {
          role: "user",
          content: e.userMessage,
          image: e.image
        },
        {
          role: "assistant",
          content: e.botMessage
        }
      ])

      setHistoryId("temp")
      return null
    }
  }
}

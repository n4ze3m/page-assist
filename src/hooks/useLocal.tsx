import React from "react"

export default function useLocal(key: string) {
  const [value, setValue] = React.useState<string | null>(null)

  React.useEffect(() => {
    chrome.storage.local.get(key, (result) => {
      setValue(result[key])
    })
  }, [key])

  const update = (newValue: string) => {
    chrome.storage.local.set({ [key]: newValue }, () => {
      setValue(newValue)
    })
  }

  const remove = () => {
    chrome.storage.local.remove(key)
    setValue(null)
  }

  return { value, update, remove }
}

export function useChatWidget() {
  const { value, update } = useLocal("chat-widget")
  const [active, setActive] = React.useState<boolean>(value === "show")

  const setActiveValue = (newValue: boolean) => {
    if (newValue) {
      update("show")
    } else {
      update("hide")
    }
    setActive(newValue)
  }

  return { active, setActiveValue }
}

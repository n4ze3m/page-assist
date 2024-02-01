import { useForm } from "@mantine/form"
import { useMutation } from "@tanstack/react-query"
import React from "react"
import { useMessage } from "~hooks/useMessage"

export const SidepanelForm = () => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const resetHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
    }
  }
  const form = useForm({
    initialValues: {
      message: ""
    }
  })

  const { onSubmit, selectedModel } = useMessage()

  const { mutateAsync: sendMessage, isPending: isSending } = useMutation({
    mutationFn: onSubmit
  })

  return (
    <div className="p-3 md:p-6 md:bg-white dark:bg-[#0a0a0a] border rounded-t-xl   border-black/10 dark:border-gray-900/50">
      <div className="flex-grow space-y-6 ">
        <div className="flex">
          <form
            onSubmit={form.onSubmit(async (value) => {
              if (!selectedModel || selectedModel.length === 0) {
                form.setFieldError("message", "Please select a model")
                return
              }
              form.reset()
              resetHeight()
              await sendMessage(value.message)
            })}
            className="shrink-0 flex-grow  flex items-center ">
            <div className="flex items-center p-2 rounded-full border  bg-gray-100 w-full dark:bg-black dark:border-gray-800">
              <textarea
                disabled={isSending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isSending) {
                    e.preventDefault()
                    form.onSubmit(async (value) => {
                      if (value.message.trim().length === 0) {
                        return
                      }
                      if (!selectedModel || selectedModel.length === 0) {
                        form.setFieldError("message", "Please select a model")
                        return
                      }
                      form.reset()
                      resetHeight()
                      await sendMessage(value.message)
                    })()
                  }
                }}
                ref={textareaRef}
                className="rounded-full pl-4 pr-2 py-2 w-full resize-none bg-transparent focus-within:outline-none sm:text-sm focus:ring-0 focus-visible:ring-0 ring-0 dark:ring-0 border-0 dark:text-gray-100"
                required
                rows={1}
                tabIndex={0}
                placeholder="Type a message..."
                {...form.getInputProps("message")}
              />
              <button
                disabled={isSending || form.values.message.length === 0}
                className="mx-2  flex items-center justify-center w-10 h-10  text-white bg-black rounded-xl disabled:opacity-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-6 w-6"
                  viewBox="0 0 24 24">
                  <path d="M9 10L4 15 9 20"></path>
                  <path d="M20 4v7a4 4 0 01-4 4H4"></path>
                </svg>
              </button>
            </div>
          </form>
        </div>
        {form.errors.message && (
          <div className="text-red-500 text-center text-sm mt-1">
            {form.errors.message}
          </div>
        )}
      </div>
    </div>
  )
}

import { useForm } from "@mantine/form"
import { useMutation } from "@tanstack/react-query"
import React from "react"
import useDynamicTextareaSize from "~hooks/useDynamicTextareaSize"
import { useMessage } from "~hooks/useMessage"
import PhotoIcon from "@heroicons/react/24/outline/PhotoIcon"
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon"
import { toBase64 } from "~libs/to-base64"

type Props = {
  dropedFile: File | undefined
}

export const SidepanelForm = ({ dropedFile }: Props) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const resetHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
    }
  }
  const form = useForm({
    initialValues: {
      message: "",
      image: ""
    }
  })

  const onInputChange = async (
    e: React.ChangeEvent<HTMLInputElement> | File
  ) => {
    if (e instanceof File) {
      const base64 = await toBase64(e)
      form.setFieldValue("image", base64)
    } else {
      if (e.target.files) {
        const base64 = await toBase64(e.target.files[0])
        form.setFieldValue("image", base64)
      }
    }
  }

  React.useEffect(() => {
    if (dropedFile) {
      onInputChange(dropedFile)
    }
  }, [dropedFile])

  useDynamicTextareaSize(textareaRef, form.values.message, 120)

  const { onSubmit, selectedModel, chatMode } = useMessage()

  const { mutateAsync: sendMessage, isPending: isSending } = useMutation({
    mutationFn: onSubmit
  })

  return (
    <div className="p-3 md:p-6 md:bg-white dark:bg-[#262626] border rounded-t-xl border-black/10 dark:border-gray-700">
      <div className="flex-grow space-y-6 ">
        {chatMode === "normal" && form.values.image && (
          <div className="h-full rounded-md shadow relative">
            <div>
              <img
                src={form.values.image}
                alt="Uploaded"
                className="h-full w-auto object-cover rounded-md min-w-[50px]"
              />
              <button
                onClick={() => {
                  form.setFieldValue("image", "")
                }}
                className="absolute top-2 right-2 bg-white dark:bg-[#262626] p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-gray-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
        <div className="flex">
          <form
            onSubmit={form.onSubmit(async (value) => {
              if (!selectedModel || selectedModel.length === 0) {
                form.setFieldError("message", "Please select a model")
                return
              }
              form.reset()
              resetHeight()
              await sendMessage({
                image: value.image,
                message: value.message.trim()
              })
            })}
            className="shrink-0 flex-grow  flex items-center ">
            <div className="flex items-center p-2 rounded-2xl border  bg-gray-100 w-full dark:bg-[#262626] dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  inputRef.current?.click()
                }}
                className={`flex ml-3 items-center justify-center dark:text-gray-100 ${
                  chatMode === "rag" ? "hidden" : "block"
                }`}>
                <PhotoIcon className="h-5 w-5" />
              </button>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                ref={inputRef}
                accept="image/*"
                multiple={false}
                onChange={onInputChange}
              />

              <textarea
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
                      await sendMessage({
                        image: value.image,
                        message: value.message.trim()
                      })
                    })()
                  }
                }}
                ref={textareaRef}
                className="px-2 py-2 w-full resize-none bg-transparent focus-within:outline-none sm:text-sm focus:ring-0 focus-visible:ring-0 ring-0 dark:ring-0 border-0 dark:text-gray-100"
                required
                rows={1}
                tabIndex={0}
                placeholder="Type a message..."
                {...form.getInputProps("message")}
              />
              <button
                disabled={isSending || form.values.message.length === 0}
                className="ml-2 flex items-center justify-center w-10 h-10  text-white bg-black rounded-xl disabled:opacity-50">
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

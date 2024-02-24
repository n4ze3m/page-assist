import { useForm } from "@mantine/form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import React from "react"
import useDynamicTextareaSize from "~hooks/useDynamicTextareaSize"
import { toBase64 } from "~libs/to-base64"
import { useMessageOption } from "~hooks/useMessageOption"
import { Checkbox, Dropdown, Tooltip } from "antd"
import { Image } from "antd"
import { useSpeechRecognition } from "~hooks/useSpeechRecognition"
import { MicIcon } from "~icons/MicIcon"
import { StopCircleIcon } from "~icons/StopCircleIcon"
import { PhotoIcon } from "~icons/PhotoIcon"
import { XMarkIcon } from "~icons/XMarkIcon"
import { useWebUI } from "~store/webui"

type Props = {
  dropedFile: File | undefined
}

export const PlaygroundForm = ({ dropedFile }: Props) => {
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

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

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

  useDynamicTextareaSize(textareaRef, form.values.message, 300)

  const {
    onSubmit,
    selectedModel,
    chatMode,
    speechToTextLanguage,
    stopStreamingRequest,
    streaming: isSending
  } = useMessageOption()

  const { isListening, start, stop, transcript } = useSpeechRecognition()
  const { sendWhenEnter, setSendWhenEnter } = useWebUI()

  React.useEffect(() => {
    if (isListening) {
      form.setFieldValue("message", transcript)
    }
  }, [transcript])

  const queryClient = useQueryClient()

  const { mutateAsync: sendMessage } = useMutation({
    mutationFn: onSubmit,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchChatHistory"]
      })
    }
  })

  return (
    <div className="px-3 pt-3 md:px-6 md:pt-6 md:bg-white dark:bg-[#262626] border rounded-t-xl border-black/10 dark:border-gray-600">
      <div
        className={`h-full rounded-md shadow relative ${
          form.values.image.length === 0 ? "hidden" : "block"
        }`}>
        <div className="relative">
          <Image
            src={form.values.image}
            alt="Uploaded Image"
            width={180}
            preview={false}
            className="rounded-md"
          />
          <button
            onClick={() => {
              form.setFieldValue("image", "")
            }}
            className="flex items-center justify-center absolute top-0 m-2 bg-white  dark:bg-[#262626] p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 text-black dark:text-gray-100">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      {/* <div className="flex gap-3 justify-end">
        <Tooltip title="New Chat">
          <button
            onClick={clearChat}
            className="text-gray-500 dark:text-gray-100 mr-3">
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </Tooltip>
      </div> */}
      <div>
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
            className="shrink-0 flex-grow  flex flex-col items-center ">
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
            <div className="w-full border-x border-t flex flex-col dark:border-gray-600 rounded-t-xl p-2">
              <textarea
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !isSending &&
                    sendWhenEnter
                  ) {
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
                style={{ minHeight: "60px" }}
                tabIndex={0}
                placeholder="Type a message..."
                {...form.getInputProps("message")}
              />
              <div className="flex mt-4 !justify-end gap-3">
                <Tooltip title="Voice Message">
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) {
                        stop()
                      } else {
                        start({
                          lang: speechToTextLanguage,
                          continuous: true
                        })
                      }
                    }}
                    className={`flex items-center justify-center dark:text-gray-300`}>
                    {!isListening ? (
                      <MicIcon className="h-5 w-5" />
                    ) : (
                      <div className="relative">
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                        <MicIcon className="h-5 w-5" />
                      </div>
                    )}
                  </button>
                </Tooltip>
                <Tooltip title="Upload Image">
                  <button
                    type="button"
                    onClick={() => {
                      inputRef.current?.click()
                    }}
                    className={`flex items-center justify-center dark:text-gray-300 ${
                      chatMode === "rag" ? "hidden" : "block"
                    }`}>
                    <PhotoIcon className="h-5 w-5" />
                  </button>
                </Tooltip>
                {!isSending ? (
                  <Dropdown.Button
                    htmlType="submit"
                    disabled={
                      isSending || form.values.message.trim().length === 0
                    }
                    className="!justify-end !w-auto"
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m19.5 8.25-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    }
                    menu={{
                      items: [
                        {
                          key: 1,
                          label: (
                            <Checkbox
                              onChange={(e) =>
                                setSendWhenEnter(e.target.checked)
                              }>
                              Send when Enter pressed
                            </Checkbox>
                          )
                        }
                      ]
                    }}>
                    <div className="inline-flex gap-2">
                      {sendWhenEnter ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          className="h-5 w-5"
                          viewBox="0 0 24 24">
                          <path d="M9 10L4 15 9 20"></path>
                          <path d="M20 4v7a4 4 0 01-4 4H4"></path>
                        </svg>
                      ) : null}
                      Submit
                    </div>
                  </Dropdown.Button>
                ) : (
                  <Tooltip title="Stop Streaming">
                    <button
                      type="button"
                      onClick={stopStreamingRequest}
                      className="text-gray-800 dark:text-gray-300">
                      <StopCircleIcon className="h-6 w-6" />
                    </button>
                  </Tooltip>
                )}
              </div>
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

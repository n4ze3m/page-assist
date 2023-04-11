import { useEffect, useRef, useState } from "react"

import "./tailwind.css"

import {
  ArrowUpOnSquareIcon,
  Cog6ToothIcon,
  XMarkIcon
} from "@heroicons/react/20/solid"
import { useForm } from "@mantine/form"
import { useMutation } from "@tanstack/react-query"
import axios from "axios"
import logoImage from "data-base64:~assets/icon.png"
import ReactMarkdown from "react-markdown"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

import { useStorage } from "@plasmohq/storage/hook"

function Chat() {
  type Message = {
    isBot: boolean
    message: string
  }

  type History = {
    bot_response: string
    human_message: string
  }

  const [messages, setMessages] = useState<Message[]>([
    {
      isBot: true,
      message: "Hi, I'm PageAssist Bot. How can I help you?"
    }
  ])

  const [history, setHistory] = useState<History[]>([])
  const [userToken] = useStorage("pa-token", null)

  const route = useNavigate()

  const form = useForm({
    initialValues: {
      message: "",
      isBot: false
    }
  })
  const divRef = useRef(null)

  useEffect(() => {
    divRef.current.scrollIntoView({ behavior: "smooth" })
  })

  const getHtmlFromParent = () => {
    window.parent.postMessage("pageassist-html", "*")
    return new Promise((resolve, reject) => {
      window.addEventListener("message", (event) => {
        if (event.data.type === "pageassist-html") {
          resolve(event.data)
        } else {
          reject("Error")
        }
      })
    })
  }

  const sendToBot = async (message: string) => {
    // @ts-ignore
    const { html } = await getHtmlFromParent()

    const response = await axios.post(
      `${process.env.PLASMO_PUBLIC_API_URL}/chat/chrome`,
      {
        user_message: message,
        html: html,
        history: history
      }
    )

    return response.data
  }

  const onSave = async () => {
    const data = await getHtmlFromParent()
    const response = await axios.post(
      `${process.env.PLASMO_PUBLIC_API_URL}/user/save`,
      data,
      {
        headers: {
          "x-auth-token": userToken
        }
      }
    )

    return response.data
  }

  const { mutateAsync: saveAsync, isLoading: isSaving } = useMutation(onSave, {
    onSuccess: (data) => {
      toast.success("Saved Successfully")
    },
    onError: (er) => {
      console.log(er)
      toast.error("Error in saving")
    }
  })

  const { mutateAsync: sendToBotAsync, isLoading: isSending } = useMutation(
    sendToBot,
    {
      onSuccess: (data) => {
        setMessages([...messages, { isBot: true, message: data.bot_response }])
        setHistory([...history, data])
      },
      onError: (error) => {
        setMessages([
          ...messages,
          { isBot: true, message: "Something went wrong" }
        ])
      }
    }
  )

  return (
    <div className="isolate bg-gray-100 text-gray-800">
      <div className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[-20rem]">
        <svg
          className="relative left-[calc(50%-11rem)] -z-10 h-[21.1875rem] max-w-none -translate-x-1/2 rotate-[30deg] sm:left-[calc(50%-30rem)] sm:h-[42.375rem]"
          viewBox="0 0 1155 678"
          xmlns="http://www.w3.org/2000/svg">
          <path
            fill="url(#45de2b6b-92d5-4d68-a6a0-9b9b2abad533)"
            fillOpacity=".3"
            d="M317.219 518.975L203.852 678 0 438.341l317.219 80.634 204.172-286.402c1.307 132.337 45.083 346.658 209.733 145.248C936.936 126.058 882.053-94.234 1031.02 41.331c119.18 108.451 130.68 295.337 121.53 375.223L855 299l21.173 362.054-558.954-142.079z"
          />
          <defs>
            <linearGradient
              id="45de2b6b-92d5-4d68-a6a0-9b9b2abad533"
              x1="1155.49"
              x2="-78.208"
              y1=".177"
              y2="474.645"
              gradientUnits="userSpaceOnUse">
              <stop stopColor="#9089FC" />
              <stop offset={1} stopColor="#FF80B5" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* Component Start */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2 md:justify-start md:space-x-10">
        <div>
          <Link to="/" className="flex">
            <img className="h-10 w-auto" src={logoImage} alt="PageAssist" />
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4  text-gray-800 hover:text-gray-500 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={async () => {
              // Send data to the app
              await saveAsync()
            }}>
            <ArrowUpOnSquareIcon
              className="-ml-1 mr-3 h-5 w-5"
              aria-hidden="true"
            />
            {isSaving ? "Saving..." : "Send to App"}
          </button>
          <button
            type="button"
            className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-800 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 shadow-sm focus:ring-inset focus:ring-indigo-500"
            onClick={() => {
              route("/settings")
            }}>
            <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="-my-2 -mr-2 md:hidden">
            <button
              type="button"
              className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-800 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 shadow-sm focus:ring-inset focus:ring-indigo-500"
              aria-expanded="false"
              onClick={() => {
                window.parent.postMessage("pageassist-close", "*")
              }}>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          minHeight: "calc(100vh - 4rem)"
        }}
        className="flex flex-col  p-6 items-center justify-center w-screen">
        <div className="flex flex-col flex-grow w-full max-w-xl bg-white shadow-sm  rounded-lg overflow-hidden">
          <div className="flex flex-col flex-grow h-0 p-4 overflow-auto">
            {messages.map((message, index) => {
              return (
                <div
                  key={index}
                  className={
                    message.isBot
                      ? "flex w-full mt-2 space-x-3 max-w-xs"
                      : "flex w-full mt-2 space-x-3 max-w-xs ml-auto justify-end"
                  }>
                  <div>
                    <div
                      className={
                        message.isBot
                          ? "bg-gray-300 p-3 rounded-r-lg rounded-bl-lg"
                          : "bg-blue-600 text-white p-3 rounded-l-lg rounded-br-lg"
                      }>
                      <p className="text-sm">
                        <ReactMarkdown>{message.message}</ReactMarkdown>
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            {isSending && (
              <div className="flex w-full mt-2 space-x-3 max-w-xs">
                <div>
                  <div className="bg-gray-300 p-3 rounded-r-lg rounded-bl-lg">
                    <p className="text-sm">Hold on, I'm looking...</p>
                  </div>
                </div>
              </div>
            )}
            <div ref={divRef} />
          </div>
          <div className="bg-gray-300 p-4">
            <form
              onSubmit={form.onSubmit(async (values) => {
                setMessages([...messages, values])
                form.reset()
                await sendToBotAsync(values.message)
              })}>
              <div className="flex-grow space-y-6">
                <div className="flex">
                  <span className="mr-3">
                    <button
                      disabled={isSending || isSaving}
                      onClick={() => {
                        setHistory([])
                        setMessages([
                          {
                            message: "Hi, I'm PageAssist. How can I help you?",
                            isBot: true
                          }
                        ])
                      }}
                      className="inline-flex items-center rounded-md border border-gray-700 bg-white px-3 h-10 text-sm font-medium text-gray-700  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                      type="button">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        className="h-5 w-5 text-gray-600">
                        <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"></path>
                        <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"></path>
                        <path d="M14.5 17.5 4.5 15"></path>
                      </svg>
                    </button>
                  </span>
                  <div className="flex-grow">
                    <input
                      disabled={isSending || isSaving}
                      className="flex items-center h-10 w-full rounded px-3 text-sm"
                      type="text"
                      required
                      placeholder="Type your message…"
                      {...form.getInputProps("message")}
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat

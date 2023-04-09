import { XMarkIcon } from "@heroicons/react/20/solid"
import { useForm } from "@mantine/form"
import logoImage from "data-base64:~assets/icon.png"
import React from "react"
import { Link, useNavigate } from "react-router-dom"

import { useStorage } from "@plasmohq/storage/hook"

export default function Login() {
  const navigate = useNavigate()
  const [_, setToken] = useStorage("pa-token", null)

  const form = useForm({
    initialValues: {
      passcode: ""
    }
  })

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
        className="flex flex-col  p-6  w-screen">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Sign in to your account
        </h2>
        <div className="bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10 mt-8">
          <ul className="list-disc list-inside text-gray-800 text-md">
            <li>Log in to your Page Assist account.</li>
            <li>Go to your account settings.</li>
            <li>Find your passcode under "Chrome Extension".</li>
            <li>Copy your passcode to your clipboard.</li>
            <li>Open the PageAssist extension and paste your passcode.</li>
            <li>Click "Save" and Happy Chatting!</li>
          </ul>
          <form
            className="space-y-6"
            onSubmit={form.onSubmit(async (values) => {
              setToken(values.passcode)
              navigate("/")
            })}>
            <div>
              <div className="mt-3">
                <input
                  id="passcode"
                  name="passcode"
                  type="password"
                  autoComplete="current-passcode"
                  placeholder="Passcode"
                  required
                  {...form.getInputProps("passcode")}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md border border-transparent bg-teal-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2">
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

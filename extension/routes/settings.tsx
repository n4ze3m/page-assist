import { Switch } from "@headlessui/react"
import { ChevronLeftIcon, XMarkIcon } from "@heroicons/react/20/solid"
import logoImage from "data-base64:~assets/icon.png"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { useStorage } from "@plasmohq/storage/hook"

import { useChatWidget } from "~hooks/useLocal"

//@ts-ignore
function classNames(...classes) {
  return classes.filter(Boolean).join(" ")
}

function Settings() {
  const route = useNavigate()
  const [active, setActiveValue] = useStorage("chat-widget", false)
  const [_, setToken] = useStorage("pa-token", null)

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
      <div className="flex items-center justify-between px-6 pt-4 pb-2 md:justify-start md:space-x-10">
        <div>
          <Link to="/" className="flex">
            <img className="h-10 w-auto" src={logoImage} alt="PageAssist" />
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            className="bg-white shadow-sm rounded-md p-2 inline-flex items-center justify-center text-gray-800 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => {
              route("/")
            }}>
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="-my-2 -mr-2 md:hidden">
            <button
              type="button"
              className="bg-white  shadow-sm rounded-md p-2 inline-flex items-center justify-center text-gray-800 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
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
        <ul role="list" className="mt-2 divide-y divide-gray-200">
          <Switch.Group
            as="li"
            className="flex items-center justify-between py-4">
            <div className="flex flex-col">
              <Switch.Label
                as="p"
                className="text-sm font-medium text-gray-900"
                passive>
                Hide Widget Icon
              </Switch.Label>
              <Switch.Description className="text-sm text-gray-500">
                Hide or Show the widget icon on websites you visit.
              </Switch.Description>
            </div>
            <Switch
              checked={active}
              onChange={setActiveValue}
              className={classNames(
                active ? "bg-teal-500" : "bg-gray-200",
                "relative ml-4 inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              )}>
              <span
                aria-hidden="true"
                className={classNames(
                  active ? "translate-x-5" : "translate-x-0",
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                )}
              />
            </Switch>
          </Switch.Group>
        </ul>

        <button
          type="button"
          onClick={() => {
            setToken(null)
            route("/")
          }}
          className="flex w-full justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
          Logout
        </button>
      </div>
    </div>
  )
}

export default Settings

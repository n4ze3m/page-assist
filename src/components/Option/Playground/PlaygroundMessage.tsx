import Markdown from "../../Common/Markdown"
import React from "react"
import { Image } from "antd"
import { ClipboardIcon } from "~icons/ClipboardIcon"
import { CheckIcon } from "~icons/CheckIcon"

type Props = {
  message: string
  hideCopy?: boolean
  botAvatar?: JSX.Element
  userAvatar?: JSX.Element
  isBot: boolean
  name: string
  images?: string[]
}

export const PlaygroundMessage = (props: Props) => {
  const [isBtnPressed, setIsBtnPressed] = React.useState(false)

  React.useEffect(() => {
    if (isBtnPressed) {
      setTimeout(() => {
        setIsBtnPressed(false)
      }, 4000)
    }
  }, [isBtnPressed])

  return (
    <div className={`group w-full text-gray-800 dark:text-gray-100 `}>
      <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl flex lg:px-0 m-auto w-full">
        <div className="flex flex-row gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 lg:px-0 m-auto w-full">
          <div className="w-8 flex flex-col relative items-end">
            <div className="relative h-7 w-7 p-1 rounded-sm text-white flex items-center justify-center  text-opacity-100r">
              {props.isBot ? (
                !props.botAvatar ? (
                  <div className="absolute h-8 w-8 rounded-full bg-gradient-to-r from-green-300 to-purple-400"></div>
                ) : (
                  props.botAvatar
                )
              ) : !props.userAvatar ? (
                <div className="absolute h-8 w-8 rounded-full from-blue-400 to-blue-600 bg-gradient-to-r"></div>
              ) : (
                props.userAvatar
              )}
            </div>
          </div>
          <div className="relative flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]">
            {props.isBot && (
              <span className="absolute mb-8 -top-4 left-0 text-xs text-gray-400 dark:text-gray-500">
                {props.name}
              </span>
            )}
            <div className="flex flex-grow flex-col gap-3">
              <Markdown message={props.message} />
            </div>
            {/* source if aviable */}
            {props.images && (
              <div className="flex md:max-w-2xl lg:max-w-xl xl:max-w-3xl mt-4 m-auto w-full">
                {props.images
                  .filter((image) => image.length > 0)
                  .map((image, index) => (
                    <Image
                      key={index}
                      src={image}
                      alt="Uploaded Image"
                      width={180}
                      className="rounded-md relative"
                    />
                  ))}
              </div>
            )}
          </div>
          {props.isBot && (
            <div className="flex space-x-2">
              {!props.hideCopy && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(props.message)
                    setIsBtnPressed(true)
                  }}
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                  {!isBtnPressed ? (
                    <ClipboardIcon className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                  ) : (
                    <CheckIcon className="w-3 h-3 text-green-400 group-hover:text-green-500" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

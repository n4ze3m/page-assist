import { Message } from "@/types/message"
import { removeModelSuffix } from "@/db/models"
import Markdown from "./Markdown"

export const ImageExportWrapper = ({ messages }: { messages: Message[] }) => {
  return (
    <div
      id="export-container"
      className="bg-white dark:bg-[#121212] p-8 max-w-3xl mx-auto">
      <div className="flex flex-col gap-4">
        {messages.map((msg, index) => (
          <div key={index} className="flex flex-row gap-4 md:gap-6 my-4">
            {/* Avatar Section */}
            <div className="w-8 flex flex-col relative items-end">
              <div className="relative h-7 w-7 p-1 rounded-sm text-white flex items-center justify-center">
                {msg.isBot ? (
                  <div className="absolute h-8 w-8 rounded-full bg-gradient-to-r from-green-300 to-purple-400 dark:from-green-400 dark:to-purple-500" />
                ) : (
                  <div className="absolute h-8 w-8 rounded-full from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 bg-gradient-to-r" />
                )}
              </div>
            </div>

            {/* Message Content */}
            <div className="flex w-[calc(100%-50px)] flex-col gap-2">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {msg.isBot
                  ? removeModelSuffix(
                      msg.name?.replaceAll(/accounts\/[^\/]+\/models\//g, "")
                    )
                  : "You"}
              </span>

              <div className="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark">
                <Markdown message={msg.message} />
                {msg.images &&
                  msg.images.filter((img) => img.length > 0).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.images.map((img, index) => (
                        <img
                          key={index}
                          src={img}
                          alt={`Image ${index + 1}`}
                          className="max-w-full max-h-64 rounded-lg dark:ring-1 dark:ring-gray-700"
                        />
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

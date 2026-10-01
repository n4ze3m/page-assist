import React from "react"
import { ImagePreview } from "./parts/ImagePreview"

interface ChatInputShellProps {
  image?: string
  onClearImage?: () => void
  onSubmit: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  accept?: string
  textareaComponent: React.ReactNode
  controlsComponent: React.ReactNode
  temporaryChat?: boolean
  closeButtonDarkBgClass?: string
}

export const ChatInputShell: React.FC<ChatInputShellProps> = ({
  image,
  onClearImage,
  onSubmit,
  fileInputRef,
  onFileChange,
  accept = "image/*",
  textareaComponent,
  controlsComponent,
  temporaryChat = false,
  closeButtonDarkBgClass = "dark:bg-[#262626]"
}) => {
  return (
    <div
      data-istemporary-chat={temporaryChat}
      data-testid="chat-input-shell"
      className="pa-card">
      <ImagePreview
        src={image}
        onClear={onClearImage}
        closeButtonDarkBgClass={closeButtonDarkBgClass}
      />
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="shrink-0 flex-grow flex flex-col items-center">
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            className="sr-only"
            ref={fileInputRef}
            accept={accept}
            multiple={false}
            onChange={onFileChange}
          />
          <div className="w-full flex flex-col px-1">
            {textareaComponent}
            <div className="flex mt-4 justify-end gap-3">
              {controlsComponent}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

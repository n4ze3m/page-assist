import React from "react"
import { Image } from "antd"
import { X } from "lucide-react"

export type ImagePreviewProps = {
  src: string
  onClear: () => void
  closeButtonDarkBgClass?: string // allow slight stylistic differences
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ src, onClear, closeButtonDarkBgClass }) => {
  if (!src) return null
  return (
    <div className={`border-b border-gray-200 dark:border-[#404040] relative ${src?.length === 0 ? "hidden" : "block"}`}>
      <button
        type="button"
        onClick={onClear}
        className={`absolute top-1 left-1 flex items-center justify-center z-10 bg-white ${
          closeButtonDarkBgClass ?? "dark:bg-[#262626]"
        } p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#404040] text-black dark:text-gray-100`}>
        <X className="h-3 w-3" />
      </button>
      <Image src={src} alt="Uploaded Image" preview={false} className="rounded-md max-h-32" />
    </div>
  )
}

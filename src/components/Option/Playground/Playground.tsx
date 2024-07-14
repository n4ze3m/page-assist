import React from "react"
import { PlaygroundForm } from "./PlaygroundForm"
import { PlaygroundChat } from "./PlaygroundChat"
import { useMessageOption } from "@/hooks/useMessageOption"

export const Playground = () => {
  const drop = React.useRef<HTMLDivElement>(null)
  const [dropedFile, setDropedFile] = React.useState<File | undefined>()
  const { selectedKnowledge } = useMessageOption()

  const [dropState, setDropState] = React.useState<
    "idle" | "dragging" | "error"
  >("idle")
  React.useEffect(() => {
    if (selectedKnowledge) {
      return
    }

    if (!drop.current) {
      return
    }
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      setDropState("idle")

      const files = Array.from(e.dataTransfer?.files || [])

      const isImage = files.every((file) => file.type.startsWith("image/"))

      if (!isImage) {
        setDropState("error")
        return
      }

      const newFiles = Array.from(e.dataTransfer?.files || []).slice(0, 1)
      if (newFiles.length > 0) {
        setDropedFile(newFiles[0])
      }
    }

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDropState("dragging")
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDropState("idle")
    }

    drop.current.addEventListener("dragover", handleDragOver)
    drop.current.addEventListener("drop", handleDrop)
    drop.current.addEventListener("dragenter", handleDragEnter)
    drop.current.addEventListener("dragleave", handleDragLeave)

    return () => {
      if (drop.current) {
        drop.current.removeEventListener("dragover", handleDragOver)
        drop.current.removeEventListener("drop", handleDrop)
        drop.current.removeEventListener("dragenter", handleDragEnter)
        drop.current.removeEventListener("dragleave", handleDragLeave)
      }
    }
  }, [selectedKnowledge])
  return (
    <div
      ref={drop}
      className={`${
        dropState === "dragging" ? "bg-gray-100 dark:bg-gray-800 z-10" : ""
      } bg-white dark:bg-[#171717]`}>
      <PlaygroundChat />
      
      <div className="flex flex-col items-center">
        <div className="flex-grow">
          <div className="w-full flex justify-center">
            <div className="bottom-0 w-full bg-transparent border-0 fixed pt-2">
              <div className="stretch mx-2 flex flex-row gap-3 md:mx-4 lg:mx-auto lg:max-w-2xl xl:max-w-3xl justify-center items-center">
                <div className="relative h-full flex-1 items-center justify-center md:flex-col">
                  <PlaygroundForm dropedFile={dropedFile} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

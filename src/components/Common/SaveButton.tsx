import { useState } from "react"

type Props = {
  onClick: () => void
  disabled?: boolean
  className?: string
  text?: string
  textOnSave?: string
}

export const SaveButton = ({
  onClick,
  disabled,
  className,
  text = "Save",
  textOnSave = "Saved"
}: Props) => {
  const [clickedSave, setClickedSave] = useState(false)
  return (
    <button
      onClick={() => {
        setClickedSave(true)
        onClick()
        setTimeout(() => {
          setClickedSave(false)
        }, 1000)
      }}
      disabled={disabled}
      className={`bg-pink-500 text-r mt-4 hover:bg-pink-600 text-white px-4 py-2 rounded-md dark:bg-pink-600 dark:hover:bg-pink-700 ${className}`}>
      {clickedSave ? textOnSave : text}
    </button>
  )
}

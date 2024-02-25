import { useState } from "react"
import { CheckIcon } from "lucide-react"
type Props = {
  onClick?: () => void
  disabled?: boolean
  className?: string
  text?: string
  textOnSave?: string
  btnType?: "button" | "submit" | "reset"
}

export const SaveButton = ({
  onClick,
  disabled,
  className,
  text = "Save",
  textOnSave = "Saved",
  btnType = "button"
}: Props) => {
  const [clickedSave, setClickedSave] = useState(false)
  return (
    <button
      type={btnType}
      onClick={() => {
        setClickedSave(true)
        if (onClick) {
          onClick()
        }
        setTimeout(() => {
          setClickedSave(false)
        }, 1000)
      }}
      disabled={disabled}
      className={`inline-flex mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm dark:bg-white dark:text-gray-800 disabled:opacity-50 ${className}`}>
      {clickedSave ? <CheckIcon className="w-4 h-4 mr-2" /> : null}
      {clickedSave ? textOnSave : text}
    </button>
  )
}

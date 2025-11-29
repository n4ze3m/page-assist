import { useState } from "react"
import { CheckIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
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
  text = "save",
  textOnSave = "saved",
  btnType = "button"
}: Props) => {
  const [clickedSave, setClickedSave] = useState(false)
  const { t } = useTranslation("common")
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
      className={`inline-flex mt-4 items-center rounded-md border border-transparent bg-primary px-3 py-2 min-h-[40px] text-sm font-medium leading-4 text-surface shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)] disabled:opacity-50 ${className}`}>
      {clickedSave ? <CheckIcon className="icon mr-2" /> : null}
      {clickedSave ? t(textOnSave) : t(text)}
    </button>
  )
}

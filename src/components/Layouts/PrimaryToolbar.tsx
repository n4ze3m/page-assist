import React from "react"
import { ChevronLeft, ChevronRight, PanelLeftIcon } from "lucide-react"
import { IconButton } from "../Common/IconButton"
import { NavLink } from "react-router-dom"
import { useTranslation } from "react-i18next"

type Props = {
  onToggleSidebar: () => void
  showBack: boolean
  isRTL: boolean
}

export const PrimaryToolbar: React.FC<React.PropsWithChildren<Props>> = ({
  onToggleSidebar,
  showBack,
  isRTL,
  children
}) => {
  const { t } = useTranslation(["option", "common"])

  return (
    <div className="flex flex-1 items-center gap-2 min-w-0">
      {showBack && (
        <NavLink
          to="/"
          aria-label={t("option:header.backToHome", "Back to home")}
          className="rounded-md p-1 text-gray-500 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500 dark:text-gray-400 dark:hover:text-gray-200">
          {isRTL ? (
            <ChevronRight className="h-6 w-6" />
          ) : (
            <ChevronLeft className="h-6 w-6" />
          )}
        </NavLink>
      )}
      <IconButton
        onClick={onToggleSidebar}
        className="rounded-md p-1 text-gray-500 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500 dark:text-gray-400 dark:hover:text-gray-200"
        ariaLabel={t("option:header.openSidebar", "Open chat sidebar") as string}>
        <PanelLeftIcon className="h-5 w-5" />
      </IconButton>
      {children}
    </div>
  )
}

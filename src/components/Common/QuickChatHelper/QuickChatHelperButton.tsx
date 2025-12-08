import React, { Suspense, lazy, useCallback } from "react"
import { Tooltip, Switch } from "antd"
import { MessageCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useStorage } from "@plasmohq/storage/hook"
import { useQuickChatStore } from "@/store/quick-chat"
import { classNames } from "@/libs/class-name"

// Lazy load the modal for bundle optimization
const QuickChatHelperModal = lazy(() =>
  import("./QuickChatHelperModal").then((m) => ({ default: m.QuickChatHelperModal }))
)

export const QuickChatHelperButton: React.FC = () => {
  const { t } = useTranslation("option")
  const [hideQuickChatHelper, setHideQuickChatHelper] = useStorage(
    "hideQuickChatHelper",
    false
  )
  const { isOpen, setIsOpen } = useQuickChatStore()

  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [setIsOpen])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const tooltip = t("quickChatHelper.tooltip", "Quick Chat Helper")
  const toggleLabel = hideQuickChatHelper
    ? t(
        "settings:generalSettings.settings.hideQuickChatHelper.label",
        "Hide Quick Chat Helper button"
      )
    : t(
        "settings:generalSettings.settings.hideQuickChatHelper.label",
        "Hide Quick Chat Helper button"
      )

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3">
        {!hideQuickChatHelper && (
          <Tooltip title={tooltip} placement="left">
            <button
              onClick={handleOpen}
              className={classNames(
                "flex items-center justify-center",
                "w-12 h-12 rounded-full",
                "bg-blue-500 hover:bg-blue-600",
                "text-white shadow-lg",
                "transition-all duration-200",
                "hover:scale-105 active:scale-95",
                "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2",
                "dark:focus:ring-offset-gray-900"
              )}
              aria-label={tooltip}
              aria-haspopup="dialog"
              aria-expanded={isOpen}
              type="button">
              <MessageCircle className="h-6 w-6" />
            </button>
          </Tooltip>
        )}

        <Tooltip title={toggleLabel} placement="left">
          <Switch
            checked={!hideQuickChatHelper}
            onChange={(checked) => setHideQuickChatHelper(!checked ? true : false)}
            aria-label={toggleLabel}
          />
        </Tooltip>
      </div>

      {/* Modal - lazy loaded */}
      <Suspense fallback={null}>
        <QuickChatHelperModal open={isOpen} onClose={handleClose} />
      </Suspense>
    </>
  )
}

export default QuickChatHelperButton

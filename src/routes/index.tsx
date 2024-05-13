import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { useDarkMode } from "~/hooks/useDarkmode"
import { Skeleton } from "antd"
import { OptionRoutingChrome, SidepanelRoutingChrome } from "./chrome"
import { OptionRoutingFirefox, SidepanelRoutingFirefox } from "./firefox"
import { PageAssistLoader } from "@/components/Common/PageAssistLoader"

export const OptionRouting = () => {
  const { mode } = useDarkMode()
  const { i18n } = useTranslation()

  return (
    <div
      className={`${mode === "dark" ? "dark" : "light"} ${
        i18n.language === "ru" ? "onest" : "inter"
      }`}>
      <Suspense fallback={<PageAssistLoader />}>
          {import.meta.env.BROWSER === "chrome" ? (
            <OptionRoutingChrome />
          ) : (
            <OptionRoutingFirefox />
          )}
      </Suspense>
    </div>
  )
}

export const SidepanelRouting = () => {
  const { mode } = useDarkMode()
  const { i18n } = useTranslation()

  return (
    <div
      className={`${mode === "dark" ? "dark" : "light"} ${
        i18n.language === "ru" ? "onest" : "inter"
      }`}>
      <Suspense fallback={<PageAssistLoader />}>
          {import.meta.env.BROWSER === "chrome" ? (
            <SidepanelRoutingChrome />
          ) : (
            <SidepanelRoutingFirefox />
          )}
      </Suspense>
    </div>
  )
}

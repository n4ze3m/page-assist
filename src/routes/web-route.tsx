import { Suspense } from "react"
import { useDarkMode } from "~/hooks/useDarkmode"
import { OptionRoutingChrome } from "./chrome"
import { PageAssistLoader } from "@/components/Common/PageAssistLoader"

export const WebRouting = () => {
  const { mode } = useDarkMode()

  return (
    <div className={`${mode === "dark" ? "dark" : "light"} arimo`}>
      <Suspense fallback={<PageAssistLoader />}>
        <OptionRoutingChrome />
      </Suspense>
    </div>
  )
}

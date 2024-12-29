import { Suspense } from "react"
import { useDarkMode } from "~/hooks/useDarkmode"
import { OptionRoutingFirefox, SidepanelRoutingFirefox } from "./firefox"
import { PageAssistLoader } from "@/components/Common/PageAssistLoader"

export const OptionRouting = () => {
  const { mode } = useDarkMode()

  return (
    <div className={`${mode === "dark" ? "dark" : "light"} arimo`}>
      <Suspense fallback={<PageAssistLoader />}>
        <OptionRoutingFirefox />
      </Suspense>
    </div>
  )
}

export const SidepanelRouting = () => {
  const { mode } = useDarkMode()

  return (
    <div className={`${mode === "dark" ? "dark" : "light"} arimo`}>
      <Suspense fallback={<PageAssistLoader />}>
        <SidepanelRoutingFirefox />
      </Suspense>
    </div>
  )
}

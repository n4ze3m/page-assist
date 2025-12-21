import { Suspense } from "react"
import { OptionRoutingFirefox, SidepanelRoutingFirefox } from "./firefox"
import { PageAssistLoader } from "@/components/Common/PageAssistLoader"

export const OptionRouting = () => {

  return (
    <div className={`arimo`}>
      <Suspense fallback={<PageAssistLoader />}>
        <OptionRoutingFirefox />
      </Suspense>
    </div>
  )
}

export const SidepanelRouting = () => {

  return (
    <div className={`arimo`}>
      <Suspense fallback={<PageAssistLoader />}>
        <SidepanelRoutingFirefox />
      </Suspense>
    </div>
  )
}

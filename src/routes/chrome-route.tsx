import { Suspense } from "react"
import { OptionRoutingChrome, SidepanelRoutingChrome } from "./chrome"
import { PageAssistLoader } from "@/components/Common/PageAssistLoader"

export const OptionRouting = () => {

  return (
    <div className={`arimo`}>
      <Suspense fallback={<PageAssistLoader />}>
        <OptionRoutingChrome />
      </Suspense>
    </div>
  )
}

export const SidepanelRouting = () => {

  return (
    <div className={`arimo`}>
      <Suspense fallback={<PageAssistLoader />}>
        <SidepanelRoutingChrome />
      </Suspense>
    </div>
  )
}

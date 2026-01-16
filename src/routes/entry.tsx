import { Suspense, lazy } from "react"
import { PageAssistLoader } from "@/components/Common/PageAssistLoader"
import { OptionRoutingChrome, SidepanelRoutingChrome } from "./chrome"

// Runtime detection for Firefox
const isFirefox = navigator.userAgent.includes("Firefox")

// Lazy imports for Firefox to reduce chunk size
const OptionRoutingFirefox = lazy(() =>
  import("./firefox").then((module) => ({
    default: module.OptionRoutingFirefox
  }))
)
const SidepanelRoutingFirefox = lazy(() =>
  import("./firefox").then((module) => ({
    default: module.SidepanelRoutingFirefox
  }))
)

export const OptionRouting = () => {
  const RoutingComponent = isFirefox
    ? OptionRoutingFirefox
    : OptionRoutingChrome

  return (
    <div className={`arimo`}>
      <Suspense fallback={<PageAssistLoader />}>
        <RoutingComponent />
      </Suspense>
    </div>
  )
}

export const SidepanelRouting = () => {
  const RoutingComponent = isFirefox
    ? SidepanelRoutingFirefox
    : SidepanelRoutingChrome

  return (
    <div className={`arimo`}>
      <Suspense fallback={<PageAssistLoader />}>
        <RoutingComponent />
      </Suspense>
    </div>
  )
}

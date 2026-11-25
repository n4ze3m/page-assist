import React from "react"

export const DemonRouteIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      fill="currentColor"
      ref={ref}
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M3,1 h2 v4 h-2 z M11,1 h2 v4 h-2 z M4,4 h8 v8 h-8 z M2,6 h2 v4 h-2 z M12,6 h2 v4 h-2 z M7,12 h2 v3 h-2 z M5,6 h2 v2 h-2 z M9,6 h2 v2 h-2 z M6,9 h4 v1 h-4 z"
      />
    </svg>
  )
})

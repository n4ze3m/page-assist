import React from "react"

export const XAIIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      fillRule="evenodd"
      viewBox="0 0 24 24"
      ref={ref}
      {...props}>
      <path d="M6.469 8.776 16.512 23h-4.464L2.005 8.776zm-.004 7.9 2.233 3.164L6.467 23H2zM22 2.582V23h-3.659V7.764zM22 1l-9.952 14.095-2.233-3.163L17.533 1z"></path>
    </svg>
  )
})

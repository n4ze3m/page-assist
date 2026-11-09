import React from "react"

export const UberLLMIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="6.3 6 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}>
      <path d="M9 16h4m0 0 5-5m-5 5 5 5m5-11a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 8a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
      <circle cx="10" cy="16" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  )
})

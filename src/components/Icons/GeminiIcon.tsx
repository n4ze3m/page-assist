import React from "react"

export const GeminiIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      fill="currentColor"
      fillRule="evenodd"
      ref={ref}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <path d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12"></path>
    </svg>
  )
})

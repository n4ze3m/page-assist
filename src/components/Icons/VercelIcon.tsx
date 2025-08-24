import React from "react"

export const VercelIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 76 65"
      {...props}
      ref={ref}>
      <path fill="currentColor" d="m37.527 0 37.528 65H0z"></path>
    </svg>
  )
})

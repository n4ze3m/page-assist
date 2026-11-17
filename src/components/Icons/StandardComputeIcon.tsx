import React from "react"

export const StandardComputeIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      ref={ref}
      {...props}
    >
      <rect x="136" y="46" width="240" height="420" fill="#e2c07f" />
    </svg>
  )
})

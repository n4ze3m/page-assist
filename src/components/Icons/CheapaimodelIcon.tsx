import React from "react"

export const CheapaimodelIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 64 64"
      ref={ref}
      {...props}
    >
      <rect width="64" height="64" rx="14" fill="#121417" />
      <path
        fill="#fb6b12"
        transform="translate(14.4 10) scale(1.4667)"
        d="M0 29L6 27V12Q6 9 3 10Q0 11 0 14ZM9 26L15 24V3Q15 0 12 1Q9 2 9 5ZM18 23L24 21V6Q24 3 21 4Q18 5 18 8Z"
      />
    </svg>
  )
})

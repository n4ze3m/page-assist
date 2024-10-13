import React from "react"

export const TogtherMonoIcon = React.forwardRef<
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
      <g>
        <path
          d="M17.385 11.23a4.615 4.615 0 100-9.23 4.615 4.615 0 000 9.23zm0 10.77a4.615 4.615 0 100-9.23 4.615 4.615 0 000 9.23zm-10.77 0a4.615 4.615 0 100-9.23 4.615 4.615 0 000 9.23z"
          opacity=".2"></path>
        <circle cx="6.615" cy="6.615" r="4.615"></circle>
      </g>
    </svg>
  )
})

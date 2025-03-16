import React from "react"

export const NovitaIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      fill="currentColor"
      fillRule="evenodd"
      ref={ref}
      style={{ flex: "none", lineHeight: 1, ...props.style }}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <path
        clipRule="evenodd"
        d="M9.167 4.17v5.665L0 19.003h9.167v-5.666l5.666 5.666H24L9.167 4.17z"
        fill="#23D57C"
        fillRule="evenodd"
      />
    </svg>
  )
})

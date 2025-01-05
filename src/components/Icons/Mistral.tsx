import React from "react"

export const MistarlIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      {...props}
      fill="currentColor"
      fillRule="evenodd"
      ref={ref}
      style={{ flex: "none", lineHeight: 1, ...props.style }}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="nonzero">
        <path
          d="M15 6v4h-2V6h2zm4-4v4h-2V2h2zM3 2H1h2zM1 2h2v20H1V2zm8 12h2v4H9v-4zm8 0h2v8h-2v-8z"
          fill="#000"
        />
        <path d="M19 2h4v4h-4V2zM3 2h4v4H3V2z" fill="#F7D046" />
        <path d="M15 10V6h8v4h-8zM3 10V6h8v4H3z" fill="#F2A73B" />
        <path d="M3 14v-4h20v4z" fill="#EE792F" />
        <path
          d="M11 14h4v4h-4v-4zm8 0h4v4h-4v-4zM3 14h4v4H3v-4z"
          fill="#EB5829"
        />
        <path d="M19 18h4v4h-4v-4zM3 18h4v4H3v-4z" fill="#EA3326" />
      </g>
    </svg>
  )
})

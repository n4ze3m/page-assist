import React from "react"

export const UnoRouterIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 250 250"
      ref={ref}
      {...props}
    >
      <circle cx="120.46" cy="125" r="105" fill="#1f2022" />
      <polyline
        fill="#ff2a0c"
        points="38.63 92.56 38.09 122.28 120.46 85.88 119.49 56.91"
      />
      <polyline
        fill="#fff"
        points="119.49 157.79 120.46 128.5 71.85 107.36 38.09 122.28"
      />
      <polyline
        fill="#ff2a0c"
        points="202.29 157.44 202.84 127.72 120.46 164.12 121.44 193.09"
      />
      <polyline
        fill="#fff"
        points="121.44 92.21 120.46 121.5 169.08 142.64 202.84 127.72"
      />
      <path
        fill="#fff"
        d="M120.46,20.8c-57.55,0-104.2,46.65-104.2,104.2s46.65,104.2,104.2,104.2,104.2-46.65,104.2-104.2S178.01,20.8,120.46,20.8ZM120.46,225c-55.23,0-100-44.77-100-100S65.24,25,120.46,25s100,44.77,100,100-44.77,100-100,100Z"
      />
    </svg>
  )
})

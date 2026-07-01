import React from "react"

export const ZAiIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 160 160"
      ref={ref}
      {...props}
    >
      <g clipPath="url(#clip0_zai)">
        <path
          fill="#000"
          d="M137.381 0H22.619C10.1269 0 0 10.1269 0 22.619V137.381C0 149.873 10.1269 160 22.619 160H137.381C149.873 160 160 149.873 160 137.381V22.619C160 10.1269 149.873 0 137.381 0Z"
        />
        <path
          fill="#fff"
          d="M82.771 33.208 75.066 44.157c-.605.86-1.408 1.563-2.341 2.049a8.04 8.04 0 0 1-3.02.944H27.71V33.163z"
        />
        <path
          fill="#fff"
          d="M135.083 33.208 68.983 126.837H24.917L91.017 33.208z"
        />
        <path
          fill="#fff"
          d="M77.274 126.837 85.024 115.843c.608-.855 1.412-1.551 2.345-2.029a8.04 8.04 0 0 1 3.017-.719h41.949v13.517z"
        />
      </g>
      <defs>
        <clipPath id="clip0_zai">
          <rect width="160" height="160" fill="#fff" />
        </clipPath>
      </defs>
    </svg>
  )
})

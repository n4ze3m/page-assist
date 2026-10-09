import React from "react"

export const WallyIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="#FF6900"
      viewBox="96 100 320 320"
      ref={ref}
      {...props}>
      <path
        fillRule="evenodd"
        d="M178 118a60 60 0 1 1 0 120a60 60 0 1 1 0-120zm0 22a38 38 0 1 0 0 76a38 38 0 1 0 0-76zM334 118a60 60 0 1 1 0 120a60 60 0 1 1 0-120zm0 22a38 38 0 1 0 0 76a38 38 0 1 0 0-76z"
      />
      <circle cx="178" cy="178" r="20" />
      <circle cx="334" cy="178" r="20" />
      <rect x="234" y="168" width="44" height="18" rx="6" />
      <rect x="245" y="184" width="22" height="70" rx="8" />
      <rect x="208" y="246" width="96" height="26" rx="12" />
      <rect x="140" y="278" width="232" height="76" rx="24" />
      <path d="M117 266l34 15-9 20-34-15a11 11 0 0 1 9-20zM395 266l-34 15 9 20 34-15a11 11 0 0 0-9-20z" />
      <path
        fillRule="evenodd"
        d="M144 364h62a22 22 0 0 1 0 44h-62a22 22 0 0 1 0-44zm1 12a10 10 0 1 0 0 20a10 10 0 1 0 0-20zm30 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12zm30-4a10 10 0 1 0 0 20a10 10 0 1 0 0-20zM306 364h62a22 22 0 0 1 0 44h-62a22 22 0 0 1 0-44zm1 12a10 10 0 1 0 0 20a10 10 0 1 0 0-20zm30 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12zm30-4a10 10 0 1 0 0 20a10 10 0 1 0 0-20z"
      />
    </svg>
  )
})

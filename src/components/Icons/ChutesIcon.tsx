import React from "react"

export const ChutesIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className="size-6"
      viewBox="0 0 62 41"
      ref={ref}
      {...props}>
      <path
        fill="currentColor"
        d="M38.01 39.694c-.884 1.442-2.758 1.712-3.966.57l-5.37-5.074c-1.208-1.141-1.19-3.163.04-4.278l5.412-4.914c6.017-5.463 13.943-7.592 21.487-5.773l4.072.983c.146.035.28.109.392.214.59.557.26 1.597-.525 1.656l-.087.006c-7.45.557-14.284 4.907-18.49 11.77z"></path>
      <path
        fill="url(#paint0_linear_10244_130)"
        d="M15.296 36.591c-1.123 1.246-3.02 1.131-4.005-.242L.547 21.371c-.98-1.366-.602-3.344.8-4.189L22.772 4.275C29.603.158 37.73-.277 44.809 3.093l15.54 7.403c.24.114.45.291.61.515.856 1.192-.06 2.895-1.453 2.704l-9.258-1.268c-7.393-1.013-14.834 1.838-20.131 7.712z"></path>
      <defs>
        <linearGradient
          id="paint0_linear_10244_130"
          x1="33.853"
          x2="25.55"
          y1="0.174"
          y2="41.449"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor"></stop>
          <stop offset="1" stopColor="currentColor"></stop>
        </linearGradient>
      </defs>
    </svg>
  )
})

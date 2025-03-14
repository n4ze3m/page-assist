import React from "react"

export const InfinigenceAI = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 25"
      fill="none"
      ref={ref}
      {...props}>
      <rect y="0.987091" width="24" height="24" rx="4" fill="white"/>
      <path d="M13.754 18.5639V7.48907H7.25702V10.4151H10.246V18.5639H7.25702V21.4742H16.743V18.5639H13.754Z" fill="#7F1084"/>
      <path d="M16.743 4.5H13.754V7.48895H16.743V4.5Z" fill="#2EA7E0"/>
    </svg>
  )
})
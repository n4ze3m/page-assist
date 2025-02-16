import React from "react"

export const SiliconFlowIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      fill="currentColor"
      fillRule="evenodd"
      ref={ref}
      style={{ flex: "none", lineHeight: 1 }}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <path fillRule="evenodd" d="M100.74 12h-7.506c-24.021 0-37.867 15.347-37.867 38.867V54.9a30.862 30.862 0 0 0-8.507-1.196C29.816 53.703 16 67.52 16 84.563c0 17.044 13.816 30.86 30.86 30.86 17.044 0 30.86-13.816 30.86-30.86 0-2.073-.209-4.14-.623-6.172h23.643c6.225-.023 11.26-5.076 11.26-11.301 0-6.226-5.035-11.279-11.26-11.302H77.22v-5.922c0-9.008 6.505-15.513 16.014-15.513h7.506c6.107-.093 11.01-5.069 11.01-11.177 0-6.107-4.903-11.084-11.01-11.176zM56.035 84.563a9.175 9.175 0 1 0-18.35 0 9.175 9.175 0 0 0 18.35 0z" />
    </svg>
  )
})

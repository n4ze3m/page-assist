import React from "react"

export const AliBaBaCloudIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" 
      className="icon" 
      viewBox="0 0 1024 1024" 
      fill="currentColor"
      fillRule="evenodd"
      ref={ref}
      style={{ flex: "none", lineHeight: 1 }}
      {...props}>
      <path d="M207.872 234.496h200.192l-39.936 63.488-143.36 43.52c-23.04 7.168-44.032 19.456-43.52 43.52l1.024 250.88c0 24.064 20.48 37.888 43.52 43.52l136.704 35.328 47.104 74.752H207.872c-79.36 0-143.872-62.976-143.872-139.776V374.272c0-76.8 65.024-139.776 143.872-139.776zM816.128 234.496h-200.192l39.936 63.488 143.36 43.52c23.04 7.168 44.032 19.456 43.52 43.52l-1.024 250.88c0 24.064-20.48 37.888-43.52 43.52l-136.704 35.328-47.104 74.752h201.728c79.36 0 143.872-62.976 143.872-139.776V374.272c0-76.8-65.024-139.776-143.872-139.776z" p-id="7083"></path><path d="M365.056 477.696h300.032v66.048H365.056z" p-id="7084"></path>
    </svg>
  )
})

import React from "react"

import atlasCloudLogo from "../../assets/providers/atlas-cloud.png"

export const AtlasCloudIcon = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ alt = "Atlas Cloud", className, style, ...props }, ref: React.ForwardedRef<HTMLImageElement>) => {
  return (
    <img
      ref={ref}
      src={atlasCloudLogo}
      alt={alt}
      className={className}
      style={{ objectFit: "contain", ...style }}
      {...props}
    />
  )
})

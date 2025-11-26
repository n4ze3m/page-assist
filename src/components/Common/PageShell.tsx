import React from "react"
import { classNames } from "@/libs/class-name"

type PageShellProps = {
  children: React.ReactNode
  maxWidthClassName?: string
  className?: string
}

export const PageShell: React.FC<PageShellProps> = ({
  children,
  maxWidthClassName = "max-w-5xl",
  className
}) => {
  return (
    <div
      className={classNames(
        "w-full mx-auto px-4 sm:px-6 lg:px-8",
        maxWidthClassName,
        className || ""
      )}>
      {children}
    </div>
  )
}


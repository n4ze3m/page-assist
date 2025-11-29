import React from "react"

type IconButtonProps = {
  ariaLabel: string
  hasPopup?: boolean | "menu" | "listbox" | "tree" | "grid" | "dialog"
  ariaExpanded?: boolean
  ariaControls?: string
  children: React.ReactNode
  className?: string
  title?: string
  disabled?: boolean
  type?: "button" | "submit" | "reset"
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      ariaLabel,
      hasPopup,
      ariaExpanded,
      ariaControls,
      children,
      className,
      title,
      disabled,
      type = "button",
      onClick
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center rounded-md min-w-[44px] min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
    return (
      <button
        ref={ref}
        type={type}
        className={[baseClasses, className].filter(Boolean).join(" ")}
        aria-label={ariaLabel}
        aria-haspopup={hasPopup as any}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        title={title}
        disabled={disabled}
        onClick={onClick}>
        {children}
      </button>
    )
  }
)

IconButton.displayName = "IconButton"

export default IconButton

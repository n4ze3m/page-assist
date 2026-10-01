import React from "react"
import { Dropdown, Checkbox } from "antd"

export type SubmitDropdownItem = {
  key: React.Key
  label: React.ReactNode
}

export type SubmitDropdownProps = {
  htmlType?: "button" | "submit" | "reset"
  disabled?: boolean
  icon?: React.ReactNode
  items: SubmitDropdownItem[]
  children: React.ReactNode
  className?: string
}

export const SubmitDropdown: React.FC<SubmitDropdownProps> = ({
  htmlType = "submit",
  disabled,
  icon,
  items,
  children,
  className
}) => {
  return (
    <Dropdown.Button
      htmlType={htmlType}
      disabled={disabled}
      className={className ?? "!justify-end !w-auto"}
      icon={icon}
      menu={{ items }}>
      {children}
    </Dropdown.Button>
  )
}

import { Link } from "react-router-dom"
import { BetaTag } from "../Common/Beta"

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}

export const LinkComponent = (item: {
  href: string
  name: string | JSX.Element
  icon: any
  current: string
  beta?: boolean
}) => {
  return (
    <li className="inline-flex items-center">
      <Link
        to={item.href}
        className={classNames(
          item.current === item.href
            ? "bg-gray-100 text-gray-600 dark:bg-[#262626] dark:text-white"
            : "text-gray-700 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:text-white dark:hover:bg-[#262626]",
          "group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm font-semibold"
        )}>
        <item.icon
          className={classNames(
            item.current === item.href
              ? "text-gray-600 dark:text-white"
              : "text-gray-500 group-hover:text-gray-600 dark:text-gray-200 dark:group-hover:text-white",
            "h-6 w-6 shrink-0"
          )}
          aria-hidden="true"
        />
        {item.name}
      </Link>
      {item.beta && <BetaTag />}
    </li>
  )
}

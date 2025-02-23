import {
  BookIcon,
  BrainCircuitIcon,
  OrbitIcon,
  ShareIcon,
  BlocksIcon,
  InfoIcon,
  CombineIcon,
  ChromeIcon,
  CpuIcon
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router-dom"
import { OllamaIcon } from "../Icons/Ollama"
import { BetaTag } from "../Common/Beta"

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}

const LinkComponent = (item: {
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

export const SettingsLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const { t } = useTranslation(["settings", "common", "openai"])
  return (
    <div className="flex min-h-screen  w-full flex-col">
      <main className="relative w-full flex-1">
        <div className="mx-auto w-full h-full custom-scrollbar overflow-y-auto">
          <div className="flex flex-col lg:flex-row lg:gap-x-16 lg:px-24">
            <aside className="sticky lg:mt-0 mt-14 top-0  bg-white dark:bg-[#171717] border-b dark:border-gray-600 lg:border-0 lg:bg-transparent lg:dark:bg-transparent">
              <nav className="w-full overflow-x-auto px-4 py-4 sm:px-6 lg:px-0 lg:py-0 lg:mt-20">
                <ul
                  role="list"
                  className="flex flex-row lg:flex-col gap-x-3 gap-y-1 min-w-max lg:min-w-0">
                  <LinkComponent
                    href="/settings"
                    name={t("generalSettings.title")}
                    icon={OrbitIcon}
                    current={location.pathname}
                  />
                  <LinkComponent
                    href="/settings/rag"
                    name={t("rag.title")}
                    icon={CombineIcon}
                    current={location.pathname}
                  />
                  <LinkComponent
                    href="/settings/ollama"
                    name={t("ollamaSettings.title")}
                    icon={OllamaIcon}
                    current={location.pathname}
                  />
                  {import.meta.env.BROWSER === "chrome" && (
                    <LinkComponent
                      href="/settings/chrome"
                      name={t("chromeAiSettings.title")}
                      icon={ChromeIcon}
                      current={location.pathname}
                      beta
                    />
                  )}
                  <LinkComponent
                    href="/settings/openai"
                    name={t("openai:settings")}
                    icon={CpuIcon}
                    current={location.pathname}
                    beta
                  />
                  <LinkComponent
                    href="/settings/model"
                    name={t("manageModels.title")}
                    current={location.pathname}
                    icon={BrainCircuitIcon}
                  />
                  <LinkComponent
                    href="/settings/knowledge"
                    name={
                      <div className="inline-flex items-center gap-2">
                        {t("manageKnowledge.title")}
                      </div>
                    }
                    icon={BlocksIcon}
                    current={location.pathname}
                  />
                  <LinkComponent
                    href="/settings/prompt"
                    name={t("managePrompts.title")}
                    icon={BookIcon}
                    current={location.pathname}
                  />
                  <LinkComponent
                    href="/settings/share"
                    name={t("manageShare.title")}
                    icon={ShareIcon}
                    current={location.pathname}
                  />
                  <LinkComponent
                    href="/settings/about"
                    name={t("about.title")}
                    icon={InfoIcon}
                    current={location.pathname}
                  />
                </ul>
              </nav>
            </aside>
            <main className="flex-1 px-4 py-8 sm:px-6 lg:px-0 lg:py-20">
              <div className="mx-auto max-w-4xl space-y-8 sm:space-y-10">
                {children}
              </div>
            </main>
          </div>
        </div>
      </main>
    </div>
  )
}

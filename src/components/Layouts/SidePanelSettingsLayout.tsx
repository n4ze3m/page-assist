import {
  BrainCircuitIcon,
  OrbitIcon,
  CpuIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLocation, Link } from "react-router-dom"
import { LinkComponent } from "./LinkComponent"
import logoImage from "~/assets/icon.png"

export const SidePanelSettingsLayout = ({
  children
}: {
  children: React.ReactNode
}) => {
  const location = useLocation()
  const { t, i18n } = useTranslation(["settings", "common", "openai"])
  const isRTL = i18n?.dir() === "rtl"

  return (
    <div className="flex w-full flex-col min-h-screen bg-neutral-50 dark:bg-[#1a1a1a]">
      {/* Mobile-optimized Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              aria-label={t("common:goBack")}>
              {isRTL ? (
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </Link>
            <div className="flex items-center gap-2">
              <img
                className="h-7 w-7 rounded-lg"
                src={logoImage}
                alt={t("common:pageAssist")}
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("common:pageAssist")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative w-full flex-1">
        <div className="mx-auto w-full h-full custom-scrollbar overflow-y-auto">
          <div className="flex flex-col lg:flex-row lg:gap-x-16 lg:px-24">
            <aside className="sticky lg:mt-0 top-0 bg-white dark:bg-[#1a1a1a] border-b dark:border-gray-600 lg:border-0 lg:bg-transparent lg:dark:bg-transparent">
              <nav className="w-full overflow-x-auto px-4 py-4 sm:px-6 lg:px-0 lg:py-0 lg:mt-8">
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
                    href="/settings/openai"
                    name={t("openai:settings")}
                    icon={CpuIcon}
                    current={location.pathname}
                  />
                  <LinkComponent
                    href="/settings/model"
                    name={t("manageModels.title")}
                    current={location.pathname}
                    icon={BrainCircuitIcon}
                  />
                </ul>
              </nav>
            </aside>
            <main className="flex-1 px-4 py-6 lg:px-0 lg:py-12">
              <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </main>
    </div>
  )
}

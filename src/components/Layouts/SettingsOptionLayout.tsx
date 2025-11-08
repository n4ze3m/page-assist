import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { BetaTag } from "../Common/Beta"
import { XIcon } from "lucide-react"
import { Storage } from "@plasmohq/storage"
import { browser } from "wxt/browser"
import { SETTINGS_NAV_GROUPS, type SettingsNavItem } from "./settings-nav"

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}

const shouldHideForBrowser = (item: SettingsNavItem) =>
  // Hide Chrome-specific settings on non-Chrome targets
  import.meta.env.BROWSER !== "chrome" && item.to === "/settings/chrome"

export const SettingsLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation(["settings", "common", "openai"])
  const sidepanelSupported =
    // @ts-ignore
    (typeof chrome !== 'undefined' && (chrome as any).sidePanel) || ((browser as any)?.sidebarAction && (browser as any).sidebarAction.open)
  return (
    <div className="flex min-h-screen  w-full flex-col">
      <main className="relative w-full flex-1">
        <div className="mx-auto w-full h-full custom-scrollbar overflow-y-auto">
          <div className="flex flex-col lg:flex-row lg:gap-x-16 lg:px-24">
            <aside className="sticky lg:mt-0 mt-14 top-0 z-20 bg-white dark:bg-[#171717] border-b dark:border-gray-600 lg:border-0 lg:bg-transparent lg:dark:bg-transparent">
              <nav className="w-full overflow-x-auto px-4 py-4 sm:px-6 lg:px-0 lg:py-0 lg:mt-20">
                <div className="flex items-center justify-between mb-3">
                  <button
                    className="text-xs border rounded px-2 py-1 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!sidepanelSupported}
                    onClick={async () => {
                      const storage = new Storage({ area: 'local' })
                      await storage.set('uiMode', 'sidePanel')
                      await storage.set('actionIconClick', 'sidePanel')
                      await storage.set('contextMenuClick', 'sidePanel')
                      try {
                        // Chromium sidePanel API
                        // @ts-ignore
                        if (chrome?.sidePanel) {
                          const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
                          if (tabs?.[0]?.id) await chrome.sidePanel.open({ tabId: tabs[0].id })
                        } else if ((browser as any)?.sidebarAction?.open) {
                          // Firefox
                          await (browser as any).sidebarAction.open()
                        }
                      } catch {}
                    }}
                    title={t('settings:switchToSidebar', 'Switch to Sidebar')}>
                    {t('settings:switchToSidebar', 'Switch to Sidebar')}
                  </button>
                </div>
                <div className="flex flex-col gap-6">
                  {SETTINGS_NAV_GROUPS.map((group) => {
                    const items = group.items.filter((item) => !shouldHideForBrowser(item))
                    if (items.length === 0) {
                      return null
                    }
                    return (
                      <div key={group.key} className="min-w-max lg:min-w-0">
                        <div className="mb-2 flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {t(group.titleToken)}
                          </span>
                        </div>
                        <ul role="list" className="flex flex-row flex-wrap gap-2 lg:flex-col">
                          {items.map((item) => (
                            <li key={item.to} className="inline-flex items-center">
                              <Link
                                to={item.to}
                                className={classNames(
                                  location.pathname === item.to
                                    ? "bg-gray-100 text-gray-700 dark:bg-[#262626] dark:text-white"
                                    : "text-gray-700 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:text-white dark:hover:bg-[#262626]",
                                  "group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm font-semibold"
                                )}
                                aria-current={location.pathname === item.to ? "page" : undefined}>
                                <item.icon
                                  className={classNames(
                                    location.pathname === item.to
                                      ? "text-gray-600 dark:text-white"
                                      : "text-gray-500 group-hover:text-gray-600 dark:text-gray-200 dark:group-hover:text-white",
                                    "h-6 w-6 shrink-0"
                                  )}
                                />
                                <span className="truncate">{t(item.labelToken)}</span>
                              </Link>
                              {item.beta && <BetaTag />}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </nav>
            </aside>
            <main className="relative flex-1 px-4 py-8 sm:px-6 lg:px-0 lg:py-20">
              {/* Close button over right of content area */}
              <div className="absolute right-4 top-4 lg:right-0 lg:top-6 lg:translate-x-[-1rem]">
                <button
                  className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626]"
                  title={t('common:close', 'Close')}
                  onClick={(e) => {
                    e.preventDefault()
                    try {
                      navigate(-1)
                    } catch {
                      navigate('/')
                    }
                  }}
                >
                  <XIcon className="h-4 w-4" />
                  <span>{t('common:close', 'Close')}</span>
                </button>
              </div>
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

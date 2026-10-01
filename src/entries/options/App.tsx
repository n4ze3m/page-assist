import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { useEffect } from "react"
const queryClient = new QueryClient()
import { ConfigProvider, Empty, theme } from "antd"
import { StyleProvider } from "@ant-design/cssinjs"
import { useDarkMode } from "@/hooks/useDarkmode"
import { OptionRouting } from "@/routes/entry"
import "@/i18n"
import { useTranslation } from "react-i18next"
import { PageAssistProvider } from "@/components/Common/PageAssistProvider"
import { FontSizeProvider } from "@/context/FontSizeProvider"
import { runAllMigrations } from "@/db/dexie/migration"
import { useUiDirection } from "~/hooks/useUiDirection"

function IndexOption() {
  const { mode } = useDarkMode()
  const { t, i18n } = useTranslation()
  const { direction } = useUiDirection()

  useEffect(() => {
    if (i18n.resolvedLanguage) {
      document.documentElement.lang = i18n.resolvedLanguage
    }
    document.documentElement.dir = direction
  }, [i18n, i18n.resolvedLanguage, direction])

  return (
    <MemoryRouter
      initialEntries={[window.location.hash.replace("#", "") || "/"]}>
      <ConfigProvider
        theme={{
          algorithm:
            mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            fontFamily: "Arimo"
          }
        }}
        renderEmpty={() => (
          <Empty
            imageStyle={{
              height: 60
            }}
            description={t("common:noData")}
          />
        )}
        direction={direction}>
        <StyleProvider hashPriority="high">
          <QueryClientProvider client={queryClient}>
            <PageAssistProvider>
              <FontSizeProvider>
                <OptionRouting />
              </FontSizeProvider>
            </PageAssistProvider>
          </QueryClientProvider>
        </StyleProvider>
      </ConfigProvider>
    </MemoryRouter>
  )
}

export default IndexOption

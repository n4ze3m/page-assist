import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { useEffect, useState } from "react"
const queryClient = new QueryClient()
import { ConfigProvider, Empty, theme } from "antd"
import { StyleProvider } from "@ant-design/cssinjs"
import { useDarkMode } from "~/hooks/useDarkmode"
import { OptionRouting } from "@/routes/firefox-route"
import "~/i18n"
import { useTranslation } from "react-i18next"
import { PageAssistProvider } from "@/components/Common/PageAssistProvider"

function IndexOption() {
  const { mode } = useDarkMode()
  const { t, i18n } = useTranslation()
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr")

  useEffect(() => {
    if (i18n.resolvedLanguage) {
      document.documentElement.lang = i18n.resolvedLanguage
      document.documentElement.dir = i18n.dir(i18n.resolvedLanguage)
      setDirection(i18n.dir(i18n.resolvedLanguage))
    }
  }, [i18n, i18n.resolvedLanguage])

  return (
    <MemoryRouter>
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
              <OptionRouting />
            </PageAssistProvider>
          </QueryClientProvider>
        </StyleProvider>
      </ConfigProvider>
    </MemoryRouter>
  )
}

export default IndexOption

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { useEffect } from "react"
import { SidepanelRouting } from "@/routes/firefox-route"
const queryClient = new QueryClient()
import { ConfigProvider, Empty, theme } from "antd"
import { StyleProvider } from "@ant-design/cssinjs"
import { useDarkMode } from "~/hooks/useDarkmode"
import "~/i18n"
import { useTranslation } from "react-i18next"
import { PageAssistProvider } from "@/components/Common/PageAssistProvider"

function IndexSidepanel() {
  const { mode } = useDarkMode()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    if (i18n.resolvedLanguage) {
      document.documentElement.lang = i18n.resolvedLanguage;
      document.documentElement.dir = i18n.dir(i18n.resolvedLanguage);
    }
  }, [i18n, i18n.resolvedLanguage]);

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
        )}>
        <StyleProvider hashPriority="high">
          <QueryClientProvider client={queryClient}>
            <PageAssistProvider>
              <SidepanelRouting />
            </PageAssistProvider>
          </QueryClientProvider>
        </StyleProvider>
      </ConfigProvider>
    </MemoryRouter>
  )
}

export default IndexSidepanel

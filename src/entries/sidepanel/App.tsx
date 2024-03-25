import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { SidepanelRouting } from "~/routes"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
const queryClient = new QueryClient()
import { ConfigProvider, Empty, theme } from "antd"
import { StyleProvider } from "@ant-design/cssinjs"
import { useDarkMode } from "~/hooks/useDarkmode"
import "~/i18n"
import { useTranslation } from "react-i18next"

function IndexSidepanel() {
  const { mode } = useDarkMode()
  const { t } = useTranslation()

  return (
    <MemoryRouter>
      <ConfigProvider
        theme={{
          algorithm:
            mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm
        }}
        renderEmpty={() => (
          <Empty
            imageStyle={{
              height: 60
            }}
            description={t("common:noData")}
          />
        )}
        >
        <StyleProvider hashPriority="high">
          <QueryClientProvider client={queryClient}>
            <SidepanelRouting />
            <ToastContainer />
          </QueryClientProvider>
        </StyleProvider>
      </ConfigProvider>
    </MemoryRouter>
  )
}

export default IndexSidepanel

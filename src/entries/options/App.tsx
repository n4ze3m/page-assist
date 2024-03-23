import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
const queryClient = new QueryClient()
import { ConfigProvider, theme } from "antd"
import { StyleProvider } from "@ant-design/cssinjs"
import { useDarkMode } from "~/hooks/useDarkmode"
import { OptionRouting } from "~/routes"
function IndexOption() {
  const { mode } = useDarkMode()
  return (
    <MemoryRouter>
      <ConfigProvider
        theme={{
          algorithm:
            mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm
        }}>
        <StyleProvider hashPriority="high">
          <QueryClientProvider client={queryClient}>
            <OptionRouting />
            <ToastContainer />
          </QueryClientProvider>
        </StyleProvider>
      </ConfigProvider>
    </MemoryRouter>
  )
}

export default IndexOption

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { useEffect, useState } from "react"
const queryClient = new QueryClient()
import { ConfigProvider, Empty, theme as antdTheme } from "antd"
import { StyleProvider } from "@ant-design/cssinjs"
import { useDarkMode } from "~/hooks/useDarkmode"
import { OptionRouting } from "@/routes/firefox-route"
import "~/i18n"
import { useTranslation } from "react-i18next"
import { PageAssistProvider } from "@/components/Common/PageAssistProvider"
import { FontSizeProvider } from "@/context/FontSizeProvider"
import { themes } from "@/assets/colors"
import { useTheme } from "@/hooks/useTheme"
import React from "react"

function IndexOption() {
  const { mode } = useDarkMode()
  const { t, i18n } = useTranslation()
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr")
  const { themeName } = useTheme()

  useEffect(() => {
    if (i18n.resolvedLanguage) {
      document.documentElement.lang = i18n.resolvedLanguage
      document.documentElement.dir = i18n.dir(i18n.resolvedLanguage)
      setDirection(i18n.dir(i18n.resolvedLanguage))
    }
  }, [i18n, i18n.resolvedLanguage])

  const theme = React.useMemo(() => {
    if (!themes[themeName]) {
      return themes['default'];
    }
    return themes[themeName];
  }, [themeName]);

  return (
    <MemoryRouter>
      <ConfigProvider
        theme={{
          algorithm:
            mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            fontFamily: "Arimo",
            colorPrimary: theme.primary[500],
            colorBgContainer: mode == "dark" ? theme.surface[900] : theme.surface[50]
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

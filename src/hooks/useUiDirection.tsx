import { useTranslation } from "react-i18next"
import { useStorage } from "@plasmohq/storage/hook"

export const useUiDirection = () => {
  const { i18n } = useTranslation()
  const [forceRTL] = useStorage("forceRTL", false)

  const localeDirection: "ltr" | "rtl" = i18n.resolvedLanguage
    ? i18n.dir(i18n.resolvedLanguage)
    : "ltr"

  const direction: "ltr" | "rtl" = forceRTL ? "rtl" : localeDirection

  return { direction, isRTL: direction === "rtl" }
}

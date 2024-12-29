import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import logoImage from "~/assets/icon.png"

export const SidepanelSettingsHeader = () => {
  const { t , i18n} = useTranslation("common")
  const isRTL = i18n?.dir() === "rtl"
 
  return (
    <div className="flex px-3 justify-start gap-3 bg-white dark:bg-[#171717] border-b border-gray-300 dark:border-gray-700  py-4 items-center">
      <Link to="/">
      {
        isRTL ? (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        )
      }
      </Link>
      <div className="focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700 flex items-center dark:text-white">
        <img className="h-6 w-auto" src={logoImage} alt={t("pageAssist")} />
        <span className="ml-1 text-sm ">{t("pageAssist")}</span>
      </div>
    </div>
  )
}

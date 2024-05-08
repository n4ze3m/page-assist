import { Tag } from "antd"
import { useTranslation } from "react-i18next"

export const BetaTag = () => {
  const { t } = useTranslation("common")

  return <Tag color="yellow">{t("beta")}</Tag>
}

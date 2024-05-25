import { Tag } from "antd"
import { useTranslation } from "react-i18next"

export const BetaTag = ({className} : {className?: string}) => {
  const { t } = useTranslation("common")

  return <Tag className={className} color="yellow">{t("beta")}</Tag>
}

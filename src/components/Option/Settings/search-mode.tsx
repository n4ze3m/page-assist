import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Skeleton, Switch } from "antd"
import { useTranslation } from "react-i18next"
import {
  getIsSimpleInternetSearch,
  setIsSimpleInternetSearch
} from "~/services/ollama"

export const SearchModeSettings = () => {
  const { t } = useTranslation("option")
  
  const { data, status } = useQuery({
    queryKey: ["fetchIsSimpleInternetSearch"],
    queryFn: () => getIsSimpleInternetSearch()
  })

  const queryClient = useQueryClient()

  if (status === "pending" || status === "error") {
    return <Skeleton active />
  }

  return (
    <div className="flex flex-row justify-between">
      <span className="text-gray-500 dark:text-neutral-50 ">
        {t("generalSettings.settings.searchMode.label")}
      </span>

      <Switch
        checked={data}
        onChange={(checked) => {
          setIsSimpleInternetSearch(checked)
          queryClient.invalidateQueries({
            queryKey: ["fetchIsSimpleInternetSearch"]
          })
        }}
      />
    </div>
  )
}

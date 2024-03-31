import { SaveButton } from "@/components/Common/SaveButton"
import { getSearchSettings, setSearchSettings } from "@/services/search"
import { SUPPORTED_SERACH_PROVIDERS } from "@/utils/search-provider"
import { useForm } from "@mantine/form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Select, Skeleton, Switch, InputNumber } from "antd"
import { useTranslation } from "react-i18next"

export const SearchModeSettings = () => {
  const { t } = useTranslation("settings")
  const queryClient = useQueryClient()

  const form = useForm({
    initialValues: {
      isSimpleInternetSearch: false,
      searchProvider: "",
      totalSearchResults: 0
    }
  })

  const { status } = useQuery({
    queryKey: ["fetchSearchSettings"],
    queryFn: async () => {
      const data = await getSearchSettings()
      form.setValues(data)
      return data
    }
  })

  if (status === "pending" || status === "error") {
    return <Skeleton active />
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          {t("generalSettings.webSearch.heading")}
        </h2>
        <div className="border border-b border-gray-200 dark:border-gray-600 mt-3"></div>
      </div>
      <form
        onSubmit={form.onSubmit(async (values) => {
          await setSearchSettings(values)
        })}
        className="space-y-4">
        <div className="flex flex-row justify-between">
          <span className="text-gray-500 dark:text-neutral-50 ">
            {t("generalSettings.webSearch.provider.label")}
          </span>
          <Select
            placeholder={t("generalSettings.webSearch.provider.placeholder")}
            showSearch
            style={{ width: "200px" }}
            options={SUPPORTED_SERACH_PROVIDERS}
            filterOption={(input, option) =>
              option!.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 ||
              option!.value.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            {...form.getInputProps("searchProvider")}
          />
        </div>
        <div className="flex flex-row justify-between">
          <span className="text-gray-500 dark:text-neutral-50 ">
            {t("generalSettings.webSearch.searchMode.label")}
          </span>
          <Switch
            {...form.getInputProps("isSimpleInternetSearch", {
              type: "checkbox"
            })}
          />
        </div>
        <div className="flex flex-row justify-between">
          <span className="text-gray-500 dark:text-neutral-50 ">
            {t("generalSettings.webSearch.totalSearchResults.label")}
          </span>
          <InputNumber
            placeholder={t(
              "generalSettings.webSearch.totalSearchResults.placeholder"
            )}
            {...form.getInputProps("totalSearchResults")}
            style={{ width: "200px" }}
          />
        </div>

        <div className="flex justify-end">
          <SaveButton btnType="submit" />
        </div>
      </form>
    </div>
  )
}

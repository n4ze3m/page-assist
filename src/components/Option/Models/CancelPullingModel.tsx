import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

type Props = {
  modelName: string
  cancelDownloadModel: () => void
}

export const CancelPullingModel = ({
  modelName,
  cancelDownloadModel
}: Props) => {
  const { t } = useTranslation("common")
  return (
    <div className="mb-4 p-3  bg-neutral-50  dark:bg-[#2a2a2a] border border-neutral-200 dark:border-neutral-700 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-gray-700 dark:text-gray-300" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {`${t("downloading")} ${modelName}...`}
          </span>
        </div>
        <button
          className="bg-red-600 text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          onClick={() => {
            if (confirm(t("cancelPullingModel.confirm"))) {
              cancelDownloadModel()
            }
          }}>
          {t("common:cancel")}
        </button>
      </div>
    </div>
  )
}

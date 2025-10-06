import { Skeleton } from "antd"

type SettingsSkeletonProps = {
  sections?: number
}

export const SettingsSkeleton = ({ sections = 2 }: SettingsSkeletonProps) => {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      {Array.from({ length: sections }).map((_, index) => (
        <Skeleton
          key={index}
          active
          title
          paragraph={{ rows: 3, width: ["80%", "95%", "90%"] }}
          className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
        />
      ))}
    </div>
  )
}

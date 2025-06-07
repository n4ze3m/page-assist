import { useTranslation } from "react-i18next"

type Props = {
  action: string
}


export const ActionInfo = ({action}: Props) => {
  const {t} = useTranslation('common')
  return (
      <div className="shimmer-text text-[16px]">
        {t(action)}
      </div>
  )
}

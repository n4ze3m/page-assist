type Props = {
  className: string
}

export const XMarkIcon: React.FC<Props> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      className={className}
      viewBox="0 0 24 24">
      <path d="M18 6L6 18M6 6l12 12"></path>
    </svg>
  )
}

type Props = {
  className: string
}

export const ChevronLeft: React.FC<Props> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      className={className}>
      <path d="M15 18l-6-6 6-6"></path>
    </svg>
  )
}

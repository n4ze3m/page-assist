type Props = {
  className: string
}

export const Moon: React.FC<Props> = ({ className }) => {
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
      <path d="M12 3a6 6 0 009 9 9 9 0 11-9-9z"></path>
    </svg>
  )
}

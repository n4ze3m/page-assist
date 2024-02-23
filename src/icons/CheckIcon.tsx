type Props = {
  className: string
}

export const CheckIcon: React.FC<Props> = ({ className }) => {
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
      <path d="M20 6L9 17l-5-5"></path>
    </svg>
  )
}

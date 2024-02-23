type Props = {
  className: string
}

export const MicIcon: React.FC<Props> = ({ className }) => {
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
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"></path>
      <path d="M19 10v2a7 7 0 01-14 0v-2"></path>
      <path d="M12 19L12 22"></path>
    </svg>
  )
}

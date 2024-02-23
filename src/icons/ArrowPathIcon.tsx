type Props = {
  className: string
}

export const ArrowPathIcon: React.FC<Props> = ({ className }) => {
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
      <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"></path>
      <path d="M21 3v5h-5M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"></path>
      <path d="M8 16H3v5"></path>
    </svg>
  )
}

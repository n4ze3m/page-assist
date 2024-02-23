type Props = {
    className: string
}

export const StopCircleIcon: React.FC<Props> = ({ className }) => {
    return     <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    className={className}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9 9H15V15H9z"></path>
  </svg>
}
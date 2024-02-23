type Props = {
  className: string
}

export const BrainCircuit: React.FC<Props> = ({ className }) => {
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
      <path d="M12 4.5a2.5 2.5 0 00-4.96-.46 2.5 2.5 0 00-1.98 3 2.5 2.5 0 00-1.32 4.24 3 3 0 00.34 5.58 2.5 2.5 0 002.96 3.08 2.5 2.5 0 004.91.05L12 20V4.5zM16 8V5c0-1.1.9-2 2-2M12 13h4"></path>
      <path d="M12 18h6a2 2 0 012 2v1M12 8h8M20.5 8a.5.5 0 11-1 0 .5.5 0 011 0zM16.5 13a.5.5 0 11-1 0 .5.5 0 011 0z"></path>
      <path d="M20.5 21a.5.5 0 11-1 0 .5.5 0 011 0zM18.5 3a.5.5 0 11-1 0 .5.5 0 011 0z"></path>
    </svg>
  )
}

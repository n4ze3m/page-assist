type Props = {
  className: string
}

export const BoxesIcon: React.FC<Props> = ({ className }) => {
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
      <path d="M2.97 12.92A2 2 0 002 14.63v3.24a2 2 0 00.97 1.71l3 1.8a2 2 0 002.06 0L12 19v-5.5l-5-3-4.03 2.42zM7 16.5l-4.74-2.85M7 16.5l5-3M7 16.5v5.17M12 13.5V19l3.97 2.38a2 2 0 002.06 0l3-1.8a2 2 0 00.97-1.71v-3.24a2 2 0 00-.97-1.71L17 10.5l-5 3zM17 16.5l-5-3M17 16.5l4.74-2.85M17 16.5v5.17"></path>
      <path d="M7.97 4.42A2 2 0 007 6.13v4.37l5 3 5-3V6.13a2 2 0 00-.97-1.71l-3-1.8a2 2 0 00-2.06 0l-3 1.8zM12 8L7.26 5.15M12 8l4.74-2.85M12 13.5V8"></path>
    </svg>
  )
}

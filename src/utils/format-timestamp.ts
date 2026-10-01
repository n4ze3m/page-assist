export const formatContextTimestamp = (timestamp?: number): string | null => {
  if (!timestamp) {
    return null
  }

  const date = new Date(timestamp)
  if (isNaN(date.getTime())) {
    return null
  }

  const pad = (value: number) => `${value}`.padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const formatMessageTimestamp = (timestamp?: number): string | null => {
  if (!timestamp) {
    return null
  }

  const date = new Date(timestamp)
  if (isNaN(date.getTime())) {
    return null
  }

  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })

  const isToday = date.toDateString() === new Date().toDateString()
  if (isToday) {
    return time
  }

  return `${date.toLocaleDateString([], {
    month: "short",
    day: "numeric"
  })} ${time}`
}

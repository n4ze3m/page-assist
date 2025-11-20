import React from "react"
import {
  getServerCapabilities,
  type ServerCapabilities
} from "@/services/tldw/server-capabilities"

type UseServerCapabilitiesResult = {
  capabilities: ServerCapabilities | null
  loading: boolean
}

export const useServerCapabilities = (): UseServerCapabilitiesResult => {
  const [capabilities, setCapabilities] =
    React.useState<ServerCapabilities | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const caps = await getServerCapabilities()
        if (!cancelled) {
          setCapabilities(caps)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { capabilities, loading }
}


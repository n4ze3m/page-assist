import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"

function Mermaid({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (code && ref.current) {
      mermaid
        .run({
          nodes: [ref.current],
          suppressErrors: true
        })
        .catch((e) => {
          setHasError(true)
          console.error("[Mermaid] ", e.message)
        })
    }
  }, [code])

  if (hasError) {
    return null
  }

  return (
    <div
      className="mermaid relative w-full h-[80vh] text-center cursor-pointer overflow-auto"
      ref={ref}>
      {code}
    </div>
  )
}

export default Mermaid

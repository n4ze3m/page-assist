import React from "react"

type MarkdownErrorBoundaryProps = React.PropsWithChildren<{
  fallbackText?: string
}>

type MarkdownErrorBoundaryState = {
  hasError: boolean
}

export class MarkdownErrorBoundary extends React.Component<
  MarkdownErrorBoundaryProps,
  MarkdownErrorBoundaryState
> {
  state: MarkdownErrorBoundaryState = {
    hasError: false
  }

  static getDerivedStateFromError(): MarkdownErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="whitespace-pre-wrap">
          {this.props.fallbackText ?? ""}
        </div>
      )
    }

    return this.props.children
  }
}

export default MarkdownErrorBoundary

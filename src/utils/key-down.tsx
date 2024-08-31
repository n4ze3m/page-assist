export const handleChatInputKeyDown = ({
    e,
    sendWhenEnter,
    typing,
    isSending
}: {
    e: React.KeyboardEvent
    typing: boolean
    sendWhenEnter: boolean
    isSending: boolean
}) => {
    return import.meta.env.BROWSER === "firefox"
        ? e.key === "Enter" &&
        !e.shiftKey &&
        !e.nativeEvent.isComposing &&
        !isSending &&
        sendWhenEnter
        : !typing && e.key === "Enter" && !e.shiftKey && !isSending && sendWhenEnter
}

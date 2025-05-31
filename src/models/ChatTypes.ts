export type ChatDocument  = {
    title?: string, 
    url?: string,
    type: "tab" | "file",
    tabId?: number,
}

export type ChatDocuments = ChatDocument[]
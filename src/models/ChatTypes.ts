export type ChatDocument  = {
    title?: string, 
    url?: string,
    type: "tab" | "file",
    tabId?: number,
    favIconUrl?: string,
}

export type ChatDocuments = ChatDocument[]
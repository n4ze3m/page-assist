export type ChatDocument  = {
    title?: string, 
    url?: string,
    type: "tab" | "file",
    tabId?: number,
    favIconUrl?: string,
    filename?: string,
    fileSize?: number,
}

export type ChatDocuments = ChatDocument[]
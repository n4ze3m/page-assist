
export const checkChromeAIAvailability = async (): Promise<"readily" | "no" | "after-download"> => {
    try {
        const ai = (window as any).ai;

        // upcoming version change 
        if (ai?.assistant?.capabilities) {
            const capabilities = await ai.assistant.capabilities();
            return capabilities?.available ?? "no";
        }

        // old version 
        if (ai?.canCreateTextSession) {
            const available = await ai.canCreateTextSession();
            return available ?? "no";
        }

        return "no";
    } catch (e) {
        console.error("Error checking Chrome AI availability:", e);
        return "no";
    }
}

export interface AITextSession {
    prompt(input: string): Promise<string>
    promptStreaming(input: string): ReadableStream
    destroy(): void
    clone(): AITextSession
}


export const createAITextSession = async (data: any): Promise<AITextSession> => {
    const ai = (window as any).ai;

    // upcoming version change 
    if (ai?.assistant?.create) {
        const session = await ai.assistant.create({
            ...data
        })
        return session
    }

    // old version
    if (ai.createTextSession) {
        const session = await ai.createTextSession({
            ...data
        })

        return session
    }

    throw new Error("Chrome AI is not available.")
}
import { setBadgeBackgroundColor, setBadgeText, setTitle } from "@/utils/action"
import fetcher from "@/libs/fetcher"

export const progressHuman = (completed: number, total: number) => {
    return ((completed / total) * 100).toFixed(0) + "%"
}

export const clearBadge = () => {
    setBadgeText({ text: "" })
    setTitle({ title: "" })
}
export const streamDownload = async (url: string, model: string) => {
    url += "/api/pull"
    const response = await fetcher(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ model, stream: true })
    })

    const reader = response.body?.getReader()

    const decoder = new TextDecoder()

    let isSuccess = true
    while (true) {
        if (!reader) {
            break
        }
        const { done, value } = await reader.read()

        if (done) {
            break
        }

        const text = decoder.decode(value)
        try {
            const json = JSON.parse(text.trim()) as {
                status: string
                total?: number
                completed?: number
            }
            if (json.total && json.completed) {
                setBadgeText({
                    text: progressHuman(json.completed, json.total)
                })
                setBadgeBackgroundColor({ color: "#0000FF" })
            } else {
                setBadgeText({ text: "🏋️‍♂️" })
                setBadgeBackgroundColor({ color: "#FFFFFF" })
            }

            setTitle({ title: json.status })

            if (json.status === "success") {
                isSuccess = true
            }
        } catch (e) {
            console.error(e)
        }
    }

    if (isSuccess) {
        setBadgeText({ text: "✅" })
        setBadgeBackgroundColor({ color: "#00FF00" })
        setTitle({ title: "Model pulled successfully" })
    } else {
        setBadgeText({ text: "❌" })
        setBadgeBackgroundColor({ color: "#FF0000" })
        setTitle({ title: "Model pull failed" })
    }

    setTimeout(() => {
        clearBadge()
    }, 5000)
}
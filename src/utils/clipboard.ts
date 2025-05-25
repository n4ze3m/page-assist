import { marked } from 'marked';
import markedKatexExtension from './marked/katex';
import { replaceThinkTagToEM } from '@/libs/reasoning';

export const copyToClipboard = async ({
    text,
    formatted = false
}: {
    text: string
    formatted?: boolean
}) => {

    if (formatted) {
        try {
            const options: any = {
                throwOnError: false,
            }

            marked.use(markedKatexExtension(options))

            const html = marked.parse(replaceThinkTagToEM(text))
            const styledHtml = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
                    ${html}
                </div>
            `

            if (navigator.clipboard && navigator.clipboard.write) {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/plain': new Blob([text], { type: 'text/plain' }),
                        'text/html': new Blob([styledHtml], { type: 'text/html' })
                    })
                ])
                return
            }
        } catch (e) {
            console.log(e)
            console.log('Using fallback')
        }
    }

    // Fallback to plain text copying
    navigator.clipboard.writeText(text)
}

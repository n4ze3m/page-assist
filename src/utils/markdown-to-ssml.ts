export function markdownToSSML(markdown: string): string {
  let ssml = markdown.replace(/\\n/g, "<break/>")

  ssml = ssml.replace(
    /^(#{1,6}) (.*?)(?=\r?\n\s*?(?:\r?\n|$))/gm,
    (match, hashes, heading) => {
      const level = hashes.length
      const rate = (level - 1) * 10 + 100
      return `<prosody rate="${rate}%">${heading}</prosody>`
    }
  )

  ssml = ssml.replace(/\\\*\\\*(.\*?)\\\*\\\*/g, "<emphasis>$1</emphasis>")
  ssml = ssml.replace(
    /\\\*(.\*?)\\\*/g,
    '<amazon:effect name="whispered">$1</amazon:effect>'
  )
  ssml = `<speak>${ssml}</speak>`
  return `<?xml version="1.0"?>${ssml}`
}

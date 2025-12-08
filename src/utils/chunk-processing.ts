export async function processInChunks<T>(
  items: T[],
  size: number,
  fn: (chunk: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size)
    await fn(chunk)
  }
}


/**
 * Compresses text data using the browser's built-in CompressionStream API with gzip
 * @param text - The string to compress
 * @returns Promise resolving to an ArrayBuffer containing the compressed data
 */
export async function compressText(text: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(text);
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(encodedData);
    writer.close();
    return new Response(cs.readable).arrayBuffer();
}

/**
 * Decompresses binary data using the browser's built-in DecompressionStream API with gzip
 * @param compressedData - The ArrayBuffer containing compressed data
 * @returns Promise resolving to the original string
 */
export async function decompressData(compressedData: ArrayBuffer): Promise<string> {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(new Uint8Array(compressedData));
    writer.close();
    const decompressedArrayBuffer = await new Response(ds.readable).arrayBuffer();
    const decoder = new TextDecoder();
    return decoder.decode(decompressedArrayBuffer);
}

/**
 * Converts an ArrayBuffer to a base64 string for storage or transmission
 * @param buffer - The ArrayBuffer to convert
 * @returns Base64 encoded string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export function getCompressionStats(originalText: string, compressedData: ArrayBuffer): {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
} {
    const originalSize = new TextEncoder().encode(originalText).length;
    const compressedSize = compressedData.byteLength;
    const compressionRatio = originalSize > 0 ?
        Math.round((1 - (compressedSize / originalSize)) * 100) : 0;

    return {
        originalSize,
        compressedSize,
        compressionRatio
    };
}

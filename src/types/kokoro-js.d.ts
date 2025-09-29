declare module "kokoro-js" {
  export class KokoroTTS {
    static from_pretrained(model: string, options?: any): Promise<KokoroTTS>
    generate(text: string, options?: any): Promise<RawAudio>
  }
  export interface RawAudio {
    /** PCM float32 samples */
    data?: Float32Array
    /** sample rate in Hz */
    sampling_rate?: number
    toWav(): ArrayBuffer
    toBlob(): Blob
    save?(path: string): Promise<void>
  }
  export function speak(text: string): Promise<void>
}

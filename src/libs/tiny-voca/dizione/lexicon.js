import { PHONES } from "./symbols.js";

export const PACKED = "lexicon.packed.gz";
const MARKS = ["", "ˈ", "ˌ"];
const code = (unit) => {
  const stress = Math.max(MARKS.indexOf(unit[0]), 0);
  return 1 + PHONES.indexOf(stress ? unit.slice(1) : unit) + PHONES.length * stress;
};
const unit = (byte) => MARKS[Math.floor((byte - 1) / PHONES.length)] + PHONES[(byte - 1) % PHONES.length];
const shared = (a, b) => {
  let size = 0;
  while (size < a.length && size < b.length && size < 255 && a[size] === b[size]) size++;
  return size;
};

export function packLexicon(entries) {
  const encoder = new TextEncoder(), out = [...new Uint8Array(new Uint32Array([entries.length]).buffer)];
  const words = entries.map(([word]) => encoder.encode(word)), sounds = entries.map(([, text]) => text.split(" ").map(code));
  for (const list of [words, sounds]) {
    list.forEach((item, i) => {
      const same = i ? shared(item, list[i - 1]) : 0;
      out.push(same, ...item.slice(same), 0);
    });
  }
  return Uint8Array.from(out);
}

export function unpackLexicon(bytes) {
  const count = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true), decoder = new TextDecoder();
  const item = new Uint8Array(4096), words = new Array(count), lexicon = new Map();
  let at = 4;
  const next = () => {
    const same = bytes[at++], end = bytes.indexOf(0, at), length = same + end - at;
    item.set(bytes.subarray(at, end), same);
    at = end + 1;
    return length;
  };
  for (let i = 0; i < count; i++) words[i] = decoder.decode(item.subarray(0, next()));
  for (let i = 0; i < count; i++) lexicon.set(words[i], Array.from(item.subarray(0, next()), unit).join(" "));
  return lexicon;
}

export async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

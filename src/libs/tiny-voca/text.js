const ABBREVIATIONS = /(?:\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|inc|ltd|co|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$/i;

function sentences(text) {
  const parts = [];
  let current = "";
  for (const piece of text.replace(/\s+/g, " ").trim().split(/(?<=[.!?…]["')\]]?)\s+(?=["'(\[]?[A-Z0-9])/)) {
    current = current ? current + " " + piece : piece;
    if (!ABBREVIATIONS.test(current)) { parts.push(current); current = ""; }
  }
  if (current) parts.push(current);
  return parts.filter((part) => /[\p{L}\p{N}]/u.test(part));
}

function finished(text) {
  const body = text.replace(/\s+$/, "");
  if (!body) return text;
  const last = body.split(/\s+/).pop();
  const marked = /[\p{L}\p{N}]/u.test(last) ? /[.!?…,;:]["'”’)\]»]*$/.test(last) : /[.!?…]/.test(last) || /^[,;:]$/.test(last);
  return marked ? text : body + ".";
}

export function utterancesOf(text, phonemizer, limit) {
  const fit = (sentence) => {
    let result;
    try {
      result = phonemizer.phonemize(sentence);
    } catch (error) {
      if (error.message !== "the text has nothing to pronounce") throw error;
      return [];
    }
    if (result.ids.length <= limit) {
      const phonemes = result.symbols.map((symbol, i) => ["", "ˈ", "ˌ"][result.stress[i]] + symbol).slice(1, -1).join(" ");
      return [{ ids: result.ids, stress: result.stress, phonemes }];
    }
    const pieces = sentence.split(/(?<=[,;:—])\s+/);
    if (pieces.length > 1) return pieces.flatMap(fit);
    const words = sentence.split(" ");
    if (words.length < 2) return [];
    const half = Math.ceil(words.length / 2);
    return [...fit(words.slice(0, half).join(" ")), ...fit(words.slice(half).join(" "))];
  };
  return sentences(finished(text)).flatMap(fit);
}

export const limited = (audio) => {
  const loudest = audio.reduce((top, sample) => Math.max(top, Math.abs(sample)), 0);
  return loudest > 0.99 ? audio.map((sample) => sample * 0.99 / loudest) : audio;
};

export function wav(audio, rate) {
  const view = new DataView(new ArrayBuffer(44 + 2 * audio.length));
  const text = (at, letters) => [...letters].forEach((letter, i) => view.setUint8(at + i, letter.charCodeAt(0)));
  text(0, "RIFF"); view.setUint32(4, 36 + 2 * audio.length, true); text(8, "WAVEfmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true);
  view.setUint32(28, 2 * rate, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, 2 * audio.length, true);
  audio.forEach((sample, i) => view.setInt16(44 + 2 * i, Math.round(sample * 32767), true));
  return view.buffer;
}

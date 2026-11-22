export class ValueError extends Error {
  constructor(message) { super(message); this.name = "ValueError"; }
}

export const PAD = "<pad>", BOS = "<bos>", EOS = "<eos>", SP = "<sp>", UNK = "<unk>";
export const SPECIALS = [PAD, BOS, EOS, SP, UNK];
export const PUNCTUATION = [",", ".", "?", "!", ";", ":", '"', "'", "(", ")", "—", "…"];
export const CONSONANTS = ["p", "b", "t", "d", "k", "ɡ", "f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "h",
                           "m", "n", "ŋ", "l", "ɹ", "j", "w", "tʃ", "dʒ", "ɾ", "ʔ"];
export const VOWELS = ["ə", "ɐ", "ɚ", "ᵻ", "ɪ", "i", "iː", "ɛ", "æ", "ʌ", "ɑː", "ɔ", "ɔː", "ʊ", "uː", "ɜː",
                       "eɪ", "aɪ", "ɔɪ", "oʊ", "aʊ", "iə", "oː",
                       "ɑːɹ", "ɔːɹ", "oːɹ", "ɪɹ", "ɛɹ", "ʊɹ", "aɪɚ", "aɪə", "əl", "n̩"];
export const PHONES = [...CONSONANTS, ...VOWELS];
export const SYMBOLS = [...SPECIALS, ...PUNCTUATION, ...PHONES];
export const SYMBOL_TO_ID = new Map(SYMBOLS.map((symbol, index) => [symbol, index]));
export const PHONE_SET = new Set(PHONES);
export const VOWEL_SET = new Set(VOWELS);
export const STRESS_MARKS = { 1: "ˈ", 2: "ˌ" };

export function tokenize(pieces) {
  const symbols = [BOS], stress = [0], unknown = [];
  for (const [punctuation, value] of pieces) {
    if (punctuation) {
      if (symbols.at(-1) !== value) { symbols.push(value); stress.push(0); }
      continue;
    }
    for (const word of value) {
      if (PHONE_SET.has(symbols.at(-1)) || symbols.at(-1) === UNK) { symbols.push(SP); stress.push(0); }
      for (const [phone, level] of word) {
        if (PHONE_SET.has(phone)) { symbols.push(phone); stress.push(level); }
        else { unknown.push(phone); symbols.push(UNK); stress.push(0); }
      }
    }
  }
  symbols.push(EOS);
  stress.push(0);
  if (!symbols.some((symbol) => PHONE_SET.has(symbol) || symbol === UNK)) throw new ValueError("the text has nothing to pronounce");
  return { symbols, ids: symbols.map((symbol) => SYMBOL_TO_ID.get(symbol)), stress, unknown };
}

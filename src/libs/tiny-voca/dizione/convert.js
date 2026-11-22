import { PHONE_SET, VOWEL_SET, STRESS_MARKS, ValueError } from "./symbols.js";
import { base } from "./align.js";

export const ARPA_VOWELS = new Set("AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW".split(" "));
export const CONSONANTS = { B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h", JH: "dʒ", K: "k", L: "l",
                            M: "m", N: "n", NG: "ŋ", P: "p", R: "ɹ", S: "s", SH: "ʃ", T: "t", TH: "θ", V: "v",
                            W: "w", Y: "j", Z: "z", ZH: "ʒ" };
const FULL_VOWELS = { AA: "ɑː", AE: "æ", AH: "ʌ", AO: "ɔː", AW: "aʊ", AY: "aɪ", EH: "ɛ", ER: "ɜː", EY: "eɪ",
                      IH: "ɪ", IY: "iː", OW: "oʊ", OY: "ɔɪ", UH: "ʊ", UW: "uː" };
const ARPABET = new Set([...Object.keys(CONSONANTS), ...[...ARPA_VOWELS].flatMap((vowel) => ["0", "1", "2"].map((digit) => vowel + digit))]);
const SIBILANTS = new Set(["S", "Z", "SH", "ZH", "CH", "JH"]);
const VOWEL_LETTERS = new Set("aeiouy");
const FORCE_SPELLINGS = ["forc", "ford", "sword", "worn", "torn", "sworn", "borne", "shorn", "pork", "divorc"];
const PREFIXES = ["dis", "mis", "un", "in", "re", "non", "over", "pre"];
const WEAK_PREFIXES = ["be", "de", "re", "pre"];
const IRE_ENDINGS = ["ing", "ings", "ingly", "able", "y", "er", "ers", "est"];
const starts = (text, ...options) => options.some((option) => text.startsWith(option));

export const isArpabet = (symbols) => symbols.length > 0 && symbols.every((symbol) => ARPABET.has(symbol));

export const vowelLetters = (run) => [...run].filter((letter) => VOWEL_LETTERS.has(letter)).join("");

export const toText = (phones) => phones.map(([phone, stress]) => (STRESS_MARKS[stress] || "") + phone).join(" ");

export function fromText(text) {
  const phones = [];
  for (const unit of text.trim().split(/\s+/).filter(Boolean)) {
    const stress = unit[0] === "ˈ" ? 1 : unit[0] === "ˌ" ? 2 : 0, phone = stress ? unit.slice(1) : unit;
    if (!PHONE_SET.has(phone)) throw new ValueError(`'${phone}' is not a phone of the inventory`);
    if (stress && !VOWEL_SET.has(phone)) throw new ValueError(`stress mark on the consonant '${phone}'`);
    phones.push([phone, stress]);
  }
  return phones;
}

class Word {
  constructor(word, arpabet, runs) {
    this.word = word;
    this.bases = arpabet.map(base);
    this.stress = arpabet.map((symbol) => ("012".includes(symbol.at(-1)) ? Number(symbol.at(-1)) : null));
    arpabet.forEach((symbol, i) => {
      if (!(this.bases[i] in CONSONANTS) && !ARPA_VOWELS.has(this.bases[i])) throw new ValueError(`'${symbol}' is not an ARPABET symbol`);
    });
    this.aligned = runs !== null && runs !== undefined;
    this.runs = this.aligned ? [...runs] : arpabet.map(() => "");
    this.starts = [];
    let position = 0;
    for (const run of this.runs) { this.starts.push(position); position += run.length; }
    this.count = this.bases.length;
  }

  base(i) { return i >= 0 && i < this.count ? this.bases[i] : null; }
  vowel(i) { return i >= 0 && i < this.count && ARPA_VOWELS.has(this.bases[i]); }
  unstressed(i) { return this.vowel(i) && !this.stress[i]; }
  letters(i) { return vowelLetters(this.runs[i]); }
  before(i) { return this.aligned ? this.word.slice(0, this.starts[i]) : ""; }
  after(i) { return this.aligned ? this.word.slice(this.starts[i] + this.runs[i].length) : ""; }
  endsWith(i, ...symbols) { return this.bases.slice(i + 1).join(" ") === symbols.join(" "); }
  firstVowel(i) { return !this.bases.slice(0, i).some((name) => ARPA_VOWELS.has(name)); }

  nextVowelStress(i) {
    for (let j = i + 1; j < this.count; j++) if (ARPA_VOWELS.has(this.bases[j])) return this.stress[j];
    return null;
  }

  weakPrefix(i) {
    return this.aligned && this.firstVowel(i) && this.letters(i) === "e" && starts(this.word, ...WEAK_PREFIXES)
      && ["b", "d", "r", "pr"].includes(this.before(i));
  }
}

function northOrForce(w, i, beforeVowel) {
  if (!w.aligned) return "ɔː";
  const spelled = w.letters(i);
  if (["oa", "oo", "ou"].includes(spelled)) return "oː";
  if (spelled !== "o") return "ɔː";
  const run = w.runs[i], tail = run.slice(run.indexOf("o") + 1) + w.after(i), rest = tail.slice(1);
  if (!beforeVowel) {
    if (rest.startsWith("e")) return "oː";
    if (w.before(i).endsWith("p") && rest.startsWith("t")) return "oː";
    return FORCE_SPELLINGS.some((spelling) => w.word.includes(spelling)) ? "oː" : "ɔː";
  }
  if (rest.startsWith("r")) return "ɔː";
  if (["y", "ies", "ied", "a", "as", "ah", "er", "ers"].includes(rest) || starts(rest, "ia", "io", "iu", "ing", "age")) return "oː";
  return "ɔː";
}

function weakI(w, i) {
  const nxt = w.base(i + 1), nxt2 = w.base(i + 2);
  if (nxt === "F" && nxt2 === "AH" && w.base(i + 3) === "L") return "i";
  if ((nxt === "T" && nxt2 === "IY") || (nxt === "B" && ["AH", "L"].includes(nxt2)) || (nxt === "F" && nxt2 === "AY")) return "ᵻ";
  if (nxt === "T" && w.endsWith(i, "T") && ["R", "ER"].includes(w.base(i - 1)) && w.word.endsWith("ite")) return "ᵻ";
  return "ɪ";
}

function weakE(w, i) {
  const nxt = w.base(i + 1), prev = w.base(i - 1);
  if (nxt === "T" && (w.endsWith(i, "T") || w.endsWith(i, "T", "S"))) return prev === "L" ? "ə" : prev === "R" ? "ᵻ" : "ɪ";
  if (nxt === "S" && (w.endsWith(i, "S", "T") || w.endsWith(i, "S", "T", "L", "IY"))) return "ɪ";
  if (nxt === "JH") return "ɪ";
  if (nxt === "K" && w.base(i + 2) === "T") return "ɛ";
  if (nxt === "D" && w.endsWith(i, "D")) return "ɪ";
  return "ə";
}

function inflection(w, i) {
  if (i + 1 >= w.count || (w.aligned && !(w.runs[i] + w.runs[i + 1]).includes("e"))) return false;
  const nxt = w.base(i + 1), prev = w.base(i - 1);
  if (nxt === "D" && ["T", "D"].includes(prev) && (w.endsWith(i, "D") || w.endsWith(i, "D", "L", "IY"))) return true;
  return nxt === "Z" && SIBILANTS.has(prev) && w.endsWith(i, "Z");
}

function firstSyllable(w, i) {
  if (!w.aligned || !w.firstVowel(i) || !w.nextVowelStress(i)) return null;
  const word = w.word;
  if (i === 0 && word.startsWith("e")) {
    if (word.startsWith("ex")) return "ɛ";
    if (["n", "m", "s"].includes(word.slice(1, 2)) && word.slice(2, 3) && !VOWEL_LETTERS.has(word[2]) && word[2] !== word[1]) return "ɛ";
    return "ɪ";
  }
  if (w.weakPrefix(i)) {
    if (word.startsWith("pre") || (word.startsWith("be") && ["c", "g"].includes(word.slice(2, 3)))) return "ɪ";
    return "ᵻ";
  }
  if (w.letters(i) === "i" && word.startsWith("di") && word.length > 3 && !VOWEL_LETTERS.has(word[2])
      && word[2] !== "s" && VOWEL_LETTERS.has(word[3])) return "ᵻ";
  return null;
}

function reduced(w, i) {
  const name = w.bases[i], spelled = w.letters(i), nxt = w.base(i + 1), prev = w.base(i - 1);
  if (name === "IH" && nxt === "NG") return "ɪ";
  if (inflection(w, i)) return "ᵻ";
  if (name === "AH") {
    if (prev === "Y" && (w.runs[i - 1] + w.runs[i]).includes("u")) return "ʊ";
    if (i === 0 && w.word.startsWith("a")) return "ɐ";
    if (i === 0 && nxt === "N" && w.word.startsWith("un")) return "ʌ";
    if (spelled === "a" && PREFIXES.includes(w.before(i)) && w.runs[i].startsWith("a")) return "ɐ";
  }
  const prefix = firstSyllable(w, i);
  if (prefix) return prefix;
  if (spelled === "e" && ["K", "G"].includes(nxt) && w.runs[i + 1].startsWith("x") && w.nextVowelStress(i)) return "ɛ";
  if (["i", "ai", "ui", "y"].includes(spelled)) return weakI(w, i);
  if (spelled === "e") return weakE(w, i);
  if (spelled === "a") {
    if (nxt === "JH" || (nxt === "N" && w.base(i + 2) === "JH")) return "ɪ";
    if (nxt === "S" && w.endsWith(i, "S") && w.word.endsWith("ace")) return "ɪ";
    if (name === "IH" && !(nxt === "T" && w.endsWith(i, "T"))) return "ɪ";
    return "ə";
  }
  if (name === "AH" && nxt === "M" && w.endsWith(i, "M") && w.word.endsWith("ome")) return "ʌ";
  return name === "IH" && !["o", "u", "ou"].includes(spelled) ? "ɪ" : "ə";
}

function unstressedIy(w, i) {
  const nxt = w.base(i + 1);
  if (nxt === null || w.endsWith(i, "Z") || w.endsWith(i, "D")) return ["i", 0];
  if (w.vowel(i + 1)) return [nxt === "IH" && w.base(i + 2) === "NG" ? "i" : "ɪ", 0];
  if (w.weakPrefix(i)) return w.nextVowelStress(i) === 1 ? ["ᵻ", 0] : ["iː", 2];
  return ["ɪ", 0];
}

export function convert(word, arpabet, runs = null) {
  const w = new Word(word, [...arpabet], runs), out = [];
  const emit = (phone, stress = 0) => out.push([phone, stress || 0]);
  for (let i = 0; i < w.count; i++) {
    const name = w.bases[i], stress = w.stress[i] || 0, nxt = w.base(i + 1);
    if (!ARPA_VOWELS.has(name)) {
      if (name === "Y" && nxt === "AH" && w.unstressed(i + 1) && ["N", "L"].includes(w.base(i - 1)) && w.base(i + 2) !== "L"
          && (!w.aligned || (w.runs[i] + w.runs[i + 1]).includes("i"))) {
        emit("iə");
        i++;
        continue;
      }
      emit(CONSONANTS[name]);
      continue;
    }
    const beforeVowel = w.vowel(i + 2);
    if (name === "ER") {
      emit(stress ? "ɜː" : "ɚ", stress);
      if (nxt === "R") i++;
      if (w.vowel(i + 1)) emit("ɹ");
    } else if (nxt === "R" && name === "AW") {
      emit("aʊ", stress);
      emit("ɚ");
      if (beforeVowel) emit("ɹ");
      i++;
    } else if (nxt === "R" && ["AA", "AO", "IH", "IY", "EH", "UH", "UW", "AY"].includes(name)) {
      let quality, single;
      if (name === "AA") {
        [quality, single] = ["ɑː", "ɑːɹ"];
      } else if (name === "AO") {
        quality = northOrForce(w, i, beforeVowel);
        single = quality + "ɹ";
      } else if (name === "IH" || name === "IY") {
        quality = stress && ["e", "eo"].includes(w.letters(i)) ? "iə" : "ɪ";
        single = "ɪɹ";
      } else if (name === "EH") {
        const doubled = (w.runs[i + 1] + w.after(i + 1)).startsWith("rr") || (w.runs[i].endsWith("r") && w.runs[i + 1].startsWith("r"));
        [quality, single] = [w.letters(i) === "a" && doubled ? "æ" : "ɛ", "ɛɹ"];
      } else if (name === "UH" || name === "UW") {
        quality = single = "ʊɹ";
      } else {
        [quality, single] = [!w.aligned || IRE_ENDINGS.includes(w.after(i + 1)) ? "aɪɚ" : "aɪ", "aɪɚ"];
      }
      if (beforeVowel) { emit(quality, stress); emit("ɹ"); } else emit(single, stress);
      i++;
    } else if (name === "AY" && nxt === "ER" && w.unstressed(i + 1) && w.runs[i + 1] === "er" && w.runs[i] !== "i") {
      emit("aɪ", stress);
    } else if (name === "AY" && nxt === "ER" && w.unstressed(i + 1)) {
      emit("aɪɚ", stress);
      i++;
      if (w.vowel(i + 1)) emit("ɹ");
    } else if (name === "AY" && nxt === "AH" && w.unstressed(i + 1)) {
      emit("aɪə", stress);
      i++;
    } else if (name === "IY" && nxt === "AH" && w.unstressed(i + 1) && !w.weakPrefix(i)) {
      const after = w.base(i + 2);
      if (stress !== 1 && (["L", "D", "T"].includes(after) || (after === "N" && w.base(i + 3) === "S"))) {
        emit("ɪ");
      } else {
        emit("iə", stress);
        i++;
      }
    } else if (!stress && name === "AH" && nxt === "N" && w.base(i - 1) === "T" && w.base(i + 2) !== "T"
               && out.length >= 2 && out.at(-1)[0] === "t" && VOWEL_SET.has(out.at(-2)[0]) && out.at(-2)[1]) {
      out.at(-1)[0] = "ʔ";
      emit("n̩");
      i++;
    } else if (!stress && name === "AH" && nxt === "W" && w.base(i + 2) === "AH" && w.unstressed(i + 2)
               && (w.runs[i] + w.runs[i + 1]).includes("u")) {
      emit("uː");
      i++;
    } else if (!stress && name === "AH" && nxt === "L" && i > 0 && !(w.vowel(i + 2) && w.stress[i + 2])) {
      if (w.letters(i) === "i" && w.vowel(i + 2)) {
        emit("ɪ");
      } else if (w.base(i - 1) === "Y" && (w.runs[i - 1] + w.runs[i]).includes("u")) {
        emit("ʊ");
      } else {
        emit("əl");
        i++;
      }
    } else if (!stress && (name === "AH" || name === "IH")) {
      emit(reduced(w, i));
    } else if (name === "IY" && (!stress || (stress === 2 && nxt === null))) {
      emit(...unstressedIy(w, i));
    } else if (!stress && name === "AE" && i === 0 && starts(w.word, "ad", "acc") && ["D", "K"].includes(nxt)) {
      emit("ɐ");
    } else if (!stress && name === "ER") {
      emit("ɚ");
    } else if (["AA", "AO"].includes(name) && w.letters(i) === "a" && (w.before(i).endsWith("w") || w.before(i).endsWith("qu")) && nxt === "N") {
      emit("ɔ", stress);
    } else if (name === "AO" && w.letters(i) === "o") {
      emit("ɔ", stress);
    } else {
      emit(FULL_VOWELS[name], stress);
    }
  }
  flap(out);
  for (let k = 0; k < out.length - 1; k++) if (out[k][0] === "n" && ["k", "ɡ"].includes(out[k + 1][0])) out[k][0] = "ŋ";
  settle(out);
  return out;
}

function flap(out) {
  for (let k = 1; k < out.length - 1; k++) {
    if (out[k][0] !== "t") continue;
    const before = out[k - 1][0], [after, stress] = out[k + 1];
    if ((!VOWEL_SET.has(before) && before !== "ɹ") || ["n̩", "əl"].includes(before) || !VOWEL_SET.has(after) || after === "n̩") continue;
    const finalO = after === "oʊ" && (k + 2 === out.length || (k + 3 === out.length && out[k + 2][0] === "z"));
    if (stress && !finalO) continue;
    if (["ə", "ɚ"].includes(after) && k + 2 < out.length && out[k + 2][0] === "n") continue;
    out[k][0] = "ɾ";
  }
}

export function settleStress(phones) {
  const out = phones.map(([phone, stress]) => [phone, stress]);
  settle(out);
  return out;
}

function settle(out) {
  const vowels = out.flatMap(([phone], k) => (VOWEL_SET.has(phone) ? [k] : []));
  const primaries = vowels.filter((k) => out[k][1] === 1);
  for (const k of primaries.slice(0, -1)) out[k][1] = 2;
  vowels.forEach((k, position) => {
    if (out[k][1] !== 2) return;
    const neighbours = [position - 1, position + 1].filter((p) => p >= 0 && p < vowels.length).map((p) => vowels[p]);
    if (neighbours.some((n) => out[n][1] === 1)) out[k][1] = 0;
  });
}

import { VOWEL_SET } from "./symbols.js";

const SHORT_STEM = /(?:^|[^aeiou])[aeiou](?:[bcdfgklmnprstvz]|th)$/;
const SIBILANT = new Set(["s", "z", "ʃ", "ʒ", "tʃ", "dʒ"]);
const VOICELESS = new Set(["p", "t", "k", "f", "θ", "ʔ"]);
const SPLIT = { "ɑːɹ": "ɑː", "ɔːɹ": "ɔː", "oːɹ": "oː", "ɪɹ": "ɪ", "ɛɹ": "ɛ" };
const RHOTIC = new Set(["ɚ", "ɜː", "aɪɚ", "ʊɹ"]);
const CONSONANT_LETTERS = new Set("bcdfghjklmnpqrstvwxz");
const P = (...phones) => phones.map((phone) => [phone, 0]);
const some = (phones) => (phones && phones.length ? phones : null);

const ENDINGS = [
  ["fully", P("f", "əl", "i")], ["lessly", P("l", "ə", "s", "l", "i")], ["ness", P("n", "ə", "s")],
  ["less", P("l", "ə", "s")], ["ments", P("m", "ə", "n", "t", "s")], ["ment", P("m", "ə", "n", "t")],
  ["ful", P("f", "əl")], ["ship", [["ʃ", 0], ["ɪ", 2], ["p", 0]]], ["hood", [["h", 0], ["ʊ", 2], ["d", 0]]],
  ["like", [["l", 0], ["aɪ", 2], ["k", 0]]], ["dom", P("d", "ə", "m")], ["ish", P("ɪ", "ʃ")],
  ["able", P("ə", "b", "əl")], ["ism", P("ɪ", "z", "ə", "m")], ["ist", P("ɪ", "s", "t")],
  ["wards", P("w", "ɚ", "d", "z")], ["ward", P("w", "ɚ", "d")], ["age", P("ɪ", "dʒ")],
  ["ers", P("ɚ", "z")], ["er", P("ɚ")], ["est", P("ɪ", "s", "t")], ["y", P("i")],
];
const twice = (form) => [form, form];
const PREFIXES = [
  ["under", twice([["ʌ", 2], ["n", 0], ["d", 0], ["ɚ", 0]])], ["over", twice([["oʊ", 2], ["v", 0], ["ɚ", 0]])],
  ["anti", twice([["æ", 2], ["n", 0], ["t", 0], ["i", 0]])], ["semi", twice([["s", 0], ["ɛ", 2], ["m", 0], ["i", 0]])],
  ["non", twice([["n", 0], ["ɑː", 2], ["n", 0]])], ["out", twice([["aʊ", 2], ["t", 0]])],
  ["dis", [P("d", "ɪ", "s"), [["d", 0], ["ɪ", 2], ["s", 0]]]], ["mis", [P("m", "ɪ", "s"), [["m", 0], ["ɪ", 2], ["s", 0]]]],
  ["un", [P("ʌ", "n"), [["ʌ", 2], ["n", 0]]]], ["in", [P("ɪ", "n"), [["ɪ", 2], ["n", 0]]]],
  ["re", [P("ɹ", "ᵻ"), [["ɹ", 0], ["iː", 2]]]], ["pre", twice([["p", 0], ["ɹ", 0], ["iː", 2]])],
];
const BRITISH = [["isation", "ization"], ["ising", "izing"], ["ised", "ized"], ["ises", "izes"], ["ise", "ize"], ["yse", "yze"],
                 ["our", "or"], ["ourable", "orable"], ["ours", "ors"], ["oured", "ored"], ["ouring", "oring"],
                 ["tre", "ter"], ["tres", "ters"], ["bre", "ber"], ["ence", "ense"], ["ogue", "og"], ["mme", "m"],
                 ["lled", "led"], ["lling", "ling"], ["ller", "ler"], ["oul", "ol"], ["ae", "e"], ["enqui", "inqui"]];

export function join(stemPhones, ending) {
  const stem = [...stemPhones];
  if (!stem.length || !ending.length) return [...stem, ...ending];
  const [last, stress] = stem.at(-1), [first, firstStress] = ending[0];
  if (VOWEL_SET.has(first)) {
    if (SPLIT[last]) {
      stem.splice(-1, 1, [SPLIT[last], stress], ["ɹ", 0]);
    } else if (RHOTIC.has(last)) {
      stem.push(["ɹ", 0]);
    } else if (last === "t" && stem.length > 1 && (VOWEL_SET.has(stem.at(-2)[0]) || stem.at(-2)[0] === "ɹ") && !firstStress
               && !(first === "ə" && ending.length > 1 && ending[1][0] === "n")) {
      stem[stem.length - 1] = ["ɾ", 0];
    } else if (last === "i") {
      stem[stem.length - 1] = first !== "ɪ" ? ["ɪ", stress] : ["i", stress];
    }
  } else if (last === "i" && ["n", "l", "f", "m"].includes(first)) {
    stem[stem.length - 1] = ["ɪ", stress];
  } else if (last === "n" && ["k", "ɡ"].includes(first)) {
    stem[stem.length - 1] = ["ŋ", 0];
  }
  return [...stem, ...ending];
}

export function plural(stem) {
  const last = stem.at(-1)[0];
  return join(stem, SIBILANT.has(last) ? P("ᵻ", "z") : VOICELESS.has(last) ? P("s") : P("z"));
}

export function past(stem) {
  const last = stem.at(-1)[0];
  if (["t", "d", "ɾ"].includes(last)) return join(stem, P("ᵻ", "d"));
  return join(stem, VOICELESS.has(last) || ["s", "ʃ", "tʃ"].includes(last) ? P("t") : P("d"));
}

export function adverb(stem) {
  const last = stem.at(-1)[0];
  return join(stem, ["əl", "l"].includes(last) ? P("i") : P("l", "i"));
}

function stems(body) {
  const out = [body];
  if (body.length > 2 && body.at(-1) === body.at(-2) && CONSONANT_LETTERS.has(body.at(-1))) out.push(body.slice(0, -1));
  if (body && (CONSONANT_LETTERS.has(body.at(-1)) || body.at(-1) === "u")) {
    out.splice(SHORT_STEM.test(body) ? 0 : out.length, 0, body + "e");
  }
  if (body.endsWith("i") && body.length > 2) out.push(body.slice(0, -1) + "y");
  return out;
}

const secondary = (phones) => phones.map(([phone, stress]) => [phone, stress === 1 ? 2 : stress]);

export const compound = (first, second) => join(first, secondary(second));

export function derive(word, lookup, part = null, depth = 0) {
  part = part || lookup;
  const stem = (spelling) => {
    if (spelling.length < 2) return null;
    return some(lookup(spelling)) || (depth < 2 ? some(derive(spelling, lookup, part, depth + 1)) : null);
  };
  const first = (candidates, build) => {
    for (const spelling of candidates) {
      const found = stem(spelling);
      if (found) return some(build(found));
    }
    return null;
  };
  const size = word.length;
  let found;
  if (word.endsWith("'s")) return first([word.slice(0, -2)], plural);
  if (word.endsWith("s'")) return first([word.slice(0, -1)], (f) => f);
  if (word.endsWith("ies") && size > 4 && (found = first([word.slice(0, -3) + "y"], plural))) return found;
  if (word.endsWith("ves") && size > 4) {
    found = first([word.slice(0, -3) + "f", word.slice(0, -3) + "fe"],
                  (f) => (f.at(-1)[0] === "f" ? join([...f.slice(0, -1), ["v", 0]], P("z")) : null));
    if (found) return found;
  }
  if (word.endsWith("es") && size > 3 && (found = first("sxzh".includes(word.at(-3)) ? [word.slice(0, -2)] : [], plural))) return found;
  if (word.endsWith("s") && !["ss", "us", "is"].some((end) => word.endsWith(end)) && size > 3 && (found = first([word.slice(0, -1)], plural))) return found;
  if (word.endsWith("ied") && size > 4 && (found = first([word.slice(0, -3) + "y"], past))) return found;
  if (word.endsWith("ed") && size > 3 && (found = first(stems(word.slice(0, -2)), past))) return found;
  if (word.endsWith("ing") && size > 4 && (found = first(stems(word.slice(0, -3)), (f) => join(f, P("ɪ", "ŋ"))))) return found;
  if (word.endsWith("ily") && size > 4 && (found = first([word.slice(0, -3) + "y"], adverb))) return found;
  if (word.endsWith("ly") && size > 3) {
    found = first(word.endsWith("bly") || word.endsWith("ply") ? [word.slice(0, -2), word.slice(0, -2) + "le", word.slice(0, -1) + "e"]
                                                                : [word.slice(0, -2)], adverb);
    if (found) return found;
  }
  for (const [spelling, phones] of ENDINGS) {
    if (!word.endsWith(spelling) || size - spelling.length <= 2) continue;
    const body = word.slice(0, -spelling.length);
    if (spelling === "y" && !CONSONANT_LETTERS.has(body.at(-1))) continue;
    const candidates = VOWEL_SET.has(phones[0][0]) ? stems(body) : body.endsWith("i") ? [body.slice(0, -1) + "y", body] : [body];
    if ((found = first(candidates, (f) => join(f, phones)))) return found;
  }
  for (const [spelling, [plain, stressed]] of PREFIXES) {
    if (!word.startsWith(spelling) || size - spelling.length <= 2) continue;
    if ((found = stem(word.slice(spelling.length)))) {
      const vowels = found.filter(([phone]) => VOWEL_SET.has(phone)).map(([, stress]) => stress);
      return join(vowels.length && vowels[0] === 1 ? plain : stressed, found);
    }
  }
  for (const [old, fresh] of BRITISH) {
    if (word.includes(old) && (found = stem(word.replace(old, fresh)))) return found;
  }
  if (depth === 0) {
    let best = null;
    for (let cut = 4; cut < size - 3; cut++) {
      const left = some(part(word.slice(0, cut))), right = some(part(word.slice(cut)));
      if (left && right) {
        const score = Math.min(cut, size - cut);
        if (best === null || score > best[0]) best = [score, left, right];
      }
    }
    if (best) return compound(best[1], best[2]);
  }
  return null;
}

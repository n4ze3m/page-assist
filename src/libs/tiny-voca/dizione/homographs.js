import { rows } from "./tables.js";
import { ValueError } from "./symbols.js";

const CLASSES = [
  ["TO", "to"],
  ["DET", "the a an this that these those every each no some any another such what which whose"],
  ["POSS", "my your his her its our their"],
  ["SUBJ", "i you he she it we they who"],
  ["OBJ", "me him us them"],
  ["MODAL", "will would shall should can could may might must 'll 'd won't can't cannot couldn't shouldn't wouldn't let's please"],
  ["DO", "do does did don't doesn't didn't"],
  ["BE", "am is are was were be been being isn't aren't wasn't weren't i'm you're we're they're he's she's it's that's there's"],
  ["HAVE", "have has had having haven't hasn't hadn't i've you've we've they've"],
  ["NEG", "not never"],
  ["PREP", "of in on at by for from with into onto over under about after before between through during without within "
           + "against among around across behind beside near upon toward towards as than like"],
  ["CONJ", "and or but nor so yet if because although though while when where unless until since whether"],
  ["ADV", "very too quite rather more most less least also just only even still always often sometimes usually again "
          + "now then here there soon already almost"],
];
const TAG = new Map(CLASSES.flatMap(([name, words]) => words.split(" ").map((word) => [word, name])));
const SENTENCE_END = new Set([".", "?", "!"]);
const WINDOW = 6;
const isAlpha = (text) => /^\p{L}/u.test(text);
const isDigit = (text) => /^[\p{Nd}²³¹⁰⁴-⁹₀-₉①-⑨⑴-⑼⒈-⒐⓪⓵-⓽⓿❶-❾➀-➈➊-➒]/u.test(text);
const isUpper = (text) => /^\p{Uppercase}/u.test(text);
const lower = (text) => text.toLowerCase();

export function tag(token) {
  if (token === "<s>" || token === "</s>") return token;
  if (!isAlpha(token)) return isDigit(token) ? "NUM" : "PUNCT";
  const word = lower(token);
  if (TAG.has(word)) return TAG.get(word);
  for (const [ending, name] of [["'s", "POS"], ["ly", "LY"], ["ing", "ING"], ["ed", "ED"]]) {
    if (word.endsWith(ending) && [...word].length > ending.length + 1) return name;
  }
  if (word.endsWith("s") && !word.endsWith("ss") && [...word].length > 3) return "S";
  return isUpper(token) ? "CAP" : "W";
}

export function features(tokens, index) {
  const at = (offset) => {
    const position = index + offset;
    return position >= 0 && position < tokens.length ? tokens[position] : offset < 0 ? "<s>" : "</s>";
  };
  const p2 = at(-2), p1 = at(-1), n1 = at(1), n2 = at(2), tp2 = tag(p2), tp1 = tag(p1), tn1 = tag(n1), tn2 = tag(n2);
  const out = ["tp1=" + tp1, "tp2=" + tp2, "tn1=" + tn1, "tn2=" + tn2, "tp2p1=" + tp2 + "+" + tp1, "tp1n1=" + tp1 + "+" + tn1,
               "tn1n2=" + tn1 + "+" + tn2];
  if (index === 0) out.push("first");
  else if (isUpper(tokens[index])) out.push("cap");
  out.push("p1=" + lower(p1), "p2=" + lower(p2), "n1=" + lower(n1), "n2=" + lower(n2));
  const target = lower(tokens[index]);
  const nearby = new Set(tokens.slice(Math.max(0, index - WINDOW), index + WINDOW + 1).filter(isAlpha).map(lower));
  nearby.delete(target);
  const byCodePoint = (a, b) => {
    const x = [...a], y = [...b];
    for (let i = 0; i < x.length && i < y.length; i++) if (x[i] !== y[i]) return x[i].codePointAt(0) - y[i].codePointAt(0);
    return x.length - y.length;
  };
  out.push(...[...nearby].sort(byCodePoint).map((word) => "w=" + word));
  return out;
}

const shared = (names) => names.filter((name) => name[0] === "t" || name === "first" || name === "cap");

export function sentenceOf(tokens, index) {
  let start = index, end = index;
  while (start > 0 && !SENTENCE_END.has(tokens[start - 1])) start--;
  while (end < tokens.length && !SENTENCE_END.has(tokens[end])) end++;
  return [tokens.slice(start, end + 1), index - start];
}

const SKIP_FOR_BEFORE = new Set(["ADV", "NEG", "LY"]);
const SKIP_FOR_AUX = new Set([...SKIP_FOR_BEFORE, "SUBJ", "OBJ", "DET", "POSS"]);

function left(tokens, index, skip) {
  for (let position = index - 1; position > Math.max(index - 6, -1); position--) {
    const token = tokens[position];
    if (skip.has(tag(token))) continue;
    const word = lower(token);
    return word.endsWith("'ll") ? "will" : word.endsWith("'ve") ? "have" : word;
  }
  return "<s>";
}

export function readRules(source = "homograph_rules.txt") {
  const rules = new Map();
  for (const [number, columns] of rows(source)) {
    if (columns.length !== 3) throw new ValueError(`homograph_rules.txt line ${number}: expected word, sense, conditions`);
    const conditions = columns[2].split(";").map((part) => {
      const text = part.trim(), cut = text.indexOf(":"), name = cut < 0 ? text : text.slice(0, cut);
      const words = (cut < 0 ? "" : text.slice(cut + 1)).trim().split(/\s+/).filter(Boolean);
      if (!["aux", "before", "next", "near", "first", "joined"].includes(name) || (name === "first") === (words.length > 0)) {
        throw new ValueError(`homograph_rules.txt line ${number}: bad condition '${text}'`);
      }
      return [name, new Set(words)];
    });
    if (!rules.has(columns[0])) rules.set(columns[0], []);
    rules.get(columns[0]).push([columns[1], conditions]);
  }
  return rules;
}

function holds(condition, words, tokens, index, joined) {
  if (condition === "first") return index === 0;
  if (condition === "joined") return joined && index > 0 && words.has(lower(tokens[index - 1]));
  if (condition === "aux") return words.has(left(tokens, index, SKIP_FOR_AUX));
  if (condition === "before") return words.has(left(tokens, index, SKIP_FOR_BEFORE));
  if (condition === "next") return words.has(index + 1 < tokens.length ? lower(tokens[index + 1]) : "</s>");
  return tokens.slice(Math.max(0, index - WINDOW), index + WINDOW + 1).some((token) => words.has(lower(token)));
}

export class Homographs {
  constructor(data, rules = null) {
    this.words = new Map(Object.entries(data.words));
    this.pooled = data.pooled;
    this.pluralBases = new Set(data.plural_bases || []);
    this.rules = rules === null ? readRules() : rules;
    for (const [word, wordRules] of this.rules) {
      const known = new Set(this.words.has(word) ? this.words.get(word).senses.map((sense) => sense.id) : []);
      for (const [sense] of wordRules) {
        if (!known.has(sense)) throw new ValueError(`homograph rule for '${word}' names the unknown sense '${sense}'`);
      }
    }
  }

  covers(word) {
    return this.words.has(word) || (word.endsWith("s") && this.pluralBases.has(word.slice(0, -1)));
  }

  pronounce(word, tokens, index, joined = false) {
    if (this.words.has(word)) return [this.choose(word, tokens, index, joined).phones, false];
    const entry = this.words.get(word.slice(0, -1)), adjective = entry.senses.find((sense) => sense.role === "n");
    if (adjective && adjective.id === "adj") return [entry.senses.find((sense) => sense.role === "v").phones, true];
    return [this.choose(word.slice(0, -1), tokens, index, joined).phones, true];
  }

  scores(word, tokens, index) {
    const entry = this.words.get(word), names = features(...sentenceOf(tokens, index)), model = entry.model;
    const weigh = (weights, list) => list.reduce((sum, name) => sum + (Object.hasOwn(weights, name) ? weights[name] : 0), 0);
    if (model.kind === "noun-verb") {
      let verb = this.pooled.bias + weigh(this.pooled.weights, shared(names));
      verb += model.bias + weigh(model.weights, names);
      return entry.senses.map((sense) => (sense.role === "v" ? verb : -verb));
    }
    return model.bias.map((bias, i) => bias + weigh(model.weights[i], names));
  }

  choose(word, tokens, index, joined = false) {
    const entry = this.words.get(word), [sentence, position] = sentenceOf(tokens, index);
    for (const [sense, conditions] of this.rules.get(word) || []) {
      if (conditions.every(([name, words]) => holds(name, words, sentence, position, joined))) {
        return entry.senses.find((candidate) => candidate.id === sense);
      }
    }
    const scores = this.scores(word, tokens, index);
    return entry.senses[scores.indexOf(Math.max(...scores))];
  }
}

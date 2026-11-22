import * as morphology from "./morphology.js";
import * as sentence from "./sentence.js";
import * as tables from "./tables.js";
import { Normalizer } from "./normalize.js";
import { Aligner } from "./align.js";
import { convert, fromText, settleStress } from "./convert.js";
import { Model } from "./g2p.js";
import { Homographs } from "./homographs.js";
import { PACKED, unpackLexicon, gunzip } from "./lexicon.js";
import { Unit } from "./sentence.js";
import { tokenize, ValueError } from "./symbols.js";

const LEIGH = /(?<=[a-z]{2})leigh(?=s?$)/g;
const VIRUS = ["viruses", "virus"];
let letterNames = null;

export class Phonemizer {
  constructor({ lexicon, align, model = null, homographs = null }, overrides = null, joinPhrases = true) {
    this.lexicon = lexicon;
    this.aligner = new Aligner(align);
    this.model = model;
    this.homographs = homographs ? new Homographs(homographs) : null;
    this.functions = tables.functionWords();
    this.phrases = joinPhrases ? tables.phrases() : new Map();
    this.phraseLength = Math.max(1, ...[...this.phrases.keys()].map((key) => key.split(" ").length));
    this.exceptions = tables.pronunciations("exceptions.txt");
    this.names = tables.names("exceptions.txt");
    this.userNames = new Set();
    this.overrides = new Map();
    this.countNames();
    if (overrides) this.addOverrides(overrides);
    this.normalizer = new Normalizer((word) => this.isWord(word));
    this.cache = new Map();
  }

  countNames() {
    this.nameStarts = new Set([...this.names.keys()].map((key) => key.split(" ")[0]));
    this.nameLength = Math.max(1, ...[...this.names.keys()].map((key) => key.split(" ").length));
  }

  addOverrides(source) {
    for (const [word, entry] of tables.pronunciations(source)) this.overrides.set(word, entry);
    for (const [key, entry] of tables.names(source)) { this.names.set(key, entry); this.userNames.add(key); }
    this.countNames();
    this.cache = new Map();
  }

  entry(word, [kind, value]) {
    return kind === "phones" ? value : convert(word, value, this.aligner.align(word, value));
  }

  known(word) {
    if (this.overrides.has(word)) return this.entry(word, this.overrides.get(word));
    if (this.exceptions.has(word)) return this.entry(word, this.exceptions.get(word));
    const text = this.lexicon.get(word);
    return text !== undefined && text !== null ? fromText(text) : null;
  }

  ordinary(word) {
    if (word.length < 3 || !["s", "es", "ed", "ing"].some((ending) => this.lexicon.has(word + ending))) return null;
    return this.known(word);
  }

  guess(word) {
    if (this.model === null) return this.spell(word);
    const spelling = this.model.spellable(word), symbols = this.model.predict(spelling), voiced = (symbol) => "012".includes(symbol.at(-1));
    symbols.forEach((symbol, k) => {
      if (symbol === "R" && ![k - 1, k + 1].some((j) => j >= 0 && j < symbols.length && voiced(symbols[j]))) symbols[k] = "ER0";
    });
    if (!symbols.some(voiced)) return this.spell(word);
    return sentence.promote(convert(spelling, symbols, this.aligner.align(spelling, symbols)));
  }

  spell(letters) {
    letterNames ||= new Map([...tables.mapping("letters.txt")].map(([key, value]) => [key, fromText(value)]));
    const text = letters.toLowerCase(), possessive = text.endsWith("'s");
    const names = [...(possessive ? [...letters].slice(0, -2).join("") : letters).toLowerCase()].filter((c) => letterNames.has(c)).map((c) => letterNames.get(c));
    const out = names.flatMap((name, index) => name.map(([phone, stress]) => [phone, stress && index < names.length - 1 ? 2 : stress]));
    return possessive && out.length ? morphology.plural(out) : out;
  }

  isWord(word) {
    return this.lexicon.has(word) || this.functions.has(word) || this.exceptions.has(word) || this.overrides.has(word);
  }

  fromParts(word) {
    if (word.endsWith("'s") && word.length > 3) {
      const found = this.fromParts(word.slice(0, -2));
      return found && [morphology.plural(found[0]), found[1]];
    }
    LEIGH.lastIndex = 0;
    if (LEIGH.test(word)) return this.word(word.replace(LEIGH, "ley"));
    for (const tail of VIRUS) {
      const second = word.endsWith(tail) && word.length - tail.length > 2 ? this.known(tail) : null;
      if (second !== null) {
        const [first, source] = this.word(word.slice(0, -tail.length));
        return [sentence.promote(settleStress(morphology.compound(first, second))), source === "model" ? "model" : "ending"];
      }
    }
    return null;
  }

  word(word) {
    if (this.cache.has(word)) return this.cache.get(word);
    let phones = this.known(word), source = "dictionary";
    if (phones === null) {
      phones = morphology.derive(word, (w) => this.known(w), (w) => this.ordinary(w));
      source = "ending";
      if (phones !== null) phones = settleStress(phones);
    }
    if (phones === null) {
      const found = this.fromParts(word);
      if (found) [phones, source] = found;
    }
    if (phones === null && word.endsWith("'s") && word.length > 3) [phones, source] = [morphology.plural(this.guess(word.slice(0, -2))), "model"];
    if (phones === null) [phones, source] = [this.guess(word), "model"];
    this.cache.set(word, [phones, source]);
    return [phones, source];
  }

  units(words, places = null, written = null) {
    const units = [];
    for (let index = 0; index < words.length; index++) {
      const token = words[index];
      if (token.phones !== null) {
        units.push(new Unit(token.text, [...token.phones], "p", null, token.attach, "inline"));
        continue;
      }
      if (token.spell) {
        units.push(new Unit(token.text, this.spell(token.text), "p", null, token.attach, "letters"));
        continue;
      }
      let size = this.nameStarts.has(token.text) ? this.nameSize(words, index) : 0;
      if (size) {
        const key = words.slice(index, index + size).map((w) => w.text);
        this.names.get(key.join(" ")).forEach((entry, position) => {
          units.push(new Unit(key[position], this.entry(key[position], entry), "p", null, token.attach && position === 0, "name"));
        });
        index += size - 1;
        continue;
      }
      size = this.phraseSize(words, index);
      if (size) {
        const key = words.slice(index, index + size).map((w) => w.text), [kind, forms, final] = this.phrases.get(key.join(" "));
        if (forms.length === 1) units.push(new Unit(key.join(" "), forms[0], kind, final, token.attach, "phrase"));
        else forms.forEach((form, position) => units.push(new Unit(key[position], form, kind, null, token.attach && position === 0, "phrase")));
        index += size - 1;
        continue;
      }
      if (this.overrides.has(token.text)) {
        units.push(new Unit(token.text, this.known(token.text), "c", null, token.attach, "override"));
      } else if (this.homographs && written && written.length && this.homographs.covers(token.text) && !this.exceptions.has(token.text)) {
        const [text, ending] = this.homographs.pronounce(token.text, written, places[index], token.attach);
        units.push(new Unit(token.text, ending ? morphology.plural(fromText(text)) : fromText(text), "c", null, token.attach, "homograph"));
      } else if (this.functions.has(token.text)) {
        const [kind, form, final] = this.functions.get(token.text);
        units.push(new Unit(token.text, form, kind, final, token.attach, "function"));
      } else {
        const [phones, source] = this.word(token.text);
        units.push(new Unit(token.text, phones, "c", null, token.attach, source));
      }
    }
    return units;
  }

  nameSize(words, index) {
    for (let size = Math.min(this.nameLength, words.length - index); size > 1; size--) {
      const span = words.slice(index, index + size), key = span.map((w) => w.text).join(" ");
      if (this.names.has(key) && span.every((w) => w.phones === null && !w.spell) && !span.slice(1).some((w) => w.attach)
          && (this.userNames.has(key) || !span.some((w) => this.overrides.has(w.text)))) return size;
    }
    return 0;
  }

  phraseSize(words, index) {
    for (let size = Math.min(this.phraseLength, words.length - index); size > 1; size--) {
      const span = words.slice(index, index + size);
      if (span.slice(1).every((w) => w.phones === null && !w.spell && !w.attach) && span[0].phones === null && !span[0].spell
          && this.phrases.has(span.map((w) => w.text).join(" ")) && !span.some((w) => this.overrides.has(w.text))) return size;
    }
    return 0;
  }

  analyse(text) {
    const stream = this.normalizer.tokens(text), isMark = (token) => "mark" in token;
    const written = stream.map((token) => (isMark(token) ? token.mark : token.raw || token.text || "x"));
    const out = [];
    let words = [], places = [];
    const flush = () => {
      if (!words.length) return;
      const units = this.units(words, places, written);
      sentence.stressClause(units);
      sentence.joinClause(units);
      out.push(["clause", units]);
      words = [];
      places = [];
    };
    stream.forEach((token, place) => {
      if (isMark(token)) { flush(); out.push(["punct", token.mark]); }
      else { words.push(token); places.push(place); }
    });
    flush();
    return out;
  }

  pieces(text) {
    return this.analyse(text).map(([kind, value]) => (kind === "punct" ? [true, value] : [false, sentence.groups(value)]));
  }

  phonemize(text) {
    if (typeof text !== "string" || !text.trim()) throw new ValueError("text must not be empty");
    return tokenize(this.pieces(text));
  }
}

export async function fromGGUF(file) {
  const decoder = new TextDecoder(), text = (name) => decoder.decode(file.files["phonemizer/" + name]);
  for (const name in file.files) if (name.endsWith(".txt")) tables.DATA[name.replace("phonemizer/", "")] = decoder.decode(file.files[name]);
  if (!tables.DATA["units.txt"]) throw new Error("this file has no phonemizer tables: make one with pack.mjs");
  const packed = file.files["phonemizer/" + PACKED];
  const lexicon = packed ? unpackLexicon(await gunzip(packed)) : new Map(text("lexicon.tsv").split("\n").filter(Boolean).map((line) => {
    const cut = line.indexOf("\t");
    return [line.slice(0, cut), line.slice(cut + 1)];
  }));
  const model = new Model(JSON.parse(text("g2p.json")), (name) => file.tensors["g2p/" + name]);
  return new Phonemizer({ lexicon, align: JSON.parse(text("align.json")), model, homographs: JSON.parse(text("homographs.json")) });
}

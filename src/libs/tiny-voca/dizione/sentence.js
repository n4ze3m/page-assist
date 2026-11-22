import { VOWEL_SET } from "./symbols.js";

const SPLIT = { "ɑːɹ": "ɑː", "ɔːɹ": "ɔː", "oːɹ": "oː", "ɪɹ": "ɪ", "ɛɹ": "ɛ", "ʊɹ": "ʊ" };
const RHOTIC = new Set(["ɚ", "ɜː", "aɪɚ"]);
const NO_LINK_BEFORE = new Set(["and", "or", "if"]);
const FLAP_BEFORE_VOWEL = new Set(["it", "at"]);

export class Unit {
  constructor(word, phones, kind = "c", final = null, attach = false, source = "") {
    Object.assign(this, { word, phones, kind, final, attach, source });
  }

  get lastWord() { return this.word.slice(this.word.lastIndexOf(" ") + 1); }
  get firstWord() { return this.word.split(" ", 1)[0]; }
}

export const unstress = (phones) => phones.map(([phone]) => [phone, 0]);

export function promote(phones) {
  const marks = phones.map(([, stress]) => stress);
  if (marks.includes(1)) return [...phones];
  const target = marks.includes(2) ? marks.lastIndexOf(2) : phones.findIndex(([phone]) => VOWEL_SET.has(phone));
  return phones.map(([phone, stress], i) => [phone, i === target ? 1 : stress]);
}

export function stressClause(units) {
  let primaryFollows = false;
  for (let index = units.length - 1; index >= 0; index--) {
    const unit = units[index], last = index === units.length - 1;
    const promoted = () => (unit.final !== null ? unit.final : promote(unit.phones));
    let phones = unit.phones;
    if (unit.kind === "u") phones = unstress(unit.phones);
    else if (unit.kind === "uf") phones = last ? promoted() : unstress(unit.phones);
    else if (unit.kind === "ur") phones = primaryFollows ? unstress(unit.phones) : promoted();
    else if (unit.kind === "s") phones = primaryFollows ? unit.phones : promoted();
    else if (unit.kind === "si") phones = !primaryFollows ? promoted() : index === 0 ? unit.phones : unstress(unit.phones);
    else if (unit.kind === "pf") phones = last ? promoted() : unit.phones;
    unit.phones = [...phones];
    primaryFollows = primaryFollows || unit.phones.some(([, stress]) => stress === 1);
  }
  if (units.length && !units.some((unit) => unit.phones.some(([, stress]) => stress))) {
    for (const unit of [...units].reverse()) {
      if (unit.phones.some(([phone]) => VOWEL_SET.has(phone))) {
        unit.phones = promote(unit.phones);
        break;
      }
    }
  }
}

export function joinClause(units) {
  for (let index = 0; index + 1 < units.length; index++) {
    const unit = units[index], following = units[index + 1];
    if (!unit.phones.length || !following.phones.length || !VOWEL_SET.has(following.phones[0][0])) continue;
    const [last, stress] = unit.phones.at(-1), head = unit.phones.slice(0, -1);
    if (unit.lastWord === "the" && last === "ə") unit.phones = [...head, ["ɪ", stress]];
    else if (unit.lastWord === "to" && last === "ə") unit.phones = [...head, ["ʊ", stress]];
    else if (NO_LINK_BEFORE.has(following.firstWord)) continue;
    else if (SPLIT[last]) unit.phones = [...head, [SPLIT[last], stress], ["ɹ", 0]];
    else if (RHOTIC.has(last)) unit.phones = [...unit.phones, ["ɹ", 0]];
    else if (last === "t" && FLAP_BEFORE_VOWEL.has(unit.word) && unit.phones.length > 1 && VOWEL_SET.has(unit.phones.at(-2)[0])) {
      unit.phones = [...head, ["ɾ", 0]];
    }
  }
}

export function groups(units) {
  const out = [];
  for (const unit of units) {
    if (unit.attach && out.length) out[out.length - 1] = [...out.at(-1), ...unit.phones];
    else out.push([...unit.phones]);
  }
  return out.filter((group) => group.length);
}

import { fromText, isArpabet } from "./convert.js";
import { ValueError } from "./symbols.js";

export const DATA = {};
const COLUMNS = /\t+| {2,}/;
const STRESS_CLASSES = new Set(["u", "uf", "ur", "s", "ss", "si", "pf", "p"]);
const words = (text) => text.trim().split(/\s+/).filter(Boolean);

export function rows(source) {
  const text = /\n| {2}|\t/.test(source) ? source : DATA[source], out = [];
  text.split("\n").forEach((raw, index) => {
    const line = raw.trim();
    if (line && !line.startsWith("#")) out.push([index + 1, line.split(COLUMNS).map((column) => column.trim())]);
  });
  return out;
}

export function functionWords() {
  const table = new Map();
  for (const [number, columns] of rows("function_words.txt")) {
    if (![3, 4].includes(columns.length) || !STRESS_CLASSES.has(columns[1])) {
      throw new ValueError(`function_words.txt line ${number}: expected word, class, form[, final form]`);
    }
    table.set(columns[0], [columns[1], fromText(columns[2]), columns.length === 4 ? fromText(columns[3]) : null]);
  }
  return table;
}

export function phrases() {
  const table = new Map();
  for (const [number, columns] of rows("phrases.txt")) {
    if (![3, 4].includes(columns.length) || !STRESS_CLASSES.has(columns[1])) {
      throw new ValueError(`phrases.txt line ${number}: expected words, class, form[, final form]`);
    }
    const forms = columns[2].split("|").map(fromText), key = words(columns[0]);
    if (forms.length > 1 && (columns[1] !== "p" || forms.length !== key.length)) {
      throw new ValueError(`phrases.txt line ${number}: a form with boundaries needs class p and one part per word`);
    }
    table.set(key.join(" "), [columns[1], forms, columns.length === 4 ? fromText(columns[3]) : null]);
  }
  return table;
}

function entries(source) {
  if (typeof source !== "string") return Object.entries(source).map(([word, pronunciation]) => [word, [word, pronunciation]]);
  return rows(source);
}

function pronunciation(text) {
  const symbols = words(text);
  return isArpabet(symbols) ? ["arpabet", symbols] : ["phones", fromText(text)];
}

export function pronunciations(source) {
  const table = new Map();
  for (const [where, columns] of entries(source)) {
    if (columns.length !== 2) throw new ValueError(`${where}: expected a word and its pronunciation, separated by a tab or two spaces`);
    if (words(columns[0]).length === 1) table.set(columns[0].toLowerCase(), pronunciation(columns[1]));
  }
  return table;
}

export function names(source) {
  const table = new Map();
  for (const [where, columns] of entries(source)) {
    const key = words(columns[0].toLowerCase());
    if (columns.length !== 2 || key.length < 2) continue;
    const parts = columns[1].split("|").map((part) => part.trim());
    if (parts.length !== key.length) {
      throw new ValueError(`${where}: '${columns[0]}' has ${key.length} words and ${parts.length} pronunciations; write one per word, separated by |`);
    }
    table.set(key.join(" "), parts.map(pronunciation));
  }
  return table;
}

export function mapping(name) {
  return new Map(rows(name).map(([, columns]) => [columns[0], columns.length > 1 ? columns[1] : ""]));
}

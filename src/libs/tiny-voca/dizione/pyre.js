export const IGNORECASE = 2;
export const MULTILINE = 8;
export const DOTALL = 16;
export const ASCII = 256;

const raw = String.raw;
const SPACE = raw`\t-\r\x1c-\x20\x85\xa0\u{1680}\u{2000}-\u{200a}\u{2028}\u{2029}\u{202f}\u{205f}\u{3000}`;
const CATEGORIES = {
  d: [raw`\p{Nd}`, "0-9"],
  w: [raw`\p{L}\p{N}_`, "A-Za-z0-9_"],
  s: [SPACE, raw`\t-\r\x20`],
};
const OTHER_DIGITS =
  raw`\xb2\xb3\xb9\u{1369}-\u{1371}\u{19da}\u{2070}\u{2074}-\u{2079}\u{2080}-\u{2089}\u{2460}-\u{2468}\u{2474}-\u{247c}` +
  raw`\u{2488}-\u{2490}\u{24ea}\u{24f5}-\u{24fd}\u{24ff}\u{2776}-\u{277e}\u{2780}-\u{2788}\u{278a}-\u{2792}` +
  raw`\u{10a40}-\u{10a43}\u{10e60}-\u{10e68}` +
  raw`\u{11052}-\u{1105a}\u{1f100}-\u{1f10a}`;
const SAME_UPPER =
  "69 131|73 17F|B5 3BC|345 3B9 1FBE|390 1FD3|3B0 1FE3|3B2 3D0|3B5 3F5|3B8 3D1|3BA 3F0|3C0 3D6|3C1 3F1|3C2 3C3|3C6 3D5|" +
  "432 1C80|434 1C81|43E 1C82|441 1C83|442 1C84 1C85|44A 1C86|463 1C87|1C88 A64B|1E61 1E9B|FB05 FB06";
const FIXES = new Map();
for (const group of SAME_UPPER.split("|")) {
  const codes = group.split(" ").map((code) => parseInt(code, 16));
  for (const code of codes) FIXES.set(code, codes.filter((other) => other !== code));
}
const ESCAPES = { n: 10, t: 9, r: 13, f: 12, v: 11, a: 7 };
const MAX_DIGITS = 4300;

const ALPHA = /^\p{L}+$/u;
const DECIMAL = /^\p{Nd}+$/u;
const DIGIT = new RegExp(`^[\\p{Nd}${OTHER_DIGITS}]+$`, "u");
const ALNUM = /^[\p{L}\p{N}]+$/u;
const SPACES = new RegExp(`^[${SPACE}]+$`, "u");
const NOT_SPACE = new RegExp(`[^${SPACE}]+`, "gu");
const LEFT_SPACE = new RegExp(`^[${SPACE}]+`, "u");
const RIGHT_SPACE = new RegExp(`[${SPACE}]+$`, "u");
const UPPER = /\p{Uppercase}/u;
const LOWER = /\p{Lowercase}/u;
const NOT_UPPER = /[\p{Lowercase}\p{Lt}]/u;
const NOT_LOWER = /[\p{Uppercase}\p{Lt}]/u;
const NOT_ASCII = /[^\x00-\x7f]/;
const INTEGER = /^([-+]?)(\p{Nd}+(?:_\p{Nd}+)*)$/u;

export function error(name, message = "") {
  const raised = new Error(message);
  raised.name = name;
  return raised;
}

export const isalpha = (text) => ALPHA.test(text);
export const isdecimal = (text) => DECIMAL.test(text);
export const isdigit = (text) => DIGIT.test(text);
export const isalnum = (text) => ALNUM.test(text);
export const isspace = (text) => SPACES.test(text);
export const isascii = (text) => !NOT_ASCII.test(text);
export const isupper = (text) => UPPER.test(text) && !NOT_UPPER.test(text);
export const islower = (text) => LOWER.test(text) && !NOT_LOWER.test(text);

export const len = (text) => {
  let count = 0;
  for (const _ of text) count += 1;
  return count;
};
export const chars = (text) => Array.from(text);
export const ord = (char) => char.codePointAt(0);

export function chr(code) {
  if (!(code >= 0 && code <= 0x10ffff)) throw error("ValueError", "chr() arg not in range(0x110000)");
  return String.fromCodePoint(code);
}

export function charAt(text, offset) {
  return offset >= 0 && offset < text.length ? String.fromCodePoint(text.codePointAt(offset)) : "";
}

export function charBefore(text, offset) {
  if (offset <= 0 || offset > text.length) return "";
  const low = text.charCodeAt(offset - 1);
  if (low >= 0xdc00 && low <= 0xdfff && offset > 1) {
    const high = text.charCodeAt(offset - 2);
    if (high >= 0xd800 && high <= 0xdbff) return text.slice(offset - 2, offset);
  }
  return text[offset - 1];
}

export function tail(text, count) {
  let start = text.length;
  for (let left = count; left > 0 && start > 0; left--) start -= charBefore(text, start).length;
  return text.slice(start);
}

export function item(list, index) {
  const place = index < 0 ? index + list.length : index;
  if (!(place >= 0 && place < list.length)) throw error("IndexError", "list index out of range");
  return list[place];
}

export function compare(a, b) {
  const left = Array.from(a);
  const right = Array.from(b);
  for (let index = 0; index < left.length && index < right.length; index++) {
    const difference = left[index].codePointAt(0) - right[index].codePointAt(0);
    if (difference) return difference;
  }
  return left.length - right.length;
}

export function divmod(a, b) {
  const quotient = Math.floor(a / b);
  return [quotient, a - quotient * b];
}

export function fields(text) {
  return text.match(NOT_SPACE) || [];
}

function strippers(characters) {
  const set = new Set(characters);
  return [(text) => {
    let start = 0;
    while (start < text.length && set.has(charAt(text, start))) start += charAt(text, start).length;
    return text.slice(start);
  }, (text) => {
    let end = text.length;
    while (end > 0 && set.has(charBefore(text, end))) end -= charBefore(text, end).length;
    return text.slice(0, end);
  }];
}

export function lstrip(text, characters = null) {
  return characters === null ? text.replace(LEFT_SPACE, "") : strippers(characters)[0](text);
}

export function rstrip(text, characters = null) {
  return characters === null ? text.replace(RIGHT_SPACE, "") : strippers(characters)[1](text);
}

export function strip(text, characters = null) {
  return lstrip(rstrip(text, characters), characters);
}

export function partition(text, separator) {
  const at = text.indexOf(separator);
  return at < 0 ? [text, "", ""] : [text.slice(0, at), separator, text.slice(at + separator.length)];
}

export function rpartition(text, separator) {
  const at = text.lastIndexOf(separator);
  return at < 0 ? ["", "", text] : [text.slice(0, at), separator, text.slice(at + separator.length)];
}

export function ljust(text, width, fill = " ") {
  return text + fill.repeat(Math.max(0, width - len(text)));
}

export function combining(char) {
  const last = String.fromCodePoint(0x345);
  if ("\u{f73}\u{f75}\u{f81}".includes(char)) return false;
  return char === last || (last + char).normalize("NFD") !== last + char.normalize("NFD");
}

function digitValue(char) {
  const code = char.codePointAt(0);
  if (code < 0x80) return code - 48;
  let zero = code;
  while (DECIMAL.test(String.fromCodePoint(zero - 1))) zero -= 1;
  return (code - zero) % 10;
}

export function int(text) {
  const found = INTEGER.exec(strip(String(text)));
  if (!found) throw error("ValueError", `invalid literal for int() with base 10: '${text}'`);
  const figures = Array.from(found[2].replaceAll("_", ""), digitValue).join("");
  if (figures.length > MAX_DIGITS) throw error("ValueError", "Exceeds the limit (4300 digits) for integer string conversion");
  const number = Number(figures);
  if (Number.isSafeInteger(number)) return found[1] === "-" ? -number : number;
  return found[1] === "-" ? -BigInt(figures) : BigInt(figures);
}

function lowerCode(code) {
  return String.fromCodePoint(code).toLowerCase().codePointAt(0);
}

function upperCode(code) {
  return String.fromCodePoint(code).toUpperCase().codePointAt(0);
}

function isCased(code, ascii) {
  if (ascii) return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
  return code !== lowerCode(code) || code !== upperCode(code);
}

let lowered = null;

function loweredTo(code) {
  if (lowered === null) {
    lowered = new Map();
    for (let other = 0; other < 0x20000; other++) {
      if (other >= 0xd800 && other <= 0xdfff) continue;
      const low = lowerCode(other);
      if (low === other) continue;
      if (!lowered.has(low)) lowered.set(low, []);
      lowered.get(low).push(other);
    }
  }
  return (lowerCode(code) === code ? [code] : []).concat(lowered.get(code) || []);
}

function caseless(codes, ascii) {
  const out = new Set();
  for (const code of codes) {
    if (ascii) {
      out.add(code);
      if (isCased(code, true)) out.add(code ^ 32);
      continue;
    }
    const low = lowerCode(code);
    for (const same of [low].concat(FIXES.get(low) || [])) for (const other of loweredTo(same)) out.add(other);
  }
  return [...out].sort((a, b) => a - b);
}

function parse(pattern, flags) {
  const text = Array.from(pattern);
  const names = new Map();
  let at = 0;
  let groups = 0;

  const fail = (message) => error("ValueError", `${message} at position ${at} of the pattern ${pattern}`);
  const eat = (char) => {
    if (text[at] !== char) return false;
    at += 1;
    return true;
  };
  const expect = (char) => {
    if (!eat(char)) throw fail(`missing ${char}`);
  };
  const until = (char) => {
    const start = at;
    while (at < text.length && text[at] !== char) at += 1;
    if (at >= text.length) throw fail(`missing ${char}`);
    at += 1;
    return text.slice(start, at - 1).join("");
  };
  const hex = (size) => {
    const value = text.slice(at, at + size).join("");
    if (value.length !== size || !/^[0-9a-fA-F]+$/.test(value)) throw fail("bad escape");
    at += size;
    return parseInt(value, 16);
  };
  const number = () => {
    const start = at;
    while (at < text.length && /^[0-9]$/.test(text[at])) at += 1;
    return text.slice(start, at).join("");
  };
  const group = (name) => {
    if (/^[0-9]+$/.test(name)) return Number(name);
    if (!names.has(name)) throw fail(`unknown group name ${name}`);
    return names.get(name);
  };

  function escape(inClass) {
    const char = text[at++];
    if (char === undefined) throw fail("bad escape");
    if ("dDwWsS".includes(char)) return { type: "category", kind: char.toLowerCase(), negate: char !== char.toLowerCase() };
    if (char === "x") return { type: "char", code: hex(2) };
    if (char === "u") return { type: "char", code: hex(4) };
    if (char === "U") return { type: "char", code: hex(8) };
    if (char === "0") return { type: "char", code: 0 };
    if (char in ESCAPES) return { type: "char", code: ESCAPES[char] };
    if (inClass) {
      if (char === "b") return { type: "char", code: 8 };
    } else {
      if (char === "b" || char === "B") return { type: "boundary", negate: char === "B" };
      if (char === "A") return { type: "start" };
      if (char === "Z") return { type: "end", last: true };
      if (/^[1-9]$/.test(char)) {
        const second = /^[0-9]$/.test(text[at] || "") ? text[at++] : "";
        return { type: "same", group: Number(char + second) };
      }
    }
    if (/^[A-Za-z0-9]$/.test(char)) throw fail(`bad escape \\${char}`);
    return { type: "char", code: char.codePointAt(0) };
  }

  function set(mode) {
    const node = { type: "set", negate: eat("^"), items: [], caseless: mode.caseless, ascii: mode.ascii };
    let first = true;
    for (;;) {
      if (at >= text.length) throw fail("unterminated character set");
      if (text[at] === "]" && !first) break;
      first = false;
      const low = text[at] === "\\" ? (at++, escape(true)) : { type: "char", code: text[at++].codePointAt(0) };
      if (low.type === "char" && text[at] === "-" && at + 1 < text.length && text[at + 1] !== "]") {
        at += 1;
        const high = text[at] === "\\" ? (at++, escape(true)) : { type: "char", code: text[at++].codePointAt(0) };
        if (high.type !== "char" || high.code < low.code) throw fail("bad character range");
        node.items.push({ type: "range", from: low.code, to: high.code });
      } else {
        node.items.push(low);
      }
    }
    at += 1;
    return node;
  }

  function scoped(mode) {
    const letters = { i: "caseless", a: "ascii", s: "dotall", m: "multiline", u: null };
    const changed = { ...mode };
    let value = true;
    for (;;) {
      const char = text[at++];
      if (char === ":" || char === ")") {
        if (char === ")") throw fail("flags for the whole pattern are given as an argument");
        return changed;
      }
      if (char === "-") value = false;
      else if (char in letters) {
        if (letters[char]) changed[letters[char]] = value;
      } else throw fail("unknown flag");
    }
  }

  function open(mode) {
    if (!eat("?")) {
      const index = ++groups;
      return { type: "group", kind: "capture", index, body: choice(mode) };
    }
    const char = text[at++];
    if (char === ":") return { type: "group", kind: "plain", body: choice(mode) };
    if (char === "=" || char === "!") return { type: "group", kind: char === "=" ? "ahead" : "notAhead", body: choice(mode) };
    if (char === "<") {
      const next = text[at++];
      if (next !== "=" && next !== "!") throw fail("unknown extension");
      return { type: "group", kind: next === "=" ? "behind" : "notBehind", body: choice(mode) };
    }
    if (char === "P") {
      if (eat("=")) {
        const node = { type: "same", group: group(until(")")) };
        at -= 1;
        return node;
      }
      expect("<");
      const name = until(">");
      const index = ++groups;
      names.set(name, index);
      return { type: "group", kind: "capture", index, body: choice(mode) };
    }
    if (char === "(") {
      const node = { type: "if", group: group(until(")")), yes: branch(mode), no: [] };
      if (eat("|")) node.no = branch(mode);
      return node;
    }
    if (char === "#") {
      until(")");
      at -= 1;
      return { type: "group", kind: "plain", body: { type: "choice", branches: [[]] } };
    }
    if (char === ">") throw fail("atomic groups are not supported");
    at -= 1;
    return { type: "group", kind: "plain", body: choice(scoped(mode)) };
  }

  function repeat(node) {
    const start = at;
    let least = 0;
    let most = Infinity;
    if (eat("*")) most = Infinity;
    else if (eat("+")) least = 1;
    else if (eat("?")) most = 1;
    else if (eat("{")) {
      const low = number();
      const comma = eat(",");
      const high = comma ? number() : low;
      if (!eat("}") || (low === "" && high === "")) {
        at = start;
        return null;
      }
      least = low === "" ? 0 : Number(low);
      most = high === "" ? Infinity : Number(high);
    } else return null;
    const lazy = eat("?");
    if (!lazy && text[at] === "+") throw fail("possessive repeats are not supported");
    return { type: "repeat", node, least, most, lazy };
  }

  function branch(mode) {
    const nodes = [];
    while (at < text.length && text[at] !== "|" && text[at] !== ")") {
      const char = text[at++];
      let node;
      if (char === "(") {
        node = open(mode);
        expect(")");
      } else if (char === "[") node = set(mode);
      else if (char === ".") node = { type: "any", dotall: mode.dotall };
      else if (char === "^") node = { type: "start", multiline: mode.multiline };
      else if (char === "$") node = { type: "end", multiline: mode.multiline };
      else if (char === "\\") node = escape(false);
      else node = { type: "char", code: char.codePointAt(0) };
      if (node.type === "char" || node.type === "category" || node.type === "boundary" || node.type === "same") {
        node.caseless = mode.caseless;
        node.ascii = mode.ascii;
      }
      const repeated = "*+?{".includes(text[at] || " ") ? repeat(node) : null;
      nodes.push(repeated || node);
    }
    return nodes;
  }

  function choice(mode) {
    const branches = [branch(mode)];
    while (eat("|")) branches.push(branch(mode));
    return { type: "choice", branches };
  }

  const tree = choice({
    caseless: Boolean(flags & IGNORECASE),
    ascii: Boolean(flags & ASCII),
    dotall: Boolean(flags & DOTALL),
    multiline: Boolean(flags & MULTILINE),
  });
  if (at < text.length) throw fail("unbalanced parenthesis");
  return { tree, groups, names };
}

function quote(code) {
  const char = String.fromCodePoint(code);
  return /^[A-Za-z0-9]$/.test(char) ? char : `\\u{${code.toString(16)}}`;
}

function listed(codes) {
  let out = "";
  for (let index = 0; index < codes.length; index++) {
    let end = index;
    while (end + 1 < codes.length && codes[end + 1] === codes[end] + 1) end += 1;
    out += end > index + 1 ? `${quote(codes[index])}-${quote(codes[end])}` : quote(codes[index]) + (end > index ? quote(codes[end]) : "");
    index = end;
  }
  return out;
}

function contains(node, index) {
  if (node.type === "group") return (node.kind === "capture" && node.index === index) || node.body.branches.some((nodes) => nodes.some((inner) => contains(inner, index)));
  if (node.type === "repeat") return contains(node.node, index);
  return false;
}

function build(parsed, shift) {
  const map = Array.from({ length: parsed.groups + 1 }, () => []);
  const latest = new Map();
  let count = shift;
  map[0].push(0);

  const category = (node) => CATEGORIES[node.kind][node.ascii ? 1 : 0];

  function setSource(node) {
    let codes = [];
    let simple = "";
    const others = [];
    let cased = false;
    for (const part of node.items) {
      if (part.type === "category") {
        const inner = CATEGORIES[part.kind][node.ascii ? 1 : 0];
        if (part.negate) others.push(`[^${inner}]`);
        else simple += inner;
      } else if (!node.caseless) {
        simple += part.type === "char" ? quote(part.code) : `${quote(part.from)}-${quote(part.to)}`;
      } else {
        const from = part.type === "char" ? part.code : part.from;
        const to = part.type === "char" ? part.code : part.to;
        for (let code = from; code <= to; code++) {
          codes.push(code);
          cased = cased || isCased(code, node.ascii);
        }
      }
    }
    if (codes.length) simple += listed(cased ? caseless(codes, node.ascii) : codes.sort((a, b) => a - b));
    if (!others.length) return `[${node.negate ? "^" : ""}${simple}]`;
    const any = (simple ? [`[${simple}]`] : []).concat(others).join("|");
    return node.negate ? `(?:(?!${any})[^])` : `(?:${any})`;
  }

  function one(node) {
    if (node.type === "char") {
      if (!node.caseless || !isCased(node.code, node.ascii)) return quote(node.code);
      const codes = caseless([node.code], node.ascii);
      return codes.length === 1 ? quote(codes[0]) : `[${listed(codes)}]`;
    }
    if (node.type === "category") return `[${node.negate ? "^" : ""}${category(node)}]`;
    if (node.type === "set") return setSource(node);
    if (node.type === "any") return node.dotall ? "[^]" : "[^\\n]";
    if (node.type === "start") return node.multiline ? "(?<![^\\n])" : "^";
    if (node.type === "end") return node.last ? "$" : node.multiline ? "(?=\\n|$)" : "(?=\\n?$)";
    if (node.type === "boundary") {
      const word = `[${CATEGORIES.w[node.ascii ? 1 : 0]}]`;
      return node.negate
        ? `(?:(?<=${word})(?=${word})|(?<!${word})(?!${word}))`
        : `(?:(?<=${word})(?!${word})|(?<!${word})(?=${word}))`;
    }
    if (node.type === "same") {
      if (node.caseless) throw error("ValueError", "a group repeated without regard to case is not supported");
      if (!latest.has(node.group)) throw error("ValueError", `group ${node.group} is repeated before it is closed`);
      return `(?:\\${latest.get(node.group)})`;
    }
    if (node.type === "repeat") {
      const inner = one(node.node);
      const unit = ["char", "category", "set", "any", "group"].includes(node.node.type) && !/^\(\?<?[=!]/.test(inner) ? inner : `(?:${inner})`;
      const most = node.most === Infinity ? "" : String(node.most);
      const times =
        node.least === 0 && node.most === Infinity ? "*"
        : node.least === 1 && node.most === Infinity ? "+"
        : node.least === 0 && node.most === 1 ? "?"
        : node.least === node.most ? `{${node.least}}` : `{${node.least},${most}}`;
      return unit + times + (node.lazy ? "?" : "");
    }
    if (node.type === "group") {
      if (node.kind === "capture") {
        const index = ++count;
        map[node.index].push(index);
        const inner = any(node.body);
        latest.set(node.index, index);
        return `(${inner})`;
      }
      const opening = { plain: "(?:", ahead: "(?=", notAhead: "(?!", behind: "(?<=", notBehind: "(?<!" }[node.kind];
      return `${opening}${any(node.body)})`;
    }
    throw error("ValueError", "a test for a group can only follow that group in the same sequence");
  }

  function sequence(nodes) {
    const at = nodes.findIndex((node) => node.type === "if");
    if (at < 0) return nodes.map(one).join("");
    const test = nodes[at];
    const where = nodes.findIndex((node, index) => index < at && contains(node, test.group));
    if (where < 0) throw error("ValueError", "a test for a group can only follow that group in the same sequence");
    const holder = nodes[where];
    const head = nodes.slice(0, where);
    const middle = nodes.slice(where + 1, at);
    const rest = nodes.slice(at + 1);
    const optional = holder.type === "repeat" && holder.least === 0 && holder.most === 1;
    if (!optional && !(holder.type === "group" && holder.kind === "capture" && holder.index === test.group)) {
      throw error("ValueError", "a test for a group needs that group to be optional or always present");
    }
    if (!optional) return sequence([...head, holder, ...middle, ...test.yes, ...rest]);
    const present = [holder.node, ...middle, ...test.yes, ...rest];
    const absent = [...middle, ...test.no, ...rest];
    const order = holder.lazy ? [absent, present] : [present, absent];
    return `${sequence(head)}(?:${order.map(sequence).join("|")})`;
  }

  function any(node) {
    return node.branches.map(sequence).join("|");
  }

  const source = any(parsed.tree);
  return { source: shift ? `(?=([^]*))(?:${source})(?!\\1)` : source, map };
}

export function translate(pattern, flags = 0) {
  const parsed = parse(pattern, flags);
  const { source, map } = build(parsed, 0);
  return { source, flags: "u", groups: parsed.groups, names: Object.fromEntries(parsed.names), map };
}

export function toRegExp(pattern, flags = 0, jsFlags = "gu") {
  return new RegExp(translate(pattern, flags).source, jsFlags.includes("u") ? jsFlags : jsFlags + "u");
}

class Match {
  constructor(pattern, regex, found, text) {
    this.re = pattern;
    this.regex = regex;
    this.found = found;
    this.string = text;
    this.from = found.index;
    this.to = found.index + found[0].length;
    this.spans = null;
  }

  place(id) {
    const index = typeof id === "string" ? this.re.names.get(id) : id;
    if (index === undefined || !(index >= 0 && index <= this.re.groups)) throw error("IndexError", "no such group");
    for (const place of this.regex.map[index]) if (this.found[place] !== undefined) return place;
    return -1;
  }

  value(id) {
    const place = this.place(id);
    return place < 0 ? null : this.found[place];
  }

  group(...ids) {
    if (ids.length === 0) return this.found[0];
    return ids.length === 1 ? this.value(ids[0]) : ids.map((id) => this.value(id));
  }

  groups(missing = null) {
    const out = [];
    for (let index = 1; index <= this.re.groups; index++) out.push(this.value(index) ?? missing);
    return out;
  }

  groupdict(missing = null) {
    const out = {};
    for (const [name, index] of this.re.names) out[name] = this.value(index) ?? missing;
    return out;
  }

  span(id = 0) {
    if (id === 0) return [this.from, this.to];
    const place = this.place(id);
    if (place < 0) return [-1, -1];
    if (this.spans === null) {
      const twin = this.re.twin(this.regex);
      twin.lastIndex = this.from;
      this.spans = twin.exec(this.string).indices;
    }
    return this.spans[place];
  }

  start(id = 0) {
    return this.span(id)[0];
  }

  end(id = 0) {
    return this.span(id)[1];
  }
}

class Pattern {
  constructor(pattern, flags = 0) {
    this.pattern = pattern;
    this.flags = flags;
    this.parsed = parse(pattern, flags);
    this.groups = this.parsed.groups;
    this.names = this.parsed.names;
    const { source, map } = build(this.parsed, 0);
    this.source = source;
    this.map = map;
    this.made = new Map();
    this.twins = new Map();
  }

  regex(kind) {
    if (!this.made.has(kind)) {
      let regex;
      if (kind === "search") regex = new RegExp(this.source, "gu");
      else if (kind === "match") regex = new RegExp(this.source, "yu");
      else if (kind === "full") regex = new RegExp(`(?:${this.source})$`, "yu");
      else {
        const { source, map } = build(this.parsed, 1);
        regex = new RegExp(source, "yu");
        regex.map = map;
      }
      regex.map = regex.map || this.map;
      this.made.set(kind, regex);
    }
    return this.made.get(kind);
  }

  twin(regex) {
    if (!this.twins.has(regex)) this.twins.set(regex, new RegExp(regex.source, "dyu"));
    return this.twins.get(regex);
  }

  run(kind, text, start) {
    const regex = this.regex(kind);
    regex.lastIndex = start;
    const found = regex.exec(text);
    return found === null ? null : new Match(this, regex, found, text);
  }

  search(text, start = 0) {
    return this.run("search", text, start);
  }

  match(text, start = 0) {
    return this.run("match", text, start);
  }

  fullmatch(text) {
    return this.run("full", text, 0);
  }

  finditer(text) {
    const out = [];
    let at = 0;
    while (at <= text.length) {
      const found = this.run("search", text, at);
      if (found === null) break;
      out.push(found);
      at = found.to;
      if (found.to > found.from) continue;
      const more = this.run("advance", text, at);
      if (more !== null) {
        out.push(more);
        at = more.to;
      } else {
        at += Math.max(1, charAt(text, at).length);
      }
    }
    return out;
  }

  findall(text) {
    return this.finditer(text).map((found) => (this.groups === 0 ? found.group(0) : this.groups === 1 ? found.value(1) ?? "" : found.groups("")));
  }

  sub(replacement, text) {
    const found = this.finditer(text);
    if (!found.length) return text;
    const fill = typeof replacement === "function" ? replacement : template(replacement);
    let out = "";
    let at = 0;
    for (const match of found) {
      out += text.slice(at, match.from) + fill(match);
      at = match.to;
    }
    return out + text.slice(at);
  }

  split(text) {
    const out = [];
    let at = 0;
    for (const match of this.finditer(text)) {
      out.push(text.slice(at, match.from), ...match.groups());
      at = match.to;
    }
    out.push(text.slice(at));
    return out;
  }
}

function template(text) {
  const parts = [];
  const pattern = /\\(?:g<([^>]*)>|([1-9][0-9]?)|([\s\S]))|([^\\]+)/g;
  for (const [, name, index, escaped, plain] of text.matchAll(pattern)) {
    if (plain !== undefined) parts.push(plain);
    else if (name !== undefined) parts.push({ group: /^[0-9]+$/.test(name) ? Number(name) : name });
    else if (index !== undefined) parts.push({ group: Number(index) });
    else if (escaped in ESCAPES) parts.push(String.fromCodePoint(ESCAPES[escaped]));
    else if (escaped === "\\") parts.push("\\");
    else if (/^[A-Za-z0-9]$/.test(escaped)) throw error("ValueError", `bad escape \\${escaped}`);
    else parts.push("\\" + escaped);
  }
  return (match) => parts.map((part) => (typeof part === "string" ? part : match.value(part.group) ?? "")).join("");
}

const compiled = new Map();

export function compile(pattern, flags = 0) {
  if (pattern instanceof Pattern) return pattern;
  const key = flags + ":" + pattern;
  let made = compiled.get(key);
  if (made === undefined) {
    if (compiled.size >= 2000) compiled.clear();
    made = new Pattern(pattern, flags);
    compiled.set(key, made);
  }
  return made;
}

export const search = (pattern, text, flags = 0) => compile(pattern, flags).search(text);
export const match = (pattern, text, flags = 0) => compile(pattern, flags).match(text);
export const fullmatch = (pattern, text, flags = 0) => compile(pattern, flags).fullmatch(text);
export const finditer = (pattern, text, flags = 0) => compile(pattern, flags).finditer(text);
export const findall = (pattern, text, flags = 0) => compile(pattern, flags).findall(text);
export const sub = (pattern, replacement, text, flags = 0) => compile(pattern, flags).sub(replacement, text);
export const split = (pattern, text, flags = 0) => compile(pattern, flags).split(text);

export function escape(text) {
  return text.replace(/[()[\]{}?*+\-|^$\\.&~# \t\n\r\v\f]/g, "\\$&");
}

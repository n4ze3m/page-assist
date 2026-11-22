import { PUNCTUATION } from "./symbols.js";
import * as tables from "./tables.js";
import { convert, fromText, isArpabet } from "./convert.js";
import * as re from "./pyre.js";
import {
  charAt, charBefore, chars, chr, combining, compare, divmod, error, fields, int, isalnum, isalpha, isascii, isdigit,
  islower, isspace, isupper, item, len, ljust, lstrip, ord, partition, rpartition, rstrip, strip, tail,
} from "./pyre.js";

const r = String.raw;

export const Word = (text, rest = {}) => ({ text, attach: false, raw: "", spell: false, phones: null, ...rest });
export const Punct = (mark) => ({ mark });
const isPunct = (token) => token.mark !== undefined;

const _SPELL = chr(0xe000), _END = chr(0xe001), _INLINE = chr(0xe003), _INLINE_BASE = 0xe100;
const _ONES = fields("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen " +
  "seventeen eighteen nineteen");
const _TENS = fields("twenty thirty forty fifty sixty seventy eighty ninety");
const _SCALES = ["thousand", "million", "billion", "trillion", "quadrillion", "quintillion"];
const _ORDINAL = new Map([["one", "first"], ["two", "second"], ["three", "third"], ["five", "fifth"], ["eight", "eighth"],
  ["nine", "ninth"], ["twelve", "twelfth"]]);
const _MONTHS = fields("January February March April May June July August September October November December");
const _MONTH_NUMBER = new Map(_MONTHS.map((name, index) => [name.toLowerCase().slice(0, 3), index + 1]));
const _MONTH_PATTERN = _MONTHS.join("|") + "|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec";
const _DAY_NAMES = new Map([["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"],
  ["sat", "Saturday"], ["sun", "Sunday"]]);
const _DAY_PATTERN = "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Thurs|Thur|Tues|Mon|Tue|Wed|Thu|Fri|Sat|Sun";
const _CURRENCY = new Map([["$", ["dollar", "dollars", "cent", "cents"]], ["£", ["pound", "pounds", "penny", "pence"]],
  ["€", ["euro", "euros", "cent", "cents"]], ["¥", ["yen", "yen", "", ""]], ["₹", ["rupee", "rupees", "paisa", "paise"]]]);
for (const [code, names] of [["USD", _CURRENCY.get("$")], ["EUR", _CURRENCY.get("€")], ["GBP", _CURRENCY.get("£")],
  ["JPY", _CURRENCY.get("¥")], ["INR", _CURRENCY.get("₹")], ["CHF", ["Swiss franc", "Swiss francs", "centime", "centimes"]],
  ["CAD", ["Canadian dollar", "Canadian dollars", "cent", "cents"]],
  ["AUD", ["Australian dollar", "Australian dollars", "cent", "cents"]], ["CNY", ["yuan", "yuan", "", ""]]]) {
  _CURRENCY.set(code, names);
}
const _CURRENCY_CODES = "USD|EUR|GBP|JPY|INR|CHF|CAD|AUD|CNY";
const _SCALE_LETTER = new Map([["k", "thousand"], ["m", "million"], ["b", "billion"], ["bn", "billion"], ["t", "trillion"]]);
const _FRACTION = new Map([[2, ["half", "halves"]], [4, ["quarter", "quarters"]]]);
const _SYMBOL_WORDS = new Map([["&", "and"], ["@", "at"], ["+", "plus"], ["=", "equals"], ["%", "percent"], ["×", "times"],
  ["÷", "divided by"], ["±", "plus or minus"], ["©", "copyright"], ["§", "section"], ["°", "degrees"],
  ["≥", "greater than or equal to"], ["≤", "less than or equal to"], ["≠", "not equal to"], ["≈", "approximately"],
  ["∞", "infinity"], ["√", "square root of"], ["π", "pi"]]);
const _COMPARISONS = new Map([[">=", "greater than or equal to"], ["<=", "less than or equal to"], ["!=", "not equal to"]]);
const _INITIALISMS = new Set(fields("US IT AI ID UN EU UK LA AD BC AM PM OS PE PA MA LED SAT RIP ER"));
const _SOUNDS = new Set(fields("sh shh ss zz hm hmm mm tsk psst pfft hmph psh pssh"));
const _IS = chr(0xe006);
const _COMPARED = re.compile(r`(?P<gap>[ \t]?)(?P<sign>>=|<=|!=|[<>≥≤≠])(?P=gap)`);
const _VALUE_BEFORE = re.compile(r`(?:(?<![\w.,])\d[\d.,]*%?|(?<![\w'’.-])[A-Za-z]|[)\]])$`);
const _VALUE_AFTER = re.compile(r`(?:[-+]?[$£€¥₹]?\d[\d.,]*%?(?!\w)|\.\d|[A-Za-z](?![\w'’])|[(\[])`);
const _CLAUSE_OPENERS = new Set(fields("if elif while when whenever where whether that because since as and or but so then think thinks " +
  "thought know knows say says said suppose assume means implies hence thus therefore although though " +
  "unless until once else also clearly obviously indeed here now again first next finally similarly " +
  "otherwise however moreover"));
const _SIGN = r`[<>+*/^≤≥≠≈×÷±]`;
const _SPACED_SIGN = r` [<>+*≤≥≠≈×÷±] `;
const _NO_PHRASE = r`(?![\w'’-]|\s+(?!(?:and|or|then|if|when|where|while|for|is|are|was|but|so|in|to)\b)[A-Za-z])`;
const _LETTER_PLACES = [
  r`(?<![\w'’.-])(?P<letter>[Aakur])(?=` + _IS + r`?\s?[<>!=]?=)`,
  r`[<>!=]?=\s?(?P<letter>[Aakur])` + _NO_PHRASE,
  r`(?<![\w'’.-])(?P<letter>[Aakur])(?=` + _IS + r`?` + _SIGN + r`(?:[\w($]|\.\d))`,
  r`(?<=[\w)` + _IS + r`]` + _SIGN + r`)(?<![Ww]/)(?P<letter>[Aakur])(?![\w'’-])`,
  r`(?<![\w'’.-])(?P<letter>[Aakur])(?=` + _IS + r`?` + _SPACED_SIGN + r`(?:[A-Za-z]|\d[\d.,]*)(?![\w'’]))`,
  r`(?<![\w'’.])(?:[A-Za-z]|\d[\d.,]*)` + _IS + r`?` + _SPACED_SIGN + r`(?P<letter>[Aakur])` + _NO_PHRASE,
  r`(?<=\()(?P<letter>[Aakur])(?=\)|, )`,
  r`(?<=, )(?P<letter>[Aakur])(?=\))`,
  r`(?:(?<=\s)|^)(?P<letter>[akur])(?=\)\s)`,
].map((pattern) => re.compile(pattern));
const _ANGLES = re.compile(r`(?<![\w)` + _END + _IS + r`])<[A-Za-z0-9/!?][^<>(){}+*;|\n]*>` +
  r`|(?<=[\w` + _END + _IS + r`])<[^<>(){}+*;|\n]{1,80}>(?![\w$])` +
  r`|</?[A-Za-z][\w-]+/?>`);
const _ANGLE_MARK = chr(0xe005);

function _withoutAngles(text) {
  while (text.includes("<") && text.includes(">")) {
    const marked = _ANGLES.sub((match) => _ANGLE_MARK + match.group(0).slice(1, -1) + _ANGLE_MARK, text);
    if (marked === text) break;
    text = marked;
  }
  return text;
}

const _JOINED_COMPARISON = re.compile(r`(?<=[\w)` + _END + _IS + r`])[<>](?=[\w(` + _SPELL + r`]|\.\d| minus \d)`);
const _FIGURE_BEFORE = re.compile(r`(?<![\w.,])\d[\d.,]*%?$`);
const _FIGURE_AFTER = re.compile(r`(?:\d[\d.,]*%?(?!\w)|\.\d| minus \d)`);
const _LETTER_BEFORE = re.compile(r`(?:(?<![\w'’.])[A-Za-z]|[)` + _END + r`])$`);
const _LETTER_AFTER = re.compile(r`(?:[A-Za-z](?![\w'’])|[(` + _SPELL + r`])`);
const _SENTENCE_STARTERS = new Set(fields("the he she it i we they this that there but and in on at a an if when what why how who my our " +
  "you then so now after before however"));
const _YEAR_CONTEXT = new Set(fields("in since by from until till before after during around circa of year early late mid summer winter " +
  "spring fall autumn class"));
const _CARDINAL_AFTER = new Set(fields("war chapter part book volume act scene section phase type class level stage title article " +
  "appendix world"));
const _LABELLED = new Set(fields("plan vitamin grade type option class section part team group exhibit appendix point model series " +
  "hepatitis level"));
const _ROMAN = new Map([["II", 2], ["III", 3], ["IV", 4], ["VI", 6], ["VII", 7], ["VIII", 8], ["IX", 9], ["XI", 11], ["XII", 12],
  ["XIII", 13], ["XIV", 14], ["XV", 15], ["XVI", 16], ["XVIII", 18], ["XX", 20]]);
const _LEADING_APOSTROPHE = new Set(["'em", "'tis", "'twas", "'til", "'cause", "'bout", "'round", "'n"]);
const _EMOJI = re.compile("[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]+");
const _EMOTICON = re.compile(
  r`(?<![A-Za-z0-9])(?:[:;=]['^-]?[DPpOo3|/\\*\]\[}{><]+|[)(\]\[][-^']?[:;=]|<3+|</3|\^_?\^|-_-|[oO]_[oO]|>_<|T_T|\\o/|:'[()])(?![A-Za-z0-9])` +
  r`|[:;]['^-]?[)(]+` +
  r`|(?<![A-Za-z0-9)])=['^-]?[)(]+|=['^-]?[)(]+(?![A-Za-z0-9(.$-])` +
  r`|(?<=[A-Za-z]{2})<3+(?![.,]?\d)`);

const _PHONE_WORDS = new Set(fields("call dial ring phone telephone tel mobile cell fax hotline text sms whatsapp"));
const _PHONE_LINKS = new Set(fields("to on at or us me him her them back"));
const _PIN_WORDS = new Set(fields("code pin extension ext passcode password zip postcode cvv cvc otp"));
const _STRONG_WORDS = new Set(fields("number id reference ref serial account tracking booking confirmation"));
const _WEAK_WORDS = new Set(fields("order ticket invoice case claim policy receipt transaction parcel shipment container payment " +
  "reservation membership customer batch lot item job issue bug request"));
const _LINK_WORDS = new Set(fields("is was are were ends ending in with starts starting begins beginning"));
const _NOT_COUNTED = new Set(fields("is was has does goes ships arrives departs leaves shows needs blocks remains includes contains " +
  "says reads starts ends closes opens runs takes comes this his its us as yes plus minus less"));
const _NUMBERED = new Set(fields("ref reference serial account order invoice tracking part model phone tel fax id room flight case " +
  "ticket policy licence license booking customer vat tax reg registration"));
const _DATE_BEFORE = new Set(fields("on dated due until till by since from before after for shipped delivered arriving arrives arrive " +
  "arrived expires expired ends ending starts starting begins beginning monday tuesday wednesday " +
  "thursday friday saturday sunday mon tue tues wed thu thur thurs fri sat sun"));
const _CLASSIC_FRACTIONS = new Set([2, 3, 4, 5, 6, 8, 10, 16, 32, 64, 100]);
const _RATIO_WORDS = new Set(fields("ratio ratios scale odds aspect mix split proportion"));
const _DURATION_WORDS = new Set(fields("lasted took duration runtime recording video clip track lap pace length long"));
const _CLOCK_WORDS = new Set(fields("window slot open opens opening hours shift session served service available booked appointment " +
  "delivery arrive arrives arriving"));
const _CAPITAL_WORDS = new Set(fields("IN ON AT TO OF BY OR IS AS IF NO SO WE HE MY ME DO GO UP AN AM PM BE IT US THE AND FOR BUT NOT " +
  "ALL"));
const _SHORT_WORDS = new Set(fields("my to in on of go up no do me we us it is at by be so or an as if he hi ok"));
const _ZONES = "ET|CT|MT|PT|EST|EDT|CST|CDT|MST|MDT|PST|PDT|GMT|UTC|BST|CET|CEST|IST|AEST|AEDT|JST";
const _SIZES = "XXXL|XXL|XXS|XL|XS|S|M|L";
const _LENGTHS = "mm|cm|km|m|ft|in|inch|inches|feet|foot|metres?|meters?|yards?|yd|px|pixels?";
const _VERSIONED = "version|ver|release|firmware|patch|kernel|build|python|node|nodejs|ios|ipados|macos|watchos|tvos|android|" +
  "chrome|firefox|safari|java|php|ruby|rust|swift|kotlin|golang|django|rails|react|angular|vue|docker|" +
  "kubernetes|ubuntu|debian|fedora|windows|linux|postgres|postgresql|mysql|redis|numpy|pytorch|tensorflow|cuda|" +
  "xcode|gcc|clang|unity|minecraft|typescript|bluetooth|usb|hdmi|opengl|vulkan|directx|" +
  "upgrade[ds]?|update[ds]?|downgrade[ds]?";
const _SEPARATORS = new Map([[".", "dot"], ["/", "slash"], ["@", "at"], ["-", "dash"], ["_", "underscore"], [":", "colon"],
  ["=", "equals"], ["&", "and"], ["+", "plus"]]);
const _HALF_DAY = r`(?:\s?([AaPp])\.[Mm]\.?|\s?([AaPp])[Mm]\b)`;
const _AMOUNT = r`(?P<whole>\d{1,3}(?:,\d{3})+|\d+)(?:\.(?P<fraction>\d+))?`;
const _MONEY = re.compile(r`(?:(?<![\w.])(?P<minus>-)\s?)?(?P<symbol>[$£€¥₹]|(?<![A-Za-z])(?:` + _CURRENCY_CODES + r`)(?![A-Za-z]))\s?` +
  r`(?P<inner>-)?` + _AMOUNT + r`(?:\s?(?P<scale>thousand|million|billion|trillion|bn|[kKmMbB])(?![A-Za-z]))?`);
const _SIGN_AFTER = r`[$£€¥₹](?![\w$£€¥₹])|(?:` + _CURRENCY_CODES + r`)(?![A-Za-z])`;
const _MONEY_AFTER = re.compile(r`(?:(?<![\w.])(?P<minus>-)\s?)?(?<![\w.,^])` +
  r`(?P<whole>\d{1,3}(?:,\d{3})+|[1-9]\d{0,2}(?: \d{3})+|\d+)(?:\.(?P<fraction>\d+))?` +
  r`\s?(?P<symbol>` + _SIGN_AFTER + r`)`);
const _RANGE_BEFORE_SIGN = re.compile(r`(?<![\w.,-])(\d[\d,]*(?:\.\d+)?)-(?=\d[\d,]*(?:\.\d+)?\s?(?:` + _SIGN_AFTER + r`))`);
const _CONTINENTAL = re.compile(r`(?<![\w.,])([1-9]\d{0,2}(?:\.\d{3})+),(\d{1,2})(?!\d|[.,]\d)`);
const _COMMA_AFTER_SIGN = re.compile(r`((?:[$£€¥₹]|(?<![A-Za-z])(?:` + _CURRENCY_CODES + r`))\s?-?\d+),(\d{1,2})(?!\d|[.,]\d)`);
const _COMMA_BEFORE_SIGN = re.compile(r`(?<![\w.,])(\d+),(\d{1,2})(?=\s?(?:%|` + _SIGN_AFTER + r`))`);
const _FORMULA_SIGN = chr(0xe004);
const _FORMULA_END = re.compile(r`(?<![\w$])(?<!\d\s)\$(?:(?=[^\s\d$.,;:!?)])[^$\n]{0,80}` +
  r`|(?=\d)[^$\n]{0,80}[=^_\\{}+*/<>][^$\n]{0,80}` +
  r`|(?=\s)[^$\n]{0,80}[=^_\\{}+*<>][^$\n]{0,80})\d\s?\$(?![\w$])`);
const _VULGAR = re.compile(r`(?<![\d.,/])(?:(\d+)\s?)?([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒])`);
const _ADDRESS = re.compile(
  r`(?P<url>(?:https?://|www\.)[^\s<>\"']+)` +
  r`|(?P<mail>[\w.+-]+@[\w-]+(?:\.[\w-]+)+)` +
  r`|(?P<file>(?<![\w@./-])(?P<folder>/?(?:[\w~-]+/)+)?(?P<stem>[\w-]+(?:\.[\w-]+)*)\.(?P<ending>[A-Za-z][A-Za-z0-9]{0,9})` +
  r`(?![\w-])(?P<path>/[^\s<>\"']*)?)`);
const _DAY_RANGE = re.compile(r`\b(` + _DAY_PATTERN + "|" + _MONTH_PATTERN + r`)\b(\.?)\s?[-–]\s?(` + _DAY_PATTERN + "|" +
  _MONTH_PATTERN + r`)\b(\.?)`);
const _RATIO = re.compile(r`(?<![\d:.,])(\d{1,3}):(\d{1,3}(?:,\d{3})+|\d+)(?![\d:]|[.,]\d)`);
const _CODE = re.compile(r`(?<![\w.,/-])(#)?([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)(?![\w-]|[.,]\d)`);
const _SLASHED = re.compile(r`(?<![\w.,/-])(\d+(?:/\d+){2,})(?![\w/]|[.,]\d)`);
const _GROUPED = re.compile(
  r`(?<![\w.,:/#+-])(?P<plus>\+)?(?:(?P<lead>[A-Z]{2}) )?` +
  r`(?P<core>[A-Z0-9]*\d[A-Z0-9]*(?: [A-Z0-9]*\d[A-Z0-9]*)+)` +
  r`(?(lead)(?: (?P<trail>[A-Z]{2})(?![\w]))?)` +
  r`(?![\w]|[.,:/-]\d|\s?[%°])`);
const _GLUED = re.compile(r`(?<![\w'.])(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]+(?![\w']|\.\d)`);

const _ACCENT_DECIDES = new Map([["résumé", "R EH1 Z AH0 M EY2"], ["resumé", "R EH1 Z AH0 M EY2"], ["exposé", "EH2 K S P OW0 Z EY1"],
  ["rosé", "R OW0 Z EY1"], ["pâté", "P AA0 T EY1"], ["maté", "M AA1 T EY2"], ["saké", "S AA1 K EY2"],
  ["lamé", "L AA0 M EY1"]]);
const _ACCENTED = re.compile(r`\b(` + [..._ACCENT_DECIDES.keys()].join("|") + r`)(s?)\b`, re.IGNORECASE);
const _LETTER_FORMS = new Map([["ß", "ss"], ["æ", "ae"], ["Æ", "Ae"], ["œ", "oe"], ["Œ", "Oe"], ["ø", "o"], ["Ø", "O"], ["đ", "d"],
  ["ł", "l"], ["Ł", "L"]]);

function _plainLetter(char) {
  if (isascii(char) || !isalpha(char)) return char;
  if (_LETTER_FORMS.has(char)) return _LETTER_FORMS.get(char);
  const base = chars(char.normalize("NFKD")).filter((c) => !combining(c)).join("");
  return isascii(base) && isalpha(base) ? base : char;
}

export function cardinal(number) {
  if (number < 0) return "minus " + cardinal(-number);
  if (number < 20) return _ONES[number];
  if (number < 100) {
    const [tens, ones] = divmod(number, 10);
    return _TENS[tens - 2] + (ones ? " " + _ONES[ones] : "");
  }
  if (number < 1000) {
    const [hundreds, rest] = divmod(number, 100);
    return _ONES[hundreds] + " hundred" + (rest ? " " + cardinal(rest) : "");
  }
  let left = BigInt(number);
  if (left >= 1000n ** BigInt(_SCALES.length + 1)) return digits(String(left));
  const parts = [];
  for (let power = _SCALES.length; power > 0; power--) {
    const count = Number(left / 1000n ** BigInt(power));
    left %= 1000n ** BigInt(power);
    if (count) parts.push(cardinal(count) + " " + _SCALES[power - 1]);
  }
  if (left) parts.push(cardinal(Number(left)));
  return parts.join(" ");
}

export function ordinal(number) {
  const words = cardinal(number).split(" ");
  const last = words[words.length - 1];
  words[words.length - 1] = _ORDINAL.get(last) || (last.endsWith("y") ? last.slice(0, -1) + "ieth" : last + "th");
  return words.join(" ");
}

export function digits(text, zero = "zero") {
  return chars(text).filter(isdigit).map((c) => (c === "0" ? zero : _ONES[int(c)])).join(" ");
}

export function year(number) {
  if (!(1000 <= number && number <= 2999)) return cardinal(number);
  const [high, low] = divmod(number, 100);
  if (low === 0) return high % 10 === 0 ? cardinal(number) : cardinal(high) + " hundred";
  if (high === 20 && low < 10) return "two thousand " + _ONES[low];
  return cardinal(high) + (low < 10 ? " oh " + _ONES[low] : " " + cardinal(low));
}

export function pairs(number) {
  const [high, low] = divmod(number, 100);
  if (!(100 <= number && number <= 9999) || (low === 0 && (high < 10 || high % 10 === 0))) return cardinal(number);
  if (low === 0) return cardinal(high) + " hundred";
  return cardinal(high) + (low < 10 ? " oh " + _ONES[low] : " " + cardinal(low));
}

export function numberWords(text) {
  const [whole, , fraction] = partition(text.replaceAll(",", ""), ".");
  if (fraction) return (whole ? cardinal(int(whole)) : "") + " point " + digits(fraction);
  if ((len(whole) > 1 && whole.startsWith("0")) || len(whole) > 18) return digits(whole);
  return cardinal(int(whole));
}

export function duration(hours, minutes, seconds) {
  const parts = [[hours, "hour"], [minutes, "minute"], [seconds, "second"]].filter(([count]) => count)
    .map(([count, name]) => `${cardinal(count)} ${count === 1 ? name : name + "s"}`);
  if (parts.length < 2) return parts.length ? parts[0] : "zero seconds";
  return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

function _pluralOf(words) {
  let [head, , last] = rpartition(words, " ");
  last = last.endsWith("y") ? last.slice(0, -1) + "ies" : last + "s";
  return (head ? head + " " : "") + last;
}

function _fractionWords(top, bottom, article = false) {
  const [one, many] = _FRACTION.get(bottom) || [ordinal(bottom), ordinal(bottom) + "s"];
  if (top !== 1) return `${cardinal(top)} ${many}`;
  return (article ? ("aeiou".includes(one[0]) ? "an " : "a ") : "one ") + one;
}

function _versionPart(part) {
  return len(part) > 2 ? digits(part) : numberWords(part);
}

function _minor(part) {
  return part.startsWith("0") ? digits(part, "oh") : cardinal(int(part));
}

function _shortNumber(text) {
  if (text.startsWith("0")) return false;
  const rest = chars(text).slice(1);
  return len(text) <= 2 || (rest.length > 0 && rest.every((c) => c === "0"));
}

function _spelled(letters) {
  return `${_SPELL}${letters}${_END}`;
}

function _before(text, position, count = 4) {
  const clause = re.split(r`[.!?;…]\s|[()\"]`, tail(text.slice(0, position), 80)).at(-1);
  return re.findall(r`[A-Za-z]+`, clause).map((word) => word.toLowerCase()).slice(-count);
}

function _identifier(text, position) {
  const words = _before(text, position);
  if (!words.length) return null;
  if (_PHONE_WORDS.has(words.at(-1)) || (_PHONE_LINKS.has(words.at(-1)) && words.slice(-3, -1).some((word) => _PHONE_WORDS.has(word)))) {
    return "phone";
  }
  let index = words.length - 1;
  while (index > 0 && _LINK_WORDS.has(words[index])) index -= 1;
  for (const [kind, group] of [["phone", _PHONE_WORDS], ["pin", _PIN_WORDS], ["strong", _STRONG_WORDS], ["weak", _WEAK_WORDS]]) {
    if (group.has(words[index])) return kind;
  }
  return words.at(-1) === "enter" ? "enter" : null;
}

function _decimalComma(text) {
  return re.fullmatch(r`\d+,\d{1,2}`, text) ? text.replaceAll(",", ".") : text;
}

function _addressDigits(text) {
  if (len(text) <= 2 && !(len(text) === 2 && text[0] === "0")) return cardinal(int(text));
  if (len(text) === 4 && 1900 <= int(text) && int(text) <= 2099) return year(int(text));
  return digits(text);
}

export class Normalizer {
  constructor(isWord = null) {
    this.isWord = isWord || (() => true);
    this.abbreviations = new Map(tables.rows("abbreviations.txt").map(([, columns]) => [columns[0], [columns[1], columns[2]]]));
    const short = [...this.abbreviations.keys(), "st", "dr"].filter((key) => len(key) === 2);
    const titles = [...new Set(short.flatMap((key) => [key[0].toUpperCase() + key.slice(1).toLowerCase(), key.toUpperCase()]))].sort(compare).join("|");
    const part = r`(?:[A-Za-z]|(?!(?:` + titles + r`)\.)[A-Z][A-Za-z])\.`;
    const last = r`(?:(?:(?<=[a-z]\.)[a-z]|(?<=[A-Z]\.)[A-Z])(?![A-Za-z\d]))`;
    this._dottedForm = re.compile(r`\b(?:(?:` + part + r`){2,}` + last + r`?` +
      r`|(?:[A-Z]|(?!(?:` + titles + r`)\.)[B-DF-HJ-NP-TV-Z][b-df-hj-np-tv-z])\.[A-Z](?![A-Za-z\d])` +
      r`|(?:[Ee]\.[Gg]|[Ii]\.[Ee])(?![A-Za-z\d]))`);
    this.units = new Map();
    this.exactUnits = new Map();
    for (const [, columns] of tables.rows("units.txt")) {
      if (columns.length > 3 && columns[3] === "exact") this.exactUnits.set(columns[0], [columns[1], columns[2]]);
      else this.units.set(columns[0].toLowerCase(), [columns[1], columns[2]]);
    }
    this.chat = new Map();
    this.replies = new Set();
    for (const [number, columns] of tables.rows("chat.txt")) {
      if (columns.length > 2 && !(columns.length === 3 && columns[2] === "alone")) {
        throw error("ValueError", `chat.txt line ${number}: after the words to say there can only be "alone"`);
      }
      this.chat.set(columns[0], columns.length > 1 ? columns[1] : "-");
      if (columns.length > 2) this.replies.add(columns[0]);
    }
    this.endings = tables.mapping("endings.txt");
    const names = [...new Set([...this.units.keys(), ...this.exactUnits.keys()].map(re.escape))]
      .sort((a, b) => len(b) - len(a) || compare(a, b));
    this._unitNames = names.join("|");
    this._unit = re.compile(r`(?<![\w.])(\d(?:[\d,]*\d)?(?:\.\d+)?)(?:[-–](\d(?:[\d,]*\d)?(?:\.\d+)?))?\s?(` + this._unitNames +
      r`)(?![A-Za-z])(\.(?=\s+(?-i:[a-z])))?`, re.IGNORECASE);
    this._area = re.compile(r`(?<![\w.])(\d[\d,]*(?:\.\d+)?)\s?(km|cm|mm|m|ft|mi|yd|in)([²³])`);
    this._areaPlain = re.compile(r`(?<![\w.])(\d[\d,]*(?:\.\d+)?)\s?(km|cm|mm|m|ft)([23])(?![\w])`);
    this.inline = [];
    this.dayFirst = false;
    this.dated = false;
  }

  _amount(symbol, whole, fraction, scale) {
    const [one, many, cent, cents] = _CURRENCY.get(symbol);
    if (scale) {
      scale = _SCALE_LETTER.get(scale.toLowerCase()) || scale.toLowerCase();
      return `${numberWords(whole + (fraction ? "." + fraction : ""))} ${scale} ${many}`;
    }
    if (fraction && (len(fraction) > 2 || !cent)) return `${numberWords(whole + "." + fraction)} ${many}`;
    const amount = int(whole), change = int(ljust(fraction || "0", 2, "0"));
    const parts = [];
    if (amount || !change) parts.push(`${cardinal(amount)} ${amount === 1 ? one : many}`);
    if (change && cent) parts.push(`${cardinal(change)} ${change === 1 ? cent : cents}`);
    return parts.join(" and ");
  }

  static _continental(match) {
    const groups = match.group(1).split(".");
    if (groups.length === 4 && groups.every((group) => int(group) <= 255)) return match.group(0);
    return groups.join(",") + "." + match.group(2);
  }

  _money(match) {
    const found = match.groupdict();
    const whole = found["whole"].replaceAll(",", "").replaceAll(" ", "");
    const words = this._amount(found["symbol"], whole, found["fraction"], found["scale"]);
    return (found["minus"] || found["inner"] ? " minus " : " ") + words + " ";
  }

  static _halfDay(match, dotted, plain) {
    if (!(dotted || plain)) return "";
    const following = lstrip(match.string.slice(match.end()));
    const first = re.match(r`[A-Za-z']+`, following);
    const closes = Boolean(dotted) && match.group(0).endsWith(".") && (
      !following || (isupper(charAt(following, 0)) && first !== null && _SENTENCE_STARTERS.has(first.group(0).toLowerCase())));
    return `${_SPELL}${(dotted || plain).toUpperCase()}M${_END}${closes ? " ." : ""} `;
  }

  _time(match) {
    const hour = int(match.group(1)), minute = int(match.group(2)), second = match.group(3);
    const half = match.group(4) || match.group(5);
    const before = _before(match.string, match.start(), 3);
    if (second !== null && !half && !(before.length && before.at(-1) === "at")) {
      return ` ${duration(hour, minute, int(second))} `;
    }
    if (hour > 24 && second === null && !half) {
      const after = re.match(r`\s*([A-Za-z]+)`, match.string.slice(match.end()));
      if (before.some((word) => _DURATION_WORDS.has(word)) || (after && _DURATION_WORDS.has(after.group(1).toLowerCase()))) {
        return ` ${duration(0, hour, minute)} `;
      }
      return ` ${cardinal(hour)} ${minute < 10 ? "oh " : ""}${cardinal(minute)} `;
    }
    if (hour > 24) return match.group(0);
    let words = cardinal(hour);
    if (minute === 0) {
      if (!half) {
        if (hour === 0) {
          words = "midnight";
        } else if (hour > 12) {
          words += " hundred";
        } else {
          words += " o'clock";
        }
      }
    } else {
      words += (minute < 10 ? " oh " : " ") + cardinal(minute);
    }
    if (second) words += " and " + cardinal(int(second)) + (int(second) === 1 ? " second" : " seconds");
    return ` ${words} ` + Normalizer._halfDay(match, match.group(4), match.group(5));
  }

  _dotTimes(match) {
    const following = match.string.slice(match.end());
    if (int(match.group(1)) > 23 || int(match.group(4)) > 23 || !_before(match.string, match.start()).some((word) => _CLOCK_WORDS.has(word)) ||
        re.match(r`\s?(?:%|percent|million|billion|` + this._unitNames + r`)(?![A-Za-z])`, following, re.IGNORECASE)) {
      return match.group(0);
    }
    return `${match.group(1)}:${match.group(2)}${match.group(3)}${match.group(4)}:${match.group(5)}`;
  }

  _ratio(match) {
    const first = match.group(1), second = match.group(2);
    if (len(first) <= 2 && len(second) === 2 && "012345".includes(second[0])) {
      const after = re.match(r`\s*([A-Za-z]+)`, match.string.slice(match.end()));
      if (!(_before(match.string, match.start(), 3).some((word) => _RATIO_WORDS.has(word)) ||
            (after && _RATIO_WORDS.has(after.group(1).toLowerCase())))) {
        return match.group(0);
      }
    }
    return ` ${numberWords(first)} to ${numberWords(second)} `;
  }

  _date(month, day, yearText = null, the = false) {
    if (!(1 <= month && month <= 12) || !(1 <= day && day <= 31)) return null;
    let words = the ? `the ${ordinal(day)} of ${_MONTHS[month - 1]}` : `${_MONTHS[month - 1]} ${ordinal(day)}`;
    if (yearText) {
      words += " " + (len(yearText) === 4 ? year(int(yearText)) : (int(yearText) < 10 ? "oh " : "") + cardinal(int(yearText)));
    }
    return ` ${words} `;
  }

  _slashDate(match) {
    let first = int(match.group(1)), second = int(match.group(2));
    if ((first > 12 && 12 >= second) || (this.dayFirst && second <= 12)) [first, second] = [second, first];
    return this._date(first, second, match.group(3)) || match.group(0);
  }

  _dotDate(match) {
    let day = int(match.group(1)), month = int(match.group(2));
    if (month > 12 && 12 >= day) [day, month] = [month, day];
    return this._date(month, day, match.group(3)) || match.group(0);
  }

  _dayMonth(match) {
    const month = match.group(2);
    const spoken = this._date(_MONTH_NUMBER.get(month.toLowerCase().slice(0, 3)), int(match.group(1)), match.group(4), true);
    if (spoken === null) return match.group(0);
    return spoken + (match.group(3) && _MONTHS.includes(month) ? ". " : "");
  }

  _daysOfMonth(match) {
    const monthFirst = isalpha(charAt(match.group(1), 0));
    let [month, first, second] = monthFirst ? [match.group(1), match.group(2), match.group(3)] :
      [match.group(3), match.group(1), match.group(2)];
    first = int(first);
    second = int(second);
    if (!(1 <= first && first <= 31 && 1 <= second && second <= 31)) return match.group(0);
    const name = _MONTHS[_MONTH_NUMBER.get(month.toLowerCase().slice(0, 3)) - 1];
    const words = monthFirst ? `${name} ${ordinal(first)} to ${ordinal(second)}` :
      `the ${ordinal(first)} to the ${ordinal(second)} of ${name}`;
    return ` ${words}${match.group(4) ? " " + year(int(match.group(4))) : ""} `;
  }

  _dayRange(match) {
    const names = [];
    for (const name of [match.group(1), match.group(3)]) {
      const key = name.toLowerCase();
      names.push(this.abbreviations.has(key) ? this.abbreviations.get(key)[1] : _DAY_NAMES.get(key) ?? name);
    }
    const following = lstrip(match.string.slice(match.end()));
    const first = re.match(r`[A-Za-z']+`, following);
    const ends = Boolean(match.group(4)) && (!following || (isupper(charAt(following, 0)) && first !== null &&
                                                            _SENTENCE_STARTERS.has(first.group(0).toLowerCase())));
    return `${names[0]} to ${names[1]}${ends ? " ." : ""}`;
  }

  _shortDate(match) {
    const firstText = match.group(1), secondText = match.group(2);
    if (len(firstText) > 2 || len(secondText) > 2) return null;
    let first = int(firstText), second = int(secondText);
    const before = _before(match.string, match.start());
    if (1 <= first && first <= 12 && 20 <= second && second <= 49 && before.includes("card")) {
      return ` ${_MONTHS[first - 1]} ${year(2000 + second)} `;
    }
    const last = before.length ? before.at(-1) : "";
    const classic = first < second && _CLASSIC_FRACTIONS.has(second);
    const zero = (len(firstText) === 2 && firstText[0] === "0") || (len(secondText) === 2 && secondText[0] === "0");
    if (!(zero || (12 < first && first <= 31 && second <= 12 && !(first === 24 && second === 7)) ||
          (_DATE_BEFORE.has(last) && (!classic || last === "on")) ||
          (this.dated && !classic && first !== second))) {
      return null;
    }
    if (first > 12 || (this.dayFirst && second <= 12)) [first, second] = [second, first];
    return this._date(first, second);
  }

  _fraction(match) {
    const spoken = this._shortDate(match);
    if (spoken) return spoken;
    const top = int(match.group(1)), bottom = int(match.group(2));
    if ((top === 24 && bottom === 7) || top === bottom) return ` ${cardinal(top)} ${cardinal(bottom)} `;
    if (!(0 < top && top < 100) || !(1 < bottom && bottom <= 100)) return ` ${cardinal(top)} over ${cardinal(bottom)} `;
    return ` ${_fractionWords(top, bottom)} `;
  }

  _mixedFraction(match) {
    const top = int(match.group(2)), bottom = int(match.group(3));
    if (!(0 < top && top < bottom)) return match.group(0);
    return ` ${numberWords(match.group(1))} and ${_fractionWords(top, bottom, true)} `;
  }

  _vulgar(match) {
    const [top, bottom] = match.group(2).normalize("NFKC").split("⁄").map((part) => int(part));
    if (match.group(1) === null) return ` ${top}/${bottom} `;
    return ` ${cardinal(int(match.group(1)))} and ${_fractionWords(top, bottom, true)} `;
  }

  _phone(match) {
    const groups = match.groups().filter((g) => g);
    return " " + groups.map((g) => (g === "800" ? "eight hundred" : digits(g, "oh"))).join(", ") + " ";
  }

  _measure(match) {
    const unit = match.group(3);
    const names = this.exactUnits.get(unit) || this.units.get(unit.toLowerCase());
    if (names === undefined || (len(unit) === 1 && ["-", "'", "/"].includes(charAt(match.string, match.end(3))))) {
      return match.group(0);
    }
    if (unit === "p" && isspace(charBefore(match.string, match.end(3) - 1)) && re.match(r`\.\s?\d`, match.string.slice(match.end(3)))) {
      return match.group(0);
    }
    const [one, many] = names;
    const value = _decimalComma(match.group(1)), upper = match.group(2) && _decimalComma(match.group(2));
    if (upper) return ` ${numberWords(value)} to ${numberWords(upper)} ${many} `;
    return ` ${numberWords(value)} ${["1", "1.0"].includes(value) ? one : many} `;
  }

  _square(match) {
    const unit = match.group(2);
    const names = new Map([["in", ["inch", "inches"]]]).get(unit) || this.exactUnits.get(unit) || this.units.get(unit);
    if (names === undefined) throw error("KeyError", unit);
    const [one, many] = names;
    const kind = "²2".includes(match.group(3)) ? "square" : "cubic";
    const value = _decimalComma(match.group(1));
    return ` ${numberWords(value)} ${kind} ${["1", "1.0"].includes(value) ? one : many} `;
  }

  _counted(text, end) {
    const after = re.match(r`\s*([A-Za-z]+)`, text.slice(end));
    if (!after) return false;
    const word = after.group(1).toLowerCase();
    if (["people", "men", "women", "children", "feet", "miles"].includes(word)) return true;
    return word.length > 3 && word.endsWith("s") && !word.endsWith("ss") && !_NOT_COUNTED.has(word) &&
      this.isWord(word.slice(0, -1));
  }

  _number(match, text) {
    const value = match.group(0);
    const plain = value.replaceAll(",", "");
    if (!plain.includes(".") && !value.includes(",") && !plain.startsWith("0") && len(plain) > 2) {
      const kind = _identifier(text, match.start());
      const limit = new Map([["phone", 3], ["pin", 3], ["strong", 4], ["enter", 4], ["weak", 5]]).get(kind) ?? 7;
      if (len(plain) >= limit && !(kind === null && plain.endsWith("000")) &&
          !(kind === "enter" && len(plain) === 4 && 1900 <= int(plain) && int(plain) <= 2099) &&
          !([null, "phone", "weak"].includes(kind) && this._counted(text, match.end()))) {
        return ` ${digits(plain, kind === "phone" ? "oh" : "zero")} `;
      }
    }
    if (!plain.includes(".") && !value.includes(",") && len(plain) === 4 && !plain.startsWith("0")) {
      const number = int(plain);
      const before = re.findall(r`[A-Za-z]+`, tail(text.slice(0, match.start()), 24));
      const after = re.match(r`\s*([A-Za-z]+)`, text.slice(match.end()));
      const counted = Boolean(after) && re.search(r`(?:[^s]s|people|men|women|children|feet|miles)$`, after.group(1).toLowerCase()) !== null;
      const dated = Boolean(before.length) && (_YEAR_CONTEXT.has(before.at(-1).toLowerCase()) ||
                                               _MONTH_NUMBER.has(before.at(-1).toLowerCase().slice(0, 3)));
      const model = re.search(r`(?<![A-Za-z])([A-Z]{2,5}) $`, text.slice(0, match.start()));
      if (model && !_CAPITAL_WORDS.has(model.group(1)) && !counted) return ` ${pairs(number)} `;
      if ((1100 <= number && number <= 1999) || (2000 <= number && number <= 2099 && (dated || !counted))) return ` ${year(number)} `;
    }
    return ` ${numberWords(value)} `;
  }

  _readsAsWord(letters) {
    const lower = letters.toLowerCase();
    if (lower.length < 3 || !this.isWord(lower)) return false;
    return lower.length > 3 || ["s", "es", "ed", "ing"].some((ending) => this.isWord(lower + ending));
  }

  static _alnum(group, zero = "zero") {
    return re.findall(r`[A-Za-z]+|\d+`, group).map((run) => (isdigit(run) ? digits(run, zero) : _spelled(run))).join(" ");
  }

  static _digitGroups(groups, zero = "zero") {
    if (groups.every((group) => _shortNumber(group) && len(group) <= 2)) {
      return groups.map((group) => cardinal(int(group))).join(" , ");
    }
    return groups.map((group) => digits(group, zero)).join(" , ");
  }

  _codeWords(groups, match) {
    const token = groups.join("-");
    if (!chars(token).some((char) => isdigit(char))) return null;
    const kinds = groups.map((g) => (isdigit(g) ? "d" : chars(g).some((c) => isdigit(c)) ? "m" : isupper(g) ? "u" : "l"));
    if (kinds.every((kind) => kind === "d")) {
      if (groups.length === 2) {
        const years = groups.every((g) => len(g) === 4 && 1000 <= int(g) && int(g) <= 2100);
        if (!(match.group(1) || groups.some((g) => len(g) > 1 && g[0] === "0") ||
              (Math.min(...groups.map((g) => len(g))) >= 4 && !years) ||
              ["strong", "pin"].includes(_identifier(match.string, match.start())))) {
          return null;
        }
      }
      return Normalizer._digitGroups(groups);
    }
    if (groups.length === 2 && kinds[1] === "d" && "ul".includes(kinds[0])) {
      const [letters, number] = groups;
      if ((kinds[0] === "l" && len(letters) > 1) || this._readsAsWord(letters)) return null;
      if (_shortNumber(number)) return `${_spelled(letters)} ${cardinal(int(number))}`;
      return `${_spelled(letters)} , ${digits(number)}`;
    }
    if (groups.length === 2 && kinds[0] === "d" && (kinds[1] === "l" || len(groups[1]) === 1 ||
                                                    re.fullmatch(r`\d+[A-Za-z]+`, groups[1]))) {
      return null;
    }
    if (groups.some((g, index) => (kinds[index] === "l" && len(g) > 2) ||
                                  (kinds[index] === "m" && re.fullmatch(r`\d+(?:s|st|nd|rd|th)`, g)))) {
      return null;
    }
    if (!chars(token).some((char) => isupper(char)) && (kinds.includes("l") || kinds.some((kind) => kind === "m"))) {
      return null;
    }
    const parts = [];
    groups.forEach((group, index) => {
      const kind = kinds[index];
      if (kind === "d") {
        parts.push(digits(group));
      } else if (kind === "m") {
        parts.push(Normalizer._alnum(group));
      } else if (len(group) > 3 && this.isWord(group.toLowerCase())) {
        parts.push(group);
      } else {
        parts.push(len(group) <= 5 ? _spelled(group) : group);
      }
    });
    return parts.join(" , ");
  }

  _code(match) {
    const words = this._codeWords(match.group(2).split("-"), match);
    if (words === null) return match.group(0);
    return (match.group(1) ? " number " : " ") + words + " ";
  }

  _grouped(match) {
    const text = match.string, plus = match.group("plus");
    let lead = match.group("lead"), trail = match.group("trail");
    const core = match.group("core").split(" ");
    let head = "", tail = "";
    if (_CAPITAL_WORDS.has(lead)) {
      [head, tail, lead, trail] = [lead + " ", trail ? " " + trail : "", null, null];
    }
    const kind = _identifier(text, match.start());
    const pure = core.every((part) => isdigit(part));
    if (pure && !plus && !lead) {
      const following = text.slice(match.end());
      const amount = this._counted(text, match.end()) || re.match(r`\s?(?:` + this._unitNames + r`)(?![A-Za-z])`, following,
        re.IGNORECASE) !== null;
      if (kind === null && core[0][0] !== "0" && len(core[0]) <= 3 && core.slice(1).every((part) => len(part) === 3) &&
          (core.at(-1) === "000" || (amount && core.length > 2))) {
        return head + core.join(",") + tail;
      }
      if (!(kind || (len(core[0]) > 1 && core[0][0] === "0") || (core.length > 2 && core.some((part) => len(part) > 2)))) {
        return match.group(0);
      }
    } else if (!pure && !lead && !plus && kind === null) {
      return match.group(0);
    }
    const zero = plus || kind === "phone" || (pure && core[0][0] === "0" && core.reduce((sum, part) => sum + len(part), 0) >= 10) ? "oh" : "zero";
    let spoken;
    if (pure) {
      spoken = Normalizer._digitGroups(core, zero);
    } else {
      spoken = core.map((part) => (isdigit(part) ? digits(part, zero) : Normalizer._alnum(part, zero))).join(" , ");
    }
    if (lead) spoken = `${_spelled(lead)} , ${spoken}`;
    if (trail) spoken = `${spoken} , ${_spelled(trail)}`;
    return head + (plus ? " plus " : " ") + spoken + " " + tail;
  }

  _glued(match) {
    const out = [];
    for (const run of re.findall(r`[A-Za-z]+|\d+`, match.group(0))) {
      if (isdigit(run)) {
        out.push(_shortNumber(run) ? cardinal(int(run)) : digits(run));
      } else if (len(run) === 1 || ((isupper(run) || len(run) <= 3) && !this._readsAsWord(run))) {
        out.push(_spelled(run));
      } else {
        out.push(run);
      }
    }
    return " " + out.join(" ") + " ";
  }

  _addressPart(part) {
    const lower = part.toLowerCase();
    if (len(part) > 1 && this.isWord(lower) && (len(part) > 2 || _SHORT_WORDS.has(lower))) return part;
    return len(part) <= 3 ? _spelled(part) : part;
  }

  _spokenAddress(core) {
    const pieces = re.findall(r`[A-Za-z]+|\d+|.`, core);
    const mail = core.includes("@");
    let host = false;
    const out = [];
    pieces.forEach((piece, index) => {
      const following = index + 1 < pieces.length ? pieces[index + 1] : "";
      if (piece === "@") host = true;
      if (isdigit(piece)) {
        out.push(_addressDigits(piece));
      } else if (!isalpha(piece)) {
        out.push(_SEPARATORS.get(piece) ?? "");
      } else if (index && pieces[index - 1] === "." && (host || !mail) && (
        ["", "/", ":", "?", "#"].includes(following) ||
          (len(piece) <= 3 && (this.endings.has(piece.toLowerCase()) || !this.isWord(piece.toLowerCase()))))) {
        out.push(this.endings.get(piece.toLowerCase()) === "word" ? piece.toLowerCase() : _spelled(piece));
      } else {
        let letters = "";
        for (const part of re.findall(r`[A-Z]?[a-z]+|[A-Z]+(?![a-z])`, piece)) {
          const spoken = this._addressPart(part);
          if (spoken.startsWith(_SPELL)) {
            letters += part;
            continue;
          }
          if (letters) {
            out.push(_spelled(letters));
            letters = "";
          }
          out.push(spoken);
        }
        if (letters) out.push(_spelled(letters));
      }
    });
    return out.filter((piece) => piece).join(" ");
  }

  _address(match) {
    const whole = match.group(0);
    const text = rstrip(whole, ".,;:!?)");
    const tail = whole.slice(text.length);
    if (match.group("file")) {
      const ending = match.group("ending");
      const known = this.endings.has(ending.toLowerCase());
      const marked = Boolean(match.group("folder") || match.group("path")) || match.group("stem").includes("_");
      if (!(known || (marked && len(ending) <= 5 && (islower(ending) || isupper(ending)) &&
                      !this.isWord(ending.toLowerCase())))) {
        return whole;
      }
    }
    const core = rstrip(re.sub(r`^(?:https?://)?(?:www\.)?`, "", text), "/");
    return ` ${this._spokenAddress(core)} ${tail}`;
  }

  _chatForm(match) {
    const said = this.chat.get(match.group(0).toLowerCase());
    if (said === undefined) return match.group(0);
    if (said === "-") return " ";
    return " " + fields(said).map((part) => (part.startsWith("*") ? `${_SPELL}${part.slice(1)}${_END}` : part)).join(" ") + " ";
  }

  _inline(match) {
    const symbols = fields(match.group(2));
    if (!symbols.length || symbols.every((symbol) => len(symbol) === 1 && isascii(symbol))) return match.group(0);
    let phones;
    try {
      phones = isArpabet(symbols) ? convert("", symbols) : fromText(symbols.join(" "));
    } catch {
      return match.group(0);
    }
    this.inline.push([match.group(1) || "", phones]);
    return ` ${_INLINE}${chr(_INLINE_BASE + this.inline.length - 1)}${_INLINE} `;
  }

  _dotted(match, text) {
    const letters = match.group(0).replaceAll(".", "");
    const key = letters.toLowerCase();
    const following = lstrip(text.slice(match.end()));
    let words;
    if (key === "eg") {
      words = "for example";
    } else if (key === "ie") {
      words = "that is";
    } else {
      words = `${_SPELL}${letters.toUpperCase()}${_END}`;
    }
    const first = re.match(r`[A-Za-z']+`, following);
    const endsSentence = !following || (isupper(charAt(following, 0)) && first && _SENTENCE_STARTERS.has(first.group(0).toLowerCase()));
    return ` ${words}${endsSentence && match.group(0).endsWith(".") ? " ." : ""} `;
  }

  _abbreviation(match, text) {
    const token = match.group(1), stop = match.group(2);
    const key = token.toLowerCase();
    const following = text.slice(match.end());
    const nextWord = re.match(r`\s*([A-Za-z]+|\d)`, following);
    const capitalNext = Boolean(nextWord) && isupper(nextWord.group(1)[0]);
    const capitalBefore = re.search(r`[A-Z][a-z]+\s+$`, text.slice(0, match.start())) !== null;
    if (["st", "dr"].includes(key) && isupper(token[0])) {
      if (capitalNext && (stop || key === "dr")) return key === "st" ? " saint " : " doctor ";
      if (capitalBefore && stop) return (key === "st" ? " street" : " drive") + (!strip(following) ? " ." : " ");
      return match.group(0);
    }
    if (!this.abbreviations.has(key)) return match.group(0);
    let [when, words] = this.abbreviations.get(key);
    const numberNext = Boolean(nextWord) && isdigit(nextWord.group(1));
    if (when === "title") {
      if (!(isupper(token[0]) && (capitalNext || stop))) return match.group(0);
    } else if (when === "number") {
      const previous = re.search(r`([A-Za-z]+)\.?\s+$`, text.slice(0, match.start()));
      if (!(stop && (numberNext || (key === "no" && previous && _NUMBERED.has(previous.group(1).toLowerCase()))))) {
        return match.group(0);
      }
    } else if (!stop || (when === "small" && isupper(token))) {
      return match.group(0);
    } else if (["mar", "sun", "sat", "jan", "dec", "max", "min", "est", "no"].includes(key) && !isupper(token[0]) && !numberNext) {
      if (!(["max", "min", "est"].includes(key) && nextWord && islower(nextWord.group(1)[0]))) return match.group(0);
    }
    if (key === "est" && !numberNext) words = "estimated";
    const endsSentence = when !== "title" && (!strip(following) || (capitalNext && _SENTENCE_STARTERS.has(nextWord.group(1).toLowerCase())));
    return ` ${words}${endsSentence ? " ." : ""} `;
  }

  rewrite(text) {
    text = _VULGAR.sub((match) => this._vulgar(match), text);
    text = this._area.sub((match) => this._square(match), text);
    text = text.replaceAll("²", " squared ").replaceAll("³", " cubed ");
    text = text.normalize("NFKC").replaceAll("⁄", "/").replaceAll("−", " minus ");
    if (!isascii(text)) {
      text = _ACCENTED.sub((m) => "{" + _ACCENT_DECIDES.get(m.group(1).toLowerCase()) + (m.group(2) ? " Z" : "") + "}", text);
      text = chars(text).map((char) => _plainLetter(char)).join("");
    }
    text = re.sub(r`(?<=\d)–(?=\d)`, "-", text);
    text = _DAY_RANGE.sub((match) => this._dayRange(match), text);
    for (const [old, fresh] of [["‘", "'"], ["’", "'"], ["‚", "'"], ["‛", "'"], ["`", "'"], ["´", "'"], ["“", '"'], ["”", '"'],
      ["„", '"'], ["‟", '"'], ["«", '"'], ["»", '"'], ["–", "—"], ["―", "—"], ["[", "("], ["]", ")"]]) {
      text = text.replaceAll(old, fresh);
    }
    this.inline = [];
    text = re.sub(r`([A-Za-z']+)?\{([^{}]*)\}`, (match) => this._inline(match), text);
    text = text.replaceAll("{", "(").replaceAll("}", ")");
    text = _ADDRESS.sub((match) => this._address(match), text);
    text = text.replaceAll("→", " to ");
    text = _EMOJI.sub(" ", text);
    text = _EMOTICON.sub(" ", text);
    text = re.sub(r`\.{3,}`, "…", text);
    text = re.sub(r`(?<=\d)\s-\s(?=\d[\d.,]*\s?=)`, " minus ", text);
    text = re.sub(r`(?<![\d.,/-])(\d[\d.,]*)-(?=\d[\d.,]*=)`, r`\1 minus `, text);
    text = re.sub(r`-{2,}|\s-\s`, "—", text);
    text = re.sub(r`\bw/o\b`, " without ", text, re.IGNORECASE);
    text = re.sub(r`\bw/(?=\s|$)`, " with ", text, re.IGNORECASE);
    text = re.sub(r`\bn/a\b`, " not applicable ", text, re.IGNORECASE);
    text = text.replaceAll("'n'", " 'n ");
    if (re.search(r`[<>≥≤≠]|!=`, text)) text = Normalizer._markComparisons(text);
    if (re.search(r`\d`, text)) text = this._figures(text);
    return this._signs(text);
  }

  _figures(text) {
    text = _FORMULA_END.sub((match) => match.group(0).slice(0, -1) + _FORMULA_SIGN, text);
    text = _CONTINENTAL.sub((match) => Normalizer._continental(match), text);
    text = _COMMA_AFTER_SIGN.sub(r`\1.\2`, text);
    text = _COMMA_BEFORE_SIGN.sub(r`\1.\2`, text);
    text = _MONEY.sub((match) => this._money(match), text);
    text = _RANGE_BEFORE_SIGN.sub(r`\1 to `, text);
    text = _MONEY_AFTER.sub((match) => this._money(match), text);
    text = re.sub(r`(?<![\w.])(\d[\d,]*(?:\.\d+)?)\s?¢`,
      (m) => ` ${numberWords(m.group(1))} ${m.group(1) === "1" ? "cent" : "cents"} `, text);

    const clock = r`\d{1,2}:[0-5]\d(?:\s?[AaPp]\.?[Mm]\.?)?|\b\d{1,2}\s?[AaPp]\.?[Mm]\.?`;
    text = re.sub(r`(` + clock + r`)\s(` + _ZONES + r`)\b`, (m) => `${m.group(1)} ${_spelled(m.group(2))}`, text);
    text = re.sub(r`(?<![\d.,:])(\d{1,2})\.([0-5]\d)(?=\s?[AaPp]\.?[Mm]\b)`, r`\1:\2`, text);
    text = re.sub(r`(?<![\d.,:])(\d{1,2})\.(00|15|30|45)(\s?(?:to|until|till|and|[-—])\s?)(\d{1,2})\.(00|15|30|45)(?!\d|\.\d)`,
      (match) => this._dotTimes(match), text);
    text = re.sub(r`(` + clock + r`)\s?[-—]\s?(?=\d{1,2}(?::[0-5]\d|\s?[AaPp]\.?[Mm]\b))`, r`\1 to `, text);
    text = _RATIO.sub((match) => this._ratio(match), text);
    text = re.sub(r`(?<![\d:])(\d{1,2}):([0-5]\d)(?::([0-5]\d))?` + _HALF_DAY + r`?(?![\d:])`, (match) => this._time(match), text);
    text = re.sub(r`(?<![\d.:,])(\d{1,2})` + _HALF_DAY + r`(?![A-Za-z])`,
      (m) => ` ${cardinal(int(m.group(1)))} ` + Normalizer._halfDay(m, m.group(2), m.group(3)), text);

    let seen = re.findall(r`(?<![\d/.])(\d{1,2})/(\d{1,2})(?:/(?:\d{4}|\d{2}))?(?![\d/])`, text).map(([a, b]) => [int(a), int(b)]);
    seen = seen.filter(([a, b]) => !(a === 24 && b === 7));
    this.dayFirst = seen.some(([a, b]) => a > 12 && 12 >= b) && !seen.some(([a, b]) => b > 12 && 12 >= a);
    this.dated = re.search(r`(?<![\d/])\d{1,2}/\d{1,2}/(?:\d{4}|\d{2})(?![\d/])`, text) !== null;
    text = re.sub(r`(?<![\d-])(\d{4})-(\d{1,2})-(\d{1,2})(?![\d-])`,
      (m) => this._date(int(m.group(2)), int(m.group(3)), m.group(1)) || m.group(0), text);
    text = re.sub(r`(?<![\d/])(\d{4})/(\d{1,2})/(\d{1,2})(?![\d/])`,
      (m) => this._date(int(m.group(2)), int(m.group(3)), m.group(1)) || m.group(0), text);
    text = re.sub(r`(?<![\d.])(\d{1,2})\.(\d{1,2})\.(\d{4})(?!\d|\.\d)`, (match) => this._dotDate(match), text);
    text = re.sub(r`(?<![\d/])(\d{1,2})/(\d{1,2})/(\d{4}|\d{2})(?![\d/])`, (match) => this._slashDate(match), text);
    text = re.sub(r`\b(` + _MONTH_PATTERN + r`)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s?[-—]\s?(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?(?![\d:])`,
      (match) => this._daysOfMonth(match), text);
    text = re.sub(r`(?<![\d.,/:-])(\d{1,2})(?:st|nd|rd|th)?\s?[-—]\s?(\d{1,2})(?:st|nd|rd|th)?\s+(` + _MONTH_PATTERN + r`)\b(?:,?\s+(\d{4}))?`,
      (match) => this._daysOfMonth(match), text);
    text = re.sub(r`\b(` + _MONTH_PATTERN + r`)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?(?![\d:])`,
      (m) => this._date(_MONTH_NUMBER.get(m.group(1).toLowerCase().slice(0, 3)), int(m.group(2)), m.group(3)) || m.group(0), text);
    text = re.sub(r`(?<![\d.,/:-])(\d{1,2})(?:st|nd|rd|th)?\s+(` + _MONTH_PATTERN + r`)\b(\.(?=\s+[a-z\d]))?(?:,?\s+(\d{4}))?`,
      (match) => this._dayMonth(match), text);

    text = re.sub(r`(?<![\d-])(?:\+?(1)[-.\s])?\(?(\d{3})\)?[-.\s](\d{3})[-.\s](\d{4})(?![\d-])`, (match) => this._phone(match), text);
    text = re.sub(r`(?<![\w.,-])(\d{3})-(\d{4})(?![\w-])`, (match) => this._phone(match), text);
    text = re.sub(r`(?<![\w.])([vV])?(\d+(?:\.\d+){2,})(?:-(\d+)(?![\w-]|\.\d))?(?![\w])`,
      (m) => " " + (m.group(1) ? _spelled(m.group(1)) + " " : "") +
        m.group(2).split(".").map((part) => _versionPart(part)).join(" point ") +
        (m.group(3) ? " dash " + numberWords(m.group(3)) : "") + " ", text);
    text = re.sub(r`(?<![\w.])([vV])(\d+)\.(\d{2,3})(?!\d|\.\d|\w)`,
      (m) => ` ${_spelled(m.group(1))} ${cardinal(int(m.group(2)))} point ${_minor(m.group(3))} `, text);
    text = re.sub(r`\b(` + _VERSIONED + r`)(\.?\s(?:(?:from|to)\s)?)(\d+)\.(\d{2,3})(?:(\s(?:to|or|and)\s)(\d+)\.(\d{2,3}))?(?!\d|\.\d|\s?%|\s(?:percent|million|billion)\b)`,
      (m) => `${m.group(1)}${m.group(2)}${cardinal(int(m.group(3)))} point ${_minor(m.group(4))}` +
        (m.group(5) ? `${m.group(5)}${cardinal(int(m.group(6)))} point ${_minor(m.group(7))}` : "") + " ",
      text, re.IGNORECASE);
    text = _CODE.sub((match) => this._code(match), text);
    text = _SLASHED.sub((m) => " " + Normalizer._digitGroups(m.group(1).split("/")) + " ", text);
    text = _GROUPED.sub((match) => this._grouped(match), text);

    text = re.sub(r`(?<![\w.])-(?=\d)`, " minus ", text);
    text = re.sub(r`(?:(?<=\d)\s?[xX×]|×)\s?(?=\d[\d.,]*\s?(?:` + _LENGTHS + r`)\b)`, " by ", text);
    text = re.sub(r`(?<=\d)\s[xX×]\s(?=\d)`, " times ", text);
    text = re.sub(r`(?<![\w/'])[A-Za-z0-9/]*[0-9/][A-Za-z0-9/]*(?![\w/'])`, (match) => this._chatForm(match), text);
    text = re.sub(r`(?<![\w.])'?(\d{2}|\d{4})'?s\b`,
      (m) => " " + _pluralOf(len(m.group(1)) === 4 ? year(int(m.group(1))) : cardinal(int(m.group(1)))) + " ", text);
    text = re.sub(r`(?<![\w.])(\d+)(?:st|nd|rd|th)\b`, (m) => ` ${ordinal(int(m.group(1)))} `, text);
    text = re.sub(r`(?<![\w.])(144|240|360|480|540|576|720|900|1080|1440|2160|4320)([pi])\b`,
      (m) => ` ${pairs(int(m.group(1)))} ${_spelled(m.group(2))} `, text);
    text = re.sub(r`(\d[\d,]*(?:\.\d+)?)\s?%`, (m) => ` ${numberWords(m.group(1))} percent `, text);
    text = this._areaPlain.sub((match) => this._square(match), text);
    text = this._unit.sub((match) => this._measure(match), text);
    text = re.sub(r`(?<![\d/.,-])(\d+) (\d)/(2|3|4|5|6|8|10|16)(?![\d/]|\.\d)`, (match) => this._mixedFraction(match), text);
    text = re.sub(r`(?<![\d/.])(\d+)/(\d+)(?![\d/]|\.\d)`, (match) => this._fraction(match), text);
    text = re.sub(r`(?<![\w.,-])(\d{4})[-–](\d{4})(?![\w.,-])`, (m) => ` ${year(int(m.group(1)))} to ${year(int(m.group(2)))} `, text);
    text = re.sub(r`(?<![\w.,-])(\d+)[-–](\d+)(?![\w-]|[.,]\d)`, (m) => ` ${numberWords(m.group(1))} to ${numberWords(m.group(2))} `, text);
    text = re.sub(r`(?<![\w.])(\d+)x\b`, (m) => ` ${numberWords(m.group(1))} times `, text);
    text = re.sub(r`(?<=\d)\^(?=\d)`, " to the power of ", text);
    return text;
  }

  static _namedLetters(text) {
    if (!chars("=<>+*/^()≤≥≠≈×÷±").some((sign) => text.includes(sign))) return text;
    const plain = _withoutAngles(text);
    const places = new Set(_LETTER_PLACES.flatMap((pattern) => pattern.finditer(plain).map((match) => match.start("letter"))));
    if (!places.size) return text;
    let out = "", index = 0;
    for (const char of text) {
      out += places.has(index) ? `${_SPELL}${char.toUpperCase()}${_END}` : char;
      index += char.length;
    }
    return out;
  }

  static _markComparisons(text) {
    const plain = _withoutAngles(text);

    const mark = (match) => {
      const before = plain.slice(0, match.start()), after = plain.slice(match.end());
      const value = _VALUE_BEFORE.search(before);
      if (plain[match.start("sign")] !== match.group("sign")[0] || value === null || !_VALUE_AFTER.match(after)) {
        return match.group(0);
      }
      let start = value.start();
      if (")]".includes(value.group(0))) {
        let depth = 0;
        while (start >= 0) {
          depth += (")]".includes(before[start]) ? 1 : 0) - ("([".includes(before[start]) ? 1 : 0);
          if (depth === 0) break;
          start -= 1;
        }
        while (start > 0 && (isalnum(charBefore(before, start)) || "_.".includes(before[start - 1]))) {
          start -= charBefore(before, start).length;
        }
      }
      const word = re.search(r`[A-Za-z']+$`, rstrip(before.slice(0, Math.max(start, 0))));
      if (word && !_CLAUSE_OPENERS.has(word.group(0).toLowerCase())) return match.group(0);
      return _IS + match.group(0);
    };

    return _COMPARED.sub(mark, text);
  }

  static _compared(match, words) {
    const marked = match.group(0).startsWith(_IS) || rstrip(match.string.slice(0, match.start()), " ").endsWith(_IS);
    return ` ${marked ? "is " : ""}${words} `;
  }

  _joinedComparisons(text) {
    const plain = _withoutAngles(text);

    const read = (match) => {
      const before = rstrip(text.slice(0, match.start()), _IS), after = text.slice(match.end());
      if (plain[match.start()] !== match.group(0)) return match.group(0);
      if (!(_FIGURE_BEFORE.search(before) || _FIGURE_AFTER.match(after) ||
            (_LETTER_BEFORE.search(before) && _LETTER_AFTER.match(after)))) {
        return match.group(0);
      }
      return Normalizer._compared(match, match.group(0) === "<" ? "less than" : "greater than");
    };

    return _JOINED_COMPARISON.sub(read, text);
  }

  _signs(text) {
    text = Normalizer._namedLetters(text);
    if (text.includes("<") || text.includes(">")) text = this._joinedComparisons(text);
    text = re.sub(r`(?<![\w-])(` + _SIZES + r`)-(` + _SIZES + r`)(?![\w-])`,
      (m) => ` ${_spelled(m.group(1))} to ${_spelled(m.group(2))} `, text);
    text = re.sub(r`#(?=\d)`, " number ", text);
    text = re.sub(r`#(?=[A-Z]{1,4}-?\d)`, " number ", text);
    text = re.sub(r`#(?=[A-Za-z])`, " hashtag ", text);
    text = re.sub(r`~(?=\s?\d)`, " about ", text);
    text = re.sub(r`(?<=[\w\s` + _END + _IS + r`])(>=|<=|!=)(?=[\w\s` + _SPELL + r`])`,
      (m) => Normalizer._compared(m, _COMPARISONS.get(m.group(1))), text);
    text = re.sub(r`(?<=\d) Ti\b`, ` ${_spelled("TI")}`, text);
    text = re.sub(r`\b([Rr])ef\.\s?[Nn]o\.(?=\s)`, r`\1eference number`, text);
    if (text.includes(".")) {
      text = re.sub(r`(?<![\w.])(?:[A-Z]\.(?: [A-Z]\.)+|[Ee]\. g\.|[Ii]\. e\.)`,
        (m) => (["E. G.", "I. E."].includes(m.group(0)) ? ` ${_spelled(m.group(0)[0] + m.group(0)[3])} ` : m.group(0).replaceAll(" ", "")), text);
      text = this._dottedForm.sub((m) => this._dotted(m, text), text);
    }
    text = re.sub(r`\b([A-Za-z]{1,6})\b(\.?)(?![A-Za-z'’])`, (m) => this._abbreviation(m, text), text);
    if (re.search(r`\d`, text)) {
      text = _GLUED.sub((match) => this._glued(match), text);
      text = re.sub(r`(?<![\w.])\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|(?<![\w.])\.\d+`, (m) => this._number(m, text), text);
    }
    text = re.sub(r`(?<=[A-Za-z])/(?=[A-Za-z])`, " ", text);
    text = re.sub(r`(?<=\d)` + _IS + r`?\s?[<>]\s?(?=\d)|(?<=\s)[<>](?=\s)`,
      (m) => Normalizer._compared(m, m.group(0).includes("<") ? "less than" : "greater than"), text);
    text = re.sub("[" + re.escape([..._SYMBOL_WORDS.keys()].join("")) + "]",
      (m) => ("≥≤≠".includes(m.group(0)) ? Normalizer._compared(m, _SYMBOL_WORDS.get(m.group(0))) : ` ${_SYMBOL_WORDS.get(m.group(0))} `), text);
    return text.replaceAll(_IS, "");
  }

  static _unstretched(word) {
    if (!re.search(r`(.)\1\1`, word)) return [];
    const cut = (doubleInside, doubleFinal) => {
      const replace = (match) => {
        const final = match.end() === word.length;
        return match.group(1).repeat((final ? doubleFinal : doubleInside) ? 2 : 1);
      };
      return re.sub(r`(.)\1{2,}`, replace, word);
    };
    const liked = Boolean(re.search(r`([lfsz])\1\1+$`, word)) || (word.length > 0 && chars(word).every((c) => c === "m")) ||
      re.sub(r`(.)\1{2,}$`, r`\1`, word) === "to";
    const ordered = [cut(true, liked), cut(true, !liked), cut(false, liked), cut(false, !liked)];
    return [...new Set(ordered)];
  }

  static _chatWords(chat, raw) {
    if (chat === "-") return [];
    return fields(chat).map((part) => (part.startsWith("*") ? Word(part.slice(1).toLowerCase(), { raw, spell: true }) :
      Word(part.toLowerCase(), { raw: part })));
  }

  static _reply(out, place) {
    const marks = [];
    for (const step of [-1, 1]) {
      let index = place + step;
      while (0 <= index && index < out.length && isPunct(out[index]) && "\"'()".includes(out[index].mark)) index += step;
      if (!(0 <= index && index < out.length)) {
        marks.push("");
      } else if (!isPunct(out[index])) {
        return false;
      } else {
        marks.push(out[index].mark);
        const beyond = 0 <= index + step && index + step < out.length ? out[index + step] : null;
        if (out[index].mark === "," && beyond !== null && !isPunct(beyond) && len(beyond.text) === 1 && beyond.text !== "i") {
          return false;
        }
      }
    }
    return !(marks[0] === "," && marks[1] === ",");
  }

  _wordTokens(raw, allCaps, previous, following = true, fresh = false) {
    const lower = raw.toLowerCase();
    const chat = this.chat.get(lower);
    if (chat !== undefined && (len(raw) > 1 || islower(raw)) && !this.replies.has(lower)) {
      return Normalizer._chatWords(chat, raw);
    }
    if (_ROMAN.has(raw) && previous && isupper(previous[0])) {
      const number = _ROMAN.get(raw);
      const words = _CARDINAL_AFTER.has(previous.toLowerCase()) ? cardinal(number) : "the " + ordinal(number);
      return fields(words).map((word) => Word(word, { raw }));
    }
    const letters = raw.replaceAll("'", "");
    const possessive = lower.endsWith("'s");
    const stem = possessive ? raw.slice(0, -2) : raw;
    if (len(stem) === 1 && isalpha(stem)) {
      const label = stem === "A" && previous && (!following || (!fresh && _LABELLED.has(previous.toLowerCase())));
      if (["a", "A", "I", "i"].includes(stem) && !possessive && !label) return [Word(stem.toLowerCase(), { raw })];
      return [Word(lower, { raw, spell: true })];
    }
    if (len(stem) > 2 && "SsZz".includes(stem[0]) && new Set(lower).size === 1 && (allCaps || !isupper(stem))) {
      return [Word(lower, { raw, phones: [[lower[0], 0]] })];
    }
    if (isupper(stem) && isalpha(stem) && 2 <= len(stem) && len(stem) <= 5 && (!allCaps || !this.isWord(stem.toLowerCase()))) {
      if (_INITIALISMS.has(stem) || !this.isWord(stem.toLowerCase())) return [Word(lower, { raw, spell: true })];
    }
    if (!isalpha(letters)) return [];
    const capitals = re.fullmatch(r`[a-z]+(?:[A-Z][a-z]+)*[A-Z]{2,}(?:'s)?`, raw) !== null;
    if (capitals || !this.isWord(lower)) {
      for (const candidate of capitals ? [] : Normalizer._unstretched(lower)) {
        if (this.isWord(candidate)) return [Word(candidate, { raw })];
      }
      const parts = re.findall(r`[A-Z]?[a-z']+|[A-Z]+(?![a-z])`, raw);
      if (parts.length > 1 && parts.join("") === raw) {
        const out = [];
        for (const part of parts) {
          const named = capitals && isupper(part) ? _INITIALISMS.has(part) : false;
          const spelled = len(part) === 1 || named || (isupper(part) && !this.isWord(part.toLowerCase()));
          if (capitals && out.length && out.at(-1).spell && (spelled || part === "'s")) {
            out[out.length - 1] = { ...out.at(-1), text: out.at(-1).text + part.toLowerCase(), raw: out.at(-1).raw + part };
          } else {
            out.push(Word(part.toLowerCase(), { attach: Boolean(out.length), raw: part, spell: spelled }));
          }
        }
        return out;
      }
    }
    return [Word(lower, { raw })];
  }

  tokens(text) {
    text = this.rewrite(text);
    const runs = re.findall(r`[A-Za-z]{2,}`, text);
    const allCaps = runs.length >= 3 && runs.filter((run) => isupper(run)).length >= 0.6 * runs.length;
    const out = [];
    const pattern = re.compile(
      _SPELL + r`([A-Za-z ]+)` + _END + r`|` + _INLINE + r`(.)` + _INLINE +
      r`|('?[A-Za-z]+(?:'[A-Za-z]+)*)|(\d+)|(-)|(\S)`);
    let attach = false;
    let previous = "";
    let fresh = true;
    const short = [];
    const replies = [];
    for (const match of pattern.finditer(text)) {
      let [spelled, inline, word, number, hyphen, other] = match.groups();
      const before = match.start() ? charBefore(text, match.start()) : " ";
      if (hyphen) {
        attach = Boolean(out.length) && !isPunct(out.at(-1)) && !isspace(before) &&
          match.end() < text.length && isalnum(charAt(text, match.end()));
        continue;
      }
      let added = [];
      if (spelled !== null) {
        added = [Word(spelled.replaceAll(" ", "").toLowerCase(), { raw: spelled, spell: true })];
      } else if (inline !== null) {
        const [written, phones] = item(this.inline, ord(inline) - _INLINE_BASE);
        added = [Word(written.toLowerCase(), { raw: written, phones })];
      } else if (word !== null) {
        if (word.startsWith("'") && !_LEADING_APOSTROPHE.has(word.toLowerCase())) {
          out.push(Punct("'"));
          word = word.slice(1);
        } else if (word.startsWith("'") && !this.isWord(word.toLowerCase())) {
          word = word.slice(1);
        }
        added = this._wordTokens(word, allCaps, previous, re.match(r`\s*[A-Za-z]`, text.slice(match.end())) !== null, fresh);
        previous = word;
        if (["Ss", "ss", "Zz", "zz"].includes(word) && added.length === 1 && (isspace(before) || "\"'(".includes(before)) &&
            re.match(r`[.!?…,;:—\"')]*(?:\s|$)`, text.slice(match.end()))) {
          short.push(out.length);
        }
        if (this.replies.has(word.toLowerCase()) && (len(word) > 1 || islower(word)) && added.length === 1 &&
            (isspace(before) || "\"'".includes(before)) &&
            re.match(r`(?:[.?…,;—]*[\"']?(?:\s|$)|!+[\"']?\s*$)`, text.slice(match.end()))) {
          replies.push(out.length);
        }
      } else if (number !== null) {
        added = fields(numberWords(number)).map((part) => Word(part, { raw: number }));
      } else if (PUNCTUATION.includes(other)) {
        if (!(other === "'" && isalnum(before) && match.end() < text.length && isalnum(charAt(text, match.end())))) {
          out.push(Punct(other));
        }
        if (".!?;…".includes(other)) fresh = true;
        attach = false;
        continue;
      }
      if (added.length && attach) added[0] = { ...added[0], attach: true };
      out.push(...added);
      attach = false;
      fresh = fresh && !added.length;
    }
    for (const place of short) {
      let first = place, last = place + 1;
      while (first && (!isPunct(out[first - 1]) || "\"'()".includes(out[first - 1].mark))) first -= 1;
      while (last < out.length && (!isPunct(out[last]) || "\"'()".includes(out[last].mark))) last += 1;
      if (out.slice(first, last).filter((token) => !isPunct(token))
        .every((token) => _SOUNDS.has(token.text) || (token.phones !== null && new Set(token.text).size === 1))) {
        out[place] = { ...out[place], phones: [[out[place].text[0], 0]] };
      }
    }
    for (const place of [...replies].reverse()) {
      if (Normalizer._reply(out, place)) {
        const raw = out[place].raw;
        out.splice(place, 1, ...Normalizer._chatWords(this.chat.get(raw.toLowerCase()), raw));
      }
    }
    return out;
  }
}

let _DEFAULT = null;

export function tokens(text, isWord = null) {
  if (isWord === null) {
    if (_DEFAULT === null) _DEFAULT = new Normalizer();
    return _DEFAULT.tokens(text);
  }
  return new Normalizer(isWord).tokens(text);
}

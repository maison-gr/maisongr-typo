// French inside JavaScript and TypeScript: translation modules (fr.ts), objects with an `fr` branch, and French strings
// written inline (isFr ? "Bilingue" : "Bilingual"). Only string literals and the text of template literals are typeset;
// the code around them is kept byte for byte. One pass over the file, no pattern that can backtrack.

/** A string literal, or one static chunk of a template literal. */
export interface Literal {
  /** The source between the quotes (or between ` and ${, } and `…), escapes as written. */
  raw: string;
  /** Offsets of `raw` in the file. */
  start: number;
  end: number;
  /** The text the string holds, escapes decoded. */
  value: string;
  quote: "'" | '"' | "`";
  /** Whether this string is French: in a French file, under an `fr` key, or reading as French. */
  french: boolean;
  /** The chunks of one template literal share an id: they are typeset together (HTML can span a ${…}). */
  template?: number;
}

/** fr.ts, fr-CA.js, messages.fr.ts, locales/fr/common.ts: every string of the file is French. */
export function isFrenchFile(path: string): boolean {
  const p = path.replace(/\\/g, "/");
  return /(^|\/)(fr|fr[-_][a-z]{2})\.[cm]?[jt]sx?$/i.test(p) || /\.(fr|fr[-_][a-z]{2})\.[cm]?[jt]sx?$/i.test(p) || /(^|\/)(fr|fr[-_][a-z]{2})\//i.test(p);
}

/** Keys whose value is French: fr, "fr-CA", fr_CA, frCA. */
const FR_KEY = /^fr([-_]?(ca|fr|be|ch))?$/i;
/** Language codes other than French, as keys ({ es: … }), file names (es.ts) and folders (locales/es/). Not the codes that
 * are also common words or keys (id, no, is, in, to, so, my, as, be, or). */
const OTHER_LANGS = "en|es|it|pt|de|nl|ar|zh|ja|ko|ru|pl|tr|sv|da|nb|nn|fi|cs|el|uk|ro|hu|bg|hr|sk|sl|sr|ca|fa|th|vi|hi|he|bn|ur|ms|tl|sw";
// A region after a separator or in capitals (pt-BR, pt_BR, ptBR, zhHant), never plain letters: "hint" is not Hindi.
const OTHER_KEY = new RegExp(`^(${OTHER_LANGS})([-_][A-Za-z]{2,4}|[A-Z][A-Za-z]{1,3})?$`);

/** es.ts, pt-BR.json, messages.de.ts, locales/it/…: a file for another language, never read as French. */
export function isOtherLanguageFile(path: string): boolean {
  const p = path.replace(/\\/g, "/");
  return new RegExp(`(^|/)(${OTHER_LANGS})([-_][a-z]{2,4})?(\\.[cm]?[jt]sx?$|/)|\\.(${OTHER_LANGS})([-_][a-z]{2,4})?\\.[cm]?[jt]sx?$`, "i").test(p);
}
/** After one of these, a quote opens a string; after a letter or a digit it is text (JSX: <p>l'été</p>). */
const VALUE_BEFORE = new Set(["", "=", "(", ",", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^"]);
const VALUE_WORDS = new Set(["return", "case", "typeof", "in", "of", "yield", "await", "default", "else", "throw", "export", "do"]);

/**
 * The string literals of a JS/TS file, with whether each is French. Keys and module paths (import, export … from,
 * require, import()) are never listed.
 */
export function literals(source: string, frenchFile: boolean): Literal[] {
  const out: Literal[] = [];
  const n = source.length;
  // The kind of each open bracket: "{" a block or object, "f" an object under an fr key, "$" a template expression.
  const stack: string[] = [];
  let frDepth = 0;
  let otherDepth = 0;
  // The language the next value is in, from its key: fr, another language, or none said.
  let pendingOther = false;
  let lastToken = "";
  let lastWord = "";
  let pendingFr = false;
  let templates = 0;
  let i = 0;

  const prevSignificant = () => lastToken;
  const isFrenchHere = () => frenchFile || frDepth > 0;
  // A string under another language's key is never French, whatever it reads like.
  // Code (CSS in a template) is never prose; under an fr key or in a French file, a string that clearly reads as another
  // language (an English AI prompt) is left too.
  const french = (value: string) =>
    otherDepth === 0 && !pendingOther && !looksLikeCode(value) && (isFrenchHere() || pendingFr ? !readsAsOther(value) : looksFrench(value));

  const readString = (q: "'" | '"'): void => {
    const start = i + 1;
    let j = start;
    while (j < n && source[j] !== q) {
      if (source[j] === "\\") j += 2;
      else if (source[j] === "\n") break;
      else j++;
    }
    if (j >= n || source[j] !== q) { i = start; lastToken = "x"; return; }
    const raw = source.slice(start, j);
    i = j + 1;
    // A key ({ "fr": … }, { title: … }) or a module path is not text.
    const isKey = colonAt(source, i) && (lastToken === "{" || lastToken === ",");
    const isModule = lastWord === "from" || lastWord === "import" || (lastToken === "(" && /\b(require|import)\s*$/.test(source.slice(Math.max(0, start - 40), start - 2)));
    if (isKey) {
      if (FR_KEY.test(decode(raw))) pendingFr = true;
      else if (OTHER_KEY.test(decode(raw))) pendingOther = true;
    } else if (!isModule) {
      const value = decode(raw);
      out.push({ raw, start, end: j, value, quote: q, french: french(value) });
    }
    if (!isKey) { pendingFr = false; pendingOther = false; }
    lastToken = isKey ? "k" : "x";
    lastWord = "";
  };

  // A template literal: its static chunks are text; each ${…} is code, read on the stack.
  const readTemplateChunk = (template: number): void => {
    const start = i;
    let j = start;
    while (j < n && source[j] !== "`" && !(source[j] === "$" && source[j + 1] === "{")) j += source[j] === "\\" ? 2 : 1;
    const raw = source.slice(start, Math.min(j, n));
    // Empty chunks too (`${a}${b}`): a template is typeset whole, its chunks joined, so each one has its place.
    {
      const value = decode(raw);
      out.push({ raw, start, end: Math.min(j, n), value, quote: "`", french: french(value), template });
    }
    if (j >= n) { i = n; return; }
    if (source[j] === "`") { i = j + 1; pendingFr = false; pendingOther = false; lastToken = "x"; return; }
    stack.push(`$${template}`);
    i = j + 2;
    lastToken = "(";
  };

  while (i < n) {
    const c = source[i]!;
    // Comments.
    if (c === "/" && source[i + 1] === "/") { const e = source.indexOf("\n", i); i = e === -1 ? n : e; continue; }
    if (c === "/" && source[i + 1] === "*") { const e = source.indexOf("*/", i + 2); i = e === -1 ? n : e + 2; continue; }
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
    if (c === "'" || c === '"') {
      if (VALUE_BEFORE.has(prevSignificant()) || VALUE_WORDS.has(lastWord)) { readString(c); continue; }
      i++; lastToken = "x"; continue;
    }
    if (c === "`") { i++; readTemplateChunk(templates++); continue; }
    // A regular expression literal, where a value can start: skip it, its quotes are not strings.
    // Not after "<" or ">": in JSX, "</p>" closes a tag.
    if (c === "/" && (VALUE_BEFORE.has(prevSignificant()) || VALUE_WORDS.has(lastWord)) && prevSignificant() !== ">" && prevSignificant() !== "<") {
      let j = i + 1;
      let cls = false;
      while (j < n && source[j] !== "\n") {
        const d = source[j];
        if (d === "\\") { j += 2; continue; }
        if (d === "[") cls = true;
        else if (d === "]") cls = false;
        else if (d === "/" && !cls) break;
        j++;
      }
      if (j < n && source[j] === "/") { i = j + 1; lastToken = "x"; lastWord = ""; continue; }
      i++; lastToken = "/"; lastWord = ""; continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(source[j]!)) j++;
      const word = source.slice(i, j);
      // fr: { … } or fr: "…": an identifier key.
      const colon = colonAt(source, j);
      if (colon && (lastToken === "{" || lastToken === ",") && FR_KEY.test(word)) pendingFr = true;
      else if (colon && (lastToken === "{" || lastToken === ",") && OTHER_KEY.test(word)) pendingOther = true;
      lastWord = colon ? "" : word;
      lastToken = colon ? "k" : "x";
      i = j;
      continue;
    }
    if (c === "{") {
      stack.push(pendingFr ? "f" : pendingOther ? "o" : "{");
      if (pendingFr) frDepth++;
      if (pendingOther) otherDepth++;
      pendingFr = false;
      pendingOther = false;
      i++; lastToken = "{"; lastWord = ""; continue;
    }
    if (c === "}") {
      const top = stack.pop();
      if (top === "f") frDepth--;
      if (top === "o") otherDepth--;
      i++;
      if (top?.startsWith("$")) { readTemplateChunk(Number(top.slice(1))); continue; }
      lastToken = "}"; lastWord = ""; continue;
    }
    // The value of an fr key ends at the next comma or closing bracket at its own level.
    if (c === "," || c === ";") { pendingFr = false; pendingOther = false; }
    if (c !== ":" && c !== "?") lastWord = "";
    lastToken = c === ")" || c === "]" ? "x" : c;
    i++;
  }
  return out;
}

/** Whether ":" (or "?:", an optional TypeScript property) follows at i, after spaces: tested in place, never sliced. */
function colonAt(source: string, i: number): boolean {
  const re = /[ \t]*\??:/y;
  re.lastIndex = i;
  return re.test(source);
}

/** The text a JS string holds: \n, \', é, \u{1F600}, \x41 and line continuations decoded. */
export function decode(raw: string): string {
  if (!raw.includes("\\")) return raw;
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]!;
    if (c !== "\\") { out += c; continue; }
    const d = raw[++i];
    if (d === undefined) break;
    if (d === "n") out += "\n";
    else if (d === "t") out += "\t";
    else if (d === "r") out += "\r";
    else if (d === "b") out += "\b";
    else if (d === "f") out += "\f";
    else if (d === "v") out += "\v";
    else if (d === "0" && !/\d/.test(raw[i + 1] ?? "")) out += "\0";
    else if (d === "x" && /^[\da-f]{2}$/i.test(raw.slice(i + 1, i + 3))) { out += String.fromCharCode(parseInt(raw.slice(i + 1, i + 3), 16)); i += 2; }
    else if (d === "u" && raw[i + 1] === "{") { const e = raw.indexOf("}", i); out += String.fromCodePoint(parseInt(raw.slice(i + 2, e), 16)); i = e; }
    else if (d === "u" && /^[\da-f]{4}$/i.test(raw.slice(i + 1, i + 5))) { out += String.fromCharCode(parseInt(raw.slice(i + 1, i + 5), 16)); i += 4; }
    else if (d === "\r" && raw[i + 1] === "\n") i++;
    else if (d !== "\n" && d !== "\r") out += d;
  }
  return out;
}

/** The source for a string's new text, between the same quotes: only what must be escaped is. */
export function encode(value: string, quote: "'" | '"' | "`", raw = ""): string {
  let out = value.replace(/\\/g, "\\\\");
  // A template written with \n escapes keeps them, rather than gaining real line breaks.
  if (quote === "`") out = out.replace(/`/g, "\\`").replace(/\$\{/g, "\\${").replace(/\n/g, raw.includes("\\n") && !raw.includes("\n") ? "\\n" : "\n");
  else out = out.replace(new RegExp(quote, "g"), `\\${quote}`).replace(/\r/g, "\\r").replace(/\n/g, "\\n");
  return out;
}

// Not "on" or "son": English words too ("50% on signing"). Words French shares with another language ("de", "la", "que")
// count for both: French has to outscore each of them.
const FRENCH_WORDS = new Set(["le", "la", "les", "des", "du", "de", "un", "une", "et", "est", "pour", "vous", "nous", "avec", "dans", "sur", "pas", "ne", "que", "qui", "au", "aux", "votre", "vos", "notre", "nos", "ce", "cette", "ces", "sa", "ses", "il", "elle", "ils", "elles", "ou", "mais", "plus", "tout", "tous", "sont", "être", "avoir", "à", "en", "leur", "très", "déjà", "chez", "par", "sans", "aussi", "comme", "même", "ici", "voici", "bonjour", "merci"]);
const OTHER_WORDS: readonly Set<string>[] = [
  // English
  new Set(["the", "and", "is", "are", "you", "your", "for", "with", "to", "of", "on", "this", "that", "it", "be", "we", "our", "not", "or", "at", "by", "from", "an", "as", "can", "will", "have", "has", "was", "were", "my", "all", "more", "here", "please", "thanks", "hello", "what", "how", "when", "why", "if"]),
  // Spanish
  new Set(["el", "los", "las", "del", "de", "la", "que", "en", "un", "una", "para", "con", "por", "es", "y", "como", "pero", "puede", "sin", "lo", "al", "su", "sus", "este", "esta", "no", "se", "le", "tu", "mas"]),
  // Italian
  new Set(["il", "gli", "della", "delle", "dello", "degli", "di", "del", "per", "con", "non", "che", "sono", "è", "ma", "una", "uno", "un", "la", "le", "nel", "nella", "alla", "questo", "questa", "si", "in", "i"]),
  // Portuguese
  new Set(["os", "as", "o", "para", "com", "uma", "um", "é", "da", "do", "de", "em", "mas", "dos", "das", "seu", "sua", "que", "se", "no", "na"]),
  // German
  new Set(["der", "die", "das", "und", "ist", "nicht", "mit", "ein", "eine", "zu", "es", "aber", "auf", "den", "dem", "sie", "wir", "ich", "sich", "kann", "oder", "wie"]),
  // Dutch
  new Set(["het", "een", "van", "voor", "niet", "met", "zijn", "maar", "dat", "wat", "op", "te", "ook", "kan", "de", "en", "is", "je", "jouw", "wij"]),
];
/** Letters French doesn't use: a string with one is in another language (ñ, ¿, ã, ß, ä, ö, ì, ò, á, í, ó, ú, å, ø). */
const NOT_FRENCH = /[ñ¿¡ãõßäöìòáíóúåøłřšžčęą]/i;

/**
 * Whether a string reads as French: an accent and its small words count, and French must outscore English, Spanish,
 * Italian, Portuguese, German and Dutch, whose letters French doesn't use rule it out. "Politique de confidentialité"
 * and "Gérer les cookies" do; "Bilingual by design", "Para el cerebro que sabe", "Montréal" and "flex gap-2" don't.
 */
export function looksFrench(s: string): boolean {
  if (!/[A-Za-zÀ-ÿ]{2}/.test(s) || NOT_FRENCH.test(s)) return false;
  const { fr, other } = scores(s);
  return fr >= 2 && fr > other;
}

/** Whether a string clearly reads as another language: letters French doesn't use, or more of another language's small words. */
export function readsAsOther(s: string): boolean {
  if (NOT_FRENCH.test(s)) return true;
  const { fr, other } = scores(s);
  return other >= 2 && other > fr;
}

/** French's score (an accent, « », elisions, small words) and the best other language's, for a string. */
function scores(s: string): { fr: number; other: number } {
  let fr = (/[àâçéèêëîïôûùüÿ]/i.test(s) ? 1 : 0) + (/[«»œ]/.test(s) ? 1 : 0);
  const other = OTHER_WORDS.map(() => 0);
  for (const w of s.toLowerCase().split(/[^a-zà-ÿ’']+/)) {
    if (!w) continue;
    // Elisions: l'été, d'analyse, qu'il, c'est.
    if (/^(l|d|j|m|n|s|t|c|qu)['’][a-zà-ÿ]/.test(w)) fr++;
    else if (FRENCH_WORDS.has(w)) fr++;
    OTHER_WORDS.forEach((words, k) => { if (words.has(w)) other[k]!++; });
  }
  return { fr, other: Math.max(...other) };
}

/**
 * Whether a string is code rather than prose: a { … } block with a ";" in it (CSS, a script), or two CSS custom
 * properties (--background: …). ICU placeholders ({name}, {n, plural, one {…}}) hold no ";". Read without a regex
 * that could backtrack.
 */
export function looksLikeCode(s: string): boolean {
  // The next "}" and the next ";" after each "{", both only moving forward: one pass, however many braces.
  let close = -1;
  let semi = -1;
  for (let i = s.indexOf("{"); i !== -1; i = s.indexOf("{", i + 1)) {
    if (close < i) close = s.indexOf("}", i + 1);
    if (close === -1) break;
    if (semi < i) semi = s.indexOf(";", i + 1);
    if (semi === -1) break;
    if (semi < close) return true;
  }
  let custom = 0;
  for (const part of s.split(";")) if (/^\s*--[a-z][\w-]*\s*:/i.test(part) && ++custom >= 2) return true;
  return false;
}
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
  let lastToken = "";
  let lastWord = "";
  let pendingFr = false;
  let templates = 0;
  let i = 0;

  const prevSignificant = () => lastToken;
  const isFrenchHere = () => frenchFile || frDepth > 0;

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
    } else if (!isModule) {
      const value = decode(raw);
      out.push({ raw, start, end: j, value, quote: q, french: isFrenchHere() || pendingFr || looksFrench(value) });
    }
    if (!isKey) pendingFr = false;
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
      out.push({ raw, start, end: Math.min(j, n), value, quote: "`", french: isFrenchHere() || pendingFr || looksFrench(value), template });
    }
    if (j >= n) { i = n; return; }
    if (source[j] === "`") { i = j + 1; pendingFr = false; lastToken = "x"; return; }
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
      lastWord = colon ? "" : word;
      lastToken = colon ? "k" : "x";
      i = j;
      continue;
    }
    if (c === "{") {
      stack.push(pendingFr ? "f" : "{");
      if (pendingFr) frDepth++;
      pendingFr = false;
      i++; lastToken = "{"; lastWord = ""; continue;
    }
    if (c === "}") {
      const top = stack.pop();
      if (top === "f") frDepth--;
      i++;
      if (top?.startsWith("$")) { readTemplateChunk(Number(top.slice(1))); continue; }
      lastToken = "}"; lastWord = ""; continue;
    }
    // The value of an fr key ends at the next comma or closing bracket at its own level.
    if (c === "," || c === ";") pendingFr = false;
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
export function encode(value: string, quote: "'" | '"' | "`"): string {
  let out = value.replace(/\\/g, "\\\\");
  if (quote === "`") out = out.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  else out = out.replace(new RegExp(quote, "g"), `\\${quote}`).replace(/\r/g, "\\r").replace(/\n/g, "\\n");
  return out;
}

const FRENCH_WORDS = new Set(["le", "la", "les", "des", "du", "de", "un", "une", "et", "est", "pour", "vous", "nous", "avec", "dans", "sur", "pas", "ne", "que", "qui", "au", "aux", "votre", "vos", "notre", "nos", "ce", "cette", "ces", "son", "sa", "ses", "il", "elle", "ils", "elles", "on", "ou", "mais", "plus", "tout", "tous", "sont", "être", "avoir", "à", "en", "leur", "très", "déjà", "chez", "par", "sans", "aussi", "comme", "même", "votre", "ici", "voici", "bonjour", "merci"]);
const ENGLISH_WORDS = new Set(["the", "and", "is", "are", "you", "your", "for", "with", "to", "of", "on", "this", "that", "it", "be", "we", "our", "not", "or", "at", "by", "from", "an", "as", "can", "will", "have", "has", "was", "were", "my", "all", "more", "here", "please", "thanks", "hello", "what", "how", "when", "why", "if"]);

/**
 * Whether a string reads as French: its small words are French rather than English, an accent counting for one.
 * "Politique de confidentialité" and "Gérer les cookies" do; "Bilingual by design", "Montréal" and "flex gap-2" don't.
 */
export function looksFrench(s: string): boolean {
  if (!/[A-Za-zÀ-ÿ]{2}/.test(s)) return false;
  if (/[«»œ]/.test(s)) return true;
  let fr = /[àâçéèêëîïôûùüÿ]/i.test(s) ? 1 : 0;
  let en = 0;
  for (const w of s.toLowerCase().split(/[^a-zà-ÿ’']+/)) {
    if (!w) continue;
    // Elisions: l'été, d'analyse, qu'il, c'est.
    if (/^(l|d|j|m|n|s|t|c|qu)['’][a-zà-ÿ]/.test(w)) fr++;
    else if (FRENCH_WORDS.has(w)) fr++;
    else if (ENGLISH_WORDS.has(w)) en++;
  }
  return fr >= 2 && fr > en;
}

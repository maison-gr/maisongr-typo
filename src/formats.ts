// Translation files of every platform: iOS and macOS (.strings), Android (strings.xml), gettext (.po), XLIFF, YAML
// (Rails and others) and Java (.properties). Each reader finds the text a file holds, decoded from the file's own
// escapes; the caller typesets it and the reader encodes it back. Every other byte of the file stays as written.
// Xcode string catalogs (.xcstrings) and Flutter's .arb are JSON: files.ts reads them with its JSON editor.

/** A piece of text in a file: where it is, what it says, and how to write a new text back in its place. */
export interface Segment {
  start: number;
  end: number;
  value: string;
  encode: (text: string) => string;
  /** Typeset as HTML: the text holds tags (Android's <b>, XLIFF's <g>) or XML entities. */
  html?: boolean;
}

export type TranslationFormat = "strings" | "android" | "po" | "xliff" | "yaml" | "properties";

/** The language a path names, from the conventions of each platform, or null. */
export function languageOfPath(path: string): string | null {
  const p = path.replace(/\\/g, "/");
  const patterns = [
    /(?:^|\/)([a-z]{2,3}(?:[-_][A-Za-z]{2,4})?)\.lproj\//, // iOS: fr.lproj/, fr-CA.lproj/
    /(?:^|\/)values-([a-z]{2,3})(?:-r[A-Z]{2})?\//, // Android: values-fr/, values-fr-rCA/
    /(?:^|\/)([a-z]{2,3}(?:[-_][A-Za-z]{2,4})?)\/LC_MESSAGES\//, // gettext: fr/LC_MESSAGES/
    // In a file name, two letters only: "app.yml" is not a language.
    /[._-]([a-z]{2}(?:[-_][A-Z]{2})?)\.(?:po|xlf|xliff|arb|properties|ya?ml|strings)$/, // messages_fr.properties, app_fr.arb, de.po
    /(?:^|\/)([a-z]{2}(?:[-_][A-Za-z]{2,4})?)\.(?:po|xlf|xliff|arb|properties|ya?ml|strings)$/, // fr.yml, fr_CA.po
    /(?:^|\/)(?:locales?|i18n|lang|translations?)\/([a-z]{2,3}(?:[-_][A-Za-z]{2,4})?)\//, // locales/fr/…
  ];
  for (const re of patterns) {
    const m = p.match(re);
    if (m) return m[1]!.toLowerCase();
  }
  return null;
}

export const isFrenchCode = (code: string | null | undefined) => !!code && /^fr(?:[-_]|$)/i.test(code);

/** The format of a translation file, from its name, or null. */
export function translationFormat(path: string): TranslationFormat | null {
  const p = path.toLowerCase();
  if (p.endsWith(".strings")) return "strings";
  if (p.endsWith(".po") || p.endsWith(".pot")) return "po";
  if (p.endsWith(".xlf") || p.endsWith(".xliff")) return "xliff";
  if (p.endsWith(".properties")) return "properties";
  if (p.endsWith(".yml") || p.endsWith(".yaml")) return "yaml";
  if (p.endsWith(".xml") && /(^|[\\/])values(-[^\\/]+)?[\\/]/.test(p)) return "android";
  return null;
}

/**
 * Whether a translation file is French: by its path (fr.lproj/, values-fr/, fr.po, messages_fr.properties, fr.yml),
 * by what it declares (an XLIFF target-language, a gettext Language header), or, for YAML, by a root key fr:.
 */
export function isFrenchTranslation(path: string, format: TranslationFormat, source: string): boolean {
  if (isFrenchCode(languageOfPath(path))) return true;
  if (languageOfPath(path)) return false;
  if (format === "xliff") return isFrenchCode(source.match(/\b(?:target-language|trgLang)\s*=\s*"([^"]+)"/)?.[1]);
  if (format === "po") return isFrenchCode(source.match(/"Language:\s*([A-Za-z_-]+)/)?.[1]);
  if (format === "yaml") return /^fr(?:[-_][A-Za-z]{2})?:\s*$/m.test(source);
  return false;
}

/** The pieces of French text in a translation file. */
export function segments(format: TranslationFormat, source: string): Segment[] {
  switch (format) {
    case "strings": return appleStrings(source);
    case "android": return androidStrings(source);
    case "po": return gettext(source);
    case "xliff": return xliffTargets(source);
    case "yaml": return yamlValues(source);
    case "properties": return javaProperties(source);
  }
}

/** C-style escapes, as .strings and .po write them: \" \\ \n \t \r. */
const cDecode = (raw: string) => raw.replace(/\\(u[\dA-Fa-f]{4}|U[\dA-Fa-f]{8}|.)/g, (_m, e: string) =>
  e === "n" ? "\n" : e === "t" ? "\t" : e === "r" ? "\r" : /^[uU]/.test(e) ? String.fromCodePoint(parseInt(e.slice(1), 16)) : e);
const cEncode = (text: string) => text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\r/g, "\\r");

/** The end of a "…" string that starts at i (the index after its closing quote), skipping \" escapes. */
function quoted(s: string, i: number): number {
  let j = i + 1;
  while (j < s.length && s[j] !== '"' && s[j] !== "\n") j += s[j] === "\\" ? 2 : 1;
  return Math.min(j + 1, s.length);
}

/** iOS and macOS Localizable.strings: "key" = "value"; with C and // comments. Values only. */
function appleStrings(source: string): Segment[] {
  const out: Segment[] = [];
  let expectValue = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "/" && source[i + 1] === "*") { const e = source.indexOf("*/", i + 2); i = e === -1 ? source.length : e + 1; continue; }
    if (c === "/" && source[i + 1] === "/") { const e = source.indexOf("\n", i); i = e === -1 ? source.length : e; continue; }
    if (c === "=") { expectValue = true; continue; }
    if (c === ";") { expectValue = false; continue; }
    if (c === '"') {
      const end = quoted(source, i);
      if (expectValue) out.push({ start: i + 1, end: end - 1, value: cDecode(source.slice(i + 1, end - 1)), encode: cEncode });
      i = end - 1;
    }
  }
  return out;
}

/**
 * Android res/values-fr/strings.xml: the text of <string>, and of <item> in <plurals> and <string-array>, unless
 * translatable="false". Android's escapes (\' \" \n) are read and written back; tags and entities are kept.
 */
function androidStrings(source: string): Segment[] {
  const out: Segment[] = [];
  // The name, then a space or ">": <string-array> is not a <string>.
  const open = /<(string|item)(?=[\s>/])([^>]*)>/g;
  const unclosed = new Set<string>();
  for (let m = open.exec(source); m; m = open.exec(source)) {
    if (/translatable\s*=\s*"false"/.test(m[2]!) || m[2]!.trimEnd().endsWith("/")) continue;
    const start = m.index + m[0].length;
    // A tag with no close left in the file is not searched for again: one pass, however many there are.
    if (unclosed.has(m[1]!)) continue;
    const close = source.indexOf(`</${m[1]}>`, start);
    if (close === -1) { unclosed.add(m[1]!); continue; }
    const raw = source.slice(start, close);
    open.lastIndex = close;
    if (raw.startsWith("<![CDATA[")) continue;
    // Text wrapped in "…" keeps its spaces; its quotes are not text.
    const wrapped = raw.length > 1 && raw.startsWith('"') && raw.endsWith('"') && !raw.endsWith('\\"');
    const inner = wrapped ? raw.slice(1, -1) : raw;
    const offset = wrapped ? 1 : 0;
    out.push({
      start: start + offset,
      end: close - offset,
      value: inner.replace(/\\'/g, "'").replace(/\\"/g, '"'),
      encode: androidEncode,
      html: true,
    });
  }
  return out;
}

/** Android's escapes for ' and ", in the text only: a tag's attributes (<xliff:g id="x">) keep their quotes. */
function androidEncode(text: string): string {
  let out = "";
  let last = 0;
  for (let i = text.indexOf("<"); i !== -1; i = text.indexOf("<", i + 1)) {
    const close = text.indexOf(">", i);
    if (close === -1) break;
    out += escapeAndroid(text.slice(last, i)) + text.slice(i, close + 1);
    last = close + 1;
    i = close;
  }
  return out + escapeAndroid(text.slice(last));
}
const escapeAndroid = (s: string) => s.replace(/(?<!\\)'/g, "\\'").replace(/(?<!\\)"/g, '\\"');

/** gettext .po: each msgstr (and msgstr[n]), every "…" line of it, never msgid or comments. */
function gettext(source: string): Segment[] {
  const out: Segment[] = [];
  let inStr = false;
  let header = false;
  let seen = 0;
  let offset = 0;
  for (const line of source.split("\n")) {
    const t = line.trimStart();
    const lead = line.length - t.length;
    if (/^msgstr(\[\d+\])?\s/.test(t)) inStr = true;
    else if (/^(msgid|msgctxt|msgid_plural)\b/.test(t)) {
      inStr = false;
      // Only the first entry, msgid "", is the header; a long msgid also starts with "" and continues below.
      if (/^msgid\b/.test(t)) { header = seen === 0 && /^msgid\s+""\s*$/.test(t); seen++; }
    }
    else if (!t.startsWith('"')) inStr = false;
    const q = line.indexOf('"', lead);
    // The header entry (msgid "") holds metadata, not text.
    if (inStr && !header && q !== -1 && !t.startsWith("#")) {
      const end = quoted(line, q);
      const raw = line.slice(q + 1, end - 1);
      if (raw) out.push({ start: offset + q + 1, end: offset + end - 1, value: cDecode(raw), encode: cEncode });
    }
    offset += line.length + 1;
  }
  return out;
}

/** XLIFF 1.2 and 2.x: the content of each <target>, typeset as markup (inline tags and entities kept). */
function xliffTargets(source: string): Segment[] {
  const out: Segment[] = [];
  const open = /<target\b[^>]*>/g;
  for (let m = open.exec(source); m; m = open.exec(source)) {
    if (m[0].endsWith("/>")) continue;
    const start = m.index + m[0].length;
    const close = source.indexOf("</target>", start);
    if (close === -1) break;
    out.push({ start, end: close, value: source.slice(start, close), encode: (t) => t, html: true });
    open.lastIndex = close;
  }
  return out;
}

/**
 * YAML (Rails' config/locales/fr.yml and others): each scalar value, plain, '…' or "…", and the lines of a | or >
 * block. A plain value that the typesetting would make ambiguous (": " or " #") is written back between quotes.
 */
function yamlValues(source: string): Segment[] {
  const out: Segment[] = [];
  const lines = source.split("\n");
  let offset = 0;
  let block = -1; // the indent a | or > block's lines are deeper than, or -1
  for (const line of lines) {
    const indent = line.length - line.trimStart().length;
    const t = line.trim();
    if (block !== -1) {
      if (!t || indent > block) {
        if (t) out.push({ start: offset + indent, end: offset + line.replace(/\r$/, "").length, value: line.replace(/\r$/, "").slice(indent), encode: (x) => x });
        offset += line.length + 1;
        continue;
      }
      block = -1;
    }
    const at0 = yamlValueStart(line);
    if (at0 !== -1 && !t.startsWith("#")) {
      const value = line.slice(at0).replace(/\r$/, "").trimEnd();
      const at = offset + at0;
      if (/^[|>][+-]?\d*$/.test(value)) block = indent;
      else if (value.startsWith('"')) {
        const end = quoted(value, 0);
        out.push({ start: at + 1, end: at + end - 1, value: cDecode(value.slice(1, end - 1)), encode: cEncode });
      } else if (value.startsWith("'")) {
        const end = singleQuotedEnd(value);
        out.push({ start: at + 1, end: at + end - 1, value: value.slice(1, end - 1).replace(/''/g, "'"), encode: (x) => x.replace(/'/g, "''") });
      } else if (value && !/^[&*!%@`[{|>-]|^#/.test(value)) {
        const plain = value.replace(/\s+#.*$/, "");
        out.push({ start: at, end: at + plain.length, value: plain, encode: (x) => (/: |\s#|^[\s'"]|\s$/.test(x) ? `"${cEncode(x)}"` : x) });
      }
    }
    offset += line.length + 1;
  }
  return out;
}

/** The end of a '…' YAML scalar ('' is a quote inside it). */
function singleQuotedEnd(s: string): number {
  let j = 1;
  while (j < s.length) {
    if (s[j] === "'" && s[j + 1] === "'") { j += 2; continue; }
    if (s[j] === "'") return j + 1;
    j++;
  }
  return s.length;
}

/**
 * Java .properties: each value (key=value, key: value, key value), one line at a time, \uXXXX and \n read. A file
 * written in ASCII with \u escapes gets its new characters as \u escapes too; a MessageFormat text keeps its '' quotes.
 */
function javaProperties(source: string): Segment[] {
  const out: Segment[] = [];
  const ascii = !/[^\x00-\x7f]/.test(source);
  let offset = 0;
  let continued = false;
  for (const line of source.split("\n")) {
    const body = line.replace(/\r$/, "");
    const t = body.trimStart();
    let start = -1;
    if (continued) start = body.length - t.length;
    else if (t && !t.startsWith("#") && !t.startsWith("!")) {
      // The key runs to the first unescaped =, : or space.
      let i = body.length - t.length;
      while (i < body.length && !/[=:\s]/.test(body[i]!)) i += body[i] === "\\" ? 2 : 1;
      while (i < body.length && /\s/.test(body[i]!)) i++;
      if (body[i] === "=" || body[i] === ":") i++;
      while (i < body.length && /\s/.test(body[i]!)) i++;
      start = i;
    }
    continued = /(?<!\\)(\\\\)*\\$/.test(body);
    const end = continued ? body.length - 1 : body.length;
    if (start !== -1 && end > start) {
      const raw = body.slice(start, end);
      const messageFormat = raw.includes("''") || /\{\d/.test(raw);
      const decoded = raw.replace(/\\(u[\dA-Fa-f]{4}|.)/g, (_m, e: string) => (e === "n" ? "\n" : e === "t" ? "\t" : e[0] === "u" && e.length === 5 ? String.fromCharCode(parseInt(e.slice(1), 16)) : e));
      out.push({
        start: offset + start,
        end: offset + end,
        value: messageFormat ? decoded.replace(/''/g, "'") : decoded,
        encode: (text) => {
          let x = (messageFormat ? text.replace(/'/g, "''") : text).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
          if (ascii) x = x.replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
          return x;
        },
      });
    }
    offset += line.length + 1;
  }
  return out;
}

/**
 * Where a YAML line's scalar value starts: after "key: " (key plain or quoted), or after "- " for a list item; -1 for a
 * line with none (a key opening a map, a comment). Read by hand: no pattern that could backtrack on a long line.
 */
function yamlValueStart(line: string): number {
  let i = line.length - line.trimStart().length;
  if (line.startsWith("- ", i)) {
    i += 2;
    while (line[i] === " ") i++;
    // "- key: value" is a map in a list; "- value" is a scalar.
    const inner = keyEnd(line, i);
    return inner === -1 ? (i < line.trimEnd().length ? i : -1) : inner;
  }
  return keyEnd(line, i);
}

/** After "key: " at i, the value's start; -1 when there is no key or no value on the line. */
function keyEnd(line: string, i: number): number {
  let j = i;
  if (line[j] === '"' || line[j] === "'") {
    const close = line.indexOf(line[j]!, j + 1);
    if (close === -1) return -1;
    j = close + 1;
    while (line[j] === " ") j++;
    if (line[j] !== ":") return -1;
  } else {
    j = line.indexOf(": ", i);
    if (j === -1 || line.slice(i, j).includes(" #") || line[i] === "#") return -1;
  }
  j++;
  while (line[j] === " " || line[j] === "\t") j++;
  return j < line.replace(/\r$/, "").trimEnd().length ? j : -1;
}
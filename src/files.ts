// Files for the CLI. Markdown, HTML and text are typeset as their format; a JSON file's string values are (never its
// keys), optionally only those under a key such as "fr", so a translation file keeps its English untouched.

import { readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { check, typeset, type Issue } from "./index.js";
import { encode, isFrenchFile, isOtherLanguageFile, literals, type Literal } from "./javascript.js";

/**
 * Joins the chunks of a template literal: a private-use character no text holds and no rule touches. Not U+E000 or
 * U+E001: mask() keeps those for its own slots, and would claim this one before the tag around it.
 */
const SLOT = "";
import type { Format, Options } from "./options.js";

export type Kind = Format | "json" | "javascript";

/** JavaScript and TypeScript: their French strings are typeset, the code never. */
const CODE = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]);
const TEST_DIRS = new Set(["test", "tests", "__tests__", "spec", "specs", "e2e", "__mocks__", "fixtures", "__fixtures__"]);
const TEST_FILE = /\.(test|spec|stories)\.[cm]?[jt]sx?$/;

/** Folders a directory walk never enters. */
const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", ".nuxt", ".svelte-kit", ".astro", "coverage", "vendor"]);
/** What a directory walk picks up. JSON is read only when it is named, never found by a walk (package.json…). */
const WALKED = new Set([".md", ".mdx", ".markdown", ".html", ".htm", ".txt"]);

export function kindOf(path: string): Kind {
  const ext = extname(path).toLowerCase();
  if (ext === ".md" || ext === ".mdx" || ext === ".markdown") return "markdown";
  if (ext === ".html" || ext === ".htm") return "html";
  if (ext === ".json") return "json";
  if (CODE.has(ext)) return "javascript";
  return "text";
}

/**
 * The files to read: each path as given, and the supported files inside each folder. In a folder, JavaScript and
 * TypeScript are read when the file is French (fr.ts, locales/fr/…), or every one of them with `code`.
 */
export function expand(paths: readonly string[], code = false): string[] {
  const out: string[] = [];
  // Tests are code: their strings are what they compare against, not prose. Never read as code in a walk.
  const walk = (dir: string, inTests: boolean) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (!SKIP.has(name)) walk(full, inTests || TEST_DIRS.has(name));
      } else {
        const ext = extname(name).toLowerCase();
        const isCode = CODE.has(ext) && (isFrenchFile(full) || (code && !isOtherLanguageFile(full))) && !/\.d\.[cm]?ts$/.test(name) && !inTests && !TEST_FILE.test(name);
        if (WALKED.has(ext) || isCode) out.push(full);
      }
    }
  };
  for (const p of paths) (statSync(p).isDirectory() ? walk(p, false) : out.push(p));
  return out;
}

export interface FileIssue extends Issue {
  /** For JSON: the string's path in the file, e.g. "fr.home.title". */
  key?: string;
}

export interface Result {
  issues: FileIssue[];
  /** The file as typeset() would write it. */
  output: string;
}

export function processText(source: string, kind: Kind, options: Options, onlyKey?: string, path = ""): Result {
  const bom = source.startsWith("﻿") ? "﻿" : "";
  const body = bom ? source.slice(1) : source;
  if (kind === "javascript") return processCode(source, options, path);
  if (kind !== "json") {
    const o = { ...options, format: kind };
    return { issues: check(body, o), output: bom + typeset(body, o) };
  }
  return processJson(source, bom.length, options, onlyKey);
}

/** A JS/TS file: each French string typeset in place, everything else kept byte for byte. */
function processCode(source: string, options: Options, path: string): Result {
  // A file for another language (es.ts, locales/de/…) holds no French, even when it is named on the command line.
  if (!isFrenchFile(path) && isOtherLanguageFile(path)) return { issues: [], output: source };
  const lines = lineStarts(source);
  const issues: FileIssue[] = [];
  const edits: { start: number; end: number; text: string }[] = [];
  // A string is one unit; a template literal's chunks are one unit, joined by a character no text holds, so a tag or
  // a sentence that spans a ${…} is read whole.
  const units: Literal[][] = [];
  const byTemplate = new Map<number, Literal[]>();
  for (const lit of literals(source, isFrenchFile(path))) {
    if (lit.template === undefined) { units.push([lit]); continue; }
    let unit = byTemplate.get(lit.template);
    if (!unit) { unit = []; byTemplate.set(lit.template, unit); units.push(unit); }
    unit.push(lit);
  }
  for (const unit of units) {
    if (!unit.some((l) => l.french)) continue;
    const joined = unit.map((l) => l.value).join(SLOT);
    // HTML in a string (an email template) is typeset as HTML: its tags and attributes stay as written.
    const o = { ...options, format: (/<\/?[a-zA-Z][\w-]*[\s/>]/.test(joined) ? "html" : "text") as Format };
    const fixed = typeset(joined, o);
    if (fixed === joined) continue;
    const parts = fixed.split(SLOT);
    if (parts.length !== unit.length) continue;
    // Each chunk's offset in the joined text, to place each issue in the file.
    const offsets: number[] = [];
    unit.reduce((at, l) => { offsets.push(at); return at + l.value.length + SLOT.length; }, 0);
    for (const issue of check(joined, o)) {
      let k = offsets.length - 1;
      while (k > 0 && offsets[k]! > issue.index) k--;
      const lit = unit[k]!;
      // Exact when the string has no escape before the problem; the string's start otherwise.
      const at = lit.raw.includes("\\") ? lit.start : lit.start + issue.index - offsets[k]!;
      const line = lineOf(lines, at);
      issues.push({ ...issue, index: at, line, column: at - lines[line - 1]! + 1 });
    }
    unit.forEach((lit, k) => { if (parts[k] !== lit.value) edits.push({ start: lit.start, end: lit.end, text: encode(parts[k]!, lit.quote, lit.raw) }); });
  }
  if (!edits.length) return { issues, output: source };
  edits.sort((a, b) => a.start - b.start);
  let output = "";
  let last = 0;
  for (const e of edits) { output += source.slice(last, e.start) + e.text; last = e.end; }
  return { issues, output: output + source.slice(last) };
}

function lineStarts(s: string): number[] {
  const starts = [0];
  for (let i = s.indexOf("\n"); i !== -1; i = s.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
}

function lineOf(starts: number[], index: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid]! <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}
/** A string holding a tag (<b>, <link href="…">): typeset as HTML, so its tags and attributes stay as written. */
const HTML_TAG = /<\/?[a-zA-Z][\w-]*[\s/>]/;

/**
 * A JSON file: each string value typeset in place (keys never), under `onlyKey` when it is given. Every other byte stays
 * as written, so a fixed file's diff shows only the strings that changed. One pass, a stack of open objects and arrays.
 */
function processJson(source: string, from: number, options: Options, onlyKey?: string): Result {
  JSON.parse(source.slice(from)); // an invalid file fails here, as before
  // Each open object or array: its own key or index only. The full path is built from the stack when an issue needs it:
  // a path copied into every frame grows with the square of the depth.
  type Frame = { kind: "object" | "array"; key: string | null; index: number; expectKey: boolean; inside: boolean };
  const stack: Frame[] = [];
  const issues: FileIssue[] = [];
  const edits: [number, number, string][] = [];
  const pathHere = () => stack.map((frame) => (frame.kind === "object" ? frame.key ?? "" : String(frame.index)));
  const childInside = (top: Frame | undefined) => (top ? top.inside || (top.kind === "object" && top.key === onlyKey) : !onlyKey);
  for (let i = from; i < source.length; i++) {
    const c = source[i];
    const top = stack.at(-1);
    if (c === "{" || c === "[") {
      stack.push({ kind: c === "{" ? "object" : "array", key: null, index: 0, expectKey: c === "{", inside: childInside(top) });
    } else if (c === "}" || c === "]") {
      stack.pop();
    } else if (c === ",") {
      if (top?.kind === "object") top.expectKey = true;
      else if (top) top.index++;
    } else if (c === ":") {
      if (top) top.expectKey = false;
    } else if (c === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== '"') j += source[j] === "\\" ? 2 : 1;
      const value = JSON.parse(source.slice(i, j + 1)) as string;
      if (top?.kind === "object" && top.expectKey) top.key = value;
      else if (childInside(top)) {
        const o = { ...options, format: (HTML_TAG.test(value) ? "html" : "text") as Format };
        const fixed = typeset(value, o);
        if (fixed !== value) {
          const key = pathHere().join(".");
          for (const issue of check(value, o)) issues.push({ ...issue, key });
          edits.push([i, j + 1, JSON.stringify(fixed)]);
        }
      }
      i = j;
    }
  }
  if (!edits.length) return { issues, output: source };
  let output = "";
  let last = 0;
  for (const [a, b, text] of edits) { output += source.slice(last, a) + text; last = b; }
  return { issues, output: output + source.slice(last) };
}
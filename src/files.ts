// Files for the CLI. Markdown, HTML and text are typeset as their format; a JSON file's string values are (never its
// keys), optionally only those under a key such as "fr", so a translation file keeps its English untouched.

import { readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { check, typeset, type Issue } from "./index.js";
import type { Format, Options } from "./options.js";

export type Kind = Format | "json";

/** Folders a directory walk never enters. */
const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", ".nuxt", ".svelte-kit", ".astro", "coverage", "vendor"]);
/** What a directory walk picks up. JSON is read only when it is named, never found by a walk (package.json…). */
const WALKED = new Set([".md", ".mdx", ".markdown", ".html", ".htm", ".txt"]);

export function kindOf(path: string): Kind {
  const ext = extname(path).toLowerCase();
  if (ext === ".md" || ext === ".mdx" || ext === ".markdown") return "markdown";
  if (ext === ".html" || ext === ".htm") return "html";
  if (ext === ".json") return "json";
  return "text";
}

/** The files to read: each path as given, and the supported files inside each folder. */
export function expand(paths: readonly string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (!SKIP.has(name)) walk(full);
      } else if (WALKED.has(extname(name).toLowerCase())) out.push(full);
    }
  };
  for (const p of paths) (statSync(p).isDirectory() ? walk(p) : out.push(p));
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

export function processText(source: string, kind: Kind, options: Options, onlyKey?: string): Result {
  const bom = source.startsWith("﻿") ? "﻿" : "";
  const body = bom ? source.slice(1) : source;
  if (kind !== "json") {
    const o = { ...options, format: kind };
    return { issues: check(body, o), output: bom + typeset(body, o) };
  }
  const data: unknown = JSON.parse(body);
  const issues: FileIssue[] = [];
  const o = { ...options, format: "text" as const };
  const visit = (value: unknown, path: string[], inside: boolean): unknown => {
    if (typeof value === "string") {
      if (!inside) return value;
      for (const issue of check(value, o)) issues.push({ ...issue, key: path.join(".") });
      return typeset(value, o);
    }
    if (Array.isArray(value)) return value.map((v, i) => visit(v, [...path, String(i)], inside));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, visit(v, [...path, k], inside || k === onlyKey)]));
    }
    return value;
  };
  const fixed = visit(data, [], !onlyKey);
  const indent = body.match(/^[\[{]\r?\n([ \t]+)/)?.[1] ?? "  ";
  const newline = body.includes("\r\n") ? "\r\n" : "\n";
  let output = JSON.stringify(fixed, null, indent);
  if (newline !== "\n") output = output.replace(/\n/g, newline);
  if (/\r?\n$/.test(body)) output += newline;
  // Nothing to change: keep the file byte for byte, whatever its formatting.
  return { issues, output: issues.length ? bom + output : source };
}

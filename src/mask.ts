// What typography must never touch: links, emails, bare domains, HTML entities, the caller's own spellings, and, by
// format, code, tags and link targets. Each protected range is swapped for one private-use character before the rules
// run, then put back in order. No rule matches those characters, so the ranges come back exactly as written, and a
// position in the masked text maps back to the original (for check()).
//
// Every scan here reads the input a bounded number of times: a pattern that waits for a closing mark (a comment's -->, a
// </script>, a closing backtick) is found with indexOf, never with a regex that would rescan the text from every opening
// (test/performance.test.ts).

import type { Format } from "./options.js";

/**
 * Two kinds of slot. U+E000 stands for a word the rules must not glue anything to (a link, an email, a kept spelling):
 * "voir https://a.ca !" keeps its space. U+E001 stands for markup (a tag, a link's target, inline code), which the
 * punctuation around it ignores: "[le site](https://a.ca) !" becomes "[le site](https://a.ca)!".
 */
export const WORD = "";
export const MARKUP = "";

const URL = /\b(?:https?|ftp):\/\/[^\s<>"«»]+|\bwww\.[^\s<>"«»]+/giu;
// Starts only where a run of address characters starts, so a long text without "@" is read once, not once per letter.
const EMAIL = /(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
// A bare domain, with its path: lowercase top-level domain, so "M.Tremblay" or "fin.Voici" are not domains.
const DOMAIN = /(?<![\p{L}\p{N}@/.\-])(?:[\p{L}\p{N}-]+\.)+[a-z]{2,24}(?:\/[^\s<>"«»]*)?(?![\p{L}\p{N}])/gu;
// An HTTP header named in prose ("envoie Sec-Fetch-Dest: document"), its colon included: only the usual header
// families, so a place name ("Saint-Jean-Baptiste: fête") is still typeset.
const HEADER = /(?<![\p{L}\p{N}-])(?:X|Sec|Content|Accept|Access|Cache|If|Last|Set|Strict|Cross|Referrer|Permissions|Proxy|Retry|Transfer|User|WWW)(?:-[A-Z][A-Za-z0-9]*)+:/gu;
const ENTITY = /&(?:[a-z][a-z0-9]*|#\d+|#x[\da-f]+);/giu;
// Sentence punctuation right after a link belongs to the sentence, not the link. Counted from the end without a
// regex: an unanchored /[…]+$/ rescans a long run of marks from each of its characters (CodeQL js/polynomial-redos).
const TRAILING = new Set([".", ",", ";", ":", "!", "?", ")", "»", "”", "’"]);
const trailing = (s: string) => {
  let n = 0;
  while (n < s.length && TRAILING.has(s[s.length - 1 - n]!)) n++;
  return n;
};

/** HTML elements whose content is not prose. */
const RAW_HTML = "script|style|pre|code|kbd|samp|textarea|var|math|svg";
const RAW_MARKDOWN = "script|style|pre|code|kbd|samp";

export interface Masked {
  text: string;
  /** The original text of each slot, in order. */
  tokens: string[];
  /** For each slot, its position in the masked text and how many characters it stands for. */
  slots: { at: number; length: number }[];
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mask(input: string, format: Format, keep: readonly string[]): Masked {
  const taken = new Uint8Array(input.length);
  const ranges: [number, number, string][] = [];
  const claim = (a: number, b: number, slot: string) => {
    if (b <= a) return;
    for (let i = a; i < b; i++) if (taken[i]) return;
    taken.fill(1, a, b);
    ranges.push([a, b, slot]);
  };
  const add = (re: RegExp, slot: string, trim = false) => {
    for (const m of input.matchAll(re)) {
      const at = m.index ?? 0;
      claim(at, at + m[0].length - (trim ? trailing(m[0]) : 0), slot);
    }
  };
  const lower = format === "text" ? input : input.toLowerCase();
  /** From each opening to its closing text (or the end, when it never closes), found with indexOf. */
  const blocks = (open: RegExp, close: (m: RegExpExecArray) => string) => {
    open.lastIndex = 0;
    for (let m = open.exec(lower); m; m = open.exec(lower)) {
      const end = lower.indexOf(close(m), m.index + m[0].length);
      const stop = end === -1 ? input.length : end + close(m).length;
      claim(m.index, stop, MARKUP);
      if (end === -1) break;
      open.lastIndex = stop;
    }
  };

  add(/[]/g, WORD);
  if (format === "html") {
    blocks(/<!--/g, () => "-->");
    blocks(new RegExp(`<(${RAW_HTML})\\b`, "g"), (m) => `</${m[1]}`);
    add(/<[^<>]*>/g, MARKUP);
  } else if (format === "markdown") {
    const front = input.match(/^---\r?\n(?:[^\n]*\n)*?---(?=\r?\n|$)/);
    if (front) claim(0, front[0].length, MARKUP);
    fences(input, claim);
    inlineCode(input, claim);
    // A link's target and title; one level of balanced parentheses in the target (a Wikipedia address). An unmatched
    // "(" ends the attempt at once, so many unclosed "](" are read once, not rescanned (CodeQL js/polynomial-redos).
    add(/\]\((?:[^()\s]|\([^()\s]*\))*(?:\s+"[^"\n)]*")?\)/g, MARKUP);
    add(/^ {0,3}\[[^\]\n]+\]:[^\n]*$/gm, MARKUP); // a reference definition
    add(/<https?:\/\/[^<>\s]+>|<[^<>@\s]+@[^<>\s]+>/g, MARKUP); // autolinks
    blocks(/<!--/g, () => "-->");
    blocks(new RegExp(`<(${RAW_MARKDOWN})\\b`, "g"), (m) => `</${m[1]}`);
    add(/<\/?[a-z][^<>]*>/gi, MARKUP); // inline HTML tags
  }
  // The caller's own spellings, longest first, as whole words ("Toqué!", "Yahoo!").
  for (const word of [...keep].filter(Boolean).sort((a, b) => b.length - a.length)) {
    add(new RegExp(`(?<![\\p{L}\\p{N}])${escape(word)}(?![\\p{L}\\p{N}])`, "gu"), WORD);
  }
  add(URL, WORD, true);
  add(EMAIL, WORD);
  add(DOMAIN, WORD, true);
  add(ENTITY, WORD);
  add(HEADER, WORD);

  ranges.sort((a, b) => a[0] - b[0]);
  let text = "";
  let last = 0;
  const tokens: string[] = [];
  const slots: Masked["slots"] = [];
  for (const [a, b, slot] of ranges) {
    text += input.slice(last, a);
    slots.push({ at: text.length, length: b - a });
    tokens.push(input.slice(a, b));
    text += slot;
    last = b;
  }
  text += input.slice(last);
  return { text, tokens, slots };
}

type Claim = (a: number, b: number, slot: string) => void;

/** Fenced code blocks (``` or ~~~, three or more), each up to a closing fence of the same kind and at least its length. */
function fences(input: string, claim: Claim): void {
  const line = /^ {0,3}(`{3,}|~{3,})[^\n]*$/gm;
  let open: { at: number; fence: string } | null = null;
  for (const m of input.matchAll(line)) {
    const fence = m[1]!;
    if (!open) open = { at: m.index ?? 0, fence };
    else if (fence[0] === open.fence[0] && fence.length >= open.fence.length && m[0].trim() === fence) {
      claim(open.at, (m.index ?? 0) + m[0].length, MARKUP);
      open = null;
    }
  }
  if (open) claim(open.at, input.length, MARKUP);
}

/** Code spans: a run of backticks up to the next run of the same length in the same paragraph. */
function inlineCode(input: string, claim: Claim): void {
  const runs = [...input.matchAll(/`+/g)].map((m) => ({ at: m.index ?? 0, n: m[0].length }));
  const breaks = [...input.matchAll(/\n[ \t]*\n/g)].map((m) => m.index ?? 0);
  // For each run, the index of the next run with the same length.
  const next = new Array<number>(runs.length).fill(-1);
  const seen = new Map<number, number>();
  for (let i = runs.length - 1; i >= 0; i--) {
    next[i] = seen.get(runs[i]!.n) ?? -1;
    seen.set(runs[i]!.n, i);
  }
  let b = 0;
  for (let i = 0; i < runs.length; i++) {
    const j = next[i]!;
    if (j === -1) continue;
    const start = runs[i]!.at;
    const end = runs[j]!.at + runs[j]!.n;
    while (b < breaks.length && breaks[b]! < start) b++;
    if (b < breaks.length && breaks[b]! < runs[j]!.at) continue; // a blank line in between: not a code span
    claim(start, end, MARKUP);
    i = j; // the span's closing run can't open another
  }
}

export function unmask(text: string, tokens: readonly string[]): string {
  let i = 0;
  return text.replace(/[]/g, () => tokens[i++] ?? "");
}

/** The number of slots before a position in the masked text (binary search). */
export function slotsBefore(masked: Masked, at: number): number {
  let lo = 0;
  let hi = masked.slots.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (masked.slots[mid]!.at < at) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Maps positions in the masked text back to the original text, in O(log n) each. */
export function positions(masked: Masked): (at: number) => number {
  const shift = new Array<number>(masked.slots.length + 1);
  shift[0] = 0;
  masked.slots.forEach((s, i) => (shift[i + 1] = shift[i]! + s.length - 1));
  return (at) => at + shift[slotsBefore(masked, at)]!;
}

import { mask, positions, slotsBefore, unmask } from "./mask.js";
import { resolve, type Options } from "./options.js";
import { rules } from "./rules.js";

export type { Format, Locale, Options } from "./options.js";
export { NBSP, NNBSP } from "./rules.js";

export interface Issue {
  /** The rule's id, e.g. "high-punctuation". */
  rule: string;
  message: string;
  /** Where the problem starts in the input (UTF-16 index), and how many characters it covers (0: something is missing). */
  index: number;
  length: number;
  /** 1-based. */
  line: number;
  column: number;
  /** The text as written, and as it should be. Spaces are shown as they are: U+00A0 and U+202F included. */
  found: string;
  expected: string;
}

/**
 * French typography for a text: the spaces, quotation marks, apostrophes, hours, amounts and ordinals the Office
 * québécois de la langue française prescribes (or fr-FR's). Links, emails, domains, entities and the `keep` spellings
 * are left exactly as written; so are code, tags and link targets in markdown and HTML. Running it twice changes nothing.
 */
export function typeset(input: string, options?: Options): string {
  const o = resolve(options);
  const m = mask(input, o.format, o.keep);
  let text = m.text;
  for (const rule of rules(o)) text = text.replace(rule.re, rule.to as (...args: string[]) => string);
  return unmask(text, m.tokens);
}

/**
 * The typography problems in a text, without changing it: one issue per place a rule would change, in reading order.
 * An empty list means typeset() would leave the text as it is (for these options).
 */
export function check(input: string, options?: Options): Issue[] {
  const o = resolve(options);
  const m = mask(input, o.format, o.keep);
  const original = positions(m);
  const lines = lineStarts(input);
  const issues: Issue[] = [];
  for (const rule of rules(o)) {
    rule.re.lastIndex = 0;
    for (const hit of m.text.matchAll(rule.re)) {
      let expected = rule.to(hit[0], ...hit.slice(1));
      if (expected === hit[0]) continue;
      const at = hit.index ?? 0;
      const index = original(at);
      const end = original(at + hit[0].length);
      // A protected range inside the match (a link between quotes) comes back as written.
      if (/[]/.test(expected)) {
        const first = slotsBefore(m, at);
        expected = unmask(expected, m.tokens.slice(first, first + hit[0].length));
      }
      const line = lineOf(lines, index);
      issues.push({ rule: rule.id, message: rule.message, index, length: end - index, line: line + 1, column: index - lines[line]! + 1, found: input.slice(index, end), expected });
    }
  }
  return issues.sort((a, b) => a.index - b.index);
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
}

/** The 0-based line holding an index (binary search). */
function lineOf(starts: readonly number[], index: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid]! <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

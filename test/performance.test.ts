import { describe, expect, it } from "vitest";
import { check, typeset } from "../src/index.js";

// Inputs built to make a careless pattern backtrack: long runs with the one character it waits for missing. Each must
// finish well inside a second on a large input (a quadratic pattern takes minutes here).
const N = 200_000;
const hostile: Record<string, string> = {
  "letters, no @": "a".repeat(N),
  "address characters, no @": "a.b_c%d+e-".repeat(N / 10),
  "dots": "a.".repeat(N / 2),
  "spaces before nothing": `a${" ".repeat(N)}b`,
  "digits": "1".repeat(N),
  "digits and spaces": "1 ".repeat(N / 2),
  "unclosed quotes": '"a '.repeat(N / 3),
  "unclosed guillemets": "« a ".repeat(N / 4),
  "colons": "a :".repeat(N / 3),
  "header names, no colon": `Sec${"-Fetch".repeat(N / 6)}`,
  "header names": "X-A".repeat(N / 3),
  "attributes, unclosed": 'x="'.repeat(N / 3),
  "attribute, long": `x="${"a".repeat(N)}`,
  "hours": "8h".repeat(N / 2),
  "unclosed backticks": "`a ".repeat(N / 3),
  "unclosed tags": "<a ".repeat(N / 3),
  "unclosed fences": "```\n".repeat(N / 4),
  "links beside problems": "a@b.co ? ".repeat(N / 9),
  "a problem on every line": "x :\n".repeat(N / 4),
  "unclosed comments": "<!-- a ".repeat(N / 7),
  "unclosed raw elements": "<script a ".repeat(N / 10),
  // CodeQL js/polynomial-redos, 25 Nov 2026: a link's trailing punctuation, and Markdown link targets that never close.
  "a link followed by marks": `https://a.ca/${"!".repeat(N)}x`,
  "unclosed link targets": "](".repeat(N / 2),
};

describe("performance", () => {
  for (const [name, input] of Object.entries(hostile)) {
    it(`${name}: linear enough`, () => {
      for (const format of ["text", "markdown", "html"] as const) {
        const started = performance.now();
        typeset(input, { format });
        check(input, { format });
        expect(performance.now() - started, `${format}`).toBeLessThan(1500);
      }
    });
  }
});

// The JavaScript reader (src/javascript.ts) on the inputs that slow a scanner: unclosed strings, templates, comments and
// regular expressions, deep ${…} nesting, and keys without values.
describe("JavaScript files", async () => {
  const { processText } = await import("../src/files.js");
  const code: Record<string, string> = {
    "unclosed strings": '= "a '.repeat(N / 5),
    "unclosed templates": "`a ${".repeat(N / 5),
    "nested templates": "`${".repeat(N / 3),
    "unclosed comments": "/* a ".repeat(N / 5),
    "regex-like slashes": "= /a".repeat(N / 4),
    "keys without colons": '{ "a" '.repeat(N / 6),
    "spaces before a colon": `{ "fr"${" ".repeat(N)}`,
    "French strings": `x = "C'est l'été : oui !"; `.repeat(N / 25),
    "JSX apostrophes": "<p>l'été d'abord</p>".repeat(N / 20),
  };
  for (const [name, source] of Object.entries(code)) {
    it(name, () => {
      const started = performance.now();
      processText(source, "javascript", {}, undefined, "fr.ts");
      expect(performance.now() - started).toBeLessThan(3000);
    });
  }
});

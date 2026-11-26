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
// The JSON editor (files.ts) on deep nesting, long strings, many keys and long runs of escapes.
describe("JSON files", async () => {
  const { processText } = await import("../src/files.js");
  const json: Record<string, string> = {
    "deep nesting": `${"[".repeat(N / 4)}${"]".repeat(N / 4)}`,
    "deep objects": `${'{"a":'.repeat(N / 10)}1${"}".repeat(N / 10)}`,
    "one long string": JSON.stringify({ a: `Prêt ? ${"a ".repeat(N / 2)}` }),
    "many keys": JSON.stringify(Object.fromEntries(Array.from({ length: N / 20 }, (_, i) => [`k${i}`, "C'est l'été : oui"]))),
    "escapes": JSON.stringify({ a: '\\"'.repeat(N / 4) }),
  };
  for (const [name, source] of Object.entries(json)) {
    it(name, () => {
      const started = performance.now();
      processText(source, "json", {});
      expect(performance.now() - started).toBeLessThan(3000);
    });
  }
});

// The translation readers (formats.ts): unclosed tags and quotes, long lines, many entries.
describe("translation files", async () => {
  const { kindOf, processText } = await import("../src/files.js");
  const files: [string, string][] = [
    ["res/values-fr/strings.xml", "<string>a ".repeat(N / 10)],
    ["res/values-fr/strings.xml", `<resources>${"<item>Lundi : fermé</item>".repeat(N / 25)}</resources>`],
    ["fr.lproj/Localizable.strings", '"a" = "'.repeat(N / 7)],
    ["fr.lproj/Localizable.strings", '"k" = "Prêt : oui";\n'.repeat(N / 20)],
    ["fr.po", 'msgstr "'.repeat(N / 8)],
    ["fr.po", 'msgid "a"\nmsgstr "Prêt : oui"\n'.repeat(N / 30)],
    ["fr.xlf", `target-language="fr" ${"<target>a ".repeat(N / 10)}`],
    ["config/locales/fr.yml", `fr:\n${"  k: Prêt : oui\n".repeat(N / 16)}`],
    ["config/locales/fr.yml", `fr:\n  k: ${" ".repeat(N)}x`],
    ["config/locales/fr.yml", `fr:\n  - ${"- ".repeat(N / 2)}`],
    ["messages_fr.properties", `k=${"\\".repeat(N)}`],
    ["messages_fr.properties", "k=Prêt : oui\n".repeat(N / 12)],
  ];
  for (const [path, source] of files) {
    it(`${path}: ${source.slice(0, 24).replace(/\n/g, "\\n")}…`, () => {
      const started = performance.now();
      processText(source, kindOf(path), {}, undefined, path);
      expect(performance.now() - started).toBeLessThan(3000);
    });
  }
});

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
    "braces, one far close": `x = "${"{a ".repeat(N / 3)}}";`,
    "semicolons, no brace": `x = "${"a; ".repeat(N / 3)}";`,
    "custom properties": `x = "${"--a: 1; ".repeat(N / 8)}";`,
    "words of every language": `x = "${"de la que il en the der het ".repeat(N / 30)}";`,
  };
  for (const [name, source] of Object.entries(code)) {
    it(name, () => {
      const started = performance.now();
      processText(source, "javascript", {}, undefined, "fr.ts");
      expect(performance.now() - started).toBeLessThan(3000);
    });
  }
});

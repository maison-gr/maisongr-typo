import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { expand, kindOf, processText } from "../src/files.js";

const NBSP = " ";

describe("kindOf", () => {
  it("reads the format from the extension", () => {
    expect(["a.md", "a.MDX", "a.markdown", "a.html", "a.htm", "a.json", "a.txt", "a"].map(kindOf))
      .toEqual(["markdown", "markdown", "markdown", "html", "html", "json", "text", "text"]);
  });
});

describe("JSON", () => {
  it("typesets string values, never keys, and only under --only-key when given", () => {
    const source = `{\n  "fr": { "q": "Prêt ?", "n": 3 },\n  "en": { "q": "Ready ?" }\n}\n`;
    const all = processText(source, "json", {});
    expect(JSON.parse(all.output)).toEqual({ fr: { q: "Prêt?", n: 3 }, en: { q: "Ready?" } });
    const fr = processText(source, "json", {}, "fr");
    expect(JSON.parse(fr.output)).toEqual({ fr: { q: "Prêt?", n: 3 }, en: { q: "Ready ?" } });
    expect(fr.issues.map((i) => [i.key, i.rule])).toEqual([["fr.q", "high-punctuation"]]);
    expect(fr.output.endsWith("}\n")).toBe(true);
  });

  it("keeps a file with nothing to fix byte for byte, and its indentation otherwise", () => {
    const clean = `{"fr":{"q":"Prêt?"}}`;
    expect(processText(clean, "json", {}).output).toBe(clean);
    const tabbed = `{\n\t"a": "x :"\n}`;
    expect(processText(tabbed, "json", {}).output).toBe(`{\n\t"a": "x${NBSP}:"\n}`);
  });

  it("keeps a byte order mark", () => {
    expect(processText("﻿Prêt ?", "text", {}).output).toBe("﻿Prêt?");
  });
});

describe("expand", () => {
  const dir = mkdtempSync(join(tmpdir(), "maisongr-typo-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("walks folders for text files, skipping dependencies and build output, and never picks up JSON", () => {
    mkdirSync(join(dir, "docs"));
    mkdirSync(join(dir, "node_modules"));
    for (const f of ["docs/a.md", "docs/b.html", "docs/c.json", "node_modules/d.md", "e.txt"]) writeFileSync(join(dir, f), "x");
    expect(expand([dir]).map((p) => p.slice(dir.length + 1).replace(/\\/g, "/"))).toEqual(["docs/a.md", "docs/b.html", "e.txt"]);
    expect(expand([join(dir, "docs", "c.json")])).toEqual([join(dir, "docs", "c.json")]);
  });
});

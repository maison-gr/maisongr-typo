import { describe, expect, it } from "vitest";
import { processText } from "../src/files.js";
import { decode, encode, isFrenchFile, looksFrench } from "../src/javascript.js";
import { NBSP } from "../src/index.js";

// Spaces spelled out: _ is U+00A0 (no-break).
const s = (t: string) => t.replace(/_/g, NBSP);
const fix = (source: string, path = "src/app.ts") => processText(source, "javascript", {}, undefined, path).output;

describe("JavaScript and TypeScript", () => {
  // Resistaa: src/lib/translations/namespaces/common/fr.ts
  it("typesets every string of a French file, never its keys", () => {
    const source = `export const common = {
    tagline: "Pour le cerveau qui sait — mais ne peut pas commencer",
    // Bandeau : cookies d'analyse
    cookieBannerMessage: "Nous utilisons des cookies d'analyse pour comprendre l'utilisation de Resistaa.",
    "note:x": "Note : texte",
    ok: 'Accepter',
};
`;
    expect(fix(source, "src/lib/translations/namespaces/common/fr.ts")).toBe(s(`export const common = {
    tagline: "Pour le cerveau qui sait — mais ne peut pas commencer",
    // Bandeau : cookies d'analyse
    cookieBannerMessage: "Nous utilisons des cookies d’analyse pour comprendre l’utilisation de Resistaa.",
    "note:x": "Note_: texte",
    ok: 'Accepter',
};
`));
  });

  // maisonGR: src/data/costs-page.ts
  it("typesets what is under an fr key, at any depth, and leaves the en branch alone", () => {
    const source = `export const copy = {
  fr: { heroAccent: "un logiciel au Québec ?", kinds: { ai: "Projets d'intelligence artificielle" }, list: ["Prix : 5 $"] },
  en: { heroAccent: "software in Quebec ?", kinds: { ai: "Don't panic : AI" } },
  "fr-CA": "C'est tout",
};`;
    expect(fix(source)).toBe(s(`export const copy = {
  fr: { heroAccent: "un logiciel au Québec?", kinds: { ai: "Projets d’intelligence artificielle" }, list: ["Prix_: 5_$"] },
  en: { heroAccent: "software in Quebec ?", kinds: { ai: "Don't panic : AI" } },
  "fr-CA": "C’est tout",
};`));
  });

  // Signum: BilingualStory.tsx and auth.email.js
  it("typesets inline strings that read as French, and leaves English and code alone", () => {
    const source = `const badge = isFr ? 'Bilingue par conception : pour tous' : 'Bilingual by design : yes';
const html = frHead('Réinitialisation du mot de passe') + frSub(\`Bonjour \${d.recipientName}, cliquez ci-dessous pour l'accès !\`);
const cls = "flex gap-2 md:items-center";`;
    expect(fix(source)).toBe(s(`const badge = isFr ? 'Bilingue par conception_: pour tous' : 'Bilingual by design : yes';
const html = frHead('Réinitialisation du mot de passe') + frSub(\`Bonjour \${d.recipientName}, cliquez ci-dessous pour l’accès!\`);
const cls = "flex gap-2 md:items-center";`));
  });

  it("never touches module paths, template expressions or regular expressions", () => {
    const source = `import fr from "./l'été : fr.json";
export { x } from './a : b';
const m = require("d'où : x");
const re = /'(l'été) : "x"/g;
const t = \`Il est \${n > 1 ? "l'heure : là" : 'x'} à l'heure\`;`;
    const out = fix(source, "locales/fr/index.ts");
    expect(out.split("\n").slice(0, 4).join("\n")).toBe(source.split("\n").slice(0, 4).join("\n"));
    // Strings inside a template expression are strings too, French ones typeset; the expression's code is kept.
    expect(out.split("\n")[4]).toBe(s("const t = `Il est ${n > 1 ? \"l’heure_: là\" : 'x'} à l’heure`;"));
  });

  it("doesn't mistake JSX text for strings: an apostrophe after a letter is text", () => {
    const source = `export const A = () => <p title="Aide à l'accès : ici">C'est l'été, n'est-ce pas ? <b>Oui</b></p>;`;
    // The attribute is a string; the JSX text is not read (no quote opens a string after a letter).
    expect(fix(source, "fr.tsx")).toBe(s(`export const A = () => <p title="Aide à l’accès_: ici">C'est l'été, n'est-ce pas ? <b>Oui</b></p>;`));
  });

  it("keeps escapes valid: decodes, typesets, and escapes only what must be", () => {
    const source = `const a = 'Nous utilisons des cookies d\\'analyse : oui';
const b = "Ligne un : fin\\nligne deux";
const c = "Déjà vu\\u00a0? Non";`;
    expect(fix(source, "fr.js")).toBe(s(`const a = 'Nous utilisons des cookies d’analyse_: oui';
const b = "Ligne un_: fin\\nligne deux";
const c = "Déjà vu? Non";`));
  });

  // Found in Signum's email templates (25 Nov 2026): the quotes rule turned lang="en" into lang=« en ».
  it("typesets HTML in a string as HTML, across ${…} too: tags and attributes stay as written", () => {
    const source = "const html = `<!DOCTYPE html>\n<html lang=\"fr-CA\"><body style=\"margin:0;\">\n<td style=\"color:${c};font:\" class=\"x\">Bonjour ${name} : voici l'accès \"VIP\" !</td><a href=\"/x?y=1\">Ici</a></body></html>`;\nconst p = '<p class=\"note\">Écrivez-nous : c\\'est simple</p>';";
    expect(fix(source)).toBe(s("const html = `<!DOCTYPE html>\n<html lang=\"fr-CA\"><body style=\"margin:0;\">\n<td style=\"color:${c};font:\" class=\"x\">Bonjour ${name}_: voici l’accès «_VIP_»!</td><a href=\"/x?y=1\">Ici</a></body></html>`;\nconst p = '<p class=\"note\">Écrivez-nous_: c’est simple</p>';"));
  });

  it("keeps a file with nothing to fix byte for byte, line endings included", () => {
    const source = "export default {\r\n  title: \"Bonjour\",\r\n  en: \"Hello : there\",\r\n};\r\n";
    expect(fix(source, "fr.ts")).toBe(source.replace("Hello : there", s("Hello_: there")));
    const english = "const x = 'Hello : world';\r\n";
    expect(fix(english)).toBe(english);
  });

  it("reports each problem at its line and column in the file", () => {
    const { issues } = processText(`const x = 1;\nconst y = "Prix : l'été";\n`, "javascript", {}, undefined, "fr.ts");
    expect(issues.map((i) => [i.rule, i.line, i.column]).sort((a, b) => (a[2] as number) - (b[2] as number))).toEqual([["colon", 2, 16], ["apostrophe", 2, 20]]);
  });
});

describe("folders", () => {
  // Found in maisonGR (25 Nov 2026): a test's strings are source code it compares against, not prose.
  it("skips tests in a walk, and reads code only when asked or when the file is French", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join, relative } = await import("node:path");
    const { expand } = await import("../src/files.js");
    const root = mkdtempSync(join(tmpdir(), "typo-walk-"));
    try {
      for (const f of ["src/app.ts", "src/app.test.ts", "src/app.spec.tsx", "src/fr.ts", "src/types.d.ts", "src/__tests__/fr.ts", "test/fr.ts", "locales/fr/common.ts", "README.md"]) {
        mkdirSync(join(root, f, ".."), { recursive: true });
        writeFileSync(join(root, f), "");
      }
      const rel = (code: boolean) => expand([root], code).map((p) => relative(root, p).replace(/\\/g, "/")).sort();
      expect(rel(false)).toEqual(["README.md", "locales/fr/common.ts", "src/fr.ts"]);
      expect(rel(true)).toEqual(["README.md", "locales/fr/common.ts", "src/app.ts", "src/fr.ts"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("helpers", () => {
  it("knows French files by name or folder", () => {
    for (const p of ["fr.ts", "src/fr-CA.js", "messages.fr.ts", "locales/fr/common.tsx", "i18n/fr_CA/index.mjs"]) expect(isFrenchFile(p), p).toBe(true);
    for (const p of ["src/app.ts", "free.ts", "frame.tsx", "locales/en/common.ts"]) expect(isFrenchFile(p), p).toBe(false);
  });

  it("tells French strings from English ones and from code", () => {
    for (const t of ["Politique de confidentialité", "Gérer les cookies", "Nous utilisons des cookies d'analyse", "« Bonjour »", "C'est l'été"]) expect(looksFrench(t), t).toBe(true);
    for (const t of ["Bilingual by design", "Montréal", "flex gap-2 md:items-center", "Accepter", "The café is open for you", "", "/api/v1/users"]) expect(looksFrench(t), t).toBe(false);
  });

  it("decodes and encodes JavaScript strings both ways", () => {
    expect(decode("a\\'b\\n\\u00e9\\u{1F600}\\x41\\\\")).toBe("a'b\né😀A\\");
    expect(encode("l'été\n\\", "'")).toBe("l\\'été\\n\\\\");
    expect(encode("a`${b}", "`")).toBe("a\\`\\${b}");
  });
});

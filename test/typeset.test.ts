import { describe, expect, it } from "vitest";
import { check, typeset, NBSP, NNBSP } from "../src/index.js";

// Spaces are spelled out so a test can't pass by accident: _ is U+00A0 (no-break), ~ is U+202F (narrow no-break).
const s = (t: string) => t.replace(/_/g, NBSP).replace(/~/g, NNBSP);

describe("fr-CA, the Office québécois de la langue française", () => {
  it("leaves no space before ; ! ? (the OQLF's choice)", () => {
    expect(typeset("Vraiment ? Oui ! Enfin ; voilà.")).toBe("Vraiment? Oui! Enfin; voilà.");
    expect(typeset(s("Prêt_?"))).toBe("Prêt?");
    expect(typeset("Quoi ?!")).toBe("Quoi?!");
  });

  it("puts a narrow no-break space there on request", () => {
    expect(typeset("Prêt? Oui!", { highPunctuation: "narrow" })).toBe(s("Prêt~? Oui~!"));
  });

  it("puts a no-break space before the colon, added when missing", () => {
    expect(typeset("Heures d'ouverture: lundi")).toBe(s("Heures d’ouverture_: lundi"));
    expect(typeset("Note : texte")).toBe(s("Note_: texte"));
    expect(typeset("Titre :\nsuite")).toBe(s("Titre_:\nsuite"));
  });

  it("puts no-break spaces inside « »", () => {
    expect(typeset("«Bonjour»")).toBe(s("«_Bonjour_»"));
    expect(typeset("« Bonjour »")).toBe(s("«_Bonjour_»"));
  });

  it("turns straight double quotes into « »", () => {
    expect(typeset('Il a dit "merci" hier.')).toBe(s("Il a dit «_merci_» hier."));
    expect(typeset('Il a dit "merci" hier.', { quotes: false })).toBe('Il a dit "merci" hier.');
  });

  it("writes the hour with h and no-break spaces (OQLF 21516)", () => {
    expect(typeset("de 8h30 à 22h")).toBe(s("de 8_h_30 à 22_h"));
    expect(typeset("ouvert à 18H15")).toBe(s("ouvert à 18_h_15"));
    expect(typeset("Heures d’ouverture : 8 h 30 – 16 h 30")).toBe(s("Heures d’ouverture_: 8_h_30 – 16_h_30"));
    expect(typeset("17 h 05")).toBe(s("17_h_05"));
  });

  it("leaves 8:30 unless asked", () => {
    expect(typeset("à 8:30")).toBe("à 8:30");
    expect(typeset("à 8:30", { colonHours: true })).toBe(s("à 8_h_30"));
    expect(typeset("13:52:45", { colonHours: true })).toBe("13:52:45");
  });

  it("puts the dollar sign after the amount, with a no-break space (OQLF 21584, 21400)", () => {
    expect(typeset("29$")).toBe(s("29_$"));
    expect(typeset("$29")).toBe(s("29_$"));
    expect(typeset("25,50 $")).toBe(s("25,50_$"));
    expect(typeset("85 M$")).toBe(s("85_M$"));
    // An English amount is left alone rather than guessed at.
    expect(typeset("$29.99")).toBe("$29.99");
  });

  it("groups an amount's digits by three; four digits only on request (OQLF 25447)", () => {
    expect(typeset("12535,75 $")).toBe(s("12_535,75_$"));
    expect(typeset("50000 $")).toBe(s("50_000_$"));
    expect(typeset("1490 $")).toBe(s("1490_$"));
    expect(typeset("1490 $", { groupFourDigits: true })).toBe(s("1_490_$"));
    expect(typeset("1 490 $")).toBe(s("1_490_$"));
    // After a word and a space, not only at the start of the text.
    expect(typeset("total 12535 $ et 15%")).toBe(s("total 12_535_$ et 15_%"));
  });

  it("never groups identifiers, years or addresses", () => {
    expect(typeset("10985, rue des Érables")).toBe("10985, rue des Érables");
    expect(typeset("en 2026")).toBe("en 2026");
    expect(typeset("dossier 562498")).toBe("dossier 562498");
  });

  it("joins existing digit groups with a no-break space", () => {
    expect(typeset("3 000 personnes")).toBe(s("3_000 personnes"));
  });

  it("puts a no-break space before % and degrees (OQLF 22039, 21401)", () => {
    expect(typeset("8,5% et 20°C")).toBe(s("8,5_% et 20_°C"));
  });

  it("writes ordinals 2e, 1er, 1re", () => {
    expect(typeset("le 2ème, le 3ième, la 1ère et le 1ier")).toBe("le 2e, le 3e, la 1re et le 1er");
    expect(typeset("les 2èmes")).toBe("les 2es");
  });

  it("uses the typographic apostrophe and the ellipsis character", () => {
    expect(typeset("l'été... enfin")).toBe("l’été… enfin");
  });

  it("removes a space before a comma or a period", () => {
    expect(typeset("oui , merci .")).toBe("oui, merci.");
    expect(typeset("1 ,5")).toBe("1 ,5");
    // Found in real copy: a file type is not a period.
    expect(typeset("Télécharger en .txt ou en .zip.")).toBe("Télécharger en .txt ou en .zip.");
  });
});

describe("fr-FR", () => {
  it("puts a narrow no-break space before ; ! ? and between digit groups", () => {
    expect(typeset("Prêt? Oui ! 3 000 €", { locale: "fr-FR" })).toBe(s("Prêt~? Oui~! 3~000_€"));
  });
  it("can't be asked for no space before ; ! ?", () => {
    expect(typeset("Prêt?", { locale: "fr-FR", highPunctuation: "none" })).toBe(s("Prêt~?"));
  });
});

describe("what it never touches", () => {
  it("leaves links, emails and domains as written", () => {
    const text = "Écrivez à info@exemple.ca ou voyez https://exemple.ca/a?b=1 et maisongr.com/fr: merci";
    expect(typeset(text)).toBe(s("Écrivez à info@exemple.ca ou voyez https://exemple.ca/a?b=1 et maisongr.com/fr_: merci"));
  });

  it("keeps the sentence's punctuation after a link", () => {
    expect(typeset("Voir https://exemple.ca !")).toBe("Voir https://exemple.ca !");
    expect(typeset("Voir https://exemple.ca.")).toBe("Voir https://exemple.ca.");
  });

  it("leaves the keep spellings exactly as written", () => {
    expect(typeset("Bienvenue chez Toqué! ce soir", { keep: ["Toqué!"] })).toBe("Bienvenue chez Toqué! ce soir");
    expect(typeset("Toqué!: le menu", { keep: ["Toqué!"] })).toBe(s("Toqué!_: le menu"));
  });

  // Found in maisonGR's guides (25 Nov 2026): an HTTP header named in French prose.
  it("leaves HTTP header names as written, and still typesets a French place name", () => {
    expect(typeset("le navigateur envoie Sec-Fetch-Dest: document, et Content-Type: text/html")).toBe("le navigateur envoie Sec-Fetch-Dest: document, et Content-Type: text/html");
    expect(typeset("Saint-Jean-Baptiste: fête")).toBe(s("Saint-Jean-Baptiste_: fête"));
  });

  // Found in maisonGR's guides: an attribute quoted in prose is code, not a quotation.
  it("leaves name=\"value\" as written, and still makes quotations « »", () => {
    expect(typeset('xml-stylesheet avec type="text/css" n’est pas retiré, dit "Chrome"')).toBe(s('xml-stylesheet avec type="text/css" n’est pas retiré, dit «_Chrome_»'));
  });

  it("leaves HTML entities, and times in tables", () => {
    expect(typeset("A &amp; B&nbsp;!")).toBe("A &amp; B&nbsp;!");
    expect(typeset("12:30")).toBe("12:30");
  });
});

describe("markdown", () => {
  const md = { format: "markdown" as const };
  it("typesets the text, never code, link targets or front matter", () => {
    const input = [
      "---",
      "title: Bonjour",
      "---",
      "Voici `a ? b` et [le site](https://exemple.ca/?x=1 \"titre : ici\") !",
      "",
      "```js",
      'const a = "b" ; // ?',
      "```",
      "Fin : merci",
    ].join("\n");
    expect(typeset(input, md)).toBe(s([
      "---",
      "title: Bonjour",
      "---",
      "Voici `a ? b` et [le site](https://exemple.ca/?x=1 \"titre : ici\")!",
      "",
      "```js",
      'const a = "b" ; // ?',
      "```",
      "Fin_: merci",
    ].join("\n")));
  });
});

describe("markdown link targets", () => {
  it("keeps a target with balanced parentheses whole, and still typesets around a broken one", () => {
    const md = { format: "markdown" as const };
    expect(typeset("[Film](https://fr.wikipedia.org/wiki/Prêt_(film)) !", md)).toBe("[Film](https://fr.wikipedia.org/wiki/Prêt_(film))!");
    expect(typeset("Lien ](cassé : fin", md)).toBe(s("Lien ](cassé_: fin"));
  });
});

describe("html", () => {
  const html = { format: "html" as const };
  it("typesets text nodes, never tags, attributes or code", () => {
    const input = '<p title="a ? b">Prêt ? <a href="/x?y=1">Oui</a> : <code>a ? b</code></p><script>if (a ? b : c) {}</script>';
    expect(typeset(input, html)).toBe(s('<p title="a ? b">Prêt? <a href="/x?y=1">Oui</a>_: <code>a ? b</code></p><script>if (a ? b : c) {}</script>'));
  });
});

describe("Windows line endings and uppercase HTML", () => {
  it("typesets CRLF text the same way, keeping its line endings", () => {
    expect(typeset("Titre :\r\nPrêt ?\r\n")).toBe(s("Titre_:\r\nPrêt?\r\n"));
    const md = "```\r\na ? b\r\n```\r\nFin : ok\r\n";
    expect(typeset(md, { format: "markdown" })).toBe(s("```\r\na ? b\r\n```\r\nFin_: ok\r\n"));
  });

  it("protects tags and raw elements written in capitals", () => {
    expect(typeset("<P>Prêt ?</P><SCRIPT>a ? b</SCRIPT>", { format: "html" })).toBe("<P>Prêt?</P><SCRIPT>a ? b</SCRIPT>");
  });
});

describe("check", () => {
  it("reports each problem where it is, and nothing once fixed", () => {
    const text = "Bonjour !\nIl est 8h30 ; le total : 29$";
    const issues = check(text);
    expect(issues.map((i) => [i.rule, i.line, i.column])).toEqual([
      ["high-punctuation", 1, 8],
      ["hour", 2, 8],
      ["high-punctuation", 2, 12],
      ["colon", 2, 23],
      ["symbol", 2, 28],
    ]);
    expect(issues[3]).toMatchObject({ found: " :", expected: s("_:") });
    expect(check(typeset(text))).toEqual([]);
  });

  it("maps positions past a protected range", () => {
    const [issue] = check("https://exemple.ca/a?b=1 puis Note: x");
    expect(issue).toMatchObject({ rule: "colon", line: 1, column: 35, found: ":" });
  });
});

describe("idempotence", () => {
  const samples = [
    "Vraiment ? « Oui » : 8h30, 29$, 12535 $, 1ère fois... l'été !",
    '"Bonjour" ; https://a.ca/x?y=1 ; 3 000 personnes à 22H',
    "Prêt?! Note:\nFin ; ok",
  ];
  for (const locale of ["fr-CA", "fr-FR"] as const) {
    for (const highPunctuation of ["none", "narrow"] as const) {
      it(`${locale}, ${highPunctuation}: typesetting twice changes nothing, and check agrees`, () => {
        for (const sample of samples) {
          const once = typeset(sample, { locale, highPunctuation });
          expect(typeset(once, { locale, highPunctuation })).toBe(once);
          expect(check(once, { locale, highPunctuation })).toEqual([]);
        }
      });
    }
  }
});

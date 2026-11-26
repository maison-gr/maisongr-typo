import { describe, expect, it } from "vitest";
import { kindOf, processText } from "../src/files.js";
import { languageOfPath } from "../src/formats.js";
import { NBSP } from "../src/index.js";

// Spaces spelled out: ⍽ is U+00A0 (no-break). Not "_": translation keys and headers are full of underscores.
const s = (t: string) => t.replace(/⍽/g, NBSP);
const fix = (source: string, path: string) => processText(source, kindOf(path), {}, undefined, path).output;

describe("iOS and macOS: Localizable.strings", () => {
  it("typesets values, never keys or comments, and keeps C escapes", () => {
    const source = `/* Écran : accueil */\n"welcome.title" = "Bienvenue : c'est parti !";\n// "x" = "y : z"\n"quote" = "Il a dit \\"oui\\" hier.";\n`;
    expect(fix(source, "App/fr.lproj/Localizable.strings")).toBe(s(`/* Écran : accueil */\n"welcome.title" = "Bienvenue⍽: c’est parti!";\n// "x" = "y : z"\n"quote" = "Il a dit «⍽oui⍽» hier.";\n`));
  });

  it("leaves another language's file alone", () => {
    const source = `"a" = "Hello : world !";\n`;
    expect(fix(source, "App/en.lproj/Localizable.strings")).toBe(source);
  });
});

describe("Xcode string catalogs: .xcstrings", () => {
  it("typesets the French localizations only, plurals included", () => {
    const source = JSON.stringify({
      sourceLanguage: "en",
      strings: {
        "Ready?": {
          localizations: {
            en: { stringUnit: { state: "translated", value: "Ready ?" } },
            fr: { stringUnit: { state: "translated", value: "Prêt ?" } },
            "fr-CA": { variations: { plural: { one: { stringUnit: { state: "translated", value: "%d tâche : l'été" } } } } },
          },
        },
      },
    }, null, 2);
    const out = JSON.parse(fix(source, "App/Localizable.xcstrings"));
    const l = out.strings["Ready?"].localizations;
    expect(l.en.stringUnit.value).toBe("Ready ?");
    expect(l.fr.stringUnit.value).toBe("Prêt?");
    expect(l["fr-CA"].variations.plural.one.stringUnit.value).toBe(s("%d tâche⍽: l’été"));
    expect(Object.keys(out.strings)).toEqual(["Ready?"]);
  });
});

describe("Android: res/values-fr/strings.xml", () => {
  it("typesets strings, plurals and arrays, keeps Android's escapes and the tags' attributes", () => {
    const source = `<resources>
  <string name="app_name" translatable="false">Signum : l'app</string>
  <string name="welcome">Bienvenue, <xliff:g id="name" example="Luc">%1$s</xliff:g> : c\\'est l\\'été !</string>
  <string name="quote">Il a dit \\"oui\\".</string>
  <plurals name="tasks"><item quantity="one">%d tâche : prête</item></plurals>
  <string-array name="days"><item>Lundi : fermé</item></string-array>
</resources>`;
    expect(fix(source, "app/src/main/res/values-fr/strings.xml")).toBe(s(`<resources>
  <string name="app_name" translatable="false">Signum : l'app</string>
  <string name="welcome">Bienvenue, <xliff:g id="name" example="Luc">%1$s</xliff:g>⍽: c’est l’été!</string>
  <string name="quote">Il a dit «⍽oui⍽».</string>
  <plurals name="tasks"><item quantity="one">%d tâche⍽: prête</item></plurals>
  <string-array name="days"><item>Lundi⍽: fermé</item></string-array>
</resources>`));
  });

  it("leaves the default (values/) and other languages' strings alone", () => {
    const source = `<resources><string name="a">Prêt : oui !</string></resources>`;
    expect(fix(source, "res/values/strings.xml")).toBe(source);
    expect(fix(source, "res/values-de/strings.xml")).toBe(source);
  });
});

describe("gettext: .po", () => {
  it("typesets msgstr lines, never msgid, comments or the header", () => {
    const source = `msgid ""\nmsgstr ""\n"Language: fr\\n"\n"Content-Type: text/plain; charset=UTF-8\\n"\n\n#: app.py:12\nmsgid "Ready?"\nmsgstr "Prêt ?"\n\nmsgid ""\n"A long text: here"\nmsgstr ""\n"Un long texte : ici "\n"et l'été."\n\nmsgid "%d task"\nmsgid_plural "%d tasks"\nmsgstr[0] "%d tâche : une"\nmsgstr[1] "%d tâches : plusieurs"\n`;
    expect(fix(source, "locale/messages.po")).toBe(s(`msgid ""\nmsgstr ""\n"Language: fr\\n"\n"Content-Type: text/plain; charset=UTF-8\\n"\n\n#: app.py:12\nmsgid "Ready?"\nmsgstr "Prêt?"\n\nmsgid ""\n"A long text: here"\nmsgstr ""\n"Un long texte⍽: ici "\n"et l’été."\n\nmsgid "%d task"\nmsgid_plural "%d tasks"\nmsgstr[0] "%d tâche⍽: une"\nmsgstr[1] "%d tâches⍽: plusieurs"\n`));
  });

  it("knows a French catalogue by its folder or its name too, and leaves others alone", () => {
    const entry = `msgid "a"\nmsgstr "Prêt ?"\n`;
    expect(fix(entry, "locale/fr/LC_MESSAGES/django.po")).toBe(`msgid "a"\nmsgstr "Prêt?"\n`);
    expect(fix(entry, "po/fr_CA.po")).toBe(`msgid "a"\nmsgstr "Prêt?"\n`);
    expect(fix(entry, "locale/de/LC_MESSAGES/django.po")).toBe(entry);
  });
});

describe("XLIFF", () => {
  it("typesets French targets, never sources, and keeps inline tags and entities", () => {
    const source = `<xliff version="1.2"><file source-language="en" target-language="fr-CA"><body>
<trans-unit id="1"><source>Ready?</source><target>Prêt ? <g id="1">Oui</g> : c'est &amp; "ça"</target></trans-unit>
<trans-unit id="2"><source>x</source><target/></trans-unit>
</body></file></xliff>`;
    expect(fix(source, "messages.xlf")).toBe(s(`<xliff version="1.2"><file source-language="en" target-language="fr-CA"><body>
<trans-unit id="1"><source>Ready?</source><target>Prêt? <g id="1">Oui</g>⍽: c’est &amp; «⍽ça⍽»</target></trans-unit>
<trans-unit id="2"><source>x</source><target/></trans-unit>
</body></file></xliff>`));
    expect(fix(source.replace("fr-CA", "de"), "messages.xlf")).toBe(source.replace("fr-CA", "de"));
  });
});

describe("YAML", () => {
  it("typesets plain, quoted and block values in a French file, and quotes a plain value that would become ambiguous", () => {
    const source = `fr:\n  hello: "Bonjour : bienvenue"\n  quote: 'C''est l''été'\n  plain: Prêt ?\n  note: Heures d'ouverture: lundi\n  days:\n    - Lundi\n    - "Mardi : fermé"\n  long: |\n    Première ligne : ici\n    Seconde ligne !\n  count: 3\n`;
    expect(fix(source, "config/locales/fr.yml")).toBe(s(`fr:\n  hello: "Bonjour⍽: bienvenue"\n  quote: 'C’est l’été'\n  plain: Prêt?\n  note: "Heures d’ouverture⍽: lundi"\n  days:\n    - Lundi\n    - "Mardi⍽: fermé"\n  long: |\n    Première ligne⍽: ici\n    Seconde ligne!\n  count: 3\n`));
  });

  it("reads a file by its root key fr:, and leaves other languages and other YAML alone", () => {
    expect(fix(`fr:\n  a: Prêt ?\n`, "config/locales/app.yml")).toBe(`fr:\n  a: Prêt?\n`);
    expect(fix(`en:\n  a: Ready ?\n`, "config/locales/en.yml")).toBe(`en:\n  a: Ready ?\n`);
    expect(fix(`on: push\nname: Prêt ?\n`, ".github/workflows/ci.yml")).toBe(`on: push\nname: Prêt ?\n`);
  });
});

describe("Java: .properties", () => {
  it("typesets values, keeps \\u escapes in an ASCII file and '' in MessageFormat text", () => {
    const source = `# Accueil : titre\nwelcome.title=Bienvenue : c'est l'\\u00e9t\\u00e9\nmsg.count={0} t\\u00e2ches : l''\\u00e9t\\u00e9\nlong = Premi\\u00e8re partie : \\\n    seconde partie !\n`;
    expect(fix(source, "src/main/resources/messages_fr.properties")).toBe(`# Accueil : titre\nwelcome.title=Bienvenue\\u00a0: c\\u2019est l\\u2019\\u00e9t\\u00e9\nmsg.count={0} t\\u00e2ches\\u00a0: l\\u2019\\u00e9t\\u00e9\nlong = Premi\\u00e8re partie\\u00a0: \\\n    seconde partie!\n`);
  });

  it("writes characters as they are in a UTF-8 file, and leaves another language's file alone", () => {
    expect(fix(`a=Prêt ?\n`, "messages_fr_CA.properties")).toBe(`a=Prêt?\n`);
    expect(fix(`a=Ready ?\n`, "messages_en.properties")).toBe(`a=Ready ?\n`);
  });
});

describe("Flutter: .arb", () => {
  it("typesets a French file's messages, never its @ metadata or ICU syntax", () => {
    const source = JSON.stringify({ "@@locale": "fr", hello: "Bonjour {name} : bienvenue !", "@hello": { description: "Greeting : shown first", placeholders: { name: {} } }, n: "{count, plural, one{1 tâche : prête} other{{count} tâches}}" }, null, 2);
    const out = JSON.parse(fix(source, "lib/l10n/intl_messages.arb"));
    expect(out.hello).toBe(s("Bonjour {name}⍽: bienvenue!"));
    expect(out["@hello"].description).toBe("Greeting : shown first");
    expect(out.n).toBe(s("{count, plural, one{1 tâche⍽: prête} other{{count} tâches}}"));
    expect(fix(source.replace('"fr"', '"en"'), "lib/l10n/app_en.arb")).toBe(source.replace('"fr"', '"en"'));
  });
});

describe("paths", () => {
  it("reads the language each platform's path names", () => {
    const cases: [string, string | null][] = [
      ["App/fr.lproj/Localizable.strings", "fr"], ["App/fr-CA.lproj/Localizable.strings", "fr-ca"], ["res/values-fr-rCA/strings.xml", "fr"],
      ["locale/fr/LC_MESSAGES/django.po", "fr"], ["messages_fr.properties", "fr"], ["lib/l10n/app_fr.arb", "fr"], ["config/locales/fr.yml", "fr"],
      ["locales/fr/common.yml", "fr"], ["res/values/strings.xml", null], ["Localizable.strings", null],
    ];
    for (const [p, lang] of cases) expect(languageOfPath(p), p).toBe(lang);
  });
});

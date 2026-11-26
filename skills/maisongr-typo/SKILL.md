---
name: maisongr-typo
description: Apply or check French typography (Québec's OQLF rules by default, France's on request) in text, Markdown, HTML, JSON translation files and the French strings of JavaScript/TypeScript code with the maisongr-typo package. Use when writing or reviewing French copy, French UI strings or a fr.json file, when the user mentions espaces insécables, guillemets « », French spacing before : ; ! ?, Québec French typography or OQLF, or when French text shows a line starting with « : », « ? » or « $ ».
license: MIT
---

# maisongr-typo

French puts spaces where English doesn't, and some must never break. This package applies the Office québécois de la langue française's rules (fr-CA, the default) or France's (fr-FR) without touching links, code or markup.

## Check before you hand over French copy

```sh
npx maisongr-typo check <files or folders> --json
```

It prints `{ ok, files, issues, report: [{ file, issues: [{ rule, message, line, column, found, expected, key? }], fixed }] }` and exits 1 when something needs fixing. Exit 2 is a usage error.

- Markdown, HTML and `.txt` files are found in folders; JSON files are read only when named.
- JavaScript/TypeScript: French files (fr.ts, locales/fr/…) are found in folders; `--code` reads all code in a folder, its French strings only. Keys, imports and `${…}` are never touched.
- For a translation file holding several languages: `--only-key fr`.
- For France: `--locale fr-FR`. For a narrow no-break space before ; ! ? in Québec: `--narrow`.
- A brand written with a mark French would space (`Toqué!`, `Yahoo!`): `--keep "Toqué!,Yahoo!"`.

## Fix

```sh
npx maisongr-typo fix <files or folders>
```

Then run `check` again: it should report nothing. Show the user the diff; the changes are spaces and marks, and some are invisible (U+00A0 no-break space, U+202F narrow no-break space).

## In code

```js
import { typeset, check } from "maisongr-typo";
typeset(text, { format: "markdown" });
```

Apply it to French strings only. Don't run it on English, code, or identifiers.

## Rules to know when you write French yourself

- fr-CA: no space before ; ! ? — `Vraiment?` (fr-FR: `Vraiment ?` with U+202F).
- A no-break space before : and inside « »: `Note : texte`, `« Bonjour »`.
- Hours: `8 h 30`, `22 h`. Amounts: `29 $`, `12 535,75 $` (decimal comma). Percent: `15 %`. Ordinals: `2e`, `1re`, `1er`.

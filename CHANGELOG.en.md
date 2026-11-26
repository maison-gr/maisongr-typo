# Changelog

[Français](CHANGELOG.md) · **English**

All notable changes to `maisongr-typo`. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and each release adds 0.0.1 to the version (1.0.1, 1.0.2, 1.0.3), whatever it contains.

## [Unreleased]

## [1.0.3] - 2026-11-26

### Fixed

- A string in Spanish, Italian, Portuguese, German, Dutch or Arabic is no longer read as French: a file named for another language (`es.ts`, `locales/de/`) and another language's key (`es:`, `"pt-BR":`) never are, and a string must read as French more than as any of those languages. Found in Resistaa, in ten languages.
- Code held in a string (CSS in a template) is never typeset, and a string clearly in another language is left, even under an `fr` key.
- A fixed JSON file keeps every byte that isn't fixed text: its formatting no longer changes. A message's tags (`<link>`, `<b>`) stay as written.
- A template written with `\n` escapes keeps them.
- A path that doesn't exist is reported plainly.

## [1.0.2] - 2026-11-26

### Fixed

- An attribute written in prose (`type="text/css"`) is left as written: its straight quotes are not a quotation.
- "on" and "son" no longer count as French words: they are English words too, and "50% on signing, 50% on delivery" was read as French.
- An HTTP header named in prose (`Sec-Fetch-Dest: document`, `Content-Type: text/html`) is left as written; a place name ("Saint-Jean-Baptiste: fête") is still typeset.

## [1.0.1] - 2026-11-25

### Added

- JavaScript and TypeScript (`.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts`, `.cts`): French strings are typeset, the code stays byte for byte as it was. A string is French in a French file (`fr.ts`, `fr-CA.js`, an `fr/` folder), under an `fr` key, or when it reads as French. Keys, import paths, `${…}` expressions and regular expressions are never touched, and HTML in a string is typeset as HTML. Tried on three real projects (close to 1,000 files): none loses its syntax.
- `--code` reads all the code in a folder; without it, a folder gives only its French files. Test files are never read as code.

## [1.0.0] - 2026-11-25

### Added

- `typeset()` and `check()` for French text, Markdown and HTML, after the Office québécois de la langue française (`fr-CA`, the default) or France's usage (`fr-FR`): no space or a narrow no-break space before `;` `!` `?`, no-break spaces before `:` and inside « », straight quotes to « », hours (`8 h 30`), amounts and symbols (`29 $`, `12 535 $`, `15 %`, `20 °C`), digit groups, ordinals (`2e`, `1re`, `1er`), the typographic apostrophe and the ellipsis.
- Links, emails, domains, entities, code, tags, link targets and the caller's own spellings (`keep`) are left as written.
- The `maisongr-typo` CLI: `check` (exit 1 when something needs fixing, for CI), `fix`, standard input, JSON translation files with `--only-key`, and `--json` reports.
- An Agent Skill and `llms.txt`.

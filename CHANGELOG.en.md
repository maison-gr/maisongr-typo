# Changelog

[Français](CHANGELOG.md) · **English**

All notable changes to `maisongr-typo`. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and each release adds 0.0.1 to the version (1.0.1, 1.0.2, 1.0.3), whatever it contains.

## [Unreleased]

## [1.0.0] - 2026-11-25

### Added

- `typeset()` and `check()` for French text, Markdown and HTML, after the Office québécois de la langue française (`fr-CA`, the default) or France's usage (`fr-FR`): no space or a narrow no-break space before `;` `!` `?`, no-break spaces before `:` and inside « », straight quotes to « », hours (`8 h 30`), amounts and symbols (`29 $`, `12 535 $`, `15 %`, `20 °C`), digit groups, ordinals (`2e`, `1re`, `1er`), the typographic apostrophe and the ellipsis.
- Links, emails, domains, entities, code, tags, link targets and the caller's own spellings (`keep`) are left as written.
- The `maisongr-typo` CLI: `check` (exit 1 when something needs fixing, for CI), `fix`, standard input, JSON translation files with `--only-key`, and `--json` reports.
- An Agent Skill and `llms.txt`.

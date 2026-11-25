# Contributing

Thank you for helping. A sentence the package gets wrong, with what it should be and where that rule comes from, is the most useful thing you can send. Pull requests are welcome too.

## Setup

Development needs Node 22.12 or later (the package itself runs on 20.9 and later).

```sh
npm ci
npm run typecheck
npm test
npm run build && node test/smoke.mjs
```

## What a change needs

- **A source for every rule.** A rule cites the page of the Office québécois de la langue française's [Banque de dépannage linguistique](https://vitrinelinguistique.oqlf.gouv.qc.ca/banque-de-depannage-linguistique) it follows (for `fr-FR`, a published style reference). Put it in the rule's comment and in the README's table. Usage that varies stays an option, off by default.
- **A test that fails without it.** Tests spell spaces out (`_` for U+00A0, `~` for U+202F) so a test can't pass by accident. Add the sentence that showed the problem.
- **Nothing rewritten that isn't typography.** A rule changes the spaces and marks next to what it targets; it never changes words, and it never touches what `mask.ts` protects (links, code, tags).
- **Idempotent.** `typeset(typeset(x)) === typeset(x)`, and `check()` finds nothing in what `typeset()` returned. The idempotence tests run every sample through every locale.
- **No new runtime dependency.**

## Commits and pull requests

Small commits, each doing one thing, with a [conventional](https://www.conventionalcommits.org/) message: `feat: write 1er for 1ier`, `fix: leave .zip after a space alone`. Keep a pull request to one change, and describe what you checked.

## Security

Please don't open a public issue for a security problem. See [SECURITY.md](SECURITY.md).
